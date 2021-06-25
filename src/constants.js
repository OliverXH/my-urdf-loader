
// enum UrdfGeomTypes
export const URDF_GEOM_SPHERE = 2;
export const URDF_GEOM_BOX = 3;
export const URDF_GEOM_CYLINDER = 4;
export const URDF_GEOM_MESH = 5;
export const URDF_GEOM_PLANE = 6;
export const URDF_GEOM_CAPSULE = 7;  //non-standard URDF
export const URDF_GEOM_CDF = 8;      //signed-distance-field; non-standard URDF
export const URDF_GEOM_HEIGHTFIELD = 9;   //heightfield; non-standard URDF
export const URDF_GEOM_UNKNOWN = 10;

// enum FileTypes
export const FILE_NONE = 0;
export const FILE_STL = 1;
export const FILE_COLLADA = 2;
export const FILE_OBJ = 3;
export const FILE_CDF = 4;
export const MEMORY_VERTICES = 5;
export const FILE_VTK = 6;

// enum UrdfCollisionFlags
export const URDF_FORCE_CONCAVE_TRIMESH = 1;
export const URDF_HAS_COLLISION_GROUP = 2;
export const URDF_HAS_COLLISION_MASK = 4;
