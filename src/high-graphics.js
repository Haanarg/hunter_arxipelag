// Textura procedural repetible per al terreny en qualitat Alt.
// Material compartit: cap malla ni draw call addicional, ni canvis a la física.
window.HUNTER_HIGH_GRAPHICS=Object.freeze({
  createTerrainTextureTask(T,side=256){
    const data=new Uint8Array(side*side*4);
    const hash=(x,y)=>(Math.imul(x+11,73856093)^Math.imul(y+73,19349663))>>>0;
    const noise=(x,y,frequency)=>{
      const sx=x*frequency/side,sy=y*frequency/side,
        ix=Math.floor(sx),iy=Math.floor(sy),
        fx=sx-ix,fy=sy-iy,tx=fx*fx*(3-2*fx),ty=fy*fy*(3-2*fy),
        at=(a,b)=>(hash((a+frequency)%frequency,(b+frequency)%frequency)%10000)/10000;
      return (at(ix,iy)*(1-tx)+at(ix+1,iy)*tx)*(1-ty)+
        (at(ix,iy+1)*(1-tx)+at(ix+1,iy+1)*tx)*ty;
    };
    let nextRow=0,finished=null;
    const advance=(rows=8)=>{
      if(finished)return finished;
      const end=Math.min(side,nextRow+Math.max(1,Math.floor(rows)));
      for(let y=nextRow;y<end;y++)for(let x=0;x<side;x++){
      const large=noise(x,y,8),medium=noise(x,y,32),grains=noise(x,y,64),
        shade=Math.max(209,Math.min(255,Math.round(224+17*large+10*medium+6*grains))),
        i=(y*side+x)*4;
      data[i]=shade;data[i+1]=shade;data[i+2]=shade;data[i+3]=255;
      }
      nextRow=end;
      if(nextRow<side)return null;
    const tex=new T.DataTexture(data,side,side,T.RGBAFormat,T.UnsignedByteType);
    tex.wrapS=tex.wrapT=T.RepeatWrapping;
    tex.magFilter=T.LinearFilter;
    tex.minFilter=T.LinearMipmapLinearFilter;
    tex.generateMipmaps=true;
    tex.colorSpace=T.SRGBColorSpace;
    tex.anisotropy=4;
    tex.repeat.set(20,20);tex.needsUpdate=true;
    tex.name='hunter-terrain-detail-high';
    finished=tex;return tex;
    };
    return {advance,get progress(){return nextRow/side}};
  },
  createTerrainTexture(T,side=256){
    return this.createTerrainTextureTask(T,side).advance(side);
  }
});
