// First optional rescue compound. Positions are local metres, shared with runtime NPCs.
// Soldiers advance timed waypoints: short legs keep their real idle patrol
// on the perimeter instead of skipping a corner through a building or the pen.
const patrolCorners=[[-50,-50],[55,-50],[55,45],[-50,45],[-50,-50]];
const prisonPatrol=patrolCorners.slice(1).flatMap((end,i)=>{
 const start=patrolCorners[i],steps=Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/16);
 return Array.from({length:steps},(_,k)=>[
  start[0]+(end[0]-start[0])*k/steps,start[1]+(end[1]-start[1])*k/steps
 ]);
});
prisonPatrol.push(patrolCorners[0]);
export const prisonCampLayout={
 id:'prison-camp',type:'prison-camp',name:'Camp de presoners',family:'military',friendly:false,
 phase:11,status:'design',variant:1,size:[130,130],fixedOrientation:true,
 subtitle:'Barracó de fusta · recinte de captius · quatre torres · una entrada',
 buildings:[
  // Extend the length of the fishing hut, preserving its narrow gable roof.
  {id:'prison-barracks',label:'Barracó llarg de fusta',x:0,z:-34,w:18,d:68,h:6,wood:true,weakWalls:true,rotationY:Math.PI/2},
  {id:'guardhouse',label:'Caseta de guàrdia',x:-40,z:24,w:14,d:12,h:5.5},
  // Workshop with three solid walls and a full-width open south (+Z) facade.
  // Its 12 m roof is roughly two storeys high, with no intermediate floor.
  {id:'prison-workshop',label:'Taller mecànic obert',x:33,z:2,w:24,d:24,h:12,workshop:true}
 ],
 // Davant de la façana sud del taller (z=14), no davant de l'entrada del camp.
 // El marge nord de 10 m deixa un passadís entre l'heliport i el taller.
 helipad:{x:36,z:39,size:30,clearRadius:17},
 vehicles:[],
 soldiers:[[-50,-50],[55,-50],[55,45],[-50,45],[-8,27],[8,27]],
 sentries:[{soldier:4,heading:Math.PI},{soldier:5,heading:Math.PI}],
 patrol:prisonPatrol,
 // La quarta torre queda a la línia est, lluny del disc i de les vores de l'heliport.
 towers:[{x:-56,z:-56},{x:56,z:-56},{x:-56,z:56},{x:56,z:8}],
 fence:[
  [[-62,-62],[62,-62]],[[62,-62],[62,62]],[[62,62],[12,62]],
  [[-12,62],[-62,62]],[[-62,62],[-62,-62]]
 ],
 prisonerFence:[
  [[-20,-10],[20,-10]],[[20,-10],[20,24]],[[20,24],[5,24]],
  [[-5,24],[-20,24]],[[-20,24],[-20,-10]]
 ],
 prisonerGate:[[-5,24],[5,24]],
 entrances:[[0,65]],
 routes:[
  {label:'Accés rodat · 14 m',points:[[0,65],[0,50]],width:14},
  {label:'Accés al taller sense travessar l’heliport',points:[[0,50],[16,50],[16,29],[21,25],[28,19],[33,18]],width:6},
  {label:'Accés a l’heliport',points:[[0,50],[16,50],[16,57],[36,57],[36,54]],width:6},
  {label:'Caseta de guàrdia',points:[[-40,32],[-40,36],[0,36]],width:4},
  {label:'Mecànic alliberat',points:[[0,27],[16,29],[21,25],[28,19],[33,18],[40,8]],width:4},
  {label:'Porta dels presoners',points:[[0,36],[0,16],[0,-6]],width:5}
 ],
 zones:[
  {label:'Recinte tancat dels captius',x:0,z:7,w:40,d:34},
  {label:'Taller cobert, tres parets · 24 × 24 m',x:33,z:2,w:24,d:24},
  {label:'Heliport davant del taller · 30 × 30 m',x:36,z:39,w:30,d:30}
 ],
 props:[['flag',-51,-3],['lamp',-20,48],['lamp',52,15],['crate',-42,-26],['barrel',44,-26]],
 loot:[{kind:'farmaciola',x:-40,z:24}],
 prisoners:[
  {id:'farmer-1',role:'farmer',x:-8,z:-6},
  {id:'farmer-2',role:'farmer',x:-3,z:-6},
  {id:'farmer-3',role:'farmer',x:3,z:-6},
  {id:'farmer-4',role:'farmer',x:8,z:-6},
  {id:'mechanic-1',role:'mechanic',x:0,z:3}
 ],
 rescuePoint:{x:0,z:27},
 mechanicStation:{x:40,z:8},
 mechanicAccess:[[16,29],[21,25],[28,19],[33,18],[40,8]],
 mechanicRoute:[[0,16],[0,27],[16,29],[21,25],[28,19],[33,18],[40,8]],
 escapeRoute:[[0,16],[0,30],[0,62],[0,86]],
 counts:'4 camperols · 1 mecànic · 4 soldats patrullant · 2 sentinelles · 4 torres',
 notes:'Oportunitat opcional: cap presoner és necessari per arribar al general. Una única entrada sud de 24 m travessa la filferrada exterior. Els captius són dins un segon recinte amb porta tancada, custodiada per dos soldats. En alliberar-los s’obre la porta interior. El mecànic alliberat és l’única font de reparació de vehicles; treballa a un costat del taller de tres parets i 12 m d’altura. El taller queda endarrerit fins al límit nord de la filferrada interior (z=-10) i l’heliport de 30 m se situa davant de la façana oberta del taller, no davant de la porta del recinte. El pas del mecànic voreja la plataforma. Cap fabricació ni diàleg llarg.'
};
