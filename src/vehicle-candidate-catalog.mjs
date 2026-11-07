// Catàleg compartit entre el visor Three.js i l'eina de descàrrega local.
const P=(pack,match,query)=>({pack,match,query:query||match});
const Q=(query)=>({query});
export const CATALOG=[
 {id:'bici',name:'Bicicleta',kind:'terra',options:[
   P('velodrome-and-track-cycling','Track Bicycle'),
   P('pixel-modern-city-street','Bicycle'),
   P('indian-bazaar-street-and-temple','Bicycle with Carrier')]},
 {id:'moto',name:'Motocicleta',kind:'terra',options:[
   P('motorcycle-racing-and-street-bikes','Road sportbike'),
   P('motorcycle-racing-and-street-bikes','Naked streetfighter'),
   P('motorcycle-racing-and-street-bikes','Twin-cylinder scrambler')]},
 {id:'cotxe_civil',name:'Cotxe civil',kind:'terra',options:[
   P('transport-collection-hd','Grand touring coupe'),
   P('transport-collection-hd','Executive sedan'),
   P('transport-collection-hd','Touring SUV')]},
 {id:'camio',name:'Camió militar 6×6',kind:'terra',options:[
   P('armoured-column-and-field-camp','Supply Truck'),
   P('transport-collection-hd','Three-axle flatbed truck'),
   P('armoured-column-and-field-camp','Fuel Tanker')]},
 {id:'tanqueta',name:'Tanqueta',kind:'terra',options:[
   P('armoured-column-and-field-camp','Tracked APC'),
   P('armoured-column-and-field-camp','Wheeled APC'),
   P('armoured-column-and-field-camp','Armoured Car')]},
 {id:'tanc',name:'Tanc',kind:'terra',options:[
   P('armoured-column-and-field-camp','Main Battle Tank'),
   P('armoured-column-and-field-camp','Light Tank'),
   P('armoured-column-and-field-camp','Self-Propelled Gun')]},
 {id:'windsurf',name:'Windsurf',kind:'mar',note:'Encara no hi ha tres windsurfs complets (taula + vela) verificats. Aquestes cerques poden donar només taules o embarcacions de vela: tracta-les com a material de referència, no com a substituts llestos.',
   options:[Q('windsurf board'),Q('windsurfing sailboard'),Q('windsurf rig')]},
 {id:'barca_rems',name:'Barca de rems',kind:'mar',options:[
   P('quiet-lake-fishing','Teal Rowboat'),
   P('lighthouse-and-rocky-coast','Rowing Boat'),
   P('medieval-mmo-starter-realm','Rowing Boat')]},
 {id:'moto_aquatica',name:'Moto aquàtica',kind:'mar',options:[
   P('powerboat-racing-and-launch-ramp','Stand-up personal watercraft'),
   P('powerboat-racing-and-launch-ramp','Sit-down personal watercraft'),
   P('beach-surf-and-paddle-kit','Recreational Jet Ski')]},
 {id:'llanxa',name:'Llanxa ràpida',kind:'mar',options:[
   P('transport-collection-hd','Open sport runabout'),
   P('powerboat-racing-and-launch-ramp','Offshore monohull racer'),
   P('powerboat-racing-and-launch-ramp','Open rescue powerboat')]},
 {id:'llanxa_coets',name:'Llanxa llançamíssils',kind:'mar',note:'Les alternatives són cascos civils o de rescat sense llançamíssils. Caldrà adaptar-hi armament, punts de dispar, dos seients i col·lisions abans d’integrar-los.',
   options:[P('powerboat-racing-and-launch-ramp','Large RIB with twin outboards'),
    P('transport-collection-hd','Rigid inflatable boat'),
    P('powerboat-racing-and-launch-ramp','Offshore catamaran racer')]},
 {id:'ferry',name:'Ferri',kind:'mar',note:'Les dues primeres alternatives representen principalment la popa d’un ferri, sense casc submergit complet: són referències visuals parcials. La tercera cerca un ferri de passatgers alternatiu.',
   options:[P('ferry-terminal-and-harbour-crossing','Roll on roll off ferry, berthed stern section'),
    P('ferry-terminal-and-harbour-crossing','Roll on roll off ferry, blue livery'),
    Q('passenger ferry')]},
 {id:'heli',name:'Helicòpter utilitari',kind:'aire',options:[
   P('transport-collection-hd','Utility helicopter'),
   P('aircraft-fleet-and-airfield','Light Turbine Utility Helicopter'),
   P('aircraft-fleet-and-airfield','Medium Twin Turbine Helicopter')]},
 {id:'heli_combat',name:'Helicòpter de combat',kind:'aire',note:'Les alternatives de transport/rotor coaxial necessiten encara l’adaptació a helicòpter de combat (armament, geometria de cabina, punts de míssil i tir). No són models d’Apache verificats.',
   options:[P('aircraft-fleet-and-airfield','Coaxial Rotor Helicopter'),
    P('aircraft-fleet-and-airfield','Heavy Lift Ramp Helicopter'),
    P('transport-collection-hd','Rescue helicopter')]}
];
