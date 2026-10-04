// Minimap i carta de navegació. Només presentació; no modifica simulació.
window.HUNTER_MINIMAP=Object.freeze({
  create({THREE,canvas,worldSize,halfSize,heightAt,colorAt,getState}){
    const ctx=canvas.getContext('2d'),size=canvas.width||170;
    let background=null,ws=worldSize,hs=halfSize;
    const px=v=>(v+hs)/ws*size;
    function buildBackground(){
      background=document.createElement('canvas');background.width=background.height=size;
      const c=background.getContext('2d'),im=c.createImageData(size,size);
      for(let j=0;j<size;j++)for(let i=0;i<size;i++){
        const h=heightAt((i/size-.5)*ws,(j/size-.5)*ws),k=colorAt(THREE,h);
        im.data.set([k.r*255,k.g*255,k.b*255,255],(j*size+i)*4)
      }
      c.putImageData(im,0,0)
    }
    function draw(){
      if(!background)buildBackground();
      const s=getState(),q=s.current;
      ctx.drawImage(background,0,0);
      ctx.fillStyle='#2c7bff';ctx.fillRect(px(s.base.x)-3,px(s.base.z)-3,6,6);
      if(s.mapKnown){ctx.fillStyle='#ff3030';ctx.fillRect(px(s.hq.x)-3,px(s.hq.z)-3,6,6)}
      ctx.fillStyle='#ffd23a';s.vehicles.forEach(v=>{if(v!==s.currentVehicle&&Math.hypot(v.x-q.x,v.z-q.z)<450){ctx.beginPath();ctx.arc(px(v.x),px(v.z),2.5,0,7);ctx.fill()}});
      ctx.fillStyle='#ff3030';s.enemies.forEach(u=>{if(Math.hypot(u.x-q.x,u.z-q.z)<160){ctx.beginPath();ctx.arc(px(u.x),px(u.z),2,0,7);ctx.fill()}});
      ctx.fillStyle='#c070ff';s.log.forEach(m=>ctx.fillRect(px(m.x)-2,px(m.z)-2,4,4));
      (s.intel||[]).forEach(m=>{ctx.save();ctx.fillStyle=m.kind==='heli'?'#6ed6ff':'#ff9f43';ctx.strokeStyle='#111';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(px(m.x),px(m.z),5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#111';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(m.kind==='heli'?'H':'T',px(m.x),px(m.z)+.5);ctx.restore()});
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px(q.x),px(q.z),4,0,7);ctx.fill();
      ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(px(q.x),px(q.z));ctx.lineTo(px(q.x)-Math.sin(q.hd)*12,px(q.z)-Math.cos(q.hd)*12);ctx.stroke()
    }
    function drawFull(target,waypoint){
      draw();const c=target.getContext('2d');c.drawImage(canvas,0,0,target.width,target.height);
      c.strokeStyle='#fff';c.lineWidth=2;c.strokeRect(1,1,target.width-2,target.height-2);
      c.fillStyle='#fff';c.font='13px system-ui';c.fillText('N',target.width/2-5,19);c.fillText((ws/1000).toFixed(1).replace('.',',')+' × '+(ws/1000).toFixed(1).replace('.',',')+' km',14,target.height-16);
      if(waypoint){const x=(waypoint.x+hs)/ws*target.width,z=(waypoint.z+hs)/ws*target.height;c.strokeStyle='#ffdb8f';c.beginPath();c.arc(x,z,8,0,7);c.stroke()}
    }
    return Object.freeze({draw,drawFull,reset:()=>{background=null},setWorldSize:(world,half)=>{ws=world;hs=half;background=null}})
  }
});
