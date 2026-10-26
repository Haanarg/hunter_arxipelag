# Auditoria d’estrès i desglossament de vehicles — v0.5.105

## Ordre de feina

1. **Estrès reproduïble**: `?perfAudit=1&stress=1` carrega la llavor històrica `2407759483`, mapa petit (4,8 km) i qualitat **Alts**, i situa el jugador a **X=1208, Z=−1594**, mirant cap a l'interior de l'arxipèlag. Aquest punt s'havia fet servir en proves de rendiment antigues. L'escenari no afecta partides normals. L'auditoria utilitza 3,5 s d'estabilització i 5 s de mostreig per fase.
2. **Llanxes i ombres**: `vehicle llanxa` continua projectant la mateixa ombra. En el seguiment immediat, un proxy estable conserva X, Z i orientació horitzontal (yaw), però no el capcineig, el balanceig ni l'alçada provocats per les onades. El mapa complet continua actualitzant-se cada 180 ms, quan es mouen altres elements o quan una llanxa navega/gira.
3. **Auditoria de vehicles**: els hooks de dibuix existents recullen les crides normals per tipus (`vehicleTypes`), els components dominants (`vehicleParts`) i les passades d'ombres (`vehicleShadowTypes`). `vehicleFleet` registra nombre de vehicles, malles i candidats d'ombres per model (inclou els enemics vehiculars coneguts). Aquest recompte s'activa només en mostrar les estadístiques i no substitueix les mesures de GPU.

## Interpretació

Els resultats exportats a `window.HUNTER_PERF_AUDIT_RESULTS` incorporen `stressPreset`, `auditPosition`, `vehicleFleet`, `vehicleTypes`, `vehicleParts`, `vehicleShadowTypes`, `boatMotionProxies`, `p99FrameMs` i comptadors de fotogrames lents. Els grups de dibuix tenen les mateixes categories que abans; un vehicle enemic pot estar classificat al grup `enemics` i també aparèixer al desglossament de vehicles, però no es duplica cap crida al total.

És una auditoria **CPU + crides del renderitzador**, no un mesurador directe de GPU. Les captures de versions diferents només són comparables amb la mateixa posició, càmera, llavor, mida, qualitat i condicions de càrrega de terreny.

## Com executar

Obre el joc amb `?perfAudit=1&stress=1`, inicia una partida i no moguis el personatge fins que acabi l'auditoria. El botó **Copia resum (per al xat)** envia totes cinc fases i els diagnòstics principals en un JSON curt, sense camps repetits extensos. **Copia JSON complet** conserva totes les dades, però pot ser massa llarg per enganxar-lo en un xat. **Descarrega JSON complet** guarda el fitxer íntegre en format `.json`. Revisa `base-1`, `base-2`, `shadowRedrawRate`, `shadowCulprits`, `vehicleTypes` i `vehicleParts`.

Si el punt inicial és impracticable en una llavor futura, no interpretis la comparació com a idèntica a la històrica; caldrà ajustar l'escenari.

## Regressions

- `node tests/stress-audit-config.cjs`
- `node tests/shadow-boat-cache.cjs`
- `node tests/optimization-ui-render-hooks.cjs`
- `node tests/performance-audit.cjs`
- `node tests/shadow-cache.cjs`
- `node tools/build-runtime.cjs --check`

No s'han reduït la resolució, els filtres d'ombres, els models de vehicles ni la qualitat de l'aigua. Les millores reals d'FPS i l'aparença en navegadors amb GPU només es poden determinar executant la prova.
