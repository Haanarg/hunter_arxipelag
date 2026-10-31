# Reconstrucció del multijugador sobre el joc original

## Correcció del jitter i origen dels trets en COOP (0.6.64)

**Problema reportat després de la 0.6.63:** el jugador i la càmera ja es mouen completament fluids, però les bales encara surten aparentment de darrere del personatge i es desplacen a sotracs.

**Causa comprovada al codi:** `src/coop-world-runtime.js` assignava `mesh.position.set(row.x,row.y,row.z)` només quan canviava `state.combat.projectiles`. Amb snapshots de ~10 Hz, les malles quedaven immòbils entre paquets. A més, `server/coop-combat.mjs` disparava a peu amb `from={x:p.x,y:p.y+1.5,z:p.z}`, diferent de la pistola del joc individual que neix ~0,7 m davant del cos.

**Implementació concreta:**
- `src/native-coop-projectile-visual.mjs`: cada fila de projectil es projecta només gràficament amb velocitat `vx/vy/vz` a cada frame, amb un màxim de 180 ms sense estat nou; les correccions entre snapshots es distribueixen gradualment i es preserva la continuïtat en recepció, sense alterar les dades originals, danys ni col·lisions.
- Les noves bales pròpies de pistola, fusell d'assalt i franctirador s'inicien visualment al punt de boca del rig del jugador, **quan l'origen és pròxim i la direcció és compatible**; quan la pistola encara és al canell, el punt s'obté amb el mateix avançament de .7 m del mode individual. Les bales alienes, distants o que viatgen enrere no s'enganxen a la pistola pròpia.
- `server/coop-combat.mjs`: el tret físic de pistola a peu comença 0,7 m davant del jugador; fusell d'assalt/sniper/bazuca també empren un avançament proporcional. Els vehicles conserven els seus canons i muntatges, i els punts del servidor continuen essent els únics que determinen impactes.
- `src/coop-world-runtime.js`: activació de l'animació de tir/reculada de la pistola pròpia quan arriba un efecte `shot`; les malles s'actualitzen cada fotograma, es destrueixen quan el servidor les retira i es netegen en tancar la sessió.
- Telemetria nova: `window.HUNTER_COOP_NETWORK_STATS.projectileVisual`, amb `visualFrames`, `active`, `localMuzzleStarts`, `corrections` i `maxCorrectionM`.
- Test nou `tests/native-coop-projectile-visual.mjs` comprovat en JS aïllat: la bala apareix a la boca de pistola, avança a 240 Hz, no salta en rebre un nou estat, manté referències de delta i té extrapolació limitada; `tests/native-coop-held-fire.mjs` comprova també el nou origen físic del servidor (pendent de suite Node 22 completa).

**Important:** la generació i els impactes encara depenen de l'estat autoritatiu rebut. No es creen bales de dany local ni es falsegen impactes per amagar latència. La primera aparició pot tenir el retard del primer paquet; la fluïdesa **després d'aparèixer** ja no depèn de 10 Hz. Cap canvi de freqüència de simulació, de WebSockets ni del Worker fora de l'origen del tret.

Versió 0.6.64 amb bundle regenerat i workflow manual-only (cap Action iniciada). Sense verificació d'una partida amb dos dispositius ni desplegament Cloudflare confirmat.

## Correcció específica del jitter de moviment local (0.6.63)

**Prova real rebuda:** RTT 32,4 ms, jitter RTT 16,4 ms; 752 estats cada 99,17 ms de mitjana, màxim 196 ms; 15.414 intervals de fotograma locals amb mitjana 4,15 ms (~240 FPS) i només 6 intervals >33 ms. El company/vehicles disposen de buffer visual de 200 ms, sense extrapolacions ni desbordaments en aquesta mostra. L'usuari observa tremolor constant de tota la imatge quan es mou, i fluïdesa si ningú no es mou.

**Dues causes plausibles i observables al codi (no confondre amb GPU o amplada de banda):**
1. `src/native-coop-prediction.mjs` reiniciava `accumulator=0` cada vegada que arribava un estat del mateix moviment (aprox. 10 cops/s), perdent temps de simulació fraccionari.
2. El client presentava directament la pose de la física local de **30 Hz** a un renderer que pot estar actualitzant-se a **~240 FPS**, de manera que posició de jugador/càmera i pilot només canviaven cada 33 ms. A més, cada recepció d'estat reconstruïa la física autoritativa i podia fer retrocedir lleugerament la pose de la càmera.

**Canvis a la 0.6.63:**
- Conservar el fraccional de `accumulator` en tots els rebases compatibles de la mateixa missió, jugador i seient; reiniciar-lo únicament quan canvia la modalitat/identitat o la sessió deixa de ser predictible.
- `src/native-coop-local-presentation.mjs`: capa gràfica exclusiva del jugador/pilot propi. En rebre un snapshot, el model físic conserva la correcció exacta, però la càmera acumula un petit offset visual que decau independentment dels FPS, sense invertir el moviment durant correccions persistents. Teleports, canvi de vehicle/rol, mort i pausa continuen essent immediats.
- `src/native-coop-prediction.mjs`: per presentar moviments *entre* dos ticks, calcular la següent pose temporal amb les **mateixes funcions de simulació sobre una còpia descartable** i interpolar posició/angle segons el fraccional del tick. Només recalcular-la si canvien tick o controls rellevants. Aquesta anticipació **no modifica** el simulador físic, col·lisions, inputs de xarxa, autoritat ni danys. Els moviments ja no tenen un màxim visual de 30 FPS.
- `src/coop-world-runtime.js`: càmera del pilot i malla del vehicle utilitzen la mateixa pose gràfica `presented`; `prediction.vehicle()` continua exposant la pose física per als càlculs. Nou diagnòstic `window.HUNTER_COOP_NETWORK_STATS.localPrediction`: correccions, salts físics, error visual, `subtickBuilds` i `subtickFrames`.

**Regressions pures comprovades en un entorn JavaScript aïllat:**
- `tests/native-coop-local-presentation.mjs`: correccions repetides a 10 Hz durant cinc segons en pantalles de 60, 144 i 240 FPS; cap reversió visible amb velocitat constant, resposta de control immediata, transició angular ±π, teleports i pausa.
- `tests/native-coop-subtick.mjs`: a 240 FPS, jugador a peu i vehicle recorren la mateixa distància física a 30 Hz, mentre que la pose visual avança pràcticament a cada fotograma; canvi de control a mig tick i rebase de snapshot sense salt visual.
- `tests/native-coop-prediction-cache.mjs`: el temps fraccionari es conserva entre snapshots compatibles, a més dels tests de cachés anteriors.
- **Limitació:** no s'ha executat la suite Node completa ni s'ha validat la correcció a dos dispositius. La prova amb el motor original `tests/native-coop-interpolation-runtime.cjs` s'ha actualitzat per exigir que la càmera segueixi la mateixa pose que el vehicle del pilot.

**Punt de control següent:** desplegar de forma coherent client i Worker a 0.6.63, repetir la partida amb dos jugadors i compartir `localPrediction`, `clientFrame`, `remoteInterpolation` i si persisteix el tremolor. Si `subtickBuilds` s'acosta a `subtickFrames` quan s'usa joystick, cal perfilar el cost de recalcular el pas gràfic i ajustar el llindar dels inputs. La concentració del 97% dels bytes de deltes a `combat` és un problema potencial de trànsit diferent i no justifica alterar-lo per arreglar aquesta sacsejada.

## Onzena optimització — índexs espacials a la predicció del conductor (0.6.62)

**Problema observat al codi:** el pilot local executa la seva física i possibles replays a 30 Hz. Cada subpas recorria la flota completa de vehicles (p. ex. 374) amb un `Math.hypot` i recalculava dimensions, i també filtrava tots els murs de la geometria. El cost creixia amb la mida del mapa, encara que el vehicle estigués lluny de gairebé tots els objectes.

**Solució implementada sense modificar l'autoritat:**
- `src/native-coop-vehicle-candidates.mjs`: índex espacial de centres de vehicle en cel·les de 128 m, amb radi màxim conservador i filtre final de distància **idèntic** al que hi havia. Retorna els candidats amb el mateix ordre original; no es pot canviar quin vehicle bloqueja abans. Es crea només per al conductor i es reutilitza quan el següent snapshot conserva la mateixa referència de la flota.
- `src/native-coop-wall-candidates.mjs`: índex dels AABB de murs, construït només quan es reconstrueix la geometria. Els murs molt extensos es mantenen en un conjunt de reserva. Davant de consultes de radi enorme es recorre la llista completa, conservant exactament la condició i l'ordre anteriors.
- `src/native-coop-prediction.mjs`: els dos índexs alimenten `firstVehicleContact` (sense tocar aquesta funció ni les col·lisions). Reutilitza límits del mapa, radi per tipus de vehicle i una pose anterior compacta `x/y/z/hd`, en lloc de copiar tots els camps del vehicle cada 1/30 s.

**Regressions pures executades:** `tests/native-coop-vehicle-candidates.mjs`: 16 tipus, 374 vehicles i 2.125 consultes; `tests/native-coop-wall-candidates.mjs`: 1.352 murs, murs extensos i 2.725 consultes. Comparacions exactes de llistes i ordre amb el filtratge anterior. `tests/native-coop-prediction-cache.mjs` valida caché, recompilació en canviar geometria i absència d'índex en vianants/passatge.

**Benchmarks sintètics orientatius** amb 900 consultes repetides 5 vegades, 374 vehicles i 1.350 murs: filtratge de vehicles 300 ms anterior / 7 ms indexat, murs 332 ms anterior / 8 ms indexat, amb el mateix recompte de candidats. No inclou el cost de construir els índexs, altra física, GPU, xarxa o Cloudflare; no es pot inferir que els FPS o la latència millorin en aquesta proporció.

**Desplegament:** codi i versió 0.6.62 al repositori `main`, runtime amb hash nou i cachés renovades. GitHub Actions continua només manual; Cloudflare i dos navegadors encara no verificats. Cal executar les suites Node completes quan sigui possible i fer una prova en partida per mesurar l'efecte real.

## Desena optimització — soldats visuals i actualització selectiva sense Actions (0.6.61)

**Canvis implementats a `main`:**
- Interpolació gràfica dels soldats vius que canvien de posició o orientació (`src/native-coop-interpolation.mjs`), amb el mateix rellotge remot que el company i els vehicles, i sense moure les coordenades de lògica d'IA ni alterar danys/impactes. Els soldats estàtics conserven la referència del delta i no creen trajectòria; en morir, teletransportar-se o aturar-se s'alliberen els tracks. El moviment visual controla també l'animació de les cames del soldat.
- Per a arrays de `id` / `actorId` **sense canvi d'ordre**, `applyCoopDelta` aplica els patches en una sola passada sense indexar-los amb `Map` ni construir un array d'identificadors. Les files intactes conserven la mateixa referència. Si canvia l'ordre es manté la ruta original amb indexació.
- `src/native-coop-prediction.mjs`: model d'aigua canònic reutilitzat fins que canvia el món; només actualitzar la salut de les palmeres si el delta n'ha canviat la referència. Les regles de moviment i col·lisions dels 16 vehicles continuen intactes.
- `src/coop-world-runtime.js`: reutilitzar conjunts d'identificadors i vector 3D de projectils i granades en lloc de recrear-los amb cada snapshot.
- `src/native-coop-connection.mjs`: `clientFrame` amb mostres, interval mitjà/màxim i comptadors de frames >33 ms/>50 ms. Es mesura al navegador, no al Worker, i es descarten salts de pestanya de més de 250 ms.

**Validació disponible sense Actions:** `npm run test:coop:offline` i `npm run test:coop:integration` (guia a [COOP_OFFLINE_VALIDATION.md](COOP_OFFLINE_VALIDATION.md)). S'han afegit regressions de 377 enemics, sincronització visual dins el motor i caché de predicció. Les suites pures s'han comprovat amb JavaScript aïllat; les suites completes Node/GPU encara no s'han executat aquí. No atribuir FPS ni ping reals a aquestes millores.

**Actions:** `.github/workflows/coop-regression.yml` és manual-only per no gastar quota; no es faran execucions automàtiques després de `push`. Versió 0.6.61 i bundle identificat per hash. Desplegament Cloudflare i sessió de dos navegadors pendents.

## Novena optimització — reutilitzar la codificació de WebSocket (0.6.60)

- El servidor comparteix el JSON d'un delta entre els dos WebSockets **només si la baseline i la revisió coincideixen**. S'elimina una serialització redundant habitual per broadcast, sense compartir revisions ni canviar el protocol, el model de física o el checkpoint.
- L'enviament continua sent per socket i només s'actualitza la seva baseline si l'enviament ha tingut èxit. Davant d'una fallada temporal de només un jugador, la revisió de l'altre no retrocedeix.
- Nova regressió `tests/coop-broadcast-encoding.mjs` incorporada a `.github/workflows/coop-regression.yml`. Ha passat en execució aïllada amb les dependències de delta. Les primeres execucions GitHub Actions posteriors a aquest canvi han fallat sense runner assignat ni passos iniciats, de manera que no es poden presentar com a validació completa.
- Versió del client i servidor 0.6.60. Verificar que la publicació de Cloudflare (Pages + Worker) coincideix abans de provar amb dos jugadors; pendent la suite Node completa i la millora perceptiva real.

## Vuitena optimització — estabilitzar l'ordre i les transicions (0.6.59)

Primer bloc implementat sense prova física amb dos jugadors:

- **Sincronització robusta:** descartar un snapshot de la mateixa missió quan el tick és anterior a l'últim acceptat, sense fer recular els remots. Afegit `staleReceives` a `remoteInterpolation`.
- **Seients:** considerar el número de seient juntament amb l'ID del vehicle; el pas de pilot a passatger del mateix vehicle no ha de barrejar dues animacions incompatibles.
- **Cost de recepció:** reutilitzar l'ordre d'entitats que manté habitualment el protocol de deltes; només construir un índex de reserva si hi ha un desplaçament a l'array. Marcar per generació les trajectòries gràfiques encara existents per no recrear `Set` de fins a 374 vehicles a cada estat.
- **Cobertura:** regressions de paquet fora d'ordre, canvis de seient, reordenació de flota i jugadors, eliminació de vehicles i fixtures de jitter 10 Hz/60 FPS. Els tests de càlcul han passat en entorn aïllat.

Manté el servidor autoritatiu, la predicció local i la persistència transaccional. **No equival a haver comprovat visualment el multiplayer amb dos clients ni el desplegament**; executar CI i contrastar mètriques de producció abans de donar la fase per tancada.

## Setena optimització — reducció de CPU/GC sense canviar el protocol (0.6.58)

S'ha implementat una millora preventiva sense necessitat de prova física amb dos clients, pendent de confirmació visual:

- **Render de remots:** reaprofitament dels objectes de pose temporal de cadascuna de les trajectòries de company i vehicles. Cap objecte nou per entitat/fotograma a `sampleTrack`, cerca dels snapshots més recents primer. Mantenim el retard adaptatiu 150–200 ms, els teleports instantanis, les correccions acotades i el pilot local fora del buffer.
- **Comparació d'estats:** reducció del nombre d'iteracions, Sets i Maps en arrays amb IDs (`src/coop-state-delta.mjs`). El delta JSON i el resultat de reconstrucció es conserven. La consulta d'IDs especials és segura davant propietats heretades.
- **Observabilitat:** `speedLimitedFrames` i `maxRenderErrorM` al diagnòstic d'interpolació. Juntament amb `deltaProfile` i `extrapolatedFrames / activeFrames`, permeten distingir problema de sincronització, correcció visual i cost del trànsit.
- **Regressions:** s'ha afegit la suite `tests/coop-state-delta.mjs` a la CI, amb estrès de 374 vehicles, 377 enemics, reordenaments, eliminacions i identificadors especials.

Dues mesures sintètiques orientatives al mateix motor JavaScript: 455→390 ms en 594 passos de render amb 374 vehicles; 454→391 ms per 140 comparacions de grans estats. **No equivalen a FPS reals ni validació de Cloudflare.** Les proves pures passen; verificació completa de la CI, despliegament i dos navegadors reals pendents. El Worker continua sent autoritatiu, amb la mateixa cadència de ticks i persistència.

## Sisena optimització — buffer temporal adaptatiu de remots (31-10-2026)

**Prova real 3 (abans del canvi):** RTT 46,37 ms, jitter 12,31 ms, snapshots cada 99,84 ms de mitjana, màxim 190 ms; `stateFrames=1222`, `stateBytes=10658437` (~8,72 KB/estat), `maxTickGap=777`, `longGapReceives=2`, `gapResets=2`, `teleports=1`, `clampedFrames=92`, `forecastFrames=9273`, `samples=12738`. `activePlayers=0` i `activeVehicles=0` són comptadors instantanis i no permeten deduir quantes entitats s'han animat durant tota la partida. Els comptadors d'interpolació són acumulats, no FPS; la xifra antiga de 72,8% de `forecastFrames/samples` **no és una taxa real d'extrapolació**, perquè el comptador antic augmentava sempre que una trajectòria estava activa.

**Ordre de treball:**

1. Introduir una línia temporal d'instants autoritatius per tick del servidor per als actors i vehicles remots (petit buffer de snapshots, retard visual inicial de 150–200 ms, adaptació acotada segons irregularitat de recepció). Només interpolar entre poses compatibles. Preservar la pose visual ja representada en una recepció.
2. Reservar extrapolació per quan el cursor realment superi el darrer tick disponible, acotant-la a 120 ms; quan no hi ha dades, evitar salts en arribar la correcció. No aplicar aquest retard ni extrapolació al personatge o conductor local, que conserven la predicció/reconciliació; no afectar combat, dany, col·lisions, inventari ni portes autoritatius.
3. Detectar discontinuïtats de missió, pauses, salts de ticks de més de 2 segons, teleport físic, destrucció, mort/reanimació i canvis de seient: reinicialitzar la trajectòria d'aquella entitat o buffer sense animar una posició incompatible.
4. Millorar diagnòstic: `bufferDelayMs`, `activeFrames`, `interpolatedFrames`, `extrapolatedFrames`, `bufferUnderruns`, `clampedFrames` i `maxTickGap`; comptar previsions només si realment hi ha extrapolació. Diferenciar interval d'arribada, salt de ticks i reset de missió.
5. Fer regressions pures (10–20 Hz, jitter, pausa de 190/346/774 ms, angles ±π, 374 vehicles, canvis de seient, pilot local), integració amb runtime natiu i dues sessions reals. Mesurar separat suavitat visual, latència percebuda i CPU; revisar si es poden eliminar camps duplicats dels ~8,72 KB/estat sense perdre consistència de deltes ni persistència.

**Estat implementat a 0.6.56:** primer buffer per ticks i visualització amb rellotge remot compartit al client, extrapolació comptabilitzada correctament, tests de regressió afegits i versió/cache actualitzats. Cal executar les proves Node i amb dos usuaris, perfilar el resultat real i revisar el volum d'estats abans de considerar aquesta fase tancada. El servidor i la predicció local no s'han modificat en aquesta fase.

**Continuació 0.6.57 sense prova de dos clients:** perfil mostrejat de deltes (`fullStateFrames`, `deltaFrames` i `deltaProfile.bySection`) per prioritzar possibles reduccions de payload; simulador determinista de 10 Hz/60 FPS amb jitter normal i accentuat; regressions automàtiques de servidor/client i integració amb el motor original mitjançant GitHub Actions. El workflow de la versió actual ha acabat amb èxit. No s'han alterat la persistència, l'autoritat del Worker ni la freqüència de ticks. **La prova visual i el desplegament a Cloudflare continuen pendents.**

**Criteris de prova, no garanties:** RTT/jitter mantenir o millorar; ritme d'estats estable (10 Hz inicialment; 20 Hz només si càrrega/transport ho permeten), cap teleport fals; extrapolacions genuïnes <10% dels fotogrames amb objectes actius en condicions normals; intervals de recepció normalment <150 ms. La dada `serverTickMs=0` no equival a cost nul: el temps de CPU del Durable Object requereix profiling separat. No pujar la freqüència del servidor fins a demostrar que el buffer funciona.


Estat: replantejament motivat per la petició de l'usuari del 29-10-2026. Primera integració al runtime original implementada a la 0.6.50; paritat completa pendent. Vegeu [estat i límits actuals](COOP_NATIVE_RUNTIME.md). Aquest document substitueix la direcció de desenvolupament del client cooperatiu separat. No descriu una funcionalitat ja acabada.

## Objectiu

Hunter: Arxipèlag és un únic joc que admet una sessió individual o una sessió de dos jugadors. En cooperatiu, cada dispositiu mostra el personatge propi des de darrere, amb la càmera, pantalla completa, controls, HUD, models, animacions, món i missió del joc individual. La diferència és la presència del company i la sincronització de l'estat compartit.

## Diagnòstic del prototip

- `coop.html` i `src/coop-play.css` defineixen una segona pàgina de joc amb una vista dins del document, botons externs i formularis d'inventari.
- `src/coop-play-view.mjs` crea una altra escena, un altre renderer i una càmera ortogràfica. El joc original utilitza `src/rendering.js` i una càmera en perspectiva de 58 graus, amb seguiment, interiors, soterrani, vehicles i mira propis a `src/game-core.js`.
- `src/coop-play.mjs` replica controls, inventari, context de portes/vehicles i HUD. Compartir fàbriques de models no unifica aquests comportaments.
- `server/coop-open-world.mjs` genera una distribució alternativa de complexos i entitats. La mateixa llavor encara no significa el mateix món complet que al mode individual.
- El relleu de terminals i el món d'exploració sense general són missions del prototip, no la campanya original en cooperatiu.

Això exigeix substituir el client separat. Afegir-li funcionalitats visuals no resol aquesta divergència.

## Arquitectura escollida

### Una entrada i una presentació

`index.html`, `src/menu-boot.mjs`, `src/bootstrap.mjs` i el runtime original continuen essent l'entrada del joc. La sala privada és un pas del menú existent. Iniciar una sessió cooperativa activa aquest mateix joc amb un adaptador de xarxa.

No es creen un segon canvas, renderer, escena, HUD, joystick o sistema de càmera. Els botons i panells originals es conserven a les seves posicions, superposats al canvas. Les zones segures i la mida del viewport utilitzen el comportament original. La càmera segueix sempre l'actor local identificat pel compte; mai el primer jugador d'un array ni el centre del mapa. Només s'afegeix la informació necessària del company i de la connexió.

### Separar les responsabilitats del runtime existent

El primer treball de codi és separar, dins del joc original, tres responsabilitats actualment barrejades a `update(dt,t)`:

1. Llegir intencions del teclat, joystick i botons originals, incloses les accions contextuals.
2. Avançar l'estat del joc mitjançant les regles originals.
3. Presentar aquest estat amb els models, animacions, càmera, àudio i HUD originals.

El mode individual aplica les intencions localment. El cooperatiu les envia a l'autoritat compartida i presenta l'estat confirmat. La predicció del jugador local i la interpolació del company s'apliquen sobre les mateixes regles de moviment; no creen una segona simulació independent d'IA, dany o recollides al navegador.

`P`, `hp`, `inv`, `cv` i altres globals locals han de passar a un context d'actor explícit en els límits de simulació i comandes. L'actor local continua controlant la càmera i la interfície. Les propietats del company no poden substituir l'inventari ni els controls propis.

### Un sol món canònic

La generació completa original s'ha de separar de la construcció de meshes, conservant l'ordre aleatori i assignant identificadors estables a complexos, edificis, parets, portes, vehicles, enemics, objectes i vegetació. La simulació del servidor i la presentació original han de consumir aquest mateix estat canònic.

No s'iniciaran dos generadors diferents amb la mateixa llavor esperant que coincideixin. Les proves compararan coordenades, col·lisions, entitats, inventari inicial i estat aleatori del món original amb el món cooperatiu. També es verificarà que aquesta separació preservi els mons individuals existents.

### Autoritat i transport

Es mantenen els comptes, sales privades, WebSocket, identificació dels dos actors, control de seqüències, comandes idempotents, persistència i reconnexió del Durable Object. El servidor continua validant les intencions i resolent recollides, dany, vehicles, portes, enemics i objectius. La càmera i els efectes cosmètics són locals.

Les regles pures ja compartides són una base útil. Les regles que encara viuen dins del runtime original s'extreuen d'aquell codi amb proves de paritat. No es completa la campanya escrivint un segon sistema d'IA o missions dins del prototip.

La desconnexió conserva la pausa de sala i l'estat persistent existents. La migració del món tindrà una versió pròpia: una partida del prototip no es reinterpretarà silenciosament com una partida de la campanya.

## Què es conserva i què se substitueix

| Peça | Decisió |
| --- | --- |
| Joc individual, entrada, renderitzat, controls, HUD i càmera | Base de la implementació; han de continuar funcionant durant la migració |
| Comptes, sales, sockets, validació i persistència | Es conserven i s'adapten al nou estat canònic |
| Mòduls purs compartits de moviment, armes, col·lisions i destrucció | Es conserven, comprovant la paritat amb el joc original |
| Segona escena, càmera ortogràfica i controls de `coop-play` | Se substitueixen per la presentació original |
| Generador alternatiu de `coop-open-world` | Se substitueix pel generador canònic original |
| Relleu i camp de proves | Poden servir com a fixtures tècniques; no defineixen el multijugador del joc |
| Proves del prototip | Es mantenen com a regressions de transport/regles, però no acrediten paritat del joc |

## Ordre d'implementació i comprovació

1. **Separació del runtime original.** Entrada, simulació i presentació diferenciades; el mode individual manté els controls i el resultat. Separar també els bloquejos d'autodesat/historial de la sessió remota.
2. **Món únic.** Estat canònic complet, identificadors i generació original reproduïble; servidor i client coincideixen en llavors normals i de càrrega alta, a les dues escales.
3. **Primera secció jugable nativa.** Dos comptes entren des del menú original al mateix món; cadascú es mou amb els controls originals, veu el company i té la càmera original darrere del seu personatge. Tota la pantalla és de joc. Aquesta és la primera prova amb dos dispositius, abans d'afegir més sistemes.
4. **Interaccions originals.** Inventari individual, recollida compartida, portes, armes, vehicles, seients, destrucció i reanimació connectats als botons originals i a l'autoritat del servidor.
5. **Campanya original.** Enemics que tenen en compte els dos actors, torres, general al búnquer, presoners, mecànic i desenllaç compartit. Verificació de mort, derrota i reconnexió.
6. **Substitució de l'entrada antiga.** Quan la secció nativa és jugable, el menú i els enllaços cooperatius obren el runtime original; `coop.html` queda com a compatibilitat d'enllaços, sense mantenir un segon client de joc.

## Criteris d'acceptació

- A Android, el joc ocupa el mateix viewport que l'individual, sense document desplaçable ni comandaments fora del canvas.
- Joystick, accions contextuals, armes, inventari, minimapa i càmera procedeixen del joc original.
- Dos jugadors en posicions i rumbs diferents veuen cadascun el seu personatge des de darrere, a peu, dins d'edificis i en vehicles.
- La mateixa llavor i configuració generen el mateix món complet als dos modes, excepte les dades específiques de dos actors.
- La missió continua essent Hunter: Arxipèlag, amb el general i els sistemes originals.
- Una sola recollida, impacte, explosió o acció persisteix una sola vegada, també en reconnectar.
- La validació inclou el mode individual i dues sessions reals amb GPU. Les proves de Node del prototip, per si soles, no completen aquests criteris.

## Límit d'aquest canvi

La 0.6.50 substitueix l'entrada del client separat per la sessió dins del runtime original. Es comparteixen controls, HUD i càmera, i el servidor consumeix el món original verificat pels dos participants. La IA completa, els sistemes opcionals i la prova amb dos dispositius encara resten pendents; l'estat precís es descriu a COOP_NATIVE_RUNTIME.md.

## Pla de rendiment cooperatiu (29-10-2026)

**Objectiu:** fer viable la partida nativa de dos jugadors aprofitant el motor individual, sense inventar un segon renderitzador ni degradar les simulacions físiques. Distingir sempre **FPS i temps de fotograma al client** de **latència de transport i de la simulació autoritativa**. Una millora gràfica no garanteix eliminar el retard dels controls.

### Prioritats, per ordre

1. **LOD visual únic dels vehicles (primer canvi).** Reutilitzar la mateixa política de `place()` del mode individual al cooperatiu: pilot local i vehicles propers cada fotograma; distància mitjana cada 0,1 s; llunyans cada 0,45 s. No recalcular rodes/erugues/rotors i alçades de centenars de vehicles a cada fotograma remot. Separar l'aplicació de l'estat del servidor de la presentació. Respectar la destrucció: els vehicles destruïts mai no reapareixen pel LOD. El servidor continua autoritzant moviment, col·lisions i dany.
2. **Aplicació incremental dels estats rebuts.** Evitar copiar i reprocessar totes les entitats a cada subpas local si no ha arribat un estat nou. Reutilitzar referències estables, maps per ID, models i vectors del company, i eliminar cerques/assignacions per fotograma. Conservar animacions, predicció i càmera. **Implementació de client feta el 29-10-2026; validació GPU i dos dispositius pendent.**
3. **Cost visual compartit.** Vehicles terrestres aparcats: reutilitzar la pose fins que canviïn posició, estat o moviment; erugues immòbils sense transformar esglaons; palmeres que recuperen el LOD normal en sortir de la mira; vectors de propietaris d'ombres reutilitzats. **Primera passada aplicada al motor dels dos modes, amb prova aïllada; pendent perfilar GPU/FPS i continuar amb ombres i efectes segons les mesures.**
4. **Suavització temporal cooperativa.** Buffer temporal de snapshots per a company i vehicles remots, gir angular pel camí curt i cap extrapolació més enllà de l'autoritat. Les discontinuïtats (teletransport, mort/reanimació, pausa, reconnectar, seients) són immediates; el pilot local conserva la predicció existent. **Implementació 30-10-2026, proves aïllades superades; prova GPU amb dos dispositius pendent.**
5. **Transport i servidor.** Deltes sense pèrdua i checkpoints separats ja existien. S'eviten les serialitzacions d'attachments per cada paquet ràpid i s'incorporen sondes negociades de RTT, regularitat/volum aproximat de snapshots i durada de simulació, persistència i difusió. **Primera passada implementada i verificada aïlladament (30-10-2026); pendent comparativa real, perfil de checkpoint i dos dispositius.**

### Comprovació obligatòria

- Mesurar FPS, CPU de simulació, render i p95/p99 de fotogrames, draw calls, memòria i **nombre de crides a `place()` per distància** en escenaris normal i de càrrega alta.
- Mesurar per separat RTT, snapshots per segon, bytes per segon, temps del tick del servidor, temps de desament i retard visible dels actors.
- Provar el mode individual, els dos clients natius, un vehicle local, un altre proper, un llunyà, un destruït i l'entrada/sortida de vehicles; provar vehicles terrestres, marítims i aeris i la mira.
- Diferenciar **prova automatitzada**, **prova visual amb GPU/dos dispositius** i **desplegament a Cloudflare**. Els benchmarks del mode individual no demostren per si sols menys latència de xarxa.

El primer punt es desenvolupa al runtime original i el seu resultat concret es documenta també a [COOP_NATIVE_RUNTIME.md](COOP_NATIVE_RUNTIME.md).

## Estat d'aquest pla a la 0.6.53

La continuació de rendiment integra el LOD compartit dels vehicles i la visibilitat per distància; afegeix predicció/reconciliació de locomoció i dels 16 vehicles, entrada de dispar mantingut al servidor, deltes d'estat, menys snapshots descartats, calendari sense deriva de feina i metadades persistides una sola vegada. La fixture de 30 difusions redueix el volum d'estat un 90,6%; les proves de reconstrucció, física compartida, munició i reconnexió passen. Vegeu [mesures i límits](COOP_NATIVE_RUNTIME.md).

Continuen pendents l'aplicació encara més selectiva de les entitats canviades al client, el buffer temporal dels actors remots, els pressupostos d'ombres/efectes i les mesures GPU/FPS/p95/p99, RTT i retard percebut en dos dispositius físics i producció. Les mesures locals de bytes i les proves de paritat no substitueixen aquesta acceptació.


### Segona optimització — projecció incremental de snapshots (29-10-2026)

La presentació nativa diferencia el **fotograma** de l'**estat autoritatiu rebut**: els controls, predicció, càmera, LOD i animacions continuen cada fotograma, mentre que vida, inventari, vehicles i enemics només es projecten en arribar un estat nou. El transport de deltes existent reutilitza la identitat dels registres que no han canviat: aquests vehicles/enemics tampoc no es tornen a copiar en el següent snapshot. El company conserva model, vector de destinació i seient assignat; projectils, explosions, portes, finestres, terreny destruït, palmeres i botí es reconcilien només quan canvia la seva col·lecció.

El LOD original ara també respecta la mort dels enemics, per impedir que reapareguin en deixar d'ocultar-los des del bucle del cooperatiu. No calia modificar el camí de simulació del jugador individual; només aquest invariant compartit de visibilitat. Prova de regressió: `tests/native-coop-snapshot-projection.cjs`, inclosa a `npm run test:play`. Una prova aïllada de la funció real (`updateNativeCoop`) ha confirmat 20 fotogrames sense reescriptures d'entitats i una única reescriptura quan canvia un vehicle, amb animacions contínues. **La suite Node completa, la prova GPU real, la millora quantificada d'FPS i el desplegament continuen pendents de verificació.**

La tercera prioritat serà perfilar els costos visuals compartits (ombres, erugues/rodes, vegetació) sense sacrificar qualitat ni física. L'altre punt separat és la suavització temporal de remots a la xarxa.

### Tercera optimització — càrrega gràfica compartida (30-10-2026)

A `src/game-core.js`, `place()` conserva la darrera pose dels vehicles terrestres aparcats (excepte el pilot local) i només la recomputa si canvien posició, orientació, estat físic, contacte o pose externa. Els vehicles en moviment, aeris, marítims i amb incidències d'aigua/impacte conserven el camí original. Les erugues no actualitzen els seus esglaons quan la fase és immòbil; el moviment les reactiva. Aquesta optimització afecta el mode individual i el cooperatiu perquè tots dos fan servir la mateixa funció.

A `src/vegetation.js`, el pas d'estar dins a fora de la mira invalida el LOD encara que el jugador no es desplaci; així, la vegetació no queda amb detall màxim innecessari. La selecció de projectors d'ombres del motor reutilitza vectors per propietari, sense canviar la distància o la qualitat de l'ombra.

Regressió `tests/shared-visual-idle.cjs`: executa les funcions reals de producció, comprova 120 fotogrames d'inactivitat, invalidació per moviment/correcció, animació d'erugues, transició de la mira i reutilització de vectors d'ombres; registrada a `test:optimization`. Comprovació aïllada superada, però **no equival** a GPU/Android o a dos dispositius i no hi ha encara millora d'FPS quantificada. No s'han alterat física, dades del servidor ni la qualitat geomètrica. 

### Quarta optimització — interpolació temporal dels remots (30-10-2026)

La sessió nativa utilitza ara `src/native-coop-interpolation.mjs` (mòdul sense Three.js ni dependències de render) per presentar **el company i els vehicles remots** entre els dos darrers snapshots autoritatius. El cursor avança a 30 ticks/s, amb com a màxim un interval de snapshot de retard; en cas de pèrdua de dades arriba a la darrera posició confirmada i **no extrapola** sense nova autoritat. Un salt de més de 12 ticks, una sessió/missió nova, una pausa o un canvi brusc de posició reestableix el buffer. La interpolació dels girs tria el camí curt, evitant girs complets a 179°/−179°.

El model del company interpola posició i rumb sense un segon filtre exponencial, que afegia retard visual; conserva les animacions i el pilotatge del model original. Els vehicles remots propers interpolen coordenades, rumb i altitud, i la resta conserva el LOD ja existent. Els vehicles del pilot local reserven la seva posició per a la predicció amb reconciliació; els **passatgers locals** sí que segueixen el vehicle que condueix el company. Els canvis de seient, mort, reanimació o teletransport no creen moviment fals a través de la geometria. Les col·lisions, trets, objectes i dany romanen exclusivament autoritatius.

`tests/native-coop-interpolation.mjs` verifica 374 vehicles, salt angular, intervals, pauses, teleports, seients, morts i reinicis. `tests/native-coop-interpolation-runtime.cjs` cobreix l'escena original, càmera pròpia, company, passatger i predicció del pilot; ambdues s'han inscrit a `test:play`. La prova unitària i una prova aïllada sobre la funció real de presentació han passat; **falten** l'execució Node completa, GPU amb dos clients, el desplegament a Cloudflare i mesurar el retard percebut. La suavització no implica per si mateixa menys RTT.

### Cinquena optimització — control de la cua i observabilitat (30-10-2026)

A `server/coop-hub.mjs`, els límits de 45 entrades/segon i 12 ordres de combat/segon continuen vigents, però els comptadors s'han mogut dels attachments persistits de WebSocket a `WeakMap` efímers per connexió. Amb dos clients a 20 controls/s, això evita aproximadament **40 crides a `serializeAttachment()` per segon**, tret de les validacions periòdiques d'identitat i altres ordres de sessió. Una hibernació reinicia els comptadors de la finestra, sense canviar la validació d'identitat ni el límit aplicable a cada ràfega activa. No s'ha alterat l'interval de simulació de 30 Hz, els tres passos per alarma ni la persistència transaccional abans de publicar impactes.

Per poder diagnosticar el coll d'ampolla, el servidor mesura el temps de la simulació, del checkpoint i de la difusió (`tickMs`, `saveMs`, `broadcastMs`) i respon a una sonda `latency-ping` de com a màxim una cada 2 segons/client. El client publica les mesures al joc mitjançant `window.HUNTER_COOP_NETWORK_STATS`: RTT suavitzat i variació, intervals entre snapshots, nombre de missatges, mida de missatges aproximada en caràcters de WebSocket (no confondre amb bytes UTF-8 exactes) i últim cost del servidor. Aquesta instrumentació no decideix física, dany o posicions.

La funció **es negocia**: el servidor nou anuncia `telemetry:1` en el missatge inicial de missió i, sense aquest camp, el client nou no envia sondes. Això protegeix actualitzacions de Cloudflare no simultànies i permet reprendre sessions amb un Worker antic sense tancar la connexió per protocol desconegut. Els missatges estan validats i limitats a 2 sondes/segon per connexió. S'ha afegit `tests/coop-transport-telemetry.mjs` a `npm run test:play`. La prova aïllada cobreix 45 controls admesos sense escriptures, 46è rebutjat, RTT, mètriques del servidor i compatibilitat sense anunci.

**Encara pendent:** mesures reals de RTT, p95/p99 de frame, volum de trànsit, temps de `storage.transaction()` a Cloudflare, dos navegadors amb latència real i comprovació del desplegament. Les sondes no són una garantia de millora quantificada ni s'han de confondre amb la latència d'aplicació de cada ordre.

### Ajust correctiu de la interpolació després d'una prova amb dos jugadors (30-10-2026, v0.6.54)

S'ha observat càmera local fluida però company i vehicles remots a batzegades. La mostra té RTT ~69 ms, jitter ~29 ms, estat cada ~104 ms i interval màxim de 346 ms. L'interpolador anterior deixava la presentació quieta després dels ~100 ms del darrer tram, i tornava a corregir en rebre el següent snapshot.

La correcció de `src/native-coop-interpolation.mjs` preserva la darrera pose dibuixada, reacciona als estats nous sense saltar al punt d'inici del tram anterior, i continua moviment breument en una previsió **exclusivament visual** limitada a 120 ms. Les correccions tenen límit de moviment per fotograma i es mantenen els reinicis obligatoris per teletransport, mort, reanimació, canvi de seient, pausa o missió. No es toca la predicció del pilot local ni la física del servidor. Es retiren trajectòries immòbils i s'eviten reconstruccions de llistes cada fotograma. Les noves mètriques `remoteInterpolation` estan exposades a la consola juntament amb les de transport.

Prova pura superada amb pauses de 346 ms, moviments/girs, esdeveniments i 374 vehicles; regressió del motor original actualitzada. **Pendent:** desplegament verificat, suite Node completa i nova prova comparativa amb dos navegadors.

### Ajust de la recuperació de xarxa segons la segona telemetria (v0.6.55)

La segona prova real ha mesurat RTT ~67 ms, jitter ~18 ms, snapshots cada ~108 ms però un tall màxim de **774 ms**. S'han comptat 958 fotogrames amb previsió visual limitada i 3 reinicis acumulats de l'interpolador; no són necessàriament tres desconnexions.

S'ha corregit una regla que reiniciava les trajectòries si la separació temporal de snapshots superava **12 ticks (400 ms)**. El nou buffer conserva la pose dibuixada per separacions de fins a 60 ticks i determina si un vehicle ha fet un salt real segons temps i velocitat (màxim 90 m de tolerància en les recuperacions). Continuen les excepcions per grans teleports, morts, canvis de seient, pausa i altres discontinuïtats, i la previsió sense autoritat resta limitada a 120 ms. La prova de 23 ticks amb helicòpter ràpid supera ara la verificació aïllada.

S'han afegit els comptadors `remoteInterpolation.maxTickGap`, `longGapReceives` i `gapResets` per comparar talls en temps real amb ticks del servidor. Els temps de CPU a zero no són concloents perquè Cloudflare congela `Date.now()/performance.now()` durant càlculs sense I/O (documentació oficial de performance Workers); per mesurar CPU cal perfilat de producció.

El canvi s'ha incorporat al paquet 0.6.55, mantenint canvis recents del mode individual. Pendent revisió a dos navegadors reals després de desplegar, suite Node completa i mesura de la regularitat del Durable Object.
