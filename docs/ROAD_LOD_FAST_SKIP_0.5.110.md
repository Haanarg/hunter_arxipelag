# Auditoria i revisions LOD dels camins (v0.5.110)

La v0.5.109 agrupava els camins en sectors de 128 cel·les per reduir draw calls, però la comprovació de totes les versions del terreny de cada sector encara s'executava cada fotograma. La v0.5.110 preserva la mateixa geometria i agrupació, i elimina aquestes comprovacions quan no hi ha modificacions.

- Cada nova malla LOD del terreny incrementa un comptador `surfaceRevision`.
- Cada sector del camí llegeix aquesta revisió una vegada per draw. Si no ha canviat, no consulta cap `surfaceVersionAt`.
- Quan canvia la revisió global, comprova la graella local de 32 m i només recalcula altures i normals si canvia una versió local.
- Sense paràmetre `heightRevision`, el constructor manté el comportament anterior.
- El resum de rendiment incorpora `slowFrames20`, `frames20to25` i `frames24to25` (talls a 20–25 ms), i `roadVersionCpuMs`, `roadRefitCpuMs`, `roadVersionChecks`, `roadFastSkips` i `roadRefits`.

Els temps dels camins estan inclosos dins `renderCpuMs`; no s'han de sumar a aquest temps.

Tests: `node tests/road-lod-fast-skip.cjs`, `node tests/compound-paths.cjs`, `node tests/render-batching-regressions.cjs`, `node tests/performance-audit.cjs`, `node tools/build-runtime.cjs --check`.

Els FPS han de ser validats en el dispositiu amb `?perfAudit=1&stress=1`; la regressió anterior no es pot atribuir exclusivament als camins amb una sola execució.
