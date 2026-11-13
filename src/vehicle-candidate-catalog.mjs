// Catàleg compartit entre el visor Three.js i l'eina de descàrrega local.
// La moto aquàtica definitiva ja forma part de la fàbrica del joc; no és cap candidata.
// Huey i Apache acceptats ja formen part del joc.
const P=(pack,match,query)=>({pack,match,query:query||match});
const Q=(query)=>({query});
// Candidats procedimentals que es poden editar sense dependre de GLB externs.
const C=(variant,title,note)=>({provider:'procedural',variant,title,note});
export const CATALOG=[
 {id:'tanqueta',name:'Tanqueta · BTR-82 3B',kind:'terra',
   note:'Model 3B actualitzat al joc: torreta 25% més petita i centrada longitudinalment sobre el segon eix, amb el canó alineat; mirilles horitzontals amb carcassa verda encastada al casc. Conserva les vuit rodes i incorpora una comporta d’accés verda amb frontisses i nansa a cada lateral entre els eixos segon i tercer, a més de defenses posteriors, trapes, ventilació i quatre focus. Les dues comportes arriben fins a la quilla i els laterals posteriors tenen registres de blindatge, frontisses, barres i tapes simètriques, seguint la referència fotogràfica; canvis aplicats al laboratori i al joc. El morro original es manté complet, també al laboratori; no s’ha modificat la posició dels fars.',
   options:[]},
 {id:'cotxe',name:'Cotxe militar · GAZ Tigr-M',kind:'terra',
   note:'El Humvee D3.1 continua al joc. Candidat 3 del GAZ Tigr-M, dibuixat amb geometria Three.js pròpia, editable per peces i amb simetria opcional. No s’ha substituït cap vehicle del joc.',
   references:[
     {label:'GAZ Tigr · galeria Wikimedia',url:'https://commons.wikimedia.org/wiki/Category:Tigr_vehicle'},
     {label:'Tigr-M AMN-233114 · fotografies',url:'https://commons.wikimedia.org/wiki/Category:AMN_233114'},
     {label:'Tigr-M · frontal de referència',url:'https://tank-afv.com/modern/Russia/photos/AMN_233114_TVM2012ch2p3photo015.jpg'},
     {label:'VPK · catàleg del fabricant',url:'https://bmimpex.com/gallery/VPK%20book_eng.pdf'}
   ],
   options:[C('tigr-v1','GAZ Tigr-M · candidat 3','Vidres transparents amb obertures reals, quatre seients, volant i tauler; editable')]},
 {id:'tanc',name:'Tanc · T-90M',kind:'terra',candidate:'t90m-v1',
   note:'Només el nostre T-90M: model procedimental ampliat un 50 %, amb torreta, canó i erugues animables al laboratori. El tanc del joc es conserva sense canvis fins a validar l’escala i les col·lisions.',
   references:[
     {label:'T-90M · galeria Wikimedia',url:'https://commons.wikimedia.org/wiki/Category:T-90M'}
   ],
   options:[]},

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
