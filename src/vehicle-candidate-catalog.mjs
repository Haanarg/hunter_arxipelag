// Catàleg compartit entre el visor Three.js i l'eina de descàrrega local.
// La moto aquàtica definitiva ja forma part de la fàbrica del joc; no és cap candidata.
// Ka-60 A aprovat al joc i fora del laboratori. L'Apache és la referència del Ka-52.
const P=(pack,match,query)=>({pack,match,query:query||match});
const Q=(query)=>({query});
// Els blindats T-90M i BTR-82 es mantenen al joc; temporalment no tenen pestanya al visor.
// Candidats procedimentals que es poden editar sense dependre de GLB externs.
const C=(variant,title,note)=>({provider:'procedural',variant,title,note});
export const CATALOG=[
 {id:'heli_combat',name:'Helicòpter de combat · Kamov Ka-52',kind:'aire',
   note:'Quatre propostes de forma basades en fotografies del Ka-52: radom arrodonit, dos pilots de costat, motors laterals i rotors coaxials. A/B/C/D són estudis del model, no variants reals de l’helicòpter.',
   references:[
    {label:'Frontal · cabina i amplada del radom · Fedor Leukhin, CC BY-SA 2.0',url:'https://commons.wikimedia.org/wiki/File:Russian_Air_Force_Kamov_Ka-52_(19442404960).jpg'},
    {label:'Tres quarts · morro i cabina · Peer.Gynt, CC BY-SA 2.0',url:'https://commons.wikimedia.org/wiki/File:Kamov_Ka-52_Alligator_-_6816425231.jpg'},
    {label:'Perfil en vol · motors i cua · Fedor Leukhin',url:'https://commons.wikimedia.org/wiki/File:Russian_Air_Force_Kamov_Ka-52_(19442404770).jpg'},
    {label:'Dimensions del fabricant / exportador',url:'https://roe.ru/pdfs/pdf_4679.pdf'}
   ],options:[
    C('ka52-a','Ka-52 · A · Equilibrat','Morro arrodonit · cabina ampla · proporcions de referència'),
    C('ka52-b','Ka-52 · B · Morro ample','Radom més ple · cabina més ampla i baixa'),
    C('ka52-c','Ka-52 · C · Perfil afilat','Morro més llarg i baix · cabina més angular'),
    C('ka52-d','Ka-52 · D · Facetat lleuger','Volums més simples · menys cares i detalls petits')
   ]},
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
