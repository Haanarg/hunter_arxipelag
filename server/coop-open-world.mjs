import {generateTerrainFoundation,createWorldRandom} from '../src/world-generation-core.mjs';
import {rawTerrainAt} from '../src/world-physics.mjs';
import {chooseCompoundLayout,runtimeLayouts} from '../src/compound-runtime-layouts.mjs';
import {planCompound,compoundPoint} from '../src/compound-planning.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {buildBaseShells} from './coop-base-buildings.mjs';
import {addCoopBunker} from './coop-bunker.mjs';
import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {combatBalance} from '../src/combat-rules.mjs';

export function configureOpenWorld(generated){
 const {record}=generated,meta=record.meta,foundation=generateTerrainFoundation({seed:meta.seed,mapScale:meta.mapScale}),random=createWorldRandom(foundation.randomState),half=2400*meta.mapScale,
 raw=(x,z)=>rawTerrainAt(x,z,foundation.islands,foundation.seed,half),
 geometry={format:2,generatorVersion:foundation.generatorVersion,seed:foundation.seed,mapScale:meta.mapScale,islands:foundation.islands,levels:[],walls:[],trees:[],stairs:[],piers:[],buildings:[],bunker:null,terminalRamps:[]},compounds=[],vehicles=[],targets=[],supplies=[];
 const clear=(x,z,r)=>Math.abs(x)+r<half-140&&Math.abs(z)+r<half-140&&compounds.every(c=>Math.hypot(c.x-x,c.z-z)>c.r+r+30);
 const landSite=(layout,preferred=null)=>{
  const r=Math.hypot(...layout.size)/2+24;
  const valid=q=>clear(q.x,q.z,r)&&[[-layout.size[0]/2,-layout.size[1]/2],[layout.size[0]/2,-layout.size[1]/2],[-layout.size[0]/2,layout.size[1]/2],[layout.size[0]/2,layout.size[1]/2],[0,0]].every(([x,z])=>raw(q.x+x,q.z+z)>.5);
  if(preferred&&valid(preferred))return {...preferred,h:raw(preferred.x,preferred.z)};
  for(let k=0;k<3000;k++){const island=foundation.islands[Math.floor(random()*foundation.islands.length)],angle=random()*Math.PI*2,d=random()*island.r*.72,q={x:island.x+Math.cos(angle)*d,z:island.z+Math.sin(angle)*d};if(valid(q))return {...q,h:raw(q.x,q.z)};}
  throw Error('No s’ha trobat terreny segur per a '+layout.id);
 };
 function coastSite(layout){
  const r=Math.hypot(...layout.size)/2+24,shore=layout.waterfront?.shore??8;
  for(const island of foundation.islands)for(let turn=0;turn<4;turn++)for(let d=80;d<island.r*1.4;d+=16){
   const angle=turn*Math.PI/2,x=island.x-Math.sin(angle)*d,z=island.z+Math.cos(angle)*d,tr=compoundPoint({x,z},angle);
   if(!clear(x,z,r))continue;
   let valid=true;for(const lx of [-layout.size[0]*.38,0,layout.size[0]*.38])for(const lz of [-layout.size[1]*.35,-15])if(raw(...tr(lx,lz))<.5)valid=false;
   for(const lx of [-25,0,25])for(const lz of [shore+35,shore+65])if(raw(...tr(lx,lz))>-2.2)valid=false;
   if(valid)for(const ship of (layout.vehicles||[]).filter(v=>vehicleDynamics.types[v.t]?.m==='w')){
     const size=vehicleSpecs.hitboxes[ship.t],scale=vehicleSpecs.scales[ship.t],c=Math.cos(ship.hd),s=Math.sin(ship.hd);
     for(const side of [-1,1])for(const end of [-1,1]){const lx=ship.x+c*side*size[0]*scale/2+s*end*size[1]*scale/2,lz=ship.z-s*side*size[0]*scale/2+c*end*size[1]*scale/2;if(raw(...tr(lx,lz))>-.8)valid=false;}
   }
   if(valid)return {x,z,angle,h:.86};
  }throw Error('No s’ha trobat una costa navegable per a '+layout.id);
 }
 const lootItems={munició:['bullets',12],granades:['grenades',1],farmaciola:['medkits',1],cisalla:['cutters',1],fusell_assalt:['assault',1],bazooka:['bazooka',3],explosius:['c4',1],disfressa:['disguise',1],franctirador:['sniper',1]};
 function add(type,preferred){
  const layout=chooseCompoundLayout(type,random),q=layout.waterfront||type==='port'?coastSite(layout):landSite(layout,preferred),plan=planCompound(layout,q,{random,rawHeightAt:raw}),id='world-'+compounds.length;
  plan.instanceId=id;geometry.levels.push(plan.level);
  const world=createStaticWorldAdapter(geometry),shells=buildBaseShells(plan,world,random,{special:true});geometry.walls.push(...shells.walls);geometry.stairs.push(...shells.stairs);geometry.buildings.push(...shells.buildings);
  const tr=compoundPoint(q,plan.angle),row={id,type,layoutId:plan.layoutId,name:layout.name,x:q.x,z:q.z,r:plan.r,angle:plan.angle,height:plan.height,entrances:plan.entrances,routes:plan.routes};compounds.push(row);
  row.landmarks=[];
  for(const tower of layout.towers||[layout.tower].filter(Boolean)){const [x,z]=tr(tower.x,tower.z);row.landmarks.push({kind:'tower',x,y:plan.height,z});for(const lx of [-1.45,1.45])for(const lz of [-1.45,1.45])geometry.walls.push({x0:x+lx-.19,x1:x+lx+.19,z0:z+lz-.19,z1:z+lz+.19,y0:plan.height,y1:plan.height+7.8,hp:1e9,indestructible:true,rammable:false});}
  if(layout.antenna){const a=layout.antenna,[x,z]=tr(a.x,a.z),scale=a.scale||1,wallIndex=geometry.walls.length;row.landmarks.push({kind:'antenna',x,y:plan.height+.2,z,spec:a,wallIndex});geometry.walls.push({x0:x-4*scale,x1:x+4*scale,z0:z-4*scale,z1:z+4*scale,y0:plan.height,y1:plan.height+1.3,hp:24,rammable:true});}
  if(layout.satellite){const b=shells.buildings[layout.buildings.findIndex(b=>b.id===layout.satellite.buildingId)];if(b)row.landmarks.push({kind:'satellite',x:b.x,y:b.fy+b.h+1.2,z:b.z,spec:layout.satellite,buildingIndex:geometry.buildings.indexOf(b)});}
  if(layout.helipad){const [x,z]=tr(layout.helipad.x,layout.helipad.z);row.landmarks.push({kind:'helipad',x,y:plan.height+.04,z,size:layout.helipad.size});}
  for(const [number,segments] of [layout.fence||[],layout.prisonerFence||[]].entries())for(const [j,[a,b]] of segments.entries()){
   const [sx,sz]=tr(...a),[ex,ez]=tr(...b),n=Math.ceil(Math.hypot(ex-sx,ez-sz)/6);
   for(let k=0;k<n;k++){const ax=sx+(ex-sx)*k/n,az=sz+(ez-sz)*k/n,bx=sx+(ex-sx)*(k+1)/n,bz=sz+(ez-sz)*(k+1)/n;geometry.walls.push({id:id+'/fence/'+number+'/'+j+'/'+k,x0:Math.min(ax,bx)-.24,x1:Math.max(ax,bx)+.24,z0:Math.min(az,bz)-.24,z1:Math.max(az,bz)+.24,y0:Math.max(0,Math.min(world.heightAt(ax,az),world.heightAt(bx,bz))),y1:Math.max(0,world.heightAt(ax,az),world.heightAt(bx,bz))+5,ax,az,bx,bz,barbed:true,rammable:true,hp:8,open:false});}
  }
  for(const b of shells.buildings)if(b.kind==='enemy_bunker')addCoopBunker(b,foundation.seed,geometry);
  const piers=layout.piers||(type==='port'?[{x:0,z:7,w:102,d:10},{x:-24,z:27.5,w:6,d:41},{x:24,z:27.5,w:6,d:41}]:[]);
  for(const p of piers){const a=tr(p.x,p.z-p.d/2),b=tr(p.x,p.z+p.d/2),length=p.d,ux=(b[0]-a[0])/length,uz=(b[1]-a[1])/length;geometry.piers.push({x:a[0],z:a[1],ux,uz,px:uz,pz:-ux,length,width:p.w,y:1.2});}
  for(const spec of layout.vehicles||[]){const profile=vehicleDynamics.types[spec.t];if(!profile)continue;const [x,z]=tr(spec.x,spec.z),w=createStaticWorldAdapter(geometry),water=profile.m==='w',y=water?0:w.heightAt(x,z)+.06;
   if(water&&raw(x,z)>-1)continue;
   vehicles.push({id:id+'/vehicle/'+vehicles.length,t:spec.t,kind:spec.t,x,y,z,alt:y,hd:spec.hd-plan.angle,v:0,life:profile.life,seats:Array(['bici','moto','windsurf','moto_aquatica'].includes(spec.t)?1:2).fill(null),rockets:12,modelScale:1,hullRadius:vehicleSpecs.radii[spec.t]*vehicleSpecs.scales[spec.t]*.62});
  }
  if(!layout.friendly&&!layout.civilian&&type!=='base')for(const [i,position] of (layout.soldiers||[]).entries()){
   const [x,z]=tr(...position);targets.push({id:id+'/guard/'+i,t:'soldat',x,y:plan.height+.3,z,hp:4,ai:true,heading:0,patrol:plan.patrol.map(([x,z])=>({x,y:plan.height+.3,z})),patrolIndex:i%Math.max(1,plan.patrol.length),lastAttack:-90,seenTicks:0});
  }
  for(const [i,loot] of (layout.civilian?[]:layout.loot||[]).entries()){const item=lootItems[loot.kind];if(item){const [x,z]=tr(loot.x,loot.z);supplies.push({id:id+'/supply/'+i,item:item[0],amount:item[1],x,y:plan.height+.3,z});if(item[0]==='sniper')supplies.push({id:id+'/sniper-ammo/'+i,item:'sniperAmmo',amount:6,x:x+.7,y:plan.height+.3,z});}}
  return row;
 }
 const base=add('base',foundation.baseCandidate);add('hq',foundation.headquartersCandidate);
 // Reserve the mandatory camp before optional sites, as in individual generation.
 add('prison-camp');for(const type of [...new Set(runtimeLayouts.map(l=>l.id))].filter(t=>!['base','hq','prison-camp'].includes(t)))add(type);
 for(let i=0;i<meta.mapScale*3;i++)add(i%2?'outpost':'polvori');
 const world=createStaticWorldAdapter(geometry),basePlan=geometry.levels[0];
 // Validate two connected exterior spawn points on the friendly foundation.
 const points=[];for(let x=base.x-45;x<=base.x+45&&points.length<2;x+=4)for(let z=base.z-40;z<=base.z+40&&points.length<2;z+=4){const p={x,y:world.heightAt(x,z)+.06,z,hd:0},s=world.locomotionAt(x,z,p.y),resolved=world.resolveBody(p,p);if(!s.interior&&Math.hypot(resolved.x-x,resolved.z-z)<1e-5&&(!points.length||Math.hypot(points[0].x-x,points[0].z-z)>=4))points.push(p);}
 if(points.length!==2)throw Error('La base no té dos punts inicials segurs');
 Object.assign(meta,{seed:foundation.seed,mode:'world',bounds:{x0:-half+3,x1:half-3,z0:-half+3,z1:half-3},floor:basePlan.y,compounds,vehicles,targets,supplies,terminals:[],routes:[],extraction:points[0],timeLimitTicks:54000,
 doors:geometry.walls.flatMap((w,wallIndex)=>w.door&&!w.alwaysOpen?[{id:w.id,wallIndex,cx:w.cx,cz:w.cz,floor:w.y0+1}]:[])});
 record.checkpoint.players.forEach((p,i)=>Object.assign(p,points[i],{hp:combatBalance.player,swimming:false,fall:null}));
 // Equipment remains personal; base supplies/vehicles come from the approved layout.
 record.inventories=meta.members.map(m=>({actorId:m.id,bullets:48,grenades:2,disguise:1,medkits:1,assault:1,sniper:0,sniperAmmo:0,bazooka:0,c4:0,cutters:1,weapon:'pistol',disguised:false}));
 geometry.vegetation={version:1,randomState:random.getState(),spawn:{x:points[0].x,z:points[0].z},compounds:compounds.map(c=>({x:c.x,z:c.z,r:c.r}))};
 generated.geometry=geometry;return generated;
}
