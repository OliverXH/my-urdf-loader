
import { Ammo } from './ammo.js';

import {
    URDF_GEOM_SPHERE,
    URDF_GEOM_BOX,
    URDF_GEOM_CYLINDER,
    URDF_GEOM_MESH,
    URDF_GEOM_PLANE,
    URDF_GEOM_CAPSULE,
    URDF_GEOM_CDF,
    URDF_GEOM_HEIGHTFIELD,
    URDF_GEOM_UNKNOWN
} from './constants.js';

import { UrdfModel, UrdfGeometry, UrdfMaterial, UrdfJoint, UrdfLink, UrdfShape, UrdfVisual, UrdfCollision, UrdfInertia } from './intern.js';


import { Utils } from './utils.js';


class URDFParser {

    constructor(baseURL) {

        // this.material = THREE.MeshPhongMaterial;
        this.m_urdf2Model = null;

        this.m_urdfScaling = 1;
        this.url = baseURL || '';

    }

    parseMaterial(material, config) {

        if (!config.getAttribute("name")) {
            console.error("Material must contain a name attribute");
            return false;
        }

        material.name = config.getAttribute('name');

        // texture
        let t = firstChildElement(config, 'texture');
        if (t) {
            if (t.getAttribute('filename')) {
                material.m_textureFilename = t.getAttribute("filename");
            }
        }

        // color
        let c = firstChildElement(config, 'color');
        if (c) {
            if (c.getAttribute('rgba')) {
                let rgba = c.getAttribute("rgba").split(/\s/g);
                rgba.map(v => parseFloat(v));

                if (rgba.length !== 4) {
                    console.warn(material.m_name + " has no rgba");
                    rgba = [0.8, 0.8, 0.8, 1];
                }

                material.m_matColor.m_alpha = rgba[3];
                material.m_matColor.m_rgbColor.setRGB(rgba[0], rgba[1], rgba[3]);

            }
        }

        {
            // specular (non-standard)
            let s = firstChildElement(config, 'specular');
            if (s) {
                if (s.getAttribute('rgb')) {

                    let rgb = s.getAttribute("rgb").split(/\s/g);
                    rgb.map(v => parseFloat(v));

                    if (rgba.length !== 3) {
                        console.warn(material.m_name + " has no rgba");
                        rgba = [0.5, 0.5, 0.5];
                    }

                    material.m_matColor.m_specularColor.setRGB(rgba[0], rgba[1], rgba[3]);

                }
            }
        }

        return true;

    }

    parseTransform(tr, xml) {

        if (typeof Ammo == 'undefined') {

            console.error('Ammo seems does not support');

        }

        tr.setIdentity();
        let vec = new Ammo.btVector3(0, 0, 0);

        const xyz_str = xml.getAttribute("xyz");
        if (xyz_str) {
            parsebtVector3(vec, xyz_str);
        }

        // tr.setOrigin(vec * this.m_urdfScaling);
        tr.setOrigin(vec);

        let rpy_str = xml.getAttribute('rpy');
        if (rpy_str) {
            let rpy = new Ammo.btVector3();

            parsebtVector3(rpy, rpy_str);

            let phi, the, psi;
            let roll = rpy.x();
            let pitch = rpy.y();
            let yaw = rpy.z();

            phi = roll / 2.0;
            the = pitch / 2.0;
            psi = yaw / 2.0;

            let orn = new Ammo.btQuaternion(
                Math.sin(phi) * Math.cos(the) * Math.cos(psi) - Math.cos(phi) * Math.sin(the) * Math.sin(psi),
                Math.cos(phi) * Math.sin(the) * Math.cos(psi) + Math.sin(phi) * Math.cos(the) * Math.sin(psi),
                Math.cos(phi) * Math.cos(the) * Math.sin(psi) - Math.sin(phi) * Math.sin(the) * Math.cos(psi),
                Math.cos(phi) * Math.cos(the) * Math.cos(psi) + Math.sin(phi) * Math.sin(the) * Math.sin(psi)
            );

            orn.normalize();
            tr.setRotation(orn);

        }

        return true;

    }

    parseInertia(inertia, config) {

        inertia.m_linkLocalFrame.setIdentity();
        inertia.m_mass = 0;

        // Origin
        let o = firstChildElement(config, 'origin');
        if (o) {
            if (!this.parseTransform(inertia.m_linkLocalFrame, o)) {
                return false;
            }
        }

        let mass_xml = firstChildElement(config, 'mass');
        if (!mass_xml) {
            return false;
        }
        if (!mass_xml.getAttribute('value')) {
            return false;
        }

        inertia.m_mass = mass_xml.getAttribute('value');

        let inertia_xml = firstChildElement(config, 'inertia');
        if (!inertia_xml) {
            return false;
        }
        if (!(inertia_xml.getAttribute('ixx') && inertia_xml.getAttribute('ixy') && inertia_xml.getAttribute('ixz') &&
            inertia_xml.getAttribute('iyy') && inertia_xml.getAttribute('iyz') &&
            inertia_xml.getAttribute('izz'))) {

            if ((inertia_xml.getAttribute('ixx') && inertia_xml.getAttribute('iyy') &&
                inertia_xml.getAttribute('izz'))) {

                inertia.m_ixx = inertia_xml.getAttribute('ixx');
                inertia.m_ixy = 0;
                inertia.m_ixz = 0;
                inertia.m_iyy = inertia_xml.getAttribute('iyy');
                inertia.m_iyz = 0;
                inertia.m_izz = inertia_xml.getAttribute('izz');

            } else {
                console.error('Inertial: inertia element must have ixx,ixy,ixz,iyy,iyz,izz attributes');
                return false;
            }
        } else {
            inertia.m_ixx = inertia_xml.getAttribute('ixx');
            inertia.m_ixy = inertia_xml.getAttribute('ixy');
            inertia.m_ixz = inertia_xml.getAttribute('ixz');
            inertia.m_iyy = inertia_xml.getAttribute('iyy');
            inertia.m_iyz = inertia_xml.getAttribute('iyz');
            inertia.m_izz = inertia_xml.getAttribute('izz');
        }

        return true;

    }

    /**
     * 
     * @param {UrdfGeometry} geom 
     * @param {Element} config 
     */
    parseGeometry(geom, config) {

        if (config == undefined) {
            console.error('geometry tag must be included.');
            return false;
        }

        let shape = firstChildElement(config);
        if (!shape) {
            console.error('Geometry tag contains no child element.');
            return false;
        }

        const type_name = shape.nodeName;
        if (type_name == 'sphere') {

            geom.m_type = URDF_GEOM_SPHERE;

            if (!shape.getAttribute('radius')) {
                console.error('Sphere shape must have a radius attribute');
                return false;
            } else {
                let r = parseFloat(shape.getAttribute('radius'));
                geom.m_sphereRadius = this.m_urdfScaling * r;
            }

        } else if (type_name == 'box') {

            geom.m_type = URDF_GEOM_BOX;

            if (!shape.getAttribute('size')) {
                console.error('box requires a size attribute');
                return false;
            }
            else {
                parseVector3(geom.m_boxSize, shape.getAttribute('size'));
                geom.m_boxSize.multiplyScalar(this.m_urdfScaling);
            }

        } else if (type_name == 'cylinder') {

            geom.m_type = URDF_GEOM_CYLINDER;
            geom.m_hasFromTo = false;
            geom.m_capsuleRadius = 0.1;
            geom.m_capsuleHeight = 0.1;

            if (!shape.getAttribute('length') || !shape.getAttribute('radius')) {
                console.error('Cylinder shape must have both length and radius attributes');
                return false;
            }
            geom.m_capsuleRadius = this.m_urdfScaling * parseFloat(shape.getAttribute('radius'));
            geom.m_capsuleHeight = this.m_urdfScaling * parseFloat(shape.getAttribute('length'));

        } else if (type_name == 'capsule') {

            geom.m_type = URDF_GEOM_CAPSULE;
            geom.m_hasFromTo = false;

            if (!shape.getAttribute('length') || !shape.getAttribute('radius')) {
                console.error('Capsule shape must have both length and radius attributes');
                return false;
            }
            geom.m_capsuleRadius = this.m_urdfScaling * parseFloat(shape.getAttribute('radius'));
            geom.m_capsuleHeight = this.m_urdfScaling * parseFloat(shape.getAttribute('length'));

        } else if ((type_name == 'mesh') || (type_name == 'cdf')) {

            if ((type_name == 'cdf')) {
                geom.m_type = URDF_GEOM_CDF;
            }
            else {
                geom.m_type = URDF_GEOM_MESH;
            }

            geom.m_meshScale.set(1, 1, 1);

            let fn;

            // URDF
            if (shape.getAttribute('filename')) {
                fn = shape.getAttribute('filename');
            }
            if (shape.getAttribute('scale')) {
                if (!parseVector3(geom.m_meshScale, shape.getAttribute('scale'))) {
                    console.warn('Scale should be a vector3, not single scalar. Workaround activated.\n');
                    let scalar_str = shape.getAttribute('scale');
                    let scaleFactor = parseFloat(scalar_str);
                    if (scaleFactor) {
                        geom.m_meshScale.set(scaleFactor, scaleFactor, scaleFactor);
                    }
                }
            }

            geom.m_meshScale.multiplyScalar(this.m_urdfScaling);

            if (fn.length == 0) {
                console.error('Mesh filename is empty');
                return false;
            }

            geom.m_meshFileName = fn;

            geom.m_meshFileName = Utils.getFileName(fn);
            geom.m_meshFileType = Utils.getFileType(fn);

        } else {

            if (type_name == 'plane') {

                geom.m_type = URDF_GEOM_PLANE;

                if (!shape.getAttribute('normal')) {
                    console.error('plane requires a normal attribute');
                    return false;
                }
                else {
                    parseVector3(geom.m_planeNormal, shape.getAttribute('normal'));
                }

            } else {
                console.error(`Unknown geometry type: ${type_name}`);
                return false;
            }

        }

        return true;

    }

    /**
     * 
     * @param {UrdfCollision} collision 
     * @param {Element} config 
     */
    parseCollision(collision, config) {

        collision.m_linkLocalFrame.setIdentity();

        // Origin
        let o = firstChildElement(config, 'origin');
        if (o) {
            if (!this.parseTransform(collision.m_linkLocalFrame, o)) {
                console.error('Cannont parse transform');
                return false;
            }
        }

        // Geometry
        let geom = firstChildElement(config, 'geometry');
        if (!this.parseGeometry(collision.m_geometry, geom)) {
            console.error('Cannont parse geometry');
            return false;
        }

        {
            const group_char = config.getAttribute('group');
            if (group_char) {
                collision.m_flags |= URDF_HAS_COLLISION_GROUP;
                collision.m_collisionGroup = parseInt(group_char);
            }
        }

        {
            const mask_char = config.getAttribute('mask');
            if (mask_char) {
                collision.m_flags |= URDF_HAS_COLLISION_MASK;
                collision.m_collisionMask = parseInt(mask_char);
            }
        }

        const name_char = config.getAttribute('name');
        if (name_char)
            collision.m_name = name_char;

        const concave_char = config.getAttribute('concave');
        if (concave_char)
            collision.m_flags |= URDF_FORCE_CONCAVE_TRIMESH;

        return true;

    }

    /**
     * 
     * @param {UrdfModel} model 
     * @param {UrdfVisual} visual 
     * @param {Element} config 
     */
    parseVisual(model, visual, config) {

        visual.m_linkLocalFrame.setIdentity();

        // Origin
        let o = firstChildElement(config, 'origin');
        if (o) {
            if (!this.parseTransform(visual.m_linkLocalFrame, o)) {
                console.error('Cannont parse transform');
                return false;
            }
        }

        // Geometry
        let geom = firstChildElement(config, 'geometry');
        if (!this.parseGeometry(visual.m_geometry, geom)) {
            console.error('Cannont parse geometry');
            return false;
        }

        const name_char = config.getAttribute('name');
        if (name_char)
            visual.m_name = name_char;

        visual.m_geometry.m_hasLocalMaterial = false;

        // Material
        let mat = firstChildElement(config, 'material');
        if (mat) {

            // get material name
            if (!mat.getAttribute('name')) {
                console.error('Visual material must contain a name attribute');
                return false;
            }
            visual.m_materialName = mat.getAttribute('name');

            // try to parse material element in place

            let t = firstChildElement(mat, 'texture');
            let c = firstChildElement(mat, 'color');
            let s = firstChildElement(mat, 'specular');

            if (t || c || s) {
                if (this.parseMaterial(visual.m_geometry.m_localMaterial, mat)) {

                    let _mat = new UrdfMaterial(visual.m_geometry.m_localMaterial);
                    let preMat = model.m_materials[_mat.m_name];

                    if (preMat) {
                        model.m_materials[_mat.m_name] = null;
                    }

                    model.m_materials[_mat.m_name] = _mat;
                    visual.m_geometry.m_hasLocalMaterial = true;

                }
            }

        }

        // ParseUserData(config, visual.m_userData);

        return true;

    }

    /**
     * 
     * @param {UrdfModel} model 
     * @param {UrdfLink} link 
     * @param {Element} config 
     */
    parseLink(model, link, config) {

        const linkName = config.getAttribute('name');
        if (!linkName) {
            console.error('Link with no name');
            return false;
        }
        link.m_name = linkName;

        // optional 'audio_source' parameters
        // {}

        {
            // optional 'contact' parameters
            let ci = firstChildElement(config, 'contact');
            if (ci) {
                // TODO
                let damping_xml = firstChildElement(ci, 'inertia_scaling');
            }
        }

        if (!link.m_inertia) {
            link.m_parentLink = new UrdfLink();
        }
        // Inertial (optional)
        let i = firstChildElement(config, 'inertial');
        if (i) {
            if (!this.parseInertia(link.m_inertia, i)) {
                console.error(`Could not parse inertial element for Link: ${link.m_name}`);
                return false;
            }
        } else {
            if ((linkName.length == 5) && (linkName.search(/world/g)) == 0) {
                link.m_inertia.m_mass = 0;
                link.m_inertia.m_linkLocalFrame.setIdentity();
                link.m_inertia.m_ixx = 0;
                link.m_inertia.m_iyy = 0;
                link.m_inertia.m_izz = 0;
            }
            else {
                console.warn('No inertial data for link, using mass=1, localinertiadiagonal = 1,1,1, identity local inertial frame');
                link.m_inertia.m_mass = 1;
                link.m_inertia.m_linkLocalFrame.setIdentity();
                link.m_inertia.m_ixx = 1;
                link.m_inertia.m_iyy = 1;
                link.m_inertia.m_izz = 1;
                console.warn(link.m_name);
            }
        }

        // Multiple Visuals (optional)
        let vis_xmls = getChildElement(config, 'visual');
        if (vis_xmls !== undefined) {
            vis_xmls.forEach(vis_xml => {

                let visual = new UrdfVisual();
                visual.m_sourceFileLocation = this.sourceFileLocation(vis_xml);

                if (this.parseVisual(model, visual, vis_xml)) {
                    link.m_visualArray.push(visual);
                }
                else {
                    console.error(`Could not parse visual element for Link: ${link.m_name}`);
                    return false;
                }

            });
        }

        // Multiple Collisions (optional)
        let col_xmls = getChildElement(config, 'collision');
        if (col_xmls !== undefined) {
            col_xmls.forEach(col_xml => {

                let col = new UrdfCollision();
                col.m_sourceFileLocation = this.sourceFileLocation(col_xml);

                if (this.parseCollision(col, col_xml)) {
                    link.m_collisionArray.push(col);
                }
                else {
                    console.error(`Could not parse collision element for Link: ${link.m_name}`);
                    return false;
                }
            });
        }

        // ParseUserData(config, link.m_userData);
        return true;

    }

    parseLameCoefficients() { }
    parseDeformable() { }
    parseJointLimits() { }
    parseJointDynamics() { }

    parseJoint() { }

    parseSensor() { }

    loadUrdf(xml_doc, forceFixedBase, parseSensors) {

        this.m_urdf2Model = new UrdfModel();

        let robot_xml = firstChildElement(xml_doc, 'robot');
        if (!robot_xml) {
            console.error('expected a robot element');
            return false;
        }

        let url = this.url;

        this.m_urdf2Model.m_sourceFile = Utils.getPath(url);

        // Get robot name
        const name = robot_xml.getAttribute('name');
        if (!name) {
            console.error('Expected a name for robot');
            return false;
        }
        this.m_urdf2Model.m_name = name;

        // ParseUserData(robot_xml, this.m_urdf2Model.m_userData);

        // Get all Material elements
        let mat_xmls = getChildElement(robot_xml, 'material');
        if (mat_xmls !== undefined) {
            mat_xmls.forEach(mat_xml => {

                let material = new UrdfMaterial;

                this.parseMaterial(material, mat_xml);

                let mat = this.m_urdf2Model.m_materials.find(mat => mat.m_name == material.m_name);
                if (mat) {
                    // delete material;     //  delete 操作符用于删除对象的某个属性
                    material = undefined;
                    console.warn('Duplicate material');
                }
                else {
                    this.m_urdf2Model.m_materials.push(material);
                }
            });
        }

        // TODO
        let deformable_xml = firstChildElement(robot_xml, 'deformable');
        if (deformable_xml) { }

        // ---
        let link_xmls = getChildElement(robot_xml, "link");
        if (link_xmls !== undefined) {
            link_xmls.forEach(link_xml => {

                let link = new UrdfLink();

                if (this.parseLink(this.m_urdf2Model, link, link_xml)) {

                    if (this.m_urdf2Model.m_links.find(_link => _link.m_name == link.m_name)) {
                        console.error("Link name is not unique, link names in the same model have to be unique");
                        console.error(link.m_name);
                        // delete link;
                        link = undefined;
                        return false;
                    } else {
                        //copy model material into link material, if link has no local material
                        for (let i = 0; i < link.m_visualArray.length; i++) {

                            let vis = link.m_visualArray[i];

                            if (!vis.m_geometry.m_hasLocalMaterial && vis.m_materialName.length) {

                                let mat = this.m_urdf2Model.m_materials.find(mat => mat.m_materialName == vis.m_materialName);

                                if (mat) {
                                    vis.m_geometry.m_localMaterial = mat;
                                }
                                else {
                                    //logger->reportError("Cannot find material with name:");
                                    //logger->reportError(vis.m_materialName.c_str());
                                }

                            }

                        }

                        this.m_urdf2Model.m_links.push(link);
                    }

                } else {
                    console.error("failed to parse link");
                    // delete link;
                    link = undefined;
                    return false;
                }
            });
        }

        if (this.m_urdf2Model.m_links.length == 0) {
            console.warn("No links found in URDF file");
            return false;
        }

        // Get all Joint elements
        // {}

        // Get all Sensor Elements.
        // {}

        /* let ok = initTreeAndRoot(this.m_urdf2Model);
        if (!ok) {
            return false;
        } */

        if (forceFixedBase) {
            for (let i = 0; i < this.m_urdf2Model.m_rootLinks.length; i++) {
                let link = this.m_urdf2Model.m_rootLinks[i];
                link.m_inertia.m_mass = 0.0;
                link.m_inertia.m_ixx = 0.0;
                link.m_inertia.m_ixy = 0.0;
                link.m_inertia.m_ixz = 0.0;
                link.m_inertia.m_iyy = 0.0;
                link.m_inertia.m_iyz = 0.0;
                link.m_inertia.m_izz = 0.0;
            }
        }

        return this.m_urdf2Model;

    }


    sourceFileLocation(elem) {

        let geom = firstChildElement(elem, 'geometry');
        let shape = firstChildElement(geom);

        if (shape.nodeName !== 'mesh') {
            return null;
        }

        let fn = shape.getAttribute('filename');

        // let row = elem.GetLineNum();
        let str = this.m_urdf2Model.m_sourceFile + fn;
        return str;
    }


}

/**
 * @description parse string to Ammo.btVector3
 * @param {Ammo.btVector3} vec3 
 * @param {String} vector_str 
 */
function parsebtVector3(vec3, vector_str) {

    const vec = vector_str.split(/\s/g)
        .map(v => parseFloat(v));

    if (vec.length == 1) {
        return false;
    }

    vec3.setValue(vec[0], vec[1], vec[2]);

    return true;
}

/**
 * @description parse string to THREE.Vector3
 * @param {THREE.Vector3} vec3 
 * @param {String} vector_str 
 */
function parseVector3(vec3, vector_str) {
    const vec = vector_str.split(/\s/g)
        .map(v => parseFloat(v));

    if (vec.length == 1) {
        return false;
    }

    vec3.set(vec[0], vec[1], vec[2]);

    return true;
}

function firstChildElement(elem, name) {
    if (name !== undefined) {
        return [...elem.children].filter(c => c.nodeName == name)[0];
    }

    return [...elem.children][0];
}

function getChildElement(elem, name) {
    return [...elem.children].filter(c => c.nodeName == name);
}



export { URDFParser };