const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..'),ctx=vm.createContext({window:{},Math});
 vm.runInContext(fs.readFileSync(path.join(root,'src/vehicle-dynamics.js'),'utf8'),ctx);
 const vd=ctx.window.HUNTER_VEHICLE_DYNAMICS,cfg=vd.types;
 assert.equal(cfg.heli.maxF,50);
 assert.equal(cfg.heli_combat.maxF,60);
 assert.equal(cfg.heli_combat.strafeMax,24);
 assert(cfg.heli_combat.tu>2&&cfg.heli_combat.yawResponse>4&&cfg.heli_combat.steerResponse>5);
 assert(cfg.heli.a>30&&cfg.heli_combat.a>36);
 function simulate(type){
   const c=cfg[type],v={t:type,v:0,hd:0,yawRate:0,driveInput:0,steerInput:0};
   for(let k=0;k<480;k++){
     const input=vd.inputs(v,1,0,1/60);
     v.v=Math.max(-c.maxR,Math.min(c.maxF,(v.v+input.forward*c.a/60)*(1-c.dr/60)));
   }
   const speed=v.v;v.steerInput=0;v.yawRate=0;
   for(let k=0;k<60;k++){
     const input=vd.inputs(v,0,1,1/60);
     v.yawRate=vd.smooth(v.yawRate,input.turn*c.tu,c.yawResponse,1/60);
     v.hd+=v.yawRate/60;
   }
   return{speed,turn:v.hd};
 }
 const normal=simulate('heli'),combat=simulate('heli_combat');
 assert(Math.abs(normal.speed-50)<.01&&Math.abs(combat.speed-60)<.01);
 assert(combat.turn>normal.turn*1.25,'combat helicopter turn responds more quickly');
 const game=await require('./harness.cjs')();game.start('67');
 const checks=game.run("(()=>{\n   const result={};\n   for(const type of ['heli','heli_combat']){\n     const v=V.find(v=>v.t===type);\n     if(!v){result[type]={found:false};continue}\n     const old={x:v.x,z:v.z,alt:v.alt,hd:v.hd,v:v.v,\n       carrier:v.carrier,verticalV:v.verticalV,yawRate:v.yawRate,\n       driveInput:v.driveInput,steerInput:v.steerInput,sideV:v.sideV,strafeV:v.strafeV};\n     if(v.carrier)detachFromFerry(v);\n     Object.assign(v,{x:0,z:0,alt:110,hd:0,v:0,verticalV:0,driveInput:0,steerInput:0,sideV:0,strafeV:0,yawRate:0});\n     let speed=0;\n     for(let k=0;k<420;k++){stepV(v,1,0,0,1/60);speed=Math.max(speed,v.v)}\n     const achieved=Math.abs(speed-VT[type].maxF)<.1&&speed<=VT[type].maxF+.0001;\n     v.v=0;v.driveInput=0;v.steerInput=0;v.strafeV=0;v.yawRate=0;\n     let side=0;\n     for(let k=0;k<90;k++){stepV(v,0,1,0,1/60,1);side=Math.max(side,v.strafeV)}\n     const strafe=side>VT[type].strafeMax*.9&&side<=VT[type].strafeMax+.01;\n     const yaw=v.yawRate>0&&v.yawRate<=VT[type].tu+.01;\n     const altitude=Math.abs(v.alt-110)<1;\n     result[type]={found:true,achieved,strafe,yaw,altitude,speed,side};\n     if(v.carrier)detachFromFerry(v);\n     Object.assign(v,old);place(v,0,0,0);\n   }\n   return result;\n })()");
 for(const [type,data] of Object.entries(checks)){
   for(const label of ['found','achieved','strafe','yaw','altitude'])
     assert(data[label],type+' '+label+' '+JSON.stringify(data));
 }
 console.log('PASS: helicopter speed and agility at 60 FPS',JSON.stringify({normal,combat,checks}));
})().catch(error=>{console.error(error);process.exitCode=1});
