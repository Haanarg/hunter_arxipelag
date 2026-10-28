import {validateSnapshot,newOperationId} from './operation-save.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
export function createCloudflareRemote(accounts){
  async function owner(){const user=await accounts.verifiedUser();if(!user)throw new Error('Inicia sessió per sincronitzar.');return user.id;}
  async function call(user,path,options={}){
    if(await owner()!==user)throw new Error('El compte ha canviat.');
    return accounts.request(path,{...options,headers:{...options.headers,'X-Hunter-User':user}});
  }
  async function list(path){const user=await owner(),rows=[];for(let offset=0;offset<=1000000;offset+=200){
    const page=await call(user,path+'?offset='+offset);rows.push(...page);if(page.length<200)return rows;
  }throw new Error('L’historial és massa gran per carregar-lo d’un cop.');}
  return Object.freeze({owner,list:()=>list('saves'),
    read:(user,id)=>call(user,'saves/'+encodeURIComponent(id)),
    async write(user,id,revision,snapshot){return (await call(user,'saves/'+encodeURIComponent(id),{method:'PUT',headers:{'X-Hunter-Revision':String(revision)},data:snapshot})).revision;},
    delete:(user,id,revision)=>call(user,'saves/'+encodeURIComponent(id),{method:'DELETE',headers:{'X-Hunter-Revision':String(revision)}}),
    listHistory:()=>list('history'),
    writeHistory:(user,row)=>call(user,'history/'+encodeURIComponent(row.runId),{method:'PUT',data:row})
  });
}
export function createCloudSync({accounts,remote,local,storage=globalThis.localStorage,validate=validateSnapshot,onStatus=()=>{}}){
  const busy=new Map(),blocked=new Set();
  const key=(user,id)=>'hunter.cloud.link.'+user+'.'+id;
  const readLink=(user,id)=>{const value=storage.getItem(key(user,id));return value?JSON.parse(value):null;};
  const saveLink=(user,id,value)=>storage.setItem(key(user,id),JSON.stringify(value));
  async function push(id,{asNew=false}={}){
    const user=await remote.owner(),lock=user+':'+id;
    if(busy.has(lock)){if(!asNew)return busy.get(lock);await busy.get(lock).catch(()=>{});return push(id,{asNew:true});}
    const task=(async()=>{
      const snapshot=await local.load(id);if(!snapshot)throw new Error('La còpia local ja no existeix.');validate(snapshot);
      const link=asNew?null:readLink(user,id),cloudId=asNew?newOperationId():link?.cloudId||id,
        payload=clone(snapshot);payload.operationId=cloudId;
      if(!link)saveLink(user,id,{cloudId,cloudRevision:0,localRevision:0});
      try{
        const result=await remote.write(user,cloudId,link?.cloudRevision||0,payload),revision=Number(result);
        if(!Number.isSafeInteger(revision)||revision<1)throw new Error('Resposta de sincronització invàlida.');
        saveLink(user,id,{cloudId,cloudRevision:revision,localRevision:snapshot.revision});blocked.delete(lock);
        onStatus('Partida sincronitzada.');return revision;
      }catch(error){if(error.code==='CONFLICT')blocked.add(lock);onStatus(error.code==='CONFLICT'?
        'Hi ha dues versions. Conserva la local com a nova o baixa la del núvol.':'Sense sincronitzar: la còpia local es conserva.');throw error;}
    })();busy.set(lock,task);try{return await task;}finally{busy.delete(lock);}
  }
  async function pull(id){
    const user=await remote.owner(),row=await remote.read(user,id);validate(row.snapshot);
    const snapshot=clone(row.snapshot),now=Date.now();snapshot.operationId=newOperationId();snapshot.revision=0;
    snapshot.createdAt=snapshot.updatedAt=now;snapshot.name=(snapshot.name+' (núvol)').slice(0,100);
    const saved=await local.save(snapshot,{expectedRevision:0});
    saveLink(user,saved.operationId,{cloudId:id,cloudRevision:Number(row.revision),localRevision:saved.revision});return saved;
  }
  async function enqueue(snapshot){
    if(!accounts.status().user)return;
    const user=await remote.owner(),link=readLink(user,snapshot.operationId),lock=user+':'+snapshot.operationId;
    if(!link||blocked.has(lock)||link.localRevision>=snapshot.revision)return;
    await push(snapshot.operationId);
  }
  async function retry(){
    if(!accounts.status().user)return;
    const user=await remote.owner();
    for(const row of await local.list()){
      const link=readLink(user,row.operationId);
      if(link&&row.revision>link.localRevision&&!blocked.has(user+':'+row.operationId))await push(row.operationId);
    }
  }
  return Object.freeze({push,pull,enqueue,retry,list:()=>remote.list(),
    async syncHistory(journal){
      const user=await remote.owner();
      const rows=await remote.listHistory();
      for(const row of rows)await journal.record(row.record);
      for(const row of await journal.list()){
        if(await remote.owner()!==user)throw new Error('El compte ha canviat.');
        await remote.writeHistory(user,row);
      }
    },
    async remove(id,revision){const user=await remote.owner();return remote.delete(user,id,revision);}});
}
