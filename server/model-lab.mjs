// An administrator writes one queue. Its unguessable read URL can be passed to
// the assistant without exposing account credentials or game saves.
const prefix='model-lab/';
const fail=(status,message)=>{const e=new Error(message);e.status=status;e.code='MODEL_LAB';throw e};
export async function readModelLab(request,env,url,json){
 const match=url.pathname.match(/^\/api\/model-lab\/shared\/([a-f0-9]{64})$/);
 if(!match)return null;
 if(request.method!=='GET')fail(405,'Només lectura.');
 const object=await env.SAVES.get(prefix+match[1]+'.json');
 if(!object)fail(404,'Cua no disponible.');
 const data=await object.json();
 if(data.expiresAt<Date.now())fail(410,'L’enllaç ha caducat. Torna a compartir la cua.');
 return json(data);
}
export async function writeModelLab(request,env,user,url,readJSON,json,{access,limit}){
 if(url.pathname!=='/api/model-lab/queue')return null;
 if((await access(env,user.id)).role!=='admin')fail(403,'La cua compartida requereix el compte administrador del joc.');
 if(request.method!=='PUT')fail(405,'Mètode no admès.');
 await limit(env,request,'model-lab-write',20);
 const input=await readJSON(request,262144);
 if(!Array.isArray(input.requests)||input.requests.length>200||input.requests.some(x=>!x||typeof x.text!=='string'||x.text.length>20000))fail(400,'Cua invàlida o massa llarga.');
 const token=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.AUTH_SECRET+'\0model-lab\0'+user.id))),n=>n.toString(16).padStart(2,'0')).join('');
 const data={format:'hunter-model-requests-v1',revision:String(input.revision||'').slice(0,100),updatedAt:new Date().toISOString(),expiresAt:Date.now()+7*86400000,requests:input.requests};
 await env.SAVES.put(prefix+token+'.json',JSON.stringify(data),{httpMetadata:{contentType:'application/json'}});
 return json({url:env.AUTH_ORIGIN+'/api/model-lab/shared/'+token,expiresAt:data.expiresAt});
}
