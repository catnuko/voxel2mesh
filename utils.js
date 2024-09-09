import * as Cesium from "cesium";
window.CESIUM_BASE_URL = "./CesiumUnminified";
// import 'cesium/Build/Cesium/Widgets/widgets.css';
// window.CESIUM_BASE_URL = 'node_modules/cesium/Build/Cesium';
Cesium.Ion.defaultAccessToken =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4ODZmNWFmYi03MDZhLTRhNDMtOTg2Ny01N2YwNjE2NjMxNTEiLCJpZCI6Mjk5MjQsImlhdCI6MTY5ODgzMTY3NH0.EFStVMUXMy-HTbhQ87mgMyXt-5eYFWiVnq9xmZLmUOY";
export function initViewer(id, options) {
	const viewer = new Cesium.Viewer(id, {
		animation: false,
		baseLayerPicker: false,
		fullscreenButton: false,
		geocoder: false,
		homeButton: false,
		sceneModePicker: false,
		selectionIndicator: false,
		shadows: false,
		timeline: false,
		navigationHelpButton: false,
		infoBox: false,
		navigationInstructionsInitiallyVisible: false,
		shouldAnimate: false,
		contextOptions: {
			webgl: {
				alpha: true,
				depth: true,
				stencil: true,
				antialias: true,
				premultipliedAlpha: true,
				//通过canvas.toDataURL()实现截图需要将该项设置为true
				preserveDrawingBuffer: true,
				failIfMajorPerformanceCaveat: true,
			},
		},
		...options,
	});
	if (Cesium.FeatureDetection.supportsImageRenderingPixelated()) {
		//判断是否支持图像渲染像素化处理
		viewer.resolutionScale = window.devicePixelRatio;
	}
	//是否开启抗锯齿
	// viewer.scene.fxaa = true;
	// viewer.scene.postProcessStages.fxaa.enabled = true;
	// viewer.scene.debugShowFramesPerSecond = true;
	debugViewer(viewer);
	return viewer;
}

// import { pickPositionWorldCoordinates } from './geo/projection/my_geo_util'
export function debugViewer(viewer) {
	const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
	handler.setInputAction((movement) => {
		let cartesian3 = viewer.scene.camera.pickEllipsoid(movement.position);
		if (!cartesian3) return;
		let lonlat = cartesian3ToLonLatHeight(cartesian3);
		console.log(`cartesian3: ${cartesian3.x},${cartesian3.y},${cartesian3.z}`);
		console.log(`lonlat: ${lonlat.longitude},${lonlat.latitude},${lonlat.height}`);
		cartesian3 = viewer.camera.position;
		lonlat = cartesian3ToLonLatHeight(cartesian3);
		console.log(`camera cartesian3: ${cartesian3.x},${cartesian3.y},${cartesian3.z}`);
		console.log(`camera lonlat: ${lonlat.longitude},${lonlat.latitude},${lonlat.height}`);
		console.log(`camera hpr: ${viewer.camera.heading},${viewer.camera.pitch},${viewer.camera.roll}`);

		// {
		//   let t1 = viewer.scene.pickPositionWorldCoordinates(movement.position);
		//   t1 = cartesian3ToLonLatHeight(t1)
		//   console.log(t1)
		//   let t2 = pickPositionWorldCoordinates(viewer.scene, movement.position)
		//   t2 = cartesian3ToLonLatHeight(t2)
		//   console.log(t2)
		//   let t3 = viewer.scene.clampToHeight(cartesian3)
		//   t3 = cartesian3ToLonLatHeight(t3)
		//   console.log(t3)
		// }
	}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

export function cartesian3ToLonLatHeight(cartesian3) {
	let position = Cesium.Cartographic.fromCartesian(cartesian3);
	position = {
		longitude: Cesium.Math.toDegrees(position.longitude),
		latitude: Cesium.Math.toDegrees(position.latitude),
		height: position.height,
	};
	return position;
}

export const old = "http://intenal.geoway-atlas.com:31280/ime-cloud/rest/huashanPoisson/3dtiles/tileset.json";
export const news = "http://intenal.geoway-atlas.com:31280/ime-cloud/rest/qx_huashan_20240109/3dtiles/tileset.json";

export function beijingTimeline(viewer) {
	viewer.animation.viewModel.dateFormatter = DateTimeFormatter;
	viewer.animation.viewModel.timeFormatter = TimeFormatter;
	viewer.timeline.makeLabel = DateTimeFormatter;
	function TimeFormatter(time, viewModel) {
		return DateTimeFormatter(time, viewModel, true);
	}
	function DateTimeFormatter(datetime, viewModel, ignoredate) {
		var julianDT = new Cesium.JulianDate();
		Cesium.JulianDate.addHours(datetime, 8, julianDT);
		var gregorianDT = Cesium.JulianDate.toGregorianDate(julianDT);
		var objDT;
		if (ignoredate) {
			objDT = "";
		} else {
			objDT = new Date(gregorianDT.year, gregorianDT.month - 1, gregorianDT.day);
			objDT = gregorianDT.year + "年" + objDT.toLocaleString("zh-cn", { month: "short" }) + gregorianDT.day + "日";
			if (viewModel || gregorianDT.hour + gregorianDT.minute === 0) {
				return objDT;
				objDT += "";
			}
		}
		return objDT + Cesium.sprintf("%02d:%02d:%02d", gregorianDT.hour, gregorianDT.minute, gregorianDT.second);
	}
}

const rampColors = {
	colors: ["#FF0000", "#FFFF00", "#0000FF"].reverse(),
	positions: [0, 0.5, 1.0],
};
function generateColorRamp(colorRamp = rampColors) {
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	const width = (canvas.width = 256);
	const height = (canvas.height = 1);
	const gradient = ctx.createLinearGradient(0, 0, 256, 1);
	let data = null;
	const min = colorRamp.positions[0];
	const max = colorRamp.positions[colorRamp.positions.length - 1];
	for (let i = 0; i < colorRamp.colors.length; ++i) {
		const value = (colorRamp.positions[i] - min) / (max - min);
		gradient.addColorStop(value, colorRamp.colors[i]);
	}
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 256, 1);
	data = new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);

	return {
		data,
		width,
		height,
	};
}
function fract(cartesian4, result) {
	let x = cartesian4.x;
	let y = cartesian4.y;
	let z = cartesian4.z;
	let w = cartesian4.w;
	x = x - Math.floor(x);
	y = y - Math.floor(y);
	z = z - Math.floor(z);
	w = w - Math.floor(w);
	if (!result) {
		result = new Cesium.Cartesian4();
	}
	result.x = x;
	result.y = y;
	result.z = z;
	result.w = w;
	return result;
}
/**
 * float->rgba,取值范围都是0-1
 */
function czm_packDepth(depth) {
	const enc = new Cesium.Cartesian4(1.0, 255.0, 65025.0, 16581375.0);
	Cesium.Cartesian4.multiplyByScalar(enc, depth - 1e-6, enc);
	fract(enc, enc);
	const newEnc = new Cesium.Cartesian4(enc.y, enc.z, enc.w, enc.w);
	Cesium.Cartesian4.multiplyComponents(newEnc, new Cesium.Cartesian4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0), newEnc);
	Cesium.Cartesian4.subtract(enc, newEnc, enc);
	return enc;
}
const packedDepthScale = new Cesium.Cartesian4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0);
/**
 * rgba->float,取值范围都是0-1
 */
function czm_unpackDepth(packedDepth) {
	return Cesium.Cartesian4.dot(packedDepth, packedDepthScale);
}
// const v = czm_packDepth(1);
// console.log(v, czm_unpackDepth(v));
export function createPrimitive(viewer, position, geometry, color) {
	const p = viewer.scene.primitives.add(
		new Cesium.Primitive({
			asynchronous: false,
			modelMatrix: position instanceof Cesium.Cartesian3 ? Cesium.Transforms.eastNorthUpToFixedFrame(position) : position,
			geometryInstances: new Cesium.GeometryInstance({
				geometry: geometry,
				attributes: {
					color: Cesium.ColorGeometryInstanceAttribute.fromColor(color),
				},
			}),
			releaseGeometryInstances: false,
			appearance: new Cesium.PerInstanceColorAppearance({ translucent: true }),
		})
	);
	return p;
}
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module";
import CameraControls from "camera-controls";
CameraControls.install({ THREE: THREE });
export function initThree(id, isOrith) {
	var camera, scene, renderer, model, loader, stats, controls, clock, polygon, planes, planeHelpers, tempMesh, gltfloader;
	let container = document.getElementById(id);
	const width = container.clientWidth;
	const height = container.clientHeight;

	scene = new THREE.Scene();
	scene.background = new THREE.Color("black");

	renderer = new THREE.WebGLRenderer({ antialias: true });
	// renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height, false);
	renderer.localClippingEnabled = false;

	container.appendChild(renderer.domElement);
	if (isOrith) {
		camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 0.1, 10000);
	} else {
		camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 10000);
	}
	camera.position.set(10, 10, -10);

	// Camera Controls
	// controls = new OrbitControls(camera, renderer.domElement);
	// controls.enableDamping = true;
	// controls.update();

	clock = new THREE.Clock();
	controls = new CameraControls(camera, renderer.domElement);

	{
		// 半球光
		// const skyColor = 0xb1e1ff; // 蓝色
		// const groundColor = 0xffffff; // 白色
		// const intensity = 1;
		// const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
		// scene.add(light);
	}

	{
		// 方向光
		// const color = 0xffffff;
		// const intensity = 10;
		// const light = new THREE.DirectionalLight(color, intensity);
		// light.position.set(0, 150, 0);
		// light.target.position.set(0, 0, 0);
		// scene.add(light);
		// scene.add(light.target);
	}

	window.addEventListener(
		"resize",
		function () {
			const width = container.clientWidth;
			const height = container.clientHeight;
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.setSize(width, height);
		},
		false
	);
	stats = new Stats();
	container.appendChild(stats.dom);
	function render() {
		stats.update();
		const delta = clock.getDelta();
		const hasControlsUpdated = controls.update(delta);

		requestAnimationFrame(render);

		renderer.render(scene, camera);
		// if (hasControlsUpdated) {
		// 	renderer.render(scene, camera);
		// }
	}
	render();
	return { scene, camera, controls, renderer };
}
import axios from "axios";
const TypeConstructor = {
	f32: Float32Array,
	uint8: Uint8Array,
};
export function parseRawFileName(filePath) {
	const t = filePath.split("/");
	const fileName = t[t.length - 1];
	const m = fileName.match(/(.*)_(\d+)x(\d+)x(\d+)_(-?\d+)x(-?\d+)x(-?\d+)_(.*).raw/);
	if (m) {
		return {
			fileName: fileName,
			name: m[1],
			width: parseInt(m[2]),
			height: parseInt(m[3]),
			depth: parseInt(m[4]),
			x: parseInt(m[5]),
			y: parseInt(m[6]),
			z: parseInt(m[7]),
			type: m[8],
			typeConstructor: TypeConstructor[m[8]],
		};
	} else {
		const mm = fileName.match(/(.*)_(\d+)x(\d+)x(\d+)_(.*).raw/);
		if (mm) {
			return {
				fileName: fileName,
				name: mm[1],
				width: parseInt(mm[2]),
				height: parseInt(mm[3]),
				depth: parseInt(mm[4]),
				x: 0,
				y: 0,
				z: 0,
				type: m[8],
				typeConstructor: TypeConstructor[m[8]],
			};
		}
	}
}
/**
 *
 * @param {string} filePath
 * @param {"blob"|"arraybuffer"} responseType
 * @returns {{fileName:string,name:string,width:number,height:number,depth:number,x:number,y:number,z:number,blob?:Blob,typedArray:Uint8Array}}
 */
export function read_raw(filePath, responseType = "blob") {
	const info = parseRawFileName(filePath);
	return axios.get(filePath, { responseType: responseType }).then((res) => {
		let result = {
			...info,
		};
		if (responseType == "blob") {
			result.blob = res.data;
		} else if (responseType == "arraybuffer") {
			result.typedArray = new info.typeConstructor(res.data);
		}
		return result;
	});
}
export function showWireFrame(scene, geometry) {
	const wireframe = new THREE.WireframeGeometry(geometry);

	const line = new THREE.LineSegments(wireframe);
	line.material.depthTest = false;
	line.material.opacity = 0.25;
	line.material.transparent = true;
	scene.add(line);
}
