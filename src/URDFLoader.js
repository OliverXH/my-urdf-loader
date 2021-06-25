
import {
    FILE_STL,
    FILE_COLLADA,
    FILE_OBJ,
    FILE_CDF,
    FILE_VTK,
    URDF_GEOM_SPHERE,
    URDF_GEOM_BOX,
    URDF_GEOM_CYLINDER,
    URDF_GEOM_CAPSULE,
    URDF_GEOM_PLANE
} from './constants.js';

import { URDFParser } from './URDFParser.js';

import { FileLoader, Loader, Object3D, Group, Mesh, MeshPhongMaterial } from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

class URDFLoader extends Loader {

    constructor(manager) {

        super(manager);

        this.urdfParser = new URDFParser();

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
                    let result = scope.ConvertURDF2THREE(scope.urdfParser.m_urdf2Model);
                    console.log(scope.urdfParser.m_urdf2Model);
                    onLoad(result);
                } else {
                    console.error('file to load urdf file');
                }

            } catch (e) {

                if (onError) {

                    onError(e);

                } else {

                    console.error(e);

                }

                scope.manager.itemError(url);

            }

            // if (onLoad) onLoad(font);

        }, onProgress, onError);

    }

    ConvertURDF2THREE(urdf) {

        const scope = this;

        let model = new Group();

        let links = urdf.m_links;

        links.forEach(link => {
            let visuals = link.m_visualArray;

            visuals.forEach(visual => {

                let pos = visual.m_linkLocalFrame.getOrigin();
                let rot = visual.m_linkLocalFrame.getRotation();

                scope.generateMesh(visual, (mesh) => {

                    mesh.position.set(pos.x(), pos.y(), pos.z());
                    mesh.quaternion.set(rot.x(), rot.y(), rot.z(), rot.w());

                    model.add(mesh);
                    console.log('a');

                });
            });

        });

        return model;

    }

    generateMesh(visual, onload) {

        if (visual.m_sourceFileLocation) {

            switch (visual.m_geometry.m_meshFileType) {
                case FILE_COLLADA:  // dae

                    break;

                case FILE_STL:  // stl

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

                    break;
                case URDF_GEOM_BOX:

                    break;
                case URDF_GEOM_CYLINDER:

                    break;
                case URDF_GEOM_CAPSULE:

                    break;
                case URDF_GEOM_PLANE:

                    break;

                default:
                    break;
            }

            onload(mesh);

        }

    }

}

export { URDFLoader };