// Distribució determinista, sense tirades a R(), per mantenir sincronitzats
// el generador de llavors i el joc. Instancing i col·lisions es fan al nucli.
const fract=v=>v-Math.floor(v);
export const rockNoise=(x,z,n=0)=>fract(Math.sin(x*127.13+z*313.17+n*57.71)*43758.5453);
export function baseRockCluster(x,z,s,addRock){
 const count=rockNoise(x,z,6)>.48?4:3,angle=rockNoise(x,z,8)*Math.PI*2;
 let placed=0;
 for(let i=0;i<count;i++){
   const a=angle+Math.PI*2*i/count+(rockNoise(x,z,20+i)-.5)*.55,
         d=.7+rockNoise(x,z,31+i)*2.2,
         px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d,
         scale=s*(.55+rockNoise(x,z,41+i)*.57),
         type=rockNoise(x,z,60+i)>.76?1:0;
   if(addRock(px,pz,scale,type))placed++;
 }
 return placed;
}
export function generateRockFields(options){const steps=generateRockFieldsSteps(options);let next;while(!(next=steps.next()).done){}return next.value}
export function* generateRockFieldsSteps({islands,hAt,canPlace,addRock}){
 const stats={summitB:0,summitD:0,shoreClusters:0,shoreRocks:0,summitRocks:0};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 let sampled=0;
 let processed=0;
 for(const island of islands){
   yield {stage:'Roques de costa i cims',completed:processed++,total:islands.length,unit:'illes'};
   const ix=island.x,iz=island.z,r=island.r;
   // Alguns vessants elevats, no el punt culminant. Roques del grup B o D
   // segons l'illa, amb variants de proporcions i grandària.
   if(r>115&&rockNoise(ix,iz,12)>.29){
     const attempts=r>230?2:1;
     for(let block=0;block<attempts;block++){
       const kind=rockNoise(ix,iz,17+block)>.52?1:0;
       let center=null,score=-Infinity;
       for(let j=0;j<28;j++){
         if(sampled++%32===0)yield {stage:'Mostrejant roques dels cims',completed:sampled-1,total:null,unit:'mostres'};
         const a=2*Math.PI*rockNoise(ix,iz,100+block*41+j),
           radial=r*(.25+.38*rockNoise(ix,iz,260+j+block*27)),
           x=ix+Math.cos(a)*radial,z=iz+Math.sin(a)*radial,
           y=hAt(x,z);
         if(y<24||!canPlace(x,z,kind?12:9))continue;
         const rank=y*.08+rockNoise(x,z,311)*3;
         if(rank>score){center={x,z,a,y};score=rank}
       }
       if(!center)continue;
       let added=0;
       const count=kind?5+Math.floor(rockNoise(ix,iz,300+block)*4):
         8+Math.floor(rockNoise(ix,iz,301+block)*5);
       for(let n=0;n<count;n++){
         const a=center.a+2*Math.PI*n/count+(rockNoise(ix,iz,330+n+block*17)-.5),
           d=(1+Math.sqrt(n+1)*2.15)*(kind?1.4:1.10),
           x=center.x+Math.cos(a)*d,z=center.z+Math.sin(a)*d,
           scale=kind?2.2+rockNoise(x,z,401)*2.8:1.15+rockNoise(x,z,402)*1.95;
         if(addRock(x,z,scale,kind))added++;
       }
       if(added>=3){stats[kind?'summitD':'summitB']++;stats.summitRocks+=added}
     }
   }
   // Esculls tipus C: una línia densa i sinuosa que va de platja a mar,
   // amb longitud, amplada, alçada i nombre de blocs variables per illa.
   if(r<75||rockNoise(ix,iz,21)<.47)continue;
   const groups=r>260&&rockNoise(ix,iz,23)>.56?2:1;
   for(let group=0;group<groups;group++){
     let shore=null;
     const startAngle=2*Math.PI*rockNoise(ix,iz,27+group);
     for(let j=0;j<22&&!shore;j++){
       const a=startAngle+j*Math.PI*2/22,ux=Math.cos(a),uz=Math.sin(a);
       let land=null;
       for(let d=Math.max(18,r*.28);d<r*1.8;d+=4){
         if(sampled++%32===0)yield {stage:'Mostrejant esculls de costa',completed:sampled-1,total:null,unit:'mostres'};
         const x=ix+ux*d,z=iz+uz*d,y=hAt(x,z);
         if(y>.75){land={x,z,d};continue}
         if(land&&y<-.55){
           const sx=land.x,sz=land.z;
           if(canPlace(sx,sz,12))shore={x:sx,z:sz,ux,uz};
           break;
         }
       }
     }
     if(!shore)continue;
     const length=12+rockNoise(ix,iz,51+group)*28,
       width=1.3+rockNoise(ix,iz,52+group)*2.8,
       count=8+Math.floor(rockNoise(ix,iz,53+group)*19),
       tall=rockNoise(ix,iz,54+group)>.55;
     let actual=0;
     for(let n=0;n<count;n++){
       const t=(n+.3*rockNoise(ix,iz,70+group*37+n))/count,
         bend=Math.sin(t*6+group)*width*.7,
         sideways=(rockNoise(ix,iz,120+group*31+n)-.5)*width*2+bend,
         outward=-5+t*length+(rockNoise(ix,iz,190+n+group*15)-.5)*3.2,
         x=shore.x+shore.ux*outward-shore.uz*sideways,
         z=shore.z+shore.uz*outward+shore.ux*sideways,
         y=hAt(x,z);
       if(y<-4.6||y>5.0)continue;
       const scale=(.7+rockNoise(x,z,300)*1.65)*(tall?1.12:.88),
         kind=(rockNoise(x,z,302)>(tall?.42:.83))?1:0;
       if(addRock(x,z,scale,kind))actual++;
     }
     if(actual>=4){stats.shoreClusters++;stats.shoreRocks+=actual}
   }
 }
 return stats;
}
