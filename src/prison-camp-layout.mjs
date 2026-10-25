// First optional rescue compound. Positions are local metres, shared with runtime NPCs.
// Soldiers advance timed waypoints: short legs keep their real idle patrol
// on the perimeter instead of skipping a corner through a building or the pen.
const patrolCorners=[[-50,-50],[50,-50],[50,45],[-50,45],[-50,-50]];
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
  {id:'prison-barracks',label:'Barracó llarg de fusta',x:0,z:-34,w:18,d:68,h:6,wood:true,rotationY:Math.PI/2},
  {id:'guardhouse',label:'Caseta de guàrdia',x:-40,z:24,w:14,d:12,h:5.5}
 ],
 vehicles:[],
 soldiers:[[-50,-50],[50,-50],[50,45],[-50,45],[-8,27],[8,27]],
 sentries:[{soldier:4,heading:Math.PI},{soldier:5,heading:Math.PI}],
 patrol:prisonPatrol,
 towers:[{x:-56,z:-56},{x:56,z:-56},{x:-56,z:56},{x:56,z:56}],
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
  {label:'Accés rodat · 14 m',points:[[0,65],[0,36],[33,36],[33,16]],width:14},
  {label:'Caseta de guàrdia',points:[[-40,32],[-40,36],[0,36]],width:4},
  {label:'Mecànic alliberat',points:[[0,27],[33,27],[33,16]],width:4},
  {label:'Porta dels presoners',points:[[0,36],[0,16],[0,-6]],width:5}
 ],
 zones:[
  {label:'Recinte tancat dels captius',x:0,z:7,w:40,d:34},
  {label:'Reparació exterior · 24 × 24 m',x:33,z:16,w:24,d:24}
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
 mechanicStation:{x:33,z:16},
 mechanicRoute:[[0,16],[0,27],[33,27],[33,16]],
 escapeRoute:[[0,16],[0,30],[0,62],[0,86]],
 counts:'4 camperols · 1 mecànic · 4 soldats patrullant · 2 sentinelles · 4 torres',
 notes:'Oportunitat opcional: cap presoner és necessari per arribar al general. Una única entrada sud de 24 m travessa la filferrada exterior. Els captius són dins un segon recinte amb porta tancada, custodiada per dos soldats. En alliberar-los s’obre la porta interior. El mecànic alliberat és l’única font de reparació de vehicles; la seva badia exterior admet camions. Cap fabricació ni diàleg llarg.'
};
