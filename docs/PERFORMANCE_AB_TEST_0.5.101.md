# Prova A/B de rendiment — 0.5.101 (26 d’octubre de 2026)

## Objectiu
Localitzar el cost de les **crides de dibuix**, les **ombres**, l’**aigua** i les
**col·lisions de la IA** sense rebaixar permanentment la qualitat gràfica.

## Com executar-la
1. Obre el joc amb `?perfAudit=1` (o `&perfAudit=1` si l’URL ja té paràmetres).
   El carregador escull **scripts font** expressament per al diagnòstic.
2. Mantén els gràfics **Alts** i entra en una partida amb una llavor concreta
   (per exemple, `67`). Per comparar diverses versions, repeteix llavor,
   mida de mapa, càmera, punt de vista, resolució i ordinador.
3. Durant la prova **no moguis el personatge ni la càmera**.
   Una targeta mostra les fases: normal, sense ombres, sense aigua,
   sense totes dues i normal una altra vegada. Cada fase descarta
   1,1 s inicials i recull aproximadament 3 s de fotogrames vàlids.
4. Quan acabi, prem **Copia els resultats** o consulta
   `window.HUNTER_PERF_AUDIT_RESULTS` a la consola.
   Tant si acaba com si s'interromp, es restitueixen els valors originals.

## Com interpretar les mesures
- `renderCpuMs`: només el temps de crida a `WebGLRenderer.render`.
  Inclou possibles bloquejos del controlador, però **no és temps de GPU**.
- `postRenderCpuMs`: textura de terreny i refinament del mar, abans
  comptats incorrectament dins `renderCpuMs`.
- `updateCpuMs`: lògica i IA. `aiSweepMs` és part de `aiNavMs`
  i `aiMs`; no se sumen aquests valors.
- `drawCalls`: comptador de Three.js, incloses passades addicionals;
  `groups`: etiquetes per família, no necessàriament sumen `drawCalls`.
- `baseline`: mitjana de les dues fases normals; si els FPS difereixen més
  d'un 15 %, la comparació pot haver estat influïda per escalfament,
  càrrega en segon pla o canvis en la simulació.
- La IA segueix simulant-se mentre es mostregen els fotogrames:
  és una prova de la partida real, però les unitats enemigues es poden moure.
  No substituir un perfilat de GPU detallat.

## Seguretat i regressions
L'activació és exclusivament per URL; el mode normal no altera ombres
ni aigua i segueix fent servir el paquet runtime. Les 5 fases només
canvien visibilitat del mar i renderització d'ombres; no canvien
geometries, distàncies de LOD, física ni precisió dels enemics.
`node tests/performance-audit.cjs` valida seqüència, dades i restauració.
`node tools/build-runtime.cjs --check` valida el paquet publicat.

**Límit de la verificació:** el test automatitzat prova la lògica del
diagnòstic, no proporciona un valor real d'FPS d'un navegador/GPU.
Per obtenir mesures en maquinari cal obrir el joc amb la URL anterior.
