import {hashPassword,verifyPassword} from 'better-auth/crypto';

function fail(status,code,message){const error=new Error(message);error.status=status;error.code=code;throw error;}
export function username(value){
  if(typeof value!=='string'||!/^[a-zA-Z0-9_.-]{3,32}$/.test(value))fail(400,'INVALID_USERNAME','El nom ha de tenir de 3 a 32 lletres, números, punts, guions o guions baixos.');
  if(value.startsWith('.')||value.endsWith('.')||value.includes('..'))fail(400,'INVALID_USERNAME','No utilitzis punts consecutius ni als extrems del nom.');
  return value.toLowerCase();
}
export const alias=name=>username(name)+'@hunter.invalid';
export function password(value){if(typeof value!=='string'||value.length<10||value.length>128)fail(400,'INVALID_PASSWORD','La contrasenya ha de tenir entre 10 i 128 caràcters.');return value;}
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function limit(env,request,purpose,max){
  const key=await hash(purpose+':'+(request.headers.get('cf-connecting-ip')||'unknown')),window=Math.floor(Date.now()/60000);
  const row=await env.DB.prepare(`INSERT INTO hunter_limits(key,window,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN hunter_limits.window=? THEN hunter_limits.count+1 ELSE 1 END,window=? RETURNING count`).bind(key,window,window,window).first();
  if(row.count>max)fail(429,'RATE_LIMIT','Massa intents. Espera un minut.');
}
export async function access(env,userId){return await env.DB.prepare('SELECT status,role FROM hunter_access WHERE owner=?').bind(userId).first()||{status:'pending',role:'user'};}
export async function accountAPI(request,env,session,url,readJSON,json){
  if(url.pathname==='/api/account/recover'&&request.method==='POST'){
    await limit(env,request,'recover',5);const body=await readJSON(request,16384),name=username(body.username),newPassword=password(body.newPassword),
      code=typeof body.code==='string'?body.code.replace(/[-\s]/g,'').toLowerCase():'';
    if(!/^[a-f0-9]{32}$/.test(code))fail(400,'INVALID_RECOVERY','Usuari o codi de recuperació incorrecte.');
    const user=await env.DB.prepare('SELECT id FROM user WHERE email=?').bind(alias(name)).first();
    if(!user)fail(400,'INVALID_RECOVERY','Usuari o codi de recuperació incorrecte.');
    const codeHash=await hash(user.id+':'+code),credential=await env.DB.prepare("SELECT id FROM account WHERE userId=? AND providerId='credential'").bind(user.id).first();
    if(!credential)fail(400,'INVALID_RECOVERY','Usuari o codi de recuperació incorrecte.');
    // The random tag gates every mutation in the atomic D1 batch. A replay cannot change a password.
    const encoded=await hashPassword(newPassword),tag=crypto.randomUUID(),now=Date.now(),
      guard='EXISTS(SELECT 1 FROM hunter_recovery WHERE owner=? AND code_hash=? AND claim_tag=?)';
    const result=await env.DB.batch([
      env.DB.prepare('UPDATE hunter_recovery SET used_at=?,claim_tag=? WHERE owner=? AND code_hash=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM account WHERE id=? AND userId=?)').bind(now,tag,user.id,codeHash,credential.id,user.id),
      env.DB.prepare(`UPDATE account SET password=?,updatedAt=? WHERE id=? AND ${guard}`).bind(encoded,now,credential.id,user.id,codeHash,tag),
      env.DB.prepare(`DELETE FROM session WHERE userId=? AND ${guard}`).bind(user.id,user.id,codeHash,tag)
    ]);
    if(result[0].meta.changes!==1||result[1].meta.changes!==1)fail(400,'INVALID_RECOVERY','Usuari o codi de recuperació incorrecte.');
    return json({reset:true});
  }
  if(!session?.user)fail(401,'UNAUTHENTICATED','Inicia sessió.');
  const user=session.user,permissions=await access(env,user.id);
  if(url.pathname==='/api/account/status'&&request.method==='GET')return json({user:{id:user.id,name:user.name},...permissions,
    recoveryCodes: (await env.DB.prepare('SELECT count(*) AS count FROM hunter_recovery WHERE owner=? AND used_at IS NULL').bind(user.id).first()).count});
  if(url.pathname==='/api/account/recovery-codes'&&request.method==='POST'){
    await limit(env,request,'codes',10);const body=await readJSON(request,16384),
      credential=await env.DB.prepare("SELECT password FROM account WHERE userId=? AND providerId='credential'").bind(user.id).first();
    if(typeof body.password!=='string'||!credential||!await verifyPassword({hash:credential.password,password:body.password}))fail(400,'INVALID_PASSWORD','Contrasenya incorrecta.');
    const codes=Array.from({length:8},()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')),
      statements=[env.DB.prepare("DELETE FROM hunter_recovery WHERE owner=? AND EXISTS(SELECT 1 FROM account WHERE userId=? AND providerId='credential' AND password=?)").bind(user.id,user.id,credential.password)];
    for(const code of codes)statements.push(env.DB.prepare("INSERT INTO hunter_recovery(owner,code_hash,created_at) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM account WHERE userId=? AND providerId='credential' AND password=?)").bind(user.id,await hash(user.id+':'+code),Date.now(),user.id,credential.password));
    const result=await env.DB.batch(statements);if(result[1].meta.changes!==1)fail(400,'INVALID_PASSWORD','La contrasenya ha canviat. Torna a entrar.');
    return json({codes:codes.map(code=>code.match(/.{4}/g).join('-'))});
  }
  if(url.pathname.startsWith('/api/admin/')){
    if(permissions.role!=='admin'||permissions.status!=='approved')fail(403,'FORBIDDEN','Aquesta acció requereix un administrador.');
    if(url.pathname==='/api/admin/users'&&request.method==='GET')return json((await env.DB.prepare('SELECT u.id,u.name,a.status,a.role FROM user u JOIN hunter_access a ON a.owner=u.id ORDER BY a.updated_at DESC LIMIT 200').all()).results);
    const match=url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]{1,160})$/);
    if(match&&request.method==='POST'){
      const body=await readJSON(request,16384);if(!['approved','suspended','pending'].includes(body.status))fail(400,'INVALID','Estat invàlid.');
      if(match[1]===user.id)fail(400,'SELF_CHANGE','No pots canviar la teva pròpia aprovació.');
      const row=await env.DB.prepare('UPDATE hunter_access SET status=?,updated_at=? WHERE owner=? RETURNING owner').bind(body.status,Date.now(),match[1]).first();
      if(!row)fail(404,'NOT_FOUND','Usuari no trobat.');return json({updated:true});
    }
  }
  fail(404,'NOT_FOUND','Ruta no disponible.');
}
