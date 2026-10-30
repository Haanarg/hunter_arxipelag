// Paisatge de la portada: utilitza la planta, edificis i vehicles inicials
// del generador del joc, però no crea una partida ni engega la simulació.
import {createWorldRandom} from './world-generation-core.mjs';
import {rawTerrainAt,levelHeight} from './world-physics.mjs';
import {chooseCompoundLayout} from './compound-runtime-layouts.mjs';
import {planCompound,compoundPoint} from './compound-planning.mjs';
import {vehicleModels} from './vehicle-model-core.mjs';
import {playerBatching} from './player-batching-core.mjs';
import {prepareHumveeD31Runtime} from './humvee-d31-runtime.mjs';

export function prepareMenuBase(foundation){
  const {seed,mapScale,baseCandidate}=foundation;
  const random=createWorldRandom(seed);
  random.setState(foundation.randomState);
  const layout=chooseCompoundLayout('base',random);
  const rawHeightAt=(x,z)=>rawTerrainAt(x,z,foundation.islands,seed,2400*mapScale);
  const plan=planCompound(layout,baseCandidate,{random,rawHeightAt});
  const p=plan.level;
  const levels=[{x:p.x,z:p.z,hw:p.hw,hd:p.hd,y:p.y,rot:p.rot,
    c:p.c,s:p.s,blend:p.blend}];
  return {layout,plan,baseCandidate,
    heightAt:(x,z)=>levelHeight(rawHeightAt(x,z),x,z,levels),
    rawHeightAt};
}

export async function drawMenuBase(T,scene,base){
  const {layout,plan}=base;
  const centre=plan.height,group=new T.Group();
  group.name='hunter-starting-base-preview';scene.add(group);
  const materials=new Map();
  const material=(color,profile='paint')=>{
    const key=profile+':'+color;
    if(!materials.has(key)){
      const props=profile==='glass'
        ?{transparent:true,opacity:.72,depthWrite:false,roughness:.18,metalness:.04}
        :{roughness:profile==='metal'?.46:.92,metalness:profile==='metal'?.55:0};
      materials.set(key,new T.MeshStandardMaterial({color,flatShading:true,...props}));
    }
    return materials.get(key);
  };
  const box=(parent,w,h,d,c,x=0,y=0,z=0,profile='paint')=>{
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material(c,profile));
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  };
  const tr=compoundPoint(base.baseCandidate,plan.angle,plan.mirror);

  // Plataforma i rutes extretes de la distribució real, sobre el mateix
  // nivell aplanat que aplica el joc a la física i al terreny.
  const pad=box(group,layout.size[0]-6,.16,layout.size[1]-10,
    0x7e8066,plan.center[0],centre+.045,plan.center[1],'masonry');
  pad.rotation.y=-plan.angle;
  const roadMaterial=material(0x766950,'masonry');
  for(const route of layout.routes){
    for(let i=1;i<route.points.length;i++){
      const [x0,z0]=tr(...route.points[i-1]),[x1,z1]=tr(...route.points[i]);
      const length=Math.hypot(x1-x0,z1-z0);
      if(length<.5)continue;
      const road=new T.Mesh(new T.BoxGeometry(route.width,.11,length),roadMaterial);
      road.position.set((x0+x1)/2,centre+.15,(z0+z1)/2);
      road.rotation.y=Math.atan2(x1-x0,z1-z0);
      group.add(road);
    }
  }

  // La mateixa fàbrica de façanes, finestres, cobertes i portes del joc.
  const facades=window.HUNTER_BUILDINGS.create(T,{
    material,materialProfile:profile=>window.HUNTER_MATERIALS[profile]||window.HUNTER_MATERIALS.masonry,
    box
  });
  for(const spec of layout.buildings){
    const totalHeight=spec.h*(spec.floors||1);
    const shell=facades.createShell({width:spec.w,depth:spec.d,height:totalHeight,
      wallColor:spec.workshop?0x90968d:0xc9b98d,roofColor:0x2c5fc0});
    const {group:g,walls,doors}=shell;
    const [x,z]=tr(spec.x,spec.z);
    g.name='hunter-preview-'+spec.id;
    g.position.set(x,centre+.24,z);
    g.rotation.y=-(plan.angle-(spec.rotationY||0));
    facades.addWindowedWall(g,{lx:0,lz:-spec.d/2,sx:spec.w,sz:.46,
      height:spec.h,material:walls});
    for(const side of[-1,1]){
      facades.addWindowedWall(g,{lx:side*spec.w/2,lz:0,sx:.46,sz:spec.d,
        height:spec.h,material:walls});
    }
    const entranceWidth=3.8,wing=(spec.w-entranceWidth)/2;
    for(const side of[-1,1]){
      facades.addWall(g,{lx:side*(entranceWidth/2+wing/2),
        lz:spec.d/2,sx:wing,sz:.46,height:spec.h,material:walls});
    }
    facades.addDoor(g,{lx:0,lz:spec.d/2,sx:entranceWidth,sz:.49,
      height:spec.h,wallMaterial:walls,doorMaterial:doors});
    if(spec.floors===2){
      // La variant de dues plantes conserva la façana i finestres superiors.
      const upper=new T.Group();upper.position.y=spec.h;g.add(upper);
      facades.addWindowedWall(upper,{lx:0,lz:-spec.d/2,sx:spec.w,sz:.46,height:spec.h,material:walls});
      facades.addWindowedWall(upper,{lx:0,lz:spec.d/2,sx:spec.w,sz:.46,height:spec.h,material:walls});
      for(const side of [-1,1])facades.addWindowedWall(upper,{lx:side*spec.w/2,lz:0,sx:.46,sz:spec.d,height:spec.h,material:walls});
    }
    if(spec.id==='clinic'){
      const red=material(0xf4eeee);
      const cross=material(0xd54440);
      const sign=new T.Group();sign.position.set(0,totalHeight+.99,0);g.add(sign);
      const panel=new T.Mesh(new T.BoxGeometry(4,.08,2.9),red);
      panel.rotation.x=-Math.PI/2;sign.add(panel);
      box(sign,2.3,.1,.48,0xd54440,0,.09,0);
      box(sign,.48,.1,2.3,0xd54440,0,.1,0);
    }
    group.add(g);
  }

  for(const [kind,lx,lz] of layout.props){
    const [x,z]=tr(lx,lz);
    if(kind==='flag'){
      group.add(facades.createFlag({x,y:centre,z,color:0x2c7bff}));
    }else if(kind==='crate'){
      box(group,2.4,1.8,2.4,0x756e47,x,centre+.9,z);
    }else if(kind==='lamp'){
      const pole=new T.Mesh(new T.CylinderGeometry(.12,.15,10,7),material(0x606667,'metal'));
      pole.position.set(x,centre+5,z);group.add(pole);
      const bulb=new T.Mesh(new T.SphereGeometry(.66,8,6),
        new T.MeshBasicMaterial({color:0xffd69a}));
      bulb.position.set(x,centre+10.2,z);group.add(bulb);
    }
  }

  // Mateixos dos tipus i posicions de la base jugable: cotxe/Humvee i bici.
  // Si l'atles procedural del Humvee falla, funciona el model de reserva.
  let humvee=null;
  try{humvee=await prepareHumveeD31Runtime(T,{vehicleScale:1.3});}
  catch(error){console.warn('Model Humvee no disponible a la portada; reserva activa',error);}
  const factory=vehicleModels.createFactory(T,{
    box,material,shadows:false,humvee,batching:playerBatching
  });
  for(const v of layout.vehicles){
    const [x,z]=tr(v.x,v.z);
    const vehicle=factory(v.t);
    vehicle.position.set(x,centre+.24,z);
    vehicle.rotation.y=-(v.hd*plan.mirror-plan.angle);
    vehicle.name='hunter-preview-vehicle-'+v.t;
    group.add(vehicle);
  }
  return {group,layout,vehicles:layout.vehicles.map(v=>v.t)};
}
