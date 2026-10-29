export function createTowerModel(THREE,{box:bx}){const g=new THREE.Group();const leg=0x4b5157,deck=0x626b70,cabin=0x7c2f2f,roof=0x343a3e;
g.userData.towerLegMeshes=[];
for(const lx of[-1.45,1.45])for(const lz of[-1.45,1.45])
  g.userData.towerLegMeshes.push(bx(g,.38,7.8,.38,leg,lx,3.9,lz,'metal'));
bx(g,4.4,.45,4.4,deck,0,7.9,0,'metal');
for(const x of[-2.05,2.05])bx(g,.16,1.25,4.15,leg,x,8.65,0,'metal');
for(const z of[-2.05,2.05])bx(g,4.15,1.25,.16,leg,0,8.65,z,'metal');
bx(g,2.75,1.8,2.75,cabin,0,9.15,0,'paint');
bx(g,1.9,.72,.08,0x6b9aa5,0,9.35,-1.39,'glass');
bx(g,3.35,.28,3.35,roof,0,10.25,0,'metal');
// Dues armes orientables: lleugera a l'esquerra i pesada a la dreta.
const turret=new THREE.Group();turret.position.y=9.25;g.add(turret);
bx(turret,.32,.32,2.1,roof,-.72,0,-2.25,'metal');
bx(turret,.58,.58,2.35,0x37433c,.72,-.2,-2.25,'metal');
bx(turret,.68,.65,.22,0x666b62,.72,-.2,-3.43,'metal');
g.userData.towerTurret=turret;
bx(g,.42,.8,.42,0xe4d36f,0,10.78,0,'paint');return g;}
