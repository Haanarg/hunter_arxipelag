import {phase3Layouts} from './compound-phase3-layouts.mjs';
import {phase2Layouts} from './compound-phase2-layouts.mjs';
// Shared approved layouts: game generation and Three.js preview, in metres.
// Coordinates: X east, Z south; building doors face +Z unless specified otherwise.
export const compoundLayouts=[
 {id:'hangar',name:'Hangar i taller',subtitle:'Sortida del tanc · pati de maniobres · taller lateral',size:[100,110],
  buildings:[{id:'hangar',label:'Hangar',x:-20,z:-12,w:36,d:38,h:18,hangar:true},{id:'workshop',label:'Taller',x:29,z:-21,w:18,d:18,h:7}],
  vehicles:[{t:'tanc',x:-20,z:-5,hd:Math.PI},{t:'cotxe',x:29,z:13,hd:Math.PI}],
  soldiers:[[-39,19],[13,2],[36,32]],
  routes:[{label:'Sortida blindats · 18 m',points:[[-20,0],[-20,38],[0,38],[0,55]],width:18},{label:'Accés taller',points:[[13,2],[29,2],[29,-10]],width:4}],
  patrol:[[-41,24],[-41,-36],[11,-36],[11,23],[37,23],[37,39],[-41,39],[-41,24]],
  zones:[{label:'Maniobra · 30 × 24 m',x:-15,z:36,w:30,d:24},{label:'Aparcament',x:29,z:13,w:10,d:15}],
  props:[['fuel',30,-40],['fuel',38,-40],['crate',42,-14],['crate',42,-10],['barrel',42,-5],['flag',9,-19],['lamp',-39,28],['lamp',12,39]],
  loot:[{kind:'munició',x:25,z:-20},{kind:'farmaciola',x:33,z:-20}],
  tower:null,entrances:[[0,55]],counts:'1 tanc · 1 cotxe · 3 soldats · munició i farmaciola',
  notes:'La boca de 30 m queda lliure. El tanc surt endavant cap al pati i disposa de 18 m d’amplada reservada fins a l’accés. Combustible i caixes queden darrere del taller.'},
 {id:'outpost',fence:[[[-42,-40],[42,-40]],[[42,-40],[42,40]],[[42,40],[12,40]],[[-12,40],[-42,40]],[[-42,40],[-42,28]],[[-42,12],[-42,-40]]],name:'Avançada',subtitle:'Filferrada · dues entrades · patrulla perimetral',size:[90,90],
  buildings:[{id:'barracks',label:'Caserna',x:-18,z:-7,w:18,d:24,h:7},{id:'guard',label:'Guàrdia',x:21,z:16,w:12,d:12,h:6}],
  vehicles:[{t:'moto',x:21,z:33,hd:-Math.PI/2}],soldiers:[[-32,20],[0,22],[30,-10],[14,4]],
  routes:[{label:'Accés principal · 12 m',points:[[0,45],[0,10],[0,-28]],width:12},{label:'Accés lateral · 6 m',points:[[-45,20],[-31,20],[-18,20],[0,20]],width:6},{label:'Caserna',points:[[-18,6],[-18,12],[0,12]],width:4},{label:'Guàrdia',points:[[0,27],[21,27],[21,24]],width:4}],
  patrol:[[-33,20],[-33,-29],[12,-29],[12,-8],[31,-8],[31,3],[0,3],[0,27],[-33,27],[-33,20]],
  zones:[{label:'Pati central',x:0,z:5,w:12,d:20}],
  props:[['sandbag',-14,36],['sandbag',14,39],['sandbag',34,-17],['crate',-23,-28],['crate',-19,-28],['barrel',-14,-28],['flag',6,-20],['lamp',-8,30],['lamp',30,-30]],
  loot:[{kind:'munició',x:-21,z:-8},{kind:'granades',x:-15,z:-8}],tower:{x:26,z:-25},entrances:[[0,45],[-45,20]],counts:'1 moto · 4 soldats · 1 torre · munició i granades',
  notes:'La caserna i la guàrdia deixen un eix central lliure. La filferrada conserva dues obertures: la principal i una de lateral per infiltrar-se o escapar. La torre domina l’exterior i les patrulles tenen un circuit propi.'},
 {id:'port',name:'Port militar',subtitle:'Dos molls · tres amarradors · càrrega a terra',size:[110,120],
  buildings:[{id:'warehouse',label:'Magatzem',x:-28,z:-25,w:24,d:18,h:8},{id:'office',label:'Oficina',x:26,z:-26,w:16,d:16,h:7}],
  vehicles:[{t:'llanxa',x:-13,z:31,hd:Math.PI},{t:'moto_aquatica',x:15,z:26,hd:Math.PI},{t:'llanxa_coets',x:35,z:34,hd:Math.PI}],soldiers:[[-42,-4],[-10,-8],[10,-5],[26,4],[-24,39]],
  routes:[{label:'Accés càrrega · 14 m',points:[[0,-60],[0,-14],[0,2]],width:14},{label:'Passeig del moll · 6 m',points:[[-46,6],[46,6]],width:6},{label:'Magatzem',points:[[-28,-14],[-28,-7],[0,-7]],width:5},{label:'Oficina',points:[[26,-16],[26,-8],[0,-8]],width:4}],
  patrol:[[-49,-7],[-49,-43],[38,-43],[38,4],[-24,4],[-24,40],[-24,4],[-49,4],[-49,-7]],
  zones:[{label:'Càrrega · 18 × 12 m',x:-28,z:-6,w:18,d:12}],
  props:[['crate',-44,-27],['crate',-44,-23],['crate',-44,-19],['fuel',43,-25],['barrel',43,-20],['flag',12,-28],['lamp',-44,0],['lamp',43,0]],
  loot:[{kind:'munició',x:-32,z:-25},{kind:'granades',x:-24,z:-25},{kind:'mapa',x:26,z:-26}],
  tower:{x:43,z:-43},entrances:[[0,-60]],counts:'3 embarcacions · 5 soldats · 1 torre · munició, granades i mapa',
  notes:'El magatzem obre al pati de càrrega. Els molls de 6 m deixen tres places separades i sortida directa cap al mar. La llanxa llançacoets representa la variant especial d’un únic port per mapa.'}
,...phase2Layouts,...phase3Layouts];
