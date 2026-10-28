import {validateSnapshot} from './operation-save.mjs?v=0.6.11';

export const SAVE_FILE_TYPE='hunter-arxipelag-operation';
export const SAVE_FILE_VERSION=1;
export const MAX_SAVE_FILE_BYTES=17*1024*1024;
const bytes=text=>new TextEncoder().encode(text);
const invalid=message=>{throw new Error(message)};
async function checksum(text){
  if(!globalThis.crypto?.subtle)invalid('Aquest navegador no pot verificar el fitxer de partida.');
  const hash=await crypto.subtle.digest('SHA-256',bytes(text));
  return Array.from(new Uint8Array(hash),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function serializeSaveFile(snapshot,{now=Date.now()}={}){
  validateSnapshot(snapshot);
  // Detach once: the hashed payload and exported payload must describe the same revision.
  const payload=JSON.parse(JSON.stringify(snapshot));
  const envelope={type:SAVE_FILE_TYPE,fileVersion:SAVE_FILE_VERSION,exportedAt:now,
    checksum:await checksum(JSON.stringify(payload)),payload};
  const text=JSON.stringify(envelope);
  if(bytes(text).byteLength>MAX_SAVE_FILE_BYTES)invalid('El fitxer de partida supera el límit de 17 MiB.');
  return {text,fileName:'hunter-'+payload.world.seed+'-'+payload.updatedAt+'.hunter-save.json',
    operationId:payload.operationId,revision:payload.revision};
}
export async function parseSaveFile(input){
  let text;
  if(typeof input==='string')text=input;
  else{
    if(!input||!Number.isFinite(input.size)||input.size<0||input.size>MAX_SAVE_FILE_BYTES||typeof input.text!=='function')
      invalid('Tria un fitxer de partida de fins a 17 MiB.');
    text=await input.text();
  }
  if(typeof text!=='string'||bytes(text).byteLength>MAX_SAVE_FILE_BYTES)invalid('El fitxer de partida supera el límit de 17 MiB.');
  let envelope;try{envelope=JSON.parse(text.replace(/^\uFEFF/,''));}catch(_){invalid('El fitxer no conté una partida JSON vàlida.');}
  if(!envelope||envelope.type!==SAVE_FILE_TYPE||envelope.fileVersion!==SAVE_FILE_VERSION)
    invalid('Tipus o versió de fitxer de partida incompatible.');
  if(!Number.isSafeInteger(envelope.exportedAt)||envelope.exportedAt<0||typeof envelope.checksum!=='string'||!/^[a-f0-9]{64}$/.test(envelope.checksum))
    invalid('La capçalera del fitxer de partida és invàlida.');
  validateSnapshot(envelope.payload);
  if(await checksum(JSON.stringify(envelope.payload))!==envelope.checksum)
    invalid('El fitxer està incomplet o ha canviat: la verificació no coincideix.');
  return envelope.payload;
}
