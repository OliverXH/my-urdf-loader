
import {
    FILE_STL,
    FILE_COLLADA,
    FILE_OBJ,
    FILE_CDF,
    FILE_VTK,
    URDF_GEOM_SPHERE,
    URDF_GEOM_BOX,
    URDF_GEOM_CYLINDER,
    URDF_GEOM_MESH,
    URDF_GEOM_CAPSULE,
    URDF_GEOM_PLANE
} from './constants.js';

import { URDFParser } from './URDFParser.js';

import { FileLoader, Loader, Object3D, Group, Mesh, MeshPhongMaterial, MeshStandardMaterial } from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Ammo } from './ammo.js';

const gUrdfDefaultCollisionMargin = 0.001;

class URDFLoader extends Loader {

    constructor(manager) {

        super(manager);

        this.urdfParser = new URDFParser();

        this.enableAmmo = false;

        this.onLoad = null;
        this.onProgress = null;
        this.onError = null;

    }

    load(url, onLoad, onProgress, onError) {

        const scope = this;

        scope.onLoad = onLoad;
        scope.onProgress = onProgress;
        scope.onError = onError;

        const loader = new FileLoader(this.manager);
        loader.setPath(this.path);
        loader.setResponseType('document');
        loader.setMimeType('text/xml');
        loader.setRequestHeader(scope.requestHeader);
        loader.setWithCredentials(scope.withCredentials);
        loader.load(url, function (text) {

            try {

                scope.urdfParser.url = url;

                let ok = scope.urdfParser.loadUrdf(text);
                if (ok) {
                    // let result = scope.ConvertURDF2THREE(scope.urdfParser.model);
                    let result = scope.convertLinkVisualShapes();
                    console.log(scope.urdfParser.model);

                    onLoad(result);

                    delete scope.urdfParser.model;

                } else {
                    console.error('fail to load urdf file');
                }

            } catch (e) {

                if (onError) {

                    onError(e);

                } else {

                    console.error(e);

                }

                scope.manager.itemError(url);

            }

        }, onProgress, onError);

    }

    ConvertURDF2THREE(urdf) {

        const scope = this;

        let model = new Group();

        let links = urdf.m_links;

        links.forEach(link => {
            let visuals = link.m_visualArray;
            let collisions = link.m_collisionArray;

            visuals.forEach(visual => {

                let pos = visual.m_linkLocalFrame.getOrigin();
                let rot = visual.m_linkLocalFrame.getRotation();

                scope.generateMesh(visual, (mesh) => {

                    mesh.position.set(pos.x(), pos.y(), pos.z());
                    mesh.quaternion.set(rot.x(), rot.y(), rot.z(), rot.w());

                    model.add(mesh);

                });
            });

            if (scope.enableAmmo) {

                let collisionShape;

                if (collisions.length > 1) {
                    collisionShape = new Ammo.btCompoundShape();

                    collisions.forEach(collision => {

                        let shape = scope.generatePhysics(collision);

                        let transform = collision.m_linkLocalFrame;
                        let mass = link.m_inertia.m_mass;

                        const localInertia = new Ammo.btVector3(0, 0, 0);
                        if (mass !== 0) {
                            shape.calculateLocalInertia(mass, localInertia);
                        }

                        const motionState = new Ammo.btDefaultMotionState(transform);
                        const bodyInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, shape, localInertia);
                        const body = new Ammo.btRigidBody(bodyInfo);

                    });
                }



            }

        });

        return model;

    }

    convertURDFToCollisionShape(collision) {

        let shape;

        switch (collision.m_geometry.m_type) {
            case URDF_GEOM_SPHERE:
                {
                    let radius = collision.m_geometry.m_sphereRadius;
                    let sphereShape = new btSphereShape(radius);
                    shape = sphereShape;
                    shape.setMargin(gUrdfDefaultCollisionMargin);
                    break;
                }
            case URDF_GEOM_BOX:
                {
                    let extents = collision.m_geometry.m_boxSize;
                    let boxShape = new Ammo.btBoxShape(new Ammo.btVector3(extents.x / 2, extents.y / 2, extents.z / 2));
                    shape = boxShape;
                    shape.setMargin(gUrdfDefaultCollisionMargin);
                    break;
                }
            case URDF_GEOM_CYLINDER:
                {
                    let cylRadius = collision.m_geometry.m_capsuleRadius;
                    let cylHalfLength = 0.5 * collision.m_geometry.m_capsuleHeight;
                    let halfExtents = new Ammo.btVector3(cylRadius, cylRadius, cylHalfLength);
                    let cylZShape = new Ammo.btCylinderShapeZ(halfExtents);
                    shape = cylZShape;
                    shape.setMargin(gUrdfDefaultCollisionMargin);
                    break;
                }
            case URDF_GEOM_CAPSULE:
                {
                    let radius = collision.m_geometry.m_capsuleRadius;
                    let height = collision.m_geometry.m_capsuleHeight;
                    let capsuleShape = new Ammo.btCapsuleShapeZ(radius, height);    // Z up
                    shape = capsuleShape;
                    shape.setMargin(gUrdfDefaultCollisionMargin);
                    break;
                }
            case URDF_GEOM_PLANE:
                {
                    let planeNormal = collision.m_geometry.m_planeNormal;
                    let planeConstant = 0;  //not available?
                    let plane = new Ammo.btStaticPlaneShape(planeNormal, planeConstant);
                    shape = plane;
                    shape.setMargin(gUrdfDefaultCollisionMargin);
                    break;
                }
            case URDF_GEOM_CDF:
                {
                    break;
                }
            case URDF_GEOM_MESH:
                {
                    break;
                }

            default:
                console.warn('Error: unknown collision geometry type');
                break;
        }

        if (shape && collision.m_geometry.m_type == URDF_GEOM_MESH) {
            // m_data.m_bulletCollisionShape2UrdfCollision.insert(shape, collision);
        }

        return shape;

    }

    convertURDFToVisualShapeInternal(visual, onload) {

        if (visual.m_geometry.m_type == URDF_GEOM_MESH) {

            switch (visual.m_geometry.m_meshFileType) {
                case FILE_COLLADA:  // dae

                    break;

                case FILE_STL:  // stl

                    console.log('loading...');
                    new STLLoader().load(visual.m_sourceFileLocation, (geometry) => {

                        geometry.rotateX(-Math.PI / 2);

                        const material = new MeshStandardMaterial({ color: 0xffffff });
                        const mesh = new Mesh(geometry, material);

                        onload(mesh);

                    });
                    break;

                case FILE_OBJ:  // obj
                    // let { OBJLoader } = await import('https://threejs.org/examples/jsm/loaders/OBJLoader.js');

                    console.log('loading...');
                    new OBJLoader().load(visual.m_sourceFileLocation, (obj) => {
                        onload(obj);
                    });

                    break;

                case FILE_CDF:  // cdf

                    break;

                case FILE_VTK:  // vtk

                    break;

                default:
                    console.warn(`invalid mesh filename extension`);
                    break;
            }

        } else {

            let mesh;

            switch (visual.m_geometry.m_type) {
                case URDF_GEOM_SPHERE:
                    {
                        break;
                    }
                case URDF_GEOM_BOX:
                    {
                        let size = visual.m_geometry.m_boxSize;
                        mesh = new Mesh(
                            new BoxGeometry(size.x, size.y, size.z),
                        );
                        break;
                    }
                case URDF_GEOM_CYLINDER:
                    {
                        break;
                    }
                case URDF_GEOM_CAPSULE:
                    {
                        break;
                    }
                case URDF_GEOM_PLANE:
                    {
                        break;
                    }

                default:
                    break;
            }

            onload(mesh);

        }

    }


    convertLinkVisualShapes() {

        let scope = this;

        let robot = new Group();

        let model = scope.urdfParser.model;
        let links = model.m_links;
        links.forEach(linkPtr => {

            let link = new Group();

            linkPtr.m_visualArray.forEach(vis => {

                let childTrans = vis.m_linkLocalFrame;
                let matName = vis.m_materialName;
                /* UrdfMaterial */ const mat = model.m_materials.find(m => m.m_name == matName);
                let material;

                if (mat) {
                    material = new MeshPhongMaterial({
                        color: mat.m_matColor.m_rgbColor,
                        specular: mat.m_matColor.m_specularColor,
                        opacity: mat.m_matColor.m_alpha,
                        transparent: mat.m_matColor.m_alpha < 1
                    });

                    if (mat.m_textureFilename.length > 4) {
                        const loader = new TextureLoader();
                        const filePath = scope.m_sourceFile + mat.m_textureFilename;
                        material.map = loader.load(filePath);
                    }
                }

                scope.convertURDFToVisualShapeInternal(vis, (mesh) => {

                    let pos = childTrans.getOrigin();
                    let rot = childTrans.getRotation();

                    mesh.position.set(pos.x(), pos.y(), pos.z());
                    mesh.quaternion.set(rot.x(), rot.y(), rot.z(), rot.w());

                    link.add(mesh);

                    link.traverse(child => {
                        if (child.isMesh) {
                            child.material = material;
                        }
                    })

                });

            });

            robot.add(link);

        });

        return robot;

    }

}

export { URDFLoader };