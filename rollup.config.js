import fs from 'fs'
import pkg from './package.json'
import replace from 'rollup-plugin-replace'
import resovle from 'rollup-plugin-node-resolve'
import typescript from 'rollup-plugin-typescript2'

const DEVMODE = process.env.NODE_ENV != 'production'
const [MAJOR, MINOR, PATCH] = pkg.version.split('.')

const shader = {
	load(file) {
		if (!/\.(vert|frag|vsh|fsh|glsl)$/gi.test(file)) {
			return 
		}

		let shaderSource = fs.readFileSync(file, 'utf8')

		return 'export default `' + shaderSource + '`'
	}
}

export default {
	input: 'src/index.ts',
	plugins: [
		shader,
		resolve({
			extensions: ['.ts', '.js', '.mjs'],
		}),
		replace({
			values: {
				__DEVMODE__: JSON.stringify(DEVMODE),
				__MAJOR__: JSON.stringify(MAJOR),
				__MINOR__: JSON.stringify(MINOR),
				__PATCH__: JSON.stringify(PATCH),
			}
		}),
		typescript(),
	],
	output: {
		file: 'dist/blink.js',
		format: 'umd',
		name: 'blink',
		sourcemap: DEVMODE
	}
}