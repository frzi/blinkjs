import fs from 'fs'
import Preprocessor from 'preprocessor'

const DEVMODE = ~process.argv.indexOf('--dev') || null
const [MAJOR, MINOR, PATCH] = require('./package.json').version.split('.')

const shader = {
	load(file) {
		if (!/(\.vert|\.frag|\.vsh|\.fsh|\.glsl)$/gi.test(file)) {
			return 
		}

		let shaderSource = fs.readFileSync(file, 'utf8')

		return 'export default `' + shaderSource + '`'
	}
}

const preprocessor = function(defines) {
	return {
		transform(code, id) {
			let processor = new Preprocessor(code, defines)
			return processor.process(defines)
		}
	}
}

export default {
	entry: 'src/index.js',
	plugins: [
		shader,
		preprocessor({ MAJOR, MINOR, PATCH, DEVMODE }),
	],
	targets: [
		{
			dest: 'dist/blink.js',
			format: 'umd',
			moduleName: 'blink',
			sourceMap: DEVMODE,
		}
	],
}