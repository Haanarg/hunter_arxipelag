# Reconstrucció del multijugador sobre el joc original

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
