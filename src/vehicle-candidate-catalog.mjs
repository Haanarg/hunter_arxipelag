// Catàleg compartit entre el visor Three.js i l'eina de descàrrega local.
// La moto aquàtica definitiva ja forma part de la fàbrica del joc; no és cap candidata.
// Huey i Apache aprovats al joc: se'n mostren els models reals com a base editable.
const P=(pack,match,query)=>({pack,match,query:query||match});
const Q=(query)=>({query});
// Els blindats T-90M i BTR-82 es mantenen al joc; temporalment no tenen pestanya al visor.
// Candidats procedimentals que es poden editar sense dependre de GLB externs.
const C=(variant,title,note)=>({provider:'procedural',variant,title,note});
export const CATALOG=[
 {id:'heli',name:'Helicòpter · Kamov Ka-60',kind:'aire',
   note:'Candidat Three.js ajustat exclusivament a les dues imatges facilitades a la conversa: morro opac diferenciat dels vidres davanters, parabrisa endarrerit i alerons triangulars de cua orientats cap avall. Conservar portes laterals obertes, motor dorsal i tren posterior.',
   // Retirades totes les referències URL externes antigues. Les dues
   // imatges aportades per l’usuari són les úniques referències de disseny.
   references:[],
   options:[C('ka60','Kamov Ka-60 · candidat 3','Morro separat de la cabina · vidres endarrerits · alerons triangulars descendents')]},
 {id:'heli_combat',name:'Helicòpter de combat · Kamov Ka-52',kind:'aire',
   note:'Ka-52 candidat Three.js propi: cabina ampla amb dos pilots de costat, nas aplanat, rotors coaxials contrarotatius i ales curtes. Apache actual al costat per comparar.',
   references:[
    {label:'Ka-52 · fotografia frontal / tres quarts',url:'https://commons.wikimedia.org/wiki/File:Kamov_Ka-52_at_the_MAKS-2013_(01).jpg'},
    {label:'Ka-52 · fotografia lateral',url:'https://commons.wikimedia.org/wiki/File:Ka-52_at_MAKS-2009.jpg'},
    {label:'Ka-52 · dimensions del fabricant / exportador',url:'https://roe.ru/pdfs/pdf_4679.pdf'}
   ],options:[C('ka52','Kamov Ka-52 · candidat 1','Dos rotors de tres pales · pilots de costat · sensor frontal i canó lateral')]},
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
    Q('passenger ferry')]}

];
