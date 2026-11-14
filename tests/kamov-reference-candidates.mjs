import assert from 'node:assert/strict';
import * as T from '../vendor/three-r186.module.mjs';
import {createKamovCandidate,stepKamovRotors,KAMOV_VERSION} from '../src/kamov-reference-candidates.mjs';
assert(KAMOV_VERSION.includes('square-windows'));
for(const type of ['ka60','ka52']){
 const root=createKamovCandidate(T,type),meshes=[],rotors=[];
 root.traverse(o=>{if(o.userData.kamovRotor)rotors.push(o);if(o.isMesh)meshes.push(o)});
 assert.equal(rotors.length,2);
 let triangles=0;
 for(const m of meshes){
  const p=m.geometry.attributes.position;assert(p.count>=3);
  for(const v of p.array)assert(Number.isFinite(v));
  triangles+=(m.geometry.index?.count??p.count)/3;
 }
 assert(triangles<18000,'Pressupost low-poly');
 const size=new T.Box3().setFromObject(root).getSize(new T.Vector3());
 assert(size.z>13&&size.z<17);assert(size.y>3.8&&size.y<5.1);
 const seats=[];root.traverse(o=>{if(o.name==='Coixí seient')seats.push(o)});
 assert.equal(seats.length,type==='ka60'?8:2);
 assert.equal(seats.filter(o=>o.position.z< -2).length,2,'Pilots de costat');
 assert.equal(meshes.filter(o=>o.name==='Pneumàtic').length,type==='ka60'?3:4);
 if(type==='ka60'){
  assert.equal(rotors[0].userData.kamovRotor.axis,'x');
  assert.equal(rotors[1].userData.kamovRotor.axis,'y');
  assert.equal(meshes.filter(o=>o.name==='Pala fenestron').length,11);
  assert.equal(meshes.filter(o=>o.name==='Superfície pala').length,4);
  // La porta de cada banda ha d'estar oberta de debò: cap panell de fuselatge.
  root.updateMatrixWorld(true);
  for(const side of [-1,1]){
   const doorRay=new T.Raycaster(new T.Vector3(side*2.2,1.89,.79),new T.Vector3(-side,0,0),0,1.22);
   const shell=meshes.filter(o=>o.name.startsWith('Fuselatge Ka-60 panell'));
   assert.equal(doorRay.intersectObjects(shell).length,0,'La porta continua tapada a la banda '+side);
  }
  const panes=meshes.filter(o=>o.name.startsWith('Vidre panoràmic Fuselatge Ka-60'));
  assert.equal(panes.length,16,'Parabrisa i vidres dels pilots preservats');
  assert(panes.every(o=>!o.name.includes(' 3 ')),'No hi ha vidre panoràmic darrere els pilots');
  const squares=meshes.filter(o=>o.name.startsWith('Finestró quadrat Fuselatge Ka-60'));
  assert.equal(squares.length,4,'Dos finestrons per banda');
  const metal=meshes.filter(o=>o.name.includes('Fuselatge Ka-60 3 ')&&o.name.includes('xapa verda'));
  assert.equal(metal.length,26);
  assert(metal.every(o=>!o.material.transparent&&o.material.color.getHex()===0x536655));
  const seals=meshes.filter(o=>o.name.startsWith('Fil negre finestró')||o.name.startsWith('Marc fi panoràmic Fuselatge Ka-60'));
  assert(seals.length>=16&&seals.every(o=>o.material.color.getHex()===0x111512));
  for(const side of [-1,1]){
   const windows=squares.filter(o=>Math.sign(new T.Box3().setFromObject(o).getCenter(new T.Vector3()).x)===side);
   assert.equal(windows.length,2);
   for(const pane of windows){
    const bounds=new T.Box3().setFromObject(pane),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
    assert(pane.material.transparent&&size.y>.32&&size.z>.35&&Math.abs(size.y-size.z)<.16,'Geometria quadrada');
    const ray=new T.Raycaster(new T.Vector3(side*3,center.y,center.z),new T.Vector3(-side,0,0));
    const first=ray.intersectObjects([...squares,...metal])[0];
    assert(first?.object===pane,'Finestró real sense xapa al darrere');
   }
   const center=new T.Box3().setFromObject(windows[0]).getCenter(new T.Vector3());
   const between=new T.Raycaster(new T.Vector3(side*3,center.y,-1.725),new T.Vector3(-side,0,0));
   assert(metal.includes(between.intersectObjects([...squares,...metal])[0]?.object),'Xapa opaca entre finestres');
  }
  assert(panes.every(o=>o.material.transparent&&o.material.opacity<.5));
  assert.equal(meshes.filter(o=>o.name==='Estabilitzador superior en T').length,2);
  const noseParts=meshes.filter(o=>o.name.startsWith('Morro independent Ka-60'));
  assert.equal(noseParts.length,49);
  assert(noseParts.every(o=>!o.material.transparent),'Morro sòlid i opac');
  const noseBounds=new T.Box3();for(const part of noseParts)noseBounds.expandByObject(part);
  const glassBounds=new T.Box3();for(const pane of panes)glassBounds.expandByObject(pane);
  assert(noseBounds.min.z> -4.62&&noseBounds.min.z< -4.58,'Posició frontal del morro');
  assert(noseBounds.max.z-noseBounds.min.z<.83,'Morro curt, amb cantonades recuades');
  assert(noseBounds.max.x-noseBounds.min.x>1.88,'Morro ample i arrodonit');
  assert(glassBounds.min.z<noseBounds.max.z&&glassBounds.min.z>=-4.021,'Vidre just damunt del morro amb cantonades recuades');
  assert(!root.getObjectByName('Morro independent Ka-60 tapa posterior'));
  assert(!root.getObjectByName('Fuselatge Ka-60 tapa frontal'));
  const glassFront=panes.filter(o=>o.name.endsWith(' 0 2')||o.name.endsWith(' 0 3'));
  assert.equal(glassFront.length,2);
  for(const h of [1.35,1.65]){
   const ray=new T.Raycaster(new T.Vector3(0,h,-8),new T.Vector3(0,0,1));
   assert(noseParts.includes(ray.intersectObjects(noseParts)[0]?.object),'Morro opac al frontal');
  }
  assert(glassBounds.max.y-glassBounds.min.y>1.39,'Altura panoràmica '+(glassBounds.max.y-glassBounds.min.y));
  const byPanel=new Map(panes.map(o=>[o.name.split(' ').slice(-2).join(':'),o]));
  const verts=o=>{const p=o.geometry.attributes.position;return Array.from({length:p.count},(_,i)=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(','))};
  for(const [key,o] of byPanel){
   const [j,k]=key.split(':').map(Number);
   for(const neighbour of [byPanel.get(j+':'+(k+1)),byPanel.get((j+1)+':'+k)]){
    if(neighbour)assert(new Set(verts(o).filter(v=>verts(neighbour).includes(v))).size>=2,'Vidres contigus sense separacions');
   }
  }
  for(const side of [-1,1]){
   const ray=new T.Raycaster(new T.Vector3(side*.35,2.35,-8),new T.Vector3(0,0,1));
   const first=ray.intersectObjects([...noseParts,...panes,...meshes.filter(o=>o.name.startsWith('Fuselatge Ka-60 panell'))])[0];
   assert(first&&panes.includes(first.object),'Parabrisa frontal lliure de xapa a banda '+side);
  }
  assert(root.getObjectByName('Junta visible morro-cabina'));
  assert(!root.getObjectByName('Aleta terminal T de cua'));
  assert(!root.getObjectByName('Estabilitzador horitzontal inferior'));
  const lateral=meshes.filter(o=>o.name==='Estabilitzador lateral botaló Ka-60');
  const endplates=meshes.filter(o=>o.name==='Aleta vertical botaló Ka-60');
  assert.equal(lateral.length,2);assert.equal(endplates.length,2);
  for(const side of [-1,1]){
   const xRange=o=>new T.Box3().setFromObject(o);
   const wing=lateral.find(o=>Math.sign(xRange(o).getCenter(new T.Vector3()).x)===side);
   const plate=endplates.find(o=>Math.sign(xRange(o).getCenter(new T.Vector3()).x)===side);
   assert(wing&&plate);
   const w=xRange(wing),p=xRange(plate);
   assert(w.min.z>4.5&&w.max.z<5.7&&w.getSize(new T.Vector3()).x>1.3);
   assert(p.getSize(new T.Vector3()).y>1&&p.min.z>4.5&&p.max.z<5.7);
   assert(side>0?w.max.x>=p.min.x-.06:w.min.x<=p.max.x+.06);
  }
  const tTail=new T.Box3();for(const o of meshes.filter(o=>o.name==='Estabilitzador superior en T'))tTail.expandByObject(o);
  assert(tTail.getSize(new T.Vector3()).x<2.6,'T superior més estreta que les aletes laterals');
  const fins=meshes.filter(o=>o.name==='Aleró triangular descendent Ka-60');
  assert.equal(fins.length,2,'Aletes triangulars a les dues puntes de la T');
  for(const fin of fins){
   const attr=fin.geometry.getAttribute('position');
   assert.equal(attr.count,3,'La silueta de cada aleró ha de ser triangular');
   const heights=Array.from({length:3},(_,i)=>attr.getY(i));
   assert(Math.max(...heights)-Math.min(...heights)>.65,'La punta triangular ha de penjar cap avall');
  }
  assert(root.getObjectByName('Balisa superior deriva'));
  assert(root.getObjectByName('Espinada superior cua Ka-60 panell 0 0'));
  assert(root.getObjectByName('Carenat dorsal motor Ka-60 panell 0 0'));
  assert.equal(meshes.filter(o=>o.name==='Entrada aire motor amb contorn').length,2);
  assert.equal(meshes.filter(o=>o.name==='Tub escapament dorsal').length,2);
  assert(root.getObjectByName('Amortidor tren posterior ancorat'));
  assert(root.getObjectByName('Carenat fixació tren posterior'));
  assert(!root.getObjectByName('Motor Ka-60'),'Cal eliminar els dos carenats superiors antics');
  const rear=root.children.find(o=>o.name==='Roda tren aterratge'&&o.position.z>3.5);
  assert(rear&&Math.abs(rear.position.x)<.01,'Roda posterior centrada sota la cua');
  const duct=root.getObjectByName('Conducte fenestron obert');root.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(-1,1.94+.50,7.63),new T.Vector3(1,0,0));
  assert.equal(ray.intersectObject(duct).length,0,'El conducte no pot estar tapat');
 }else{
  assert(rotors.every(r=>r.userData.kamovRotor.axis==='y'));
  assert.equal(rotors[0].userData.kamovRotor.speed,-rotors[1].userData.kamovRotor.speed);
  assert.equal(meshes.filter(o=>o.name==='Superfície pala').length,6);
  assert(root.getObjectByName('Canó lateral dret'));
  assert(!root.getObjectByName('Rotor fenestron'));
 }
 const restored=new T.ObjectLoader().parse(root.toJSON());
 for(const m of meshes){const copy=restored.getObjectByProperty('uuid',m.uuid);assert.deepEqual(Array.from(copy.geometry.attributes.position.array),Array.from(m.geometry.attributes.position.array),m.name+' JSON');}
 const before=rotors.map(o=>o.rotation[o.userData.kamovRotor.axis]);stepKamovRotors(root,.04);
 rotors.forEach((o,i)=>assert.equal(o.rotation[o.userData.kamovRotor.axis],before[i]+o.userData.kamovRotor.speed*.04));
 stepKamovRotors(restored,.04);assert(new T.Box3().setFromObject(restored).getSize(new T.Vector3()).distanceTo(new T.Box3().setFromObject(root).getSize(new T.Vector3()))<1e-5);
 console.log(type,Math.round(triangles)+' triangles',meshes.length+' peces',size.toArray().map(x=>x.toFixed(2)).join(' × '));
}
assert.throws(()=>createKamovCandidate(T,'unknown'));
console.log('PASS Kamov: finestrons quadrats amb xapa verda i fil negre, parabrisa i cua preservats');
