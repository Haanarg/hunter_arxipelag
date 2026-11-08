// Només per a les proves Node: equivalent a l'importmap del navegador.
export async function resolve(specifier,context,nextResolve){
 if(specifier==='three')
   return nextResolve(new URL('../vendor/three-r186.module.mjs',import.meta.url).href,context);
 if(specifier.startsWith('three/addons/'))
   return nextResolve(new URL('../vendor/three-addons/'+specifier.slice('three/addons/'.length),import.meta.url).href,context);
 return nextResolve(specifier,context);
}
