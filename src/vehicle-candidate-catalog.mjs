// Catàleg compartit entre el visor Three.js i l'eina de descàrrega local.
// La moto aquàtica definitiva ja forma part de la fàbrica del joc; no és cap candidata.
// Huey i Apache acceptats ja formen part del joc.
const P=(pack,match,query)=>({pack,match,query:query||match});
const Q=(query)=>({query});
// Candidates reals amb visor oficial (no hi ha un GLB extern publicat al repo).
// La llicència es declara per model: CC BY i CC BY-SA requereixen atribució.
const S=(modelId,url,title,author,triangles,license,note)=>({provider:'sketchfab',modelId,url,title,author,triangles,license,note});
export const CATALOG=[
 {id:'bici',name:'Bicicleta',kind:'terra',options:[
   P('velodrome-and-track-cycling','Track Bicycle'),
   P('pixel-modern-city-street','Bicycle'),
   P('indian-bazaar-street-and-temple','Bicycle with Carrier')]},
 {id:'cotxe_civil',name:'Cotxe civil',kind:'terra',options:[
   P('transport-collection-hd','Grand touring coupe'),
   P('transport-collection-hd','Executive sedan'),
   P('transport-collection-hd','Touring SUV')]},

 {id:'tanqueta',name:'Tanqueta · BTR-82',kind:'terra',
   note:'Model triat: Low Poly BTR 82 de SIpriv (CC BY 4.0). Aquesta pàgina genera tres reduccions conservadores: 75%, 50% i 25%, a més del GLB original 100%. Encara no està incorporat al joc.',
   options:[
    S('6226acae68424d99bf03882b245ff7c5','https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5','Low poly BTR 82','SIpriv',21500,'CC BY 4.0','Vuit rodes i torreta. Model seleccionat per generar tres LOD del 75% al 25% amb meshoptimizer, agrupant 199 malles originals per material i mantenint les 8 rodes i la torreta.')]},
 {id:'tanc',name:'Tanc · estil M1A1 Abrams',kind:'terra',
   note:'Substituïts els tres GLB genèrics per candidats M1A1/M1 amb llicència Creative Commons identificada. Cal verificar les peces mòbils i adaptar els models abans d’usar-los al joc.',
   options:[
    S('1b4a0b196df14e67bce38ed6fef7d944','https://sketchfab.com/3d-models/abrams-m1a1-free-1b4a0b196df14e67bce38ed6fef7d944','Abrams M1A1 [Free]','Quasar',29000,'CC BY 4.0','Abrams reconeixible, geometria moderada; prioritat per revisar la torreta i les textures.'),
    S('eed14f42064e426eadda1e052b6f334b','https://sketchfab.com/3d-models/m1a1-abrams-eed14f42064e426eadda1e052b6f334b','M1A1 Abrams','Scril',12300,'CC BY 4.0','Model d\'un projecte de mod declarat per l\'autor, sense constància de ser un model extret d\'un joc. Menys triangles.'),
    S('2577a4eccbc74b2da6dba5bfd09b7511','https://sketchfab.com/3d-models/m1-abrams-2577a4eccbc74b2da6dba5bfd09b7511','M1 Abrams','Artem Goyko',40200,'CC BY 4.0','Més detall de la família M1; validar armament, materials i pivot abans d\'usar-lo.')]},


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
