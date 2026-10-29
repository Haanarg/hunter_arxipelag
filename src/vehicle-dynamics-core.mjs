import {combatBalance} from './combat-rules.mjs';
// Física i resposta dels vehicles. Separat de la geometria visual.
// Els perfils comparteixen interfície, però terra, aigua i aire tenen inèrcies diferents.
export const vehicleDynamics=Object.freeze({
  types:Object.freeze({
    llanxa:Object.freeze({n:'Llanxa',m:'w',a:35,dr:.8,tu:1.4,cd:30,ch:12,response:2.6,steerResponse:2.8,yawResponse:2.4,maxF:35,maxR:9,waterDrift:.14,waterSteerMin:.22,life:combatBalance.vehicles.llanxa}),
    moto_aquatica:Object.freeze({n:'Moto aquàtica',m:'w',a:46,dr:.68,tu:2.35,cd:20,ch:7,response:5.8,steerResponse:6.4,yawResponse:5.6,maxF:39,maxR:10,waterDrift:.24,waterSteerMin:.38,life:combatBalance.vehicles.moto_aquatica}),
    hover:Object.freeze({n:'Hovercraft',m:'wl',a:28,dr:.7,tu:1.7,cd:28,ch:11,response:2.9,steerResponse:3.2,yawResponse:2.8,maxF:31,maxR:10,waterDrift:.34,waterSteerMin:.5,landGrip:.48,life:combatBalance.vehicles.hover}),
    ferry:Object.freeze({n:'Ferry',m:'w',a:22,dr:.82,tu:.58,cd:48,ch:22,response:1.35,steerResponse:1.6,yawResponse:1.25,maxF:22,maxR:6,waterDrift:.035,waterSteerMin:.12,mass:10,life:combatBalance.vehicles.ferry}),
    cotxe:Object.freeze({n:'Cotxe',m:'l',a:36,dr:.9,tu:1.9,cd:22,ch:8,response:5.2,steerResponse:6.2,yawResponse:6.5,maxF:38,maxR:14,landGrip:.9,steerFade:.42,mass:1,life:combatBalance.vehicles.cotxe}),
    cotxe_civil:Object.freeze({n:'Cotxe civil',m:'l',a:23,dr:.91,tu:1.55,cd:20,ch:8,response:3.8,steerResponse:4.8,yawResponse:4.3,maxF:26,maxR:8,landGrip:.79,steerFade:.52,mass:.93,life:combatBalance.vehicles.cotxe_civil}),
    moto:Object.freeze({n:'Moto',m:'l',a:42,dr:.9,tu:2.5,cd:18,ch:7,response:6.4,steerResponse:7.2,yawResponse:8,maxF:43,maxR:12,landGrip:.84,steerFade:.28,mass:.55,life:combatBalance.vehicles.moto}),
    bici:Object.freeze({n:'Bicicleta',m:'l',a:14,dr:.8,tu:2.6,cd:14,ch:6,response:7.2,steerResponse:8,yawResponse:9,maxF:17,maxR:6,landGrip:.94,steerFade:.18,mass:.2,life:combatBalance.vehicles.bici}),
    barca_rems:Object.freeze({n:'Barca de rems',m:'w',a:20,dr:.82,tu:1.6,cd:25,ch:10,response:3.4,steerResponse:4,yawResponse:3.2,maxF:17,maxR:5,waterDrift:.2,waterSteerMin:.18,life:combatBalance.vehicles.barca_rems}),
    windsurf:Object.freeze({n:'Windsurf',m:'w',a:18,dr:.75,tu:2.1,cd:16,ch:5,response:4.5,steerResponse:5.5,yawResponse:4.8,maxF:22,maxR:5,waterDrift:.42,waterSteerMin:.3,life:combatBalance.vehicles.windsurf}),
    camio:Object.freeze({n:'Camió militar',m:'l',a:24,dr:.92,tu:1.35,cd:27,ch:9,response:3.1,steerResponse:3.4,yawResponse:3.2,maxF:29,maxR:10,landGrip:.82,steerFade:.5,mass:2.2,life:combatBalance.vehicles.camio}),
    tanqueta:Object.freeze({n:'Tanqueta',m:'l',a:20,dr:.92,tu:1.45,cd:25,ch:10,response:2.8,steerResponse:3.1,yawResponse:2.9,maxF:24,maxR:9,landGrip:.88,steerFade:.38,mass:3.2,life:combatBalance.vehicles.tanqueta}),
    llanxa_coets:Object.freeze({n:'Llanxa llançacoets',m:'w',a:27,dr:.82,tu:1.35,cd:31,ch:12,response:2.5,steerResponse:2.7,yawResponse:2.2,maxF:29,maxR:8,waterDrift:.11,waterSteerMin:.2,life:combatBalance.vehicles.llanxa_coets}),
    tanc:Object.freeze({n:'Tanc',m:'l',a:16,dr:.9,tu:1.1,cd:26,ch:10,response:2.2,steerResponse:2.4,yawResponse:2.4,maxF:21,maxR:8,landGrip:.96,steerFade:.3,mass:5,life:combatBalance.vehicles.tanc}),
    heli:Object.freeze({n:'Helicòpter',m:'a',a:38,dr:.5,tu:1.6,cd:34,ch:12,response:2.8,steerResponse:3.2,yawResponse:2.3,maxF:50,maxR:17,strafeMax:17,climb:24,liftResponse:2.8,bank:.34,pitch:.22,mass:2.5,life:combatBalance.vehicles.heli}),
    heli_combat:Object.freeze({n:'Helicòpter de combat',m:'a',a:47,dr:.48,tu:2.25,cd:36,ch:13,response:5,steerResponse:6,yawResponse:5.1,maxF:60,maxR:21,strafeMax:24,climb:30,liftResponse:4.3,bank:.45,pitch:.29,mass:2.8,life:combatBalance.vehicles.heli_combat})
  }),
  // Shore contact uses actual water height and the vehicle's hull footprint.
  // No shoreline teleportation or universal -1.2 m collision cutoff.
  shore:Object.freeze({
    land:Object.freeze({
      bici:{wade:.1,stall:.65,delay:.1,sinkRate:2.5},
      moto:{wade:.25,stall:1.0,delay:.35,sinkRate:1.8},
      cotxe:{wade:.4,stall:1.65,delay:1.25,sinkRate:1.1},
      cotxe_civil:{wade:.4,stall:1.55,delay:1.1,sinkRate:1.2},
      camio:{wade:.8,stall:2.35,delay:.75,sinkRate:1.4},
      tanqueta:{wade:1.2,stall:2.9,delay:.4,sinkRate:1.3},
      tanc:{wade:1.4,stall:3.4,delay:.35,sinkRate:1.1}
    }),
    draft:Object.freeze({windsurf:.12,barca_rems:.4,moto_aquatica:.26,llanxa:1.05,llanxa_coets:1.2,ferry:2.15}),
    beachLimit:Object.freeze({windsurf:-.4,barca_rems:.05,moto_aquatica:-.65,llanxa:.08,llanxa_coets:.1,ferry:.25}),
    depth(x,z,terrainAt,waterAt){return waterAt(x,z)-terrainAt(x,z)},
    clearance(v,x,z,box,terrainAt,waterAt){
      // A hull grounds at the bow or flank before its centre reaches land.
      // Use smaller extremities for ferry ramps, so terminal docking remains possible.
      const s=Math.sin(v.hd||0),c=Math.cos(v.hd||0),front=Math.min(box.d*.38,box.d/2-0.1),
        side=Math.min(box.w*.31,box.w/2-.05),sample=[[0,0],[0,-front],[0,front*.75],[-side,0],[side,0]];
      let min=Infinity;
      for(const [lx,lz] of sample){
        const px=x+lx*c+lz*s,pz=z-lx*s+lz*c;
        min=Math.min(min,this.depth(px,pz,terrainAt,waterAt));
      }
      return min;
    },
    wetLand(v,depth,dt){
      const p=this.land[v.t],state=v.waterIngress||(v.waterIngress={dead:false,elapsed:0,sink:0,buoyancy:0});
      if(!p)return {engine:1,drag:0,wet:0,disabled:false};
      const wet=Math.max(0,Math.min(1,(depth-p.wade)/(p.stall-p.wade)));
      if(depth>=p.stall)state.dead=true;
      if(state.dead){
        state.elapsed+=Math.max(0,dt);
        state.sink=Math.max(0,(state.elapsed-p.delay)*p.sinkRate);
      }else{
        state.elapsed=0;
        state.buoyancy=Math.max(0,state.buoyancy-Math.max(0,dt)*.85);
      }
      if(depth>p.wade){
        state.buoyancy=Math.min(1,state.buoyancy+Math.max(0,dt)*.75);
      }
      if(state.dead&&state.elapsed>=p.delay+3.5)v.sunk=true;
      return {engine:state.dead?0:1-wet*.84,
        drag:state.dead?1.4:wet*(.8+wet*.6),
        wet,disabled:state.dead};
    },
    boatContact(v,previous,next,dt){
      const draft=this.draft[v.t]??.8,limit=this.beachLimit[v.t]??.05,
        shallow=Math.max(0,Math.min(1,(draft-next)/Math.max(.3,draft-limit)));
      const approaching=next<previous-.0005,
        blocked=next<limit&&approaching,
        grounded=next<draft;
      v.grounded=grounded;
      return {draft,limit,shallow,grounded,blocked,
        drag:shallow*(v.t==='moto_aquatica'?3.2:v.t==='windsurf'?2.5:2.1),
        power:1-shallow*.93};
    }
  }),
  smooth(current,target,response,dt){return current+(target-current)*(1-Math.exp(-response*dt))},
  inputs(v,forward,turn,dt){
    const c=this.types[v.t];
    v.driveInput=this.smooth(v.driveInput||0,forward,c.response,dt);
    v.steerInput=this.smooth(v.steerInput||0,turn,c.steerResponse,dt);
    if(Math.abs(forward)<.015&&Math.abs(v.driveInput)<.015)v.driveInput=0;
    if(Math.abs(turn)<.015&&Math.abs(v.steerInput)<.015)v.steerInput=0;
    return {forward:v.driveInput,turn:v.steerInput};
  }
});

// Horizontal dynamics extracted from stepV; world contacts stay in its adapter.
export function advanceVehicle(v,f,tr,dt,strafe=0,{drag=0}={}){
const c=vehicleDynamics.types[v.t],a=c.m==='a',water=c.m==='w'||c.m==='wl',land=c.m==='l',flooded={drag};
const maxStrafe=v.t==='hover'?12:(a?(c.strafeMax||17):0),
      targetStrafe=maxStrafe*Math.max(-1,Math.min(1,strafe));
v.strafeV=vehicleDynamics.smooth(v.strafeV||0,targetStrafe,6.5,dt);
if(Math.abs(targetStrafe)<.01&&Math.abs(v.strafeV)<.02)v.strafeV=0;
v.v+=f*c.a*dt;
const dragBase=c.dr*(water?1.08:land?.86:1),coastBoost=Math.abs(f)<.03?(water?1.18:land?1.04:.82):1;
v.v*=Math.max(0,1-dragBase*coastBoost*dt);
if(land&&flooded.drag>0)v.v*=Math.exp(-flooded.drag*dt);
v.v=Math.max(-(c.maxR||12),Math.min(c.maxF||40,v.v));

let steerScale=1;
if(land){const speed=Math.abs(v.v),fade=c.steerFade??.4;steerScale=(.35+.65*Math.min(1,speed/9))*(1-fade*Math.min(1,speed/(c.maxF||35))*.55)}
else if(water){const speed=Math.abs(v.v),min=c.waterSteerMin??.2;steerScale=min+(1-min)*Math.min(1,speed/10)}
const targetYaw=tr*c.tu*steerScale*(a?1:(v.v<0?-1:1));
v.yawRate=vehicleDynamics.smooth(v.yawRate||0,targetYaw,c.yawResponse||4,dt);
v.hd+=v.yawRate*dt;

let sideV=0;
if(water){
  const drift=(c.waterDrift||0)*v.v*v.yawRate;
  v.sideV=vehicleDynamics.smooth(v.sideV||0,drift,2.2,dt);
  sideV=v.sideV;
}else if(land){
  const grip=c.landGrip??.9,slip=(1-grip)*v.v*v.yawRate*.42;
  v.sideV=vehicleDynamics.smooth(v.sideV||0,slip,5+grip*5,dt);
  sideV=v.sideV;
}else v.sideV=vehicleDynamics.smooth(v.sideV||0,0,4,dt);

return sideV;
}

// Original helicopter lift integration; terrain/roof contacts remain adapters.
export function stepHelicopterLift(v,ud,dt,landedAltitude){
 const c=vehicleDynamics.types[v.t],targetVz=ud*(c.climb||24);
 v.verticalV=vehicleDynamics.smooth(v.verticalV||0,targetVz,c.liftResponse||2.5,dt);
 if(Math.abs(ud)<.01)v.verticalV*=Math.exp(-1.5*dt);
 const previousAlt=v.alt;
 v.alt=Math.max(landedAltitude,Math.min(150,v.alt+v.verticalV*dt));
 return previousAlt;
}
