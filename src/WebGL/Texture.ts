import { gl, extensions } from './Context'
import { TypedArray } from '../common'

/**
 * Internal (helper) class.
 */
export class Texture {
	public id: WebGLTexture

	constructor(
		public readonly internalFormat: number,
		public readonly width: number,
		public readonly height: number,
		public readonly format: number,
		public readonly type: number,
		data: TypedArray,
		public readonly alignment: number,
		public readonly wrapS?: number,
		public readonly wrapT?: number
	) {
		const previousTex = gl.getParameter(gl.TEXTURE_BINDING_2D)

		this.id = gl.createTexture()

		gl.bindTexture(gl.TEXTURE_2D, this.id)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS || gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT || gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl[this.internalFormat], width, height, 0, gl[this.format], gl[this.type], data)

		gl.bindTexture(gl.TEXTURE_2D, previousTex)
	}

	delete() {
		if (gl.getParameter(gl.TEXTURE_BINDING_2D) == this.id) {
			gl.bindTexture(gl.TEXTURE_2D, null)
		}
		gl.deleteTexture(this.id)
		delete this.id
	}

	copy(): Texture {
		let copy = new Texture(
			this.internalFormat, this.width, this.height,
			this.format, this.type, null, this.alignment)

		withTemporaryFBO(() => {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0)
			gl.readBuffer(gl.COLOR_ATTACHMENT0)

			gl.bindTexture(gl.TEXTURE_2D, copy.id)
			gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.width, this.height)
			gl.bindTexture(gl.TEXTURE_2D, null)
		})		

		return copy
	}

	upload<T extends TypedArray>(data: T): this {
		gl.bindTexture(gl.TEXTURE_2D, this.id)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl[this.internalFormat], this.width, this.height, 0, gl[this.format], gl[this.type], data)
		gl.bindTexture(gl.TEXTURE_2D, null)
		return this
	}

	read<T extends TypedArray>(data: T): boolean {
		withTemporaryFBO(() => {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0)
			gl.readBuffer(gl.COLOR_ATTACHMENT0)
			gl.readPixels(0, 0, this.width, this.height, gl[this.format], gl[this.type], data, 0)
		})
		return true
	}

	readAsync<T extends TypedArray>(data: T): Promise<T> {
		return new Promise((resolve, reject) => {
			withTemporaryFBO(() => {
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0)
				gl.readBuffer(gl.COLOR_ATTACHMENT0)

				let pixelBuffer = gl.createBuffer()
				gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pixelBuffer)
				gl.bufferData(gl.PIXEL_PACK_BUFFER, data.byteLength, gl.STATIC_READ)
				gl.readPixels(0, 0, this.width, this.height, gl[this.format], gl[this.type], 0)

				const cleanup = () => {
					gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)
					gl.deleteBuffer(pixelBuffer)
				}

				const ext = extensions.getBufferSubDataAsync
				ext.getBufferSubDataAsync(gl.PIXEL_PACK_BUFFER, 0, data, 0, 0)
					.then(() => {
						cleanup()
						resolve(data)
					})
					.catch((err: Error) => {
						cleanup()
						reject(err)
					})
			})
		})
	}
}

function withTemporaryFBO(fn: () => void) {
	let previousFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING)
	let fbo = gl.createFramebuffer()
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
	fn()
	gl.bindFramebuffer(gl.FRAMEBUFFER, previousFBO)
	gl.deleteFramebuffer(fbo)
}