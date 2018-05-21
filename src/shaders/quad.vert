#version 300 es

precision highp float;

out vec2 bl_UV;

void main() {
	float x = -1.0 + float((gl_VertexID & 1) << 2);
	float y = -1.0 + float((gl_VertexID & 2) << 1);
	gl_Position = vec4(x, y, 0, 1);
	bl_UV = gl_Position.xy * 0.5 + 0.5;
}
