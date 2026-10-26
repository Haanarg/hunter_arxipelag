# Rendiment: ombres, jugador i camins (v0.5.103)

## Canvis
- **Memòria cau d'ombres:** invalidació per moviment rellevant, canvi del focus solar, nombre de candidats o refresc preventiu. Les diferències petites de postura s'agrupen durant un màxim de **48 ms**; els moviments grans (≥0,12 en una component local) es recalculen immediatament. El refresc preventiu es manté a **180 ms**.
- **Diagnòstic causal:** `window.HUNTER_SHADOW_STATS.cache` inclou `reasons`, `culprits`, `lastReason`, `lastCulprit` i `motionDeferrals`. Les fases de `?perfAudit=1` recullen `shadowReasons` i `shadowCulprits` per separat, sense confondre els comptadors acumulats amb cada fase.
- **Model del jugador:** fusió de malles rígides del mateix parent i material, excloent pivots, malles referenciades per animació, transparències, geometries especials i parts amb estats de render diferents. Les mateixes posicions, normals, triangles i materials s'han de conservar. El resultat queda a `playerBatchStats` en el JSON de l'auditoria.
- **Camins:** els sectors passen de 32 a 64 cel·les (48 → 96 m) per reduir el nombre de malles; es manté la mateixa superfície i la mateixa resolució de la ruta. Per evitar artefactes amb la càrrega progressiva del terreny, es comproven les versions d'alçada en **9 punts** de cada sector, no només a les quatre cantonades.
- No es modifiquen els paràmetres visuals d'Alts, la resolució de les ombres, la qualitat del mar, la física ni la IA.

## Prova
Carrega la versió 0.5.103 amb `?perfAudit=1`, gràfics Alts i llavor `2271691159`. Compara especialment `base-1` i `base-2`, `shadowRedrawRate`, `shadowReasons`, `shadowCulprits`, `playerBatchStats` i `pathStats.chunks`. Si l'última fase torna a tenir un 100% de refrescos, les causes exactes apareixeran al JSON.

## Proves de regressió
`node tests/player-batching.cjs`, `node tests/shadow-cache.cjs`, `node tests/performance-audit.cjs`, `node tests/compound-paths.cjs` i `node tests/optimization-ui-render-hooks.cjs`. El paquet és generat en l'ordre de `src/runtime-scripts.mjs` amb el nom i hash de contingut corresponents.

**Limitació:** cap prova sintètica garanteix el nombre final de FPS ni substitueix una validació gràfica en navegador real.
