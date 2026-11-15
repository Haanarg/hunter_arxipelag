// Catàleg compartit entre el visor Three.js i l'eina de descàrrega local.
// La moto aquàtica definitiva ja forma part de la fàbrica del joc; no és cap candidata.
// Primer les propostes pendents, després tots els models aprovats del joc.
const P=(pack,match,query)=>({pack,match,query:query||match});
const Q=(query)=>({query});
// Els models aprovats tenen un sol visor amb la geometria actual del joc.
// Candidats procedimentals que es poden editar sense dependre de GLB externs.
const C=(variant,title,note)=>({provider:'procedural',variant,title,note});
export const CATALOG=[
 {id:'llanxa',validated:false,name:'Llanxa ràpida',kind:'mar',options:[
   P('transport-collection-hd','Open sport runabout'),
   P('powerboat-racing-and-launch-ramp','Offshore monohull racer'),
   P('powerboat-racing-and-launch-ramp','Open rescue powerboat')]},
 {id:'llanxa_coets',validated:false,name:'Llanxa llançamíssils',kind:'mar',note:'Les alternatives són cascos civils o de rescat sense llançamíssils. Caldrà adaptar-hi armament, punts de dispar, dos seients i col·lisions abans d’integrar-los.',
   options:[P('powerboat-racing-and-launch-ramp','Large RIB with twin outboards'),
    P('transport-collection-hd','Rigid inflatable boat'),
    P('powerboat-racing-and-launch-ramp','Offshore catamaran racer')]},
 {id:'heli_combat',validated:true,name:'Helicòpter de combat · Mil Mi-24',currentName:'Mi-24 · D definitiu',kind:'aire',
   note:'Variant D aprovada al joc. Tres estudis de reducció de geometria pendents de validar.',
   references:[
    {label:'Perfil i volums · Chris Lofting',url:'https://commons.wikimedia.org/wiki/File:Macedonian_Air_Force_Mil_Mi-24V_Lofting.jpg'},
    {label:'Cabines, ales i tren · Mi-24V 7353',url:'https://commons.wikimedia.org/wiki/File:Mil_Mi-24V_Hind_7353_(9324310918).jpg'},
    {label:'Vista frontal · cabines i inclinació de les ales',url:'https://www.armyweb.cz/clanek/legendarni-bitevni-vrtulnik-mi-24v'},
    {label:'Configuració i dimensions · Ministeri de Defensa txec',url:'https://mise.mo.gov.cz/en/armed-forces/equipment/air-force/helicopters/mil-mi-24---nato-code%3A-hind-38157/'}
   ],options:[
    C('mi24-d-a','Mi-24 D · A · Lleuger','Agrupació per conjunts, detalls menors'),
    C('mi24-d-b','Mi-24 D · B · Molt lleuger','Agrupació per material i menys segments'),
    C('mi24-d-c','Mi-24 D · C · Mínim','Color per vèrtex i màxima agrupació')
   ]},
 {id:'ferry',validated:true,name:'Ferri',kind:'mar',currentName:'Ferri costaner · D',note:'Model D aprovat · coberta i dues rampes articulades.',
   references:[{label:'Ferri costaner · Veidnes, coberta i superestructura lateral',url:'https://batomtaler.skipsrevyen.no/froy-rederi-sefine-shipyard-veidnes/ms-veidnes/1820601'}],options:[]},
 // Approved models: no obsolete candidate downloads or rejected designs.
 {id:'heli',validated:true,name:'Helicòpter · Kamov Ka-60',currentName:'Ka-60 · variant A definitiva',kind:'aire',options:[]},
 {id:'cotxe',validated:true,name:'GAZ Tigr-M',currentName:'GAZ Tigr-M',kind:'terra',options:[]},
 {id:'cotxe_civil',validated:true,name:'Cotxe utilitari',currentName:'C1A · frontal arrodonit',kind:'terra',options:[]},
 {id:'camio',validated:true,name:'Camió militar',currentName:'A4.3 · 6×6',kind:'terra',options:[]},
 {id:'tanc',validated:true,name:'Tanc · T-90M',currentName:'T-90M · escala del joc',kind:'terra',options:[]},
 {id:'tanqueta',validated:true,name:'Tanqueta · BTR-82',currentName:'BTR-82 · 3B',kind:'terra',options:[]},
 {id:'moto',validated:true,name:'Moto',currentName:'Naked Streetfighter · 25%',kind:'terra',options:[]},
 {id:'bici',validated:true,name:'Bicicleta',currentName:'Bicicleta · model propi',kind:'terra',options:[]},
 {id:'hover',validated:true,name:'Hovercraft',currentName:'Hovercraft · model D',kind:'mar',options:[]},
 {id:'moto_aquatica',validated:true,name:'Moto aquàtica',currentName:'Recreational Jet Ski · 25%',kind:'mar',options:[]},
 {id:'barca_rems',validated:true,name:'Barca de rems',kind:'mar',options:[]},
 {id:'windsurf',validated:true,name:'Windsurf',kind:'mar',options:[]}
];
