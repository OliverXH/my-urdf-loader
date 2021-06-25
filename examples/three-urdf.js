
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { URDFLoader } from '../src/URDFLoader.js';

// - Global variables -
let camera, scene, renderer, controls;
const clock = new THREE.Clock();
let world;

// console.log();

// - Main code -
init();

// - Functions -
function init() {

    initGraphics();

    initPhysics();

    createObjects();

    animate();

}

function initGraphics() {

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbfd1e5);
    scene.add(new THREE.AxesHelper(10));

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(14, 10, 16);
    camera.lookAt(scene.position);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 2, 0);
    controls.update();

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(- 10, 10, 5);
    light.castShadow = true;
    const d = 10;
    light.shadow.camera.left = - d;
    light.shadow.camera.right = d;
    light.shadow.camera.top = d;
    light.shadow.camera.bottom = - d;

    light.shadow.camera.near = 2;
    light.shadow.camera.far = 50;

    light.shadow.mapSize.x = 1024;
    light.shadow.mapSize.y = 1024;

    scene.add(light);

}

function initPhysics() {

    // Create a physics world
    // world = new Bullet.World();

}

function createObjects() {
    // Create a rigidbody with shape
    const ground = new THREE.Mesh(
        new THREE.BoxGeometry(40, 1, 40),
        new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
    );
    // scene.add(ground);

    const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 30, 30),
        new THREE.MeshPhongMaterial({ color: 0x007ACC })
    );
    // scene.add(sphere);

    const cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 3, 32),
        new THREE.MeshPhongMaterial({ color: 0xE5A102 })
    );
    // scene.add(cylinder);

    // - Load URDF file -

    // let url = 'data/lego/lego.urdf';

    let urdfL = new URDFLoader();

    urdfL.load(
        'data/lego/lego.urdf',
        (result) => {
            console.log(result);
            scene.add(result);
        }
    );
    urdfL.load(
        'data/jenga/jenga.urdf',
        (result) => {
            console.log(result);
            scene.add(result);
        }
    );

}

function animate() {

    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Step the world simulation
    // world.step(deltaTime, 10);

    renderer.render(scene, camera);


}