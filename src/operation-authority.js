window.HUNTER_AUTHORITY=Object.freeze({
  create({handlers,actor='local',now=()=>performance.now(),limit=1024}){
    let operation=null;const seen=new Map();
    function reset(id){operation=id;seen.clear();}
    function dispatch(command){
      if(!command||command.version!==1||command.actorId!==actor||command.operationId!==operation||
        typeof command.id!=='string'||command.id.length>160||!command.id.length||
        !Object.hasOwn(handlers,command.type))return {ok:false,reason:'command'};
      if(seen.has(command.id))return seen.get(command.id);
      const handler=handlers[command.type];
      if(!handler.validate(command.payload)||!handler.allowed())return {ok:false,reason:'state'};
      const result={ok:true,value:handler.execute(command.payload),at:now()};seen.set(command.id,result);
      while(seen.size>limit)seen.delete(seen.keys().next().value);
      return result;
    }
    return Object.freeze({reset,dispatch});
  }
});
