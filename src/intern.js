
import { Vector3, Color } from 'three';
import { Ammo } from './ammo.js';

import { URDF_GEOM_UNKNOWN, FILE_NONE } from './constants.js';

class UrdfModel {

    constructor() {
        this.m_name = '';

        this.m_rootTransformInWorld = new Ammo.btTransform();
        this.m_rootTransformInWorld.setIdentity();

        this.m_materials = [];
        this.m_links = [];
        this.m_joints = [];

        this.m_rootLinks = [];

        this.m_deformable = null
    }
}

class UrdfMaterial {
    constructor() {
        this.m_name = '';
        this.m_textureFilename = '';
        this.m_matColor = new UrdfMaterialColor();
    }
}

class UrdfMaterialColor {
    constructor() {
        this.m_alpha = 1;
        this.m_rgbColor = new Color(0.8, 0.8, 0.8);
        this.m_specularColor = new Color(0.4, 0.4, 0.4);
    }
}

class UrdfGeometry {
    constructor() {
        this.m_type = URDF_GEOM_UNKNOWN;

        this.m_sphereRadius = 1;

        this.m_boxSize = new Vector3(1, 1, 1);

        this.m_capsuleRadius = 1;
        this.m_capsuleHeight = 1;
        this.m_hasFromTo = false;
        this.m_capsuleFrom = new Vector3(0, 1, 0);
        this.m_capsuleTo = new Vector3(1, 0, 0);

        this.m_planeNormal = new Vector3(0, 0, 1);

        this.m_meshFileType = FILE_NONE;
        this.m_meshFileName = '';
        this.m_meshScale = new Vector3(1, 1, 1);

        this.m_vertices = [];
        this.m_uvs = [];
        this.m_normals = [];
        this.m_indices = [];

        this.m_localMaterial = new UrdfMaterial();
        this.m_hasLocalMaterial = false;
    }

}

class UrdfJoint {
    constructor() {
        this.m_name = '';
        this.m_type;
        this.m_parentLinkToJointTransform = new Ammo.btTransform();
        this.m_parentLinkName = '';
        this.m_childLinkName = '';
        this.m_localJointAxis = new Ammo.btTransform();

        this.m_lowerLimit = 0;
        this.m_upperLimit = -1;

        this.m_effortLimit = 0;
        this.m_velocityLimit = 0;

        this.m_jointDamping = 0;
        this.m_jointFriction = 0;
    }
}

class UrdfLink {
    constructor() {
        this.m_name = '';
        this.m_inertia = new UrdfInertia();
        this.m_linkTransformInWorld = new Ammo.btTransform();
        
        this.m_visualArray = [];
        this.m_collisionArray = [];

        this.m_parentLink = null;
        this.m_parentJoint = new UrdfJoint();

        this.m_childJoints = [];
        this.m_childLinks = [];

        this.m_linkIndex = -2;

        this.m_contactInfo = null;

    }
}

class UrdfShape {
    constructor() {
        this.m_name = '';
        this.m_sourceFileLocation = '';
        this.m_linkLocalFrame = new Ammo.btTransform();
        this.m_geometry = new UrdfGeometry();
    }
}

class UrdfVisual extends UrdfShape {
    constructor() {
        super();
        this.m_materialName = '';
        // this.m_userData = null;
    }
}

class UrdfCollision extends UrdfShape {
    constructor() {
        super();
        this.m_flags = 0;
        this.m_collisionGroup;
        this.m_collisionMask;
    }
}

class UrdfInertia {
    constructor() {
        this.m_linkLocalFrame = new Ammo.btTransform();
        this.m_linkLocalFrame.setIdentity();
        this.m_hasLinkLocalFrame = false;

        this.m_mass = 0;
        this.m_ixx = 0;
        this.m_ixy = 0;
        this.m_ixz = 0;
        this.m_iyy = 0;
        this.m_iyz = 0;
        this.m_izz = 0;
    }
}

export { UrdfModel, UrdfGeometry, UrdfMaterial, UrdfJoint, UrdfLink, UrdfShape, UrdfVisual, UrdfCollision, UrdfInertia };