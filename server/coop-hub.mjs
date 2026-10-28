import {readCoopRoom} from './coop.mjs';

// A room coordination channel, not yet the shared game-world simulation.
export class CoopRoomHub {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async authorized(ws){
    const a=ws.deserializeAttachment();
    if(!a||![a.actorId,a.sessionId,a.roomId].every(v=>typeof v==='string'&&v.length>0)||!Number.isFinite(a.expiresAt)||a.expiresAt<=Date.now())return null;
    const row=await this.env.DB.prepare(`SELECT s.expiresAt FROM session s JOIN hunter_access a ON a.owner=s.userId
      JOIN hunter_coop_members m ON m.owner=s.userId JOIN hunter_coop_rooms r ON r.id=m.room
      WHERE s.id=? AND s.userId=? AND a.status='approved' AND m.room=? AND r.expires_at>?`).bind(a.sessionId,a.actorId,a.roomId,Date.now()).first();
    if(!row||Number(row.expiresAt)<=Date.now())return null;
    return a;
  }
  send(ws,data){try{ws.send(JSON.stringify(data));return true;}catch(_){try{ws.close(1011,'Connexió interrompuda');}catch(_){}return false;}}
  async publish(){
    for(const ws of this.ctx.getWebSockets()){
      if(ws.readyState!==1)continue;
      const a=await this.authorized(ws);
      if(!a){this.send(ws,{type:'room',room:null});ws.close(4003,'Accés finalitzat');continue;}
      const room=await readCoopRoom(this.env,a.actorId);
      if(!room||room.id!==a.roomId){this.send(ws,{type:'room',room:null});ws.close(4004,'Sala tancada');continue;}
      this.send(ws,{type:'room',room});
    }
  }
  async fetch(request){
    const path=new URL(request.url).pathname;
    if(path==='/notify'&&request.method==='POST'){await this.publish();return new Response(null,{status:204});}
    if(path!=='/connect'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('Not found',{status:404});
    const a={actorId:request.headers.get('X-Coop-Actor'),sessionId:request.headers.get('X-Coop-Session'),roomId:request.headers.get('X-Coop-Room'),expiresAt:Number(request.headers.get('X-Coop-Expiry')),window:Date.now(),count:0};
    // Headers come only from the authenticated Worker, but recheck against D1.
    if(!await this.authorized({deserializeAttachment:()=>a}))return new Response('Forbidden',{status:403});
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);
    for(const ws of this.ctx.getWebSockets())if(ws.readyState===1&&ws.deserializeAttachment()?.actorId===a.actorId)ws.close(4001,'Connexió substituïda');
    this.ctx.acceptWebSocket(server);server.serializeAttachment(a);
    await this.env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=? AND room=?').bind(Date.now(),a.actorId,a.roomId).run();
    await this.publish();
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,message){
    const a=ws.deserializeAttachment();
    if(!a){ws.close(4003,'Accés finalitzat');return;}
    const now=Date.now();
    if(now-a.window>=60000){a.window=now;a.count=0;}
    a.count++;ws.serializeAttachment(a);
    if(a.count>20){ws.close(1008,'Massa missatges');return;}
    let body;
    try{if(typeof message!=='string'||message.length>256)throw new Error();body=JSON.parse(message);
      if(!body||Object.keys(body).length!==2||body.type!=='heartbeat'||body.protocol!==1)throw new Error();
    }catch(_){ws.close(1008,'Missatge invàlid');return;}
    if(!await this.authorized(ws)){ws.close(4003,'Accés finalitzat');return;}
    await this.env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=? AND room=?').bind(now,a.actorId,a.roomId).run();
    await this.publish();
  }
  async webSocketClose(ws,code,reason){
    const a=ws.deserializeAttachment();
    if(a&&!this.ctx.getWebSockets().some(other=>other!==ws&&other.readyState===1&&other.deserializeAttachment()?.actorId===a.actorId))
      await this.env.DB.prepare('UPDATE hunter_coop_members SET last_seen=? WHERE owner=? AND room=?').bind(Date.now()-60000,a.actorId,a.roomId).run();
    await this.publish();
  }
  async webSocketError(ws){ws.close(1011,'Connexió interrompuda');}
}
export async function notifyCoopRoom(env,roomId){
  if(!env.COOP_ROOMS||!roomId)return;
  const id=env.COOP_ROOMS.idFromName(roomId);await env.COOP_ROOMS.get(id).fetch('https://coop.internal/notify',{method:'POST'});
}
