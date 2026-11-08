// Executa la decisió REAL de colors de world-generation.js aïlladament.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../src/world-generation.js'),'utf8');
const begin=src.indexOf("  const civilian=t==='cotxe_civil',bicycle=t==='bici'");
const end=src.indexOf('  const o=seedSearchMode?seedVehicleStub(t):mkV(t,appearance)',begin);
assert(begin>0&&end>begin,'Cal aïllar el càlcul real de la paleta sense la fàbrica visual');
const actual=src.slice(begin,end);
const select=new Function('t','V','pa','R','meta','paletteData',
 "const window={HUNTER_CIVILIAN_CARS:paletteData};\n"+actual+"\nreturn {color,appearance};"
);
const colors={
 jetskiColors:[0xc94e3f,0xa4ec24,0xffdf18,0xef35a8,0x228fef,0xff7b19,0x181c1e].map(hex=>({hex})),
 colors:[0xd34e3d,0xe7e8dc,0x4b9fd1].map(hex=>({hex}))
};
const pa={x:-2897.061,z:-2522.712};
const cars=[];
let totalDraws=0;
for(let i=0;i<15;i++){
 let draws=0;
 const rnd=()=>{draws++;return .04};
 const {color,appearance}=select('moto_aquatica',cars,pa,rnd,{},colors);
 assert.equal(draws,1,'S’ha de preservar una tirada de la llavor per cada moto aquàtica');
 assert.equal(color,appearance.color);
 cars.push({t:'moto_aquatica',color});
 totalDraws+=draws;
}
assert.equal(new Set(cars.slice(0,7).map(x=>x.color)).size,7,'Els set primers vehicles han de tenir set colors diferents');
assert.equal(cars[7].color,cars[0].color,'La paleta ha de tornar al primer color després de set motos');
assert.equal(cars[14].color,cars[0].color,'La paleta ha de mantenir la periodicitat');
const other=[...cars.slice(0,5).map(x=>x.color)];
assert.deepEqual(cars.slice(0,5).map(x=>x.color),other);
let saveDraws=0;
const save=select('moto_aquatica',cars,pa,()=>{saveDraws++;return .88;},{color:0xff7b19},colors);
assert.equal(saveDraws,1);
assert.equal(save.appearance.color,0xff7b19,'Respectar el color explícit d’una partida recuperada');
for(const [type,expected] of [['cotxe_civil',2],['bici',1],['windsurf',0],['tanc',0]]){
 let draws=0;
 select(type,cars,pa,()=>{draws++;return .4},{},colors);
 assert.equal(draws,expected,'Consum de RNG no modificat per '+type);
}
const otherSeed=select('moto_aquatica',[],{x:148,z:67},()=>.5,{},colors);
assert(colors.jetskiColors.some(x=>x.hex===otherSeed.color));
console.log('Paleta moto aquàtica: 7 colors diferents abans de repetir, 1 tirada R per vehicle, compatible amb llavor i desament.');
