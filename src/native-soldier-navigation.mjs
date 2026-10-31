import {SOLDIER} from './enemy-perception-core.mjs';

// Adaptació sense renderer dels objectius tàctics del soldat individual:
// retirada <9 m, posició de foc ~15-17 m, flanqueig i recerca de l'últim
// contacte. L'autoritat del Worker resol els murs i els nivells físics.
const CELL=3.5,MAX_NODES=180,REPLAN_TICKS=42;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const face=(u,p)=>Math.atan2(u.x-p.x,u.z-p.z);
const NEIGHBORS=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
function legal(world,unit,from,to){
 const length=dist(from,to),n=Math.max(1,Math.ceil(length/1.15));
 let previous={...from,y:unit.y,hd:unit.heading||0};
 for(let i=1;i<=n;i++){
  const point={x:from.x+(to.x-from.x)*i/n,z:from.z+(to.z-from.z)*i/n,y:unit.y,hd:unit.heading||0},
    resolved=world.resolveBody(previous,point),
    level=world.locomotionAt(point.x,point.z,unit.y);
  if(Math.hypot(resolved.x-point.x,resolved.z-point.z)>.09||
     Math.abs(level.floor-unit.y)>1.0||
     level.terrain<-.8&&!level.basement)return false;
  previous=resolved;
 }
 return true;
}
function planAround(world,unit,destination){
 const distance=dist(unit,destination),range=Math.min(55,Math.max(20,distance+12)),
   radius=Math.ceil(range/CELL),limit=radius*radius,
   end={x:unit.x+(destination.x-unit.x)*Math.min(1,43/Math.max(.01,distance)),
     z:unit.z+(destination.z-unit.z)*Math.min(1,43/Math.max(.01,distance))};
 const nodes=new Map(),open=[],start={i:0,j:0,x:unit.x,z:unit.z,g:0,f:dist(unit,end),parent:null},
   key=(i,j)=>i+','+j;nodes.set(key(0,0),start);open.push(start);
 let best=start,bestDist=dist(start,end),count=0;
 while(open.length&&count++<MAX_NODES){
  let index=0;for(let i=1;i<open.length;i++)if(open[i].f<open[index].f)index=i;
  const node=open.splice(index,1)[0];if(node.closed)continue;node.closed=true;
  const toEnd=dist(node,end);
  if(toEnd<bestDist){best=node;bestDist=toEnd;}
  if(toEnd<CELL*.8)break;
  for(const [di,dj] of NEIGHBORS){
   const i=node.i+di,j=node.j+dj;if(i*i+j*j>limit)continue;
   const x=unit.x+i*CELL,z=unit.z+j*CELL,k=key(i,j);
   let next=nodes.get(k);if(next?.closed)continue;
   if(!legal(world,unit,node,{x,z}))continue;
   const g=node.g+Math.hypot(di,dj)*CELL;
   if(next&&g>=next.g)continue;
   if(!next){next={i,j,x,z};nodes.set(k,next);}
   next.parent=node;next.g=g;next.f=g+Math.hypot(x-end.x,z-end.z);open.push(next);
  }
 }
 if(best===start)return [];
 const route=[];
 for(let p=best;p?.parent&&route.length<25;p=p.parent)route.unshift({x:p.x,z:p.z});
 return route;
}
function chooseGoal(unit,actor,tick){
 if(unit.state!=='attack'||!unit.canSee)return unit.lastKnown||null;
 const d=dist(unit,actor),side=unit.tacticSide??((unit.id.length+unit.id.charCodeAt(unit.id.length-1))%2?1:-1),
   fx=(actor.x-unit.x)/Math.max(1,d),fz=(actor.z-unit.z)/Math.max(1,d),
   sx=-fz,sz=fx;
 unit.tacticSide=side;
 if(d<SOLDIER.retreat)return {x:actor.x-fx*15+sx*side*3,z:actor.z-fz*15+sz*side*3};
 if(d>SOLDIER.ideal+2)return {x:actor.x-fx*16+sx*side*4,z:actor.z-fz*16+sz*side*4};
 if(tick<(unit.tacticUntil||0)&&unit.tacticGoal)return unit.tacticGoal;
 // La maniobra lateral crea una posició de foc diferent sense enfilar
 // sempre directament el jugador ni avançar-li de cara.
 unit.tacticUntil=tick+33;
 return unit.tacticGoal={x:unit.x+sx*side*5,z:unit.z+sz*side*5};
}
export function stepNativeSoldierNavigation(unit,{tick,world,players,requestDoor=()=>false}){
 if(unit.hp<=0||unit.t!=='soldat')return false;
 unit.navPhase??=[...unit.id].reduce((n,c)=>n+c.charCodeAt(0),0)%3;
 if(tick%3!==unit.navPhase)return true;
 const actor=unit.canSee?players.find(p=>p.id===unit.focus&&p.hp>0):null;
 let goal=actor?chooseGoal(unit,actor,tick):
   unit.state==='search'||unit.state==='suspicious'||unit.state==='investigate'?unit.lastKnown:null;
 if(!goal){
  const path=unit.patrol||[];
  if(path.length){
   const i=((unit.patrolIndex||0)%path.length+path.length)%path.length;
   goal=path[i];
   if(dist(unit,goal)<1.65){unit.patrolIndex=(i+1)%path.length;goal=path[unit.patrolIndex];}
  }else{
   if(!unit.roamGoal||dist(unit,unit.roamGoal)<2||tick>(unit.roamUntil||0)){
    const home=unit.home||unit,angle=((tick*.047+unit.id.length)*2.3999632297)%(Math.PI*2);
    unit.roamGoal={x:home.x+Math.cos(angle)*(unit.guard?6:13),
       z:home.z+Math.sin(angle)*(unit.guard?6:13)};
    unit.roamUntil=tick+270;
   }
   goal=unit.roamGoal;
  }
 }
 if(!goal)return true;
 if(!actor&&unit.state!=='patrol'&&dist(unit,goal)<2)return true;
 const d=dist(unit,goal);
 if(d<.35)return true;
 const speed=(unit.sp??7)*(actor?1:unit.state==='patrol'?(unit.guard?.35:.5):.75),
   travel=Math.min(d,speed*.1),
   direction={x:unit.x+(goal.x-unit.x)*travel/d,z:unit.z+(goal.z-unit.z)*travel/d},
   attempt=to=>{
     if(!legal(world,unit,unit,to))return false;
     unit.x=to.x;unit.z=to.z;
     unit.y=world.locomotionAt(unit.x,unit.z,unit.y).floor+.06;
     return true;
   };
 // Reutilitzam una ruta entre snapshots; no es recalcula A* per fotograma.
 if(unit.navDestination&&dist(unit.navDestination,goal)>8){
  unit.navRoute=[];unit.navReplanTick=0;
 }
 unit.navDestination={x:goal.x,z:goal.z};
 if(unit.navRoute?.length){
  while(unit.navRoute.length&&dist(unit,unit.navRoute[0])<.9)unit.navRoute.shift();
  if(unit.navRoute.length){
   const node=unit.navRoute[0],nd=dist(unit,node),
     next={x:unit.x+(node.x-unit.x)*Math.min(nd,travel)/Math.max(.001,nd),
       z:unit.z+(node.z-unit.z)*Math.min(nd,travel)/Math.max(.001,nd)};
   if(attempt(next)){unit.heading=actor?face(unit,actor):face(unit,node);return true;}
   unit.navRoute=[];unit.navReplanTick=0;
  }
 }
 if(attempt(direction)){unit.heading=actor?face(unit,actor):face(unit,goal);return true;}
 if(tick>=(unit.navReplanTick||0)){
  // Quan un portal practicable tapa l'entrada, un soldat pot obrir-lo.
  // És una acció autoritativa; el client només reprodueix el nou estat.
  if(requestDoor(unit,goal)){
   // La col·lisió física s'ha reconstruït; aquesta instància 'world'
   // és anterior a l'obertura. Deixam que el tick següent la consulti.
   unit.navRoute=[];unit.navReplanTick=tick+3;return true;
  }
  unit.navRoute=planAround(world,unit,goal);
  unit.navReplanTick=tick+REPLAN_TICKS;
 }
 if(unit.navRoute?.length){
  const node=unit.navRoute[0],nd=dist(unit,node);
  const next={x:unit.x+(node.x-unit.x)*Math.min(nd,travel)/Math.max(.001,nd),
    z:unit.z+(node.z-unit.z)*Math.min(nd,travel)/Math.max(.001,nd)};
  if(attempt(next))unit.heading=actor?face(unit,actor):face(unit,node);
 }
 return true;
}
