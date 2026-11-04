// Torre estructural: els dos defensors són soldats independents de la caseta.
// Coordenades locals idèntiques per a la IA del navegador i el Worker COOP.
export const TOWER_GUARD_FLOOR_Y=8.28;
export const TOWER_GUARD_SPACING=1.43;
export const TOWER_GUARD_RANGE=128;
export const TOWER_GUARD_HALF_VIEW=Math.PI/3; // 120° totals, no visió de 360°
export const TOWER_GUARD_SCAN_SPEED=.54;
export const TOWER_GUARD_TURN_SPEED=1.85;
// Murets laterals: del sòl de la plataforma fins per damunt del pit,
// deixant visible el cap i lliure tota la façana frontal.
export const TOWER_SIDE_PARAPET_HEIGHT=2.32;
export const TOWER_SIDE_PARAPET_Y=9.59; // base local: 8.43 .. 10.75
export const TOWER_SIDE_PARAPET_X=3.02;
export const TOWER_SIDE_PARAPET_LENGTH=5.1;
export function towerSideParapetVolumes(){
  return [-1,1].map(side=>({
    x:side*TOWER_SIDE_PARAPET_X,y:TOWER_SIDE_PARAPET_Y,z:0,
    width:.18,height:TOWER_SIDE_PARAPET_HEIGHT,depth:TOWER_SIDE_PARAPET_LENGTH
  }));
}
// El parapet intercepta els trets ENTRANTS, però els soldats que són
// darrere poden treure l'arma per sobre de la barana i disparar enfora.
// El mateix criteri s'aplica al joc individual i al servidor COOP.
export function towerParapetBlocksShot(w,from){
  if(!w?.towerParapet)return true;
  const px=w.towerX,pz=w.towerZ,base=w.towerBaseY;
  if(!Number.isFinite(px)||!Number.isFinite(pz)||!Number.isFinite(base))return true;
  return !(Math.abs(from.x-px)<TOWER_SIDE_PARAPET_X-.24&&
    Math.abs(from.z-pz)<TOWER_SIDE_PARAPET_LENGTH/2-.15&&
    from.y>base+TOWER_GUARD_FLOOR_Y-.25);
}

export function towerGuardPosition(tower,seat){
  return {x:tower.x+(seat===0?-TOWER_GUARD_SPACING:TOWER_GUARD_SPACING),
    y:(tower.y??tower.gy??0)+TOWER_GUARD_FLOOR_Y,z:tower.z+.25};
}
export function towerGuardInView(heading,dx,dz,range=TOWER_GUARD_RANGE){
  const d=Math.hypot(dx,dz);
  return d>.001&&d<=range&&(-Math.sin(heading)*dx-Math.cos(heading)*dz)/d>=Math.cos(TOWER_GUARD_HALF_VIEW);
}
export function towerTurnHeading(current,desired,dt,rate=TOWER_GUARD_TURN_SPEED){
  const difference=Math.atan2(Math.sin(desired-current),Math.cos(desired-current));
  const turn=Math.max(-rate*dt,Math.min(rate*dt,difference));
  return Math.atan2(Math.sin(current+turn),Math.cos(current+turn));
}
export function createTowerModel(THREE,{box:bx}){
  const g=new THREE.Group(),leg=0x4b5157,deck=0x626b70,
        cabin=0x7c2f2f,roof=0x343a3e;
  g.userData.towerLegMeshes=[];
  g.userData.towerParapetMeshes=[];
  // Platafoma de 6,4 m: dos soldats d'escala normal, espatlla contra
  // espatlla, sense solapar-se ni quedar ocults dins una cabina massissa.
  for(const x of[-2.3,2.3])for(const z of[-1.9,1.9])
    g.userData.towerLegMeshes.push(bx(g,.44,7.95,.44,leg,x,3.98,z,'metal'));
  bx(g,6.4,.44,5.5,deck,0,8.04,0,'metal');
  // Baranes baixes, protegint el costat i la part posterior.
  // La façana -Z queda oberta perquè fusell i coet puguin disparar.
  for(const wall of towerSideParapetVolumes())
    g.userData.towerParapetMeshes.push(
      bx(g,wall.width,wall.height,wall.depth,cabin,
        wall.x,wall.y,wall.z,'paint'));
  bx(g,6.02,.85,.18,cabin,0,8.7,2.50,'paint');
  for(const x of[-2.97,2.97])for(const z of[-2.42,2.42])
    bx(g,.22,4.05,.22,leg,x,10.18,z,'metal');
  // Dos plafons baixos a banda i banda de l'obertura frontal, mai al
  // nivell dels canons. Mantén visió i línia de tir per tots dos soldats.
  for(const x of[-2.45,2.45])
    bx(g,.8,.55,.18,cabin,x,8.55,-2.45,'paint');
  bx(g,6.95,.32,6.05,roof,0,12.32,0,'metal');
  bx(g,6.4,.18,.18,0xa1a39b,0,12.16,-2.86,'metal');
  // Els dos fusells són malles dels soldats, no canons de la torre.
  g.userData.towerGuardSlots=[
    {x:-TOWER_GUARD_SPACING,y:TOWER_GUARD_FLOOR_Y,z:.25},
    {x:TOWER_GUARD_SPACING,y:TOWER_GUARD_FLOOR_Y,z:.25}
  ];
  return g;
}
