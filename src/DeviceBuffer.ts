import { device, extensions } from './WebGL/Context'
import { Texture } from './WebGL/Texture'
import {
	GenericBuffer,
	BufferDescriptor, BufferDescriptorAlloc, BufferDescriptorData,
	readablesMap, writablesMap
} from './Buffer'
import { 
	DataType, TypedArray,
	arrayConstructors, arrayTypes,
	formatInfo, closestDimensions,
	FLOAT, CLAMP, FormatInfo,
} from './common'

/**
 * The `DeviceBuffer` only allocates memory on the device. Memory is
 * allocated the moment the `DeviceBuffer` is constructed. Memory
 * on the device is developer managed. Indeed, the device memory is
 * retained until the developer destroys the `DeviceBuffer` using
 * the `destroy()` method.
 *
 * Memory from the host can be copied to the device and vice versa.
 */
export class DeviceBuffer<T extends TypedArray> implements GenericBuffer {
	public data: T
	public dimensions: [number, number]
	public readonly size: number
	public readonly type: DataType
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

		this.size = alloc || data.length
		this.dimensions = closestDimensions(this.size / this.vector)

		// Wrap mode for S and T.
		this.wrap = Array.isArray(wrap) ? wrap : [wrap, wrap]

		const maxDimension = device.maxTextureSize ** 2
		if (Math.max(...this.dimensions) > maxDimension) {
			throw new Error('Buffer size exceeds device limit.')
		}
		
		let associatedType = type
		if (data) {
			for (const [constructor, type] of arrayTypes) {
				if (data instanceof constructor) {
					associatedType = type
					break
				}
			}
		}
		this.type = associatedType

		// Allocate on the device, immediately.
		let texture = this._getReadable(true)

		if (data) {
			if (data.constructor == Uint8ClampedArray) {
				data = new Uint8Array(data.buffer) as T
			}
			texture.upload(data)
		}
	}

	delete() {
		if (readablesMap.has(this)) {
			readablesMap.get(this).delete()
			readablesMap.delete(this)
		}
	}

	copy(): DeviceBuffer<TypedArray> {
		return null
		// TODO
		/*let copyReadable = this._readable.copy()
		let copyBuffer = new DeviceBuffer({
			alloc: this.size,
			type: this.type,
			vector: this.vector
		})

		copyBuffer._readable.delete()
		copyBuffer._readable = copyReadable
		return copyBuffer*/
	}

	toDevice(data: T) {
		this._getReadable().upload(data)
	}

	toHost(data: T) {
		data = this._prepareLocalData(data)
		this._getReadable().read(data)
		return data
	}

	/// Private methods / properties.

	get formatInfo() {
		return formatInfo(this.type, this.vector)
	}

	_getReadable(forceCreate = false): Texture {
		if (!readablesMap.has(this) && forceCreate) {
			const { bytes, internalFormat, format, type } = this.formatInfo
			const [width, height] = this.dimensions
			readablesMap.set(this, new Texture(internalFormat, width, height, format, type, null, bytes, ...this.wrap))
		}
		return readablesMap.get(this)
	}

	_getWritable(forceCreate = false): Texture {
		if (!writablesMap.has(this) && forceCreate) {
			writablesMap.set(this, this._getReadable(true).copy())
		}
		return writablesMap.get(this)
	}

	_finish() {
		// Swap.
		let writableCopy = this._getWritable()
		if (writableCopy) {
			let readableCopy = this._getReadable()
			if (readableCopy) {
				readableCopy.delete()
			}
			readablesMap.set(this, writableCopy)
			writablesMap.delete(this)
		}
	}

	private _prepareLocalData(data: T): T {
		if (!data) {
			const typedArray = arrayConstructors.get(this.type)
			data = new typedArray(this.size) as T
		}

		// Cast Uint8ClampedArray to Uint8Array.
		let ref = data
		if (data instanceof Uint8ClampedArray) {
			ref = new Uint8Array(data.buffer) as T
		}

		return ref
	}
}