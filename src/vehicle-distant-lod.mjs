// LOD visual distant de la flota civil i militar. La física i les
// referències de canons, rodes i ocupants sempre romanen al grup complet.
import {vehicleSpecs} from './vehicle-specs.mjs';
export const distantVehicleRanges=Object.freeze({
  ferry:[720,850],heli:[650,780],heli_combat:[650,780],
  tanc:[550,670],tanqueta:[520,640],
  llanxa:[560,680],llanxa_coets:[560,680],hover:[490,610],
  default:[400,520]
});
const colorByType=Object.freeze({
  moto:0x9f663e,bici:0x42878a,moto_aquatica:0x39878e,windsurf:0xe2c98a,
  cotxe:0x6b7758,cotxe_civil:0x567f98,camio:0x6d735c,
  tanc:0x686f50,tanqueta:0x64694d,jeep:0x6b7758,
  heli:0x687660,heli_combat:0x535b4b,
  llanxa:0x77776c,llanxa_coets:0x5f6d67,
  hover:0x838d7f,ferry:0x747e86
});
const OPEN=new Set(['bici','moto','moto_aquatica','windsurf','hover','llanxa','llanxa_coets']);
export const hasDistantVehicleLOD=type=>type!=='barca_rems'&&!!vehicleSpecs.hitboxes[type];
export function shouldSimplifyVehicle(type,distanceSquared,currentFar=false,forcedDetail=false){
  if(forcedDetail||!hasDistantVehicleLOD(type))return false;
  const [near,far]=distantVehicleRanges[type]||distantVehicleRanges.default,
    threshold=currentFar?near:far;
  return distanceSquared>threshold*threshold;
}
// Una sola malla, geometria index-free i color per vèrtex. Compartim
// la geometria per tipus i estat d'ocupació entre tots els vehicles.
export function createDistantVehicleFactory(THREE,resources=null){
  const geometries=new Map();
  const unit=new THREE.BoxGeometry(1,1,1).toNonIndexed();
  const positions=unit.getAttribute('position'),normals=unit.getAttribute('normal');
  const material=new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true});
  resources?.retain(material);
  function build(type,seats){
    const key=type+':'+seats;
    if(geometries.has(key))return geometries.get(key);
    const [physicalW,physicalD]=vehicleSpecs.hitboxes[type],
      scale=vehicleSpecs.scales[type]||1,
      w=physicalW/scale,d=physicalD/scale,
      marine=['llanxa','llanxa_coets','hover','ferry','moto_aquatica','windsurf'].includes(type),
      flyer=type==='heli'||type==='heli_combat',
      narrow=['bici','moto','moto_aquatica','windsurf'].includes(type),
      heavy=type==='tanc'||type==='tanqueta',
      main=colorByType[type]||0x777d6e,parts=[];
    const box=(x,y,z,width,height,depth,color)=>parts.push([x,y,z,width,height,depth,color]);
    if(marine){
      box(0,.52,0,w*.94,.85,d*.93,main);
      if(type==='ferry')box(w*.20,2.25,d*.06,w*.25,2.2,d*.23,0xabb7bc);
      else if(type==='llanxa'||type==='llanxa_coets')
        box(0,1.04,d*.12,w*.73,.48,d*.35,0x4d5858);
      else if(type==='hover')box(0,1.34,-d*.12,w*.67,.8,d*.46,0x627779);
      else if(type==='windsurf')box(0,1.8,d*.06,.09,2.5,.12,0xc9c3a1);
    }else if(flyer){
      box(0,1.75,0,w*.72,1.35,d*.65,main);
      box(0,2.85,0,w*1.65,.075,.30,0x292d2d);
      box(0,2.2,d*.34,.3,.37,d*.46,main);
    }else{
      box(0,narrow?.72:1.05,0,w*.94,narrow?.35:1.4,d*.91,main);
      if(!narrow)box(0,heavy?2.1:2.05,-d*.04,w*.68,heavy?.66:1.05,d*.46,
        heavy?0x4b5747:0x516063);
      if(heavy)box(0,2.23,-d*.30,.22,.23,d*.64,0x333d36);
      if(narrow){
        box(0,.58,d*.37,w*.75,.72,.28,0x343938);
        box(0,.58,-d*.37,w*.75,.72,.28,0x343938);
      }
    }
    if(OPEN.has(type)){
      for(let i=0;i<Math.min(2,seats);i++){
        const x=seats===1?0:(i?1:-1)*w*.22,
          y=narrow?1.25:marine?1.55:1.85,z=type==='windsurf'?d*.13:d*.04;
        box(x,y,z,w*.17,.76,d*.10,0x57654a);
        box(x,y+.53,z,w*.15,.34,w*.16,0xc99770);
      }
    }
    const outPos=[],outNorm=[],outColor=[];
    for(const [x,y,z,ww,hh,dd,col] of parts){
      const c=new THREE.Color(col);
      for(let i=0;i<positions.count;i++){
        outPos.push(x+positions.getX(i)*ww,y+positions.getY(i)*hh,z+positions.getZ(i)*dd);
        outNorm.push(normals.getX(i),normals.getY(i),normals.getZ(i));
        outColor.push(c.r,c.g,c.b);
      }
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(outPos,3));
    geo.setAttribute('normal',new THREE.Float32BufferAttribute(outNorm,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(outColor,3));
    geo.computeBoundingSphere();
    resources?.retain(geo);
    geometries.set(key,geo);
    return geo;
  }
  function attach(model,type){
    if(!hasDistantVehicleLOD(type))return null;
    const full=new THREE.Group();full.name='hunter-vehicle-full-detail';
    for(const child of [...model.children])full.add(child);
    const proxy=new THREE.Mesh(build(type,0),material);
    proxy.name='hunter-vehicle-distant-proxy';
    proxy.visible=false;proxy.castShadow=false;proxy.receiveShadow=false;
    proxy.userData.noCastShadow=true;
    model.add(full,proxy);
    // Arrays are clone-safe for HUNTER_RESOURCES.cloneModel.
    return model.userData.distantVehicleLOD={
      type,full,proxy,variants:[build(type,0),build(type,1),build(type,2)],level:'full'
    };
  }
  return {attach};
}
export function setDistantVehicleLOD(model,far){
  const lod=model?.userData?.distantVehicleLOD;
  if(!lod)return false;
  const crew=model.userData.enemyCarCrew,
    seats=crew?[crew.driver,crew.gunner].filter(x=>x?.visible).length:0;
  const geometry=lod.variants[Math.min(2,seats)];
  const level=far?'far':'full',changed=lod.level!==level||
    lod.proxy.geometry!==geometry;
  if(!changed&&!far)return false;
  lod.level=level;
  lod.proxy.geometry=geometry;
  lod.proxy.visible=!!far;
  lod.full.visible=!far;
  // Alguns models (tripulacions de patrulles o accessoris creats després
  // de la fàbrica) afegeixen fills directament a l'arrel. Els ocultam
  // com a part del detall, sense ocultar mai la bandereta enemiga.
  const saved=lod.extraVisibility||[];
  if(far){
    for(const child of model.children){
      if(child===lod.full||child===lod.proxy||child===model.userData.enemyFlag||
         saved.some(entry=>entry[0]===child))continue;
      saved.push([child,child.visible]);child.visible=false;
    }
    lod.extraVisibility=saved;
  }else{
    for(const [child,visible] of saved)child.visible=visible;
    lod.extraVisibility=[];
  }
  return changed;
}
