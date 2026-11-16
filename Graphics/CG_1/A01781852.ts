/*
 * Smiley Face en 2d Tarea 1 - CG_1. Con transformaciones de rotación, 
 *traslación y escalamiento, con un pivote arbitrario.
 *
 * A01781852 Abel Dominguez
 */

'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { diamond, smiley } from '../libs/shapes.js';
import { V2, M3, type Vec2, type Mat3 } from '../libs/2d-lib.js';
import { Scene } from '../libs/scene.js';
import { type Color } from '../libs/color.js';

// Import the shaders from external files
import vsGLSL from './vs_cara.glsl?raw';
import fsGLSL from './fs_cara.glsl?raw';


// Options for the order in which the transformations are applied
const transformOrders = [
    'scale -> translation -> rotation',
    'translation -> scale -> rotation',
    'rotation -> translation -> scale',
    'rotation -> scale -> translation',
];

// Settings for the UI that are not part of the objects
const settings = {
    order: transformOrders[0],
};


/*
 * Subclass of Scene with the particular objects and settings for this example.
 * Specifies the objects that will be used, and the UI operations available.
 */
class RotationScene extends Scene {
    constructor(gl: WebGL2RenderingContext) {
        super(gl, vsGLSL, fsGLSL);

        // Create the objects for this scene
        const model = this.addObject('model', smiley(120),
            [ Math.random(), Math.random(), Math.random(), 1 ]);
        model.transforms.t.x = gl.canvas.width / 2;
        model.transforms.t.y = gl.canvas.height / 2;

        const pivot = this.addObject('pivot', diamond(20),
            [ 0.6, 0.6, 0.6, 1]);
        pivot.transforms.t.x = gl.canvas.width / 4;
        pivot.transforms.t.y = gl.canvas.height / 2;
    }

    // Method to draw the scene.
    protected render(): void {
        const { gl, programInfo } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        // Vector to the position of the model
        const v2_trans: Vec2 = V2.create(model.transforms.t.x, model.transforms.t.y);
        const v2_scale: Vec2 = V2.create(model.transforms.s.x, model.transforms.s.y);

        // Vector to translate the pivot to the center of the world
        const v2_pivot_to_center: Vec2 = V2.create(-pivot.transforms.t.x,
                                                   -pivot.transforms.t.y);
        // Vector to translate the pivot back to its original position
        const v2_center_to_pivot: Vec2 = V2.create(pivot.transforms.t.x,
                                                   pivot.transforms.t.y);

        // Transform matrices for the model
        const scaleMatrix: Mat3 = M3.scale(v2_scale);
        const translateMatrix: Mat3 = M3.translation(v2_trans);
        const pivotToCenter: Mat3 = M3.translation(v2_pivot_to_center);
        const rotateMatrix: Mat3 = M3.rotation(model.transforms.rr.z);
        const centerToPivot: Mat3 = M3.translation(v2_center_to_pivot);

        // Rotation around an arbitrary point (the pivot):
        // move the pivot to the origin, rotate, and move the pivot back
        let rotateAroundPivot: Mat3 = M3.identity();
        rotateAroundPivot = M3.multiply(pivotToCenter, rotateAroundPivot);
        rotateAroundPivot = M3.multiply(rotateMatrix, rotateAroundPivot);
        rotateAroundPivot = M3.multiply(centerToPivot, rotateAroundPivot);

        // Create a composite transform matrix, in the order selected in the UI
        let modelTransforms: Mat3 = M3.identity();
        switch (settings.order) {
            case 'scale -> translation -> rotation':
                modelTransforms = M3.multiply(scaleMatrix, modelTransforms);
                modelTransforms = M3.multiply(translateMatrix, modelTransforms);
                modelTransforms = M3.multiply(rotateAroundPivot, modelTransforms);
                break;
            case 'translation -> scale -> rotation':
                modelTransforms = M3.multiply(translateMatrix, modelTransforms);
                modelTransforms = M3.multiply(scaleMatrix, modelTransforms);
                modelTransforms = M3.multiply(rotateAroundPivot, modelTransforms);
                break;
            case 'rotation -> translation -> scale':
                modelTransforms = M3.multiply(rotateAroundPivot, modelTransforms);
                modelTransforms = M3.multiply(translateMatrix, modelTransforms);
                modelTransforms = M3.multiply(scaleMatrix, modelTransforms);
                break;
            case 'rotation -> scale -> translation':
                modelTransforms = M3.multiply(rotateAroundPivot, modelTransforms);
                modelTransforms = M3.multiply(scaleMatrix, modelTransforms);
                modelTransforms = M3.multiply(translateMatrix, modelTransforms);
                break;
        }

        gl.useProgram(programInfo.program);

        let uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: modelTransforms,
            u_color: model.color,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(model.vao);
        twgl.drawBufferInfo(gl, model.bufferInfo);

        // Transform matrices for the pivot
        const translateMatrixPivot: Mat3 = M3.translation(v2_center_to_pivot);

        // Composite transform matrix for the pivot (only translation)
        let pivotTransforms: Mat3 = M3.identity();
        pivotTransforms = M3.multiply(translateMatrixPivot, pivotTransforms);

        uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: pivotTransforms,
            u_color: pivot.color,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(pivot.vao);
        twgl.drawBufferInfo(gl, pivot.bufferInfo);
    }

    setupUI(): void {
        const { gl } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        const gui = new GUI();

        // Drop-down menu to select the order of the transformations
        gui.add(settings, 'order', transformOrders)
            .onChange((value: string) => {
                settings.order = value;
            });

        const modelFolder = gui.addFolder('Model');

        const traFolder = modelFolder.addFolder('Translation');
        traFolder.add(model.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                model.transforms.t.x = value;
            });
        traFolder.add(model.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                model.transforms.t.y = value;
            });

        const rotFolder = modelFolder.addFolder('Rotation');
        rotFolder.add(model.transforms.rr, 'z', 0, Math.PI * 2)
            .onChange((value: number) => {
                model.transforms.rr.z = value;
            });

        const scaFolder = modelFolder.addFolder('Scale');
        scaFolder.add(model.transforms.s, 'x', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.x = value;
            });
        scaFolder.add(model.transforms.s, 'y', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.y = value;
            });

        const colorFolder = modelFolder.addFolder('Color');
        colorFolder.addColor(model, 'color')
            .onChange((value: Color) => {
                model.color = value;
            });

        const pivotFolder = gui.addFolder('Pivot');
        const pivotTraFolder = pivotFolder.addFolder('Translation');
        pivotTraFolder.add(pivot.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                pivot.transforms.t.x = value;
            });
        pivotTraFolder.add(pivot.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                pivot.transforms.t.y = value;
            });
    }
}

/*
 * Main function to initialize the WebGL context, create the scene, and set up the UI.
 */
function main(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No canvas element found in the document');
    }

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        throw new Error('WebGL2 is not supported by this browser');
    }

    const scene = new RotationScene(gl);
    scene.setupUI();
    scene.draw(0);
}

main()
