// Proves aïllades per al contacte dels patins, sense dependències Playwright.
const assert=require('node:assert/strict');
(async()=>{
  const game=await require('./harness.cjs')();
  game.start('67');
  const {run}=game;
  const checks=run(`(()=>{
    const list=V.filter(v=>v.t==='heli'||v.t==='heli_combat');
    const allKinds=['heli','heli_combat'].every(t=>list.some(v=>v.t===t));
    const terrain=list.every(v=>{
      const ground=Math.max(0,hAt(v.x,v.z));
      const wanted=helicopterLandedAltitude(v,ground);
      place(v,0,0,0);
      return v.o.userData.skidContactHeight>.65&&
        Math.abs(v.alt-wanted)<1e-5&&
        Math.abs(v.o.position.y+v.o.userData.skidContactHeight-ground-.1)<1e-5;
    });
    const target=list.find(v=>v.t==='heli');
    const original={x:target.x,z:target.z,hd:target.hd,alt:target.alt,
      verticalV:target.verticalV,carrier:target.carrier};
    let landing=false,flying=false,ferry=false;
    try{
      const ground=Math.max(0,hAt(target.x,target.z));
      const parked=helicopterLandedAltitude(target,ground);
      target.alt=parked-3;target.verticalV=-10;
      stepV(target,0,0,-1,.05);
      landing=Math.abs(target.alt-parked)<1e-5;
      target.alt=parked+38;target.verticalV=0;
      place(target,0,0,0);
      flying=Math.abs(target.o.position.y-(parked+38))<1e-5;
      const carrier=V.find(v=>v.t==='ferry');
      if(carrier){
        const deck=carrier.o.position.y;
        target.x=carrier.x;target.z=carrier.z;target.hd=carrier.hd;
        attachToFerry(target,carrier);
        syncFerryCargo();place(target,0,.016,0);
        const surf=ferryLocalSurfaceY(carrier,target.carrierLZ||0);
        const gap=target.o.position.y+target.o.userData.skidContactHeight-surf;
        ferry=Math.abs(gap-.1)<1e-5&&Math.abs(target.alt-helicopterLandedAltitude(target,surf))<1e-5;
      }
    }finally{
      if(target.carrier)detachFromFerry(target);
      target.x=original.x;target.z=original.z;target.hd=original.hd;
      target.alt=original.alt;target.verticalV=original.verticalV;
      target.carrier=original.carrier;place(target,0,0,0);
    }
    return {allKinds,terrain,landing,flying,ferry};
  })()`);
  for(const [name,pass] of Object.entries(checks))assert(pass,name+' failed');
  console.log('Helicopter ground-contact checks passed:',JSON.stringify(checks));
})().catch(error=>{console.error(error);process.exitCode=1});
