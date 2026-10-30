import {readCoopRoom} from './coop-room-state.mjs';
export {readCoopRoom} from './coop-room-state.mjs';
import {prepareCoopManifest} from './coop-protocol.mjs';
import {limit} from './accounts.mjs';
const DAY=86400000;
function fail(status,code,message){const e=new Error(message);Object.assign(e,{status,code});throw e;}
export async function coopAPI(request,env,user,url,readJSON,json){
  const schema=await env.DB.prepare("SELECT name FROM sqlite_master WHERE name='hunter_coop_schema'").first();
  if(!schema)fail(503,'COOP_NOT_READY','Les sales encara no estan activades. Falta aplicar la migració cooperativa.');
  const owner=user.id,now=Date.now();
  await env.DB.prepare('DELETE FROM hunter_coop_rooms WHERE expires_at<=?').bind(now).run();
  if(url.pathname==='/api/coop/rooms'&&request.method==='POST'){
    await limit(env,request,'coop-create',5);
    const body=await readJSON(request,4096);
    if(!Number.isInteger(body.seed)||body.seed<0||body.seed>4294967295||![1,2].includes(body.mapScale)||![.6,1,1.5].includes(body.difficulty))fail(400,'INVALID','Llavor, mida o dificultat invàlida.');
    const id=crypto.randomUUID(),alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    // Quatre caràcters fàcils de dictar, sense 0/O ni 1/I. Evitam
    // col·lisions amb sales actives i preservam els codis antics.
    let created=false;
    for(let attempt=0;attempt<20&&!created;attempt++){
      const bytes=crypto.getRandomValues(new Uint8Array(4));
      const code=Array.from(bytes,v=>alphabet[v%alphabet.length]).join('');
      if(await env.DB.prepare('SELECT id FROM hunter_coop_rooms WHERE code=?').bind(code).first())continue;
      try{await env.DB.batch([
        env.DB.prepare('INSERT INTO hunter_coop_rooms(id,code,host,seed,map_scale,difficulty,expires_at) VALUES(?,?,?,?,?,?,?)').bind(id,code,owner,body.seed,body.mapScale,body.difficulty,now+DAY),
        env.DB.prepare('INSERT INTO hunter_coop_members(owner,room,slot,last_seen) VALUES(?,?,0,?)').bind(owner,id,now)
      ]);created=true;}
      catch(e){
        if(!/constraint/i.test(e.message))throw e;
        if(await env.DB.prepare('SELECT id FROM hunter_coop_rooms WHERE code=?').bind(code).first())continue;
        fail(409,'IN_ROOM','Ja ets en una sala. Surt-ne abans de crear-ne una altra.');
      }
    }
    if(!created)fail(503,'CODE_UNAVAILABLE','No s’ha pogut generar un codi lliure. Torna-ho a provar.');
    return current(env,owner,now,json);
  }
  if(url.pathname==='/api/coop/join'&&request.method==='POST'){
    await limit(env,request,'coop-join',8);const body=await readJSON(request,4096),code=typeof body.code==='string'?body.code.trim().replace(/[-\s]/g,'').toUpperCase():'';
    if(!!(/^[A-HJ-NP-Z2-9]{4}$/.test(code)||/^[A-F0-9]{20}$/.test(code)))fail(400,'INVALID','Codi de sala invàlid.');
    let row;
    try{row=await env.DB.prepare(`INSERT INTO hunter_coop_members(owner,room,slot,last_seen)
      SELECT ?,id,1,? FROM hunter_coop_rooms WHERE code=? AND host<>? AND expires_at>? RETURNING owner`).bind(owner,now,code,owner,now).first();}
    catch(e){if(/constraint/i.test(e.message))fail(409,'ROOM_FULL','La sala és plena o ja ets en una sala.');throw e;}
    if(!row)fail(404,'NOT_FOUND','No s’ha trobat una sala disponible amb aquest codi.');
    return current(env,owner,now,json);
  }
  if(url.pathname==='/api/coop/current'&&request.method==='GET'){
    await env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=?').bind(now,owner).run();
    return current(env,owner,now,json);
  }
  if(url.pathname==='/api/coop/prepare'&&request.method==='POST'){
    const body=await readJSON(request,4096),state=await current(env,owner,now,json).then(r=>r.json());
    return json({manifest:prepareCoopManifest(state.room,body)});
  }
  if(url.pathname==='/api/coop/ready'&&request.method==='POST'){
    const body=await readJSON(request,4096);
    if(typeof body.ready!=='boolean'||!Number.isSafeInteger(body.revision)||body.revision<1)fail(400,'INVALID','Estat de preparació invàlid.');
    const row=await env.DB.prepare(`UPDATE hunter_coop_members SET ready=?,last_seen=? WHERE owner=?
      AND EXISTS(SELECT 1 FROM hunter_coop_rooms r WHERE r.id=hunter_coop_members.room AND r.revision=?) RETURNING owner`).bind(+body.ready,now,owner,body.revision).first();
    if(!row)fail(409,'ROOM_CHANGED','La sala ha canviat. Actualitza-la i torna-ho a provar.');
    return current(env,owner,now,json);
  }
  if(url.pathname==='/api/coop/leave'&&request.method==='POST'){
    await env.DB.batch([
      env.DB.prepare('DELETE FROM hunter_coop_rooms WHERE host=?').bind(owner),
      env.DB.prepare('DELETE FROM hunter_coop_members WHERE owner=?').bind(owner)
    ]);return json({room:null});
  }
  fail(404,'NOT_FOUND','Ruta cooperativa no disponible.');
}
async function current(env,owner,now,json){return json({room:await readCoopRoom(env,owner,now)});}
