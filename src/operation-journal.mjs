export const JOURNAL_METRICS=Object.freeze(['kills','shots','damageTaken','pickups','rescues','sabotages']);
export function validateRun(row){
  if(!row||row.format!==1||typeof row.runId!=='string'||!/^[a-zA-Z0-9:_-]{1,160}$/.test(row.runId)||
    !Number.isInteger(row.seed)||row.seed<0||row.seed>0xffffffff||![1,2].includes(row.mapScale)||
    typeof row.generatorVersion!=='string'||!Number.isFinite(row.seconds)||row.seconds<0||
    !Number.isFinite(row.startedAt)||!Number.isFinite(row.lastPlayedAt)||
    !['active','victory','death'].includes(row.outcome)||!row.metrics||
    JOURNAL_METRICS.some(key=>!Number.isFinite(row.metrics[key])||row.metrics[key]<0)||
    !Array.isArray(row.vehicles)||row.vehicles.some(id=>typeof id!=='string'||id.length>160))throw new Error('Registre de partida invàlid.');
  return row;
}
export function mergeRun(before,after){
  validateRun(after);if(!before)return structuredClone(after);validateRun(before);
  if(before.runId!==after.runId||before.seed!==after.seed||before.mapScale!==after.mapScale||before.generatorVersion!==after.generatorVersion)
    throw new Error('La identitat del registre no coincideix.');
  return {...after,startedAt:Math.min(before.startedAt,after.startedAt),lastPlayedAt:Math.max(before.lastPlayedAt,after.lastPlayedAt),
    seconds:Math.max(before.seconds,after.seconds),outcome:[before.outcome,after.outcome].includes('victory')?'victory':[before.outcome,after.outcome].includes('death')?'death':'active',
    metrics:Object.fromEntries(JOURNAL_METRICS.map(key=>[key,Math.max(before.metrics[key],after.metrics[key])])),
    vehicles:[...new Set([...before.vehicles,...after.vehicles])]};
}
export function summarizeRuns(rows){
  const totals={operations:rows.length,victories:0,deaths:0,seconds:0,vehicles:0,...Object.fromEntries(JOURNAL_METRICS.map(key=>[key,0]))};
  for(const row of rows){validateRun(row);totals.seconds+=row.seconds;totals.vehicles+=row.vehicles.length;
    totals.victories+=row.outcome==='victory'?1:0;totals.deaths+=row.outcome==='death'?1:0;
    for(const key of JOURNAL_METRICS)totals[key]+=row.metrics[key];}
  return totals;
}
export function createJournal({indexedDB=globalThis.indexedDB,name='hunter-history'}={}){
  let opened=null;
  function open(){if(!indexedDB)return Promise.reject(new Error('Historial local no disponible.'));
    if(!opened)opened=new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);
      request.onupgradeneeded=()=>request.result.createObjectStore('runs',{keyPath:'runId'});
      request.onerror=()=>{opened=null;reject(request.error)};request.onblocked=()=>{opened=null;reject(new Error('Tanca altres pestanyes per obrir l’historial.'))};
      request.onsuccess=()=>{request.result.onversionchange=()=>{request.result.close();opened=null};resolve(request.result)};});return opened;}
  async function transaction(mode,work){const db=await open();return new Promise((resolve,reject)=>{
    const tx=db.transaction('runs',mode);let result,error;tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(error||tx.error);
    const abort=e=>{error=e;tx.abort()};try{work(tx.objectStore('runs'),value=>result=value,abort)}catch(e){abort(e)};
  });}
  return Object.freeze({
    async record(row){const detached=JSON.parse(JSON.stringify(validateRun(row)));return transaction('readwrite',(store,done,abort)=>{
      const req=store.get(row.runId);req.onsuccess=()=>{try{const merged=mergeRun(req.result,detached);store.put(merged);done(merged)}catch(e){abort(e)}};
    });},
    async list(){return transaction('readonly',(store,done)=>{const req=store.getAll();req.onsuccess=()=>done(req.result.sort((a,b)=>b.lastPlayedAt-a.lastPlayedAt));});},
    async close(){if(opened)(await opened).close();opened=null;}
  });
}
