const DAY=86400000,LEASE=5*60000;
// Keys are immutable: application writes always publish a newly generated object.
// Keep a full day of grace for uploads whose D1 commit has not completed.
export async function runMaintenance(env,{now=Date.now(),pageSize=200}={}){
  pageSize=Math.max(1,Math.min(200,Math.floor(pageSize)||200));
  const tag=crypto.randomUUID();
  const lock=await env.DB.prepare(`INSERT INTO hunter_maintenance(name,lease,lease_until) VALUES('r2-orphans',?,?)
    ON CONFLICT(name) DO UPDATE SET lease=excluded.lease,lease_until=excluded.lease_until
    WHERE hunter_maintenance.lease_until<=? RETURNING cursor`).bind(tag,now+LEASE,now).first();
  if(!lock)return {busy:true,scanned:0,deleted:0};
  let cursor=lock.cursor||undefined,scanned=0,deleted=0;
  try{
    for(let page=0;page<2;page++){
      const listed=await env.SAVES.list({prefix:'saves/',limit:pageSize,...(cursor?{cursor}:{})});
      scanned+=listed.objects.length;
      const old=listed.objects.filter(object=>object.uploaded.getTime()<now-DAY);
      const orphan=[];
      for(let start=0;start<old.length;start+=40){
        const keys=old.slice(start,start+40).map(object=>object.key),marks=keys.map(()=>'?').join(',');
        const rows=await env.DB.prepare(`SELECT object_key,previous_key FROM hunter_saves WHERE object_key IN (${marks}) OR previous_key IN (${marks})`).bind(...keys,...keys).all();
        const referenced=new Set(rows.results.flatMap(row=>[row.object_key,row.previous_key]));
        orphan.push(...keys.filter(key=>!referenced.has(key)));
      }
      if(orphan.length){await env.SAVES.delete(orphan);deleted+=orphan.length;}
      cursor=listed.truncated?listed.cursor:undefined;
      if(listed.truncated&&!cursor)throw new Error('Missing R2 cursor');
      await env.DB.prepare("UPDATE hunter_maintenance SET cursor=? WHERE name='r2-orphans' AND lease=?").bind(cursor||null,tag).run();
      if(!listed.truncated)break;
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM hunter_limits WHERE window<?').bind(Math.floor((now-DAY)/60000)),
      env.DB.prepare('DELETE FROM hunter_assisted_recovery WHERE expires_at<?').bind(now-7*DAY),
      env.DB.prepare('DELETE FROM hunter_account_audit WHERE created_at<?').bind(now-90*DAY)
    ]);
    return {busy:false,scanned,deleted,more:!!cursor};
  }finally{
    await env.DB.prepare("UPDATE hunter_maintenance SET lease=NULL,lease_until=0 WHERE name='r2-orphans' AND lease=?").bind(tag).run();
  }
}
