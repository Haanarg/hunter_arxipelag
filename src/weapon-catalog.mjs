import {combatBalance} from './combat-rules.mjs';
import {ARMORED_AIM,SMALL_ARMS_RANGE,SMALL_ARMS_AIM_CONE,SMALL_ARMS_AIM_VERTICAL} from './aiming-core.mjs';
// Original individual weapon parameters; presentation and authority stay in adapters.
export const HEAVY_SPEED_FACTOR=1.17;
export const weaponCatalog=Object.freeze(Object.fromEntries(Object.entries({
 pistol:{name:'Pistola',ammo:'bullets',speed:130,damage:combatBalance.weapons.pistol,range:SMALL_ARMS_RANGE.pistol,cone:SMALL_ARMS_AIM_CONE,vertical:SMALL_ARMS_AIM_VERTICAL,cooldown:.22,life:2.2},
 assault:{name:'Fusell d’assalt',item:'assault',ammo:'bullets',speed:130,damage:combatBalance.weapons.rifle,range:SMALL_ARMS_RANGE.assault,cone:SMALL_ARMS_AIM_CONE,vertical:SMALL_ARMS_AIM_VERTICAL,cooldown:.34,life:2.2},
 sniper:{name:'Franctirador',item:'sniper',ammo:'sniperAmmo',speed:470,damage:combatBalance.weapons.sniper,range:1000,cone:.999,vertical:Math.PI/2,cooldown:1.05,life:2.2},
 bazooka:{name:'Bazuca',ammo:'bazooka',speed:72*HEAVY_SPEED_FACTOR,damage:combatBalance.weapons.bazooka,splash:18,range:185,cone:.68,vertical:.90,cooldown:1.05,life:3.8},
 knife:{name:'Ganivet',damage:combatBalance.weapons.knife,cooldown:.52},
 cutters:{name:'Cisalla',item:'cutters',cooldown:.52},
 grenade:{name:'Granada',ammo:'grenades',damage:combatBalance.weapons.grenade,splash:16,cooldown:.7},
 c4:{name:'C4',ammo:'c4',damage:48,splash:combatBalance.weapons.c4,cooldown:1},
 tank:{name:'Canó del tanc',speed:85*HEAVY_SPEED_FACTOR,damage:combatBalance.weapons.tank,splash:8,range:220,cone:ARMORED_AIM.heavy.cone,vertical:ARMORED_AIM.heavy.vertical,cooldown:.9,life:4.4},
 tankette:{name:'Canó de la tanqueta',speed:135,damage:combatBalance.weapons.tankette,range:85,cone:ARMORED_AIM.light.cone,vertical:ARMORED_AIM.light.vertical,cooldown:.16,life:2.2},
 attackCannon:{name:'Canó de l’helicòpter',speed:145,damage:combatBalance.weapons.attackCannon,range:130,cone:.73,vertical:.97,cooldown:.12,life:2.2},
 heliMissile:{name:'Míssil',ammo:'rockets',speed:72*HEAVY_SPEED_FACTOR,damage:combatBalance.weapons.heliMissile,splash:10,range:185,cone:.68,vertical:.9,cooldown:.75,life:3.3},
 boatRocket:{name:'Coet naval',speed:68*HEAVY_SPEED_FACTOR,damage:combatBalance.weapons.boatRocket,splash:11,range:185,cone:.68,vertical:.9,cooldown:.9,life:2.2}
}).map(([key,value])=>[key,Object.freeze(value)])));
export const personalWeapons=Object.freeze(['pistol','assault','sniper','bazooka','knife','cutters','c4']);
export const combatCommands=Object.freeze([...personalWeapons,'grenade','secondary']);
export const inventoryCaps=Object.freeze({bullets:120,grenades:8,disguise:1,medkits:3,assault:1,sniper:1,sniperAmmo:40,bazooka:12,c4:8,cutters:1});
export const openRiderTypes=Object.freeze(['bici','moto','moto_aquatica','barca_rems','windsurf','llanxa']);
export const mountedWeapons=Object.freeze({...Object.fromEntries(openRiderTypes.map(t=>[t,'pistol'])),tanc:'tank',tanqueta:'tankette',heli_combat:'attackCannon',llanxa_coets:'boatRocket'});
export function grenadeLaunch(power=0,origin,heading){
 const ratio=Math.max(0,Math.min(1,power)),speed=3.5+(33-3.5)*ratio,fx=-Math.sin(heading),fz=-Math.cos(heading);
 return {x:origin.x+fx*.85,y:origin.y+2.05,z:origin.z+fz*.85,vx:fx*speed,vy:12,vz:fz*speed,t:2.4};
}
export function meleeTarget(origin,targets,clear){
 const fx=-Math.sin(origin.hd),fz=-Math.cos(origin.hd);let hit=null,best=2.6;
 for(const u of targets){if(u.t!=='soldat'&&u.t!=='general')continue;const dx=u.x-origin.x,dz=u.z-origin.z,d=Math.hypot(dx,dz);if(d<best&&d>.35&&(dx*fx+dz*fz)/d>.35&&clear(u)){best=d;hit=u;}}
 return hit;
}

export function nearestWire(P,walls){
 const reach=2.75,fx=-Math.sin(P.hd),fz=-Math.cos(P.hd);let target=null,closest=Infinity;
 for(const w of walls){
  if(!w.barbed||w.open||w.hp<=0||P.y+1.1<w.y0||P.y+1.1>w.y1)continue;
  const x=Math.max(w.x0,Math.min(w.x1,P.x)),z=Math.max(w.z0,Math.min(w.z1,P.z)),nx=x-P.x,nz=z-P.z,near=Math.hypot(nx,nz),facing=near>.08?(nx*fx+nz*fz)/near:((w.cx-P.x)*fx+(w.cz-P.z)*fz)/Math.max(.01,Math.hypot(w.cx-P.x,w.cz-P.z));
  if(near>reach||facing<.3)continue;if(near<closest){closest=near;target=w;}
 }return target;
}
