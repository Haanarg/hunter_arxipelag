// Compatibilitat de GLB Sketchfab/Araon amb Three.js r186.
// El GLB Apache original (CC BY) utilitza KHR_materials_pbrSpecularGlossiness
// i guarda l'atles de color dins de l'extensió. En versions modernes de
// GLTFLoader el material queda blanc tot i que la imatge està incrustada.
// Convertim NOMÉS la descripció JSON dels materials al PBR glTF estàndard:
// els bytes de textures, accessors i geometria BIN són intocables.
const MAGIC=0x46546c67,JSON_TYPE=0x4e4f534a;
const LEGACY='KHR_materials_pbrSpecularGlossiness';
const readView=data=>new DataView(data.buffer,data.byteOffset,data.byteLength);
const pad4=n=>(n+3)&~3;
const textDecoder=new TextDecoder();
const textEncoder=new TextEncoder();

export function convertApacheLegacyMaterials(binary){
 const data=binary instanceof Uint8Array?binary:new Uint8Array(binary);
 if(data.byteLength<20)throw Error('GLB incomplet');
 const view=readView(data);
 if(view.getUint32(0,true)!==MAGIC||view.getUint32(4,true)!==2)
  throw Error('No és un fitxer GLB 2.0');
 if(view.getUint32(8,true)!==data.byteLength)
  throw Error('Longitud GLB incorrecta');
 const jsonLength=view.getUint32(12,true);
 if(view.getUint32(16,true)!==JSON_TYPE||jsonLength>data.byteLength-20)
  throw Error('GLB sense secció JSON vàlida');
 const json=JSON.parse(textDecoder.decode(data.subarray(20,20+jsonLength)));
 let converted=0,connected=0;
 for(const material of json.materials||[]){
  const extension=material.extensions?.[LEGACY];
  if(!extension)continue;
  const pbr=material.pbrMetallicRoughness||{};
  pbr.baseColorFactor=extension.diffuseFactor||[1,1,1,1];
  if(extension.diffuseTexture){
   pbr.baseColorTexture={...extension.diffuseTexture};
   connected++;
  }
  pbr.metallicFactor=0;
  pbr.roughnessFactor=Math.max(.14,Math.min(1,1-(extension.glossinessFactor??.5)));
  material.pbrMetallicRoughness=pbr;
  delete material.extensions[LEGACY];
  if(Object.keys(material.extensions).length===0)delete material.extensions;
  converted++;
 }
 if(!converted)return {buffer:binary,converted:0,connected:0,images:json.images?.length||0};
 for(const key of ['extensionsUsed','extensionsRequired']){
  if(json[key]){
   json[key]=json[key].filter(name=>name!==LEGACY);
   if(!json[key].length)delete json[key];
  }
 }
 const encoded=textEncoder.encode(JSON.stringify(json));
 const padded=pad4(encoded.length);
 const tail=data.subarray(20+jsonLength);
 const total=20+padded+tail.length;
 const result=new Uint8Array(total);
 result.set(data.subarray(0,12));
 const out=new DataView(result.buffer);
 out.setUint32(8,total,true);
 out.setUint32(12,padded,true);
 out.setUint32(16,JSON_TYPE,true);
 result.fill(0x20,20,20+padded);
 result.set(encoded,20);
 result.set(tail,20+padded);
 return {buffer:result.buffer,converted,connected,images:json.images?.length||0};
}

// L'original que puja l'usuari o la versió ja publicada al repositori
// poden coexistir. Les variants ja reparades NO es tornen a modificar.
export async function apacheCompatibleBlob(blob){
 if(!blob)return {blob:null,converted:0,connected:0,images:0};
 const source=await blob.arrayBuffer();
 const result=convertApacheLegacyMaterials(source);
 return {...result,blob:result.converted?
  new Blob([result.buffer],{type:'model/gltf-binary'}):blob};
}
