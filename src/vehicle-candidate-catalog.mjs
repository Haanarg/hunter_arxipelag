// Catàleg compartit entre el visor Three.js i l'eina de descàrrega local.
// La moto aquàtica definitiva ja forma part de la fàbrica del joc; no és cap candidata.
// Huey i Apache acceptats ja formen part del joc.
const P=(pack,match,query)=>({pack,match,query:query||match});
const Q=(query)=>({query});
// Candidates reals amb visor oficial (no hi ha un GLB extern publicat al repo).
// La llicència es declara per model: CC BY i CC BY-SA requereixen atribució.
const S=(modelId,url,title,author,triangles,license,note)=>({provider:'sketchfab',modelId,url,title,author,triangles,license,note});
export const CATALOG=[
 {id:'tanqueta',name:'Tanqueta · BTR-82 3B',kind:'terra',
   note:'Model 3B actualitzat al joc: torreta 25% més petita i centrada longitudinalment sobre el segon eix, amb el canó alineat; mirilles horitzontals amb carcassa verda encastada al casc. Conserva les vuit rodes i incorpora una comporta d’accés verda amb frontisses i nansa a cada lateral entre els eixos segon i tercer, a més de defenses posteriors, trapes, ventilació i quatre focus. Les dues comportes arriben fins a la quilla i els laterals posteriors tenen registres de blindatge, frontisses, barres i tapes simètriques, seguint la referència fotogràfica; canvis aplicats al laboratori i al joc. El morro original es manté complet, també al laboratori; no s'ha modificat la posició dels fars.',
   options:[]},
 {id:'tanc',name:'Tanc · T-90M',kind:'terra',
   note:'Dos candidats T-90M russos amb llicència CC BY 4.0. Visors originals; importa el GLB descarregat de la font per editar-lo.',
   options:[
    S("c858e6ac0f3045d68f73681725351372","https://sketchfab.com/3d-models/t90m-proryv-low-poly-tank-c858e6ac0f3045d68f73681725351372","T90M PRORYV LOW-POLY TANK","PhoneModeler3D",1412,"CC BY 4.0","Molt lleuger · 1.412 triangles · candidat low poly per al joc."),
    S("7d3a7cf685334f3da3005c559e2b1952","https://sketchfab.com/3d-models/t-90m-arena-m-stylised-7d3a7cf685334f3da3005c559e2b1952","T-90M Arena-M (Stylised)","Inmate",27718,"CC BY 4.0","Estilitzat · 27.718 triangles · més detall i protecció Arena-M.")]},

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
