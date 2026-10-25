// First optional rescue compound. Positions are local metres, shared with runtime NPCs.
export const prisonCampLayout={
 id:'prison-camp',type:'prison-camp',name:'Camp de presoners',family:'military',friendly:false,
 phase:11,status:'design',variant:1,size:[130,130],fixedOrientation:true,
 subtitle:'Camperols captius · mecànic · taller exterior · entrada de 24 m',
 buildings:[
  {id:'guardhouse',label:'Caserna de vigilància',x:-34,z:-27,w:22,d:22,h:7},
  {id:'prison-workshop',label:'Taller del camp',x:33,z:-28,w:24,d:20,h:7}
 ],
 vehicles:[],
 soldiers:[[-48,-44],[48,-44],[48,45],[-48,45]],
 patrol:[[-48,-44],[48,-44],[48,45],[-48,45],[-48,-44]],
 fence:[
  [[-62,-62],[62,-62]],[[62,-62],[62,62]],[[62,62],[12,62]],
  [[-12,62],[-62,62]],[[-62,62],[-62,-62]]
 ],
 entrances:[[0,65]],
 routes:[
  {label:'Accés rodat · 14 m',points:[[0,65],[0,36],[33,36],[33,16]],width:14},
  {label:'Caserna',points:[[-34,-15],[-34,14],[0,14]],width:4},
  {label:'Taller',points:[[33,-17],[33,16]],width:6},
  {label:'Pati de presoners',points:[[0,36],[0,8],[0,-6]],width:5}
 ],
 zones:[
  {label:'Pati dels captius',x:0,z:0,w:26,d:24},
  {label:'Reparació exterior · 24 × 24 m',x:33,z:16,w:24,d:24}
 ],
 props:[['flag',-51,-3],['lamp',-20,48],['lamp',52,15],['crate',-47,-28],['barrel',49,-26]],
 loot:[{kind:'farmaciola',x:-34,z:-27}],
 prisoners:[
  {id:'farmer-1',role:'farmer',x:-8,z:-6},
  {id:'farmer-2',role:'farmer',x:-3,z:-6},
  {id:'farmer-3',role:'farmer',x:3,z:-6},
  {id:'farmer-4',role:'farmer',x:8,z:-6},
  {id:'mechanic-1',role:'mechanic',x:0,z:3}
 ],
 rescuePoint:{x:0,z:8},
 mechanicStation:{x:33,z:16},
 escapeRoute:[[0,8],[0,30],[0,62],[0,86]],
 counts:'4 camperols · 1 mecànic · 4 soldats · taller amb accés per a camions',
 notes:'Oportunitat opcional: cap presoner és necessari per arribar al general. La porta sud deixa 24 m lliures i el pati és exterior. El mecànic alliberat és l’única font de reparació de vehicles. Cap fabricació ni diàleg llarg.'
};
