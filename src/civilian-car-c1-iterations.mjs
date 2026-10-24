// Preview variants; production uses the C1A default directly.
import {createCivilianCarModel} from './civilian-car-model.mjs';
export const FAMILY_C1_ITERATIONS=Object.freeze([
 Object.freeze({id:'C1A',name:'Maleter clàssic',description:'C1 original depurat: maleter baix, passadors interiors foscos i cromats fins.',length:5.75,width:2.92,roofY:2.73,roofFront:-.82,roofRear:2.02,frontBase:-1.37,rearBase:2.26,beltY:1.75,rWheel:.70,rArch:.83,trim:0xcbd0c7,upholstery:0x6e5743,rack:false,rails:false,cargoY:1.06,liner:0x414440,cargo:0x494e49,bumper:0xcbd0c7}),
 Object.freeze({id:'C1B',name:'Maleter entapissat',description:'C1 amb moqueta càlida i proteccions de les rodes integrades al lateral del maleter.',length:5.75,width:2.92,roofY:2.76,roofFront:-.82,roofRear:2.02,frontBase:-1.37,rearBase:2.26,beltY:1.75,rWheel:.70,rArch:.83,trim:0xc1c5bb,upholstery:0x85725c,rack:false,rails:false,cargoY:1.12,liner:0x77665a,cargo:0x8d7a64,bumper:0xc1c5bb}),
 Object.freeze({id:'C1C',name:'Maleter modular',description:'C1 amb safata d’equipatge, laterals perfilats i emmagatzematge intern.',length:5.75,width:2.92,roofY:2.71,roofFront:-.84,roofRear:2.03,frontBase:-1.37,rearBase:2.26,beltY:1.75,rWheel:.70,rArch:.83,trim:0xd9d8ce,upholstery:0x5b6563,rack:false,rails:false,cargoY:1.08,liner:0x525d5b,cargo:0x68716c,bumper:0xd9d8ce}),
 Object.freeze({id:'C1D',name:'Maleter utilitari',description:'C1 amb terra de càrrega més alt, revestiment rentable i caixa d’eines al darrere.',length:5.75,width:2.92,roofY:2.75,roofFront:-.82,roofRear:2.03,frontBase:-1.37,rearBase:2.26,beltY:1.75,rWheel:.70,rArch:.83,trim:0x929c9e,upholstery:0x56615d,rack:true,rails:false,cargoY:1.23,liner:0x384448,cargo:0x414c4e,bumper:0x939d9f})
]);
export function createFamilyC1Iteration(THREE,variant=0,color=0x4b9fd1){
 variant=Math.max(0,Math.min(3,variant|0));
 const q=FAMILY_C1_ITERATIONS[variant];
 return createCivilianCarModel(THREE,color,q,({box,q,W,hw,loadStart,loadEnd,loadLength,rim})=>{
 if(variant===1){
  // Moqueta i petits compartiments de càrrega.
  for(const side of[-1,1])
   box(.30,.16,.55,q.upholstery,side*(hw-.48),q.cargoY+.15,loadEnd-.36,'interior');
 }else if(variant===2){
  // Safata de càrrega a mitja altura, estreta per continuar veient
  // els seients i el maleter a través dels vidres.
  box(W-.55,.055,.38,q.cargo,0,q.cargoY+.42,loadEnd-.30,'interior')
   .name='safata-maleter';
  for(const side of[-1,1])
   box(.12,.23,.46,rim,side*(hw-.38),q.cargoY+.14,loadEnd-.35,'metal');
 }else if(variant===3){
  // Caixa d'eines compacta i estora de goma antilliscant.
  box(W*.42,.27,.37,0x323b3a,.12,q.cargoY+.18,loadEnd-.32,'rubber').name='caixa-eines';
  for(let i=-2;i<=2;i++)
   box(.025,.013,loadLength*.78,0x667470,i*.27,q.cargoY+.055,(loadStart+loadEnd)/2,'rubber');
 }

 },({box,bar,q,W,hw,L,top,roofFront,roofRear,rim})=>{
 // Diferències visibles entre les quatre iteracions.
 if(q.rack){
  for(const side of[-1,1]){
   bar([side*W*.32,top+.15,roofFront+.40],[side*W*.32,top+.15,roofRear-.27],.045,rim);
  }
  if(variant===3)for(const z of[roofFront+.57,roofRear-.30])
   bar([-W*.32,top+.19,z],[W*.32,top+.19,z],.042,rim);
 }
 if(q.rails){
  box(W*.73,.036,.028,rim,0,top+.087,roofFront+.12,'metal');
  box(W*.73,.036,.028,rim,0,top+.087,roofRear-.12,'metal');
 }
 if(variant===2)for(const side of[-1,1])
  box(.035,.035,L*.32,rim,side*(hw+.031),1.63,.22,'metal');
 if(variant===3){
  for(const sign of[-1,1])box(W*.66,.095,.09,0x424c4b,0,1.06,sign*(L/2+.33),'rubber');
 }

 });
}
