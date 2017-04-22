import * as common from './common'
import { device } from './WebGL/Context'
import { Texture } from './WebGL/Texture'

import { readablesMap, writablesMap } from './Buffer'

/**
 * The `DeviceBuffer` only allocates memory on the host. Memory is
 * allocated the moment the `DeviceBuffer` is constructed. Memory
 * on the device is developer managed. Indeed, the device memory is
 * retained until the developer destroys the `DeviceBuffer` using
 * the `destroy()` method.
 *
 * Memory from the host can be copied to the device and vice versa.
 */

export class DeviceBuffer {
	constructor({alloc, data, type = common.FLOAT, vector = 1}) {
		this.vector = Math.min(Math.max(vector, 1), 4)
		if (this.vector == 3) {
			console.warn('Vector size of 3 not supported. Choosing vector size 4.')
			this.vector = 4
		}

		this.size = alloc || data.length
		this.dimensions = common.closestDimensions(this.size / this.vector)

		const maxDimension = device.maxTextureSize ** 2
		if (Math.max(...this.dimensions) > maxDimension) {
			throw new Error('Buffer size exceeds device limit.')
		}
		
		let associatedType = type
		if (data) {
			for (const [constructor, type] of common.arrayTypes) {
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
				data = new Uint8Array(data.buffer)
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

	copy() {
		let copyReadable = this._readable.copy()
		let copyBuffer = new DeviceBuffer({
			alloc: this.size,
			type: this.type,
			vector: this.vector
		})

		copyBuffer._readable.delete()
		copyBuffer._readable = copyReadable
		return copyBuffer
	}

	toDevice(data) {
		this._getReadable().upload(data)
	}

	toHost(data) {
		if (!data) {
			const typedArray = common.arrayConstructors.get(this.type)
			data = new typedArray(this.size)
		}

		// Cast Uint8ClampedArray to Uint8Array.
		let ref = data
		if (data instanceof Uint8ClampedArray) {
			ref = new Uint8Array(data.buffer)
		}
		this._getReadable().read(ref)

		return data
	}

	/// Private methods / properties.

	get formatInfo() {
		return common.formatInfo(this.type, this.vector)
	}

	_getReadable(forceCreate = false) {
		window.readablesMap = readablesMap
		window.writablesMap = writablesMap
		if (!readablesMap.has(this) && forceCreate) {
			const { bytes, internalFormat, format, type } = this.formatInfo
			const [width, height] = this.dimensions
			readablesMap.set(this, new Texture(internalFormat, width, height, format, type, null, bytes))
		}
		return readablesMap.get(this)
	}

	_getWritable(forceCreate = false) {
		if (!writablesMap.has(this) && forceCreate) {
			writablesMap.set(this, this._getReadable(true).copy())
		}
		return writablesMap.get(this)
	}

	_finish() {
		// Swap.
		this._getReadable().delete()
		readablesMap.set(this, this._getWritable())
		writablesMap.delete(this)
	}
}