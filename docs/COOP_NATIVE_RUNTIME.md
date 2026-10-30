# Integració del cooperatiu al runtime original · 0.6.50

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

