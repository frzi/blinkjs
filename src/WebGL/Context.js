/**
 * WebGL 2.0 related objects and helpers.
 */
export const gl = function () {
	const canvas = document.createElement('canvas')
	canvas.width = canvas.height = 1

	const options = {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
	}

	let gl = canvas.getContext('webgl2', options)

	if (!gl) {
		throw new Error('WebGL 2.0 not supported by the browser.')
	}
	else if (!(gl.floatExt = gl.getExtension('EXT_color_buffer_float'))) {
		throw new Error('EXT_color_buffer_float not supported.')
	}

	gl.pixelStorei(gl.PACK_ALIGNMENT, 1)
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)

	return gl
}()


export const device = function () {
	let device = {
		glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
		maxColorAttachments: gl.getParameter(gl.MAX_DRAW_BUFFERS),
		maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
		maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
		renderer: gl.getParameter(gl.RENDERER),
		vendor: gl.getParameter(gl.VENDOR),
	}

	const debugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info')
	if (debugRendererInfo) {
		device.unmaskedRenderer = gl.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL),
		device.unmaskedVendor = gl.getParameter(debugRendererInfo.UNMASKED_VENDOR_WEBGL)
	}

	return Object.freeze(device)
}()


export const quadVAO = function () {
	// Quad vertices.
	const vertices = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1])
	let vbo = gl.createBuffer()
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
	gl.bindBuffer(gl.ARRAY_BUFFER, null)

	// Quad VAO.
	let vao = gl.createVertexArray()
	gl.bindVertexArray(vao)

	gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
	gl.enableVertexAttribArray(0)
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

	gl.bindVertexArray(null)
	gl.bindBuffer(gl.ARRAY_BUFFER, null)

	return vao
}()