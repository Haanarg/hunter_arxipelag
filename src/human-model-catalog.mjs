export const HUMAN_PROFILES=Object.freeze({
 player:{name:'Protagonista',height:2.84648,uniform:0x54804a,trim:0x344c2c,hat:'cap',skin:0xd6a37e,weapon:'pistol'},
 soldier:{name:'Soldat',height:2.928,uniform:0xa83f46,trim:0x582e36,hat:'beret',skin:0xc68f6d,weapon:'rifle'},
 rocket:{name:'Soldat amb bazuca',height:2.928,uniform:0xa83f46,trim:0x582e36,hat:'beret',skin:0xc68f6d,weapon:'rocket'},
 elite:{name:'Soldat d’elit',height:2.928,uniform:0x49564e,trim:0x2b3431,hat:'helmet',skin:0xba8768,weapon:'rifle',armor:true},
 general:{name:'General',height:2.84,uniform:0x692c3a,trim:0xac4450,hat:'officer',skin:0xc99370,weapon:'rifle'},
 farmer:{name:'Pagès presoner',height:2.84648,uniform:0xb2a68a,trim:0x706754,hat:'straw',skin:0xb68160,civilian:true},
 mechanic:{name:'Mecànic',height:2.84648,uniform:0x47758b,trim:0x2d4b5f,hat:'workcap',skin:0xc99471,civilian:true}
});
export const HUMAN_STYLES=Object.freeze({
 a:{name:'A · Natural',note:'Proporcions equilibrades · anatomia definida',width:1,head:1,limbs:1,segments:10,detail:1},
 b:{name:'B · Detallat',note:'Rostre, roba i equipament més detallats',width:1.05,head:.98,limbs:1.03,segments:14,detail:2},
 c:{name:'C · Àgil',note:'Silueta esvelta · formes més facetades',width:.93,head:.96,limbs:.92,segments:8,detail:1}
});
export const HUMAN_CATALOG=Object.entries(HUMAN_PROFILES).map(([role,p])=>({
 id:'human-'+role,name:p.name,currentName:p.name,kind:'huma',human:role,validated:false,
 options:Object.entries(HUMAN_STYLES).map(([style,s])=>({provider:'human',role,style,title:p.name+' · '+s.name,note:s.note})),
 note:''
}));
