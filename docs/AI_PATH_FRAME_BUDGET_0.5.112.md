# Amortització de pics de la IA — v0.5.112

L'auditoria 0.5.111 va trobar intervals de 33 ms precedits de fins a 20 ms de CPU, amb alguns fotogrames dedicant 7–9 ms a la IA. La GPU no admetia la consulta de temps (`gpuTimer: unsupported`). Aquesta revisió es concentra en els trams de cerca A* que tenen cost variable, sense canviar la geometria ni la distància de visió dels enemics.

## Canvis

- Les cerques A* existents continuen amb el seu heap, objectiu, nodes i obstacles. S'interrompen després de blocs de vuit expansions si el tram consumeix aproximadament 1,25 ms (unitats prioritàries) o 0,55 ms (patrulles llunyanes sense alerta ni persecució).
- Es manté el límit de 160 nodes totals i dos intents per fotograma. Una cerca llunyana en patrulla només pot consumir 48 nodes i un dels dos intents per fotograma. Els enemics en combat, investigació, cerca, al soterrani, en alerta o prop del jugador no es classifiquen com a passius.
- El pressupost es reinicia un cop per fotograma visual i no es duplica quan el rellotge de simulació executa dos passos després d'un interval de 33 ms.
- Els retards només s'apliquen al càlcul de rutes A*, no a la percepció, el tret, el dany, les explosions ni les comprovacions de moviment final.
- L'auditoria afegeix `aiMsP95`, `aiMsP99`, `aiNavMsP95`, `aiPathMs`, `aiPathChecks`, `aiPathDeferred`, `aiPathNodes` i `aiPassivePathNodes`.

## Proves

`node tests/ai-path-frame-budget.cjs`, `node tests/ai-cpu-optimization.cjs`, `node tests/enemy-navigation.cjs`, `node tests/enemy-route-probe-budget.cjs`, `node tests/performance-audit.cjs`, `node tools/build-runtime.cjs --check`.

Les comprovacions sintètiques han confirmat rutes idèntiques abans i després de dividir les cerques. Els FPS reals encara s'han de comparar amb la 0.5.111 utilitzant `?perfAudit=1&stress=1`. Si alguna patrulla llunyana tarda més a completar una ruta complexa, és conseqüència de repartir la mateixa cerca entre més fotogrames; les unitats en combat es mantenen prioritzades.
