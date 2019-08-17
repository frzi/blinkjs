export { device, gl as context } from './WebGL/Context'
export { Buffer } from './Buffer'
export { DeviceBuffer } from './DeviceBuffer'
export { Kernel } from './Kernel'

export { 
	FLOAT,
	INT32, INT16, INT8,
	UINT32, UINT16, UINT8,
	CLAMP, MIRROR, REPEAT,
	// Type definitions
	DataType, FormatInfo,
	TypedArray, TypedArrayConstructor
} from './common'

export const VERSION = {
	major: __MAJOR__,
	minor: __MINOR__,
	patch: __PATCH__,
	toString() {
		return `${this.major}.${this.minor}.${this.patch}`
	}
}