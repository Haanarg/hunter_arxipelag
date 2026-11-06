// El render de Three.js actualitza matrius de TOTS els descendants,
// inclosos els grups invisibles de LOD i els edificis fora del camp visual.
// Aquests grups no contribueixen a cap passada de render; ometre'n els
// descendents durant render() redueix la feina sense tocar física ni IA.
//
// El mode de poda dura només durant renderer.render(). La resta de crides
// updateMatrixWorld() del joc funcionen com sempre, fins i tot a grups ocults.
window.HUNTER_HIDDEN_MATRIX=Object.freeze({
  create(){
    const installed=new WeakSet();
    let rendering=false,skipped=0,registered=0;
    function register(node){
      if(!node?.children?.length||installed.has(node)||
         Object.prototype.hasOwnProperty.call(node,'updateMatrixWorld'))return false;
      const original=node.updateMatrixWorld;
      if(typeof original!=='function')return false;
      node.updateMatrixWorld=function(force){
        if(rendering&&this.visible===false){
          // Quan reapareix, forçam el càlcul de tota la subjerarquia.
          // Cap matriu antiga pot sobreviure a la transició de LOD.
          this.matrixWorldNeedsUpdate=true;
          skipped++;
          return;
        }
        return original.call(this,force);
      };
      installed.add(node);
      registered++;
      return true;
    }
    function beginRender(){rendering=true;skipped=0}
    function endRender(){rendering=false}
    return Object.freeze({
      register,beginRender,endRender,
      get skipped(){return skipped},
      get registered(){return registered},
      get rendering(){return rendering}
    });
  }
});
