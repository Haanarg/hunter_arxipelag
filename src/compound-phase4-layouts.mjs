// Shared authored layouts. Runtime excludes road checkpoints and the coast mockup.
import {compoundLayouts} from './compound-layouts.mjs';
const route=(label,points,width=4,kind='path')=>({label,points,width,kind});
const building=(id,label,x,z,w,d,h=6,extra={})=>({id,label,x,z,w,d,h,...extra});
const vehicle=(t,x,z,hd=Math.PI)=>({t,x,z,hd});
const draft=(data)=>({phase:4,status:'design',friendly:true,boundary:'open',buildings:[],vehicles:[],soldiers:[],routes:[],patrol:[],zones:[],props:[],loot:[],entrances:[],...data});
export const newWorldLayouts=[
 draft({id:'civil-dock',name:'Embarcador civil',family:'civil',size:[110,120],subtitle:'Pesca local · passera en T · accés discret',
  waterfront:{shore:10},piers:[{x:-18,z:30,w:5,d:40},{x:-18,z:48,w:34,d:5}],
  buildings:[building('fish-store','Caseta de pesca',-30,-24,18,14,6,{wood:true}),building('shelter','Cobert de xarxes',30,-20,16,12,5.2,{wood:true})],
  vehicles:[vehicle('barca_rems',-35,35),vehicle('windsurf',34,31),vehicle('bici',35,-40)],
  routes:[route('Camí costaner · 6 m',[[0,-60],[0,0],[-18,0],[-18,10]],6),route('Caseta',[[-30,-16],[-30,0],[0,0]]),route('Xarxes',[[30,-13],[30,0],[0,0]])],
  zones:[{label:'Descàrrega manual',x:29,z:0,w:16,d:10}],props:[['crate',-41,-22],['barrel',39,-20],['lamp',-26,5],['bench',24,2],['lifebuoy',-21,22]],
  loot:[{kind:'farmaciola',x:-30,z:-24}],entrances:[[0,-60]],counts:'Barca de rems · windsurf · bicicleta · 2 casetes',
  notes:'Embarcador sense guarnició fixa ni armament militar garantit. Passera de 5 m, capçal de 34 m i embarcacions als laterals, fora del pas. Pot ser una alternativa tranquil·la als ports militars; requereix aigua navegable al davant.'}),
 draft({id:'ferry-terminal',name:'Terminal de ferri',family:'civil',size:[180,190],subtitle:'Carril d’embarcament · cua lateral · passeig segregat',
  waterfront:{shore:18},piers:[{x:0,z:25,w:18,d:21},{x:-25,z:44,w:5,d:53}],
  buildings:[building('ticket','Bitllets i espera',-48,-25,26,22,7),building('freight','Magatzem de càrrega',50,-36,28,24,8)],
  vehicles:[vehicle('ferry',0,62),vehicle('camio',0,-32),vehicle('cotxe',29,-9),vehicle('bici',-66,-4)],
  routes:[route('Accés rodat · 14 m',[[0,-95],[0,32]],14,'road'),route('Cua de reserva',[[29,-70],[29,3],[0,3]],9,'road'),route('Vianants · 5 m',[[-70,-95],[-70,-8],[-25,-8],[-25,68]],5),route('Càrrega',[[50,-22],[50,-11],[29,-11]],6)],
  zones:[{label:'Cua · 3 vehicles lleugers',x:29,z:-34,w:10,d:52},{label:'Evitar obstacles a la rampa',x:0,z:24,w:18,d:18}],
  props:[['lamp',-13,9],['lamp',44,9],['bench',-63,-7],['bench',-41,-7],['crate',66,-35],['lifebuoy',-28,32]],loot:[{kind:'farmaciola',x:-48,z:-25}],entrances:[[0,-95],[-70,-95]],
  counts:'1 plaça de ferri · rampa de 18 m · carril de 14 m · pas de vianants de 5 m',
  notes:'El ferri es mostra amarrat amb la proa cap a mar. La terminal reserva espai per a una de les dues unitats del mapa; no n’afegeix una tercera. Cua i vianants separats. La integració haurà d’ajustar la rampa a la coberta i a l’onatge, i reservar 45 m de sortida lliure mar endins.'}),
 draft({id:'road-checkpoint',name:'Control de carretera',family:'military',friendly:false,size:[130,140],subtitle:'Pas de 10 m · inspecció lateral · escapada a peu',
  buildings:[building('guard','Guàrdia',-29,-19,16,16,6),building('inspection','Cobert d’inspecció',36,13,24,22,7)],
  vehicles:[vehicle('cotxe',-34,34)],soldiers:[[-16,-10],[17,7],[49,35]],
  routes:[route('Carretera · 10 m',[[0,-70],[0,70]],10,'road'),route('Inspecció · 9 m',[[0,-50],[36,-50],[36,-1]],9,'road'),route('Sortida inspecció',[[36,26],[36,50],[0,50]],9,'road'),route('Pas lateral a peu',[[-55,-70],[-55,70]],4),route('Accés guàrdia',[[-29,-10],[-29,6],[-12,6]],4)],
  barriers:[{x:0,z:-6,w:9.5}],zones:[{label:'Aturada i control',x:0,z:-22,w:10,d:22}],
  patrol:[[-44,-35],[-44,51],[53,51],[53,-35],[-44,-35]],props:[['sandbag',-14,-7],['sandbag',15,-7],['lamp',-14,18],['crate',-33,-20]],loot:[{kind:'munició',x:-29,z:-19}],entrances:[[0,-70],[0,70],[-55,70]],
  counts:'3 soldats · 1 jeep · barrera de pas · via lateral a peu',
  notes:'Ha d’aparèixer sobre una carretera real, mai com una porta aïllada al camp. El carril central conserva 10 m; la barrera és una proposta mòbil o destruïble per a una fase posterior. El cobert té obertures als dos extrems. El camí lateral permet evitar el control a peu.',
  throughBuildings:['inspection']}),
 draft({id:'hut-settlement',name:'Assentament de cabanes',family:'civil',size:[140,140],subtitle:'Plaça comuna · xarxa de senders · sis habitatges',
  buildings:[building('hut1','Cabana 1',-38,-35,16,14,5.2,{wood:true}),building('hut2','Cabana 2',0,-43,14,12,5.6,{wood:true}),building('hut3','Cabana 3',38,-32,18,14,5.2,{wood:true}),building('hut4','Cabana 4',-40,18,16,14,5.4,{wood:true}),building('hut5','Cabana 5',38,24,14,12,5.2,{wood:true}),building('store','Magatzem comunal',-8,42,18,14,6,{wood:true})],
  routes:[route('Entrada principal',[[0,-70],[18,-70],[18,0],[0,0]],5),route('Travessa',[[-70,0],[70,0]],5),route('Cabana nord-oest',[[-38,-27],[-38,0]]),route('Cabana nord',[[0,-36],[0,0]]),route('Cabana nord-est',[[38,-24],[38,0]]),route('Cabana sud-oest',[[-40,26],[-22,26],[-22,0]]),route('Cabana sud-est',[[38,31],[20,31],[20,0]]),route('Magatzem',[[-8,50],[-8,61],[20,61],[20,31]])],
  vehicles:[vehicle('bici',-21,-12),vehicle('moto',56,17)],zones:[{label:'Plaça · 22 × 20 m',x:0,z:5,w:22,d:20}],
  props:[['well',0,5],['bench',-9,14],['bench',9,14],['crate',-12,41],['barrel',-51,18],['lamp',16,-9]],loot:[{kind:'farmaciola',x:-8,z:42}],entrances:[[18,-70],[-70,0],[70,0]],counts:'6 construccions de fusta · pou · 1 moto · 1 bicicleta',
  notes:'Conjunt civil sense soldats permanents ni personatges civils nous en aquesta fase. Cabanyes petites amb cobertes retirables, porxos i passos de 4–5 m. La plaça funciona com a referència visual i espai per orientar-se; els subministraments són modestos.'})
];
const fence=(x,z,lateral=false)=>[[[-x,-z],[x,-z]],[[x,-z],[x,z]],[[x,z],[12,z]],[[-12,z],[-x,z]],...(lateral?[[[-x,z],[-x,28]],[[-x,12],[-x,-z]]]:[[[-x,z],[-x,-z]]])];
const clone=v=>JSON.parse(JSON.stringify(v));
// Each variant has an authored placement schedule; geometry and guaranteed loot reuse the approved models.
function variant(type,number,title,placements,options={}){
 const source=compoundLayouts.find(l=>l.id===type),l=clone(source);
 Object.assign(l,{id:type+'-v'+number,type,phase:4,status:'design',variant:number,name:source.name+' · '+title,subtitle:options.subtitle||title,size:options.size||[160,150],boundary:'open',...options});
 l.buildings=source.buildings.map(b=>({...b,x:placements[b.id][0],z:placements[b.id][1]}));
 if(options.extraBuildings)l.buildings.push(...options.extraBuildings);
 const reposition=p=>{const b=source.buildings.reduce((best,b)=>Math.hypot(p.x-b.x,p.z-b.z)<Math.hypot(p.x-best.x,p.z-best.z)?b:best,source.buildings[0]),q=l.buildings.find(q=>q.id===b.id);return {...p,x:p.x+q.x-b.x,z:p.z+q.z-b.z}};
 l.loot=source.loot.map(reposition);l.props=source.props.map(([kind,x,z])=>{const p=reposition({x,z});return[kind,p.x,p.z]});
 l.vehicles=options.vehicles||[];
 const edgeX=l.size[0]/2-10,edgeZ=l.size[1]/2-12,lane=options.lane||46;
 l.routes=options.routes||[route('Accés principal · 16 m',[[0,l.size[1]/2],[0,lane]],16,'road'),...l.buildings.map(b=>{const front=b.z+b.d/2+1,inner=b.hangar?b.x:b.x-Math.sign(b.x)*(b.w/2+7);return route(b.label,[[b.x,front],[inner,front],[inner,lane],[0,lane]],b.hangar?18:4)})];
 l.entrances=options.entrances||[[0,l.size[1]/2]];
 l.patrol=source.friendly?[]:[[-edgeX,-edgeZ],[edgeX,-edgeZ],[edgeX,edgeZ],[-edgeX,edgeZ],[-edgeX,-edgeZ]];
 l.soldiers=source.soldiers.map((p,i)=>{const t=i/source.soldiers.length*4,side=Math.floor(t),f=t-side,a=l.patrol[side],b=l.patrol[side+1];return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]});
 l.zones=options.zones||[{label:'Maniobra i distribució',x:0,z:lane,w:30,d:14}];
 if(source.fence)l.fence=fence(l.size[0]/2-4,l.size[1]/2-5,type==='outpost');
 if(type==='outpost'){l.entrances.push([-l.size[0]/2,20]);l.routes.push(route('Segona obertura · 6 m',[[-l.size[0]/2,20],[0,20],[0,lane]],6))}
 if(source.general)l.general=reposition(source.general);
 if(source.spawn)l.spawn={x:0,z:lane-12};
 if(source.tower)l.tower={x:edgeX-6,z:-edgeZ+6};
 l.notes=options.notes+' Es conserven els objectes garantits del tipus original.';
 l.counts=source.counts+' · variant '+number;
 return l;
}
export const compoundVariants=[
 variant('hangar',2,'Pati transversal',{hangar:[-37,-22],workshop:[40,-30]},{vehicles:[vehicle('tanc',-37,-15),vehicle('cotxe',40,14)],notes:'Hangar i taller a profunditats diferents, amb una esplanada transversal ampla. La sortida del blindat té 18 m i el servei rodat queda a llevant.'}),
 variant('hangar',3,'Taller avançat',{hangar:[0,-35],workshop:[-48,16]},{size:[170,170],lane:56,vehicles:[vehicle('tanc',0,-28),vehicle('cotxe',43,19)],notes:'Hangar al fons, taller a l’entrada occidental i aparcament a l’est. Eix recte del blindat i dues bosses de servei.'}),
 variant('outpost',2,'Caserna transversal',{barracks:[-29,-25],guard:[35,-9]},{vehicles:[vehicle('moto',37,34)],notes:'Pati ample entre caserna i guàrdia. Accés principal al sud i obertura lateral occidental per a infiltració; torre al nord-est.'}),
 variant('outpost',3,'Guàrdia avançada',{barracks:[0,-30],guard:[36,8]},{size:[140,140],vehicles:[vehicle('moto',30,32)],notes:'Caserna al fons de l’eix central i guàrdia avançada a llevant. La travessa lateral queda al sud dels dos edificis i connecta amb l’entrada principal.'}),
 variant('port',2,'Moll central',{warehouse:[-38,-30],office:[39,-26]},{size:[150,150],waterfront:{shore:8},piers:[{x:0,z:34,w:8,d:52}],vehicles:[vehicle('llanxa',-16,34),vehicle('moto_aquatica',17,24),vehicle('llanxa_coets',19,51)],routes:[route('Càrrega',[[0,-75],[0,8]],14,'road'),route('Passeig',[[-65,0],[65,0]],6),route('Magatzem',[[-38,-20],[-38,0],[0,0]],5),route('Oficina',[[39,-17],[39,0],[0,0]])],entrances:[[0,-75]],notes:'Un únic espigó de 8 m separa les embarcacions a banda i banda. Magatzem a ponent, oficina a llevant i accés de càrrega pel centre.'}),
 variant('port',3,'Dàrsena oberta',{warehouse:[-32,-41],office:[40,-40]},{size:[170,170],waterfront:{shore:2},piers:[{x:-44,z:30,w:7,d:58},{x:44,z:30,w:7,d:58}],vehicles:[vehicle('llanxa',-29,26),vehicle('moto_aquatica',29,19),vehicle('llanxa_coets',29,45)],routes:[route('Càrrega',[[0,-85],[0,-9]],14,'road'),route('Molls',[[-44,2],[-44,-9],[44,-9],[44,2]],6),route('Magatzem',[[-32,-28],[-32,-9]],5),route('Oficina',[[40,-31],[40,-9]])],entrances:[[0,-85]],notes:'Dos molls llargs als laterals deixen una boca central de maniobra. Les rutes terrestres passen pel darrere del front marítim.'}),
 variant('heliport',2,'Fortificat amb torre',{control:[43,-26],'air-store':[43,14]},{helipad:{x:-34,z:-10,size:40,clearRadius:22},tower:{x:62,z:-57},vehicles:[vehicle('heli_combat',-34,-10)],notes:'Plataforma de combat a ponent, torre elevada al nord-est i control separat. Torre, edificis i combustible fora del disc de 22 m dels rotors.'}),
 variant('heliport',3,'Servei en línia',{control:[-43,-29],'air-store':[-43,14]},{helipad:{x:32,z:-10,size:40,clearRadius:22},vehicles:[vehicle('heli',32,-10)],notes:'Plataforma a llevant i edificis en una franja de servei a ponent. Embarcament pel sud i accés de combustible pel darrere.'}),
 variant('polvori',2,'Pati de càrrega ample',{'ammo-store':[-38,-26],'heavy-store':[38,-26],guard:[-48,24]},{size:[170,160],lane:57,vehicles:[vehicle('camio',0,35)],notes:'Magatzems separats per una franja de càrrega central ampla. Guàrdia al flanc occidental; camió orientat cap a la sortida sense passar entre caixes.'}),
 variant('polvori',3,'Guàrdia al fons',{'ammo-store':[-39,-9],'heavy-store':[39,-9],guard:[0,-49]},{size:[170,160],vehicles:[vehicle('camio',0,38)],notes:'Dos magatzems paral·lels i guàrdia al fons del corredor. L’accés central de càrrega i el circuit a peu continuen separats.'}),
 variant('comunicacions',2,'Plataforma de carena',{radio:[-35,-25],service:[38,16]},{antenna:{x:40,z:-33,height:84,scale:3,smallDish:false},satellite:null,vehicles:[vehicle('cotxe',37,49)],notes:'Implantació prevista sobre una carena ampla accessible, amb ràdio de dues plantes a ponent i només antena a llevant, ampliada un 50% (84 m de torre). El terreny ha de reservar plataforma i camí sense pendents abruptes; l’elevació és un criteri futur del generador.'}),
 variant('comunicacions',3,'Pati de ràdio',{radio:[-15,-32],service:[40,14]},{antenna:null,satellite:{buildingId:'radio',radius:9,scale:1.5},vehicles:[vehicle('cotxe',-38,49)],notes:'Sala de ràdio de dues plantes al fons amb una única parabòlica de 27 m de diàmetre, sense torre d’antena, i servei tècnic a llevant. Edificis al voltant d’un pati de distribució, amb accés meridional lliure.'}),
 variant('base',2,'Plaça oberta',{barracks:[-43,-26],store:[0,-34],clinic:[43,-22]},{vehicles:[vehicle('cotxe',-35,24),vehicle('bici',-54,24)],notes:'Tres serveis al voltant d’una plaça de sortida ampla. L’accés meridional serveix de punt d’ancoratge del camí base–costa, sense enemics.'}),
 variant('base',3,'Serveis esglaonats',{barracks:[-42,-29],store:[39,-28],clinic:[-40,20]},{size:[180,170],lane:59,vehicles:[vehicle('cotxe',39,23),vehicle('bici',57,23)],notes:'Caserna i magatzem al fons, infermeria al costat occidental de l’entrada i aparcament a llevant. Carril central continu fins al camí costaner.'}),
 ...[2,3].map(n=>variant('hq',n,n===2?'Búnquer oriental':'Doble pati',{bunker:[n===2?30:-40,-29],barracks:[n===2?-54:20,n===2?-28:-43],supply:[n===2?-51:62,n===2?30:24]},{size:[270,270],lane:65,vehicles:[vehicle('tanqueta',-88,-90,Math.PI/2),vehicle('tanqueta',88,90,-Math.PI/2),vehicle('cotxe',-122,0,0),vehicle('cotxe',122,0,Math.PI)],towers:[{x:-106,z:-106},{x:106,z:-106},{x:-106,z:106},{x:106,z:106}],vehiclePatrols:[{label:'Tanqueta nord',points:[[-88,-90],[88,-90],[88,-81],[-88,-81],[-88,-90]],width:8},{label:'Tanqueta sud',points:[[88,90],[-88,90],[-88,81],[88,81],[88,90]],width:8},{label:'Jeeps exteriors',points:[[-122,0],[-122,-122],[122,-122],[122,122],[-122,122],[-122,0]],width:10}],notes:n===2?'Búnquer desplaçat a llevant, dos edificis de suport a ponent i gran pati central.':'Búnquer a ponent i serveis esglaonats a llevant; dos patis units per un accés en angle.'}))
];
// Coastal patrols stay ashore; aircraft boarding paths end outside the rotor reserve.
for(const l of compoundVariants){
 if(l.type==='port'){l.patrol=[[-65,-61],[65,-61],[65,-6],[-65,-6],[-65,-61]];l.soldiers=[[-57,-12],[-15,-12],[16,-12],[55,-12],[0,-55]];l.tower={x:62,z:-58}}
 if(l.type==='heliport'){if(l.tower)l.counts+=' · 1 torre';const p=l.helipad;l.routes.push(route('Embarcament',[[0,46],[p.x,46],[p.x,p.z+p.clearRadius+2]]))}
 if(l.type==='hq'){l.fence=fence(112,112);l.patrol=[[-82,-69],[82,-69],[82,68],[-82,68],[-82,-69]];const b=l.buildings.find(b=>b.bunker);l.soldiers=[[-72,60],[72,60],[-73,-60],[73,-60],[-15,50],[15,50],[b.x-10,b.z-5],[b.x+10,b.z-5]]}
}
const base=clone(compoundLayouts.find(l=>l.id==='base'));
// Design distance only: the generator must solve a real walkable path, not stamp this fixed polyline.
export const coastConnection=draft({...base,id:'base-coast',type:'base-coast',phase:4,status:'design',family:'connection',name:'Connexió base–costa',size:[220,400],boundary:'open',waterfront:{shore:132},
 buildings:base.buildings.map(b=>({...b,z:b.z-100})).concat([building('boathouse','Caseta costanera',-43,102,18,14,6,{wood:true})]),
 vehicles:base.vehicles.map(v=>({...v,z:v.z-100})).concat([vehicle('barca_rems',-15,166),vehicle('llanxa',19,171)]),spawn:{x:0,z:-80},
 props:base.props.map(([k,x,z])=>[k,x,z-100]).concat([['lamp',-9,112],['lifebuoy',-4,144],['bench',-31,117]]),loot:base.loot.map(p=>({...p,z:p.z-100})),
 routes:base.routes.map(r=>({...r,points:r.points.map(([x,z])=>[x,z-100])})).concat([route('Camí rodat · 8 m',[[0,-45],[0,-18],[30,16],[30,58],[0,94],[0,120]],8,'road'),route('Drecera a peu · 3 m',[[0,-18],[-24,26],[-24,80],[0,112]],3),route('Caseta',[[-43,110],[-43,120],[0,120]])]),
 piers:[{x:0,z:157,w:6,d:50}],zones:[{label:'Gir i aparcament · 24 × 18 m',x:0,z:117,w:24,d:18}],entrances:[[0,-45],[0,132]],counts:'Base completa · camí de 8 m · sender de 3 m · embarcador de 6 m',
 notes:'Connexió contínua amb carretera, drecera a peu, espai de gir i passera. Proposta de 150–350 m segons la costa real; pendent objectiu ≤10%, validació de vehicle i caminant abans de col·locar-la. Barca de rems garantida prevista; la llanxa mostra l’alternativa. Si no hi ha costa accessible, cal cercar un altre emplaçament, no dibuixar un camí sobre obstacles.'});
// Three irregular settlement sizes with varied doorway directions.
const settlementSource=clone(newWorldLayouts.find(l=>l.id==='hut-settlement'));
function settlement(id,title,count,radius,size){
 const l=clone(settlementSource);Object.assign(l,{id,name:'Assentament · '+title,size:[size,size],settlement:true,hutCount:count});
 const positions=[[-30,-26,0],[9,-33,Math.PI/2],[31,8,Math.PI],[-29,23,-Math.PI/2],[4,34,Math.PI],[52,-26,0],[-54,-2,Math.PI/2],[45,42,-Math.PI/2]];
 l.buildings=positions.slice(0,count).map(([x,z,rotationY],i)=>building('hut'+(i+1),'Cabana '+(i+1),x,z,14+(i%2)*2,12,5.2,{wood:true,rotationY}));
 const x=count===3?5:-8,z=count===3?24:4;
 l.buildings.push(building('store','Cabana comunal',x,z,18,14,6,{wood:true,rotationY:count===3?Math.PI:0}));
 l.routes=[route('Pas principal',[[l.size[0]/2, -6],[16,-6],[16,17],[6,17]],4)];
 l.entrances=[[l.size[0]/2,-6]];
 l.props=[['well',-15,-14],['bench',-21,-14],['bench',-9,-14],['lamp',16,-19]];
 l.vehicles=[vehicle('bici',20,-14),vehicle('moto',29,-14)];l.loot=[{kind:'farmaciola',x,z}];
 l.zones=[{label:'Plaça comuna',x:-15,z:-14,w:16,d:10}];
 l.subtitle=count+' habitatges i cabana comunal · distribució irregular';
 l.counts=count+' cabanes + 1 comunal · pou · moto i bicicleta';
 l.notes='Poblat '+title.toLowerCase()+': '+count+' habitatges i una cabana comunal. Agrupació irregular, amb portes i porxos en direccions diferents i una única traça principal de pas i finestres obertes sense vidres. Cobertes de branques a dos aiguavessos.';
 return l;
}
export const settlementLayouts=[settlement('hut-settlement-small','Petit',3,34,110),settlement('hut-settlement','Mitjà',5,43,140),settlement('hut-settlement-large','Gran',8,62,180)];
newWorldLayouts.splice(newWorldLayouts.findIndex(l=>l.id==='hut-settlement'),1,...settlementLayouts);
// V4 is an explicit replacement, not an extra building or an extra storey on every building.
const replacementIds={hangar:'workshop',outpost:'guard',port:'office',heliport:'control',polvori:'guard',comunicacions:'service',base:'clinic',hq:'supply','road-checkpoint':'guard'};
function replacementVariant(source,type){
 const l=clone(source),id=replacementIds[type];
 Object.assign(l,{id:type+'-v4',type,variant:4,phase:4,status:'design',name:(compoundLayouts.find(l=>l.id===type)?.name||source.name)+' · Edifici de dues plantes'});
 l.buildings=l.buildings.map(b=>({...b,floors:b.id===id?2:1,...(b.id===id?{h:5.4,replacement:true,label:b.label+' renovat'}:{})}));
 l.counts=source.counts.replace(/ · variant \d+/,'')+' · substitució de '+source.buildings.find(b=>b.id===id).label;
 l.notes='Variant extra: substitueix '+source.buildings.find(b=>b.id===id).label.toLowerCase()+' per un edifici nou de dues plantes, amb escala interior, finestres als dos nivells i terrat amb ampit. Conserva la petjada, els accessos i tots els subministraments; la resta d’edificis tenen una planta. Cap magatzem s’eleva.';
 return l;
}
for(const source of compoundLayouts)compoundVariants.push(replacementVariant(source,source.id));
newWorldLayouts.push(replacementVariant(newWorldLayouts.find(l=>l.id==='road-checkpoint'),'road-checkpoint'));
export const phase4Layouts=[...newWorldLayouts,...compoundVariants,coastConnection];
