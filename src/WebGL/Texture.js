import { gl } from './Context'

/**
 * Internal (helper) class.
 */
export class Texture {
	constructor(internalFormat, width, height, format, type, data, alignment) {
		const previousTex = gl.getParameter(gl.TEXTURE_BINDING_2D)

		this.internalFormat = internalFormat
		this.width = width
		this.height = height
		this.format = format
		this.type = type
		this.alignment = alignment

		this.id = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, this.id)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
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

	copy() {
		let copy = new Texture(this.internalFormat, this.width, this.height, this.format, this.type, null, this.alignment)

		withTemporaryFBO(() => {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0)
			gl.readBuffer(gl.COLOR_ATTACHMENT0)

			gl.bindTexture(gl.TEXTURE_2D, copy.id)
			gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.width, this.height, 0)
			gl.bindTexture(gl.TEXTURE_2D, null)
		})		

		return copy
	}

	upload(data) {
		gl.bindTexture(gl.TEXTURE_2D, this.id)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl[this.internalFormat], this.width, this.height, 0, gl[this.format], gl[this.type], data)
		gl.bindTexture(gl.TEXTURE_2D, this.id)
		return this
	}

	read(data) {
		withTemporaryFBO(() => {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0)
			gl.readBuffer(gl.COLOR_ATTACHMENT0)
			gl.readPixels(0, 0, this.width, this.height, gl[this.format], gl[this.type], data, 0)
		})
		return true
	}
}

function withTemporaryFBO(fn) {
	let previousFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING)
	let fbo = gl.createFramebuffer()
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
	fn()
	gl.bindFramebuffer(gl.FRAMEBUFFER, previousFBO)
	gl.deleteFramebuffer(fbo)
}