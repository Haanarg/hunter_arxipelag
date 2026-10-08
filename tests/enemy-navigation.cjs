const assert=require('assert');
(async()=>{
 const {run}=await require('./harness.cjs')();
 run(`R=()=>.5;world=new THREE.Group();hAt=()=>3;TG.clear();Wl=[];V=[];E=[];
 function unit(t,x,z,hd=0){const u=mkEn(t,x,z);u.hd=hd;u.navHd=hd;u.o.rotation.y=hd;u.o.position.set(x,3,z);return u}
 function wall(x0,x1,z0,z1){Wl.push({x0,x1,z0,z1,y0:0,y1:10,open:false})}
 function tick(u,x,z,n=1){for(let i=0;i<n;i++){enemyPathBudget=2;enemyNodeBudget=160;u.tx=x;u.tz=z;mvE(u,u.sp*.05,x,z)}}
 `);
 // Start and endpoint are clear, but the segment crosses a thin wall.
 assert(run(`(()=>{const u=unit('soldat',-8,0);wall(-.1,.1,-10,10);rebuildVehicleGrid();return !enemySweep(u,-8,0,8,0,0,0)})()`),'no tunnelling');
 for(const type of ['soldat','jeep','tanqueta','tanc']){
  run(`E=[];Wl=[];const u${type}=unit('${type}',-35,0,-Math.PI/2);wall(-5,5,-12,12);rebuildVehicleGrid();`);
  const start=Date.now();
  assert(run(`(()=>{const u=u${type};for(let i=0;i<650;i++){tick(u,35,0);if(!enemyMoveClear(u,u.x,u.z,u.hd))return false;if(Math.hypot(u.x-35,u.z)<2)return true}return false})()`),type+' routes around a building');
  console.log(type,'building route',Date.now()-start,'ms');
 }
 run(`E=[];Wl=[];const c=unit('soldat',0,0);wall(-12,-10,-12,12);wall(10,12,-12,12);wall(-12,12,-12,-10);rebuildVehicleGrid();`);
 assert(run(`(()=>{tick(c,0,-30,800);return Math.hypot(c.x,c.z+30)<2})()`),'escapes U-shaped enclosure');
 run(`E=[];Wl=[];const crowd=Array.from({length:12},(_,i)=>unit('soldat',Math.cos(i*Math.PI/6)*15,Math.sin(i*Math.PI/6)*15));rebuildVehicleGrid();`);
 assert(run(`(()=>{for(let n=0;n<200;n++){enemyPathBudget=2;enemyNodeBudget=160;for(const u of crowd)mvE(u,.35,0,0);for(let i=0;i<E.length;i++)for(let j=i+1;j<E.length;j++)if(Math.hypot(E[i].x-E[j].x,E[i].z-E[j].z)<2.39)return false}return true})()`),'12 converging soldiers remain separated');
 run(`E=[];Wl=[];const a=unit('jeep',-30,0,-Math.PI/2),b=unit('soldat',0,0);rebuildVehicleGrid();`);
 assert(run(`(()=>{for(let n=0;n<90;n++){tick(a,20,0);if(circleVehicleOverlap(b.x,b.z,enemyBodyRadius(b)+.29,a))return false}return true})()`),'vehicle never overlaps stationary soldier');
 run(`E=[];Wl=[];const d=unit('soldat',0,0);wall(-15,15,-5,-4);rebuildVehicleGrid();`);
 assert(run(`!enemySweep(d,0,0,0,-10,0,0,false)`),'closed door blocks');
 run('Wl[0].open=true');assert(run('enemySweep(d,0,0,0,-10,0,0,false)'),'opened/destroyed wall immediately passable');
 run(`E=[];Wl=[];const r=unit('tanc',0,0);wall(5,6,-12,12);rebuildVehicleGrid();`);
 assert(run('!enemySweep(r,0,0,0,0,0,Math.PI/2)'),'rotation cannot sweep tank through wall');
 run(`E=[];Wl=[];const s1=unit('soldat',63,0),s2=unit('soldat',63,0);prepareEnemyNavigation();`);
 assert(run('Math.hypot(s1.x-s2.x,s1.z-s2.z)>=2.4'),'generated overlapping soldiers separated');
 run(`E=[];Wl=[];const crossing=unit('soldat',63,0);rebuildVehicleGrid();tick(crossing,70,0,8)`);
 assert(run('enemyCandidatesAt(crossing.x,crossing.z,0).includes(crossing)'),'grid updates after crossing cell boundary');
 // Two vehicles pass while retaining their full rotated hitboxes.
 run(`E=[];Wl=[];const va=unit('jeep',-25,0,-Math.PI/2),vb=unit('tanqueta',25,0,Math.PI/2);rebuildVehicleGrid();`);
 assert(run(`(()=>{for(let n=0;n<220;n++){enemyPathBudget=2;enemyNodeBudget=160;mvE(va,1.1,35,0);mvE(vb,.65,-35,0);if(obbOverlap(vehicleBox(va),vehicleBox(vb)))return false}return true})()`),'opposing vehicles remain separated');
 run(`E=[];Wl=[];const gate=unit('jeep',0,15,0);wall(-20,-3,-1,1);wall(3,20,-1,1);rebuildVehicleGrid();`);
 assert(run(`(()=>{tick(gate,0,-15,200);return gate.z<-12})()`),'aligned vehicle traverses a gate narrower than its turning circle');
 console.log('Enemy navigation regression checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
