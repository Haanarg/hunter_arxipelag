// Rellotge semi-fix: passos petits i resta final, sense acumular cap deute.
// A 120 FPS conserva un pas de 1/120; a 10 FPS en fa sis de 1/60.
window.HUNTER_SIMULATION_CLOCK=Object.freeze({
  create({maxStep=1/60,maxFrame=.25,maxSteps=15}={}){
    if(!Number.isFinite(maxStep)||maxStep<=0||!Number.isFinite(maxFrame)||maxFrame<=0||
      !Number.isInteger(maxSteps)||maxSteps<1)throw new RangeError('Invalid simulation clock limits');
    const frameLimit=Math.min(maxFrame,maxStep*maxSteps),epsilon=1e-12,
      stats={frames:0,steps:0,rawSeconds:0,acceptedSeconds:0,simulatedSeconds:0,
        droppedSeconds:0,interruptedSeconds:0,idleSeconds:0,invalidFrames:0,last:null};
    let last=null,epoch=0;
    return {
      maxStep,maxSteps,maxFrame:frameLimit,stats,
      reset(now=null){last=Number.isFinite(now)&&now>=0?now:null;epoch++},
      advance(now,step,active=true){
        let rawDt=0,invalid=false;
        if(!Number.isFinite(now)||now<0||(last!==null&&now<last)){
          // Un timestamp invàlid no pot contaminar el següent fotograma.
          invalid=true;last=null;
        }else{if(last!==null)rawDt=(now-last)/1000;last=now}
        const acceptedDt=active?Math.min(rawDt,frameLimit):0,version=epoch;
        let remaining=acceptedDt,steps=0;
        while(remaining>epsilon&&steps<maxSteps){
          const dt=Math.min(maxStep,remaining);
          remaining=Math.max(0,remaining-dt);steps++;
          if(step(dt)===false||version!==epoch)break;
        }
        if(remaining<epsilon)remaining=0;
        const simulatedDt=acceptedDt-remaining,idleDt=active?0:rawDt,
          interruptedDt=remaining,droppedDt=active?rawDt-simulatedDt:0,
          frame={rawDt,acceptedDt,simulatedDt,droppedDt,interruptedDt,idleDt,steps,invalid,active:!!active};
        stats.frames++;stats.steps+=steps;stats.rawSeconds+=rawDt;
        stats.acceptedSeconds+=acceptedDt;stats.simulatedSeconds+=simulatedDt;
        stats.droppedSeconds+=droppedDt;stats.interruptedSeconds+=interruptedDt;
        stats.idleSeconds+=idleDt;if(invalid)stats.invalidFrames++;
        stats.last=frame;
        return frame;
      }
    };
  }
});
