export { device, gl as context } from './WebGL/Context'
export { Buffer } from './Buffer'
export { DeviceBuffer } from './DeviceBuffer'
export { Kernel } from './Kernel'

export { 
	FLOAT,
	INT32, INT16, INT8,
	UINT32, UINT16, UINT8
} from './common'

export const VERSION = {
	major: // #put major + ',' 
	minor: // #put minor + ',' 
	patch: // #put patch + ',' 
	toString() { return `${this.major}.${this.minor}.${this.patch}` }
}