// Joystick tàctil analògic amb una prolongació superior integrada per córrer.
window.HUNTER_JOYSTICK=Object.freeze({
  create(root,{deadzone=.1,response=1.15,maxTravel=.36}={}){
    const knob=root.querySelector('.joy-knob'),
          state={x:0,y:0,active:false,id:null,running:false};
    let runEnabled=false,lastPointer=null;
    const reset=()=>{
      state.x=state.y=0;state.active=false;state.id=null;state.running=false;
      lastPointer=null;root.classList.remove('running');
      knob.style.transform='translate(-50%,-50%)';
    };
    const move=e=>{
      if(!state.active||e.pointerId!==state.id)return;
      lastPointer={pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY};
      const r=root.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,
            max=r.width*maxTravel,rawX=e.clientX-cx,rawY=e.clientY-cy;
      // Només es corre cap endavant, en arrossegar dins la prolongació
      // situada FORA del perímetre superior del cercle del joystick.
      const running=runEnabled&&rawY< -r.height/2&&Math.abs(rawX)<=r.width*.29;
      state.running=running;root.classList.toggle('running',running);
      if(running){
        state.x=Math.max(-1,Math.min(1,rawX/max))*.72;
        state.y=-1;
        // El pom puja visualment a la zona de cursa però continua
        // pertanyent al mateix joystick i al mateix pointer capturat.
        const knobX=Math.max(-12,Math.min(12,rawX*.25));
        knob.style.transform=`translate(calc(-50% + ${knobX}px),calc(-50% - ${r.height*.67}px))`;
        return;
      }
      let dx=rawX,dy=rawY;
      const distance=Math.hypot(dx,dy);
      if(distance>max){dx*=max/distance;dy*=max/distance}
      let x=dx/max,y=dy/max;
      const mag=Math.hypot(x,y);
      if(mag<deadzone)x=y=0;
      else if(mag>0){
        const scaled=Math.pow((mag-deadzone)/(1-deadzone),response);
        x=x/mag*scaled;y=y/mag*scaled;
      }
      state.x=x;state.y=y;
      knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
    };
    const setRunEnabled=enabled=>{
      const next=!!enabled;
      if(runEnabled===next)return;
      runEnabled=next;root.classList.toggle('run-enabled',next);
      if(state.active&&lastPointer)move(lastPointer);
      else state.running=false;
    };
    root.addEventListener('pointerdown',e=>{
      if(state.active)return;
      e.preventDefault();state.active=true;state.id=e.pointerId;
      root.setPointerCapture(e.pointerId);move(e);
    });
    root.addEventListener('pointermove',move);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])
      root.addEventListener(type,e=>{if(state.active&&e.pointerId===state.id)reset()});
    return {state,reset,setRunEnabled};
  }
});
