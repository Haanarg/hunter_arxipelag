const assert=require('node:assert/strict');
(async()=>{
 const g=await require('./harness.cjs')(undefined,{controls:true});g.start('67');
 g.run(`paused=false;over=false;cv=null;playerFall=null;playerEject=null;swimming=false;
 globalThis.contextDoor=Dr.find(d=>!d.locked&&!d.alwaysOpen&&!d.bunkerInteriorDoor&&!d.bunkerGate);
 P.x=contextDoor.cx+contextDoor.nx*2;P.z=contextDoor.cz+contextDoor.nz*2;P.y=contextDoor.y0+1.06;
 contextDoor.open=false;contextDoor.desiredOpen=false;updateDoors(.5);updateActionButton(nearV());`);
 assert.equal(g.run('contextDoor.open'),false,'proximity no longer opens the door');assert.equal(g.el('mainActionButton').innerHTML,g.run('HUNTER_ACTION_ICONS.door'));assert.equal(g.el('mainActionButton').title,'Obrir porta');
 g.dispatch('window','keydown',{code:'KeyE',repeat:false});assert.equal(g.run('contextDoor.open'),true);assert.equal(g.el('mainActionButton').title,'Tancar porta');assert.equal(g.run('cv'),null,'door action does not enter a nearby vehicle');
 g.dispatch('window','keydown',{code:'KeyE',repeat:true});assert.equal(g.run('contextDoor.open'),true,'holding E cannot toggle repeatedly');
 g.run('P.x+=100;updateDoors(60)');assert.equal(g.run('contextDoor.open'),true,'open door remains open after leaving');
 g.run('P.x=contextDoor.cx;P.z=contextDoor.cz;P.y=contextDoor.y0+1.06');g.dispatch('window','keydown',{code:'KeyE'});assert.equal(g.run('contextDoor.open'),true,'cannot close onto the player');
 g.run('P.x=contextDoor.cx+contextDoor.nx*2;P.z=contextDoor.cz+contextDoor.nz*2');g.el('mainActionButton').dispatchEvent({type:'pointerdown',pointerId:1});g.el('mainActionButton').dispatchEvent({type:'pointerup',pointerId:1});assert.equal(g.run('contextDoor.open'),false,'contextual touch button closes');g.run('updateDoors(60)');assert.equal(g.run('contextDoor.open'),false,'closed door stays closed while standing nearby');
 // New and legacy save restoration both retain the open state.
 g.el('mainActionButton').dispatchEvent({type:'keydown',code:'Enter',repeat:false});assert.equal(g.run('contextDoor.open'),true,'focused action supports Enter');
 g.run(`globalThis.doorSnapshot=captureOperation('Porta persistent');contextDoor.desiredOpen=false;contextDoor.open=false;applyOperationSnapshot(doorSnapshot);updateDoors(.1)`);assert.equal(g.run('contextDoor.open'),true);
 g.run(`const legacyDoorRecord=doorSnapshot.world.entities.structures.find(r=>r.id===contextDoor.saveId);delete legacyDoorRecord.state.desiredOpen;contextDoor.desiredOpen=false;applyOperationSnapshot(doorSnapshot);updateDoors(.1)`);assert.equal(g.run('contextDoor.open'),true,'legacy save without intent retains open state');
 g.run(`globalThis.testGate=Dr.find(d=>d.bunkerGate);P.x=testGate.cx+testGate.nx*2;P.z=testGate.cz+testGate.nz*2;P.y=testGate.y0+1.06;cv=null;paused=false;testGate.open=false;testGate.openProgress=0;testGate.desiredOpen=false;updateDoors(1)`);assert.equal(g.run('testGate.openProgress'),0,'gate also requires E');
 g.run(`act('KeyE');updateDoors(5)`);assert.equal(g.run('testGate.openProgress'),.5);g.run('P.x+=100;updateDoors(5)');assert.equal(g.run('testGate.open'),true,'gate completes opening and remains open without proximity');
 g.run(`P.x=testGate.cx+testGate.nx*2;P.z=testGate.cz+testGate.nz*2;act('KeyE');updateDoors(10)`);assert.equal(g.run('testGate.openProgress'),0);
 g.run(`P.y+=20;updateActionButton(null)`);assert.notEqual(g.el('mainActionButton').innerHTML,g.run('HUNTER_ACTION_ICONS.door'),'another floor cannot operate the door');
 g.run(`globalThis.contextVehicle=V.find(v=>VT[v.t]?.m==='l'&&!v.sunk&&Dr.every(d=>Math.hypot(v.x-d.cx,v.z-d.cz)>15));cv=null;P.x=contextVehicle.x;P.z=contextVehicle.z;P.y=hAt(P.x,P.z);paused=false;updateActionButton(nearV())`);assert.equal(g.el('mainActionButton').innerHTML,g.run('HUNTER_ACTION_ICONS.vehicle(nearV().t)'));g.run(`act('KeyE');updateActionButton(null)`);assert.equal(g.run('!!cv'),true);assert.match(g.el('mainActionButton').title,/Baixar/);
 console.log('context doors: actual world keyboard/touch/icon, no proximity open/close, occupied passage, retained state, new/legacy saves, manual timed bunker gate and height passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
