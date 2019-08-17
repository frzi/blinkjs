import { device, gl } from './WebGL/Context'
import { Program } from './WebGL/Program'
import { Buffer } from './Buffer'
import { DeviceBuffer } from './DeviceBuffer'
import fragTemplate from './shaders/template.frag'
import { TypedArray } from './common'

/**
 * Inputs and outputs have to be defined beforehand. 
 * Although this means the pipeline is *fixed*, it does allow you
 * to swap Buffers before executing the `Kernel`.
 *
 * Depending on the number of allowed color attachments, a `Kernel`
 * may have to split the number of executions in numerous steps.
 */
type BufferDictionary = Dictionary<Buffer<TypedArray> | DeviceBuffer<TypedArray>>

type KernelIO = {
	in?: BufferDictionary
	out: BufferDictionary
}

type OutputDescriptor = {
	location?: number
	outputType: string
	precision: GLSLPrecision
}

type StepDescriptor = {
	out: string[]
	program: Program
}

export class Kernel {
	public inputs: BufferDictionary
	public outputs: BufferDictionary
	public steps: Set<StepDescriptor>

	constructor(io: KernelIO, source: string) {
		this.inputs = io.in || {}
		this.outputs = io.out

		if (!this.outputs || !Object.values(this.outputs).length) {
			throw new Error(`At least 1 output is required.`)
		}


		//
		// Check for conflicts.
		for (const output of Object.keys(this.outputs)) {
			for (const input of Object.keys(this.inputs)) {
				if (input === output) {
					throw new Error(`Conflicting input/output variable name: ${input}.`)
				}
			}
		}


		//
		// Compare maximum input variabes allowed by the device.
		let inputCount = Object.values(this.inputs).length
		if (inputCount > device.maxTextureUnits) {
			throw new Error(`Maximum number of inputs exceeded. Allowed: ${device.maxTextureUnits}, given: ${inputCount}.`)
		}


		//
		// Split the task in multiple programs based on the maximum number of outputs.
		const maxOutputs = device.maxColorAttachments
		const outputNames = Object.keys(this.outputs)
		const outputGroupCount = Math.ceil(outputNames.length / maxOutputs)
		let outputDescriptors = [] as Dictionary<OutputDescriptor>[]
		
		let groupStartIndex = 0
		for (let a = 0; a < outputGroupCount; a++) {
			let descriptors: Dictionary<OutputDescriptor> = {} 

			for (const [i, name] of outputNames.entries()) {
				const { outputType, precision } = this.outputs[name].formatInfo
				descriptors[name] = { outputType, precision }

				if (i >= groupStartIndex && i < groupStartIndex + maxOutputs) {
					descriptors[name].location = i - groupStartIndex
				}
			}
			outputDescriptors.push(descriptors)
			groupStartIndex += maxOutputs
		}

		// Create the set of programs.
		this.steps = new Set(outputDescriptors.map((descriptors) => {
			const shaderSource = prepareFragmentShader(this.inputs, descriptors, source)
			let program = new Program(shaderSource)

			let out: string[] = []
			for (const [name, descriptor] of Object.entries(descriptors)) {
				if (descriptor.location !== undefined) {
					out.push(name)
				}
			}

			return { out, program }
		}))
	}

	delete() {
		this.steps.forEach(step => step.program.delete())
		this.steps.clear()

		delete this.inputs
		delete this.outputs
		delete this.steps
	}

	exec(uniforms: Dictionary<boolean | number | TypedArray> = {}) {
		// Check dimensions.
		let size = []
		for (const output of Object.values(this.outputs)) {
			const dimensions = [...output.dimensions]
			if (!size.length) {
				size = dimensions
			}
			else if (size[0] != dimensions[0] || size[1] != dimensions[1]) {
				throw new Error('Outputs require consistent sizes.')
			}
		}

		//
		// Prepare Framebuffer.
		let fbo = gl.createFramebuffer()
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)

		//
		// Run every step.
		for (const step of this.steps) {
			// Output textures.
			for (const [index, name] of step.out.entries()) {
				const texture = this.outputs[name]._getWritable(true)
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture.id, 0)
			}

			const { program } = step
			gl.useProgram(program.id)

			gl.viewport(0, 0, size[0], size[1])

			// Built-in uniforms.
			program.setUniform('bl_Size', ...size)

			// User uniforms.
			for (const [uniform, value] of Object.entries(uniforms)) {
				program.setUniform(uniform, value)
			}

			// Input textures.
			for (const [index, name] of Object.keys(this.inputs).entries()) {
				gl.activeTexture(gl.TEXTURE0 + index)
				const texture = this.inputs[name]._getReadable(true)
				gl.bindTexture(gl.TEXTURE_2D, texture.id)
				program.setUniform(name, index)
			}

			gl.drawBuffers(step.out.map((_: any, i: number) => gl.COLOR_ATTACHMENT0 + i))
			gl.drawArrays(gl.TRIANGLES, 0, 3)

			// Unpacking time. But only for `Buffer`s.
			for (const [index, name] of step.out.entries()) {
				const buffer = this.outputs[name]
				if (buffer instanceof Buffer) {
					const { format, type } = buffer.formatInfo
					gl.readBuffer(gl.COLOR_ATTACHMENT0 + index)
					gl.readPixels(0, 0, size[0], size[1], gl[format], gl[type], buffer.data, 0)
				}
			}

			gl.bindTexture(gl.TEXTURE_2D, null)
		}

		// Clean-up all resources.
		const allBuffers = new Set([...Object.values(this.inputs), ...Object.values(this.outputs)])
		for (const buffer of allBuffers) {
			buffer._finish()
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.deleteFramebuffer(fbo)
	}
}


function prepareFragmentShader(inputs: BufferDictionary, outputDescriptors: Dictionary<OutputDescriptor>, source: string): string {
	let uniforms = Object.entries(inputs).map(([name, buffer]) => {
		const { inputType, precision } = buffer.formatInfo
		return `uniform ${precision} ${inputType} ${name};`
	})

	let outs = Object.entries(outputDescriptors).map(([name, props]) => {
		const layout = props.location !== undefined ? `layout(location = ${props.location}) out ` : ''
		return `${layout}${props.precision} ${props.outputType} ${name};`
	})

	return `${fragTemplate}

		${uniforms.join('\n\r')}

		${outs.join('\n\r')}

		${source}`
}