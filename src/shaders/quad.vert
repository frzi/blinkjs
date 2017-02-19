#version 300 es

precision highp float;

layout(location = 0) in vec2 pos;
out vec2 bl_UV;

void main() {
	gl_Position = vec4(pos, 0.0, 1.0);
	bl_UV = pos * 0.5 + 0.5;
}