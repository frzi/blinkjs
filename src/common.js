// Buffer types.
const type = (name, bytes, integer, unsigned) => Object.freeze({ name, bytes, integer, unsigned })

export const FLOAT  = type('float',  4, false, false)
export const INT32  = type('int32',  4, true,  false)
export const INT16  = type('int16',  2, true,  false)
export const INT8   = type('int8',   1, true,  false)
export const UINT32 = type('uint32', 4, true,  true)
export const UINT16 = type('uint16', 2, true,  true)
export const UINT8  = type('uint8',  1, true,  true)


// TypedArray helpers.
export const arrayConstructors = new Map([
	[FLOAT,  Float32Array],
	[INT32,  Int32Array],
	[INT16,  Int16Array],
	[INT8,   Int8Array],
	[UINT32, Uint32Array],
	[UINT16, Uint16Array],
	[UINT8,  Uint8Array],
])

export const arrayTypes = new Map([
	[Float32Array,      FLOAT],
	[Int32Array,        INT32],
	[Int16Array,        INT16],
	[Int8Array,         INT8],
	[Uint32Array,       UINT32],
	[Uint16Array,       UINT16],
	[Uint8Array,        UINT8],
	[Uint8ClampedArray, UINT8],
])


/// Hands out all the types associated with a Buffer's data.
export function formatInfo(dataType, vectorSize = 1) {
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
	}
}


/// http://stackoverflow.com/a/16267018/4757748
export function closestDimensions(area) {
	let width = Math.floor(Math.sqrt(area))
	while (area % width && width > 1) {
		width -= 1
	}
	return [width, area / width]
}