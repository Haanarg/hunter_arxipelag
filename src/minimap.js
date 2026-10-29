// Minimap i carta de navegació. Només presentació; no modifica simulació.
// La carta és una instantània de l'orografia natural, independent del
// terreny físic aplanat sota els complexos. El mapa gran reutilitza
// exactament la mateixa imatge; les marques descobertes s'hi superposen.
window.HUNTER_MINIMAP=Object.freeze({
  create({THREE,canvas,worldSize,halfSize,baseHeightAt,colorAt,getState}){
    if(typeof baseHeightAt!=='function')throw new TypeError('El minimapa necessita el relleu natural sense aplanaments');
    const ctx=canvas.getContext('2d');
    if(!ctx)throw new Error('No es pot crear el context 2D del minimapa');
    const width=canvas.width||170,height=canvas.height||170;
    const sampleSize=Math.min(128,Math.max(64,width));
    let background=null,ws=worldSize,hs=halfSize;
    const stats={draws:0,backgroundBuilds:0,lastLandPixels:0,lastBuildMs:0};
    const px=v=>(v+hs)/ws*width,pz=v=>(v+hs)/ws*height;
    function buildBackground(){const steps=buildBackgroundSteps();while(!steps.next().done){}}
    function* buildBackgroundSteps(){
      // Una única instantània per llavor/mida: mai no mostregem el món
      // jugable amb les plataformes, ni la regenerem quan canvia un collider.
      if(background)return;
      const start=performance.now();
      const bg=document.createElement('canvas');
      bg.width=bg.height=sampleSize;
      const c=bg.getContext('2d');
      if(!c)throw new Error('No es pot crear el fons del minimapa');
      const im=c.createImageData(sampleSize,sampleSize),data=im.data;
      let land=0;
      for(let j=0;j<sampleSize;j++)for(let i=0;i<sampleSize;i++){
        if((j*sampleSize+i)%128===0)yield {stage:'Carta de navegació',completed:j*sampleSize+i,total:sampleSize*sampleSize,unit:'píxels'};
        const x=((i+.5)/sampleSize-.5)*ws,z=((j+.5)/sampleSize-.5)*ws,
              h=baseHeightAt(x,z),k=colorAt(THREE,h).convertLinearToSRGB(),
              p=(j*sampleSize+i)*4;
        data[p]=Math.round(k.r*255);
        data[p+1]=Math.round(k.g*255);
        data[p+2]=Math.round(k.b*255);
        data[p+3]=255;
        if(h>0)land++;
      }
      c.putImageData(im,0,0);
      background=bg;
      stats.lastLandPixels=land;
      stats.backgroundBuilds++;
      stats.lastBuildMs=performance.now()-start;
    }
    function draw(){
      const s=getState();
      if(!s||!s.base||!s.current)return;
      if(!background)buildBackground();
      ctx.clearRect(0,0,width,height);
      ctx.imageSmoothingEnabled=true;
      ctx.drawImage(background,0,0,width,height);
      const q=s.current;
      ctx.fillStyle='#2c7bff';
      ctx.fillRect(px(s.base.x)-3,pz(s.base.z)-3,6,6);
      if(s.mapKnown&&s.hq){
        ctx.fillStyle='#ff3030';
        ctx.fillRect(px(s.hq.x)-3,pz(s.hq.z)-3,6,6);
      }
      // Nine clues on large maps, three on small maps. Keep nine compact
      // enough to remain distinguishable in the small HUD minimap.
      const hqClues=s.hqClues||[],manyClues=hqClues.length>3;
      for(const clue of hqClues){
        const x=px(clue.x),z=pz(clue.z);
        ctx.save();
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font='bold '+(manyClues?11:16)+'px system-ui';ctx.lineWidth=manyClues?2:3;
        ctx.strokeStyle='#2a2320';ctx.fillStyle=clue.discarded?'#777':'#ffdd64';
        ctx.strokeText('?',x,z);ctx.fillText('?',x,z);
        if(clue.discarded){
          const dx=manyClues?5:7,dz=manyClues?6:9;
          ctx.beginPath();ctx.strokeStyle='#ec4343';ctx.lineWidth=manyClues?1.7:2.5;
          ctx.moveTo(x-dx,z-dz);ctx.lineTo(x+dx,z+dz);
          ctx.moveTo(x+dx,z-dz);ctx.lineTo(x-dx,z+dz);ctx.stroke();
        }
        ctx.restore();
      }
      ctx.fillStyle='#ffd23a';
      for(const v of s.vehicles||[]){
        const dx=v.x-q.x,dz=v.z-q.z;
        if(v!==s.currentVehicle&&dx*dx+dz*dz<202500){
          ctx.beginPath();ctx.arc(px(v.x),pz(v.z),2.5,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.fillStyle='#ff3030';
      for(const u of s.enemies||[]){
        const dx=u.x-q.x,dz=u.z-q.z;
        if(dx*dx+dz*dz<25600){
          ctx.beginPath();ctx.arc(px(u.x),pz(u.z),2,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.fillStyle='#c070ff';
      for(const m of s.log||[])ctx.fillRect(px(m.x)-2,pz(m.z)-2,4,4);
      for(const m of s.intel||[]){
        if(m.ref?.destroyed)continue;
        const x=m.ref?m.ref.x:m.x,z=m.ref?m.ref.z:m.z;
        if(!Number.isFinite(x)||!Number.isFinite(z))continue;
        ctx.save();
        ctx.fillStyle=m.kind==='heli'?'#6ed6ff':'#ff9f43';
        ctx.strokeStyle='#111';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.arc(px(x),pz(z),5,0,Math.PI*2);
        ctx.fill();ctx.stroke();
        ctx.fillStyle='#111';ctx.font='bold 9px system-ui';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(m.kind==='heli'?'H':'T',px(x),pz(z)+.5);
        ctx.restore();
      }
      // These opportunities enter the map only after an actual discovery.
      for(const m of s.opportunities||[]){
        if(!Number.isFinite(m.x)||!Number.isFinite(m.z))continue;
        ctx.save();
        ctx.fillStyle=m.state==='disabled'||m.state==='lost'?'#8a9697':
          m.kind==='mechanic'?'#78e5ae':m.kind==='radio'?'#82d8e5':'#ffd17f';
        ctx.strokeStyle='#14212b';ctx.lineWidth=1.3;
        ctx.fillRect(px(m.x)-4,pz(m.z)-4,8,8);
        ctx.strokeRect(px(m.x)-4,pz(m.z)-4,8,8);
        ctx.fillStyle='#15232d';ctx.font='bold 7px system-ui';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(m.kind==='mechanic'?'M':m.kind==='radio'?'R':'P',px(m.x),pz(m.z)+.5);
        ctx.restore();
      }
      ctx.fillStyle='#fff';ctx.beginPath();
      ctx.arc(px(q.x),pz(q.z),4,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#fff';ctx.beginPath();
      ctx.moveTo(px(q.x),pz(q.z));
      ctx.lineTo(px(q.x)-Math.sin(q.hd||0)*12,pz(q.z)-Math.cos(q.hd||0)*12);
      ctx.stroke();
      stats.draws++;
    }
    function drawFull(target,waypoint){
      draw();
      const c=target.getContext('2d');
      if(!c)return;
      c.drawImage(canvas,0,0,target.width,target.height);
      if(ws>4800){
        c.save();
        c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=1;
        c.setLineDash([5,5]);c.beginPath();
        c.moveTo(target.width/2,0);c.lineTo(target.width/2,target.height);
        c.moveTo(0,target.height/2);c.lineTo(target.width,target.height/2);
        c.stroke();c.restore();
      }
      c.strokeStyle='#fff';c.lineWidth=2;c.strokeRect(1,1,target.width-2,target.height-2);
      c.fillStyle='#fff';c.font='13px system-ui';
      c.fillText('N',target.width/2-5,19);
      c.fillText((ws/1000).toFixed(1).replace('.',',')+' × '+(ws/1000).toFixed(1).replace('.',',')+' km',14,target.height-16);
      if(waypoint){
        const x=(waypoint.x+hs)/ws*target.width,z=(waypoint.z+hs)/ws*target.height;
        c.strokeStyle='#ffdb8f';c.beginPath();c.arc(x,z,8,0,Math.PI*2);c.stroke();
      }
    }
    function reset(){background=null}
    function setWorldSize(world,half){
      if(world!==ws||half!==hs){ws=world;hs=half;reset()}
    }
    return Object.freeze({draw,drawFull,reset,setWorldSize,buildBackgroundSteps,stats})
  }
});
