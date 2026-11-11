// Geometria compartida entre el visor de proves i la tanqueta del joc.
// X/Z: reducció al voltant de l'eix de la torreta; Y: base sempre recolzada.
import {compactBtr823BTurret,BTR82_3B_TURRET_PIVOT_Z,
 BTR82_3B_BARREL_LOWERING_Y} from './btr82-angular-facets.mjs';

export const BTR82_3B_TURRET_SCALE=.75;
export const BTR82_3B_TURRET_FORWARD_Z=-.65; // eix -0.96, sobre el segon eix de rodes (-0.938)
export const BTR82_3B_TURRET_BASE_Y=1.71;
export const BTR82_3B_TURRET_AXIS_Z=BTR82_3B_TURRET_PIVOT_Z+BTR82_3B_TURRET_FORWARD_Z;
export const BTR82_3B_GUN_Y=BTR82_3B_TURRET_BASE_Y+
 (2.69-BTR82_3B_BARREL_LOWERING_Y-BTR82_3B_TURRET_BASE_Y)*BTR82_3B_TURRET_SCALE;
export const BTR82_3B_YAW_Y=BTR82_3B_TURRET_BASE_Y+
 (2.14-BTR82_3B_TURRET_BASE_Y)*BTR82_3B_TURRET_SCALE;

export function shapeBtr823BTurret(geometry){
 const pos=geometry.getAttribute('position');
 for(let i=0;i<pos.count;i++){
  pos.setXYZ(i,-pos.getX(i),pos.getY(i),
   2*BTR82_3B_TURRET_PIVOT_Z-pos.getZ(i));
 }
 pos.needsUpdate=true;
 compactBtr823BTurret(geometry);
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  pos.setXYZ(i,x*BTR82_3B_TURRET_SCALE,
   BTR82_3B_TURRET_BASE_Y+(y-BTR82_3B_TURRET_BASE_Y)*BTR82_3B_TURRET_SCALE,
   BTR82_3B_TURRET_PIVOT_Z+
    (z-BTR82_3B_TURRET_PIVOT_Z)*BTR82_3B_TURRET_SCALE+
    BTR82_3B_TURRET_FORWARD_Z);
 }
 pos.needsUpdate=true;
 geometry.computeVertexNormals();
 geometry.computeBoundingBox();
 geometry.computeBoundingSphere();
 return geometry;
}
