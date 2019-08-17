import { gl } from  './Context'
import vertexSource from './../shaders/quad.vert'

// Keep the vertex shader in memory.
const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource)

interface ProgramAttribute extends WebGLActiveInfo {
	id: number
}

interface ProgramUniform extends WebGLActiveInfo {
	id: WebGLUniformLocation
}

/**
 * Internal (helper) class.
 */
export class Program {
	public id: WebGLProgram

	public readonly attributes: Dictionary<ProgramAttribute>
	public readonly uniforms: Dictionary<ProgramUniform>

	public constructor(fragSource: string) {
		let fragShader = compileShader(gl.FRAGMENT_SHADER, fragSource)

		this.id = gl.createProgram()
		gl.attachShader(this.id, vertexShader)
		gl.attachShader(this.id, fragShader)
		gl.deleteShader(fragShader)

		gl.linkProgram(this.id)

		if (!gl.getProgramParameter(this.id, gl.LINK_STATUS)) {
			console.error('Unable to link program. Info log:')
			console.warn(gl.getProgramInfoLog(this.id))
			return null
		}

		// Get attributes and uniforms.
		this.attributes = {}
		const attribCount = gl.getProgramParameter(this.id, gl.ACTIVE_ATTRIBUTES)
		for (let a = 0; a < attribCount; a++) {
			let attribute = gl.getActiveAttrib(this.id, a) as ProgramAttribute
			attribute.id = gl.getAttribLocation(this.id, attribute.name)
			this.attributes[attribute.name] = attribute
		}

		this.uniforms = {}
		const uniformCount = gl.getProgramParameter(this.id, gl.ACTIVE_UNIFORMS)
		for (let u = 0; u < uniformCount; u++) {
			let uniform = gl.getActiveUniform(this.id, u) as ProgramUniform
			uniform.id = gl.getUniformLocation(this.id, uniform.name)
			this.uniforms[uniform.name] = uniform
		}
	}

	public delete() {
		gl.deleteProgram(this.id)
		delete this.id
	}

	public setUniform(name: string, ...values: any[]) {
		if (!this.uniforms[name]) {
			// console.warn(`${name} not a valid uniform.`)
			return
		}

		const { id, size, type } = this.uniforms[name]
	
		let fnName = uniformsFnTable[type]
		if (size > 1 && fnName[fnName.length - 1] != 'v') {
			fnName += 'v'
		}

		if (fnName.includes('Matrix')) {
			gl[fnName](id, false, ...values)
		}
		else {
			gl[fnName](id, ...values)
		}
	}
}

function compileShader(type: number, source: string): WebGLProgram {
	// Check if the shader defines glsl version.
	if (!(/^#version 300 es/g).test(source)) {
		source = '#version 300 es\n\r' + source
	}

	let shader = gl.createShader(type)
	gl.shaderSource(shader, source)
	gl.compileShader(shader)

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		// TODO: Better error logging.
		const typeName = type == gl.VERTEX_SHADER ? 'vertex' : 'fragment'
		const infoLog = gl.getShaderInfoLog(shader)
		throw new Error(`Unable to compile ${typeName} shader. Info log: 
			${infoLog}`)
	}

	return shader
}

const uniformsFnTable = {
	[gl.FLOAT]:                   'uniform1f',
	[gl.FLOAT_VEC2]:              'uniform2f',
	[gl.FLOAT_VEC3]:              'uniform3f',
	[gl.FLOAT_VEC4]:              'uniform4f',
	[gl.INT]:                     'uniform1i',
	[gl.INT_VEC2]:                'uniform2i',
	[gl.INT_VEC3]:                'uniform3i',
	[gl.INT_VEC4]:                'uniform4i',
	[gl.UNSIGNED_INT]:            'uniform1ui',
	[gl.UNSIGNED_INT_VEC2]:       'uniform2ui',
	[gl.UNSIGNED_INT_VEC3]:       'uniform3ui',
	[gl.UNSIGNED_INT_VEC4]:       'uniform4ui',
	[gl.BOOL]:                    'uniform1i',
	[gl.BOOL_VEC2]:               'uniform2i',
	[gl.BOOL_VEC3]:               'uniform3i',
	[gl.BOOL_VEC4]:               'uniform4i',
	[gl.FLOAT_MAT2]:              'uniformMatrix2fv',
	[gl.FLOAT_MAT2x3]:            'uniformMatrix2x3fv',
	[gl.FLOAT_MAT2x4]:            'uniformMatrix2x4fv',
	[gl.FLOAT_MAT3]:              'uniformMatrix3fv',
	[gl.FLOAT_MAT3x2]:            'uniformMatrix3x2fv',
	[gl.FLOAT_MAT3x4]:            'uniformMatrix3x4fv',
	[gl.FLOAT_MAT4]:              'uniformMatrix4fv',
	[gl.FLOAT_MAT4x2]:            'uniformMatrix4x2fv',
	[gl.FLOAT_MAT4x3]:            'uniformMatrix4x3fv',
	[gl.SAMPLER_2D]:              'uniform1i',
	[gl.INT_SAMPLER_2D]:          'uniform1i',
	[gl.UNSIGNED_INT_SAMPLER_2D]: 'uniform1i',	
}