// More luminous than V14, but softer than the original game's #3ee43a.
export const HUMAN_PLAYER_GREEN=0x60c754;
// Dimensions de base del V18 del joc; mai no s'aplica un factor a l'arrel.
export const HUMAN_PLAYER_GAME_NATIVE_HEIGHT=3.11232;
export const HUMAN_WORLD_UNITS_PER_METER=1.6;
export const HUMAN_PROFILES=Object.freeze({
 player:{name:'Protagonista',uniform:HUMAN_PLAYER_GREEN,trim:0x344c2c,hat:'cap',skin:0xd6a37e,weapon:'pistol'},
 soldier:{name:'Soldat',uniform:0xa83f46,trim:0x582e36,hat:'beret',skin:0xc68f6d,weapon:'rifle'},
 rocket:{name:'Soldat amb bazuca',uniform:0xa83f46,trim:0x582e36,hat:'beret',skin:0xc68f6d,weapon:'rocket'},
 elite:{name:'Soldat d’elit',uniform:0x49564e,trim:0x2b3431,hat:'helmet',skin:0xba8768,weapon:'rifle',armor:true},
 general:{name:'General',uniform:0x692c3a,trim:0xac4450,hat:'officer',skin:0xc99370,weapon:'rifle'},
 farmer:{name:'Pagès presoner',uniform:0xb2a68a,trim:0x706754,hat:'straw',skin:0xb68160,civilian:true},
 mechanic:{name:'Mecànic',uniform:0x47758b,trim:0x2d4b5f,hat:'workcap',skin:0xc99471,civilian:true}
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

// NATACIÓ: únicament els dos moviments aprovats, compartits amb el joc.
export const HUMAN_SWIM_CATALOG=Object.freeze([
 {id:'human-swim',name:'NATACIÓ',kind:'huma',human:'player',swimming:'both',validated:true,
  note:'Braça B3 (recorregut de cames B1, velocitat i suavitat B3) i crol C4. Dues animacions definitives en comparació simultània.',
  references:[
   {label:'Braça · Swim England',url:'https://spaces.schoolspider.co.uk/uploads/706/page/33552502_page_file.pdf?ofn=swimenglandexpectedstandardsbreaststroke.pdf'},
   {label:'Braça · U.S. Masters Swimming',url:'https://www.usms.org/fitness-and-training/articles-and-videos/articles/2020/01/03/16/21/how-to-swim-breaststroke-properly'},
   {label:'Crol · Estudi biomecànic',url:'https://www.mdpi.com/2673-7078/3/2/17'}],
  options:[
   {provider:'human',role:'player',style:'a',swimMode:'swim-breast-3',swimVariant:3,title:'BRAÇA · B3',note:'Cames amb recorregut B1, ritme i suavitat B3, lliscament 1 s'},
   {provider:'human',role:'player',style:'a',swimMode:'swim-crawl-4',swimVariant:4,title:'CROL · C4',note:'IK cinc fases, roll ±40°, sis batudes i respiració lateral'}]}
]);
