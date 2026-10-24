# Fase 10 — generació progressiva, v0.5.80

## Comportament

L'inici i el reinici de l'operació generen el món cooperativament. La pantalla mostra l'etapa real i, quan es coneix, el recompte d'unitats completades. La barra indica **el progrés de l'etapa actual**, no un percentatge global estimat. El botó **Cancel·la** torna a la portada i descarta el món parcial.

El treball es reparteix dins de la cerca d'emplaçaments, construcció de complexos, terreny inicial, fons marí, escuma, vegetació, roques, vehicles, patrulles, navegació, camins, agrupació de malles i minimapa. La neteja del món anterior també cedeix el control. No es tracta només de posar una espera entre fases monolítiques.

Mentre es genera no avancen la simulació, la IA, les armes, el dany ni el temps de missió. Els clics duplicats comparteixen la mateixa operació. Errors i cancel·lacions alliberen l'operació i permeten reintentar-la; una continuació antiga no pot reprendre el món cancel·lat. Si la càrrega acaba amb la finestra oculta o sense focus, l'operació queda en pausa fins a una represa explícita.

La portada espera la promesa real de generació abans de donar l'inici per acabat. Els temps d'arrencada inclouen el món i el minimapa complets. Un context d'àudio buit es desbloqueja al clic d'inici; la síntesi d'ambient s'ajorna fins que el món és complet.

## Mateix món i vies d'execució

`buildSteps()` és el generador comú. `build()` el drena síncronament per a les eines i el cercador de llavors; els controls de producció utilitzen `startGameProgressively()` i una promesa. El harness conserva `game.start()` com a adaptador síncron i exposa `startAsync()` per provar el camí real de la UI.

Es mantenen l'ordre de les operacions i de les tirades de `R()`, la llavor efectiva, els emplaçaments, el botí i la geometria. La base ja utilitzava `Math.random` per a algunes orientacions de barques varades; les comparacions aïllen aquesta font ambiental sense alterar el generador de la missió. Aquesta fase no corregeix ni oculta aquella variació prèvia.

La referència és el commit intacte `651884f58a12b5895eb80537460c589986c7b489`, v0.5.79. El manifest independent conserva hashes per secció, recomptes, mostres i procedència, incloent setze tirades posteriors de `R()`. Exclou dos comptadors interns de memòria cau de consultes: `_buildingQueryStamp` i `_wallQueryStamp`. Els valors esperats provenen dels snapshots originals de la base, no del resultat de la nova implementació.

## Pressupost i límits

El scheduler busca torns de **6 ms**, amb un màxim de 32 checkpoints per torn. Utilitza `scheduler.yield()` quan està disponible, un `MessageChannel` reutilitzat com a alternativa i un temporitzador com a últim recurs. No exigeix esperar un fotograma per cada fragment.

És un pressupost cooperatiu: constructors, assignacions de memòria i algunes operacions natives de geometria continuen sent atòmiques i poden superar-lo. `window.HUNTER_GENERATION_STATE` exposa `maxStepMs`, `maxStepStage`, `maxTurnMs`, `steps` i `yields` per distingir el treball efectiu dels temps entre torns. No s'ha establert un límit dur de sis mil·lisegons ni una reducció garantida del temps total de càrrega.

## Comprovacions

```sh
npm run test:loading
HUNTER_TEST_BUNDLE=1 npm run test:loading
npm run test:timing
node tools/build-runtime.cjs --check
node tests/startup-cache.cjs
```

El grup manual `loading` de GitHub Actions executa les proves de generació. Els workflows continuen sense activar-se automàticament.

- Matriu independent contra la base intacta: `67` i `12345` × escales `1` i `2` en mode lògic complet, més `67/1` físic; es comparen separadament el camí síncron i el botó asíncron real.
- Cas físic complet `67/1`: 15.800 nodes, amb buffers de geometria, índexs, atributs, instàncies, transformacions i visibilitat idèntics a la base; fingerprint `8c64015e34be5868a382ac2d14501452c76f218499ee9d203a5f20325e2635ca`.
- Esdeveniments i fotogrames entre fragments, absència de simulació o deute temporal, cancel·lació amb terreny parcial, alliberament de recursos, callback antic, fallades abans del primer `await`, reintents i represa explícita.
- El cas de reinici de `simulation-timing` espera ara la promesa real; conserva la comprovació de trenta segons de generació que no poden arribar a la simulació.

`tests/phase10-capture-baseline.cjs` permet reproduir els diagnòstics des d'una còpia intacta comprovada per hash i exigeix un directori de sortida extern. No reescriu el manifest esperat. Els snapshots complets de diagnòstic no s'inclouen al repositori.

La prova antiga `terrain-stream` falla en unes distàncies LOD esperades desactualitzades, també sobre la base intacta: espera `[270,790,1510]` i el perfil ja és `[410,1120,2060]`. Es conserva sense modificar aquests valors per obtenir un resultat verd.

Les dues suites noves passen sobre fonts i sobre el paquet final `5968caddcf5e5fe0`. També passen les regressions afectades de timing, càmera, combat/sigil, recursos, aigua, roques, palmeres, camins i navegació, i la comprovació d’integritat/cache. La passada final del paquet va registrar 2.318 torns i un pas màxim de 52,49 ms al cas físic 67/1; el pressupost de 6 ms és, per tant, explícitament orientatiu.

## Validació pendent

El harness té geometria Three.js i un renderitzador simulat. La comprovació de continuïtat i equivalència no certifica latència, consum de memòria o aspecte visual en GPU/Android físic; aquest perfilat continua pendent a la fase 4. Les llavors provades no són una demostració universal per a totes les missions. El resultat del desplegament s'anota a [PROGRESS.MD](../PROGRESS.MD).
