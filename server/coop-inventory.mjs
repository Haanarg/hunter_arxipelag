// Fraction of this server tick at which the body first touches a ground item.
export function firstSupplyContact(from,to,item,radius=1.2){
  const dx=to.x-from.x,dz=to.z-from.z,ox=from.x-item.x,oz=from.z-item.z,
    a=dx*dx+dz*dz,c=ox*ox+oz*oz-radius*radius;
  let t=0;
  if(c>0){if(a<1e-12)return null;const b=2*(ox*dx+oz*dz),d=b*b-4*a*c;if(d<0)return null;t=(-b-Math.sqrt(d))/(2*a);if(t<0||t>1)return null;}
  return Math.abs(from.y+(to.y-from.y)*t-item.y)<1.2?t:null;
}
