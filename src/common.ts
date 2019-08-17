// Move to types.d.ts?
export type DataType = {
	bytes: number
	integer: boolean
	name: string
	unsigned: boolean
}

export type FormatInfo = {
	bytes: number
	format: string
	internalFormat: 'R' | 'RG' | 'RGB' | 'RGBA'
	inputType: string
	integer: boolean
	outputType: string
	precision: 'lowp' | 'mediump' | 'highp'
	type: string
	unsigned: boolean
}

export type TypedArray = Float32Array
	| Int32Array | Int16Array | Int8Array
	| Uint32Array | Uint16Array | Uint8Array | Uint8ClampedArray

export type TypedArrayConstructor = Float32ArrayConstructor
	| Int32ArrayConstructor | Int16ArrayConstructor | Int8ArrayConstructor
	| Uint32ArrayConstructor | Uint16ArrayConstructor | Uint8ArrayConstructor | Uint8ClampedArrayConstructor


///

const Type = (name: string, bytes: number, integer: boolean, unsigned: boolean): DataType => (
	Object.freeze({ name, bytes, integer, unsigned })
)

export const FLOAT  = Type('float',  4, false, false)
export const INT32  = Type('int32',  4, true,  false)
export const INT16  = Type('int16',  2, true,  false)
export const INT8   = Type('int8',   1, true,  false)
export const UINT32 = Type('uint32', 4, true,  true)
export const UINT16 = Type('uint16', 2, true,  true)
export const UINT8  = Type('uint8',  1, true,  true)

// Wrap modes for the textures.
export const CLAMP  = 33071
export const REPEAT = 10497
export const MIRROR = 33648

// Type associations.
export const arrayConstructors = new Map([
	[FLOAT,  Float32Array],
	[INT32,  Int32Array],
	[INT16,  Int16Array],
	[INT8,   Int8Array],
	[UINT32, Uint32Array],
	[UINT16, Uint16Array],
	[UINT8,  Uint8Array],
] as [DataType, TypedArrayConstructor][])

export const arrayTypes = new Map([
	[Float32Array,      FLOAT],
	[Int32Array,        INT32],
	[Int16Array,        INT16],
	[Int8Array,         INT8],
	[Uint32Array,       UINT32],
	[Uint16Array,       UINT16],
	[Uint8Array,        UINT8],
	[Uint8ClampedArray, UINT8],
] as [TypedArrayConstructor, DataType][])


// Hands out all the types associated with a Buffer's data.
export function formatInfo(dataType: DataType, vectorSize: number = 1): FormatInfo {
	const { bytes, integer, unsigned } = dataType

	const precision = ['lowp', 'mediump', null, 'highp'][bytes - 1]

	const inputType = integer && unsigned ? 'usampler2D' : integer ? 'isampler2D' : 'sampler2D'

	let outputType = null
	if (vectorSize == 1) {
		outputType = integer && unsigned ? 'uint' : integer ? 'int' : 'float'
	}
	else {
		outputType = integer && unsigned ? 'uvec' : integer ? 'ivec' : 'vec'
		outputType += vectorSize
	}

	let internalFormat = ['R', 'RG', 'RGB', 'RGBA'][vectorSize - 1]
	internalFormat += bytes * 8 // 8, 16 or 32
	internalFormat += integer && unsigned ? 'UI' : integer ? 'I' : 'F'

	let format = ['RED', 'RG', 'RGB', 'RGBA'][vectorSize - 1]
	format += integer ? '_INTEGER' : ''

	let type = ''
	if (integer) {
		if (unsigned) {
			type = 'UNSIGNED_'
		}
		type += bytes == 1 ? 'BYTE' : bytes == 2 ? 'SHORT' : 'INT'
	}
	else {
		type = 'FLOAT'
	}

	return {
		bytes, format, internalFormat,
		inputType, integer, outputType,
		precision, type, unsigned,
	} as FormatInfo
}


// http://stackoverflow.com/a/16267018/4757748
export function closestDimensions(area: number): [number, number] {
	let width = Math.floor(Math.sqrt(area))
	while (area % width && width > 1) {
		width -= 1
	}
	return [width, area / width]
}