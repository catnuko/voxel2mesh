<script setup>
import * as Cesium from 'cesium';
import { GUI, gui } from 'dat.gui';
import { initThree, read_raw } from '../utils'
import * as THREE from 'three'
import axios from 'axios'
import { mat4n } from 'wgpu-matrix'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { VertexNormalsHelper } from 'three/addons/helpers/VertexNormalsHelper.js';
import { Brush, Evaluator, ADDITION, SUBTRACTION, REVERSE_SUBTRACTION, INTERSECTION, DIFFERENCE, HOLLOW_SUBTRACTION, HOLLOW_INTERSECTION } from "three-bvh-csg";
import { Sampler, XMLExporter } from 'voxelizer';

async function read_to_mesh(voxel2mesh, filePath) {
    const fileInfo = await read_raw(filePath, "blob")
    const file = new File([fileInfo.blob], fileInfo.fileName)
    const outputName = fileInfo.fileName.replace(".raw", "") + ".obj"

    const { url } = await voxel2mesh.convert(
        {
            "blob": file,
            width: fileInfo.width,
            height: fileInfo.height,
            depth: fileInfo.depth,
            "percentage": 0.01,
            "quality": 1,
            "isolevel": 1 * 255,
            "fillBubbles": true,
            preSmooth: true,
            onlyLargest: false,
            postSmooth: 0,
            simplify_name: outputName,
            verbose: false,
        }
    );
    const objLoader = new OBJLoader()
    return new Promise((res) => {
        objLoader.load(url, (root) => {
            res(root)
        })
    })
}
class Voxel2Mesh {
    constructor() {
        const worker = new Worker("/voxel2mesh/voxel2mesh.worker.js")
        this.map = {}
        worker.onmessage = (e) => {
            const log = e.data.log;
            if (log !== undefined) {
                console.log(log)
                return;
            }
            const file = e.data.blob;
            const inputFileName = e.data.inputFileName
            const outputFileName = e.data.outputFileName
            if (file !== undefined) {
                let url = window.URL.createObjectURL(file);

                let promiseInfo = this.map[outputFileName]
                if (promiseInfo) {
                    promiseInfo.resolve({ file, url })
                    delete this.map[outputFileName]
                }
                return;
            }
            console.error("Unknown Message from WebWorker", e.data);
        }

        worker.onerror = function (e) {
            console.error(e);
        }
        this.worker = worker
    }
    convert(options) {
        if (this.map[options.simplify_name]) {
            console.error("等待上一个完成")
            return
        }
        const defaultOptions = {
            "percentage": 0.01,
            "quality": 1,
            preSmooth: true,
            onlyLargest: false,
            postSmooth: 0,
            verbose: false,
        }
        let resolve, reject
        const promise = new Promise((_res, _rej) => {
            resolve = _res;
            reject = _rej
        })
        this.map[options.simplify_name] = {
            promise, resolve, reject
        }
        this.worker.postMessage(
            {
                ...defaultOptions,
                ...options,
            }
        );
        return promise
    }
}
function fillUVAttribute(sphereGeometry, radius) {
    if (sphereGeometry.attributes.uv) {
        return
    }
    const uvs = []
    const positions = sphereGeometry.attributes.position.array
    for (let i = 0; i < positions.length; i += 3) {
        let x = positions[i]
        let y = positions[i + 1]
        let z = positions[i + 2]
        const v = new THREE.Vector3(x, y, z)
        const distance = v.length()
        const normalizedV = new THREE.Vector3(v.x / distance, v.y / distance, v.z / distance);
        const sphericalV = new THREE.Vector3(normalizedV.x * radius, normalizedV.y * radius, normalizedV.z * radius);

        const longitude = sphericalV.x;
        const latitude = Math.asin(sphericalV.z / radius);

        const u = longitude / (2 * Math.PI);
        const vv = latitude / Math.PI + 0.5;
        uvs.push([u, vv])
    }
    sphereGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs.flat()), 2));
}
function showWireFrame(scene, geometry) {
    const wireframe = new THREE.WireframeGeometry(geometry);

    const line = new THREE.LineSegments(wireframe);
    line.material.depthTest = false;
    line.material.opacity = 0.25;
    line.material.transparent = true;
    scene.add(line);
}
onMounted(async () => {
    const { scene, camera, controls, renderer } = initThree("cesium-map")
    scene.add(new THREE.AxesHelper(100))
    scene.add(new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry())))
    let voxel2mesh = new Voxel2Mesh()
    const gui = new GUI()
    const volumes = {
        Fuel: "/volumeModels/fuel_64x64x64_uint8.raw",
        Neghip: "/volumeModels/neghip_64x64x64_uint8.raw",
        "Hydrogen Atom": "/volumeModels/hydrogen_atom_128x128x128_uint8.raw",
        "Boston Teapot": "/volumeModels/boston_teapot_256x256x178_uint8.raw",
        Engine: "/volumeModels/engine_256x256x128_uint8.raw",
        Bonsai: "/volumeModels/bonsai_256x256x256_uint8.raw",
        Foot: "/volumeModels/foot_256x256x256_uint8.raw",
        Skull: "/volumeModels/skull_256x256x256_uint8.raw",
        Aneurysm: "/volumeModels/aneurism_256x256x256_uint8.raw",
        Geological: "/volumeModels/geological_1030x1213x22_uint8.raw",
        Volumed1: "/gltfVolumeEx/volumed1_454x408x42_uint8.raw",
        Sphere100: "/volumeModels/sphere100_100x100x100_uint8.raw",
        Sphere50: "/volumeModels/sphere50_50x50x50_uint8.raw",
    };

    const params = {
        模型: "Sphere100",
        转为Mesh() {
            onModelChange(params.模型)
        },
        测试相交: async () => {
            console.time("sphere100_100x100x100_uint8")
            const sphere100 = await read_to_mesh(voxel2mesh, "/volumeModels/sphere100_100x100x100_uint8.raw")
            console.timeEnd("sphere100_100x100x100_uint8")
            console.log(sphere100)
            const sphere100_geometry = sphere100.children[0].geometry;
            fillUVAttribute(sphere100_geometry, 100)
            const sphere100Brush = new Brush(sphere100_geometry);
            sphere100Brush.updateMatrixWorld();

            console.time("sphere50_50x50x50_uint8")
            const sphere50 = await read_to_mesh(voxel2mesh, "/volumeModels/sphere50_50x50x50_uint8.raw")
            console.timeEnd("sphere50_50x50x50_uint8")
            console.log(sphere50)
            const sphere50_geometry = sphere50.children[0].geometry;
            fillUVAttribute(sphere50_geometry, 50)
            const sphere50Brush = new Brush(sphere50_geometry);
            sphere50Brush.updateMatrixWorld();

            const evaluator = new Evaluator();
            const result_mesh = evaluator.evaluate(sphere100Brush, sphere50Brush, INTERSECTION);

            console.log(result_mesh)
            // scene.add(result_mesh)
            showWireFrame(scene, result_mesh.geometry)

            console.time("INTERSECTION")
            let options = {
                fill: false,
                color: true
            };
            const sampler = new Sampler('raycast', options);
            let volume = sampler.sample(result_mesh, 100);
            console.timeEnd("INTERSECTION")
        }
    }
    let outputName = ""
    let inputName = ""
    gui.add(params, "模型", Object.keys(volumes))
    gui.add(params, "转为Mesh")
    gui.add(params, "测试相交")
    async function onModelChange(model) {
        let filePath = volumes[model];
        const fileRegex = /.*\/(\w+)_(\d+)x(\d+)x(\d+)_(\w+)\.*/;
        const m = filePath.match(fileRegex);
        const fileList = filePath.split("/")
        const fileName = filePath.match(/^\/volumeModels\/(.*).raw$/)[1]
        inputName = fileName + ".raw"
        outputName = fileName + ".obj"
        console.time(`voxel2mesh:${inputName}`)
        const volDims = [parseInt(m[2]), parseInt(m[3]), parseInt(m[4])];
        const res = await axios.get(filePath, { responseType: "blob" })
        const file = new File([res.data], inputName)
        const { url } = await voxel2mesh.convert(
            {
                "blob": file,
                width: volDims[0],
                height: volDims[1],
                depth: volDims[2],
                "percentage": 0.01,
                "quality": 1,
                "isolevel": 1 * 255,
                "fillBubbles": true,
                preSmooth: true,
                onlyLargest: false,
                postSmooth: 0,
                simplify_name: outputName,
                verbose: false,
            }
        );
        const objLoader = new OBJLoader()
        objLoader.load(url, (root) => {
            scene.add(root)
            showWireFrame(scene, root.children[0].geometry)
            console.timeEnd(`voxel2mesh:${file.name}`)
        })
    }
})
</script>

<template>
    <div id="cesium-map" style="position: relative">
    </div>
</template>

<style lang="scss">
#test-canvas {
    z-index: 1;
    border: 1px solid black;
    position: absolute;
    top: 0px;
    overflow: auto;
    background: white;
}

.cesium-performanceDisplay-defaultContainer {
    top: 500px;
}

.cesium-viewer-cesium3DTilesInspectorContainer {
    right: 18vw;
    top: 1vh;
}
</style>
