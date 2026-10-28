import {prepareCoopManifest} from './coop-protocol.mjs';
import {limit} from './accounts.mjs';
const DAY=86400000,ONLINE=45000;
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
    const id=crypto.randomUUID(),code=Array.from(crypto.getRandomValues(new Uint8Array(10)),v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
    try{await env.DB.batch([
      env.DB.prepare('INSERT INTO hunter_coop_rooms(id,code,host,seed,map_scale,difficulty,expires_at) VALUES(?,?,?,?,?,?,?)').bind(id,code,owner,body.seed,body.mapScale,body.difficulty,now+DAY),
      env.DB.prepare('INSERT INTO hunter_coop_members(owner,room,slot,last_seen) VALUES(?,?,0,?)').bind(owner,id,now)
    ]);}catch(e){if(/constraint/i.test(e.message))fail(409,'IN_ROOM','Ja ets en una sala. Surt-ne abans de crear-ne una altra.');throw e;}
    return current(env,owner,now,json);
  }
  if(url.pathname==='/api/coop/join'&&request.method==='POST'){
    await limit(env,request,'coop-join',8);const body=await readJSON(request,4096),code=typeof body.code==='string'?body.code.trim().replace(/[-\s]/g,'').toUpperCase():'';
    if(!/^[A-F0-9]{20}$/.test(code))fail(400,'INVALID','Codi de sala invàlid.');
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
export async function readCoopRoom(env,owner,now=Date.now()){
  const rows=(await env.DB.prepare(`SELECT r.id,r.code,r.host,r.seed,r.map_scale,r.difficulty,r.revision,r.expires_at,
    m.owner,m.slot,m.ready,m.last_seen,u.name,a.status FROM hunter_coop_rooms r
    JOIN hunter_coop_members mine ON mine.room=r.id AND mine.owner=?
    JOIN hunter_coop_members m ON m.room=r.id JOIN user u ON u.id=m.owner
    JOIN hunter_access a ON a.owner=m.owner WHERE r.expires_at>? ORDER BY m.slot`).bind(owner,now).all()).results;
  if(!rows.length)return null;
  const r=rows[0],members=rows.map(m=>({id:m.owner,name:m.name,host:m.slot===0,online:m.last_seen>now-ONLINE&&m.status==='approved',ready:!!m.ready&&m.last_seen>now-ONLINE&&m.status==='approved'}));
  return {id:r.id,code:r.code,host:r.host,seed:r.seed,mapScale:r.map_scale,difficulty:r.difficulty,revision:r.revision,expiresAt:r.expires_at,members,allReady:members.length===2&&members.every(m=>m.ready),phase:'lobby'};
}
