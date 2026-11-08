// Limita el missatge d'error: el Three.js minificat és una sola línia
// i Node imprimeix >700 kB de codi font si una excepció surt del top-level.
try{
 await import('./vehicle-lod-smoke.mjs');
}catch(e){
 console.error('LODSmoke: '+(e?.name||'Error')+': '+(e?.message||String(e)));
 for(const line of String(e?.stack||'').split('\n').slice(1,7)){
   console.error('  '+line.slice(0,500));
 }
 process.exitCode=1;
}
