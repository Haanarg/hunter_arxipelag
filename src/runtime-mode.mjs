// Política temporal mentre s'audita el bundle: per defecte carregam les
// fonts originals. L'opció ?runtime=bundle és una prova explícita, no
// la ruta de producció. PerfAudit segueix usant source de manera segura.
export function selectRuntimeMode(params){
 return params.get('runtime')==='bundle'&&params.get('perfAudit')!=='1'?'bundle':'source';
}
