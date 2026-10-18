// Salts breus sobre ones per a motos aquàtiques i windsurf.
 // Física relativa a la superfície ja mostrejada al render: sense
 // tocar la navegació, el control ni el nivell de flotació dels altres bucs.
window.HUNTER_WATER_JUMPS=Object.freeze({
  update(v,dt,time,waterAt,maxSpeed){
    if(v.t!=='moto_aquatica'&&v.t!=='windsurf')return {lift:0,pitch:0};
    const jet=v.t==='moto_aquatica',
          minSpeed=jet?18:12,
          configRise=jet?.14:.095,
          span=jet?4.8:3.8,
          state=v.waveJump||(v.waveJump={lift:0,vy:0,cooldown:0,airborne:false,jumps:0});
    if(dt<=0)return {lift:state.lift,pitch:0};
    const step=Math.min(dt,.08);
    state.cooldown=Math.max(0,state.cooldown-step);
    if(!state.airborne&&v.v>minSpeed&&state.cooldown<=0){
      const fx=-Math.sin(v.hd),fz=-Math.cos(v.hd),
            ahead=waterAt(v.x+fx*span,v.z+fz*span,time),
            behind=waterAt(v.x-fx*span,v.z-fz*span,time),
            rise=ahead-behind;
      // És el pendent de l'ona frontal (no una oscil·lació aleatòria):
      // només es pot enlairar quan la proa puja prou de pressa.
      if(rise>configRise){
        const speed=Math.min(1,Math.max(0,v.v/(maxSpeed||30)));
        state.airborne=true;
        state.vy=(jet?2.55:1.95)+speed*(jet?1.12:.76)+Math.min(.9,rise*.5);
        state.lift=.01;
        state.jumps++;
      }
    }
    if(state.airborne){
      const next=state.lift+state.vy*step-4.9*step*step;
      state.vy-=9.8*step;
      if(next<=0){
        state.airborne=false;state.lift=0;state.vy=0;
        state.cooldown=jet?.9:1.15;
      }else state.lift=Math.min(jet?2.4:1.25,next);
    }
    const pitch=state.airborne
      ?Math.max(-.14,Math.min(.19,state.vy*.045))
      :0;
    return {lift:state.lift,pitch};
  }
});
