// Factory-owned resources survive world resets. Instance-owned resources do not.
window.HUNTER_RESOURCES=(()=>{
  const shared=new WeakSet();
  const retain=resource=>{if(resource)shared.add(resource);return resource};
  function retainModel(root){
    root.traverse(o=>{
      retain(o.geometry);
      for(const m of (Array.isArray(o.material)?o.material:[o.material])){
        if(!m)continue;retain(m);
        for(const value of Object.values(m))if(value?.isTexture)retain(value);
      }
    });return root;
  }
  function dispose(root){
    const resources=new Set();
    root.traverse(o=>{
      if(o.geometry)resources.add(o.geometry);
      for(const m of (Array.isArray(o.material)?o.material:[o.material])){
        if(!m)continue;resources.add(m);
        // Texture ownership belongs to the texture factory, not to scene materials.
      }
    });
    for(const r of resources)if(!shared.has(r))r.dispose();
  }
  // Object3D.clone serializes userData, which can contain live wheel/pivot refs.
  // Clone the hierarchy first, then remap references without sharing animation state.
  function cloneModel(root){
    const nodes=new Map();
    function copy(source){
      const data=source.userData;let target;
      source.userData={};
      try{target=source.clone(false)}finally{source.userData=data}
      nodes.set(source,target);
      for(const child of source.children)target.add(copy(child));
      return target;
    }
    const result=copy(root),values=new Map();
    function remap(value){
      if(!value||typeof value!=='object')return value;
      if(nodes.has(value))return nodes.get(value);
      if(value.isMaterial||value.isBufferGeometry||value.isTexture)return value;
      if(values.has(value))return values.get(value);
      if(typeof value.clone==='function')return value.clone();
      const out=Array.isArray(value)?[]:{};values.set(value,out);
      for(const [key,item] of Object.entries(value))out[key]=remap(item);
      return out;
    }
    for(const [source,target] of nodes)target.userData=remap(source.userData);
    return result;
  }
  return Object.freeze({retain,retainModel,dispose,cloneModel});
})();
