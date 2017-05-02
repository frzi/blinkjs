(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.blink = global.blink || {})));
}(this, (function (exports) { 'use strict';

/**
 * WebGL 2.0 related objects and helpers.
 */
const gl = function () {
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = 1;

	const options = {
		alpha: false,
		antialias: false,
		depth: false,
		stencil: false,
	};

	let gl = canvas.getContext('webgl2', options);

	if (!gl) {
		throw new Error('WebGL 2.0 not supported by the browser.')
	}
	else if (!(gl.floatExt = gl.getExtension('EXT_color_buffer_float'))) {
		throw new Error('EXT_color_buffer_float not supported.')
	}

	gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

	return gl
}();


const device = function () {
	let device = {
		glslVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
		maxColorAttachments: gl.getParameter(gl.MAX_DRAW_BUFFERS),
		maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
		maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
		renderer: gl.getParameter(gl.RENDERER),
		vendor: gl.getParameter(gl.VENDOR),
	};

	const debugRendererInfo = gl.getExtension('WEBGL_debug_renderer_info');
	if (debugRendererInfo) {
		device.unmaskedRenderer = gl.getParameter(debugRendererInfo.UNMASKED_RENDERER_WEBGL),
		device.unmaskedVendor = gl.getParameter(debugRendererInfo.UNMASKED_VENDOR_WEBGL);
	}

	return Object.freeze(device)
}();


const quadVAO = function () {
	// Quad vertices.
	const vertices = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
	let vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	// Quad VAO.
	let vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	gl.enableVertexAttribArray(0);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

	gl.bindVertexArray(null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	return vao
}();

// Buffer types.
const type = (name, bytes, integer, unsigned) => Object.freeze({ name, bytes, integer, unsigned });

const FLOAT  = type('float',  4, false, false);
const INT32  = type('int32',  4, true,  false);
const INT16  = type('int16',  2, true,  false);
const INT8   = type('int8',   1, true,  false);
const UINT32 = type('uint32', 4, true,  true);
const UINT16 = type('uint16', 2, true,  true);
const UINT8  = type('uint8',  1, true,  true);

// Wrap modes for the textures.
const CLAMP  = 33071;
const REPEAT = 10497;
const MIRROR = 33648;


// TypedArray helpers.
const arrayConstructors = new Map([
	[FLOAT,  Float32Array],
	[INT32,  Int32Array],
	[INT16,  Int16Array],
	[INT8,   Int8Array],
	[UINT32, Uint32Array],
	[UINT16, Uint16Array],
	[UINT8,  Uint8Array],
]);

const arrayTypes = new Map([
	[Float32Array,      FLOAT],
	[Int32Array,        INT32],
	[Int16Array,        INT16],
	[Int8Array,         INT8],
	[Uint32Array,       UINT32],
	[Uint16Array,       UINT16],
	[Uint8Array,        UINT8],
	[Uint8ClampedArray, UINT8],
]);


/// Hands out all the types associated with a Buffer's data.
function formatInfo(dataType, vectorSize = 1) {
	const { bytes, integer, unsigned } = dataType;

	const precision = ['lowp', 'mediump', null, 'highp'][bytes - 1];

	const inputType = integer && unsigned ? 'usampler2D' : integer ? 'isampler2D' : 'sampler2D';

	let outputType = null;
	if (vectorSize == 1) {
		outputType = integer && unsigned ? 'uint' : integer ? 'int' : 'float';
	}
	else {
		outputType = integer && unsigned ? 'uvec' : integer ? 'ivec' : 'vec';
		outputType += vectorSize;
	}

	let internalFormat = ['R', 'RG', 'RGB', 'RGBA'][vectorSize - 1];
	internalFormat += bytes * 8; // 8, 16 or 32
	internalFormat += integer && unsigned ? 'UI' : integer ? 'I' : 'F';

	let format = ['RED', 'RG', 'RGB', 'RGBA'][vectorSize - 1];
	format += integer ? '_INTEGER' : '';

	let type = '';
	if (integer) {
		if (unsigned) {
			type = 'UNSIGNED_';
		}
		type += bytes == 1 ? 'BYTE' : bytes == 2 ? 'SHORT' : 'INT';
	}
	else {
		type = 'FLOAT';
	}

	return {
		bytes, format, internalFormat,
		inputType, integer, outputType,
		precision, type, unsigned,
	}
}


/// http://stackoverflow.com/a/16267018/4757748
function closestDimensions(area) {
	let width = Math.floor(Math.sqrt(area));
	while (area % width && width > 1) {
		width -= 1;
	}
	return [width, area / width]
}

/**
 * Internal (helper) class.
 */
class Texture {
	constructor(internalFormat, width, height, format, type, data, alignment, wrapS, wrapT) {
		const previousTex = gl.getParameter(gl.TEXTURE_BINDING_2D);

		this.internalFormat = internalFormat;
		this.width = width;
		this.height = height;
		this.format = format;
		this.type = type;
		this.alignment = alignment;

		this.id = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.id);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS || gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT || gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl[this.internalFormat], width, height, 0, gl[this.format], gl[this.type], data);

		gl.bindTexture(gl.TEXTURE_2D, previousTex);
	}

	delete() {
		if (gl.getParameter(gl.TEXTURE_BINDING_2D) == this.id) {
			gl.bindTexture(gl.TEXTURE_2D, null);
		}
		gl.deleteTexture(this.id);
		delete this.id;
	}

	copy() {
		let copy = new Texture(this.internalFormat, this.width, this.height, this.format, this.type, null, this.alignment);

		withTemporaryFBO(() => {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
			gl.readBuffer(gl.COLOR_ATTACHMENT0);

			gl.bindTexture(gl.TEXTURE_2D, copy.id);
			gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.width, this.height, 0);
			gl.bindTexture(gl.TEXTURE_2D, null);
		});		

		return copy
	}

	upload(data) {
		gl.bindTexture(gl.TEXTURE_2D, this.id);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl[this.internalFormat], this.width, this.height, 0, gl[this.format], gl[this.type], data);
		gl.bindTexture(gl.TEXTURE_2D, null);
		return this
	}

	read(data) {
		withTemporaryFBO(() => {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
			gl.readBuffer(gl.COLOR_ATTACHMENT0);
			gl.readPixels(0, 0, this.width, this.height, gl[this.format], gl[this.type], data, 0);
		});
		return true
	}
}

function withTemporaryFBO(fn) {
	let previousFBO = gl.getParameter(gl.FRAMEBUFFER_BINDING);
	let fbo = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
	fn();
	gl.bindFramebuffer(gl.FRAMEBUFFER, previousFBO);
	gl.deleteFramebuffer(fbo);
}

/**
 * The `Buffer` object allocates memory on the host. Once the `Buffer`
 * is requested on the device (GPU), the contents of `Buffer`'s data
 * are allocated and copied from the host to the device.
 * 
 * Once te device is done computing, the contents of the `Buffer` on
 * the device are copied back to the host.
 *
 * All device copies are stored and mainted through `BufferCache`.
 *
 * NOTE: Data of a `Buffer` are NOT retained on the device. Once the
 * data has been copied back to the host, the device copy will be
 * destroyed immediately. To retain data on the device, please use
 * the `DeviceBuffer` object.
 */

let readablesMap = new WeakMap();
let writablesMap = new WeakMap();

class Buffer {
	constructor({alloc, data, type = FLOAT, vector = 1, wrap = CLAMP}) {
		this.vector = Math.min(Math.max(vector, 1), 4);
		if (this.vector == 3) {
			console.warn('Vector size of 3 not supported. Choosing vector size 4.');
			this.vector = 4;
		}

		let size = alloc || data.length;
		this.dimensions = closestDimensions(size / this.vector);

		// Wrap mode for S and T.
		this.wrap = Array.isArray(wrap) ? wrap : [wrap, wrap];

		const maxDimension = device.maxTextureSize ** 2;
		if (Math.max(...this.dimensions) > maxDimension) {
			throw new Error('Buffer size exceeds device limit.')
		}

		if (alloc != null) {
			const typedArray = arrayConstructors.get(type);
			this.data = new typedArray(size);
		}
		else {
			if (data instanceof Uint8ClampedArray) {
				this.data = new Uint8Array(data.buffer);
			}
			else {
				this.data = data;
			}
		}
	}

	delete() {
		delete this.data;
		this._finish();
	}

	copy() {
		return new Buffer({
			data: new this.data.constructor(this.data),
			vector: this.vector,
		})
	}

	/// Private methods / properties.

	get formatInfo() {
		for (const [constructor, type] of arrayTypes) {
			if (this.data instanceof constructor) {
				return formatInfo(type, this.vector)
			}
		}
		return null
	}

	_getReadable(forceCreate = false) {
		if (!readablesMap.has(this) && forceCreate) {
			const readable = textureForBuffer(this, this.data);	
			readablesMap.set(this, readable);
		}
		return readablesMap.get(this)
	}

	_getWritable(forceCreate = false) {
		if (!writablesMap.has(this) && forceCreate) {
			const writable = textureForBuffer(this, this.data);
			writablesMap.set(this, writable);
		}
		return writablesMap.get(this)
	}

	_finish() {
		let readable = this._getReadable();
		if (readable) {
			readable.delete();
			readablesMap.delete(this);
		}

		let writable = this._getWritable();
		if (writable) {
			writable.delete();
			writablesMap.delete(this);
		}
	}
}

function textureForBuffer(buffer, data = null, wrap) {
	const { bytes, internalFormat, format, type } = buffer.formatInfo;
	const [width, height] = buffer.dimensions;
	return new Texture(internalFormat, width, height, format, type, data, bytes, ...buffer.wrap)
}

/**
 * The `DeviceBuffer` only allocates memory on the host. Memory is
 * allocated the moment the `DeviceBuffer` is constructed. Memory
 * on the device is developer managed. Indeed, the device memory is
 * retained until the developer destroys the `DeviceBuffer` using
 * the `destroy()` method.
 *
 * Memory from the host can be copied to the device and vice versa.
 */

class DeviceBuffer {
	constructor({alloc, data, type = FLOAT, vector = 1, wrap = CLAMP}) {
		this.vector = Math.min(Math.max(vector, 1), 4);
		if (this.vector == 3) {
			console.warn('Vector size of 3 not supported. Choosing vector size 4.');
			this.vector = 4;
		}

		this.size = alloc || data.length;
		this.dimensions = closestDimensions(this.size / this.vector);

		// Wrap mode for S and T.
		this.wrap = Array.isArray(wrap) ? wrap : [wrap, wrap];

		const maxDimension = device.maxTextureSize ** 2;
		if (Math.max(...this.dimensions) > maxDimension) {
			throw new Error('Buffer size exceeds device limit.')
		}
		
		let associatedType = type;
		if (data) {
			for (const [constructor, type] of arrayTypes) {
				if (data instanceof constructor) {
					associatedType = type;
					break
				}
			}
		}
		this.type = associatedType;

		// Allocate on the device, immediately.
		let texture = this._getReadable(true);

		if (data) {
			if (data.constructor == Uint8ClampedArray) {
				data = new Uint8Array(data.buffer);
			}
			texture.upload(data);
		}
	}

	delete() {
		if (readablesMap.has(this)) {
			readablesMap.get(this).delete();
			readablesMap.delete(this);
		}
	}

	copy() {
		let copyReadable = this._readable.copy();
		let copyBuffer = new DeviceBuffer({
			alloc: this.size,
			type: this.type,
			vector: this.vector
		});

		copyBuffer._readable.delete();
		copyBuffer._readable = copyReadable;
		return copyBuffer
	}

	toDevice(data) {
		this._getReadable().upload(data);
	}

	toHost(data) {
		if (!data) {
			const typedArray = arrayConstructors.get(this.type);
			data = new typedArray(this.size);
		}

		// Cast Uint8ClampedArray to Uint8Array.
		let ref = data;
		if (data instanceof Uint8ClampedArray) {
			ref = new Uint8Array(data.buffer);
		}
		this._getReadable().read(ref);

		return data
	}

	/// Private methods / properties.

	get formatInfo() {
		return formatInfo(this.type, this.vector)
	}

	_getReadable(forceCreate = false) {
		if (!readablesMap.has(this) && forceCreate) {
			const { bytes, internalFormat, format, type } = this.formatInfo;
			const [width, height] = this.dimensions;
			readablesMap.set(this, new Texture(internalFormat, width, height, format, type, null, bytes, ...this.wrap));
		}
		return readablesMap.get(this)
	}

	_getWritable(forceCreate = false) {
		if (!writablesMap.has(this) && forceCreate) {
			writablesMap.set(this, this._getReadable(true).copy());
		}
		return writablesMap.get(this)
	}

	_finish() {
		// Swap.
		let writableCopy = this._getWritable();
		if (writableCopy) {
			let readableCopy = this._getReadable();
			if (readableCopy) {
				readableCopy.delete();
			}
			readablesMap.set(this, writableCopy);
			writablesMap.delete(this);
		}
	}
}

var vertexSource = `#version 300 es

precision highp float;

layout(location = 0) in vec2 pos;
out vec2 bl_UV;

void main() {
	gl_Position = vec4(pos, 0.0, 1.0);
	bl_UV = pos * 0.5 + 0.5;
}`;

// Keep the vertex shader in memory.
const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);

/**
 * Internal (helper) class.
 */
class Program {
	constructor(fragSource) {
		let fragShader = compileShader(gl.FRAGMENT_SHADER, fragSource);

		this.id = gl.createProgram();
		gl.attachShader(this.id, vertexShader);
		gl.attachShader(this.id, fragShader);
		gl.deleteShader(fragShader);

		gl.linkProgram(this.id);

		if (!gl.getProgramParameter(this.id, gl.LINK_STATUS)) {
			console.error('Unable to link program. Info log:');
			console.warn(gl.getProgramInfoLog(this.id));
			return null
		}

		// Get attributes and uniforms.
		this.attributes = {};
		const attribCount = gl.getProgramParameter(this.id, gl.ACTIVE_ATTRIBUTES);
		for (let a = 0; a < attribCount; a++) {
			let attribute = gl.getActiveAttrib(this.id, a);
			attribute.id = gl.getAttribLocation(this.id, attribute.name);
			this.attributes[attribute.name] = attribute;
		}

		this.uniforms = {};
		const uniformCount = gl.getProgramParameter(this.id, gl.ACTIVE_UNIFORMS);
		for (let u = 0; u < uniformCount; u++) {
			let uniform = gl.getActiveUniform(this.id, u);
			uniform.id = gl.getUniformLocation(this.id, uniform.name);
			this.uniforms[uniform.name] = uniform;
		}
	}

	delete() {
		gl.deleteProgram(this.id);
		delete this.id;
	}

	setUniform(name, ...values) {
		if (!this.uniforms[name]) {
			// console.warn(`${name} not a valid uniform.`)
			return
		}

		const { id, size, type } = this.uniforms[name];
	
		let fnName = uniformsFnTable[type];
		if (size > 1 && fnName[fnName.length - 1] != 'v') {
			fnName += 'v';
		}

		if (fnName.indexOf('Matrix') == -1) {
			gl[fnName](id, ...values);
		}
		else {
			gl[fnName](id, false, ...values);
		}
	}
}

function compileShader(type, source) {
	// Check if the shader defines glsl version.
	if (!(/^#version 300 es/g).test(source)) {
		source = '#version 300 es\n\r' + source;
	}

	let shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		// TODO: Better error logging.
		const typeName = type == gl.VERTEX_SHADER ? 'vertex' : 'fragment';
		const infoLog = gl.getShaderInfoLog(shader);
		throw new Error(`Unable to compile ${typeName} shader. Info log: 
			${infoLog}`)
	}

	return shader
}

const uniformsFnTable = {
	[gl.FLOAT]:                   'uniform1f',
	[gl.FLOAT_VEC2]:              'uniform2f',
	[gl.FLOAT_VEC3]:              'uniform3f',
	[gl.FLOAT_VEC4]:              'uniform4f',
	[gl.INT]:                     'uniform1i',
	[gl.INT_VEC2]:                'uniform2i',
	[gl.INT_VEC3]:                'uniform3i',
	[gl.INT_VEC4]:                'uniform4i',
	[gl.UNSIGNED_INT]:            'uniform1ui',
	[gl.UNSIGNED_INT_VEC2]:       'uniform2ui',
	[gl.UNSIGNED_INT_VEC3]:       'uniform3ui',
	[gl.UNSIGNED_INT_VEC4]:       'uniform4ui',
	[gl.BOOL]:                    'uniform1i',
	[gl.BOOL_VEC2]:               'uniform2i',
	[gl.BOOL_VEC3]:               'uniform3i',
	[gl.BOOL_VEC4]:               'uniform4i',
	[gl.FLOAT_MAT2]:              'uniformMatrix2fv',
	[gl.FLOAT_MAT2x3]:            'uniformMatrix2x3fv',
	[gl.FLOAT_MAT2x4]:            'uniformMatrix2x4fv',
	[gl.FLOAT_MAT3]:              'uniformMatrix3fv',
	[gl.FLOAT_MAT3x2]:            'uniformMatrix3x2fv',
	[gl.FLOAT_MAT3x4]:            'uniformMatrix3x4fv',
	[gl.FLOAT_MAT4]:              'uniformMatrix4fv',
	[gl.FLOAT_MAT4x2]:            'uniformMatrix4x2fv',
	[gl.FLOAT_MAT4x3]:            'uniformMatrix4x3fv',
	[gl.SAMPLER_2D]:              'uniform1i',
	[gl.INT_SAMPLER_2D]:          'uniform1i',
	[gl.UNSIGNED_INT_SAMPLER_2D]: 'uniform1i',	
};

var fragTemplate = `#version 300 es

precision highp float;
precision highp int;

uniform highp ivec2 bl_Size;

in vec2 bl_UV;

highp uint bl_Id() {
	highp ivec2 uv = ivec2(bl_UV * vec2(bl_Size));
	return uint(uv.x + uv.y * bl_Size.x);
}`;

/**
 * Inputs and outputs have to be defined beforehand. 
 * Although this means the pipeline is *fixed*, it does allow you
 * to swap Buffers before executing the `Kernel`.
 *
 * Depending on the number of allowed color attachments, a `Kernel`
 * may have to split the number of executions in numerous steps.
 */

class Kernel {
	constructor(io, source) {
		this.inputs = io.in || io.input || io.inputs || {};
		this.outputs = io.out || io.output || io.outputs;

		if (!this.outputs || !Object.values(this.outputs).length) {
			throw new Error(`At least 1 output is required.`)
		}


		//
		// Check for conflicts.
		for (const output of Object.keys(this.outputs)) {
			for (const input of Object.keys(this.inputs)) {
				if (input === output) {
					throw new Error(`Conflicting input/output variable name: ${input}.`)
				}
			}
		}


		//
		// Compare maximum input variabes allowed by the device.
		let inputCount = Object.values(this.inputs).length;
		if (inputCount > device.maxTextureUnits) {
			throw new Error(`Maximum number of inputs exceeded. Allowed: ${device.maxTextureUnits}, given: ${inputCount}.`)
		}


		//
		// Split the task in multiple programs based on the maximum number of outputs.
		const maxOutputs = device.maxColorAttachments;
		const outputNames = Object.keys(this.outputs);
		const outputGroupCount = Math.ceil(outputNames.length / maxOutputs);
		let outputDescriptors = [];
		
		let groupStartIndex = 0;
		for (let a = 0; a < outputGroupCount; a++) {
			let descriptors = {};
			for (const [i, name] of outputNames.entries()) {
				const { outputType, precision } = this.outputs[name].formatInfo;
				descriptors[name] = { outputType, precision };

				if (i >= groupStartIndex && i < groupStartIndex + maxOutputs) {
					descriptors[name].location = i - groupStartIndex;
				}
			}
			outputDescriptors.push(descriptors);
			groupStartIndex += maxOutputs;
		}

		// Create the set of programs.
		this.steps = new Set(outputDescriptors.map((descriptors) => {
			const shaderSource = prepareFragmentShader(this.inputs, descriptors, source);
			let program = new Program(shaderSource);

			let out = [];
			for (const [name, descriptor] of Object.entries(descriptors)) {
				if (descriptor.location !== undefined) {
					out.push(name);
				}
			}

			return { out, program }
		}));
	}

	delete() {
		this.steps.forEach((obj) => {
			obj.program.delete();
		});
		this.steps.clear();

		delete this.inputs;
		delete this.outputs;
		delete this.steps;
	}

	exec(uniforms = {}) {
		// Check dimensions.
		let size = [];
		for (const output of Object.values(this.outputs)) {
			const dimensions = [...output.dimensions];
			if (!size.length) {
				size = dimensions;
			}
			else if (size[0] != dimensions[0] || size[1] != dimensions[1]) {
				throw new Error('Outputs require consistent sizes.')
			}
		}

		//
		// Prepare Framebuffer.
		let fbo = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

		//
		// Run every step.
		for (const step of this.steps) {
			// Output textures.
			for (const [index, name] of step.out.entries()) {
				const texture = this.outputs[name]._getWritable(true);
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + index, gl.TEXTURE_2D, texture.id, 0);
			}

			const { program } = step;
			gl.useProgram(program.id);

			gl.viewport(0, 0, size[0], size[1]);

			// Built-in uniforms.
			program.setUniform('bl_Size', ...size);

			// User uniforms.
			for (const [uniform, value] of Object.entries(uniforms)) {
				program.setUniform(uniform, value);
			}

			// Input textures.
			for (const [index, name] of Object.keys(this.inputs).entries()) {
				gl.activeTexture(gl.TEXTURE0 + index);
				const texture = this.inputs[name]._getReadable(true);
				gl.bindTexture(gl.TEXTURE_2D, texture.id);
				program.setUniform(name, index);
			}

			gl.bindVertexArray(quadVAO);
			gl.drawBuffers(step.out.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.bindVertexArray(null);

			// Unpacking time. But only for `Buffer`s.
			for (const [index, name] of step.out.entries()) {
				const buffer = this.outputs[name];
				if (buffer instanceof Buffer) {
					const { bytes, format, type } = buffer.formatInfo;
					gl.readBuffer(gl.COLOR_ATTACHMENT0 + index);
					gl.readPixels(0, 0, size[0], size[1], gl[format], gl[type], buffer.data, 0);
				}
			}

			gl.bindTexture(gl.TEXTURE_2D, null);
		}

		// Clean-up all resources.
		const allBuffers = new Set([...Object.values(this.inputs), ...Object.values(this.outputs)]);
		for (const buffer of allBuffers) {
			buffer._finish();
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.deleteFramebuffer(fbo);
	}
}


function prepareFragmentShader(inputs, outputDescriptors, source) {
	let uniforms = Object.entries(inputs).map(([name, buffer]) => {
		const { inputType, precision } = buffer.formatInfo;
		return `uniform ${precision} ${inputType} ${name};`
	});

	let outs = Object.entries(outputDescriptors).map(([name, props]) => {
		const layout = props.location !== undefined ? `layout(location = ${props.location}) out ` : '';
		return `${layout}${props.precision} ${props.outputType} ${name};`
	});

	return `${fragTemplate}

		${uniforms.join('\n\r')}

		${outs.join('\n\r')}

		${source}`
}

const VERSION = {
	major: 0,
	minor: 2,
	patch: 4,
	toString() { return `${this.major}.${this.minor}.${this.patch}` }
};

exports.VERSION = VERSION;
exports.device = device;
exports.context = gl;
exports.Buffer = Buffer;
exports.DeviceBuffer = DeviceBuffer;
exports.Kernel = Kernel;
exports.FLOAT = FLOAT;
exports.INT32 = INT32;
exports.INT16 = INT16;
exports.INT8 = INT8;
exports.UINT32 = UINT32;
exports.UINT16 = UINT16;
exports.UINT8 = UINT8;
exports.CLAMP = CLAMP;
exports.REPEAT = REPEAT;
exports.MIRROR = MIRROR;

Object.defineProperty(exports, '__esModule', { value: true });

})));
