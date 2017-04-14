import fs from 'fs'
import jscc from 'rollup-plugin-jscc'

const _DEVMODE = ~process.argv.indexOf('--dev') || null
const [_MAJOR, _MINOR, _PATCH] = require('./package.json').version.split('.')

const shader = {
	load(file) {
		if (!/(\.vert|\.frag|\.vsh|\.fsh|\.glsl)$/gi.test(file)) {
			return 
		}

		let shaderSource = fs.readFileSync(file, 'utf8')

		return 'export default `' + shaderSource + '`'
	}
}

const defines = {
	_DEVMODE, 
	_MAJOR, _MINOR, _PATCH,
}

export default {
	entry: 'src/index.js',
	plugins: [
		shader,
		jscc({ values: defines }),
	],
	targets: [
		{
			dest: 'dist/blink.js',
			format: 'umd',
			moduleName: 'blink',
			sourceMap: _DEVMODE,
		}
	],
}