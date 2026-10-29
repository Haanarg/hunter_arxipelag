// Durable Object values are bounded; a native world may have many entities.
export async function writeCoopCheckpoint(storage,record){
 const text=JSON.stringify(record);if(record.meta.mode!=='native'||text.length<=90000){await storage.put('mission',record);return;}
 const count=Math.ceil(text.length/45000);for(let i=0;i<count;i++)await storage.put('native-record:'+i,text.slice(i*45000,(i+1)*45000));await storage.put('mission',{nativeRecordChunks:count});
}
export async function readCoopCheckpoint(storage){
 const record=await storage.get('mission');if(!record?.nativeRecordChunks)return record;
 let text='';for(let i=0;i<record.nativeRecordChunks;i++)text+=await storage.get('native-record:'+i);return JSON.parse(text);
}
