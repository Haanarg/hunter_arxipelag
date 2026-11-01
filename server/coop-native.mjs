import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
import {vehicleSeatCount} from '../src/vehicle-specs.mjs';
import {MISSION_VERSION} from './coop-mission.mjs';
import {GAME_VERSION} from '../src/version.mjs';
export async function nativeFingerprint(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function generateNativeMission(room,payload,fingerprint){
 if(!room.allReady||room.members.length!==2||payload.requestedSeed!==room.seed||payload.geometry.mapScale!==room.mapScale)throw Error('La sala i el món no coincideixen.');
 const geometry=payload.geometry,world=createStaticWorldAdapter(geometry),spawn=payload.spawn;
 if(!spawn||!['x','y','z','hd'].every(k=>Number.isFinite(spawn[k])))throw Error('Inici de jugador invàlid.');
 for(const [key,max] of [['vehicles',500],['targets',2000],['supplies',5000]])if(!Array.isArray(payload[key])||payload[key].length>max||payload[key].some(v=>typeof v.id!=='string'||v.id.length>160||!['x','y','z'].every(k=>Number.isFinite(v[k]))))throw Error('Entitats invàlides.');
 if(payload.vehicles.some(v=>!vehicleDynamics.types[v.t]))throw Error('Vehicle desconegut.');
 if(payload.intel!==undefined&&(
   !Array.isArray(payload.intel?.sites)||![3,9].includes(payload.intel.sites.length)||
   payload.intel.sites.filter(p=>p.real===true).length!==1||
   payload.intel.sites.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.z)||
      typeof p.real!=='boolean'||Math.abs(p.x)>world.limit||Math.abs(p.z)>world.limit)||
   !Array.isArray(payload.intel.eliminationOrder)||
   payload.intel.eliminationOrder.length!==payload.intel.sites.length-1||
   new Set(payload.intel.eliminationOrder).size!==payload.intel.eliminationOrder.length||
   payload.intel.eliminationOrder.some(i=>!Number.isInteger(i)||
     i<0||i>=payload.intel.sites.length||payload.intel.sites[i].real)))
   throw Error('Intel·ligència cooperativa invàlida.');
 if(payload.sharks!==undefined&&(!Array.isArray(payload.sharks)||payload.sharks.length>40||
   payload.sharks.some(f=>typeof f.id!=='string'||f.id.length>64||
     !['x','z','cx','cz','r','a','sp'].every(k=>Number.isFinite(f[k]))||
     f.r<0||f.r>100||f.sp<0||f.sp>2||
     Math.abs(f.x)>world.limit||Math.abs(f.z)>world.limit)))
   throw Error('Fauna cooperativa invàlida.');
 // El camp i les consoles provenen dels models originals, però el client
 // no pot inventar NPC, índexs de tanca ni coordenades fora del món.
 if(payload.optional!==undefined){
   const optional=payload.optional,camp=optional?.prison,
     point=p=>p&&['x','y','z'].every(k=>Number.isFinite(p[k]))&&
       Math.abs(p.x)<world.limit&&Math.abs(p.z)<world.limit;
   if(!camp||!point(camp.rescuePoint)||!point(camp.mechanicStation)||
     !Number.isFinite(camp.x)||!Number.isFinite(camp.z)||
     !Array.isArray(camp.entities)||camp.entities.length!==5||
     camp.entities.filter(u=>u.role==='mechanic').length!==1||
     camp.entities.filter(u=>u.role==='farmer').length!==4||
     new Set(camp.entities.map(u=>u.id)).size!==5||
     camp.entities.some(u=>typeof u.id!=='string'||u.id.length>96||!point(u)||u.hp<0||u.hp>4)||
     !Array.isArray(camp.guardIds)||camp.guardIds.length>32||
     camp.guardIds.some(id=>!payload.targets.some(t=>t.id===id))||
     !Array.isArray(camp.fenceIndexes)||camp.fenceIndexes.length>128||
     camp.fenceIndexes.some(i=>!Number.isInteger(i)||i<0||i>=geometry.walls.length)||
     !Array.isArray(camp.farmerEscape)||camp.farmerEscape.length>16||
     !Array.isArray(camp.mechanicAccess)||camp.mechanicAccess.length>16||
     [...camp.farmerEscape,...camp.mechanicAccess].some(p=>!point(p))||
     !Array.isArray(optional.radio)||optional.radio.length>32||
     optional.radio.some(x=>!point(x)||typeof x.id!=='string'||x.id.length>96||
       !Number.isInteger(x.colliderIndex)||x.colliderIndex< -1||x.colliderIndex>=geometry.walls.length||
       !Array.isArray(x.sourceIds)||x.sourceIds.length>40||
       !Array.isArray(x.hqDefenders)||x.hqDefenders.length>40||
       [...x.sourceIds,...x.hqDefenders].some(id=>!payload.targets.some(t=>t.id===id))))
     throw Error('Missions secundàries invàlides.');
 }
 for(const target of payload.targets)if(target.t==='soldat'){
  for(const [key,min,max] of [['sp',0,30],['rate',.1,10],['dmg',0,100]])if(target[key]!==undefined&&(!Number.isFinite(target[key])||target[key]<min||target[key]>max))throw Error('Perfil de soldat invàlid.');
  if(['elite','rocketSoldier','guard'].some(key=>target[key]!==undefined&&typeof target[key]!=='boolean')||target.sensePhaseTicks!==undefined&&(!Number.isInteger(target.sensePhaseTicks)||target.sensePhaseTicks<0||target.sensePhaseTicks>3))throw Error('Percepció de soldat invàlida.');
  if(target.patrol!==undefined&&(!Array.isArray(target.patrol)||target.patrol.length>512||target.patrol.some(point=>!['x','y','z'].every(key=>Number.isFinite(point[key])))))throw Error('Patrulla de soldat invàlida.');
 }

 let second=null;for(let r=3;r<12&&!second;r+=2)for(let i=0;i<16;i++){const q={...spawn,x:spawn.x+Math.cos(i*Math.PI/8)*r,z:spawn.z+Math.sin(i*Math.PI/8)*r},p=world.resolve(q,q);if(Math.hypot(q.x-p.x,q.z-p.z)<1e-5&&Math.abs(p.y-spawn.y)<1){second={...q,y:p.y};break;}}
 if(!second)throw Error('No hi ha espai per al company.');
 const id=crypto.randomUUID(),meta={version:1,generator:MISSION_VERSION,gameVersion:GAME_VERSION,id,roomId:room.id,revision:room.revision,seed:geometry.seed,mapScale:room.mapScale,difficulty:room.difficulty,mode:'native',fingerprint,
  createdAt:Date.now(),expiresAt:room.expiresAt,timeLimitTicks:Math.max(30,Math.floor((room.expiresAt-Date.now())/1000)*30),bounds:{x0:-world.limit,x1:world.limit,z0:-world.limit,z1:world.limit},floor:spawn.y,members:room.members.map(m=>({id:m.id,name:m.name})),terminals:[],extraction:spawn,
  vehicles:payload.vehicles.map(v=>({...v,seats:Array(vehicleSeatCount(v.t)).fill(null)})),targets:payload.targets,supplies:payload.supplies,
  ...(payload.optional?{optional:payload.optional}:{}),
  ...(payload.sharks?{sharks:payload.sharks}:{}),
  ...(payload.intel?{intel:payload.intel}:{}),
  doors:geometry.walls.flatMap((w,wallIndex)=>w.door&&!w.alwaysOpen&&!w.locked?[{id:w.id,wallIndex,cx:(w.x0+w.x1)/2,cz:(w.z0+w.z1)/2,floor:w.y0+1}]:[])};
 const inventories=meta.members.map(m=>({actorId:m.id,bullets:16,grenades:0,disguise:0,medkits:0,assault:0,sniper:0,sniperAmmo:0,bazooka:0,c4:0,cutters:0,weapon:'pistol',disguised:false}));
 return {geometry,record:{meta,inventories,phase:'relay',hold:0,status:'paused',checkpoint:{protocol:1,epoch:id,tick:0,players:meta.members.map((m,i)=>({id:m.id,...(i?second:spawn),hp:25,acknowledged:0,fall:null,swimming:false}))},nextAlarm:Date.now()+100}};
}
