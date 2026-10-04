// Física i resposta dels vehicles. Separat de la geometria visual.
window.HUNTER_VEHICLE_DYNAMICS=Object.freeze({
  types:Object.freeze({
    llanxa:Object.freeze({n:'Llanxa',m:'w',a:30,dr:.8,tu:1.4,cd:30,ch:12,response:2.6,steerResponse:2.8,coast:.88}),
    hover:Object.freeze({n:'Hovercraft',m:'wl',a:28,dr:.7,tu:1.7,cd:28,ch:11,response:2.9,steerResponse:3.2,coast:.9}),
    cotxe:Object.freeze({n:'Cotxe',m:'l',a:36,dr:.9,tu:1.9,cd:22,ch:8,response:5.2,steerResponse:6.2,coast:1}),
    moto:Object.freeze({n:'Moto',m:'l',a:42,dr:.9,tu:2.5,cd:18,ch:7,response:6.4,steerResponse:7.2,coast:1}),
    bici:Object.freeze({n:'Bicicleta',m:'l',a:14,dr:.8,tu:2.6,cd:14,ch:6,response:7.2,steerResponse:8,coast:1}),
    camio:Object.freeze({n:'Camió militar',m:'l',a:24,dr:.92,tu:1.35,cd:27,ch:9,response:3.1,steerResponse:3.4,coast:.96}),
    tanc:Object.freeze({n:'Tanc',m:'l',a:16,dr:.9,tu:1.1,cd:26,ch:10,response:2.2,steerResponse:2.4,coast:1}),
    heli:Object.freeze({n:'Helicòpter',m:'a',a:30,dr:.5,tu:1.6,cd:34,ch:12,response:2.8,steerResponse:3.2,coast:.94})
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
