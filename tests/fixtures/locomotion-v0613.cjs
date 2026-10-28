// Frozen from v0.6.13 main 0297d70a3c14d5b896e3df6f498574d5090cf222.
// Canonical physical support is injected; excludes local LOD and moving ferries.
module.exports=function({activeBunker,buildingCandidates,buildingLocalPoint,solidRoofAt,stairContains,groundAt,bunkerSubFloorAt,hAt}){
function playerInsideBunkerBasement(x,z,y){
 const b=activeBunker;
 if(!b?.basement||!Number.isFinite(y)||y>=b.fy-2)return false;
 const q=buildingLocalPoint(b,x,z);
 return Math.abs(q.x)<b.basement.halfX-.45&&
   Math.abs(q.z)<b.basement.halfZ-.45;
}
function stairDropAt(x,z,previousY){
  if(!Number.isFinite(previousY))return false;
  const b=activeBunker;
  if(b?.basement&&previousY>b.fy-1){
    const p=buildingLocalPoint(b,x,z),st=b.basement.stair;
    if(Math.abs(p.x-st.x)<st.width/2&&
      p.z>Math.min(st.zTop,st.zBottom)&&p.z<Math.max(st.zTop,st.zBottom)&&
      previousY-bunkerSubFloorAt(x,z,previousY)>.7)return true;
  }
  for(const building of buildingCandidates(x,z)){
    if(!building.upperFloor||building.rb||!building.interiorStair||building.interiorStair.destroyed)continue;
    const level=building.fy+building.storey+.15;
    if(previousY<level-.6||!stairContains(building.interiorStair,x,z))continue;
    if(previousY-groundAt(x,z,previousY)>.7)return true;
  }
  return false;
}
return function(x,z,y){const inside=buildingCandidates(x,z).find(b=>Math.abs(x-b.x)<b.w/2&&Math.abs(z-b.z)<b.d/2&&y<(solidRoofAt(b,x,z)?.bottom??b.fy+b.h+.1))||null;
return {interior:!!inside,basement:playerInsideBunkerBasement(x,z,y),drop:stairDropAt(x,z,y),floor:inside&&inside.kind!=='enemy_bunker'?Math.max(inside.fy+.3,groundAt(x,z,y)):groundAt(x,z,y),terrain:hAt(x,z)};};
};
