# Integració del cooperatiu al runtime original · 0.6.50


## 0.6.63 · càmera local sense sacsejades de rebase ni salts de tick

La mostra real mostra RTT 32,4 ms, 10 Hz regulars, interval màxim de recepció 196 ms i 15.414 frames locals amb 4,15 ms de mitjana (~240 Hz). El buffer remot presenta 13.174 frames interpolats sobre 13.204 d'actius, cap extrapolació ni underrun, però l'usuari veu tota la imatge tremolar quan es mou el jugador. Això apunta al camí **local** de predicció/visualització, no al renderer ni a l'amplada de banda.

**Origen al codi:** `createNativePrediction.receive()` reconstruïa la simulació amb cada estat, descartant `accumulator` fins i tot en snapshots compatibles. La presentació `advance()` només retornava la pose física que canvia cada 1/30 s; el motor la dibuixava directament cada fotograma, sense suavització sub-tick. Les diferències de predicció es transferien immediatament a la càmera.

**Canvi focalitzat:**
- `src/native-coop-prediction.mjs` manté el temps acumulat fraccionari en rebases compatibles; els canvis de missió/rol i les pauses el continuen reiniciant.
- Per a cada tick/input, calcula una sola vegada una *previsualització del següent pas de física*, amb el mateix `createPlayerSimulation()` per al jugador a peu i el mateix `stepRangeVehicle()` + comprovació de contacte per al pilot, però sobre còpies temporals. A cada render es combina la pose actual i la prevista amb la fracció de tick. No s'introdueix un segon simulador autoritatiu, no es modifica el vehicle físic i no s'envien ordres addicionals.
- `src/native-coop-local-presentation.mjs` absorbeix petites correccions de snapshots i canvis sobtats de controls sense saltar la càmera. Utilitza un offset temporal amb mitja vida de 160 ms, límit d'error de 3 m a peu o 12 m conduint, i permet salts reals de teletransport/rol.
- `src/coop-world-runtime.js`: la pose gràfica del pilot també s'aplica a la malla del vehicle, i `P`/càmera comparteixen la trajectòria. El vehicle físic guardat per `createNativePrediction` no se sobreescriu.
- `window.HUNTER_COOP_NETWORK_STATS.localPrediction`: `corrections`, `smoothedCorrections`, `hardSnaps`, `maxCorrectionM`, `maxCorrectionDegrees`, `visualErrorM`, `smoothedFrames`, `subtickBuilds`, `subtickFrames`.

**Regressions aïllades aprovades:** `tests/native-coop-local-presentation.mjs` (10 Hz persistents en 60/144/240 FPS, girs i teleports), `tests/native-coop-subtick.mjs` (240 FPS, a peu i conduint, control a mig tick i rebase), `tests/native-coop-prediction-cache.mjs` (no perdre 1/60 s en rebre un snapshot), més les suites de deltes/interpolador existents de les fases anteriors. `tests/native-coop-interpolation-runtime.cjs` comprova la coherència entre càmera i vehicle del pilot.

**Advertiment:** les comprovacions executades són proves pures/instrumentades en JS, no és una prova real de dos navegadors ni la suite Node 22/GPU. No s'han modificat el Worker, l'IA, el buffer d'altres jugadors ni la cadència dels estats de xarxa. Cal desplegar client/Worker coherentment a 0.6.63 i reproduir la partida.

## 0.6.62 · broadphase espacial local de vehicles i murs

Abans d'aquesta versió `createNativePrediction.step` filtrava **tots** els `state.vehicles` i `physical.walls` a cada subpas de 30 Hz o en reexecutar els inputs pendents després d'un snapshot. La càmera local era fluida, però aquest cost continuava essent potencialment alt en un món gran.

A `src/native-coop-vehicle-candidates.mjs`, cada vehicle del snapshot està assignat a una cel·la espacial de 128 m. La consulta de col·lisió inclou una regió ampliada pel màxim radi de les hitboxes i fa el mateix test final `Math.hypot` i ordenació per índex original que abans. Quan es manté la referència de flota entre deltes, la memòria cau es reutilitza; si el jugador és passatger o va a peu, no es construeix l'índex. `tests/native-coop-vehicle-candidates.mjs` comprova 374 vehicles de 16 tipus, 2.125 consultes, vores de cel·les, i casos de radi extens i reordenació.

A `src/native-coop-wall-candidates.mjs`, els murs s'indexen per AABB a 128 m. Els murs enormes s'emmagatzemen fora del grid, però continuen entrant a les consultes. La resposta conserva exactament l'ordre de la llista antiga. Es reconstrueix només quan canvien els murs/portes/teulades i es refà el món local. `tests/native-coop-wall-candidates.mjs` comprova 1.352 murs i 2.725 consultes, també murs molt llargs i coordenades negatives.

La predicció també reutilitza els límits de món, el radi del vehicle i només copia l'antiga pose `{x,y,z,hd}` necessària per a `firstVehicleContact`, en comptes del vehicle sencer. `tests/native-coop-prediction-cache.mjs` comprova l'índex de flota, els murs, l'aigua, les palmeres, el canvi de geometria i els rols de pilot, passatger i vianant.

Mesura local sintètica de 4.500 consultes espacials sobre distribució uniforme (374 vehicles, 1.350 murs): filtre anterior 300/332 ms (vehicles/murs) i filtre indexat 7/8 ms. No inclou construir índexs ni executar la simulació completa; és exclusivament una comparació del cost del filtre de candidats.

**Validació i límits:** tests pures de candidats i prova instrumentada de caché executats i aprovats en entorn JavaScript aïllat. No s'han executat la bateria Node 22 completa ni proves d'FPS/RTT en dos navegadors. No s'ha tocat `firstVehicleContact`, la simulació autoritativa del Worker, la persistència ni el protocol de xarxa. El workflow COOP continua només manual per manca de quota d'Actions; publicació a Cloudflare no verificada.

## 0.6.61 · moviment visual dels soldats, cachés i observabilitat local

**Soldats en moviment:** s'ha afegit `enemies` a l'interpolador visual. Només es creen tracks per enemics vius que canvien de pose; el codi de deltes preserva referències dels 377 soldats immòbils i el camí ràpid no calcula dues poses per cadascun. Els soldats comparteixen el buffer temporal 150–200 ms amb company i vehicles, previsió limitada a 120 ms i recuperació sense salt quan arriba un snapshot tardà. L'escena `src/coop-world-runtime.js` aplica la pose només a `e.o` (malla), conservant `e.x/e.z` i `hp` autoritatius. L'animació de les cames segueix ara el desplaçament real dibuixat entre fotogrames. Morts i teleports alliberen immediatament la trajectòria. Nou camp `remoteInterpolation.activeEnemies`.

**Aplicació de deltes:** per `delta.k` sense `delta.o`, `applyCoopDelta()` reconstrueix directament la llista en ordre amb `before.map`; omet un `Map` i un array temporal d'identificadors per recepció. Les entitats que no han canviat mantenen la identitat d'objecte. Quan hi ha reordenació, es continua emprant un índex per ID. S'ha afegit una regressió de referències i passen les proves pures de reconstrucció sense pèrdua.

**Predicció:** `createCanonicalWater(world.heightAt)` és reutilitzable per tots els subpassos del mateix món, i no es torna a instanciar als 30 Hz. `world.setPalmHealth()` només s'executa quan el delta modifica les dades de salut de les palmeres, o quan canvia la geometria. La prova instrumentada `tests/native-coop-prediction-cache.mjs` comprova reús i invalidació correcta. No s'han canviat les regles de física ni la predicció de cap tipus de vehicle.

**Render i diagnòstic:** projectils i granades reutilitzen els `Set` de IDs; es reutilitza el vector de direcció de projectils. `clientFrame` registra intervals entre frames del navegador, `averageGapMs`, `maxGapMs`, `over33Ms`, `over50Ms` i nombre de mostres. No equival a mesurar el temps de CPU del Worker ni FPS de GPU; no compta pauses/desenfocaments superiors a 250 ms.

**Proves:** `tests/native-coop-enemy-interpolation.mjs` ha passat amb 377 soldats, 2 en moviment, morts, teleports, reordenacions, estat immòbil i referències de deltes; també les suites pures de jitter, interpolació de vehicles i deltes i comprovacions aïllades del caché de predicció/telemetria. S'ha creat `tests/native-coop-enemy-runtime.cjs` per verificar visualment amb el motor original. **Encara no s'ha executat tota la bateria Node ni validat un navegador amb GPU.** Detall de les ordres a [COOP_OFFLINE_VALIDATION.md](COOP_OFFLINE_VALIDATION.md).


**Comprovació del runtime 0.6.61:** s'ha reconstruït el paquet clàssic `dist/hunter-runtime.4ead270bcf958f1c.js` incorporant el contingut **exacte** de `src/coop-world-runtime.js` (inclosa la interpolació visual de soldats, les cames i les optimitzacions de projectils). S'ha verificat el hash FNV64, la correspondència exacta del mòdul dins el paquet i la sintaxi de tot el script agrupat. No s'ha executat l'ordre completa `node tools/build-runtime.cjs --check` ni una prova de navegador amb GPU.

**Infraestructura:** la versió passa a 0.6.61 i s'ha actualitzat el bundle/manifest amb hash de contingut. El workflow `coop-regression.yml` té exclusivament disparador manual; no es consumeixen Actions en fer `push`. Cloudflare Pages, Worker i DO no s'han verificat ni desplegat des d'aquest entorn.

## 0.6.60 · codificació compartida dels deltes al servidor

A `server/coop-hub.mjs` el Durable Object conserva el `diffCoopState` compartit, i ara conserva **dins de cada `broadcastState()`** el JSON ja serialitzat quan els dos sockets tenen la mateixa baseline i el mateix número de revisió. Evita una segona passada de `JSON.stringify` sense canviar el format del missatge, la cadència del tick (30 Hz), la freqüència de distribució (~10 Hz), els identificadors dels clients, el càlcul dels danys ni la persistència. Si els clients han divergit en la seva revisió, es codifiquen deltes independents; cada baseline només s'avança quan s'envia correctament el missatge.

La nova regressió `tests/coop-broadcast-encoding.mjs` valida una única serialització quan tots dos parteixen de la mateixa referència, revisions diferents per actualitzacions al mateix tick, error de xarxa en un sol socket i recuperació a partir de la baseline individual. S'ha incorporat al workflow COOP, que també s'executa davant canvis de `server/coop-hub.mjs`.

**Validació:** el test nou ha passat en una execució aïllada del codi de servidor amb les seves dependències de delta. Les execucions de GitHub Actions de la fase 0.6.60 han fallat **abans d'assignar cap runner** (`runner_id=0`, cap pas executat); no és possible donar per superada la CI. Continua pendent verificar la suite Node completa i els dos navegadors reals. El bundle publicat al repositori té capçalera 0.6.60 i hash de contingut. No s'ha verificat el desplegament Cloudflare.

## 0.6.59 · estabilitat de snapshots i menys feina per recepció (31-10-2026)

**Correccions:** el buffer ignora estats de la mateixa missió amb un tick inferior a l'últim rebut (`staleReceives`) sense reiniciar la pose gràfica. El canvi de seient, fins i tot si continua essent el mateix vehicle, reinicia la trajectòria a peu del jugador remot: el seient es compara per identificador de vehicle **i índex**. Les transicions de conductor a passatger continuen sota l'autoritat del servidor i s'han inclòs a les regressions.

**CPU/GC:** el client comprova primer els vehicles i jugadors de l'estat anterior al mateix índex. Només quan un identificador no coincideix crea un `Map` de reserva per aquella recepció. Els `Set` temporals de vehicles i jugadors presents s'han substituït per un marcador de generació guardat exclusivament a les trajectòries gràfiques actives. El cost de comparar la flota completa continua existint perquè els vehicles poden moure's, però desapareixen aquestes assignacions redundants en un flux estable. Les dades autoritatives no es modifiquen.

**Regressions afegides:** estat antic rebut després d'un de més nou, canvi de seient dins el mateix vehicle, reordenació de la flota i de jugadors, retirada d'un vehicle que s'estava interpolant, i les fixtures existents amb 374 vehicles i jitter de xarxa. Proves pures executades després del canvi; cal continuar comprovant la CI amb la versió completa.

**Telemetria:** `remoteInterpolation.staleReceives` complementa `resets` i `gapResets`. Si augmenta a la prova amb dos clients, investigar ordre d'arribada i reconstrucció de deltes; amb el transport WebSocket seqüencial actual s'espera normalment 0. **Pendent:** dos dispositius, suavitat i desplegament Cloudflare de la 0.6.59.

## Optimitzacions preventives 0.6.58 (sense prova de dos clients)

**Render de remots:** `src/native-coop-interpolation.mjs` ara reutilitza un objecte de destinació per trajectòria en lloc d'instanciar un objecte de pose i un contenidor per cada vehicle/jugador i fotograma. Cerca l'interval entre snapshots de més recent a més antic, perquè el cursor normalment es troba prop del final. Manté el cursor per ticks de servidor, la predicció local separada i el límit de previsió de 120 ms. Dues proves pures d'interpolació, inclosa una amb 374 vehicles, han passat en executar el codi amb les fixtures del repositori.

**Deltes autoritatius:** `src/coop-state-delta.mjs` construeix una sola vegada l'índex per identificadors de cada llista, sense repetir les validacions i les assignacions de Sets/Maps de la implementació anterior. La representació JSON del delta de prova és idèntica i la reconstrucció és sense pèrdues. S'ha corregit també la consulta de patches amb IDs com `constructor` o `toString`, que no pot heretar una funció del prototip de l'objecte. La CI incorpora `tests/coop-state-delta.mjs`, amb fixture de 374 vehicles i 377 soldats, reordenació, eliminació i IDs especials.

**Diagnòstic visual addicional:** `remoteInterpolation.speedLimitedFrames` compta frames en què s'ha acotat un desplaçament de correcció; `maxRenderErrorM` compta el major error en metres entre pose presentada i destí temporal. Són indicadors visuals, no errors de física o del servidor.

**Benchmarks sintètics en un motor JavaScript**, només per orientar la prioritat: 374 vehicles, 594 passos de render: 455 ms abans i 390 ms després; comparació de snapshots de 374 vehicles i 377 enemics, 140 iteracions: 454 ms abans i 391 ms després. No són FPS, càrrega GPU o resultats Cloudflare; no permeten garantir una millora concreta en dispositius reals.

**Estat:** codi pujat a `main` i versió 0.6.58 amb claus de caché renovades. Les suites pures s'han executat aïlladament; comprovar la CI per a la validació completa. Encara falta verificar la publicació a Cloudflare i la prova amb dos navegadors.

## Ampliació 0.6.57: diagnòstic de xarxa i comprovació automàtica

Aquesta fase conserva el buffer de 150–200 ms i els límits de predicció ja documentats. S'ha afegit un perfil lleuger dels deltes a `src/native-coop-connection.mjs`: `fullStateFrames`, `deltaFrames` i `deltaProfile` (`samples`, `averageChars`, `bySection`). S'analitza aproximadament 1 de cada 16 missatges, sense afectar el protocol ni la simulació. Les mides són caràcters JSON aproximats, no bytes de xarxa.

La prova `tests/native-coop-network-jitter.mjs` simula 10 Hz de snapshots i 60 FPS de render durant vuit segons amb dos patrons de jitter. Verifica absència de salts en recepció, reversions, límits de velocitat visual i proporció d'extrapolació. Una regressió separada comprova els comptadors del perfil. La CI `.github/workflows/coop-regression.yml` s'executa després de canvis de sincronització i inclou integració amb el runtime original i verificació del bundle.

Per a la prova real: recopilar `window.HUNTER_COOP_NETWORK_STATS` de tots dos clients, sobretot `remoteInterpolation.activeFrames`, `extrapolatedFrames`, `bufferDelayMs`, `maxTickGap`, `fullStateFrames`, `deltaFrames` i `deltaProfile`. Fer recorreguts a peu, conducció i passatger. **Pendent:** prova presencial, desplegament Cloudflare, GPU i profiling de CPU; cap millora visual real no està certificada.


## Tercera telemetria real i inici del buffer adaptatiu · 31-10-2026

La prova posterior a 0.6.55 redueix el RTT a 46,37 ms (abans 67,17), jitter a 12,31 ms (abans 17,60), interval mitjà d'estats a 99,84 ms (abans 108,40) i màxim a 190 ms (abans 774). Hi ha 1.222 estats i 10.658.437 bytes totals (8,72 KB/estat), un teleport, 2 recepcions llargues, 2 reinicis per discontinuïtat i un salt màxim de 777 ticks a investigar. Els valors `activePlayers=0`/`activeVehicles=0` només descriuen la captura. **Important:** `forecastFrames=9273` entre `samples=12738` no demostra una extrapolació del 72,8%: la implementació anterior compta cada frame amb qualsevol trajectòria activa com a «forecast», incloent interpolacions ordinàries. Cal corregir els comptadors abans d'interpretar-los.

**Pla de treball i acceptació:** veure [sisena optimització al pla COOP_REBUILD](COOP_REBUILD.md). Buffer per tick de 150–200 ms ajustat a irregularitat, extrapolació excepcional <=120 ms, protecció de canvis d'estat i retorn de proves reals amb dos navegadors. Els canvis del client no han de tocar l'autoritat del servidor ni la predicció del pilot local. Revisar la mida de deltes només després de separar cost de xarxa de cost de renderitzat.

**Estat 0.6.56:** primera implementació pujada a `src/native-coop-interpolation.mjs`: fins a 12 mostres per trajectòria (ticks autoritatius), rellotge remot compartit, retard adaptatiu de 150–200 ms, previsió limitada a 120 ms, protecció de teleports/morts/seients/pauses i comptadors nous `bufferDelayMs`, `activeFrames`, `interpolatedFrames`, `extrapolatedFrames`, `bufferUnderruns` (l'antic `forecastFrames` ara compta només previsions reals; per obtenir la proporció de fotogrames predits s'ha d'emprar `extrapolatedFrames / activeFrames`, no `forecastFrames / samples`). Els tests purs i del runtime original s'han ampliat; **no s'han executat encara amb Node ni dos navegadors reals**. S'han actualitzat la versió visible i les claus de memòria cau a 0.6.56, amb un bundle reversionat i hash validat. No s'ha verificat el desplegament ni mesurat encara la suavitat després del canvi.


## Dades del segon test real i recuperació de talls > 400 ms · 0.6.55

Segona telemetria rebuda (mateix context cooperatiu): RTT 67,17 ms, jitter 17,60 ms, interval mitjà entre estats 108,40 ms, **màxim 774 ms**, 662 missatges de contingut d'estat i 6.046.228 caràcters acumulats (~9,1 KB per missatge); `remoteInterpolation.clampedFrames=958`, `forecastFrames=9664`, `resets=3`, `teleports=0`, `activePlayers=0`, `activeVehicles=0` a l'instant de la captura. Els dos zeros d'entitats actives poden ser normals si estan aturades; els comptadors de fotogrames són acumulatius i no constitueixen ni FPS ni un nombre de talls de connexió. L'alt valor de `maxStateGapMs` no identifica tot sol si el retard s'ha produït al client, a la xarxa o al servidor.

**Fallada trobada al codi anterior:** `src/native-coop-interpolation.mjs` reiniciava tot el buffer si dos snapshots estaven separats per més de `MAX_GAP_TICKS=12` (400 ms a 30 Hz). Una pausa de 774 ms pot equivaldre a uns 23 ticks i provocar un salt immediat en tornar a rebre dades. A més, la comprovació fixa de 24 metres no acceptava trajectòries legítimes d'helicòpters ràpids durant un tall llarg.

**Correcció específica:** tolerar fins a 60 ticks de separació sota la mateixa missió i estat actiu, preservant la pose gràfica ja presentada; la seguretat contra teleports continua aplicant un límit de distància físicament plausible, ara depenent del temps transcorregut i de la velocitat informada pel vehicle, acotat a un màxim de 90 metres (i conservant el llindar mínim de 24 m). Es continuen mostrant immediatament els grans teletransports, canvis de seient, mort i pausa; un tall de més de 2 segons reinicia per evitar prediccions a partir de dades massa antigues. La previsió sense paquets nous continua limitada a 120 ms i no canvia cap regla del servidor.

**Instrumentació addicional:** `remoteInterpolation.maxTickGap`, `longGapReceives` (>12 ticks) i `gapResets` (>60 ticks). Es compararan aquests camps amb `maxStateGapMs`: una pausa temporal alta amb molts ticks avançats suggereix actualitzacions retardades/pèrdues al transport; si els ticks gairebé no avancen, convé inspeccionar la cadència del Durable Object.

**Important sobre els tres temps de servidor a zero:** segons la documentació oficial de Cloudflare Workers, `Date.now()` i `performance.now()` només avancen en producció després d'una operació I/O; els càlculs de CPU purs poden marcar 0 ms. **No** hem de concloure que `serverTickMs=0` significa una simulació gratuïta; per al CPU de producció cal profiling de Workers/Durable Objects. Font: https://developers.cloudflare.com/workers/runtime-apis/performance/.

S'ha afegit la regressió de **23 ticks / 774 ms** i un helicòpter que es desplaça més de 24 m entre dos snapshots a `tests/native-coop-interpolation.mjs`. Prova pura aïllada superada. Bundle del runtime individual/cooperatiu recompilat amb les fonts actuals i versió 0.6.55; la importació de l'interpolador i el bootstrap es carreguen amb `smooth=3`. **No verificat encara:** bateria completa Node, Cloudflare ni dos navegadors físics després del canvi.


## Correcció de salts de company i vehicles · 0.6.54 (30-10-2026)

Una prova de dos jugadors ha indicat càmera fluida però salts de company i vehicles. Mètriques rebudes: RTT 69,1 ms, jitter 28,8 ms, snapshots cada 104,35 ms de mitjana, màxim observat 346 ms. Les mesures de servidor en 0 ms no demostren cost zero (resolució temporal insuficient).

Causa del client: l'interpolador anterior s'aturava quan arribava al darrer tick disponible (~100 ms). Durant una pausa de 346 ms deixava d'animar la trajectòria, i el nou snapshot podia provocar una correcció brusca.

Correcció a `src/native-coop-interpolation.mjs`: cada entitat remota conserva la seva darrera pose visual, encara que rebi una correcció de xarxa. El destí es persegueix amb suavitzat independent de FPS (~68 ms), amb una breu previsió visual de velocitat limitada a 120 ms i un màxim de desplaçament per fotograma. No es canvia la física, la posició autoritativa, el pilot local, ni la lògica de combat. Teletransports, canvis de seient, morts, reanimacions i pausa continuen essent immediats. Les trajectòries immòbils es retiren; la llista visual de vehicles no es reconstrueix per fotograma.

El diagnòstic `window.HUNTER_COOP_NETWORK_STATS.remoteInterpolation` afegeix estadístiques `forecastFrames`, `clampedFrames`, `teleports`, `activeVehicles` i `activePlayers`. El paquet s'ha regenerat sobre la versió concurrent 0.6.54 conservant els canvis d'altres funcionalitats, i s'han invalidat les importacions de memòria cau (`smooth=2`).

Les regressions `tests/native-coop-interpolation.mjs` (interrupcions de 346 ms, continuïtat de la pose, previsió acotada, teleports, 374 vehicles) i `tests/native-coop-interpolation-runtime.cjs` (presentació dins el motor original) s'han actualitzat. La prova aïllada de l'interpolador ha passat. La bateria completa Node, dos clients reals i desplegament Cloudflare encara s'han de verificar. La previsió acotada no elimina tots els efectes d'una interrupció de xarxa llarga.


## Transport i diagnòstic del servidor · 30-10-2026

La fase 5 aporta una reducció de feina del Durable Object i instrumentació de la ruta de xarxa, sense relaxar la persistència autoritativa.

- **Control ràpid:** `server/coop-hub.mjs` compta els paquets de moviment i combat en `WeakMap` per socket. S'eliminen les serialitzacions d'attachments de cada control (20/s/jugador habitualment), mantenint la verificació cada segon, els límits de 45 controls/s i 12 ordres de combat/s, i el tancament de connexions que els superen. En hibernar el DO es perd el comptador efímer, que es reinicia en el següent paquet; no es perd la identitat autenticada.
- **Costos del servidor:** després del batch de tres subpassos (30 ticks/s), `frameMetrics` conserva la durada observada de simulació, guardat del checkpoint i enviament del delta, més el tick del checkpoint ja desat. No es genera un snapshot addicional només per recollir mètriques. Continua sent obligatori desar les accions abans de confirmar-les; els números són durades de paret, no CPU pur.
- **Sondes de xarxa:** el servidor anuncia `telemetry:1` amb `native-mission`. Només si rep aquest anunci el client envia una sonda `latency-ping` cada ~2 s. El servidor valida sessió i identificador, limita a 2 sondes/s i retorna `latency-pong` amb el temps de simulació/guardat/difusió. Així, un client nou no envia un missatge desconegut a un Worker antic durant desplegaments no atòmics.
- **Diagnòstic al client:** `window.HUNTER_COOP_NETWORK_STATS` conté `rttMs`, `rttJitterMs`, `serverTickMs`, `serverSaveMs`, `serverBroadcastMs`, `serverTick`, `stateFrames`, `stateBytes` (estimació barata basada en longitud de la cadena WebSocket, no bytes UTF-8 exactes), `avgStateGapMs` i `maxStateGapMs`. Es buida en abandonar la sessió. No altera els controls ni els missatges de partida.
- **Regressió:** `tests/coop-transport-telemetry.mjs` registrada a `test:play`. Prova el límit de 45/segon i la recuperació de finestra, l'absència de crides persistents per entrada, validació de sondes, RTT, intervals i compatibilitat amb Worker antic. L'execució aïllada de les funcions reals ha passat.

**Verificació pendent:** bateria Node completa, dos clients navegador/Android, rendiment real Cloudflare Durable Objects (especialment temps de `storage.transaction()` i RTT), validació de desplegament. La millora teòrica de 40 serialitzacions d'attachments/s per dos jugadors no és una mesura d'FPS ni de latència d'internet.

## Continuació 30-10-2026 · buffer temporal de remots

**Fase 4 del pla de rendiment: codi implementat; GPU i dos dispositius pendents.** Es conserva el renderer/escena/càmera del mode individual.

- `src/native-coop-interpolation.mjs`: buffer de dos snapshots successius amb ticks del servidor (30 Hz), cursor entre l'anterior i el darrer, sense extrapolació més enllà del darrer estat. Només s'emmagatzemen trajectòries de vehicles amb posició/rumb nous. Distàncies incompatibles (més de 24 m entre snapshots) es mostren immediatament; snapshots separats més de 12 ticks, canvis de missió o pausa reinicien la trajectòria. Les rotacions recorren l'angle menor.
- `src/coop-world-runtime.js`: el company reutilitza el model Three.js original i un vector de destí que ara s'actualitza des del cursor temporal, sense aplicar-li a sobre suavitzat exponencial. Els vehicles remots visibles interpolen x/y/z/rumbo i altitud; el seu LOD manté el cost visual contingut. El **pilot local** continua prioritzant la seva predicció i reconciliació; un passatger local, en canvi, segueix el vehicle remot. Canvis de seient, morts, reanimacions i teletransport es projecten sense barrejar dues poses incompatibles.
- Els esdeveniments de combat, portes, destrucció, inventaris i col·lisions **no** s'interpolen; continuen sota l'autoritat del servidor. La presentació interpolada no s'envia de tornada a la xarxa.
- `src/bootstrap.mjs` i `tests/harness.cjs` carreguen la mateixa implementació pura; es renoven els paràmetres de memòria cau de l'entrada per servir el nou mòdul i runtime compilat. Es manté el número de versió 0.6.53.
- `tests/native-coop-interpolation.mjs` valida càlcul pur, jitter/absència d'extrapolació, 374 vehicles, discontinuïtats, pauses i seients; `tests/native-coop-interpolation-runtime.cjs` és la regressió amb el món original per a company, vehicle i passatger/pilot. Inscrites a `npm run test:play`.

**Evidència:** prova de càlcul aïllada completa i prova d'integració aïllada amb la funció `updateNativeCoop()` real superades. **No s'han executat** les suites Node completes ni una comparativa visual a dos dispositius, i no s'ha verificat la publicació a Cloudflare. No es pot afirmar encara que el lag s'hagi eliminat.


## Optimització visual compartida · 30-10-2026

S'ha aplicat una passada segura sobre el **motor original** que beneficia el mode individual i la sessió nativa cooperativa:

- **Vehicles aparcats:** `place()` deixa de recalcular terreny, inclinació i peces visuals en cada fotograma si el vehicle és terrestre, no és el vehicle del jugador, està completament aturat i conserva la mateixa pose. Canvi de coordenades, rumb, estat físic, correcció externa de mesh o reactivació de la marxa n'invalida la memòria cau. Els vehicles aquàtics, aeris, amb impactes i immersió mantenen les actualitzacions originals.
- **Erugues de tanc:** els esglaons no s'actualitzen quan la fase no ha avançat; tornen a animar-se amb el moviment o un gir del tanc.
- **Palmeres:** a `src/vegetation.js`, la desactivació de la mira de franctirador (o un canvi del mode de palmeres) força el recàlcul LOD encara que el jugador no camini 45 metres, evitant que les malles detallades quedin actives de manera innecessària.
- **Ombres:** la selecció periòdica de projectors reutilitza un vector de posició mundial per propietari dinàmic. No es redueixen el radi, la freqüència de refresc o la resolució de l'ombra; només s'eviten al·locacions repetides.
- **Regressió:** `tests/shared-visual-idle.cjs` (a `test:optimization`) empra les funcions reals de producció i comprova 120 fotogrames aparcats, reactivació després d'un canvi, erugues, LOD en sortir de la mira i ombres. Les comprovacions aïllades han passat; execució completa Node, GPU, dos jugadors i desplegament Cloudflare encara sense verificar.

Això és una **optimització de CPU i de triangles potencials**, no un nou sistema de xarxa. Les xifres de FPS/latència només es podran donar després d'una comparativa en el navegador real.


## Continuació del rendiment 29-10-2026 · projecció incremental

El client ja podia rebre snapshots de diferències i només processava part dels efectes un cop per estat. Aquesta intervenció completa la separació entre **recepció autoritativa** i **presentació per fotograma** sense introduir un segon motor.

- `src/coop-world-runtime.js`: HP, recompte de baixes i inventari es recalculen només amb un estat autoritatiu nou; un inventari que conserva la mateixa referència als deltes no es reconstrueix.
- Vehicles i enemics: `appliedVehicleRows` i `appliedEnemyRows` reaprofiten les referències dels registres no modificats. Les posicions, paràmetres de torreta i metadades d'una entitat intacta no es tornen a assignar. La predicció local del vehicle conduït i el LOD comú continuen cada fotograma.
- Company: es reutilitzen el model, el vector Three.js de destinació i la relació de seient calculada en rebre el snapshot. Interpolació i animació del company continuen amb el temps de cada fotograma, sense crear un vector ni cercar el seient a cada pas.
- Efectes i món compartit: mapes de projectils i granades, explosions, portes, parets, vidres, cobertes, palmeres i botí només es reconcilien quan la col·lecció corresponent canvia. Les portes mantenen l'animació de cada fotograma.
- `src/game-core.js`: el LOD d'enemics compartit amb l'individual respecta `hp<=0` i destrucció; ja no es poden mostrar de nou soldats morts entre snapshots.
- Prova `tests/native-coop-snapshot-projection.cjs` afegida a `npm run test:play`: repetició sense estat nou, estat amb un únic vehicle canviat, referències intactes de models i inventari, i invisibilitat dels enemics morts.

**Comprovació feta:** sintaxi de les fonts, prova estructural de deltes amb 374 vehicles/377 enemics i prova aïllada de la funció real `updateNativeCoop`: 20 fotogrames sense reassignacions autoritatives, un sol vehicle actualitzat amb el següent estat i animació contínua dels soldats/companya. El bundle compilat s'ha actualitzat amb les fonts corresponents. **Pendent** executar la suite completa de Node en un checkout, perfilar CPU/FPS amb GPU, provar dos dispositius reals i verificar el desplegament Cloudflare. No es dona cap percentatge especulatiu de reducció de lag.
## Optimització iniciada el 29-10-2026 · LOD compartit de vehicles

Pla i prioritats acordades: [COOP_REBUILD.md](COOP_REBUILD.md#pla-de-rendiment-cooperatiu-29-10-2026). **Primera fase implementada al codi, validació de rendiment real pendent**.

- `src/game-core.js` extrau el planificador visual de `place()` en `updateVehicleVisualLod(t,dt)`. Les dues modalitats criden **exactament la mateixa funció**: el joc individual a `update()`, el cooperatiu natiu a `updateNativeCoop()`. No s'ha modificat el control autoritatiu del servidor.
- Cadència idèntica a l'individual: vehicle propi i vehicles a menys de 500 m **cada fotograma**; distància mitjana (500–1.200 m) **cada 0,1 s**; llunyans **cada 0,45 s**. La mira de franctirador manté el detall del vehicle enfocat. No es calculen `place()` ni animacions de vehicles destruïts.
- `src/coop-world-runtime.js` continua llegint posicions, HP, seients i torretes autoritatius, però ja no crida `place()` indiscriminadament per tots els vehicles en cada fotograma; la presentació de transformacions passa pel LOD comú. La física, col·lisions, dany i dades del servidor no s'hi redueixen.
- Prova de regressió afegida: `tests/native-coop-vehicle-visual-lod.cjs`, registrada a `npm run test:play`. Comprova 20 passos en individual i cooperatiu, quatre franges de comportament (vehicle propi, proper, intermedi, llunyà) i un destruït. **La prova s'ha escrit, però no s'ha executat en un checkout Node**.
- Fonts i paquet de navegador actualitzats a la branca `main` i coherència estàtica per verificar. **No hi ha encara comparativa d'FPS/CPU en GPU, prova real amb dos clients ni desplegament de Cloudflare verificat.** Per tant no s'atribueix una millora numèrica d'FPS o latència.

**Següent bloc:** aplicar snapshots incrementals només quan canviï el tick, reduir assignacions i cerques repetides; després interpolació de remots/predicció local i optimització de xarxa, mantenint la prova amb dos jugadors.


## Continuació 0.6.53 · prioritat al retard i al rendiment

S'han corregit diversos costos estructurals del camí natiu:

- **Xarxa:** estat complet en entrar/reconnectar i diferències sense pèrdua després. Les entitats immòbils, inventaris i dades estàtiques no es tornen a enviar. Cada connexió té revisions pròpies; si falta una base, es reconnecta per recuperar un estat complet. Això també resol diverses ordres dins d'un mateix tick. El servidor construeix un sol snapshot per difusió i comparteix el càlcul de diferències quan les bases coincideixen.
- **Simulació:** la següent alarma es calcula sobre el termini anterior, sense sumar-hi cada vegada el temps de CPU i desament. Els tres subpassos no generen snapshots de presentació descartats. Els heartbeats no reinicien el calendari d'una missió que ja està corrent.
- **Persistència:** metadades immutables del món desades una sola vegada per missió, separades de l'estat dinàmic. Es manté la transacció abans de difondre estat o confirmar ordres; no s'ha canviat per un desament eventual que pugui perdre impactes confirmats. Es llegeixen també els formats anteriors.
- **Resposta local:** predicció del moviment a peu i de la conducció dels 16 tipus de vehicle amb les funcions pures compartides. Les regles de moviment/contacte de vehicles s'han extret sense reescriure-les. En rebre autoritat es descarten entrades reconegudes i es reprodueixen les pendents; la finestra està limitada a 12 passos (400 ms). Els passatgers no prediuen la direcció. Davant una col·lisió que podria destruir un obstacle, la predicció s'atura i espera l'autoritat. Danys, recollides, inventari i destrucció no es decideixen localment.
- **Dispar mantingut:** viatja amb l'entrada habitual i el servidor manté la cadència. Només es conserva una ordre immediata inicial per als tocs curts; no hi ha una transacció/petició addicional per cada tret d'una ràfega continuada.
- **Client:** les actualitzacions de xarxa respecten l'ocultació per distància del motor original. Ja no fan reaparèixer tots els vehicles i enemics llunyans entre passades LOD. Els vehicles ocults eviten el càlcul visual de col·locació i els enemics ocults eviten animació; les portes es consulten per identificador indexat.

### Mesura reproduïble

`native-coop-performance.cjs`, món original de llavor 67, 30 difusions (3 segons de simulació):

| Mesura | Abans / referència | Després |
| --- | ---: | ---: |
| Dades d'estat serialitzades | 3.429.573 bytes | 322.277 bytes |
| Reducció de dades durant la prova | — | 90,6% |
| Estat complet d'un checkpoint repetit | 200.055 bytes | 123.627 bytes escrits, sense repetir metadades |

La prova reconstrueix exactament l'estat JSON i compara la simulació amb i sense snapshots descartables. Una prova de calendari injecta 50 ms de feina per difusió i conserva 30 ticks/s. Hi ha proves de predicció abans de rebre resposta, reconeixement/reproducció d'entrades, pausa, límit de deriva i paritat de sis passos dels 16 vehicles; i regressions de visibilitat, munició/cadència i transport.

Aquests números són de fixtures locals; **no són una mesura de ping ni una garantia d'FPS de producció**. Cal provar aquesta versió a les connexions/dispositius que patien el retard. La predicció pot corregir la posició en arribar l'autoritat, especialment en xocs destructius o connexions amb més de 400 ms sense estat. La paritat pendent de campanya continua oberta, però la prioritat passa a validar el rendiment real abans de continuar afegint sistemes.

## Continuació 0.6.52 · percepció i combat dels soldats originals

El primer bloc de la IA original passa a `enemy-perception-core.mjs`, utilitzat pel mode individual i pel servidor: configuració de visió i sons, con horitzontal/vertical, reconeixement, efectes d'ajupir-se/disfressar-se, consciència perifèrica de l'elit al soterrani, perfils de punteria i imprecisió del rastre sonor. S'han comparat 11.880 casos amb les fórmules conservades de la 0.6.51. L'animació d'infanteria també és una funció original compartida entre les dues presentacions.

El cooperatiu natiu guarda una observació separada de cada actor; reconèixer el primer no reconeix el company. La percepció funciona a 10 Hz amb el desfasament original de cada guàrdia. Les traçades existents del món compartit bloquegen murs, pisos i vehicles estacionats; el vehicle objectiu no es bloqueja a si mateix. Les finestres continuen utilitzant la geometria compartida.

L'exportació del món conserva les rutes de patrulla, velocitats, cadències, elit i soldats amb bazuca originals. El servidor valida aquests camps i conserva observacions, objectiu, memòria i temporitzadors al checkpoint. El tret utilitza la cadència i el dany originals, amb la mateixa escala de punteria segons dificultat; els coets enemics poden danyar tots dos jugadors. Els sons d'armes/explosions i els crits locals utilitzen els radis originals i una posició recordada, sense donar visió a través dels murs.

Proves superades: paritat de fórmules; dos actors, cobertures, vehicles, disfressa, ajupiment i soterrani; cadència de fusell/elit/bazuca i explosions enemigues; checkpoint; sigil/coordinació individuals; món natiu normal amb dos generadors i món gran de llavor 0 amb 374 vehicles/377 enemics; entrada/presentació natives i Worker amb dos comptes autenticats, reconnexió i restauració en fred. El paquet inclou també els canvis paral·lels de sostres i càmera dels hangars.

**Límit d'aquesta fase:** la percepció/combat dels soldats avança, però no s'ha traslladat encara la navegació tàctica original (persecució, reculada, flancs, entrada per portes i cues), ni les patrulles de vehicles, torres, lògica completa del general i sistemes opcionals. Les rutes de patrulla es conserven, però el moviment del servidor encara utilitza l'adaptador de col·lisions existent. Aquesta fase no acredita la paritat completa de la IA, dues GPU/dispositius ni desplegament verificat.

## Continuació 0.6.51 · estabilització i validació autenticada

- La selecció nativa d'armes des de l'inventari i el selector ràpid comparteix la mateixa funció. Canviar d'arma cancel·la la càrrega de granada i la mira. Una granada seleccionada no manté les banderes visuals del rifle anterior; gastar l'última restaura l'arma confirmada pel servidor.
- El dispar mantingut usa la cadència del catàleg compartit i ticks autoritatius, inclosos els perfils de tanc, tanqueta i helicòpter. S'eviten ordres de pistola en vehicles tancats sense arma.
- El transport natiu recupera el detector de connexions silencioses del client anterior: si no arriba cap resposta durant més de 30 segons, el següent heartbeat tanca el socket i activa el reintent. La mateixa missió conserva la seqüència d'entrada; una missió nova la reinicia. Els tancaments de protocol 1008 són definitius.
- Els rebutjos d'accions habituals (vehicle en marxa, ple, sortida bloquejada, falta de munició) arriben al missatge original del HUD. La sortida elimina projectils/granades/remots i neteja tecles i càrregues pendents. Una arrencada fallida retorna al menú amb la simulació pausada.
- Nova prova `native-coop-authenticated.mjs`: dos comptes aprovats, D1, WebSocket i Durable Object reals dins de Miniflare/workerd; món original de més d'1 MB per fragments, general/flota, identitats, moviment, inventari, pausa/reconnexió i restauració en fred. Ha passat amb el Worker compilat de la 0.6.51.
- També han passat les proves natives d'arrencada, controls, transport, reconnexió, món i presentació; la simulació individual de 10–120 FPS amb pauses/jitter; i la coherència del paquet generat.

Aquesta validació autenticada és local i sense renderitzat GPU. No acredita dos dispositius físics ni el desplegament de producció. Els pendents de paritat detallats més avall continuen oberts.

## Canvi real d'entrada i presentació

La sala del menú original inicia `HUNTER_NATIVE_COOP.start`. `coop.html` redirigeix al mateix `index.html` i carrega el mateix motor; ja no és la pantalla de joc del client ortogràfic. El nou adaptador de xarxa no construeix cap escena, renderer, càmera, HUD o comandament.

El runtime original comparteix `readPlayerControls`, `updatePlayerCamera` i `updatePlayerHUD` entre sessions. Cada compte projecta el seu actor sobre `P`; la càmera en perspectiva original segueix aquest actor des de darrere. El company es representa amb els models i els pilots originals. Les dades de la sala alimenten els vehicles, projectils, granades, portes, finestres i destrucció del món original. Els efectes i la cinemàtica de victòria utilitzen el codi existent.

Les comandes de disparar, triar armes, interactuar amb portes i vehicles, disfressa, farmacioles i C4 es redirigeixen a la infraestructura autoritativa. La càrrega de granada conserva la potència a través del protocol. El mode individual continua executant el seu camí local. Els desaments i autodesaments individuals queden bloquejats durant una sessió remota.

## Un món original verificat pels dos participants

Cada navegador genera el món amb el generador original i exporta registres físics sense meshes ni credencials, amb els identificadors del registre de desaments. Es conserven els complexos, edificis, portes, vegetació, flota i enemics originals, inclòs el general. Les coordenades canòniques s'arrodoneixen a una milionèsima de metre per evitar diferències numèriques insignificants en la identitat del món.

L'amfitrió envia l'estat inicial per fragments limitats. Tots dos participants han de confirmar el mateix SHA-256 i revisió de sala. El servidor comprova la identitat dels fragments, el compte de l'amfitrió, els límits i la geometria, i inicia l'estat compartit només després de les dues confirmacions. Aquesta comprovació és una coincidència de dos generadors originals; no és una nova generació alternativa al servidor.

La preparació sobreviu a la hibernació del Durable Object. Geometria i checkpoints grans es divideixen en valors limitats, evitant superar el límit per valor del magatzem. La confirmació inicial es desa de manera atòmica abans de publicar la missió; els checkpoints mantenen la restauració i reversió d'accions existents.

La inicialització de l'angle d'algunes embarcacions utilitzava Math.random. Ara utilitza el hash de llavor i coordenades ja existent, sense consumir el flux aleatori principal ni moure la distribució del món.

## Validació feta

- Dues instàncies originals de la llavor 67 produeixen exactament el mateix estat canònic.
- El món exportat conté 98 vehicles i 124 enemics a la fixture normal; la fixture gran de llavor 0 en conté 374 i 377, respectivament.
- Preparació per fragments, dos vots, autorització de l'amfitrió, identitat, persistència de valors limitats i restauració en fred.
- Els dos identificadors de jugador, en ordre diferent, utilitzen el mateix renderer/canvas, HUD original i càmera original darrere del seu propi actor.
- Entrada pública de la sessió: generació progressiva original, preparació, vinculació de missió, controls i comandes originals, aïllament de desaments i sortida.
- Regressions de moviment i cadència amb 10–120 FPS, jitter i pauses; combat, armes, vehicles, portes, inventari, reanimació, destrucció, vegetació i finestres.
- El test anterior de la interfície ortogràfica es retira del circuit principal perquè aquella pàgina ja no existeix com a client de joc. Es substitueix per proves del runtime original.

Les proves són de Node/Three i dels adaptadors de transport. No equivalen a haver provat aquesta versió amb dos navegadors autenticats ni amb GPU Android. La suite extensa `camera-controls.cjs` ha estat interrompuda pel límit de memòria del contenidor; la prova específica de les dues càmeres natives i la de timing han passat. No s'ha verificat el desplegament.

## Paritat encara pendent: no declarar el mode acabat

La integració de pantalla, món i sessió és implementada, però la campanya cooperativa encara no té paritat completa:

- La simulació autoritativa reutilitza el combat/guàrdies existents del cooperatiu. Falta traslladar-hi la IA completa original: persecució, navegació, patrulles terrestres i marines, torres i supressió, elit i totes les prioritats.
- Presoners, mecànic, ràdio, fauna amb interaccions i altres sistemes opcionals encara necessiten estat i accions compartits. No s'han duplicat dins d'un segon client.
- Mapes/intel·ligència, paracaigudes i tots els detalls d'inventari encara necessiten projecció autoritativa. Les recollides d'armes i consumibles principals sí estan connectades.
- Cal completar la paritat fina de vehicles: salts en marxa, passatgers, càrrega sobre ferris i animacions/remotes. Falta predicció i reconciliació del moviment local per reduir la latència percebuda.
- Cal una prova real amb dos dispositius, incloent interiors i soterrani, i comprovar el desplegament del Worker i dels assets de la mateixa versió.

Aquesta és la primera integració jugable dins del motor original. No s'ha de presentar com la reconstrucció completa sol·licitada fins que s'hagin tancat aquests punts.

