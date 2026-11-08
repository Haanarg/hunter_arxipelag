// Catàleg compartit entre el visor Three.js i l'eina de descàrrega local.
// La moto aquàtica definitiva ja forma part de la fàbrica del joc; no és cap candidata.
// Els nous heli militars són referències externes CC BY, no assets integrats.
const P=(pack,match,query)=>({pack,match,query:query||match});
const Q=(query)=>({query});
// Sketchfab CC BY 4.0: enllaços i visors oficials, sense fitxer GLB local.
const S=(modelId,url,title,author,triangles,note)=>({provider:'sketchfab',modelId,url,title,author,triangles,license:'CC BY 4.0',note});
export const CATALOG=[
 {id:'bici',name:'Bicicleta',kind:'terra',options:[
   P('velodrome-and-track-cycling','Track Bicycle'),
   P('pixel-modern-city-street','Bicycle'),
   P('indian-bazaar-street-and-temple','Bicycle with Carrier')]},
 {id:'cotxe_civil',name:'Cotxe civil',kind:'terra',options:[
   P('transport-collection-hd','Grand touring coupe'),
   P('transport-collection-hd','Executive sedan'),
   P('transport-collection-hd','Touring SUV')]},

 {id:'tanqueta',name:'Tanqueta',kind:'terra',options:[
   P('armoured-column-and-field-camp','Tracked APC'),
   P('armoured-column-and-field-camp','Wheeled APC'),
   P('armoured-column-and-field-camp','Armoured Car')]},
 {id:'tanc',name:'Tanc',kind:'terra',options:[
   P('armoured-column-and-field-camp','Main Battle Tank'),
   P('armoured-column-and-field-camp','Light Tank'),
   P('armoured-column-and-field-camp','Self-Propelled Gun')]},


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
 {id:'heli',name:'Huey · UH-1 (utilitari)',kind:'aire',
   note:'Candidats militars UH-1. Visors Sketchfab independents de la càmera del laboratori; els GLB no s’han incorporat al repositori.',
   options:[
    S('e619745e46b84a79a98d4a41774f71e6','https://sketchfab.com/3d-models/bell-huey-helicopter-e619745e46b84a79a98d4a41774f71e6','Bell Huey Helicopter','hruschak30',2000,'UH-1 molt lleuger; prioritat per a proves de rendiment'),
    S('755d8518a06e41b19752c1b54c0da588','https://sketchfab.com/3d-models/bell-huey-helicopter-755d8518a06e41b19752c1b54c0da588','Bell Huey helicopter',"Duane's Mind",null,'Versió animada; confirmar geometria i pes real abans de baixar'),
    S('90bf99ba20f948a9838623311bd83da3','https://sketchfab.com/3d-models/bell-uh-1n-twin-huey-90bf99ba20f948a9838623311bd83da3','Bell UH-1N Twin Huey','helijah',111400,'Variant bimotor; detall elevat, només referència')]},
 {id:'heli_combat',name:'Apache · AH-64 (combat)',kind:'aire',
   note:'Candidats Apache reals. Cal adaptar pivots de rotor i canó, míssils, seients i col·lisions per integrar-los al joc.',
   options:[
    S('df0993ee21e74a759cd0519f6fc51cf8','https://sketchfab.com/3d-models/ah-64-apache-df0993ee21e74a759cd0519f6fc51cf8','AH-64 Apache','Araon',2200,'Low-poly per a jocs mòbils; prioritat per a rendiment'),
    S('bdad74211b7d46ed9c72fb2910b8bdf5','https://sketchfab.com/3d-models/ah-64-apache-low-poly-bdad74211b7d46ed9c72fb2910b8bdf5','AH-64 Apache Low poly','fauzan_3d',22100,'Candidat amb més detall per a la vista propera'),
    S('3bc9b90cc97a40a6bfc13237329ce51b','https://sketchfab.com/3d-models/ah64-3bc9b90cc97a40a6bfc13237329ce51b','AH-64 Apache','manilov.ap',127700,'Densitat elevada; referència visual')]}
];
