'use strict';
const assert=require('node:assert/strict');

(async()=>{
  const game=await require('./harness.cjs')();
  game.start('12345');game.frame();
  const result=game.run(`(()=>{
    const helis=V.filter(v=>v.t==='heli'||v.t==='heli_combat');
    const types=['heli','heli_combat'];
    const distinct=types.every(t=>helis.some(v=>v.t===t))&&
      helis.every((v,i)=>helis.slice(i+1).every(u=>
        Math.hypot(v.x-u.x,v.z-u.z)>=vehicleRadius(v.t)+vehicleRadius(u.t)+3));
    const checks=[];
    for(const type of types){
      const v=helis.find(v=>v.t===type),ground=Math.max(0,groundAt(v.x,v.z)),
            target=helicopterLandedAltitude(v,ground),oldAlt=v.alt,oldVz=v.verticalV,
            saved={x:P.x,y:P.y,z:P.z};
      let boards=false,lands=false,survives=false;
      try{
        P.x=v.x;P.z=v.z;P.y=v.o.position.y;
        boards=nearV()===v;
        v.alt=target+.45;v.verticalV=-6;
        survives=stepV(v,0,0,-1,.1)&&!v.destroyed;
        lands=Math.abs(v.alt-target)<1e-6&&v.verticalV===0&&
          Math.abs(v.alt+v.o.userData.skidContactHeight-ground-.1)<1e-6;
      }finally{
        P.x=saved.x;P.y=saved.y;P.z=saved.z;
        v.alt=oldAlt;v.verticalV=oldVz;place(v,0,0,0);
      }
      checks.push({type,boards,lands,survives});
    }
    const oldSwimming=swimming,oldCv=cv,oldPaused=paused,oldOver=over;
    let swimmingStrafe=false;
    try{
      cv=null;swimming=true;paused=false;over=0;
      swimmingStrafe=updateStrafeControls()&&document.body.classList.contains('strafe-active');
    }finally{cv=oldCv;swimming=oldSwimming;paused=oldPaused;over=oldOver;updateStrafeControls()}
    return {distinct,checks,swimmingStrafe};
  })()`);
  assert(result.distinct,'els helicòpters no poden sortir superposats');
  for(const c of result.checks){
    assert(c.boards,`${c.type}: es pot seleccionar per entrar-hi`);
    assert(c.survives,`${c.type}: aterra sense patir una col·lisió`);
    assert(c.lands,`${c.type}: patins a 10 cm i velocitat vertical zero`);
  }
  assert(result.swimmingStrafe,'els botons laterals continuen actius mentre es neda');
  console.log('OK: helicòpters separats, accessibles i estables en aterrar; controls laterals actius nedant');
})().catch(e=>{console.error(e);process.exitCode=1});
