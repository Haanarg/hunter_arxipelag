// Joystick tàctil analògic. Exposa eixos normalitzats sense conèixer la física del joc.
window.HUNTER_JOYSTICK=Object.freeze({
  create(root,{deadzone=.12}={}){
    const knob=root.querySelector('.joy-knob'),state={x:0,y:0,active:false,id:null};
    const reset=()=>{state.x=state.y=0;state.active=false;state.id=null;knob.style.transform='translate(-50%,-50%)'};
    const move=e=>{if(!state.active||e.pointerId!==state.id)return;const r=root.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.34;let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy);if(d>max){dx*=max/d;dy*=max/d}let x=dx/max,y=dy/max;const mag=Math.hypot(x,y);if(mag<deadzone)x=y=0;else if(mag>0){const scaled=(mag-deadzone)/(1-deadzone);x=x/mag*scaled;y=y/mag*scaled}state.x=x;state.y=y;knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`};
    root.addEventListener('pointerdown',e=>{e.preventDefault();state.active=true;state.id=e.pointerId;root.setPointerCapture(e.pointerId);move(e)});
    root.addEventListener('pointermove',move);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(type,e=>{if(state.id===null||e.pointerId===state.id)reset()});
    return {state,reset};
  }
});
