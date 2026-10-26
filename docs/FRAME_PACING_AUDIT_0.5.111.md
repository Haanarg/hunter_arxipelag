# Auditoria de frame pacing i temps GPU (v0.5.111)

Nova instrumentació, sense reduir la fidelitat visual, el LOD, els vehicles o la IA.

## Què registra

- Histograma dels intervals de `requestAnimationFrame`: ~8,3, ~16,7, ~25, ~33,3 ms i altres; són temps entre callbacks, **no** temps de CPU.
- `slow33Count`, `slow33PrevRenderCpuMs`, `slow33PrevUpdateCpuMs`, `normal16PrevRenderCpuMs` i `slow33PrevShadowRedrawRate`: comparació de la càrrega del **fotograma anterior** als intervals lents.
- `slowFrameSamples`: fins a sis parelles fotograma anterior/actual per fase, amb CPU, IA, ombres, GPU quan existeix, i nombre de passos de simulació. La còpia compacta conserva quatre per fase.
- `gpuTimer`: supported, unsupported, unavailable o error, amb el nombre de mostres, invalidacions GPU disjoint i mostres descartades.
- `gpuSamples`, `gpuMs`, `gpuP95Ms`, `gpuOverBudget`: GPU del render de Three.js calculada amb temporitzadors WebGL2 o WebGL1 (si s'admeten), sense `gl.finish()`, i sense consultar resultats que encara no estan disponibles.
- `phaseComparisons`: diferències de FPS, CPU render i GPU entre cada fase experimental i la mitjana de les dues fases normals.

Les crides de timer estan limitades a 8 pendents. El temps GPU només mesura la passada WebGL, no l'espera de VSYNC, ni la composició del navegador, i pot no estar disponible per motius de privacitat o de controlador. Una consulta disjoint invalida les mostres pendents. La presència de l'instrument també pot introduir un sobrecost lleuger i no és una mesura en condicions exactament idèntiques a auditories antigues.

## Ús

Amb `?perfAudit=1&stress=1`, la mateixa llavor 2407759483 i posició (1208,-1594), esperar que finalitzi la prova i prémer **Copia resum (per al xat)**. També es pot descarregar el JSON complet. Si GPU està com unsupported/unavailable/error, la resta de diagnòstics funcionen igual.

Proves: `node tests/performance-frame-pacing.cjs`, `node tests/performance-audit.cjs`, `node tools/build-runtime.cjs --check`.
