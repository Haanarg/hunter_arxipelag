import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateRelayMission,restoreRelayMission} from '../server/coop-mission.mjs';
const room={id:'ui-room',revision:4,seed:67,mapScale:1,difficulty:1,allReady:true,expiresAt:Date.now()+86400000,members:[{id:'a',name:'Primer'},{id:'b',name:'Segon'}]},g=generateRelayMission(room),mission=restoreRelayMission(g.record,g.geometry);
const timers=new Map(),frames=new Map(),listeners=new Map(),elements=new Map(),sockets=[];let serial=0,draws=0;
const context=new Proxy({}, {get:(o,k)=>o[k]??(()=>{draws++;}),set:(o,k,v)=>(o[k]=v,true)});
class Element{
 constructor(){this.handlers=new Map();this.children=[];this.dataset={};this.style={};this.clientWidth=700;this.clientHeight=450;const set=new Set();this.classList={add:k=>set.add(k),remove:k=>set.delete(k)};}
 addEventListener(type,fn){if(!this.handlers.has(type))this.handlers.set(type,[]);this.handlers.get(type).push(fn);}
 fire(type,e={}){for(const fn of this.handlers.get(type)||[])fn({preventDefault(){},...e});}
 replaceChildren(...nodes){this.children=nodes;nodes.forEach(n=>n.parentNode=this);}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 setPointerCapture(){}
 getContext(type){if(type==='2d')return context;throw Error('Force Canvas fallback in DOM test');}
}
const html=readFileSync(new URL('../coop.html',import.meta.url),'utf8');for(const [,id] of html.matchAll(/id="([^"]+)"/g))elements.set(id,new Element());
const buttons=[...html.matchAll(/data-key="([^"]+)"/g)].map(([,key])=>{const b=new Element();b.dataset.key=key;return b;});
class Socket{constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this);}send(s){this.sent.push(JSON.parse(s));}close(code=1000){this.readyState=3;this.onclose?.({code});}open(){this.readyState=1;this.onopen();}message(d){this.onmessage({data:JSON.stringify(d)});}}
const globals=['document','location','addEventListener','WebSocket','setTimeout','clearTimeout','requestAnimationFrame','cancelAnimationFrame','ResizeObserver','devicePixelRatio','fetch'],saved=new Map(globals.map(k=>[k,globalThis[k]])),error=console.error;
try{
 Object.assign(globalThis,{document:{hidden:false,getElementById:id=>elements.get(id),querySelectorAll:()=>buttons,createElement:()=>new Element(),addEventListener:(type,fn)=>listeners.set(type,fn)},location:{origin:'https://hunter.test',href:'https://hunter.test/coop.html?room=ui-room'},addEventListener:(type,fn)=>listeners.set(type,fn),WebSocket:Socket,
 setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),ResizeObserver:class{observe(){}disconnect(){}},devicePixelRatio:1,
 fetch:async url=>Response.json(String(url).endsWith('capabilities')?{accounts:true}:String(url).endsWith('get-session')?{user:{id:'a'}}:String(url).endsWith('account/status')?{user:{id:'a'},status:'approved',role:'user',recoveryCodes:8}:{room})});
 console.error=(...args)=>{if(!String(args[0]).includes('WebGLRenderer'))error(...args);};
 await import('../src/coop-play.mjs?test-ui');assert.equal(sockets.length,1);const ws=sockets[0];assert.ok(ws.url.startsWith('wss://hunter.test/api/coop/socket?room='));ws.open();assert.equal(ws.sent[0].type,'hello');
 ws.message({type:'room',room});assert.equal(elements.get('launch').disabled,false);elements.get('launch').onclick();assert.equal(ws.sent.at(-1).type,'launch');assert.equal(ws.sent.at(-1).revision,4);
 mission.setStatus('running');ws.message(mission.setup('a'));await new Promise(setImmediate);await new Promise(setImmediate);
 assert.match(elements.get('objective').textContent,/Terminal 1/);assert.match(elements.get('players').textContent,/Primer \(tu\)/);
 listeners.get('keydown')({code:'KeyW',preventDefault(){}});buttons.find(b=>b.dataset.key==='KeyE').fire('pointerdown',{pointerId:7});
 const advanceInput=()=>{const entry=[...timers].find(([,v])=>v.ms===50);assert.ok(entry);timers.delete(entry[0]);entry[1].fn();};advanceInput();
 assert.equal(ws.sent.at(-1).input.forward,1);assert.equal(ws.sent.at(-1).interact,true,'touch activation reaches protocol');
 listeners.get('blur')();advanceInput();assert.equal(ws.sent.at(-1).input.forward,0);assert.equal(ws.sent.at(-1).interact,false);
 const door=mission.meta.doors[0],near=mission.snapshot();near.players[0]={...near.players[0],x:door.cx,z:door.cz+2,y:door.floor+.06};
 ws.message({type:'state',state:near});assert.equal(elements.get('door').disabled,false);assert.match(elements.get('door').textContent,/Obrir/);
 listeners.get('keydown')({code:'KeyF',repeat:false,preventDefault(){}});const action=ws.sent.at(-1);assert.equal(action.type,'door');assert.equal(action.open,true);assert.equal(elements.get('door').disabled,true);
 listeners.get('keydown')({code:'KeyF',repeat:true,preventDefault(){}});assert.equal(ws.sent.at(-1),action,'held key does not toggle repeatedly');
 const opened={...near,doorRevision:1,doors:near.doors.map(d=>d.id===door.id?{...d,open:true}:d)};
 ws.message({type:'state',state:opened});ws.message({type:'action',commandId:action.commandId,ok:true,code:'OPENED'});assert.match(elements.get('door').textContent,/Tancar/);assert.equal(elements.get('door').disabled,false);
 elements.get('door').onclick();const closing=ws.sent.at(-1);assert.equal(closing.open,false);ws.message({type:'action',commandId:closing.commandId,ok:false,code:'OCCUPIED'});assert.match(elements.get('message').textContent,/jugador al pas/);
 if(frames.size){const [id,fn]=[...frames][0];frames.delete(id);fn(performance.now()+16);}assert.ok(draws>10,'Canvas fallback draws actual world/players/objectives');
 assert.match(elements.get('inventory').textContent,/Bales: 24/);
 listeners.get('keydown')({code:'KeyC',repeat:false,preventDefault(){}});const equip=ws.sent.at(-1);assert.equal(equip.type,'inventory');assert.equal(equip.operation,'disguise');assert.equal(equip.target,true);assert.equal(elements.get('disguise').disabled,true);
 ws.message({type:'action',commandId:equip.commandId,ok:true,code:'EQUIPPED'});
 elements.get('drop-item').value='grenades';elements.get('drop-item').onchange();assert.equal(elements.get('drop').disabled,false);elements.get('drop').onclick();const dropped=ws.sent.at(-1);assert.equal(dropped.type,'inventory');assert.equal(dropped.operation,'drop');assert.equal(dropped.target,'grenades');assert.equal(elements.get('drop').disabled,true);ws.message({type:'action',commandId:dropped.commandId,ok:true,code:'DROPPED'});
 assert.equal(elements.has('pickup'),false,'no manual pickup control');const count=ws.sent.length;listeners.get('keydown')({code:'KeyR',repeat:false,preventDefault(){}});assert.equal(ws.sent.length,count,'R does not request a pickup');
 assert.equal(elements.get('shoot').disabled,false);listeners.get('keydown')({code:'KeyX',repeat:false,preventDefault(){}});const shot=ws.sent.at(-1);assert.equal(shot.type,'combat');assert.equal(shot.weapon,'pistol');listeners.get('keydown')({code:'KeyX',repeat:true,preventDefault(){}});assert.equal(ws.sent.at(-1),shot,'pistol does not auto-repeat');ws.message({type:'action',kind:'combat',commandId:shot.commandId,ok:true,code:'HIT'});assert.match(elements.get('message').textContent,/Impacte/);elements.get('grenade').onclick();assert.equal(ws.sent.at(-1).weapon,'grenade');
 listeners.get('pagehide')();assert.equal(timers.size,0);assert.equal(frames.size,0,'navigation releases sockets, timers and renderer');
 const {createMissionView}=await import('../src/coop-play-view.mjs'),T=await import('../vendor/three-r186.module.mjs');let rendered=false,disposed=false,expectSupply=true;
 const threeView=await createMissionView(elements.get('view'),mission.meta,g.geometry,{three:T,makeRenderer:()=>({setPixelRatio(){},setClearColor(){},setSize(){},render(scene,camera){
   rendered=true;scene.updateMatrixWorld();camera.updateMatrixWorld();assert.ok(camera.isOrthographicCamera);assert.ok(camera.projectionMatrix.elements.every(Number.isFinite));
   let meshes=0,openDoor=false,hasSupply=false;scene.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.isMesh){meshes++;const a=o.geometry.getAttribute('position');assert.ok([...a.array].every(Number.isFinite));}if(o.userData.supplyId==='dynamic-test')hasSupply=true;if(o.userData.doorId===door.id){openDoor=true;assert.equal(o.visible,false,'3D open door reflects server state');}});assert.ok(meshes>10,'actual Three scene includes physical world, players and objectives');assert.equal(openDoor,true);assert.equal(hasSupply,expectSupply,'dynamic ground object is created and removed from actual Three scene');
 },dispose(){disposed=true;}})});
 threeView.setState({...opened,supplies:[{id:'dynamic-test',item:'grenades',amount:1,...mission.meta.extraction}]});const [frame,render]=[...frames][0];frames.delete(frame);render(performance.now()+32);assert.equal(rendered,true);expectSupply=false;threeView.setState({...opened,supplies:[]});const [nextFrame,nextRender]=[...frames][0];frames.delete(nextFrame);nextRender(performance.now()+48);threeView.destroy();assert.equal(disposed,true);assert.equal(frames.size,0);
 console.log('play UI: authenticated page entry, room/launch, player-specific objective, keyboard/touch activation, blur release, Canvas world render and navigation cleanup passed');
}finally{console.error=error;for(const [k,v] of saved)if(v===undefined)delete globalThis[k];else globalThis[k]=v;}
