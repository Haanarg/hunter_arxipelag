// Avantatges cooperatius compartits i validats pel servidor.
// L'amfitrió és l'únic que pot canviar-los; els dos jugadors els reben
// dins del mateix snapshot. Sense propietats addicionals de privilegi.
export const COOP_CHEAT_KEYS=Object.freeze(['items','invisible','immune','fly']);
export function normalizeCoopCheats(value){
 return Object.fromEntries(COOP_CHEAT_KEYS.map(key=>[key,value?.[key]===true]));
}
export function grantCoopCheatItems(bag,vehicles=[]){
 if(!bag)return;
 // Mantenir el nombre per davall de la capacitat de pickups
 // del mode natiu (1.000.000), incloses les municions de vehicles.
 for(const key of ['bullets','grenades','medkits','disguise','assault',
  'sniper','sniperAmmo','bazooka','c4','cutters','parachute'])
  bag[key]=Math.max(9999,Number.isFinite(bag[key])?bag[key]:0);
 for(const vehicle of vehicles)
  if(vehicle&&Number.isFinite(vehicle.rockets))
   vehicle.rockets=Math.max(9999,vehicle.rockets);
}
export function moveCoopCheatFly(actor,input,{
 limit,heightAt,dt=1/30,speed=65
}={}){
 const heading=actor.hd+(input.turn||0)*dt*2.2,
   f=Math.max(-1,Math.min(1,input.forward||0)),
   strafe=Math.max(-1,Math.min(1,input.strafe||0)),
   climb=Math.max(-1,Math.min(1,input.climb||0)),
   length=Math.max(1,Math.hypot(f,strafe)),
   clamp=(v,min,max)=>Math.max(min,Math.min(max,v)),
   x=clamp(actor.x+(-Math.sin(heading)*f+Math.cos(heading)*strafe)*speed*dt/length,-limit,limit),
   z=clamp(actor.z+(-Math.cos(heading)*f-Math.sin(heading)*strafe)*speed*dt/length,-limit,limit),
   floor=heightAt(x,z);
 return {x,y:clamp(actor.y+climb*speed*dt,Math.max(1,floor+1),500),
   z,hd:heading,hp:actor.hp,fall:null,swimming:false};
}
