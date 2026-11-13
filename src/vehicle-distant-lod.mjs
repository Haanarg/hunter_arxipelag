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
  llanxa:0x667176,llanxa_coets:0x667176,
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
      main=colorByType[type]||0x777d6e,parts=[],boatFaces=[];
    const box=(x,y,z,width,height,depth,color)=>parts.push([x,y,z,width,height,depth,color]);
    if(marine){
      if(type==='llanxa'||type==='llanxa_coets'){
        // Igualam el casc A1 real (2,75 x 8,9). La hitbox és més ampla
        // i no s'ha de fer servir com a silueta del model simplificat.
        const beam=2.75,half=8.9/2;
        const sections=[[-half,.20],[-half*.78,beam*.38],
          [-half*.43,beam*.78],[.05,beam*.98],
          [half*.55,beam],[half,beam*.88]];
        const rings=sections.map(([z,width])=>[
          [0,-.18,z],[-width*.5,.10,z],[-width*.66,.56,z],
          [-width*.5,.98,z],[width*.5,.98,z],
          [width*.66,.56,z],[width*.5,.10,z]
        ]);
        const face=(a,b,c)=>boatFaces.push([a,b,c]);
        for(let j=0;j<rings.length-1;j++)for(let k=0;k<7;k++){
          const next=(k+1)%7,front=rings[j],rear=rings[j+1];
          face(front[k],rear[k],rear[next]);
          face(front[k],rear[next],front[next]);
        }
        for(let k=1;k<6;k++){
          face(rings[5][0],rings[5][k+1],rings[5][k]);
          face(rings[0][0],rings[0][k],rings[0][k+1]);
        }
        // Banyera i parabrisa a escala i llocs equivalents al model
        // complet; tot fusionat en UNA sola geometria index-free.
        box(0,1.005,.78,beam*.69,.055,2.42,0x333e43);
        for(const side of [-1,1])
          box(side*beam*.43,1.36,.91,.17,.74,2.42,main);
        box(0,1.37,2.75,beam*.85,.7,.16,main);
        box(0,1.73,-.65,beam*.83,.63,.11,0x26343c);
        box(0,1.17,3.63,beam*.81,.12,1.45,0x717c81);
        if(type==='llanxa'){
          box(0,2.11,2.18,.13,1.9,.13,0x424b50);
          box(0,3.11,2.18,.42,.20,.39,0xc5c9c6);
        }else{
          box(0,1.65,2.66,.80,.58,.68,0x424b50);
          box(0,2.09,2.25,.94,.34,1.45,0x20262a);
        }
      }else{
        box(0,.52,0,w*.94,.85,d*.93,main);
        if(type==='ferry')box(w*.20,2.25,d*.06,w*.25,2.2,d*.23,0xabb7bc);
        else if(type==='hover')box(0,1.34,-d*.12,w*.67,.8,d*.46,0x627779);
        else if(type==='windsurf')box(0,1.8,d*.06,.09,2.5,.12,0xc9c3a1);
      }
    }else if(flyer){
      box(0,1.75,0,w*.72,1.35,d*.65,main);
      box(0,2.85,0,w*1.65,.075,.30,0x292d2d);
      box(0,2.2,d*.34,.3,.37,d*.46,main);
    }else{
      // La malla llunyana manté les proporcions: el mateix grup de
      // vehicle escala x2 tant aquest proxy com el T-90M complet.
      box(0,narrow?.72:type==='tanc'?1.22:1.05,0,
        w*.94,narrow?.35:type==='tanc'?1.8:1.4,d*.91,main);
      if(!narrow)box(0,type==='tanc'?2.63:heavy?2.1:2.05,-d*.04,
        w*.68,type==='tanc'?1.05:heavy?.66:1.05,d*.46,
        heavy?0x4b5747:0x516063);
      if(heavy)box(0,type==='tanc'?3.05:2.23,-d*.30,.22,.23,d*.64,0x333d36);
      if(narrow){
        box(0,.58,d*.37,w*.75,.72,.28,0x343938);
        box(0,.58,-d*.37,w*.75,.72,.28,0x343938);
      }
    }
    if(OPEN.has(type)){
      for(let i=0;i<Math.min(2,seats);i++){
        const boat=type==='llanxa'||type==='llanxa_coets',
          x=boat?(i?.58:-.58):seats===1?0:(i?1:-1)*w*.22,
          y=narrow?1.25:marine?1.55:1.85,
          z=boat?(i?1.14:.88):type==='windsurf'?d*.13:d*.04;
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
    // Mateix mesh/draw call per al casc amb proa en punta i la coberta.
    if(boatFaces.length){
      const tint=new THREE.Color(main);
      for(const [a,b,c] of boatFaces){
        const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],
          vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],
          nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,
          length=Math.hypot(nx,ny,nz)||1;
        for(const point of [a,b,c]){
          outPos.push(...point);
          outNorm.push(nx/length,ny/length,nz/length);
          outColor.push(tint.r,tint.g,tint.b);
        }
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
  // Una flota nombrosa torna a passar per aquí a cada subpas de física.
  // Quan la silueta i els fills directes no han canviat, evitar reescanejar
  // accessoris a centenars de models distants. Les tripulacions actualitzen
  // la geometria a changed; els nous accessoris modifiquen children.length.
  if(!changed&&(!far||lod.extraChildrenCount===model.children.length))return false;
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
    lod.extraChildrenCount=model.children.length;
  }else{
    for(const [child,visible] of saved)child.visible=visible;
    lod.extraVisibility=[];
    lod.extraChildrenCount=null;
  }
  return changed;
}
