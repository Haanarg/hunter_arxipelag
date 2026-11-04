# Hunter: Arxipèlag — to-do.MD

> **FONT ÚNICA DE FEINA PENDENT.** Revisió del repositori: 2026-11-04 (versió inicial observada 0.6.116; P0 revisada a 0.6.119). Aquest document és el pla d'execució i el registre de tasques obertes. Els documents antics descriuen implementacions històriques i **no** obren tasques noves automàticament. Quan es resolgui una tasca, marcar-la [x] i afegir la prova o el commit. No confondre «implementat» amb «verificat en una partida real».

## Llegenda i límits

- **P0**: regressions greus, estrebades, sincronització i seguretat de les partides. **P1**: estalvi mesurable de CPU/GPU/memòria o refactor essencial. **P2**: reducció de complexitat, manteniment i acabat. **P3**: millores funcionals ajornades.
- **[ ] Implementació**: encara cal comprovar o desenvolupar el canvi. **[ ] Validació**: hi ha codi o proves, però no consten com a validades visualment en tots els entorns. **[ ] Investigació**: mesurar abans de decidir.
- Paritat exigida: solitari i COOP (HOST/GUEST), mapa petit/gran, WebGL al navegador i Android quan pertoqui; la llavor ha de generar exactament el mateix món i no s'ha de modificar l'RNG global.
- No tocar el balanç, aspecte, controls ni la serialització de partides durant una extracció de codi, tret que sigui un canvi de joc explícit amb proves específiques.
- Les dades de rendiment històriques són *indiciàries*: no existeix encara una bateria comparativa completa de FPS GPU, p95/p99 i dos dispositius després de les darreres modificacions.

## Fase 0 — línia de base i xarxa de seguretat (P0)

- [ ] Registrar un baseline **abans de refactoritzar**: commit, versió, llavor, escala, qualitat, dispositiu, navegador, resolució, estat de xarxa i captures del joc.
- [ ] Perfilar `?perfAudit=1&stress=1` segons `docs/PERFORMANCE_TESTING.md`; mesurar temps del fotograma p50/p95/p99, CPU d'actualització/IA/render, GPU si disponible, draw calls, màxim de partícules, memòria i pauses de GC.
- [ ] Repetir solitari amb llavors 67 i 148 (mapa petit i gran) i escena d'estrès 2407759483. Repetir a peu, amb vehicle, en combat amb explosions i al costat del mar.
- [ ] Repetir el COOP en **dos navegadors/dispositius reals** (també Android si és possible): RTT, jitter, `avgStateGap`, bytes/s, deltes/full snapshots, p95/p99 de fotograma, correccions, `storage.transaction()` i lag en vehicles i explosions.
- [ ] Congelar proves de comportament per a cada extracció: llavor/posicions/quantitat d'entitats, vida/dany/cadència/munició, paritat visual bàsica i checkpoint/reconnexió.
- [ ] Executar a la còpia de desenvolupament, abans de cada grup de canvis: `npm ci --ignore-scripts`, `npm run check:build`, `npm run test:optimization`, `npm run test:coop:offline`, `npm run test:coop:integration`, `npm run test:play`, `npm run test:saves` i `npm run test:accounts`. Conservar resultats, no donar-los per superats sense execució.
- [ ] Comparar captacions de la mateixa llavor i càmera (ombres, transparències, aigua, vehicles, edificis, explosions) i provar una sessió llarga. Les suites Node no equivalen a validació GPU.

**Criteri de sortida:** baseline reproduïble; cap regressió funcional coneguda; les millores posteriors han de tenir comparativa i possibilitat de revertir-les.

## Fase 1 — regressions i validacions urgents (P0)

### Rendiment i desplegament
- [x] **P0 · optimització CPU del FX (pendent de benchmarks WebGL):** reutilització dels registres de partícules, perfils visuals cachejats i omissió de les matrius de partícules extingides; comptadors acumulatius `HUNTER_ARCADE_BLAST_FX.stats`. Cap canvi en dany, mides, trajectòries, colors o física. Proves estructurals ampliades a `tests/arcade-blast-fx.mjs`.
- [x] **P0 · reducció CPU de snapshots/deltes COOP (pendent de mesures):** via ràpida amb IDs ordenats sense Map a `src/coop-state-delta.mjs`; evitar preparar un snapshot de difusió si no hi ha cap socket de joc a `server/coop-hub.mjs`. Cobertura afegida als tests de deltes i difusió.
- [ ] **Explosions arcade**: investigar els pics de lag fins i tot en mapes petits. Perfilar assignacions, geometries, materials, transparències/overdraw, llums, textures, ombres i durada dels efectes. Provar pool preescalfat, límits simultanis i LOD visual, sense modificar les tres mides, l'orientació dels impactes ni el fum vertical.
- [ ] Confirmar que la versió de Pages, Worker i bundle coincideixen després de cada desplegament; verificar inici, reconnect i partida real amb HOST/GUEST.
- [ ] Revisar el COOP sota càrrega: salts de granades/projectils, animacions remotes de dispar, vehicles destruïts, sortida/entrada de passatgers, desconnexió i curació/mort sense bloqueig. Alguns casos han tingut correccions prèvies: revalidar, no reimplementar a cegues.
- [ ] Comprovar coherència del GAME OVER compartit quan un jugador mor (regla desitjada: missió acabada per a tots dos, segons l'escenari del joc).

### Canvis de joc recents: estat exacte per contrastar amb el codi actual
- [ ] **Torres**: dos soldats reals a la caseta (fusell + bazuca), separats, girant i vigilant espatlla contra espatlla, eliminables individualment; sense canons automàtics ni supressió; parapets laterals protectors sense impedir el tir. Les armes lleugeres no han d'adquirir la torre com a diana estructural. Validar col·lisions, IA, punteria i paritat COOP.
- [ ] **Moto requisada**: verificar visualment la bandera fixada al parafang posterior, no flotant a la dreta.
- [x] **Moto requisada anti-envestida i pilot armat (0.6.119; verificació en partida pendent)**: frenada SOLO/COOP compartida segons velocitat relativa davant vehicles ocupats; fusell del pilot al Worker amb LDV i protecció de vehicles aliats; proves funcionals específiques.
- [ ] **Hovercrafts**: doble quantitat *distribuïda per sector*, no parelles adjacents. Validar mapa petit i cadascun dels quatre quadrants del mapa gran.
- [x] **Bicicleta recuperable (0.6.119; verificació visual pendent)**: no es cala ni s'enfonsa permanentment si és intacta; es pot tornar a muntar fins i tot amb marca antiga `sunk` en solitari i des de l'aigua en COOP. Les bicicletes destruïdes i els motors dels altres vehicles conserven les seves regles.
- [ ] **Pantalla de mort**: assegurar que desapareix la retícula de punteria.
- [ ] **Ferri**: fum de dany procedent de la cabina; conservar immunitat a armes lleugeres i envestida contra vehicles marítims lleugers.
- [ ] **Vehicles**: verificar que tots tenen la vida doblada segons la petició recent, incloent equivalents COOP i les diverses fàbriques de creació.
- [ ] **Acció especial del botó córrer**: clàxon de cotxes, camió (greu/fort) i moto (agut/esquerdat), timbre a la bicicleta, amb radi de soroll i alerta enemiga proporcional a la potència. Validar-ne autoritat i recepció en COOP.
- [ ] **Portes** de cases/cabanes: gruix semblant al de les finestres, centrades a la llinda i amb maneta; **no tocar** les del búnquer.
- [ ] **Distància de render**: investigar taques fosques/blaves a costa llunyana, clapes del splash inicial, plataformes amb z-fighting i geometria de la vora del món; no ocultar artefactes canviant només l'enquadrament sense entendre la causa.
- [ ] **Menús**: confirmar que l'antic menú i els títols redundants estan realment eliminats del codi i no només amagats; primer fotograma correcte, ESC/pausa, submenús, COOP i invitacions.
- [ ] **Punteria i armes**: línia de visió real (no adquirir a través de muntanyes); retícula vermella per soldats i blanca per vehicles; con de 80° de fusell/metralladora/franctirador, 90° per bazuca i objectius dins pantalla; revisar la posició del bazuca sobre l'espatlla i animació de braços.
- [ ] **Ocupants**: primer impacte al vidre, dany posterior a tripulants sense destruir necessàriament el vehicle; pilots i passatgers de patrulleres apuntables; evitar foc amic travessant vehicles conduïts per aliats.
- [ ] **Enemics que requisen vehicles**: rutes que eviten filferrades, radi de gir de cotxes realista, bandera en cada requisició, velocitat adequada i cap atropellament dels ocupants propis.
- [ ] **Explosius i escenari**: C4 sota torres, impactes contra parets/vehicles i ones perpendiculars, cap a dalt del fum, destrucció coherent d'objectes i vidres; validar model visual i volum de dany per separat.

## Fase 2 — neteja segura del repositori i del procés (P1)

**Intervencions P1 de la fase 2 (implementades; suites integrals ajornades):**
- [x] Auditoria automàtica i no destructiva del repositori amb `tools/repository-audit.cjs`: ordre de càrrega de mòduls clàssics, imports ESM de portada/Worker, previsualitzacions HTML i referències internes. No es considera segur esborrar una URL pública pel sol fet que no hi hagi cap referència interna.
- [x] Unificat el sistema de compilació a `.github/workflows/rebuild-runtime.yml` amb activació automàtica i manual; eliminat `runtime-bundle.yml`, duplicat. Evita la regeneració en bucle pels manifests, comprova versió i sintaxi, i rebutja bundles obsolets davant un `main` concurrent.
- [x] Centralitzada la **validació i sincronització** dels segells de la versió: `tools/sync-version.cjs`, `npm run sync:version`, `npm run check:version`; `build` i `check:build` fallen si els imports o la portada no coincideixen amb `src/version.mjs`.
- [x] Executor de regressions `npm run test:regression:once`: combina suites principals sense executar dos cops la mateixa ordre; cap test ni suite original eliminats. Prova estructural a `tests/test-suite-dedup.cjs`.
- [ ] **Validació conjunta pendent, per decisió de l'usuari**: executar `npm run test:repo:tooling`, les suites funcionals completes i benchmarks a la mateixa sessió de comprovació prevista.
- [ ] Classificar i confirmar els laboratoris i fitxers aparentment no referenciats abans de retirar-los o reorganitzar-los, incloses les URL externes de `coop.html`.


- [ ] Fer un mapa d'ús real: grafs d'importació ESM, `src/runtime-scripts.mjs`, `src/bootstrap.mjs`, imports del Worker, `index.html`, scripts de package, proves i URLs de pàgines de demostració.
- [ ] Identificar fitxers *no referenciats* i classificar-los: runtime, prova automatitzada, exemple visual reutilitzable, generat, obsolet. Només eliminar després de comprovar cada consumidor.
- [ ] Revisar `*-proves.html` i `*-preview.html` de l'arrel; passar els útils a un espai de laboratori clar i eliminar les variants descartades, amb captura visual o prova substitutiva si cal.
- [ ] Avaluar la retirada real del prototip `coop.html` / `server/coop-proving-ground.mjs` i d'interfícies alternatives, però protegir redireccions o endpoints encara necessaris per compatibilitat.
- [ ] Inventariar `src/*-concepts.mjs`, `*-iterations.mjs` i `*-preview.mjs`; mantenir només els importats o els laboratoris que aportin valor. Eliminar codi de models descartats, no els models aprovats.
- [ ] Detectar wrappers de pocs bytes (`palette.js`, `vehicles.js`, `vehicle-dynamics.js`, `player-model.js`, `server/coop-vehicle-*.mjs`): fusionar només quan no siguin necessaris per ordre de càrrega, globals o tests.
- [ ] Buscar constants, mapes, helpers i factories duplicats entre solitari/COOP; construir contractes compartits abans d'eliminar versions redundants.
- [ ] Simplificar `package.json`: runners reutilitzables o matriu documentada, evitant la mateixa prova en diverses suites **sense perdre** les verificacions essencials. Els 284 fitxers de `tests/` no s'esborren per mida.
- [ ] Centralitzar la versió/cadena de cache-busting de `src/bootstrap.mjs` i el procés de reconstrucció de bundle/Worker. No canviar àmbits JS a cegues: el build concatena scripts clàssics.
- [ ] Considerar compressió al transport, càrrega diferida i extracció de dades de `src/humvee-procedural-b-data.mjs` (~295 KB), **sense** perdre exactitud de floats, transparències, pivots ni aparença D3.1.
- [ ] Mantenir `vendor/three-r186.module.mjs` (dependència fixada) i `dist/hunter-runtime.*.js` (producció generada) fins a tenir una estratègia de desplegament equivalent i verificada.

## Fases 3–12 — pla d'optimització mòdul a mòdul (P1/P2)

**Fase 3 · primer tall de `game-core.js` (v0.6.124; implementació parcial):**
- [x] **Índexs espacials separats:** `src/spatial-grid-core.mjs` centralitza les cel·les d'illes, altures/plataformes, parets i edificis; `game-core.js` conserva la gestió dels arrays, el cicle de vida i les invalidacions, però ja no duplica quatre implementacions d'indexació. El mòdul és independent de Three.js i del generador de números aleatoris.
- [x] **Paritat estructural prèvia a GPU:** `tests/spatial-grid-parity.mjs` valida 2.100 consultes deterministes contra els bucles anteriors, incloent ordre de resultats, cel·les negatives, objectes en diverses cel·les, stamps i reinicialització. Executada com a prova aïllada; afegida a `test:optimization` per a la bateria conjunta.
- [ ] **Fase 3 encara oberta:** extraure progressivament estat, arrencada, entrada i coordinador de tick; reduir iteracions repetides només quan siguin demostrablement segures. Requereix partida completa, comparació de llavors/mapes, benchmarks reals i COOP HOST/GUEST en la sessió conjunta acordada.


| Ordre | Mòduls/fitxers principals | Reduir o extraure | Validació obligatòria |
| --- | --- | --- | --- |
| 3 | `src/game-core.js` (~236 KB), `runtime-scripts.mjs` | Separar estat/entitats, tick, arrencada, entrada i coordinador; dependències globals per injecció progressiva; evitar iteracions i invalidacions repetides per fotograma | Partida completa, seed determinista, solitari + COOP, FPS |
| 4 | `world-generation.js` (~94 KB), `terrain.js`, `world-generation-core.mjs`, `compound-*` | Planificació pura separada de creació de malles, dades canòniques, càrrega incremental, cachés i zones/índexs espacials; no repetir la generació per al Worker | Mateixes llavors, illes, rutes, camps i HQ; mapa 1/2 |
| 5 | `rendering.js`, `shadow-cache.js`, `vegetation.js`, `water.js`, `vehicle-model-core.mjs` | Mesurar draw calls, ombres, sobrecost de transparències, pooling, instancing, LOD/histeresi, objectes estables i geometries/materials reutilitzats | Comparativa A/B p95/p99 CPU+GPU, captures visuals, objectes alliberats |
| 6 | `combat.js` (~86 KB), `combat-rules.mjs`, `arcade-blast-fx.mjs`, `server/coop-combat.mjs` (~56 KB) | Regles pures de dany, primer impacte/vidres, balística, acoblaments a FX; amortitzar explosions; una sola font de veritat per solitari i Worker | Cadència, dany, autoapuntat, LDV, FX i 2 clients |
| 7 | `enemy-ai.js` (~57 KB), `enemy-navigation.js`, `enemy-lod.js`, `native-soldier-navigation.mjs` | Percepció → decisió → ruta → actuació, A* amb pressupost per frame, índexs/candidats reutilitzats, IA de torres i requisició per composició | Rutes/cobertura/atac, no bloquejos, rang/cadència i FPS |
| 8 | `vehicles.js`, `vehicle-dynamics-core.mjs`, `vehicle-model-core.mjs`, `rider.js`, `marine-patrol.js` | Fàbrica de flota, perfils de dinàmica, seients/ocupants, dany, senyals, efectes i patrulles; agrupar malles estàtiques sense tocar articulacions | Tots 16 tipus, costes/ferri, atropellaments, banderes, HUD |
| 9 | `coop-world-runtime.js` (~51 KB), `native-coop-*.mjs`, `coop-state-delta.mjs` | Aplicar snapshots només a entitats canviades, preassignar buffers, interpolation/prediction, seqüències idempotents, zero duplicacions visuals | RTT/jitter/stateGap, dos equips, reconciliació, reconnect |
| 10 | `server/coop-hub.mjs`, `server/coop-mission.mjs` (~34 KB), `server/coop-combat.mjs`, `server/coop-vehicles.mjs` | Separar transport, lògica de tick, checkpoint, difusió i autorització; caches de serialització per baseline; limitar lectures/escriptures al Durable Object | Regles autoritatives, perfils p95/p99, seguretat, persistència |
| 11 | `src/ui.js`, `operation-menu.js`, `coop-menu.js`, `index.html`, `menu-*` | Unificar submenús/estats i listeners, eliminar DOM/codi antic i configuracions duplicades, diferir inicialitzacions no essencials | First paint, ESC, compte, pausa, trucs, teclat/tàctil |
| 12 | `audio.js`, `movement-fx.js`, `operation-*.js`, `server/accounts.mjs` | Pool de so/FX, espai i distància reals, desament incremental, neteja de listeners/temporitzadors, dades i autorització separades | Sons i alertes, recuperació de dades, partida llarga, navegador/Android |

### Contracte de cada mòdul (no marcar complet fins a tenir les quatre proves)
- [ ] Mapa de dependències, estat/global compartit, recursos propietat del mòdul i punts calents de CPU/GPU/memòria.
- [ ] Extracció petita amb tests de paritat abans/després; sense reescriptures simultànies de combat, física i xarxa.
- [ ] Benchmark comparatiu mateix maquinari, llavor, escena, opció gràfica i càrrega COOP; documentar regressions i guany real.
- [ ] Verificació d'alliberament de recursos, partida amb dos jugadors, restauració del checkpoint i desplegament compatible. Fer revert si falla una invariant.

## Fase 13 — funcionalitats pendents no estrictament d'optimització (P2/P3)

- [ ] Fase 9: controls tàctils configurables (esquerrans, sensibilitat, posicions i persistència).
- [ ] Fase 11: estudiar l'opció A de contingut opcional i la mecànica de nit/espera, que **no** formaven part de l'elecció inicial B+C.
- [ ] Fase 14: acabat visual, animacions/LOD, cinemàtiques que es puguin saltar i resum final.
- [ ] Revisar la física del camp de presoners, camins estrets, mecànic, ferri, mapes i fauna en COOP en dues màquines; les proves de components no substitueixen una partida completa.
- [ ] Auditar les issues obertes al final de cada fase; tancar-les només amb evidència, no per aparèixer en versions antigues.

## Neteja documental aplicada en aquesta revisió

- L'arxiu `PROGRESS.MD` es retira perquè barrejava estat històric, promeses de fases ja superades i múltiples llistes de pendents obsoletes. L'historial íntegre continua recuperable al Git.
- Els informes de versions puntuals (`0.5.*`) de rendiment i IA es substitueixen per `docs/PERFORMANCE_TESTING.md` i pels punts mesurables d'aquest pla. Els càlculs, mètodes i proves útils continuen descrits a la guia.
- Els documents `docs/COOP_PHASE1.md` … `docs/COOP_PHASE10.md` i `docs/COOP_PLAYABLE.md` descrivien el client/prototip anterior; la direcció tècnica vigent està a `docs/COOP_REBUILD.md` i `docs/COOP_NATIVE_RUNTIME.md`.
- Notes curtes sobre vegetació/portes de COOP, revisions de windsurf, qüestionaris creatius contestats, algunes fases ja completades i l'auditoria de codi antiga es retiren per no mantenir múltiples fonts de veritat. **Git conserva totes les versions**.
- Es mantenen com a documentació de referència les decisions d'arquitectura, validació, generació, guardat/comptes, regles físiques i disseny de missions que no són substituïbles per un checklist.
- A partir d'ara, nous pendents es registren **només aquí**. Les notes de versions que es vulguin conservar han d'explicar decisions o contractes, no obrir llistes paral·leles.

## Ordre d'execució i criteris de «fet»

1. **Primer**: eliminar lag d'explosions i completar prova real HOST/GUEST; estabilitzar regressions P0.
2. **Després**: higiene de dependències i extreure `game-core` per blocs petits, conservant la paritat de llavors i sistemes.
3. **Continuar**: generació/render, combat/IA, vehicles, COOP client/servidor, UI, so i persistència, cadascun amb la seva comparativa.
4. **Tancar**: prova de campanya sencera (solitari i dos jugadors), mapa petit i gran, navegador + Android, documents coherents i sense artefactes.

**Objectiu d'optimització (no resultat mesurat):** millorar almenys un 20% el p95 de temps de fotograma en l'escena problemàtica d'explosions o d'estrès, sense empitjorar perceptiblement qualitat ni cap comportament, i reduir trànsit/treball repetit al COOP segons perfils reals. Si els perfils mostren un coll diferent, canviar la prioritat en aquest mateix fitxer.
