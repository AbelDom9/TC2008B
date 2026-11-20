#version 300 es
// En este archivo se implemento Shader de fragmentos:
//pinta cada triangulo con el color de sus vertices
// Ademas este archivo me ayudo la IA para poderlo implementar de manera correcta
precision highp float;

in vec4 v_color;

out vec4 outColor;

void main() {
    outColor = v_color;
}
