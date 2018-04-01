import * as common from './common'
import { device } from './WebGL/Context'
import { Texture } from './WebGL/Texture'

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

export let readablesMap = new WeakMap()
export let writablesMap = new WeakMap()

export class Buffer {
	constructor({alloc, data, type = common.FLOAT, vector = 1, wrap = common.CLAMP}) {
		this.vector = Math.min(Math.max(vector, 1), 4)
		if (this.vector == 3) {
			console.warn('Vector size of 3 not supported. Choosing vector size 4.')
			this.vector = 4
		}

		let size = alloc || data.length
		this.dimensions = common.closestDimensions(size / this.vector)

		// Wrap mode for S and T.
		this.wrap = Array.isArray(wrap) ? wrap : [wrap, wrap]

		const maxDimension = device.maxTextureSize ** 2
		if (Math.max(...this.dimensions) > maxDimension) {
			throw new Error('Buffer size exceeds device limit.')
		}

		if (alloc != null) {
			const typedArray = common.arrayConstructors.get(type)
			this.data = new typedArray(size)
		}
		else {
			if (data instanceof Uint8ClampedArray) {
				this.data = new Uint8Array(data.buffer)
			}
			else {
				this.data = data
			}
		}
	}

	delete() {
		delete this.data
		this._finish()
	}

	copy() {
		return new Buffer({
			data: new this.data.constructor(this.data),
			vector: this.vector,
		})
	}

	/// Private methods / properties.

	get formatInfo() {
		for (const [constructor, type] of common.arrayTypes) {
			if (this.data instanceof constructor) {
				return common.formatInfo(type, this.vector)
			}
		}
		return null
	}

	_getReadable(forceCreate = false) {
		if (!readablesMap.has(this) && forceCreate) {
			const readable = textureForBuffer(this, this.data)	
			readablesMap.set(this, readable)
		}
		return readablesMap.get(this)
	}

	_getWritable(forceCreate = false) {
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

function textureForBuffer(buffer, data = null) {
	const { bytes, internalFormat, format, type } = buffer.formatInfo
	const [width, height] = buffer.dimensions
	return new Texture(internalFormat, width, height, format, type, data, bytes, ...buffer.wrap)
}