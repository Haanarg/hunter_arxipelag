# Hunter: Arxipèlag — to-do.MD

> **FONT ÚNICA DE FEINA PENDENT.** Revisió del repositori: 2026-11-04 (versió inicial observada 0.6.116; P0 revisada a 0.6.119). Aquest document és el pla d'execució i el registre de tasques obertes. Els documents antics descriuen implementacions històriques i **no** obren tasques noves automàticament. Quan es resolgui una tasca, marcar-la [x] i afegir la prova o el commit. No confondre «implementat» amb «verificat en una partida real».

## Llegenda i límits

- **P0**: regressions greus, estrebades, sincronització i seguretat de les partides. **P1**: estalvi mesurable de CPU/GPU/memòria o refactor essencial. **P2**: reducció de complexitat, manteniment i acabat. **P3**: millores funcionals ajornades.
- **[ ] Implementació**: encara cal comprovar o desenvolupar el canvi. **[ ] Validació**: hi ha codi o proves, però no consten com a validades visualment en tots els entorns. **[ ] Investigació**: mesurar abans de decidir.
- Paritat exigida: solitari i COOP (HOST/GUEST), mapa petit/gran, WebGL al navegador i Android quan pertoqui; la llavor ha de generar exactament el mateix món i no s'ha de modificar l'RNG global.
- No tocar el balanç, aspecte, controls ni la serialització de partides durant una extracció de codi, tret que sigui un canvi de joc explícit amb proves específiques.
- Les dades de rendiment històriques són *indiciàries*: no existeix encara una bateria comparativa completa de FPS GPU, p95/p99 i dos dispositius després de les darreres modificacions.

**P0 · copiar diagnòstic de rendiment (v0.6.154; implementació):**
- [x] Afegit `Copia diagnòstic` al costat d'`Actualitza diagnòstic` al menú **Pausa → Opcions**, amb JSON de versió, llavor, escala, FPS, CPU, IA, draw calls, ombres, LOD, memòria GPU i estadístiques de generació, només a petició.
- [x] Còpia nativa amb alternativa `execCommand('copy')` i camp de text seleccionable per a navegadors Android/WebView que bloquegin el porta-retalls. Prova `tests/performance-copy-diagnostic.mjs` afegida a CI i a `test:optimization`.
- [x] **P0 · LOD costaner (v0.6.155; implementat, pendent de validació WebGL):** sectors de costa en detall màxim només a prop (desktop 1200 m, mobile 820 m, ultra 540 m), amb histèresi; enfora conserven com a mínim LOD 2. No toca heightAt, RNG, col·lisions ni perfil pròxim. Prova `tests/terrain-coast-lod.cjs` i CI.
- [x] **P0 · v0.6.156 · CPU/IA i diagnòstic (implementat; validació real pendent):** FPS compta fotogrames lents (>200 ms), darrera mostra activa conservada durant pausa, resum p50/p95/p99 dels darrers 5 s. IA passiva >240 m sota sobrecàrrega espaiada, sense alterar enemics que combaten o són objectiu de franctirador. La graella espacial es reconstrueix un cop per RAF sense canvis d'índex; entre subpassos es comproven canvis de cel·les o de nombre d'entitats. Pressupost adaptatiu de 4–15 passos de física a 1/60 s per RAF; temps descartat explícit. Noves proves a CI. Cal benchmark real per quantificar FPS i la velocitat de simulació.
- [x] **P0 v0.6.157 · IA (implementat; validació mòbil pendent):** decisió anticipada de navegació dels patrullers llunyans cada 0,8 s amb 10 m de predicció; moviment real, A* i combat no alterats. Sweeps secs amb cota coneguda consulten hAt quan n'hi ha prou per verificar aigua; molls, aigua i altures desconegudes mantenen groundAt complet. Telemetria nova de consultes ràpides/completes i decisions remotes/immediates, i proves de paritat per costa, obstacles, vegetació i patrulles. Pendent comparar FPS amb mapa gran i llavor 148.
- [ ] **Navegació de jeeps · regressió a investigar:** `tests/enemy-navigation.cjs` no supera el cas `jeep routes around a building` amb la direcció Ackermann real al harness. El test antic queda visible com a prova no bloquejant a CI fins aclarir si és un límit del test o un error de rutes. Les proves exactes de col·lisió i la predicció curta passiva continuen obligatòries.
- [x] **P0 v0.6.158 · Mostreig de col·lisions i perfil IA (implementat, prova mòbil pendent):** durant sweeps de soldats sense altitud fixa, a terra física seca i SENSE parets/vehicles/soldats pròxims, hAt substitueix el càlcul de cota visible complet; si pot intervenir l'altura vertical, l'aigua, un moll o l'A*, es fa groundAt íntegre. Les trajectòries, les hitboxes i els passos de col·lisió són idèntics. Telemetria inclusiva separada de soldats, torres, vehicles i coordinació (no sumar-la al cost nav). Nova regressió `tests/enemy-sweep-open-ground.cjs` + CI. Validar en dispositiu amb llavor 148 i comparar FPS, CPU i nombre de consultes ràpides vs completes.
- [ ] **Investigació:** l'usuari ha comunicat una davallada important de rendiment al mapa gran. Recollir JSON amb estadístiques actives durant el joc, comparar mapa petit/gran i perfilar abans d'atribuir causes.

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
- [x] **v0.6.146 · mort en moto atropellada per un tanc (prova automàtica nova):** la destrucció de la moto pot matar el conductor mentre es resol la col·lisió. `presentExplosion` i l'actualització de l'FX arcade són tolerants a fallades visuals (la física, el dany i la mort no es cancel·len), l'expulsió de la moto inicialitza `vy` finita i el bucle de fotogrames manté viva la cinemàtica si es produeix una excepció després d'activar la mort. Prova integrada `tests/tank-motorcycle-death.cjs` a GitHub Actions.
- [ ] **Validació visual v0.6.146:** tanc que aixafa una moto pilotada pel jugador; comprovar la causa de mort, la càmera lenta i l'escena de la Parca. Repetir amb i sense efectes d'explosió i en HOST/GUEST/Android; les proves Node només verifiquen el recorregut del mode individual.
- [x] **v0.6.143 · patis naturals i paviments amb ombres (validació visual pendent):** retirades del codi les grans lloses dels complexos, mantenint `addLevelArea` i `compoundClear` (reserva espacial, vegetació i llavors intactes). Les cases i els hangars reutilitzen els seus terres originals, ara mats i receptors d'ombres; el forjat i el soterrani del búnquer, la planta superior i els heliports específics també reben ombres. Afegida `tests/compound-ground-surfaces.mjs` a la compilació. Revertible com a commit independent.
- [ ] **Validació visual v0.6.143:** comparar llavors 67/148 amb/sense sostres, pobles, base/HQ i camp de presoners en SOLO i COOP, en pla/pendent; comprovar la cota interior i la continuïtat de l'escala del búnquer. Benchmark de les ombres a Android.
- [x] **v0.6.139 · reparació després de la prova CI fallida:** el dany d'impacte contra potes es calcula amb el valor real de la velocitat en el punt de contacte (que la simulació frena abans de la col·lisió). Ajustat el coeficient perquè un tanc ràpid enderroqui una torre de 10 PV; prova del valor de contacte i prova integrada del Worker COOP. Pendents la validació visual en partida SOLO i HOST/GUEST.
- [x] **v0.6.136 · correccions implementades (validació visual pendent):** retícules d'armes lleugeres al 50% d'alfa, contacte de les soles amb el terreny visible i ombra del tors, radi balístic humà reduït, dany per envestir potes de torre, escala i postura de les cames del motorista requisat. No canvien la física P.y, la mira de bazuca ni els hitboxes dels vehicles.
- [ ] **Validació v0.6.136:** caminar i ombres en pla/pendent, trets a 100–180 m, envestides de torres lentes/ràpides, motorista SOLO i HOST/GUEST; confirmar paritat de destrucció estructural al Worker COOP (implementació al natiu v0.6.138; cal prova visual).
- [x] **v0.6.138 · envestides i terreny visibles:** al SOLO la sola segueix també el triangle LOD que realment es dibuixa, sense travessar sòls d'edificis. Al COOP natiu els col·liders de les potes duen l'ID de la torre, el Worker aplica dany per velocitat/massa, elimina totes les potes i parapets i conserva l'enderroc a la partida desada. Prova de regressió del Worker afegida a la compilació.
- [ ] **Validació en partida v0.6.138:** revisar pendents fortes i plataformes, envestida COOP amb HOST/GUEST i continuïtat després de reconnexió; el mode cooperatiu `world` heretat té una generació de torres diferent i encara no s'ha contrastat amb el natiu.
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

**Fase 4 · incidència real detectada per l'auditoria (v0.6.153):**
- [x] **Protecció del corredor base-moll:** el mapa gran amb llavor 148 construïa posteriorment un heliport amb parets que interceptaven la carretera. `createSiteRegistry` admet ara una restricció opcional de corredor, activada després de completar el moll i abans de situar els altres complexos.
- [x] **Reserva de trams complets:** `roadCorridorClear` rebutja parcel·les que trepitgin cap segment, amb el radi de reserva del complex i 10 m de marge. No es toca el càlcul A*, els models de carretera, el RNG ni els marges quan encara no existeix la ruta.
- [x] **Regressió geomètrica:** `tests/coast-road-reservation.mjs` comprova les coordenades concretes de l'heliport que tallava el camí i 2.880 casos independents de distàncies a segments.
- [ ] **Validació:** tornar a executar la matriu lògica de dotze casos i comprovar el mapa en un navegador real, COOP/Android i rendiment A/B.

**Fase 4 · tretzè tall, auditoria de generació del món (v0.6.152; validació sense canvis de runtime):**
- [x] **Matriu de missions lògiques reals:** `tests/world-generation-matrix.cjs` executa el generador del joc a través de `tests/harness.cjs` amb les llavors 1, 67, 148, 2026, 12345 i 2407759483 en les dues escales. Accepta `WORLD_MATRIX_SEEDS` per ampliar els casos.
- [x] **Invariants de món i missió:** comprova base, HQ, camp de presoners, reserva de terreny, coordenades de complexos/vehicles, rutes i límits, i reutilitza `validateMission` per comprovar accés local al general, mapes i transport. Les advertències de cobertura queden enregistrades.
- [x] **Determinisme després de reinicis:** compara la petjada SHA-256 de les distribucions i la continuació del generador aleatori després de canviar de món. Prova integrada a `test:optimization` i al workflow, sense tocar els models, la física ni la versió.
- [ ] **Pendent de validació real:** desplaçaments entre illes, vehicles i IA, partida HOST/GUEST en dos dispositius, Android, WebGL/ombres i rendiment A/B. L'auditoria en mode lògic no demostra aquests casos.

**Fase 4 · dotzè tall, cerca de ports i costa de pantalans independents (v0.6.152; implementació parcial):**
- [x] **Planificador sense Three.js:** `createStandalonePortPlanner` a `src/compound-planning.mjs` concentra la cerca generadora d'aigua fonda, la selecció de parcel·les a una illa i el sondeig del punt exacte de costa del pantalà. `world-generation.js` només hi connecta els callbacks de terreny i els constructors visuals, que segueixen al runtime.
- [x] **Exactitud de mostreig i pauses:** mateix ordre de consultes `rawHAt`, 32 orientacions, els mateixos intents `landSteps`, el mateix consum de RNG, i comptador de checkpoints continu entre el sondeig de costa i la col·locació dels dos norais. No es canvien les distàncies ni les condicions de fondària.
- [x] **Proves diferencials àmplies:** `tests/standalone-port-parity.mjs` compara l'oracle congelat de v0.6.151 amb la versió extreta, sobre onze llavors deterministes, dues escales, geometries costaneres heterogènies, punts d'aigua/parcel·les, intents de terreny fallits/reintentats, norais, retorn i cancel·lació. Integrada en `test:optimization` i GitHub Actions.
- [ ] **Validació pendent:** rendiment real A/B i escenes navegables completes, ferris/molls/ports, camps de presoners, LOD/ombres, COOP i Android. Les proves de paritat no substitueixen l'execució en navegador o dispositiu.

**Fase 4 · onzè tall, zones de pas i geometria dels molls (v0.6.151; implementació parcial):**
- [x] **Zones de pas de les carreteres extretes:** `createPathClearanceRegistrar` de `src/compound-planning.mjs` registra els recorreguts i reserva els mateixos cercles de pas cada 3 m després del suavitzat; `world-generation.js` conserva la presentació i l'agrupació de malles i deixa de tenir la regla de mostreig.
- [x] **Rampes dels pantalans separades de les malles:** `planPierSetup` calcula l'orientació, els trams de 5 m i la rampa d'accés costaner injectant `hAt` i el nivell de la coberta; el runtime continua afegint escales, col·lisions i fustes visibles, sense canviar el camí en mode cerca de llavors.
- [x] **Paritat diferencial explícita:** `tests/compound-path-pier-parity.mjs` compara el codi anterior amb el nou sobre rutes rectes, corbes, repetides, distàncies curtes, mostres de terra/aigua, llavors 67/148 i escales 1/2; mateixa traça de consultes d'alçada, coordenades, ordre de reserves i trams. Incorporada a `test:optimization` i CI.
- [ ] **Fase 4 pendent de validació integral:** mapes realment generats amb llavors fixes, posicions de sortida, ports, camp de presoners, materials/ombres, COOP i Android, més benchmarks A/B en condicions repetibles. No es declaren guanys d'FPS només per paritat Node.

**Fase 4 · desè tall, geometries temporals alliberades peça a peça (v0.6.150; implementació parcial):**
- [x] **Buffers finals preassignats:** `src/static-decor-batching.js` reserva `position`, `normal`, `uv` i `color` una vegada per lot. Cada malla transformada s'hi copia i es disposa abans de començar la següent, sense retenir la llista de `BufferGeometry` temporals.
- [x] **Semàntica de construcció preservada:** es mantenen `toNonIndexed`, `applyMatrix4`, tots els `yield` de colors i fusió, les estadístiques, els materials, els vèrtexs i l'ordre de construcció. Un `try/finally` també libera la geometria si es cancel·la un generador suspès.
- [x] **Proves de paritat ampliades:** `tests/static-decor-batch-parity.mjs` compara el resultat amb el codi original congelat i instrumenta les còpies simultàniament vives; verifica el nombre de disposicions, la cancel·lació i el mateix recompte de checkpoints. Executat per la CI de GitHub.
- [ ] **Validació pendent:** comparar A/B el temps de generació i pics reals de memòria en ports/heliports, comprovar imatges del món en navegador i validar llavors completes, COOP/Android abans de tancar la fase 4.

**Fase 4 · novè tall, menys buffers temporals de colors (v0.6.148; implementació parcial):**
- [x] **Un buffer de colors per lot visual:** `src/static-decor-batching.js` reserva directament el `Float32Array` final de color segons els recomptes de vèrtexs originals (`index.count` per malles indexades). Ja no crea un `Float32Array` ni un `BufferAttribute` de colors per cada malla d'entrada, ni els torna a copiar després al buffer del lot.
- [x] **Render, ordre i cooperació preservats:** no es modifiquen `position/normal/uv`, `toNonIndexed`, materials, agrupacions, transformacions, descart i neteja de geometria, ni cap dels `yield` de generació. Els colors continuen llegint el material actual després de cada pausa, i les dades físiques, la llavor i la distribució queden intactes.
- [x] **Proves diferencials i instrumentals ampliades:** `tests/static-decor-batch-parity.mjs` comprova amb l'oracle v0.6.144 geometries indexades de més de 256 vèrtexs, paritat exacta d'atributs/resultats/checkpoints, edició de colors mentre el generador està aturat i el nombre de construccions `BufferAttribute` eliminades. La prova existent continua a CI i `test:optimization`.
- [ ] **Validació pendent:** mesurar amb perfils A/B el temps de càrrega, les assignacions i els pics de memòria en escenes representatives de ports i heliports; comprovació visual, dos dispositius COOP i Android. No s'atribueixen encara guanys d'FPS. La prova de paritat visual s'executa abans de l'assaig de mort tanc/moto al mateix workflow perquè una fallada prèvia i aliena a l'agrupador no n'impedeixi la validació; no s'omet ni es desactiva la prova de mort.

**Fase 4 · vuitè tall, cost de l'agrupació visual (v0.6.147; implementació parcial):**
- [x] **Sense actualització redundant de matrius per malla:** `src/static-decor-batching.js` manté `root.updateMatrixWorld(true)` i llegeix la translació de `mesh.matrixWorld.elements[12/14]`. Evita `getWorldPosition(new THREE.Vector3())` en cada peça, que recalculava matrius ancestrals i creava un vector temporal.
- [x] **Signatura de material reutilitzada per arrel:** el `WeakMap` evita recomputar el perfil quan diverses peces comparteixen material dins d'una arrel. Es reinicialitza per arrel, després dels checkpoints, perquè una modificació legítima de material entre arrels continuï reflectint-se en el lot. També s'elimina la variable `geometries` sense usos.
- [x] **Prova de paritat visual ampliada:** `tests/static-decor-batch-parity.mjs` continua amb l'oracle independent de v0.6.144, però inclou ara grups imbricats, escala no uniforme, rotacions i materials compartits; comprova exactament dades dels atributs, esferes, grups, transformacions, estadístiques, neteja i `yield`. Un test instrumental verifica zero crides a `getWorldPosition` per les peces.
- [ ] **Validació pendent:** mesurar temps de CPU, memòria i pics de generació en dispositius reals, comparar qualitat d'escenes amb ombres i LOD, llavors completes 67/148 i Android/COOP en una bateria A/B. No s'ha mesurat cap guany d'FPS.

**Fase 4 · setè tall, lots visuals de plataformes, molls i decoració (v0.6.145; implementació parcial):**
- [x] **Construcció visual extreta:** `src/static-decor-batching.js` es responsabilitza de fusionar malles de decoració fixa en lots per sector de 160 m i perfil de material, incloses les plataformes d'heliport, molls i accessoris. `world-generation.js` ara només n'ordena l'execució; el nou mòdul es carrega abans del generador a `runtime-scripts.mjs`.
- [x] **Paritat geomètrica i de recursos:** es manté exactament la fusió de `position`, `normal`, `uv` i `color`, les transformacions, els materials compartits, les estadístiques, les pauses `yield` i l'alliberament de malles originals. Sense canvis al RNG, dades físiques, desaments ni sistemes de COOP.
- [x] **Proves amb Three.js real:** `tests/static-decor-batch-parity.mjs` compara l'oracle congelat amb la nova etapa per diferents llavors i escales, malles indexades, grups imbricats, materials, cancel·lació d'arrels i vèrtexs. Inclosa a `test:optimization` i a CI.
- [ ] **Resta de fase 4:** revisar si l'agrupació admet millores mesurables de CPU/memòria sense canviar materials ni LOD, comparar temps i màxims de generació A/B i validar escenes reals, COOP/Android i mapes complets. No és una prova de guany d'FPS.

**Fase 4 · sisè tall, pla físic d'anivellament (v0.6.144; implementació parcial):**
- [x] **Descriptors de plataformes canònics:** `src/world-physics.mjs` exposa `planLevelArea`, que calcula les mitges dimensions, la rotació i la circumferència de cobertura de cada plataforma sense crear malles. `src/game-core.js` manté el registre ordenat a `terrainLevels` i a l'índex espacial.
- [x] **Ruta d'escapada del camp de presoners:** `src/compound-planning.mjs` calcula el terraplè d'evacuació amb `planPrisonEscapeGrade`; no s'han alterat les dimensions, la cota, el suavitzat ni els punts d'exclusió.
- [x] **Paritat diferencial:** `tests/terrain-pad-parity.mjs` compara els descriptors i les insercions a la graella amb la funció v0.6.143, més la física de solapaments i els terraplens del camp; inclosa a `test:optimization` i a la CI.
- [ ] **Fase 4 pendent:** separar construcció visual de plataformes i reavaluar recomputacions; prova conjunta de llavors, costa, camp, COOP/Android i rendiment A/B.

**Fase 4 · cinquè tall, planificació de carreteres fins a la costa (v0.6.142; implementació parcial):**
- [x] **Cerca A* extreta de la construcció:** `src/compound-planning.mjs` exposa `createCoastRoadSolver` i calcula els punts amb altura d'una carretera entre la base i la costa, evitant edificis, aigua, desnivells i límits del mapa; el model de carretera, els canvis de relleu i `buildCoastRoadSteps` continuen al runtime.
- [x] **Determinisme de rutes i checkpoints:** mateix pas de graella 12 m, pressupost fins a 14.000 nodes, cost de pendent, ordenació A*, projecció de pendent al 12 %, comprovacions de resultat i `yield` cada 8 nodes. Les dependències `H` i `B` s'obtenen en cada cerca/mostra per evitar referències obsoletes després de canviar de mapa.
- [x] **Proves diferencials:** `tests/coast-road-parity.mjs` compara el codi anterior i nou sobre llavors 67/148, amb/sense edificis, terrenys diversos, escala 1/2, el mateix registre de consultes d'altura i el mateix ordre de pauses; també comprova cancel·lacions i reinicis. Inclosa a `test:optimization` i CI.
- [ ] **Fase 4 pendent:** extracció de les plataformes i la construcció visual, comprovació de rutes reals, casuística de camps/ports/ferris i partida completa amb COOP/Android; optimització de rendiment segons mesures A/B.

**Fase 4 · quart tall, encaix de molls i terminals costaneres (v0.6.141; implementació parcial):**
- [x] **Planificació costanera sense malles:** `src/compound-planning.mjs` inclou `createCoastalLayoutPlanner` que valida la plataforma a terra, les edificacions, les aigües navegables i l'espai de ferris/llanxes, i cerca emplaçaments costaners per trams.
- [x] **Integració diferida, compatibilitat dels mapes:** `src/compound-coast-runtime.js` manté les funcions clàssiques `coastalLayoutFits`, `findCoastalLayout`, `findCoastalLayoutSteps` i les inicialitza només quan són necessàries; la mida del mapa i les característiques dels vehicles es consulten dinàmicament. No es toca la geometria, els molls, les rampes ni la creació d'entitats.
- [x] **Proves diferencials de costa i ferri:** `tests/coastal-layout-parity.mjs` contrasta la lògica anterior amb la nova en dimensions de layouts, edificis, ferris, diferents línies de costa, llavors 67/148, escales 1/2, acceptacions síncrones/generadores, pauses i cancel·lacions. Incorporada a CI i `test:optimization`.
- [ ] **Fase 4 pendent:** planificació de carreteres i plataformes, generació visual separada, protecció de checkpoints, validació completa de llavors (67/148), camp, ports/terminàls, COOP/Android i comparació A/B de rendiment.

**Fase 4 · tercer tall, comprovació costanera dels ports (v0.6.140; implementació parcial):**
- [x] **Mostreig del terreny separat:** `src/compound-planning.mjs` conté `createPortSiteSurvey`, el filtre que comprova els marges, la plataforma i els carrils marítims. `world-generation.js` conserva la construcció i els recursos 3D.
- [x] **Ordre determinista intacte:** es conserven les mateixes crides a `rawHAt`, transformacions, `yield`, refusos i retorns; no s'afegeixen consums de `R()`.
- [x] **Paritat diferencial:** `tests/port-survey-parity.mjs` contrasta el codi anterior sobre les dues escales, llavors 67/148, diverses costes i la cancel·lació de generadors. Incorporat a `test:optimization` i CI.
- [ ] **Resta de fase 4:** encaix de layouts costaners, plataformes, planificació de camins i separació de visualització. Proves reals, COOP, Android i FPS pendents de la bateria conjunta.

**Fase 4 · segon tall, reserves dels emplaçaments (v0.6.137; implementació parcial):**
- [x] **Registre independent de reserves:** `src/compound-planning.mjs` conserva els radis, la distància entre complexos i la memòria cau de dimensions, sense accedir a l'escena, i preserva la identitat de la llista de centres.
- [x] **Cerca per illes i sectors extreta:** `reserveCompound` i `forceReserve` es creen al mòdul pur, injectant `landSteps`, `compound` i els conjunts originals. Es preserven els intents, els yields de generació, l'ordre de les illes i la seqüència de l'RNG; els models 3D continuen al runtime.
- [x] **Paritat diferencial:** `tests/compound-reservation-parity.mjs` compara geometria d'exclusió, memòria cau, acceptació, generadors, consum d'RNG, ocupació d'illes i ordre de progressió per mapes 1/2 i llavors 67/148; CI també executa `tests/compound-planning.mjs`.
- [ ] **Fase 4 pendent:** extracció de selecció de costa i plataforma, generació visual, proves de seeds real/complets, camp de presoners, ports, heliports, carreteres, COOP i benchmarks A/B. No s'atribueix cap FPS nou.
 
**Fase 4 · primer tall, planificació canònica d'indicis de l'HQ (v0.6.135; implementació parcial):**
- [x] **Geografia independent de la representació:** `src/world-generation-core.mjs` conté `planHQIntelClues` amb els emplaçaments falsos del HQ, repartiment 3/9 per quadrants i ordre de descart. `src/world-generation.js` només integra el resultat i publica les mateixes dades per minimapa i desaments.
- [x] **Llavors i RNG preservats:** mateix `mul` injectat per al shuffle local; no consumeix `R()` del món, no toca la cerca de llavors ni les posicions i conserva la prioritat entre complexos i illes.
- [x] **Paritat diferencial i prova de sectors:** `tests/hq-clue-plan-parity.mjs` compara l'oracle anterior (llavors 67/148 incloses), proves de mapes petits/grans i errors quan no hi ha sòl útil; `tests/sector-navigation-intel.cjs` passa a exercitar la nova integració. CI valida el canvi i regenera el bundle.
- [ ] **Fase 4 pendent:** separar terreny i construcció visual de la planificació, protegir el pressupost de generació incremental i mesurar A/B; repetir proves de llavors 67/148, punts de spawn, carreteres, camp de presoners, ports, COOP i Android a la validació conjunta.

**Balanç de la fase 3 després de v0.6.134 — extracció estructural implementada, validació oberta:**
- [x] Els **8 talls estructurals** han separat els índexs espacials, les mètriques/diagnòstic, el coordinador dels dos rellotges, les opcions/progrés/cancel·lació d'arrencada, l'estat inicial, els catàlegs, les regles dels mapes, els controls i la neteja de sessions. Les extraccions mantenen els bindings del runtime clàssic i han incorporat proves diferencials a Node.
- [x] Revisió dels blocs principals restants: **generació de món i terreny (fase 4), render/ombres/aigua (fase 5), combat (fase 6), IA (fase 7), vehicles (fase 8), COOP (fases 9–10), UI (fase 11), so i desaments (fase 12)**. No traslladar-los ara només per reduir la longitud aparent de `game-core.js`; fer-ho per dominis amb proves pròpies.
- [ ] **Criteri de tancament de fase 3 encara pendent:** validació conjunta en partida real i amb checkpoints; `npm run test:regression:once`, `npm run test:loading`, `npm run check:build`; paritat d'arrencada de llavors 67/148, Android/host/guest, captures GPU i comparació FPS/GC/p95/p99. No considerar superada aquesta casella només perquè CI ha recompilat.
- [ ] **Rendiment verificat:** cap guany FPS ni reducció GC demostrats amb comparativa A/B del mateix maquinari. Els talls de fase 3 són refactorització de responsabilitats i manteniment, no una promesa de velocitat.


**Fase 3 · vuitè tall, neteja de sessió i reinit del món (v0.6.134; implementació parcial):**
- [x] **Teardown seqüenciat fora de game-core:** `src/start-lifecycle-core.mjs` coordina la neteja d'una missió completa, abandonada o generada parcialment; conserva l'ordre d'alliberament, les callbacks del runtime clàssic, l'autodesament i la propagació d'errors anterior. L'escena, controls i estat mutable continuen propietat del motor, sense afegir singleton.
- [x] **Llistes noves per partida:** `src/game-state-core.mjs` proporciona nou contenidors nous d'entitats amb `Array` del context original. Els pools PL/FA, el mapa TG i l'índex de terreny conserven la seva identitat i es buiden com abans.
- [x] **Prova diferencial:** `tests/world-session-parity.mjs` compara neteges amb/sense món i generador parcial, i fallades a cada pas de la destrucció; prova que l'ordre, referències, error i estat final no canvien. Afegida a `test:optimization` i a la CI.
- [ ] **Validació pendent:** partida real, cancel·lació/reinici, recuperació de desaments, HOST/GUEST, Android, FPS/GC/GPU, dins la bateria conjunta acordada. La fase 3 encara no es considera tancada.

**Fase 3 · setè tall, controls del jugador (v0.6.133; implementació parcial):**
- [x] **Entrada de teclat, joystick i moviment lateral extreta:** `src/player-input-core.mjs` encapsula la lectura del moviment i la disponibilitat d'ajupir-se, córrer, desplaçar-se lateralment i activar l'acció especial del vehicle. Manté les mateixes referències mutables i l'ordre de les expressions. `game-core.js` conserva els listeners, l'estat, la física i la xarxa.
- [x] **Proves de paritat:** `tests/player-input-parity.mjs` contrasta la lectura anterior amb la nova i comprova les referències després de canvis d'entrada; `test:optimization` i CI incorporen la suite sense duplicar lògica. `tests/vehicle-special.cjs` actualitzada amb un DOM simulat i la regla de botó independent del joystick.
- [ ] **Fase 3 encara oberta:** extracció incremental d'estat/orquestració restants; partida real, desaments, dos clients, Android, GPU/FPS i GC en la bateria conjunta.

**Fase 3 · sisè tall, intel·ligència de mapes i estat visible (v0.6.132; implementació parcial):**
- [x] **Regles d'HQ i localització de vehicles extretes:** `src/game-intel-core.mjs` gestiona l'adquisició dels mapes, els quadrants, els llocs descartats, les icones de vehicles i les dades de minimapa/HUD. Conserva els mateixos Set i referències a vehicles, l'ordre d'autodesament i les variables compartides amb generació i desaments; no es modifica l'RNG ni el format de desament.
- [x] **Proves diferencials i integració:** `tests/game-intel-parity.mjs` compara amb el codi anterior els mapes SOLO en ambdues escales, pickups repetits, localització de vehicles i dades de minimapa; `tests/sector-navigation-intel.cjs` adaptada al nou mòdul. Incloses en la validació de la regeneració i l'optimització.
- [ ] **Fase 3 encara oberta:** extracció incremental de més estat i sistemes d'inicialització; proves de partida real, desaments, COOP HOST/GUEST, Android, GPU i rendiment en la bateria conjunta acordada. No s'afirma cap guany d'FPS sense mesura.

**Fase 3 · cinquè tall, estat inicial i catàlegs (v0.6.130; implementació parcial):**
- [x] **Estat mutable inicial separat:** `src/game-state-core.mjs` crea els conjunts del mapa d'intel·ligència (HQ i localització de vehicles), els comptadors de visibilitat/LOD i els registres de draw calls. Són contenidors nous per motor/partida, amb les mateixes referències clàssiques que utilitzen desaments, render, generació i COOP; els valors que canvien durant la partida no es traslladen encara a un objecte global nou.
- [x] **Catàlegs inicials extrets:** `src/game-catalog-core.mjs` crea per cada motor els 13 tipus d'objectes, 14 icones SVG i els perfils de 7 enemics mitjançant el balanç existent injectat. Les descripcions, colors, mides, icones, ordre i mutabilitat són idèntics. La fàbrica evita compartir accidentalment definicions entre instàncies del harness.
- [x] **Paritat de dades inicials:** `tests/game-state-catalog-parity.mjs` comprova la signatura original completa del catàleg (FNV64), 360 perfils de combat amb dades injectades diferents, els defaults de tots els comptadors i l'aïllament d'estat de diverses instàncies. Afegida a `test:optimization`.
- [ ] **Fase 3 encara oberta:** migrar amb proves tots els consumidors de l'estat mutable d'HQ/COOP i la inicialització restant del motor; partida real, desaments, FPS, GC, Android i HOST/GUEST continuen pendents de la validació conjunta. No s'atribueixen guanys de CPU sense mesurar.



**Fase 3 · quart tall, cicle d'arrencada (v0.6.127; implementació parcial):**
- [x] **Estat inicial, progrés i cancel·lació extrets:** `src/start-lifecycle-core.mjs` calcula les opcions i dimensions de la missió amb dependències explícites, gestiona el senyal de cancel·lació i restaura els controls després de generar, cancel·lar o fallar. `game-core.js` conserva l'ordre original de les operacions, la propietat de `generationPromise`, els desaments, el generador i l'activació; no es canvia el RNG ni el comportament de SOLO/COOP.
- [x] **Prova diferencial aïllada:** `tests/start-lifecycle-parity.mjs` cobreix 1.040 informes de progrés, 112 notificacions de cancel·lació, 720 combinacions de llavors/mides/dificultat, l'ordre dels listeners i la restauració dels controls. Afegida a `test:optimization`. El harness Node també registra el mòdul abans d'executar el runtime.
- [x] **Compatibilitat amb canvis concurrents:** el bundle generat incorpora també la correcció d'autoapuntat d'armes lleugeres entrada a `main` durant aquesta extracció, sense revertir-la.
- [ ] **Fase 3 encara oberta:** separació incremental de més estat global i inicialització del motor; validació completa amb `tests/progressive-generation.cjs`, llavors i checkpoints, WebGL/Android, HOST/GUEST, FPS i GC durant la bateria conjunta acordada.


**Fase 3 · tercer tall del coordinador (v0.6.126; implementació parcial):**
- [x] **Coordinador de passos i rellotges separat:** `src/frame-tick-core.mjs` concentra les crides als rellotges semi-fixos de simulació i cinemàtiques, el reinici durant la generació, el pressupost de navegació per fotograma, la neteja de `simulationFrameActive` amb `try/finally`, els passos a `dt=0` i les crides de persistència SOLO. No altera el temps ni l'ordre de simulació, la física, les entrades, l'RNG, les dades de partides ni l'Worker.
- [x] **Paritat de la coordinació:** `tests/frame-tick-parity.mjs` compara el codi extret amb el contracte anterior sobre 354 fotogrames i 3.779 esdeveniments de la mateixa simulació, incloent pauses, generació, interrupcions, COOP, cinemàtiques i excepcions. Integrada a `test:timing` i `test:optimization`.
- [ ] **Fase 3 encara oberta:** extraure amb contractes l'estat i l'arrencada; comprovar simulació real, llavors, restauració, compatibilitat COOP/Android, FPS i GC en la bateria conjunta de proves. No s'ha mesurat cap millora de rendiment.


**Fase 3 · segon tall del coordinador (v0.6.125; implementació parcial):**
- [x] **Diagnòstic per fotograma separat:** `src/frame-diagnostics-core.mjs` encapsula la reinicialització dels comptadors d'IA/dibuix i l'emissió de les mostres del mode d'auditoria i del gestor adaptatiu. Les dependències del renderer, perfils i comptadors s'injecten una sola vegada; el bucle de simulació de `game-core.js` conserva el moment i l'ordre de les crides.
- [x] **Paritat de la telemetria:** `tests/frame-diagnostics-parity.mjs` compara el mòdul nou contra l'oracle de `game-core.js` anterior en 240 escenaris deterministes amb/sense auditoria, incloent les estadístiques de render, les condicions d'ombres, el reset dels mapes i les còpies independents per al HUD. Afegit a `test:optimization`.
- [ ] **Validació pendent de fase 3:** fer les suites Node completes i les proves reals GPU/COOP/Android amb comparativa FPS/p95/p99. Més endavant: extracció de l'arrencada, estats i coordinació del tick sense alterar RNG, física, ordres d'acció ni restauració.

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
