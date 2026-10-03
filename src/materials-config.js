// Perfils PBR estilitzats. Manté flatShading i la paleta viva del joc.
window.HUNTER_MATERIALS = Object.freeze({
  terrain: Object.freeze({roughness:.96,metalness:0}),
  organic: Object.freeze({roughness:.9,metalness:0}),
  masonry: Object.freeze({roughness:.88,metalness:.01}),
  paint: Object.freeze({roughness:.62,metalness:.08}),
  metal: Object.freeze({roughness:.46,metalness:.55}),
  rubber: Object.freeze({roughness:.94,metalness:0}),
  glass: Object.freeze({roughness:.18,metalness:.04,transparent:true,opacity:.72,depthWrite:false})
});
