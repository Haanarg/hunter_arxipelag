import {vehicleDynamics} from '../src/vehicle-dynamics-core.mjs';
import {vehicleSpecs} from '../src/vehicle-specs.mjs';
import {inventoryCaps} from '../src/weapon-catalog.mjs';
import {createStaticWorldAdapter} from '../src/world-adapter.mjs';
// Deterministic test range, separate from the relay/campaign's world generation.
export function configureProvingGround(generated){
 const {record,geometry}=generated,meta=record.meta;
 Object.assign(geometry,{levels:[{x:0,z:0,hw:170,hd:190,y:2,c:1,s:0,blend:20},{x:330,z:0,hw:160,hd:190,y:-15,c:1,s:0,blend:20}],walls:[{x0:-10,x1:10,z0:40,z1:40.2,y0:2,y1:5,cx:0,cz:40.1,barbed:true,hp:4}],trees:[],stairs:[],buildings:[],piers:[],terminalRamps:[]});
 const world=createStaticWorldAdapter(geometry);
 Object.assign(meta,{mode:'proving',floor:2,bounds:{x0:-165,x1:470,z0:-180,z1:180},doors:[],targets:[],supplies:[],routes:[[],[]],terminals:[{x:-140,y:2.06,z:150},{x:-120,y:2.06,z:150}],extraction:{x:0,y:2.06,z:140},timeLimitTicks:54000});
 meta.vehicles=Object.entries(vehicleDynamics.types).map(([t,profile],i)=>{
  const water=profile.m==='w',landIndex=Object.keys(vehicleDynamics.types).filter(k=>vehicleDynamics.types[k].m!=='w').indexOf(t),seaIndex=Object.keys(vehicleDynamics.types).filter(k=>vehicleDynamics.types[k].m==='w').indexOf(t),x=water?260+(seaIndex%2)*110:-110+(landIndex%5)*52,z=water?-110+Math.floor(seaIndex/2)*100:-110+Math.floor(landIndex/5)*65;
  return {id:'test-'+t,kind:t,t,x,z,y:water?0:world.heightAt(x,z)+.06,alt:water?0:world.heightAt(x,z)+.06,hd:0,v:0,life:profile.life,seats:Array(['bici','moto','windsurf','moto_aquatica'].includes(t)?1:2).fill(null),rockets:12,modelScale:1,hullRadius:vehicleSpecs.radii[t]*vehicleSpecs.scales[t]*.62};
 });
 meta.targets=Array.from({length:8},(_,i)=>({id:'range-'+i,t:'soldat',x:-130+i*35,y:2.06,z:120,hp:40,ai:false}));
 record.checkpoint.players.forEach((p,i)=>Object.assign(p,{x:i*4,y:2.06,z:0,hd:0,hp:20,swimming:false,fall:null}));
 record.inventories=meta.members.map(m=>({actorId:m.id,...inventoryCaps,weapon:'pistol',disguised:false}));
 return generated;
}
