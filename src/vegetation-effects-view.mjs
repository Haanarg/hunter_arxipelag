import {createDebrisParticle,stepDebrisParticle,dustFrame} from './debris-core.mjs';
// Local cosmetics only; bounded independently of forest size and network history.
export function createVegetationEffectsView(T,scene,{heightAt=()=>0,random=(a,b)=>a+Math.random()*(b-a),maxParticles=160,maxDust=100}={}){
 const particleLimit=Math.min(160,Math.max(0,Math.floor(Number.isFinite(maxParticles)?maxParticles:160))),dustLimit=Math.min(100,Math.max(0,Math.floor(Number.isFinite(maxDust)?maxDust:100)));
 const particles=[],dust=[],materials=new Map(),box=new T.BoxGeometry(1,1,1),plane=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);let destroyed=false;
 const material=color=>{if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.9,metalness:0}));return materials.get(color);};
 function removeParticle(){const p=particles.shift();if(p)scene.remove(p.mesh);}
 function removeDust(){const p=dust.shift();if(p){scene.remove(p.mesh);p.mesh.material.dispose();}}
 return {
  get stats(){return {particles:particles.length,dust:dust.length};},
  emit(frame){
   if(destroyed)return;
   for(const effect of [frame.leaves,frame.wood])for(let i=0;i<effect.count;i++){
    const p=createDebrisParticle(effect.x,effect.y,effect.z,effect.size,effect.speed,random),mesh=new T.Mesh(box,material(effect.color));p.mesh=mesh;
    mesh.position.set(p.position.x,p.position.y,p.position.z);mesh.rotation.set(p.rotation.x,p.rotation.y,p.rotation.z);mesh.scale.set(p.scale.x,p.scale.y,p.scale.z);scene.add(mesh);particles.push(p);
    while(particles.length>particleLimit)removeParticle();
   }
   const effect=frame.dust,mesh=new T.Mesh(plane,new T.MeshBasicMaterial({color:effect.color,transparent:true,depthWrite:false,opacity:.8}));
   mesh.position.set(effect.x+random(-.6,.6),effect.y,effect.z+random(-.6,.6));mesh.scale.setScalar(effect.size);scene.add(mesh);dust.push({mesh,life:1.1,max:1.1,size:effect.size});while(dust.length>dustLimit)removeDust();
  },
  update(dt){
   if(destroyed)return;
   for(let i=particles.length-1;i>=0;i--){const p=particles[i],scale=stepDebrisParticle(p,p.mesh.position,p.mesh.rotation,dt,heightAt);p.mesh.scale.set(p.scale.x*scale,p.scale.y*scale,p.scale.z*scale);if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1);}}
   for(let i=dust.length-1;i>=0;i--){const p=dust[i];p.life-=dt;const frame=dustFrame(p.life,p.max,p.size);p.mesh.scale.setScalar(frame.scale);p.mesh.material.opacity=frame.opacity;if(p.life<=0){scene.remove(p.mesh);p.mesh.material.dispose();dust.splice(i,1);}}
  },
  destroy(){if(destroyed)return;destroyed=true;while(particles.length)removeParticle();while(dust.length)removeDust();box.dispose();plane.dispose();for(const m of materials.values())m.dispose();materials.clear();}
 };
}
