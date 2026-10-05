// Física i resposta dels vehicles. Separat de la geometria visual.
// Els perfils comparteixen interfície, però terra, aigua i aire tenen inèrcies diferents.
window.HUNTER_VEHICLE_DYNAMICS=Object.freeze({
  types:Object.freeze({
    llanxa:Object.freeze({n:'Llanxa',m:'w',a:30,dr:.8,tu:1.4,cd:30,ch:12,response:2.6,steerResponse:2.8,yawResponse:2.4,maxF:30,maxR:9,waterDrift:.14,waterSteerMin:.22,armor:1,life:4}),
    moto_aquatica:Object.freeze({n:'Moto aquàtica',m:'w',a:46,dr:.68,tu:2.35,cd:20,ch:7,response:5.8,steerResponse:6.4,yawResponse:5.6,maxF:39,maxR:10,waterDrift:.24,waterSteerMin:.38,armor:0,life:2}),
    hover:Object.freeze({n:'Hovercraft',m:'wl',a:28,dr:.7,tu:1.7,cd:28,ch:11,response:2.9,steerResponse:3.2,yawResponse:2.8,maxF:31,maxR:10,waterDrift:.34,waterSteerMin:.5,landGrip:.48,armor:2,life:5}),
    cotxe:Object.freeze({n:'Cotxe',m:'l',a:36,dr:.9,tu:1.9,cd:22,ch:8,response:5.2,steerResponse:6.2,yawResponse:6.5,maxF:38,maxR:14,landGrip:.9,steerFade:.42,mass:1,armor:2,life:4}),
    moto:Object.freeze({n:'Moto',m:'l',a:42,dr:.9,tu:2.5,cd:18,ch:7,response:6.4,steerResponse:7.2,yawResponse:8,maxF:43,maxR:12,landGrip:.84,steerFade:.28,mass:.55,armor:0,life:2}),
    bici:Object.freeze({n:'Bicicleta',m:'l',a:14,dr:.8,tu:2.6,cd:14,ch:6,response:7.2,steerResponse:8,yawResponse:9,maxF:17,maxR:6,landGrip:.94,steerFade:.18,mass:.2,armor:0,life:1}),
    barca_rems:Object.freeze({n:'Barca de rems',m:'w',a:8,dr:.95,tu:1.6,cd:8,ch:4,response:3.4,steerResponse:4,yawResponse:3.2,maxF:8,maxR:4,waterDrift:.2,waterSteerMin:.18,armor:0,life:2}),
    windsurf:Object.freeze({n:'Windsurf',m:'w',a:18,dr:.75,tu:2.1,cd:16,ch:5,response:4.5,steerResponse:5.5,yawResponse:4.8,maxF:22,maxR:5,waterDrift:.42,waterSteerMin:.3,armor:0,life:1}),
    camio:Object.freeze({n:'Camió militar',m:'l',a:24,dr:.92,tu:1.35,cd:27,ch:9,response:3.1,steerResponse:3.4,yawResponse:3.2,maxF:29,maxR:10,landGrip:.82,steerFade:.5,mass:2.2,armor:4,life:6}),
    tanqueta:Object.freeze({n:'Tanqueta blindada',m:'l',a:20,dr:.92,tu:1.45,cd:25,ch:10,response:2.8,steerResponse:3.1,yawResponse:2.9,maxF:24,maxR:9,landGrip:.88,steerFade:.38,mass:3.2,armor:7,life:10}),
    llanxa_coets:Object.freeze({n:'Llanxa llançacoets',m:'w',a:27,dr:.82,tu:1.35,cd:31,ch:12,response:2.5,steerResponse:2.7,yawResponse:2.2,maxF:29,maxR:8,waterDrift:.11,waterSteerMin:.2,armor:3,life:7}),
    tanc:Object.freeze({n:'Tanc',m:'l',a:16,dr:.9,tu:1.1,cd:26,ch:10,response:2.2,steerResponse:2.4,yawResponse:2.4,maxF:21,maxR:8,landGrip:.96,steerFade:.3,mass:5,armor:10,life:18}),
    heli:Object.freeze({n:'Helicòpter',m:'a',a:30,dr:.5,tu:1.6,cd:34,ch:12,response:2.8,steerResponse:3.2,yawResponse:2.3,maxF:38,maxR:15,climb:24,liftResponse:2.8,bank:.34,pitch:.22,mass:2.5,armor:4,life:8}),
    heli_combat:Object.freeze({n:'Helicòpter de combat',m:'a',a:36,dr:.48,tu:2,cd:36,ch:13,response:4.2,steerResponse:5,yawResponse:4,maxF:45,maxR:18,climb:28,liftResponse:3.8,bank:.42,pitch:.28,mass:2.8,armor:6,life:12})
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
