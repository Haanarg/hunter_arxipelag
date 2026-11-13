// Torre estructural: els dos defensors són soldats independents de la caseta.
// Coordenades locals idèntiques per a la IA del navegador i el Worker COOP.
export const TOWER_GUARD_FLOOR_Y=8.28;
export const TOWER_GUARD_SPACING=1.43;
export const TOWER_GUARD_RANGE=128;
export const TOWER_GUARD_HALF_VIEW=Math.PI/3; // 120° totals, no visió de 360°
export const TOWER_GUARD_SCAN_SPEED=.54;
export const TOWER_GUARD_TURN_SPEED=1.85;
// Els QUATRE parapets tenen la mateixa altura: protegeixen el pit
// i deixen sobresortir el cap i la boca del canó dels dos soldats.
// Una pota aguanta els cops lents i transmet els ràpids a l'estructura.
// El dany es calcula a la velocitat de contacte, després de la frenada
// de la simulació: un tanc a velocitat real de xoc ha de poder tombar-la.
export function towerLegRamDamage(speed,mass=1){
  if(!(speed>8))return 0;
  return Math.min(10,Math.max(1,Math.ceil((speed-8)*Math.sqrt(Math.max(.2,mass))/2)));
}
export const TOWER_SIDE_PARAPET_HEIGHT=1.75;
export const TOWER_SIDE_PARAPET_Y=9.305; // base local: 8.43 .. 10.18
export const TOWER_SIDE_PARAPET_X=3.02;
export const TOWER_END_PARAPET_Z=2.5;
export const TOWER_SIDE_PARAPET_LENGTH=5.1;
export function towerParapetVolumes(){
  const sideWalls=[-1,1].map(side=>({
    x:side*TOWER_SIDE_PARAPET_X,y:TOWER_SIDE_PARAPET_Y,z:0,
    width:.18,height:TOWER_SIDE_PARAPET_HEIGHT,depth:TOWER_SIDE_PARAPET_LENGTH
  }));
  const endWalls=[-1,1].map(side=>({
    x:0,y:TOWER_SIDE_PARAPET_Y,z:side*TOWER_END_PARAPET_Z,
    width:6.02,height:TOWER_SIDE_PARAPET_HEIGHT,depth:.18
  }));
  return [...sideWalls,...endWalls];
}
// Alias compatible amb antics generadors; retorna els quatre parapets.
export const towerSideParapetVolumes=towerParapetVolumes;
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

// Límit físic de la plataforma: fins i tot amb l'empenta d'una explosió,
// un defensor viu no pot sortir per sobre dels parapets ni quedar encastat
// en una paret. Respectam el radi de col·lisió que usa enemy-navigation.
// El sostre NO és un terra addicional per als soldats de la plataforma.
export const TOWER_GUARD_BODY_RADIUS=1.05;
// Sostre a 12,16 m, plataforma a 8,28 m: el soldat (2,78 m fins al cap)
// pot rebre una empenta vertical curta sense travessar la coberta.
export const TOWER_GUARD_BLAST_CLEARANCE=1.0;
export function towerGuardDeckPoint(tower,x,z,radius=TOWER_GUARD_BODY_RADIUS){
  if(!tower||![tower.x,tower.z,x,z,radius].every(Number.isFinite))
    return {x,z,limitedX:false,limitedZ:false};
  const safeRadius=Math.max(0,radius),edge=.07,
    halfX=Math.max(.1,TOWER_SIDE_PARAPET_X-.09-safeRadius-edge),
    halfZ=Math.max(.1,TOWER_END_PARAPET_Z-.09-safeRadius-edge),
    nx=Math.max(tower.x-halfX,Math.min(tower.x+halfX,x)),
    nz=Math.max(tower.z-halfZ,Math.min(tower.z+halfZ,z));
  return {x:nx,z:nz,limitedX:nx!==x,limitedZ:nz!==z};
}
export function towerGuardWithinDeck(tower,x,z,radius=TOWER_GUARD_BODY_RADIUS){
  const p=towerGuardDeckPoint(tower,x,z,radius);
  return Number.isFinite(p.x)&&Number.isFinite(p.z)&&!p.limitedX&&!p.limitedZ;
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
  // Parapets uniformes a esquerra, dreta, davant i darrere.
  // La IA situa visió i canó per sobre del capdamunt de les quatre parets.
  for(const wall of towerParapetVolumes())
    g.userData.towerParapetMeshes.push(
      bx(g,wall.width,wall.height,wall.depth,cabin,
        wall.x,wall.y,wall.z,'paint'));
  for(const x of[-2.97,2.97])for(const z of[-2.42,2.42])
    bx(g,.22,4.05,.22,leg,x,10.18,z,'metal');
  bx(g,6.95,.32,6.05,roof,0,12.32,0,'metal');
  bx(g,6.4,.18,.18,0xa1a39b,0,12.16,-2.86,'metal');
  // Els dos fusells són malles dels soldats, no canons de la torre.
  g.userData.towerGuardSlots=[
    {x:-TOWER_GUARD_SPACING,y:TOWER_GUARD_FLOOR_Y,z:.25},
    {x:TOWER_GUARD_SPACING,y:TOWER_GUARD_FLOOR_Y,z:.25}
  ];
  return g;
}
