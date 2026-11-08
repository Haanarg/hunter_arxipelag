// Recuperació NO destructiva de materials GLB de l'Apache d'Araon.
// Distingeix una textura real de la pintura de substitució; no presenta
// mai colors inventats com si fossin les textures oficials del creador.
// Compartit pels dos bancs de proves (quatre LOD i comparador general).

const COLOR_TEXTURE=/base.?colou?r|diffuse|albedo|colou?r.?map|texture.?atlas|body.?texture/i;
const NOT_COLOR=/normal|bump|rough|metal|occlusion|ambient|specular|height|opacity|alpha|emissive|mask/i;

function materialsFor(root){
 const items=[];
 root?.traverse(node=>{
  if(!node.isMesh)return;
  for(const [i,material] of (Array.isArray(node.material)?node.material:[node.material]).entries())
   if(material)items.push({node,material,index:i});
 });
 return items;
}
const textured=m=>!!m.map?.isTexture;
const almostWhite=m=>!!m?.color&&m.color.r>.81&&m.color.g>.81&&m.color.b>.81;
function candidateAtlasIndex(json){
 const maps=json.textures||[],images=json.images||[];
 const names=maps.map((t,i)=>{
  const img=images[t.source??-1];
  return {i,name:[t.name,img?.name,img?.uri].filter(Boolean).join(' ')};
 });
 const explicit=names.filter(item=>COLOR_TEXTURE.test(item.name)&&!NOT_COLOR.test(item.name));
 if(explicit.length===1)return explicit[0].i;
 // Un sol mapa d'imatge (sense indicadors normal/metal/etc.) sol ser
 // un únic atles UV. Amb diversos mapes desconeguts NO se n'endevina cap.
 if(names.length===1&&!NOT_COLOR.test(names[0].name))return names[0].i;
 return -1;
}
function fallbackHex(node){
 let name='',p=node;
 while(p){name+=' '+(p.name||'');p=p.parent}
 if(/rotor|blade|propell|fan|hélice|helice/i.test(name))return 0x252b2a;
 if(/glass|window|windscreen|canopy|cockpit.?glass|visor/i.test(name))return 0x314952;
 if(/gun|barrel|turret|cannon|muzzle|machine/i.test(name))return 0x333936;
 if(/missile|rocket|hellfire|pod|launcher/i.test(name))return 0x797a63;
 if(/wheel|landing|skid|strut|gear/i.test(name))return 0x404b46;
 return 0x626f54; // pintura de substitució verd oliva (NO textura original)
}
function hasUV(node){return !!node.geometry?.getAttribute?.('uv')}

// Cridar una sola vegada després de GLTFLoader.loadAsync i ABANS de
// clonar les variants. L'exportador conserva les textures restaurades i
// les pintures de substitució, però cap dels dos canvia el fitxer font.
export async function recoverApacheAppearance(THREE,gltf){
 const root=gltf.scene||gltf;
 const parser=gltf.parser;
 const json=parser?.json||{};
 const rows=materialsFor(root);
 const initialTextured=rows.filter(row=>textured(row.material)).length;
 const missing=rows.filter(row=>!textured(row.material)&&almostWhite(row.material));
 let relinked=0,recolored=0,atlasMissing=false;
 // Si el binari CONTÉ un atles real no vinculat a cap material de
 // color, recuperam la vinculació a TEXCOORD_0. No generam ni fingim cap
 // textura que no existeixi al GLB.
 if(missing.length&&json.textures?.length&&parser?.getDependency){
  const atlasIndex=candidateAtlasIndex(json);
  if(atlasIndex>=0){
   try{
    const texture=await parser.getDependency('texture',atlasIndex);
    if(texture?.isTexture&&texture.image){
     texture.colorSpace=THREE.SRGBColorSpace;
     const cloned=new Map();
     for(const row of missing){
      if(!hasUV(row.node))continue;
      let updated=cloned.get(row.material);
      if(!updated){
       updated=row.material.clone();
       updated.map=texture;
       updated.needsUpdate=true;
       cloned.set(row.material,updated);
      }
      if(Array.isArray(row.node.material))row.node.material[row.index]=updated;
      else row.node.material=updated;
      relinked++;
     }
    }else atlasMissing=true;
   }catch{atlasMissing=true}
  }
 }
 // Si encara no hi ha una textura difusa autèntica, evitam que el
 // model aparegui tot blanc. No modifiquem materials foscos o texturats.
 // Cada categoria obté el seu material, sense alterar colors del Huey.
 const fallbackCache=new Map();
 for(const row of materialsFor(root)){
  const {node,material,index}=row;
  if(textured(material)||!almostWhite(material))continue;
  const color=fallbackHex(node),key=material.uuid+':'+color;
  let replacement=fallbackCache.get(key);
  if(!replacement){
   replacement=material.clone();
   replacement.color.setHex(color);
   if('roughness' in replacement)replacement.roughness=Math.max(.65,replacement.roughness||0);
   if('metalness' in replacement)replacement.metalness=Math.min(.28,replacement.metalness||0);
   replacement.needsUpdate=true;
   fallbackCache.set(key,replacement);
  }
  if(Array.isArray(node.material))node.material[index]=replacement;
  else node.material=replacement;
  recolored++;
 }
 const final=materialsFor(root);
 const textureMaps=final.filter(row=>textured(row.material)).length;
 return Object.freeze({
  meshes:new Set(final.map(row=>row.node)).size,
  materialUsages:final.length,
  embeddedImages:json.images?.length||0,
  embeddedTextureEntries:json.textures?.length||0,
  initialTextured,textureMaps,relinked,recolored,atlasMissing,
  status:recolored?'fallback':relinked?'relinked':textureMaps?'original':'no-color-maps'
 });
}
export function apacheAppearanceDescription(report){
 if(!report)return '';
 if(report.recolored)
  return '⚠ El GLB no porta una textura de color utilitzable en '+report.recolored+
   ' superfícies: pintura verd militar de substitució, NO textura original'+
   (report.embeddedImages?' · '+report.embeddedImages+' imatges al GLB':' · cap imatge al GLB')+
   '. Per recuperar-la, cal reimportar l’original GLB amb textures.';
 if(report.relinked)return 'Textura UV recuperada de l’atles incrustat al GLB ('+report.relinked+' superfícies).';
 if(report.textureMaps)return 'Textura del GLB preservada ('+report.textureMaps+' superfícies amb mapa de color).';
 return '⚠ El GLB no té mapes de color recuperables. Reimporta la versió original de Sketchfab amb les textures incloses.';
}
