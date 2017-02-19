blink.js
========

> Easy GPGPU in the browser, powered by WebGL 2.0.

[![Latest NPM release][npm-badge]][npm-badge-url]
[![License][license-badge]][license-badge-url]
[![Dependencies][dependencies-badge]][dependencies-badge-url]
[![Dev Dependencies][devDependencies-badge]][devDependencies-badge-url]

With WebCL being practically dead and compute shaders still a dream away, it's time to take matters in our own hands. __blink.js__ exploits the power of WebGL 2.0 to provide web developers with an easy-to-use library for GPGPU computing in the browser.

## Table of contents
- [Quickstart](#quickstart)
- [Usage](#usage)
  - [Classes](#classes)
    - [Buffer](#buffer)
    - [DeviceBuffer](#devicebuffer)
    - [Kernel](#Kernel)
  - [Types](#types)
  - [Device](#device)
- [Examples](#examples)
- [GLSL](#glsl)
  - [Built-in variables](#built-in-variables)
- [Type compatibility](#type-compatibility)
- [Built for today](#built-for-today)
- [See also](#see-also)

## Quickstart
__blink.js__ works with two types of objects: Buffers and Kernels. A Buffer is an (large) array of values that can be read from and/or written to. A Kernel contains the shader code that will be executed on the device.

### Counting up
In the following example we will initialize a Buffer, allocating space for 1,048,576 integers (4 MB). The Kernel will set all values to their corresponding location in the buffer.
```javascript
let buffer = new blink.Buffer({
    alloc: 1024 ** 2,
    type: blink.UINT32,
    vector: 1
}) // 4 MB

let kernel = new blink.Kernel({
    output: { buffer }
}, `void main() {
        buffer = bl_Id();
    }`)

kernel.exec()

for (let a = 0; a < 10; a++) {
    console.log(`Value at ${a} is ${buffer.data[a]}.`)
}
```

### Greyscale image
In this example we will use __blink.js__ to convert the image data of a canvas context to black and white.
```javascript
const ctx = canvas.getContext('2d')
/* Perform any drawing in the context here. */

let imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
let buffer = new blink.Buffer({
    data: imageData.data,
    vector: 4
})

let kernel = new blink.Kernel({
    input: { in_rgba: buffer },
    output: { out_rgba: buffer }
}, `void main() {
        lowp uvec4 color = texture(in_rgba, bl_UV);
        mediump uint grey = (color.r + color.g + color.b) / 3u;
        out_rgba = uvec4(uvec3(grey), color.a);
    }`)

kernel.exec()

ctx.putImageData(imageData, 0, 0)
```


## Usage
### Classes
#### Buffer
```javascript
let buffer = new blink.Buffer({ alloc: 1024 ** 2, type: blink.UINT8, vector: 1 }) // 1 MB
buffer.data[0] = 1
```
The Buffer class represents an array of values that can be read from, and written to, on the device. A Buffer's data is copied to the device the moment it's required. After a Kernel is done executing all its steps, the data on the device is copied back to the host, the data on the device is destroyed immediately.

##### new Buffer({ alloc|data, type, vector })
##### Buffer.prototype.data
##### Buffer.prototype.copy()

#### DeviceBuffer
```javascript
const size = 512 ** 2 * 4
let d_buffer = new blink.DeviceBuffer({ alloc: size * 4, type: blink.UINT32, vector 4}) // 4 MB

d_buffer.toDevice(new Uint32Array(size).fill(1))
const array = d_buffer.toHost()

d_buffer.delete()
```
Unlike a [Buffer](#buffer), a DeviceBuffer keeps its memory allocated __only__ on the device. This greatly increases performance when memory is not required to be copied back to the host after a Kernel is done executing.

Memory is allocated (or copied) the moment the DeviceBuffer is initialized. Memory is retained on the device until the DeviceBuffer's `delete` method is called. (Or until the browser garbage collects the DeviceBuffer. But it is strongly advised to manually maintain the memory on the device.)

Data can be downloaded to the host and uploaded to the device using the `toHost` and `toDevice` methods respectively.

##### new DeviceBuffer({ alloc|data, type, vector })
##### DeviceBuffer.prototype.copy()
##### DeviceBuffer.prototype.delete()
##### DeviceBuffer.prototype.toDevice(data)
##### DeviceBuffer.prototype.toHost([data])

#### Kernel
```javascript
let buffer = new blink.Buffer(/* ... */)

let input = { in_buffer: buffer }
let output = { out_buffer: buffer }
let kernel = new blink.Kernel({ input, output }, `
    uniform float multiplier;

    void main() {
        float val = texture(in_buffer, bl_UV).r;
        out_buffer = val * multiplier;
    }`)

kernel.exec({ multiplier: 2 })
kernel.delete()
```

##### new Kernel({ input, output }, shaderSource)
##### Kernel.prototype.exec([uniforms])
##### Kernel.prototype.delete()

### Types
* `blink.FLOAT` (`Float32Array`)
* `blink.UINT8` (`Uint8Array`) (`Uint8ClampedArray` will be casted to `Uint8Array`)
* `blink.UINT16` (`Uint16Array`)
* `blink.UINT32` (`Uint32Array`)
* `blink.INT8` (`Int8Array`)
* `blink.INT16` (`Int16Array`)
* `blink.INT32` (`Int32Array`)

### Device
`blink.device` contains information gathered from the WebGL context.
* `glslVersion`: version of GLSL.
* `maxColorAttachments`: Maximum number of outputs a [Kernel](#kernel) can render to in a single step.
* `maxTextureSize`: Maximum dimension of an input/output buffer.
* `maxTextureUnits`: Maximum number of input buffers.
* `renderer`: Renderer name.
* `vendor`: Vendor name.
* `unmaskedRenderer`: Unmasked renderer name.<sup>[1]</sup>
* `unmaskedVendor`: Unmasked vendor name.<sup>[1]</sup>

<sup>[1]</sup> Only available if the [`WEBGL_debug_renderer_info`](https://www.khronos.org/registry/webgl/extensions/WEBGL_debug_renderer_info/) extension is supported.

## Examples
Maybe later.

## GLSL
WebGL 2.0 supports GLSL ES 3.00, which includes (but not limited to) the following significant new features compared to GLSL ES 1.30 in WebGL 1.0:
* Unsigned integer types.
* Bitwise operators.
* `for` and `while` loops with variable lengths.
* Non-square matrix types.
* A butt-load of matrix functions.

### Built-in variables
```glsl
highp vec2 bl_UV;    // Normalized coordinate of the current fragment.
highp ivec2 bl_Size; // Dimensions of the output buffer(s).
highp uint bl_Id();  // Returns the id of the current fragment.
```

## Type compatibility
Different combinations of operating systems, browsers and hardware may not support the entire list of type and vector size combinations.
See [COMPATIBILITY.md](./COMPATIBILITY.md) for a personally tested list of compatibility. Or open [test/report.html](./test/report.html) in your browser to test yourself.

## Built for today
Both Firefox 51 and Chrome 56 (on desktop) support WebGL 2.0 now. As of writing this, WebGL 2.0 support across other browsers varies between 'disabled by default' to not 'supported at all'.

__blink.js__ uses ES6 syntax/features that are __not__ transpiled or polyfilled for ES5. [Babel](https://babeljs.io) is only used to minify the final code, using the [babili](https://github.com/babel/babili) preset.

## See also
[headless-gl](https://github.com/stackgl/headless-gl) - create WebGL contexts in Node.js, powered by ANGLE.

[turbo.js](https://github.com/turbo/js) - a similar GPGPU library for the browser, using WebGL 1.0.

[NOOOCL](https://github.com/unbornchikken/NOOOCL) - OpenCL bindings for Node.js.

[The Book of Shaders](https://thebookofshaders.com/) - Great introduction to GLSL by Patricio Gonzalez Vivo.

[WebGL 2.0 Reference card](https://www.khronos.org/files/webgl20-reference-guide.pdf) - PDF containing all GLSL ES 3.00 functions and variables.

[npm-badge]: https://img.shields.io/npm/v/blink.js.svg
[npm-badge-url]: https://www.npmjs.com/package/blink.js
[license-badge]: https://img.shields.io/npm/l/blink.js.svg
[license-badge-url]: ./LICENSE
[dependencies-badge]: https://img.shields.io/david/blink.js/blink.js.svg
[dependencies-badge-url]: https://david-dm.org/frzi/blink.js
[devdependencies-badge]: https://img.shields.io/david/dev/frzi/blinkjs.svg
[devdependencies-badge-url]: https://david-dm.org/frzi/blink.js
