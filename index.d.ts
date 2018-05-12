export = blink
export as namespace blink

declare namespace blink {
	/**
	 * Environment related objects.
	 */
	const context: WebGLRenderingContext
	
	const device: {
		glslVersion: string
		maxColorAttachments: number
		maxTextureSize: number
		maxTextureUnits: number
		renderer: string
		vendor: string
		unmaskedRenderer?: string
		unmaskedVendor?: string
	}

	/**
	 * blink.js version
	 */
	const VERSION: {
		major: number
		minor: number
		patch: number
		toString(): string
	}

	/**
	 * Constants.
	 */
	type DataType = {
		name: string
		bytes: number
		integer: boolean
		unsigned: boolean
	}

	const FLOAT: DataType
	const INT32: DataType
	const INT16: DataType
	const INT8: DataType
	const UINT32: DataType
	const UINT16: DataType
	const UINT8: DataType

	type WrapMode = number
	const CLAMP: WrapMode
	const MIRROR: WrapMode
	const REPEAT: WrapMode

	/**
	 * Generic Buffer Descriptor.
	 * Though perhaps unnecessarily complex, it does force either `alloc` or `data` to be present.
	 */
	type TypedArray = Float32Array
		| Int32Array | Int16Array | Int8Array
		| Uint32Array | Uint16Array | Uint8Array | Uint8ClampedArray

	interface BufferDescriptorBase {
		type?: DataType
		vector?: number
		wrap?: WrapMode
	}

	interface BufferDescriptorAlloc extends BufferDescriptorBase {
		alloc: number
	}

	interface BufferDescriptorData<T extends TypedArray> extends BufferDescriptorBase {
		data: T
	}

	type BufferDescriptor<T extends TypedArray> = BufferDescriptorAlloc | BufferDescriptorData<T>

	/**
	 * Buffers.
	 */
	class Buffer<T extends TypedArray> {
		readonly data: T
		constructor(descriptor: BufferDescriptor<T>)
		copy(): Buffer<T>
		delete()
	}

	class DeviceBuffer<T extends TypedArray> {
		constructor(descriptor: BufferDescriptor<T>)
		copy(): DeviceBuffer<T>
		delete()
		toDevice(data: T)
		toHost(data?: T): T
	}

	/**
	 * Kernel.
	 */
	interface InputOutput {
		in?: object
		out: object
	}

	class Kernel {
		constructor(io: InputOutput, source: string)
		delete()
		exec(uniforms?: object)
	}
}