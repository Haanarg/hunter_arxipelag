// Prova sobre el codi real de generació; sense carregar Three.js ni el mapa.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/world-generation.js',import.meta.url),'utf8');
const begin=source.indexOf('const hoverQuotaTargets=new Map();');
const finish=source.indexOf("for(const sector of activeSectors){\n  const original=countVehicles('hover',sector)",begin);
assert.ok(begin>=0&&finish>begin,'la distribució és present al generador');
const section=source.slice(begin,finish);
assert.ok(!section.includes('for(const old of nearHovers'),
  'la posició nova no depèn d’un hovercraft existent');
assert.ok(source.slice(finish,finish+180).includes('original*2'),
  'quota duplicada per sector conservada');
function makePicker(hovercrafts,coves,{large=false,sectorFilter=()=>true,backup=null}={}){
  const generator=new Function(
    'V','islands','sectorMatches','R','vehicleRadius','H','hAt','B',
    'MAP_SCALE','beachedWaterSpot','waterVehicleSpot',
    section+'\nreturn extraHoverSpot;'
  )(
    hovercrafts,coves,sectorFilter,()=>.5,()=>4,3000,()=>-2,[],
    large?2:1,function*(island){return island.place},
    function*(){return backup}
  );
  return sector=>{const it=generator(sector);let result=it.next();
    while(!result.done)result=it.next();return result.value;};
}
const original=[{t:'hover',x:0,z:0}];
const picker=makePicker(original,[
  {x:40,z:0,place:{x:45,z:0,hd:0}},
  {x:210,z:0,place:{x:210,z:0,hd:0}},
  {x:410,z:0,place:{x:410,z:0,hd:0}}
]);
assert.equal(picker(null)?.x,410,'cal escollir el lloc més separat, no el primer veí');
const cramped=makePicker(original,[
  {x:12,z:0,place:{x:15,z:0,hd:0}},
  {x:48,z:0,place:{x:48,z:0,hd:0}}
]);
assert.equal(cramped(null),null,'mai no afegir una segona nau enganxada');
const sectors=makePicker([{t:'hover',x:-100,z:0},{t:'hover',x:100,z:0}],[
  {x:-420,z:0,place:{x:-420,z:0,hd:0}},
  {x:420,z:0,place:{x:420,z:0,hd:0}}
],{large:true,sectorFilter:(x,z,sector)=>sector==null||(sector===0?x<0:x>0)});
assert.equal(sectors(0)?.x,-420,'la quota de l’oest queda a l’oest');
assert.equal(sectors(1)?.x,420,'la quota de l’est queda a l’est');
console.log('Hovercrafts: separació entre illes, absència de parelles i quota sectorial OK');
