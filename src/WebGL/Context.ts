/**
 * WebGL 2.0 related objects and helpers.
 */
export const gl = function (): WebGL2RenderingContext {
	const canvas = document.createElement('canvas')
	canvas.width = canvas.height = 1

	const options: WebGLContextAttributes = {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
	}

	let gl = canvas.getContext('webgl2', options) as WebGL2RenderingContext

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

export const extensions = function (): Record<string, any> {
	let extensions = {}

	const retrieve = {
		debugRendererInfo: 'WEBGL_debug_renderer_info',
		debugShaders: 'WEBGL_debug_shaders',
		getBufferSubDataAsync: 'WEBGL_get_buffer_sub_data_async',
	}

	for (const [key, name] of Object.entries(retrieve)) {
		let extension = gl.getExtension(name)
		if (extension) {
			extensions[key] = extension
		}
	}

	return extensions
}()

export const device = function (): Readonly<DeviceInfo> {
	let device: DeviceInfo = {
		glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
		maxColorAttachments: gl.getParameter(gl.MAX_DRAW_BUFFERS),
		maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
		maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
		renderer: gl.getParameter(gl.RENDERER),
		vendor: gl.getParameter(gl.VENDOR),
	}

	let { debugRendererInfo } = extensions
	if (debugRendererInfo) {
		device.unmaskedRenderer = gl.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL)
		device.unmaskedVendor = gl.getParameter(debugRendererInfo.UNMASKED_VENDOR_WEBGL)
	}

	return Object.freeze(device)
}()