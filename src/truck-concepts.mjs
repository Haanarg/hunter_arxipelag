// Four preview variants of the shared truck chassis.
import {createTruckModel} from './truck-model.mjs';
export const truckConcepts=Object.freeze([
 {id:'A',name:'A4.1 · Arcs corregits',tag:'Parafangs segurs',description:'Arcs de roda corbats i separats dels pneumàtics; faldons retirats dels eixos i defensa posterior senzilla.',
  cab:0x60674b,roof:0x49563e,canvas:0x537b49,trim:0x31382f,top:3.90,style:'a4_clear',armor:4},
 {id:'B',name:'A4.2 · Protecció perifèrica',tag:'Arcs reforçats',description:'Parafangs de doble nervi, blindatge entre eixos i cantoneres posteriors més profundes.',
  cab:0x5a674e,roof:0x485a42,canvas:0x537b49,trim:0x2d382e,top:3.90,style:'a4_guard',armor:4},
 {id:'C',name:'A4.3 · Faldons modulars',tag:'Mòduls separats',description:'Faldons modulars alts amb retalls per a les rodes, parafangs perfilats i posterior amb placa central.',
  cab:0x59654a,roof:0x45543e,canvas:0x527c4b,trim:0x303930,top:3.90,style:'a4_modular',armor:4},
 {id:'D',name:'A4.4 · Bastió posterior',tag:'Blindatge màxim',description:'Arcs angulars, protecció inferior elevada, gran placa posterior i defensa reforçada sense interferir amb les rodes.',
  cab:0x616b50,roof:0x465540,canvas:0x537d49,trim:0x303b31,top:3.93,style:'a4_bastion',armor:4}
]);
export function createTruckConcept(T,variant=0){
 const cfg=truckConcepts[variant];
 if(!cfg)throw new Error('Proposta de camió desconeguda');
 return createTruckModel(T,cfg,({cfg,T,axles,plate,bevelMat,edgeMat,heavyMat,clearanceArmor})=>{
 if(cfg.style==='a4_guard'){
   // A4.2: nervis que segueixen l'arc (radialment fora del parafang).
   for(const sign of[-1,1])for(const z of axles){
     const angleList=[.57,1.06,1.57,2.08,2.57];
     for(const theta of angleList){
       const x=sign*2.19,rr=1.055;
       const y=.82+rr*Math.sin(theta), zz=z+rr*Math.cos(theta);
       const rib=plate('guard-rib-'+sign+'-'+z+'-'+theta,.085,.16,.15,bevelMat,x,y,zz);
       rib.rotation.x=-theta;
     }
   }
   plate('rear-guard-skid',2.34,.29,.27,bevelMat,0,1.04,4.07);
   for(const sign of[-1,1])
     plate('rear-guard-column-'+sign,.25,.92,.27,edgeMat,sign*1.25,2.16,4.17);
 }else if(cfg.style==='a4_modular'){
   // A4.3: mòduls alts amb obertures per a tres rodes, sense faldó continu baix.
   for(const sign of[-1,1]){
     for(const [zc,len] of [[-1.09,.70], [1.81,.25], [3.78,.22]]){
       // Mòdul entre eixos o per damunt del pneumàtic de l'últim eix.
       const y=zc===1.81?1.98:zc===3.78?2.10:1.20;
       const block=plate('modular-side-'+sign+'-'+zc,.20,.20,len,bevelMat,sign*1.97,y,zc);
       clearanceArmor.push(block);
     }
     plate('modular-over-axles-'+sign,.20,.20,4.38,heavyMat,sign*1.96,2.14,1.45);
   }
   plate('rear-modular-center',2.08,.63,.20,heavyMat,0,2.07,4.15);
   for(const x of[-.70,0,.70])
     plate('rear-modular-rib-'+x,.08,.39,.11,bevelMat,x,2.05,4.28);
 }else if(cfg.style==='a4_bastion'){
   // A4.4: màxima massa per damunt del pas de roda, no pel mig dels pneumàtics.
   for(const sign of[-1,1]){
     plate('bastion-over-wheels-'+sign,.21,.28,4.40,edgeMat,sign*1.96,2.28,1.41);
     plate('bastion-between-axles-'+sign,.29,.46,1.02,heavyMat,sign*1.76,1.30,-.94);
     plate('bastion-rear-shoulder-'+sign,.43,.41,.54,heavyMat,sign*1.48,2.55,3.72);
     plate('bastion-rear-column-'+sign,.37,1.00,.40,bevelMat,sign*1.48,2.03,4.12);
   }
   plate('rear-bastion-main',2.65,.78,.37,heavyMat,0,2.16,4.12);
   plate('rear-bastion-low',2.76,.32,.37,edgeMat,0,1.14,4.17);
   plate('rear-bastion-bumper',3.72,.36,.41,heavyMat,0,1.36,4.29);
 }else{
   // A4.1: retall net i defensa simple, sense peces baixes al costat de les rodes.
   plate('rear-clear-center',2.30,.35,.17,bevelMat,0,2.08,4.12);
 }

 });
}
