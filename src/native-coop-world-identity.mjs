// Identitat canònica del COOP: petites diferències de trigonometria entre
// navegadors no han de fer diferents dos mons geomètricament equivalents.
// Les dades originals conserven tota la precisió per al Worker i la física.
const normalizeCentimeters=value=>{
 if(typeof value==='number'&&Number.isFinite(value))
   return Math.round(value*100)/100;
 if(Array.isArray(value))return value.map(normalizeCentimeters);
 if(value&&typeof value==='object')
   return Object.fromEntries(Object.entries(value).map(([key,row])=>[key,normalizeCentimeters(row)]));
 return value;
};
export function canonicalNativeCoopWorldString(payload){
 if(!payload?.geometry||!Array.isArray(payload.geometry.trees)||!Array.isArray(payload.targets))
   throw new TypeError('Món COOP incomplet');
 return JSON.stringify({...payload,geometry:{...payload.geometry,
   trees:normalizeCentimeters(payload.geometry.trees)},
   targets:normalizeCentimeters(payload.targets)});
}
