const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({window:{},Math,Object,Number,console});
vm.runInContext(fs.readFileSync(path.join(root,'src/seed-search.js'),'utf8'),ctx);
const api=ctx.window.HUNTER_SEED_SEARCH;
const types=fs.readFileSync(path.join(root,'src/vehicle-dynamics.js'),'utf8');
const core=fs.readFileSync(path.join(root,'src/game-core.js'),'utf8');
const itemsBlock=core.slice(core.indexOf('const IT={'),core.indexOf('\n};',core.indexOf('const IT={')));
assert(itemsBlock.startsWith('const IT={'),'found live item catalog');
const itemCatalog={};
for(const match of itemsBlock.matchAll(/^([a-z_]+):\{n:'([^']+)'/gm))itemCatalog[match[1]]={n:match[2]};
const vehicles={};
for(const match of types.matchAll(/^\s*([a-z_]+):Object\.freeze\(\{n:'([^']+)'/gm))vehicles[match[1]]={n:match[2]};
const vehicleOptions=api.typeOptions('vehicle',vehicles,itemCatalog);
const itemOptions=api.typeOptions('item',vehicles,itemCatalog);
const compoundOptions=api.typeOptions('compound',vehicles,itemCatalog);
assert.equal(Object.keys(vehicles).length,15,'all playable vehicles discovered');
assert(Object.keys(itemCatalog).length>=9,'all collectible item types discovered');
assert.equal(Object.keys(api.compounds).length,7,'initial base, HQ and five generated compounds');
assert.equal(vehicleOptions.length,16);
assert.equal(itemOptions.length,Object.keys(itemCatalog).length+1,
  'catalog lists all current collectible types, including new additions');
assert.equal(compoundOptions.length,8);
assert(vehicleOptions.some(q=>q.value==='llanxa_coets'));
assert(itemOptions.some(q=>q.value==='mapa_heli'));
assert(compoundOptions.some(q=>q.value==='polvori')&&compoundOptions.some(q=>q.value==='base'));
const base={x:0,z:0};
const points={
  vehicles:[{t:'ferry',x:30,z:40},{t:'ferry',x:100,z:0},{t:'moto',x:12,z:0}],
  items:[{t:'med',x:3,z:4},{t:'mapa',x:60,z:0}],
  compounds:[{type:'base',x:0,z:0},{type:'hq',x:500,z:0},{type:'port',x:40,z:30}]
};
function nearest(category,type){return api.findNearest({category,type,base,...points})}
assert.equal(nearest('vehicle','ferry').distance,50);
assert.equal(nearest('vehicle','ferry').count,2);
assert.equal(nearest('vehicle','*').distance,12);
assert.equal(nearest('item','med').distance,5);
assert.equal(nearest('compound','port').distance,50);
assert.equal(nearest('compound','base').distance,0);
assert.equal(nearest('compound','hq').distance,500);
assert.equal(nearest('vehicle','heli'),null,'missing types have no false result');
assert.equal(nearest('compound','*').count,3);
const rows=[{seed:4,distance:120},{seed:8,distance:50},{seed:1,distance:50}];
rows.sort(api.compare);
assert.deepEqual(rows.map(x=>x.seed),[1,8,4]);
const world=fs.readFileSync(path.join(root,'src/world-generation.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(world.includes('seedCompounds=compoundCenters.map'),'real compound positions tracked');
assert(world.includes('if(!seedSearchMode)updateSeabed()'),'seed scanning skips unnecessary GPU preparation');
assert(html.includes('id="seedSearchCategory"')&&html.includes('id="seedSearchType"'),'controls exist');
assert(core.includes('seedSearch.findNearest(')&&core.includes('seedSearchMode=oldMode'),'search uses new catalog and restores game mode');
console.log(JSON.stringify({passed:true,vehicles:Object.keys(vehicles).length,
  items:Object.keys(itemCatalog).length,compounds:Object.keys(api.compounds).length,
  checks:['catalogs','nearest distances','missing type','all types','ordering','UI','restore']}));
