// Durable Object values are bounded; a native world may have many entities.
export async function writeCoopCheckpoint(storage,record){
 if(record.meta.mode==='native'&&typeof record.meta.id==='string'){
  let metaCount=await storage.get('native-meta-count');
  if(await storage.get('native-meta-id')!==record.meta.id){
   const text=JSON.stringify(record.meta);metaCount=Math.ceil(text.length/45000);
   for(let i=0;i<metaCount;i++)await storage.put('native-meta:'+i,text.slice(i*45000,(i+1)*45000));
   await storage.put('native-meta-id',record.meta.id);await storage.put('native-meta-count',metaCount);
  }
  const {meta,...dynamic}=record,text=JSON.stringify(dynamic),count=Math.ceil(text.length/45000);
  for(let i=0;i<count;i++)await storage.put('native-record:'+i,text.slice(i*45000,(i+1)*45000));
  await storage.put('mission',{nativeRecordChunks:count,nativeMetaChunks:metaCount,nativeMetaId:meta.id});return;
 }
 const text=JSON.stringify(record);if(record.meta.mode!=='native'||text.length<=90000){await storage.put('mission',record);return;}
 const count=Math.ceil(text.length/45000);for(let i=0;i<count;i++)await storage.put('native-record:'+i,text.slice(i*45000,(i+1)*45000));await storage.put('mission',{nativeRecordChunks:count});
}
export async function readCoopCheckpoint(storage){
 const record=await storage.get('mission');if(!record?.nativeRecordChunks)return record;
 let text='';for(let i=0;i<record.nativeRecordChunks;i++)text+=await storage.get('native-record:'+i);const result=JSON.parse(text);
 if(record.nativeMetaChunks){let meta='';for(let i=0;i<record.nativeMetaChunks;i++)meta+=await storage.get('native-meta:'+i);result.meta=JSON.parse(meta);if(result.meta.id!==record.nativeMetaId)throw Error('Checkpoint metadata mismatch');}
 return result;
}
