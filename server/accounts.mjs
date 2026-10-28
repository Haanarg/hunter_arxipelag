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
    const now=Date.now(),assisted=await env.DB.prepare(`SELECT issued_by FROM hunter_assisted_recovery
      WHERE owner=? AND code_hash=? AND used_at IS NULL AND expires_at>?`).bind(user.id,codeHash,now).first();
    const table=assisted?'hunter_assisted_recovery':'hunter_recovery',
      encoded=await hashPassword(newPassword),tag=crypto.randomUUID(),
      guard=`EXISTS(SELECT 1 FROM ${table} WHERE owner=? AND code_hash=? AND claim_tag=?)`;
    // A single D1 transaction claims the code, changes the password and revokes sessions.
    const claim=assisted?
      env.DB.prepare(`UPDATE hunter_assisted_recovery SET used_at=?,claim_tag=? WHERE owner=? AND code_hash=?
        AND used_at IS NULL AND expires_at>? AND EXISTS(SELECT 1 FROM hunter_access WHERE owner=issued_by AND status='approved' AND role='admin')
        AND EXISTS(SELECT 1 FROM account WHERE id=? AND userId=?)`).bind(now,tag,user.id,codeHash,now,credential.id,user.id):
      env.DB.prepare('UPDATE hunter_recovery SET used_at=?,claim_tag=? WHERE owner=? AND code_hash=? AND used_at IS NULL AND EXISTS(SELECT 1 FROM account WHERE id=? AND userId=?)').bind(now,tag,user.id,codeHash,credential.id,user.id);
    const statements=[claim,
      env.DB.prepare(`UPDATE account SET password=?,updatedAt=? WHERE id=? AND ${guard}`).bind(encoded,now,credential.id,user.id,codeHash,tag),
      env.DB.prepare(`DELETE FROM session WHERE userId=? AND ${guard}`).bind(user.id,user.id,codeHash,tag)
    ];
    if(assisted)statements.push(
      env.DB.prepare(`DELETE FROM hunter_recovery WHERE owner=? AND ${guard}`).bind(user.id,user.id,codeHash,tag),
      env.DB.prepare(`INSERT INTO hunter_account_audit(id,actor,target,event,created_at) SELECT ?,?,?,'recovery-used',? WHERE ${guard}`).bind(crypto.randomUUID(),assisted.issued_by,user.id,now,user.id,codeHash,tag)
    );
    else statements.push(env.DB.prepare(`DELETE FROM hunter_assisted_recovery WHERE owner=? AND ${guard}`).bind(user.id,user.id,codeHash,tag));
    const result=await env.DB.batch(statements);
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
    statements.push(env.DB.prepare("DELETE FROM hunter_assisted_recovery WHERE owner=? AND EXISTS(SELECT 1 FROM account WHERE userId=? AND providerId='credential' AND password=?)").bind(user.id,user.id,credential.password));
    const result=await env.DB.batch(statements);if(result[1].meta.changes!==1)fail(400,'INVALID_PASSWORD','La contrasenya ha canviat. Torna a entrar.');
    return json({codes:codes.map(code=>code.match(/.{4}/g).join('-'))});
  }
  if(url.pathname.startsWith('/api/admin/')){
    if(permissions.role!=='admin'||permissions.status!=='approved')fail(403,'FORBIDDEN','Aquesta acció requereix un administrador.');
    if(url.pathname==='/api/admin/users'&&request.method==='GET')return json((await env.DB.prepare('SELECT u.id,u.name,a.status,a.role FROM user u JOIN hunter_access a ON a.owner=u.id ORDER BY a.updated_at DESC LIMIT 200').all()).results);
    const recovery=url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]{1,160})\/recovery$/);
    if(recovery&&request.method==='POST'){
      await limit(env,request,'assisted-recovery',5);
      const body=await readJSON(request,16384);
      if(body.confirmedIdentity!==true)fail(400,'VERIFY_IDENTITY','Cal verificar personalment la identitat abans de generar el codi.');
      const credential=await env.DB.prepare("SELECT password FROM account WHERE userId=? AND providerId='credential'").bind(user.id).first();
      if(typeof body.password!=='string'||!credential||!await verifyPassword({hash:credential.password,password:body.password}))fail(400,'INVALID_PASSWORD','Contrasenya d’administrador incorrecta.');
      const raw=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),
        target=recovery[1],codeHash=await hash(target+':'+raw),now=Date.now(),expiresAt=now+30*60000;
      // Recheck actor, target and password atomically. Admin accounts need the offline owner procedure.
      const eligible=`EXISTS(SELECT 1 FROM hunter_access WHERE owner=? AND role='user' AND status IN ('pending','approved'))
        AND EXISTS(SELECT 1 FROM hunter_access WHERE owner=? AND role='admin' AND status='approved')
        AND EXISTS(SELECT 1 FROM account WHERE userId=? AND providerId='credential' AND password=?)`;
      const result=await env.DB.batch([
        env.DB.prepare(`INSERT INTO hunter_assisted_recovery(owner,code_hash,issued_by,created_at,expires_at)
          SELECT ?,?,?,?,? WHERE ?<>? AND ${eligible}
          ON CONFLICT(owner) DO UPDATE SET code_hash=excluded.code_hash,issued_by=excluded.issued_by,
          created_at=excluded.created_at,expires_at=excluded.expires_at,used_at=NULL,claim_tag=NULL`).bind(target,codeHash,user.id,now,expiresAt,target,user.id,target,user.id,user.id,credential.password),
        env.DB.prepare(`INSERT INTO hunter_account_audit(id,actor,target,event,created_at)
          SELECT ?,?,?,'recovery-issued',? WHERE EXISTS(SELECT 1 FROM hunter_assisted_recovery WHERE owner=? AND code_hash=?)`).bind(crypto.randomUUID(),user.id,target,now,target,codeHash)
      ]);
      if(result[0].meta.changes!==1)fail(403,'FORBIDDEN','No es pot emetre un codi per a aquest compte.');
      return json({code:raw.match(/.{4}/g).join('-'),expiresAt});
    }
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
