#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const createGame=require('./harness.cjs');
(async()=>{
  const game=await createGame(),run=game.run;
  const result=run(`(()=>{
    hAt=()=>10;seedSearchMode=false;seed=67;R=mul(seed);
    world=new THREE.Group();scene.add(world);
    B=[];Wl=[];Dr=[];stairs=[];TG.clear();V=[];activeBunker=null;
    started=1;paused=false;over=0;scopeActive=false;ib=null;cameraBasement=null;
    const b=mkB(0,0,36,38,18,0xbab99d,0xb7c1b4,{hangar:true,doorSide:0,noPartitions:true});
    const wallMesh=new THREE.Mesh(new THREE.BoxGeometry(36,18,.45),b.wm);
    wallMesh.position.set(0,9,-18.9);b.o.add(wallMesh);
    const rear={x0:-18,x1:18,z0:-18.9,z1:-18.45,y0:9,y1:28,hp:16,
      m:wallMesh,parts:[wallMesh],owner:b,hangarRear:true,
      cx:0,cz:-18.675,door:false,open:false};
    Wl.push(rear);wallGridCount=-1;
    const vehicleMesh=new THREE.Group();vehicleMesh.position.set(0,10,0);
    cv={t:'tanc',x:0,z:0,hd:Math.PI,v:0,sideV:0,strafeV:0,
      verticalV:0,o:vehicleMesh,life:16};
    V=[cv];P.x=0;P.y=10;P.z=0;resetCameraState();
    const sample=(vehicleZ,cameraZ,eyeY=10)=>{
      cv.x=0;cv.z=vehicleZ;cv.o.position.set(0,eyeY,vehicleZ);
      P.x=0;P.z=vehicleZ;P.y=eyeY;
      cam.position.set(0,eyeY+12,cameraZ);
      restoreCameraWalls();updatePlayerCamera(0);
      return {roofHidden:!b.roof.visible,rearHidden:!rear.m.visible,
        roofHp:b.rhp,rearHp:rear.hp,rearCollider:Wl.includes(rear)};
    };
    const inside=sample(-13,-31),exit=sample(21,9),clear=sample(55,43);
    const overflight=sample(0,0,45);
    // La selecció geomètrica no depèn de l'ID o color de la facció.
    const helper=window.HUNTER_CAMERA_CONTROLS.hangarBlocksSight;
    const rayExit=helper(b,{x:0,y:22,z:8},{x:0,y:12,z:29},{x:0,y:10,z:21});
    const rayClear=helper(b,{x:0,y:22,z:43},{x:0,y:12,z:63},{x:0,y:10,z:55});
    return {inside,exit,clear,overflight,rayExit,rayClear};
  })()`);
  assert(result.inside.roofHidden&&result.inside.rearHidden,
    'La volta i la paret posterior no poden tapar la vista des del vehicle dins');
  assert(result.exit.roofHidden,'La volta segueix oculta mentre la càmera és dins i el vehicle surt');
  assert(!result.exit.rearHidden,'Una paret no interposada continua visible');
  assert(!result.clear.roofHidden&&!result.clear.rearHidden,'En deixar enrere el hangar recupera la geometria');
  assert(!result.overflight.roofHidden,'Un vehicle aeri sobre la coberta no la fa desaparèixer');
  assert(result.rayExit&&!result.rayClear,'El tall geomètric respecta la línia de visió');
  for(const state of [result.inside,result.exit,result.clear,result.overflight])
    assert(state.rearCollider&&state.rearHp===16&&state.roofHp>0,'La càmera no modifica col·lisions ni punts de vida');
  console.log('OK visibilitat de la càmera: interior, boca, paret posterior, sortida i sobrevol');
})().catch(error=>{console.error(error);process.exitCode=1});
