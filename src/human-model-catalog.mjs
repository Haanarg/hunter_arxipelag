// More luminous than V14, but softer than the original game's #3ee43a.
export const HUMAN_PLAYER_GREEN=0x60c754;
export const HUMAN_PROFILES=Object.freeze({
 player:{name:'Protagonista',height:2.0,uniform:HUMAN_PLAYER_GREEN,trim:0x344c2c,hat:'cap',skin:0xd6a37e,weapon:'pistol'},
 soldier:{name:'Soldat',height:2.0,uniform:0xa83f46,trim:0x582e36,hat:'beret',skin:0xc68f6d,weapon:'rifle'},
 rocket:{name:'Soldat amb bazuca',height:2.0,uniform:0xa83f46,trim:0x582e36,hat:'beret',skin:0xc68f6d,weapon:'rocket'},
 elite:{name:'Soldat d’elit',height:2.0,uniform:0x49564e,trim:0x2b3431,hat:'helmet',skin:0xba8768,weapon:'rifle',armor:true},
 general:{name:'General',height:2.0,uniform:0x692c3a,trim:0xac4450,hat:'officer',skin:0xc99370,weapon:'rifle'},
 farmer:{name:'Pagès presoner',height:2.0,uniform:0xb2a68a,trim:0x706754,hat:'straw',skin:0xb68160,civilian:true},
 mechanic:{name:'Mecànic',height:2.0,uniform:0x47758b,trim:0x2d4b5f,hat:'workcap',skin:0xc99471,civilian:true}
});
export const HUMAN_STYLES=Object.freeze({
 a:{name:'A · Natural',note:'Proporcions equilibrades · anatomia definida',width:1,head:1,limbs:1,segments:10,detail:1},
 b:{name:'B · Detallat',note:'Rostre, roba i equipament més detallats',width:1.05,head:.98,limbs:1.03,segments:14,detail:2}
});
export const HUMAN_CATALOG=Object.entries(HUMAN_PROFILES).map(([role,p])=>({
 id:'human-'+role,name:p.name,currentName:p.name,kind:'huma',human:role,validated:false,
 options:Object.entries(HUMAN_STYLES).map(([style,s])=>({provider:'human',role,style,title:p.name+' · '+s.name,note:s.note})),
 note:''
}));

// Comparatives d'ANIMACIÓ: quatre variants sobre la mateixa pell A.
// El cinquè visor conserva el model actual del joc com a referència.
export const HUMAN_SWIM_CATALOG=Object.freeze([
 {id:'human-swim-breast',name:'Nedar · braça',kind:'huma',human:'player',swimming:'breast',validated:false,
  note:'B3: braços endavant amb colzes oberts, tracció submarina, puntada àmplia i lliscament 1 s. Les altres variants es conserven; només laboratori.',
  references:[
   {label:'Imatges · fases de braça (Swim England)',url:'https://spaces.schoolspider.co.uk/uploads/706/page/33552502_page_file.pdf?ofn=swimenglandexpectedstandardsbreaststroke.pdf'},
   {label:'Fotogrames i tècnica · U.S. Masters Swimming',url:'https://www.usms.org/fitness-and-training/articles-and-videos/articles/2020/01/03/16/21/how-to-swim-breaststroke-properly'}],
  options:[
   {provider:'human',role:'player',style:'a',swimVariant:1,title:'B1 · Equilibrada',note:'Tracció, respiració, puntada i lliscament proporcionats'},
   {provider:'human',role:'player',style:'a',swimVariant:2,title:'B2 · Esportiva',note:'Recuperació ràpida, puntada estreta i ondulació'},
   {provider:'human',role:'player',style:'a',swimVariant:3,title:'B3 · REVISADA · Braça',note:'Colzes enfora · mans submarines · puntada més oberta i potent · lliscament 1 s'},
   {provider:'human',role:'player',style:'a',swimVariant:4,title:'B4 · Lliscament',note:'Tracció compacta i fletxa final prolongada'}]},
 {id:'human-swim-crawl',name:'Nedar · crol',kind:'huma',human:'player',swimming:'crawl',validated:false,
  note:'C4: IK húmer–avantbraç en cinc fases, roll longitudinal ±40°, colze de 10°–100°, sis batudes. Altres variants conservades; només laboratori.',
  references:[
   {label:'Imatges · fases del crol (estudi de biomecànica)',url:'https://www.mdpi.com/2673-7078/3/2/17'},
   {label:'Fotogrames · tècnica de crol (Swim England)',url:'https://www.swimming.org/masters/improving-front-crawl-technique/19/'}],
  options:[
   {provider:'human',role:'player',style:'a',swimVariant:1,title:'C1 · Sis batudes',note:'Rotació moderada, colze alt i sis batudes per cicle'},
   {provider:'human',role:'player',style:'a',swimVariant:2,title:'C2 · Fons',note:'Dues batudes, braçada llarga i respiració lateral'},
   {provider:'human',role:'player',style:'a',swimVariant:3,title:'C3 · Tècnic',note:'Quatre batudes i recuperació de colze alt'},
   {provider:'human',role:'player',style:'a',swimVariant:4,title:'C4 · REVISADA · Crol',note:'5 fases IK · roll ±40° · frontissa de colze segura · sis batudes · respiració lateral'}]}
]);
