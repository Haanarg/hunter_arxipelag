// Original solo environment responses, shared with authoritative co-op.
export function palmCrushRadius(type,scale=1){return ({tanc:3.2,camio:2.6,tanqueta:2.4}[type]||0)*scale;}
export function palmImpact(type,speed,mass=1){
 const heavy=type==='tanc'||type==='camio';
 if(!heavy&&speed<=10)return {destroy:false,damage:0,speedFactor:.12,bump:.12,cooldown:.15};
 return {destroy:true,damage:heavy?0:Math.min(3,Math.max(1,Math.ceil(speed/(18*Math.sqrt(mass||1))))),speedFactor:heavy?1:.9,bump:heavy?.06:.18,cooldown:heavy?.08:.28};
}
export function rockImpact(speed,mass=1){return {damage:speed>10?Math.min(5,Math.max(1,Math.ceil(speed/(9*Math.sqrt(mass||1))))):0,speedFactor:-.12,bump:.22,cooldown:.32};}
export function rockVerticalBand(mode,ground,alt=0,scale=1){
 const baseY=mode==='a'?alt-1:(mode==='w'||mode==='wl')?-1.4:ground;
 return {baseY,topY:mode==='a'?alt+2:baseY+Math.max(2,scale*2.2)};
}
