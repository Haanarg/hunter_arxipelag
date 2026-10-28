let operationRun=null,operationJournal=null,journalNextAt=0,journalError='',operationAuthority=null,commandSequence=0,operationCommandEpoch=null;
function getOperationJournal(){return operationJournal||(operationJournal=window.HUNTER_JOURNAL.createJournal({indexedDB:window.indexedDB}))}
function initializeOperationRun(snapshot=null){
  const saved=snapshot?.world?.runtime?.journal;
  operationRun=saved?operationClone(saved):{format:1,runId:snapshot?'run:'+snapshot.operationId:window.HUNTER_SAVES.newOperationId(),
    seed:seed>>>0,mapScale:MAP_SCALE,generatorVersion:OPERATION_GENERATOR_VERSION,startedAt:Date.now(),lastPlayedAt:Date.now(),
    seconds:0,outcome:'active',metrics:{kills:0,shots:0,damageTaken:0,pickups:0,rescues:0,sabotages:0},vehicles:[]};
  window.HUNTER_JOURNAL.validateRun(operationRun);operationCommandEpoch=window.HUNTER_SAVES.newOperationId();operationAuthority?.reset(operationCommandEpoch);journalNextAt=0;
}
function recordOperationMetric(key,amount=1){if(operationRun&&Object.hasOwn(operationRun.metrics,key)&&Number.isFinite(amount)&&amount>0)operationRun.metrics[key]+=amount;}
function currentRun(){if(!operationRun)return null;return {...operationClone(operationRun),seconds:elapsed,lastPlayedAt:Date.now(),
  metrics:{...operationRun.metrics,kills:Math.max(operationRun.metrics.kills,kills)}};}
async function recordJournalNow(){
  const row=currentRun();if(!row)return;
  try{await getOperationJournal().record(row);journalError='';}catch(error){journalError='No s’ha pogut actualitzar l’historial; les partides desades es conserven.';}
}
function finishOperationRun(outcome){if(operationRun?.outcome==='active'){operationRun.outcome=outcome;recordJournalNow();}}
function journalTick(){if(started&&!paused&&!over&&performance.now()>=journalNextAt){journalNextAt=performance.now()+10000;recordJournalNow();}}
function playerCommand(type,payload={}){
  if(!operationAuthority||!operationRun)return false;
  const result=operationAuthority.dispatch({version:1,id:'local:'+ ++commandSequence,actorId:'local',operationId:operationCommandEpoch,type,payload});
  return result.ok?result.value:false;
}
function fire(){return playerCommand('fire')}
function toggle(){return playerCommand('vehicle')}
function useInvItem(id){return playerCommand('item',{id})}
function plant(seconds=3){return playerCommand('plant',{seconds})}
function performOptionalAction(){return playerCommand('optional')}
function initializeOperationAuthority(){
  const active=()=>!!started&&!over&&!generationPromise&&!operationBusy,
    empty=p=>!!p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).length===0;
  operationAuthority=window.HUNTER_AUTHORITY.create({handlers:{
    fire:{validate:empty,allowed:()=>active()&&!paused,execute:()=>{const before=fcd,am=ammo;const value=executePlayerFire();if(!knifeEquipped&&!cisallaEquipped&&(fcd>before||ammo<am))recordOperationMetric('shots');return value;}},
    vehicle:{validate:empty,allowed:()=>active()&&!paused,execute:()=>{const previous=cv,value=executePlayerToggle();if(cv&&cv!==previous&&!operationRun.vehicles.includes(cv.saveId))operationRun.vehicles.push(cv.saveId);return value;}},
    item:{validate:p=>!!p&&Object.keys(p).length===1&&typeof p.id==='string'&&Object.hasOwn(IT,p.id),allowed:active,execute:p=>executePlayerUseItem(p.id)},
    plant:{validate:p=>!!p&&Object.keys(p).length===1&&Number.isInteger(p.seconds)&&p.seconds>=0&&p.seconds<=59,allowed:active,execute:p=>executePlayerPlant(p.seconds)},
    optional:{validate:empty,allowed:()=>active()&&!paused,execute:()=>{const action=getOptionalAction(),value=executePlayerOptionalAction();if(value&&action?.kind==='sabotage')recordOperationMetric('sabotages');return value;}}
  }});
}
function openHistoryPanel(){if(operationBusy||generationPromise)return;if(started)panel('history');else ui.show('history');}
async function renderOperationHistory(body,isCurrent){
  body.replaceChildren();const add=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;body.appendChild(el);return el;};
  const status=add('p',journalError);status.setAttribute('role','status');
  try{
    if(started)await recordJournalNow();const rows=await getOperationJournal().list();if(!isCurrent())return;
    const totals=window.HUNTER_JOURNAL.summarizeRuns(rows);
    add('p',totals.operations+' operacions · '+totals.victories+' victòries · '+totals.deaths+' morts · '+Math.floor(totals.seconds/60)+' min actius');
    add('p',totals.kills+' baixes · '+totals.shots+' trets · '+totals.damageTaken+' dany rebut · '+totals.pickups+' recollides · '+totals.rescues+' rescats · '+totals.sabotages+' sabotatges · '+totals.vehicles+' vehicles utilitzats');
    add('p','L’historial es conserva encara que eliminis una partida desada. Les còpies i represes del mateix recorregut no dupliquen els totals.');
    for(const row of rows.slice(0,100)){
      const outcome={active:'En curs',victory:'Victòria',death:'Mort'}[row.outcome];
      add('p','Llavor '+row.seed+' · '+(row.mapScale===2?'Gran':'Petit')+' · '+outcome+' · '+Math.floor(row.seconds/60)+' min · '+row.generatorVersion+' · '+new Date(row.lastPlayedAt).toLocaleString('ca-ES'));
      let confirmed=!started;const button=add('button','Jugar aquesta llavor');button.onclick=()=>{
        if(!confirmed){confirmed=true;button.textContent='Confirma iniciar una operació nova';return;}
        startGameProgressively({seed:row.seed,scale:row.mapScale,difficulty:DIF}).catch(error=>status.textContent=error.message);
      };
    }
  }catch(error){status.textContent=error.message||'No s’ha pogut obrir l’historial.';}
  const back=add('button',started?'← Pausa':'← Portada');back.onclick=()=>{if(started)ui.show('pause');else ui.hide();};
}
