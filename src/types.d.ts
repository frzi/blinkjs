// Allow importing of text files.
declare module '*.vert' {
	const value: string
	export default value
}

declare module '*.frag' {
	const value: string
	export default value
}

declare module '*.vsh' {
	const value: string
	export default value
}

declare module '*.fsh' {
	const value: string
	export default value
}

declare module '*.glsl' {
	const value: string
	export default value
}

declare const __MAJOR__: number
declare const __MINOR__: number
declare const __PATCH__: number

type Dictionary<T> = Record<string, T>

interface DeviceInfo {
	glslVersion: string
	maxColorAttachments: number
	maxTextureSize: number
	maxTextureUnits: number
	renderer: string
	unmaskedRenderer?: string
	unmaskedVendor?: string
	vendor: string
}

interface WebGL2RenderingContext {
	floatExt?: WEBGL_color_buffer_float
}