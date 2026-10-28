// Coordinator only: the runtime adapter owns capture, storage and world identity.
window.HUNTER_AUTOSAVE=Object.freeze({
  create({time,eligible,capture,write,status=()=>{},now=()=>performance.now(),interval=60,debounceMs=3000,minGapMs=10000,retryMs=30000}){
    let enabled=true,pending=false,due=0,savedTime=null,lastWrite=-Infinity,retryAt=0,
      blocked=false,writing=null,epoch=0,reason='initial',message='Encara sense desament automàtic.';
    const publish=text=>{message=text;status(text)};
    function markSaved(value){
      savedTime=value;pending=false;blocked=false;retryAt=0;lastWrite=now();
      publish('Operació desada.');
    }
    function reset({saved=null}={}){
      epoch++;savedTime=saved;pending=saved===null;due=now();lastWrite=-Infinity;retryAt=0;blocked=false;
      reason='initial';publish(saved===null?'Desament automàtic preparat.':'Operació recuperada; desament automàtic preparat.');
    }
    function setEnabled(value){enabled=!!value;publish(enabled?'Desament automàtic activat.':'Desament automàtic desactivat.');}
    function request(why='checkpoint',{urgent=false}={}){
      if(!enabled||blocked)return writing;
      // Background events alone must not replace a backup with an identical paused state.
      if(why==='background'&&!pending&&savedTime!==null&&time()<=savedTime+.001)return writing;
      if(!pending)due=now()+debounceMs;
      pending=true;reason=why;
      if(urgent){due=now();return flush(true);}
      return writing;
    }
    function flush(urgent=false){
      if(writing)return writing;
      if(!enabled||blocked||!pending||now()<retryAt||now()<due||!eligible()||
        !urgent&&now()-lastWrite<minGapMs)return null;
      const token=epoch;let snapshot;
      try{snapshot=capture(reason);}catch(error){
        retryAt=now()+retryMs;publish('No s’ha pogut preparar el desament automàtic: '+error.message);return null;
      }
      pending=false;publish('Desant automàticament…');
      // Capture is synchronous, before the first await: pagehide/visibilitychange can start immediately.
      let task;try{task=Promise.resolve(write(snapshot));}catch(error){task=Promise.reject(error);}writing=task;
      task.then(saved=>{
        if(token!==epoch)return;
        savedTime=snapshot.world.time;lastWrite=now();retryAt=0;
        publish('Desament automàtic completat.');
      },error=>{
        if(token!==epoch)return;
        pending=true;retryAt=now()+retryMs;blocked=error?.code==='CONFLICT';
        publish(blocked?'Una altra pestanya ha modificat la partida. Carrega-la o desa com a nova.':
          'No s’ha pogut desar automàticament. Es conserva la còpia anterior.');
      }).finally(()=>{if(writing===task)writing=null;});
      // The coordinator reports failures through status; callers do not create unhandled rejections.
      task.catch(()=>{});return task;
    }
    function tick(){
      if(enabled&&savedTime!==null&&time()-savedTime>=interval&&!pending){request('periodic');due=now();}
      return flush();
    }
    return Object.freeze({reset,markSaved,setEnabled,request,tick,
      suspend(){epoch++;pending=false;blocked=true;publish('Desament automàtic aturat: torna a desar aquesta operació per reactivar-lo.');},
      state:()=>({enabled,pending,blocked,writing:!!writing,savedTime,message})});
  }
});
