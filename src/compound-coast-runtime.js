function layoutRadius(l){return Math.hypot(...l.size)/2+20}
function coastalLayoutFits(l,q){
 const tr=compoundTransform(q,q.angle),shore=l.waterfront?.shore??8;
 for(const x of[-l.size[0]/2,0,l.size[0]/2])for(const z of[-l.size[1]/2,-l.size[1]/4,shore-8]){const p=tr(x,z);if(Math.abs(p[0])>H-15||Math.abs(p[1])>H-15||rawHAt(...p)<(z===shore-8?-2:.12))return false}
 for(const b of l.buildings)for(const dx of[-b.w/2,0,b.w/2])for(const dz of[-b.d/2,0,b.d/2])if(rawHAt(...tr(b.x+dx,b.z+dz))<.2)return false;
 for(const v of l.vehicles.filter(v=>['w','wl'].includes(VT[v.t]?.m))){
  const hb=window.HUNTER_VEHICLES.hitboxes[v.t],sc=VS[v.t]||1,hw=hb[0]*sc/2+1,hd=hb[1]*sc/2+1;
  for(const dx of[-hw,0,hw])for(let dz=-hd;dz<=hd+(v.t==='ferry'?45:16);dz+=5)if(rawHAt(...tr(v.x+dx,v.z+dz))>-2)return false;
 }
 return true;
}
function findCoastalLayout(l,anchor,accept=()=>true){return drainBuildSteps(findCoastalLayoutSteps(l,anchor,accept))}
function* findCoastalLayoutSteps(l,anchor,accept=()=>true){
 const shore=l.waterfront?.shore??8;
 for(const offset of[0,60,-60,120,-120,180,-180,240,-240,300,-300,360,-360])for(let turn=0;turn<4;turn++){
  yield {stage:'Emplaçaments de costa',completed:null,total:null};
  const angle=turn*Math.PI/2,tr=compoundTransform(anchor,angle);
  let landSeen=false;
  for(let d=0;d<Math.min(900,(anchor.r||400)*1.6);d+=12){
   const p=tr(offset,d),h=rawHAt(...p);if(h>.2){landSeen=true;continue}if(!landSeen)continue;
   for(const shift of[-18,-12,-6,0,6,12,18,24]){
    const center=tr(offset,d-shore+shift),q={x:center[0],z:center[1],angle,h:.86,r:anchor.r};
    if(coastalLayoutFits(l,q)){
      const accepted=accept(q);
      if(accepted&&typeof accepted.next==='function'){if(yield* accepted)return q}
      else if(accepted)return q;
    }
   }
   break;
  }
 }
 return null;
}
// Bounded terrain-aware search. It returns a path before changing the terrain.
function solveCoastRoad(start,goal){return drainBuildSteps(solveCoastRoadSteps(start,goal))}
function* solveCoastRoadSteps(start,goal){
 const step=12,nodes=new Map(),open=[],cache=new Map(),key=(x,z)=>x+','+z;
 const sample=(x,z)=>{const k=key(x,z);if(cache.has(k))return cache.get(k);let y=hAt(x,z),ok=y>.15&&Math.abs(x)<H-20&&Math.abs(z)<H-20;
  for(const b of B)if(Math.abs(x-b.x)<b.w/2+7&&Math.abs(z-b.z)<b.d/2+7)ok=false;
  for(const [dx,dz]of[[-5,0],[5,0],[0,-5],[0,5]])if(hAt(x+dx,z+dz)<.1)ok=false;
  const value={y,ok};cache.set(k,value);return value;
 };
 const first={x:start.x,z:start.z,ix:0,iz:0,g:0,h:Math.hypot(goal.x-start.x,goal.z-start.z)};first.f=first.h;open.push(first);nodes.set('0,0',first);let found=null,count=0;
 while(open.length&&count++<14000){if(count%8===0)yield {stage:'Camí de la base a la costa',completed:count,total:null,unit:'nodes'};open.sort((a,b)=>b.f-a.f);const n=open.pop();if(n.closed)continue;n.closed=true;
  if(Math.hypot(n.x-goal.x,n.z-goal.z)<step*1.3){found=n;break}
  for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
   const ix=n.ix+dx,iz=n.iz+dz,x=start.x+ix*step,z=start.z+iz*step,k=key(ix,iz),old=nodes.get(k);if(old?.closed||Math.hypot(x-start.x,z-start.z)>1600)continue;
   const a=sample(n.x,n.z),b=sample(x,z),mid=sample((x+n.x)/2,(z+n.z)/2),dist=step*Math.hypot(dx,dz);if(!b.ok||!mid.ok||Math.abs(b.y-a.y)>dist*.38)continue;
   const g=n.g+dist+Math.abs(b.y-a.y)*8;if(old&&g>=old.g)continue;
   const next={ix,iz,x,z,g,f:g+Math.hypot(x-goal.x,z-goal.z),parent:n};nodes.set(k,next);open.push(next);
  }
 }
 if(!found)return null;
 const points=[{...goal,y:.86}];for(let n=found;n;n=n.parent)points.push({x:n.x,z:n.z,y:hAt(n.x,n.z)});points.reverse();
 // Forward/backward slope projection fixes both endpoints and limits the road to 12%.
 for(let pass=0;pass<6;pass++){
  points[0].y=hAt(start.x,start.z);for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],rise=Math.hypot(a.x-b.x,a.z-b.z)*.12;b.y=Math.max(a.y-rise,Math.min(a.y+rise,b.y))}
  points.at(-1).y=.86;for(let i=points.length-2;i>=0;i--){const a=points[i+1],b=points[i],rise=Math.hypot(a.x-b.x,a.z-b.z)*.12;b.y=Math.max(a.y-rise,Math.min(a.y+rise,b.y))}
 }
 if(Math.abs(points[0].y-hAt(start.x,start.z))>.2||points.some(p=>Math.abs(p.y-hAt(p.x,p.z))>7))return null;
 return points;
}
function buildCoastRoad(points,path){return drainBuildSteps(buildCoastRoadSteps(points,path))}
function* buildCoastRoadSteps(points,path){
 for(let i=1;i<points.length;i++){
  yield {stage:'Camí de la base a la costa',completed:i,total:points.length-1,unit:'trams'};
  const a=points[i-1],b=points[i],len=Math.hypot(a.x-b.x,a.z-b.z),angle=Math.atan2(-(b.x-a.x),b.z-a.z),n=Math.max(1,Math.ceil(len/2));
  for(let k=0;k<=n;k++){const t=k/n;addLevelArea(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,10,3,a.y+(b.y-a.y)*t,angle,7)}
 }
 path(points.map(p=>[p.x,p.z]),8);
 world.userData.baseCoast={width:8,maxGrade:.12,points:points.map(p=>({...p}))};
}
// A terminal bridge follows the moored ferry's ramp and retracts on departure.
function createTerminalRamp(c,f){
 // Les llavors només necessiten saber on està el ferri: cap geometria.
 if(seedSearchMode)return;
 const p=compoundTransform(c,c.angle)(0,30),g=new THREE.Mesh(new THREE.BoxGeometry(10,.18,1),M(0x787d79,'metal'));
 world.add(g);c.loadingRamp={x:p[0],z:p[1],f,homeX:f.x,homeZ:f.z,homeHD:f.hd,mesh:g};
}
function terminalRampState(r){
 const f=r.f;if(f.destroyed||!V.includes(f)||Math.hypot(f.x-r.homeX,f.z-r.homeZ)>1.5||Math.abs(wrapAngle(f.hd-r.homeHD))>.06)return null;
 const endZ=FERRY_DECK.halfL*(VS.ferry||1),end=ferryWorld(f,0,endZ),
   dx=end.x-r.x,dz=end.z-r.z,length=Math.hypot(dx,dz);
 if(length<.1)return null;
 return{x:r.x,z:r.z,ux:dx/length,uz:dz/length,length,startY:PIER_DECK_Y,endY:ferryLocalSurfaceY(f,endZ)+.04};
}
function terminalRampHeight(x,z){
 for(const c of world?.userData.compounds||[]){if(!c.loadingRamp)continue;const s=terminalRampState(c.loadingRamp);if(!s)continue;
  const dx=x-s.x,dz=z-s.z,t=(dx*s.ux+dz*s.uz)/s.length,side=dx*s.uz-dz*s.ux;
  if(t>=0&&t<=1&&Math.abs(side)<=5)return s.startY+(s.endY-s.startY)*t;
 }return null;
}
function updateTerminalRamps(){for(const c of world?.userData.compounds||[]){const r=c.loadingRamp;if(!r)continue;const s=terminalRampState(r);r.mesh.visible=!!s;if(!s)continue;
 const rise=s.endY-s.startY;r.mesh.position.set(s.x+s.ux*s.length/2,(s.startY+s.endY)/2-.09,s.z+s.uz*s.length/2);
 r.mesh.rotation.set(-Math.atan2(rise,s.length),Math.atan2(s.ux,s.uz),0,'YXZ');r.mesh.scale.z=Math.hypot(s.length,rise);
}}
function pedestrianFerry(x,z,previous){
 for(const f of V){if(f.t!=='ferry'||f.destroyed)continue;const q=ferryLocal(f,x,z),y=ferryLocalSurfaceY(f,q.z);
  if(ferryWalkable(q.x,q.z,.55)&&previous>=y-.9)return{f,q,y};
 }return null;
}
