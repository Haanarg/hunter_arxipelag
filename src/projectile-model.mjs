// Original individual projectile geometry, shared by both renderers.
export function createProjectileGeometry(T){
const heavy=new T.LatheGeometry([
  new T.Vector2(0,-.46),new T.Vector2(.19,-.46),
  new T.Vector2(.24,-.42),new T.Vector2(.24,-.34),
  new T.Vector2(.18,-.33),new T.Vector2(.18,.12),
  new T.Vector2(.22,.15),new T.Vector2(.19,.23),
  new T.Vector2(.12,.36),new T.Vector2(0,.48)
],12);
heavy.rotateX(-Math.PI/2);
const forward=new T.Vector3(0,0,-1);
// Bales lleugeres: petits cilindres allargats, amb l'eix longitudinal -Z.
// Comparteixen geometria i cada projectil s'orienta segons la trajectòria.
const light=new T.CylinderGeometry(.105,.105,.78,8);
light.rotateX(-Math.PI/2);
return {light,heavy,forward};
}
