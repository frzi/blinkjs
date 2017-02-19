#version 300 es

precision highp float;
precision highp int;

uniform highp ivec2 bl_Size;

in vec2 bl_UV;

highp uint bl_Id() {
	highp ivec2 uv = ivec2(bl_UV * vec2(bl_Size));
	return uint(uv.x + uv.y * bl_Size.x);
}