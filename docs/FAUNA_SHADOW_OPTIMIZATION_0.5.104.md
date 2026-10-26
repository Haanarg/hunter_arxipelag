# Correcció de la invalidació d'ombres per fauna — v0.5.104

## Problema detectat

L'auditoria v0.5.103, llavor `2271691159`, reportava `shadowRedrawRate: 1` i `shadowCulprits: {"fauna / Group": 168}` en la primera fase. Una gavina propera era suficient per invalidar **tot** el mapa d'ombres a cada fotograma, fins i tot si la fauna feia molt poques crides en la passada d'ombres.

## Correcció

A `updateShadowCasters` distingim els propietaris classificats com `fauna`:
- **Conserven** `mesh.castShadow=near`, la distància de visibilitat i les seves malles en la passada d'ombres.
- **No participen** en `shadowPoseNodes`, el conjunt de transforms que forcen un refresc immediat.
- El mapa d'ombres es torna a dibuixar en el refresc preventiu general de **180 ms**, en canviar la posició solar o si qualsevol altre objecte rellevant (jugador, vehicle, enemic) exigeix una actualització.
- No es modifiquen l'animació de les gavines ni dels taurons, les col·lisions, el model, la geometria, la resolució d'ombres o les distàncies de culling.

## Diagnòstic

`window.HUNTER_SHADOW_STATS.deferredFaunaCasters` indica el nombre de malles de fauna que projecten ombra però que no invaliden el mapa a cada moviment.

La prova A/B (`?perfAudit=1`) incorpora `stats.deferredFaunaCasters`, juntament amb `shadowRedrawRate`, `shadowReasons` i `shadowCulprits`, per comprovar que l'optimització fa efecte.

## Regressions

`node tests/shadow-fauna-cache.cjs` comprova l'algoritme real de classificació: dues malles de fauna properes continuen projectant ombres però no disparen refrescos immediats; els animals llunyans no projecten; el jugador i el vehicle sí que forcen el refresc, i el refresc periòdic continua actiu.

`node tests/shadow-cache.cjs` i `node tests/performance-audit.cjs` preserven els contractes anteriors.

**Límit:** és un canvi de freqüència d'actualització de les ombres de fauna (fins a 180 ms) per guanyar estabilitat. La millora real d'FPS i l'aspecte en un navegador s'han de validar amb la mateixa llavor i la mateixa qualitat.
