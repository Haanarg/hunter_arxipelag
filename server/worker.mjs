import {readModelLab,writeModelLab} from './model-lab.mjs';
export {CoopRoomHub} from './coop-hub.mjs';
import {readCoopRoom} from './coop.mjs';
import {notifyCoopRoom} from './coop-hub.mjs';
import {limit} from './accounts.mjs';
import {coopAPI} from './coop.mjs';
import {accountReadiness} from './readiness.mjs';
import {runMaintenance} from './maintenance.mjs';
import {createAuth} from './auth.mjs';
import {validateSnapshot} from '../src/operation-save.mjs';
import {validateRun,mergeRun} from '../src/operation-journal.mjs';
import {accountAPI,access,username,alias,password} from './accounts.mjs';

const MAX_SAVE=16*1024*1024,ID=/^[a-zA-Z0-9:_-]{1,160}$/;
function failure(status,code,message){const error=new Error(message);error.status=status;error.code=code;throw error;}
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function readJSON(request,max=MAX_SAVE){
  if(!request.body)failure(400,'INVALID','Falten dades.');
  if(Number(request.headers.get('content-length'))>max)failure(413,'TOO_LARGE','Les dades superen el límit.');
  const reader=request.body.getReader(),chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;
    if(size>max){await reader.cancel();failure(413,'TOO_LARGE','Les dades superen el límit.');}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('object required');return value;
  }catch(_){failure(400,'INVALID','JSON invàlid.');}
}
function revision(request){const value=request.headers.get('X-Hunter-Revision');if(value===null||!/^\d+$/.test(value)||!Number.isSafeInteger(+value))failure(400,'INVALID','Falta una revisió vàlida.');return +value;}
function paging(url){const offset=Number(url.searchParams.get('offset')||0);if(!Number.isInteger(offset)||offset<0||offset>1000000)failure(400,'INVALID','Paginació invàlida.');return offset;}
function objectKey(owner,id){return 'saves/'+owner+'/'+id+'/'+crypto.randomUUID()+'.json';}
async function privateAPI(request,env,user,url){
  const owner=user.id;
  if(request.headers.get('X-Hunter-User')!==owner)failure(403,'ACCOUNT_CHANGED','El compte ha canviat.');
  const lab=await writeModelLab(request,env,user,url,readJSON,json,{access,limit});if(lab)return lab;
  if(url.pathname.startsWith('/api/coop/'))return coopAPI(request,env,user,url,readJSON,json);
  const match=url.pathname.match(/^\/api\/saves(?:\/([^/]+))?$/);
  if(match){
    const id=match[1]?decodeURIComponent(match[1]):null;
    if(id&&!ID.test(id))failure(400,'INVALID','Identificador invàlid.');
    if(!id&&request.method==='GET')return json((await env.DB.prepare('SELECT id AS operation_id,revision,name,seed,map_scale,played_seconds,updated_at FROM hunter_saves WHERE owner=? ORDER BY updated_at DESC LIMIT 200 OFFSET ?').bind(owner,paging(url)).all()).results);
    if(!id)failure(405,'METHOD','Mètode no admès.');
    if(request.method==='GET'){
      const row=await env.DB.prepare('SELECT * FROM hunter_saves WHERE owner=? AND id=?').bind(owner,id).first();
      if(!row)failure(404,'NOT_FOUND','No s’ha trobat la partida.');
      const object=await env.SAVES.get(row.object_key);if(!object)failure(503,'STORAGE','El fitxer de partida no està disponible.');
      const snapshot=await object.json();validateSnapshot(snapshot);
      return json({operation_id:id,revision:row.revision,snapshot});
    }
    if(request.method==='PUT'){
      const expected=revision(request),snapshot=await readJSON(request);validateSnapshot(snapshot);
      if(snapshot.operationId!==id)failure(400,'INVALID','La partida no correspon a l’identificador.');
      const previous=await env.DB.prepare('SELECT previous_key FROM hunter_saves WHERE owner=? AND id=? AND revision=?').bind(owner,id,expected).first(),
        key=objectKey(owner,id);
      await env.SAVES.put(key,JSON.stringify(snapshot),{httpMetadata:{contentType:'application/json'},customMetadata:{owner,operation:id}});
      let row;
      try{
        row=await env.DB.prepare(`INSERT INTO hunter_saves(owner,id,revision,object_key,name,seed,map_scale,played_seconds,updated_at)
          SELECT ?,?,?,?,?,?,?,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM hunter_saves WHERE owner=? AND id=? AND revision=?)
          ON CONFLICT(owner,id) DO UPDATE SET revision=hunter_saves.revision+1,previous_key=hunter_saves.object_key,
            object_key=excluded.object_key,name=excluded.name,seed=excluded.seed,map_scale=excluded.map_scale,
            played_seconds=excluded.played_seconds,updated_at=excluded.updated_at
          WHERE hunter_saves.revision=? RETURNING revision`).bind(owner,id,expected+1,key,snapshot.name,snapshot.world.seed,
            snapshot.world.mapScale,snapshot.world.time,Date.now(),expected,owner,id,expected,expected).first();
      }catch(error){await env.SAVES.delete(key);throw error;}
      if(!row){await env.SAVES.delete(key);failure(409,'CONFLICT','Hi ha una altra revisió de la partida.');}
      if(previous?.previous_key)await env.SAVES.delete(previous.previous_key).catch(()=>{});
      return json({revision:row.revision});
    }
    if(request.method==='DELETE'){
      const row=await env.DB.prepare('DELETE FROM hunter_saves WHERE owner=? AND id=? AND revision=? RETURNING object_key,previous_key').bind(owner,id,revision(request)).first();
      if(!row)failure(409,'CONFLICT','La partida ha canviat o ja no existeix.');
      await env.SAVES.delete([row.object_key,row.previous_key].filter(Boolean)).catch(()=>{});return json({deleted:true});
    }
    failure(405,'METHOD','Mètode no admès.');
  }
  const history=url.pathname.match(/^\/api\/history(?:\/([^/]+))?$/);
  if(history){
    if(!history[1]&&request.method==='GET')return json((await env.DB.prepare('SELECT record_json FROM hunter_runs WHERE owner=? ORDER BY updated_at DESC LIMIT 200 OFFSET ?').bind(owner,paging(url)).all()).results.map(row=>({record:JSON.parse(row.record_json)})));
    const id=history[1]?decodeURIComponent(history[1]):null;
    if(!id||!ID.test(id)||request.method!=='PUT')failure(405,'METHOD','Mètode no admès.');
    const incoming=await readJSON(request,65535);validateRun(incoming);if(incoming.runId!==id)failure(400,'INVALID','Identificador d’historial invàlid.');
    for(let attempt=0;attempt<5;attempt++){
      const old=await env.DB.prepare('SELECT revision,record_json FROM hunter_runs WHERE owner=? AND id=?').bind(owner,id).first(),
        merged=mergeRun(old?JSON.parse(old.record_json):null,incoming),expected=old?.revision||0;
      const row=await env.DB.prepare(`INSERT INTO hunter_runs(owner,id,revision,record_json,updated_at)
        SELECT ?,?,?,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM hunter_runs WHERE owner=? AND id=? AND revision=?)
        ON CONFLICT(owner,id) DO UPDATE SET revision=hunter_runs.revision+1,record_json=excluded.record_json,updated_at=excluded.updated_at
        WHERE hunter_runs.revision=? RETURNING revision`).bind(owner,id,expected+1,JSON.stringify(merged),Date.now(),expected,owner,id,expected,expected).first();
      if(row)return json({revision:row.revision});
    }
    failure(409,'CONFLICT','L’historial s’està actualitzant. Torna-ho a provar.');
  }
  failure(404,'NOT_FOUND','Ruta no disponible.');
}
export default {
  async scheduled(controller,env,ctx){
    if(!(await accountReadiness(env)).ready)return;
    ctx.waitUntil(runMaintenance(env).catch(()=>{console.error('No s’ha pogut completar el manteniment Hunter.');}));
  },
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
    try{
      const readiness=await accountReadiness(env);
      if(url.pathname==='/api/capabilities'&&request.method==='GET')return json({accounts:readiness.ready,reason:readiness.reason,issues:readiness.issues,recovery:'codes',approval:'manual',storage:'cloudflare',coopRealtime:!!env.COOP_ROOMS,coopPlayable:readiness.ready&&!!env.COOP_ROOMS,coopMission:'relay-training'});
      if(!readiness.ready)failure(503,'NOT_CONFIGURED','Els comptes encara no estan activats. El desament local continua disponible.');
      if(['POST','PUT','DELETE','PATCH'].includes(request.method)&&request.headers.get('Origin')!==env.AUTH_ORIGIN)
        failure(403,'ORIGIN','Origen no admès.');
      const sharedLab=await readModelLab(request,env,url,json);if(sharedLab)return sharedLab;
      const auth=createAuth(env,ctx);
      if(url.pathname.startsWith('/api/auth/')){
        const path=url.pathname.slice('/api/auth'.length);
        if(!['/sign-up/email','/sign-in/email','/sign-out','/get-session','/change-password'].includes(path))failure(404,'NOT_FOUND','Ruta no disponible.');
        if(request.method==='POST'){
          let body=await readJSON(request,16384);
          if(path==='/sign-up/email'||path==='/sign-in/email'){
            const name=username(body.username);body={name,email:alias(name),password:password(body.password)};
          }else if(path==='/change-password')body={currentPassword:body.currentPassword,newPassword:password(body.newPassword),revokeOtherSessions:true};
          else body={};
          const headers=new Headers(request.headers);headers.delete('content-length');headers.set('content-type','application/json');
          request=new Request(request.url,{method:request.method,headers,body:JSON.stringify(body)});
        }
        const response=await auth.handler(request);
        if(!response.ok)return response;
        const data=await response.clone().json().catch(()=>null);
        if(path==='/change-password'&&data?.user?.id)await env.DB.prepare('DELETE FROM hunter_assisted_recovery WHERE owner=?').bind(data.user.id).run();
        if(data?.user){
          const headers=new Headers(response.headers);headers.set('Cache-Control','no-store');headers.delete('content-length');
          return new Response(JSON.stringify({user:{id:data.user.id,name:data.user.name}}),{status:response.status,headers});
        }
        return response;
      }
      const session=await auth.api.getSession({headers:request.headers});
      if(url.pathname.startsWith('/api/account/')||url.pathname.startsWith('/api/admin/'))return await accountAPI(request,env,session,url,readJSON,json);
      if(!session?.user)failure(401,'UNAUTHENTICATED','Inicia sessió.');
      if((await access(env,session.user.id)).status!=='approved')failure(403,'APPROVAL_REQUIRED','El compte encara no està aprovat per sincronitzar.');
      if(url.pathname==='/api/coop/socket'){
        if(request.method!=='GET'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')failure(426,'UPGRADE','Cal una connexió WebSocket.');
        if(request.headers.get('Origin')!==env.AUTH_ORIGIN)failure(403,'ORIGIN','Origen no admès.');
        if(!env.COOP_ROOMS)failure(503,'REALTIME_NOT_READY','El canal en temps real encara no està activat.');
        await limit(env,request,'coop-connect',10);
        const room=await readCoopRoom(env,session.user.id);
        if(!room||room.id!==url.searchParams.get('room'))failure(403,'FORBIDDEN','No pertanys a aquesta sala.');
        const headers=new Headers({Upgrade:'websocket','X-Coop-Actor':session.user.id,'X-Coop-Session':session.session.id,
          'X-Coop-Room':room.id,'X-Coop-Expiry':String(Math.min(new Date(session.session.expiresAt).getTime(),room.expiresAt))});
        return await env.COOP_ROOMS.get(env.COOP_ROOMS.idFromName(room.id)).fetch(new Request('https://coop.internal/connect',{headers}));
      }
      const mutatesRoom=url.pathname.startsWith('/api/coop/')&&request.method==='POST';
      const previousRoom=mutatesRoom&&env.COOP_ROOMS?await readCoopRoom(env,session.user.id):null;
      const response=await privateAPI(request,env,session.user,url);
      if(mutatesRoom&&response.ok&&env.COOP_ROOMS){
        const result=await response.clone().json();
        for(const id of new Set([previousRoom?.id,result.room?.id].filter(Boolean)))
          ctx.waitUntil(notifyCoopRoom(env,id).catch(()=>console.error('No s’ha pogut notificar la sala.')));
      }
      return response;
    }catch(error){
      if(!error.status&&error.name!=='SaveError')console.error('Error del servei Hunter.');
      return json({code:error.code||'SERVER',message:error.status||error.name==='SaveError'?error.message:'No s’ha pogut completar l’operació.'},error.status||(error.name==='SaveError'?400:500));
    }
  }
};
