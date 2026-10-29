const ONLINE=45000;
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
