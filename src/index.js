export { device, gl as context } from './WebGL/Context'
export { Buffer } from './Buffer'
export { DeviceBuffer } from './DeviceBuffer'
export { Kernel } from './Kernel'

export { 
	FLOAT,
	INT32, INT16, INT8,
	UINT32, UINT16, UINT8,
	CLAMP, MIRROR, REPEAT,
} from './common'

export const VERSION = {
	major: $_MAJOR,
	minor: $_MINOR,
	patch: $_PATCH,
	toString() { return `${this.major}.${this.minor}.${this.patch}` }
}