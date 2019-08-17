import { device } from './WebGL/Context'
import { Texture } from './WebGL/Texture'
import { 
	DataType, TypedArray,
	arrayConstructors, arrayTypes,
	formatInfo, closestDimensions,
	FLOAT, CLAMP, FormatInfo,
} from './common'

/**
 * The `Buffer` object allocates memory on the host. Once the `Buffer`
 * is requested on the device (GPU), the contents of `Buffer`'s data
 * are allocated and copied from the host to the device.
 * 
 * Once te device is done computing, the contents of the `Buffer` on
 * the device are copied back to the host.
 *
 * All device copies are stored and maintained via WeakMaps.
 *
 * NOTE: The data of a `Buffer` is NOT retained on the device. Once
 * the data has been copied back to the host, the device copy will be
 * destroyed immediately. To retain data on the device, please use
 * the `DeviceBuffer` object.
 */

export interface GenericBuffer {
	delete(): void
	readonly formatInfo: FormatInfo
}

export let readablesMap = new WeakMap<GenericBuffer, Texture>()
export let writablesMap = new WeakMap<GenericBuffer, Texture>()

//

interface BufferDescriptorBase {
	type?: DataType
	vector?: VectorSize
	wrap?: number | [number, number]
}

export interface BufferDescriptorAlloc extends BufferDescriptorBase {
	alloc: number
}

export interface BufferDescriptorData<T extends TypedArray> extends BufferDescriptorBase {
	data: T
}

export type BufferDescriptor<T extends TypedArray> = BufferDescriptorAlloc | BufferDescriptorData<T>

//

export class Buffer<T extends TypedArray> implements GenericBuffer {
	public data: T
	public dimensions: [number, number]
	public vector: VectorSize
	public wrap: [number, number]

	constructor(descriptor: BufferDescriptor<T>) {
		let { type, vector, wrap } = descriptor
		let { alloc, data } = descriptor as BufferDescriptorAlloc & BufferDescriptorData<T>

		this.vector = Math.min(Math.max(vector, 1), 4) as VectorSize
		if (<number>this.vector == 3) {
			console.warn('Vector size of 3 not supported. Choosing vector size 4.')
			this.vector = 4
		}

		let size = alloc || data.length
		this.dimensions = closestDimensions(size / this.vector)

		// Wrap mode for S and T.
		this.wrap = Array.isArray(wrap) ? wrap : [wrap, wrap]

		const maxDimension = device.maxTextureSize ** 2
		if (Math.max(...this.dimensions) > maxDimension) {
			throw new Error('Buffer size exceeds device limit.')
		}

		if (data != null) {
			if (data instanceof Uint8ClampedArray) {
				this.data = new Uint8Array(data.buffer) as T
			}
			else {
				this.data = data
			}
		}
		else if (alloc != null) {
			const typedArray = arrayConstructors.get(type)
			this.data = new typedArray(size) as T
		}
		else {
			throw new Error('Must provide args: data or alloc.');
		}
	}

	delete() {
		delete this.data
		this._finish()
	}

	copy(): Buffer<TypedArray> {
		return new Buffer({
			data: this.data.slice(),
			vector: this.vector,
		})
	}

	/// Private methods / properties.

	get formatInfo(): FormatInfo {
		for (const [constructor, type] of arrayTypes) {
			if (this.data instanceof constructor) {
				return formatInfo(type, this.vector)
			}
		}
		return null
	}

	_getReadable(forceCreate = false): Texture {
		if (!readablesMap.has(this) && forceCreate) {
			const readable = textureForBuffer(this, this.data)	
			readablesMap.set(this, readable)
		}
		return readablesMap.get(this)
	}

	_getWritable(forceCreate = false): Texture {
		if (!writablesMap.has(this) && forceCreate) {
			const writable = textureForBuffer(this, this.data)
			writablesMap.set(this, writable)
		}
		return writablesMap.get(this)
	}

	_finish() {
		let readable = this._getReadable()
		if (readable) {
			readable.delete()
			readablesMap.delete(this)
		}

		let writable = this._getWritable()
		if (writable) {
			writable.delete()
			writablesMap.delete(this)
		}
	}
}

function textureForBuffer(buffer: Buffer<TypedArray>, data: TypedArray = null): Texture {
	const { bytes, internalFormat, format, type } = buffer.formatInfo
	const [width, height] = buffer.dimensions
	return new Texture(internalFormat, width, height, format, type, data, bytes, ...buffer.wrap)
}