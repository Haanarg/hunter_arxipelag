# Cooperatiu · fase 4: geometria física compartida (v0.6.11)

## Implementat

`src/world-physics.mjs` separa el relleu de les illes, el límit marítim i la profunditat, la fusió de plataformes anivellades i la resposta de col·lisió del jugador amb murs, arbres, roques i troncs corbats de palmera. No depèn de Three.js, DOM, malles o del jugador global. El joc individual ja crida aquestes regles, mantenint els índexs i l’ordre de candidats que utilitzava.

`src/world-adapter.mjs` normalitza una còpia física del món i construeix índexs espacials ordenats. Inclou llavor, escala, illes, anivellaments, murs oberts/tancats i vegetació sòlida; no inclou credencials, inventari ni objectes gràfics. Hi ha límits de format, quantitat, coordenades i cost de construcció dels índexs. Retorna una còpia independent de les dades quan se sol·licita un snapshot. La validació no converteix les dades d’un client en dades de confiança: no s’ha afegit cap endpoint que les accepti com a món autoritatiu.

`captureCoopWorldGeometry()` captura l’estat físic actual, quan ja s’ha generat una operació. La captura és sota demanda, no durant cada frame, i no s’envia per la xarxa. Canvis posteriors de portes, destrucció o vegetació exigeixen una captura/actualització nova: aquesta còpia és estàtica.

El nucli de dos actors conserva també l’altura `y`. Amb aquest adaptador pot consultar el terreny físic i resoldre cossos contra col·lisions del món generat, sense crear malles. `resolveBody` conserva l’altura rebuda; `resolve` afegeix suport vertical de terreny físic. Aquesta darrera opció és un prototip limitat per a exteriors, no una substitució completa de `groundAt`.

## Límits que continuen impedint iniciar una missió

- Escales, soterranis, plantes superiors, teulades, molls, rampes especials, aigua i plataformes mòbils encara no estan representats en l’adaptador complet. No es modela la gravetat ni es garanteix la continuïtat vertical a aquests llocs. El joc individual conserva el seu `groundAt` i les seves regles existents.
- Vehicles, IA, combat i inventari continuen als sistemes locals. Els índexs nous només corresponen a la còpia estàtica, no a una simulació dinàmica persistent.
- El servidor de producció encara no genera ni carrega un món canònic per a una sessió de missió. No s’ha connectat aquest prototip al WebSocket com si fos una missió jugable. El canal de sala de la fase 3 continua rebutjant missatges de joc i el manifest continua amb `playable:false`.
- Cal resoldre la generació/càrrega de confiança al servidor i el cicle de vida del món abans d’acceptar ordres de moviment remotes. No s’ha adoptat la geometria enviada per un client com a autoritat.

## Validació

`npm run test:world` genera l’operació real amb llavor 67 i escala 1. Compara 961 punts del terreny, plataformes i mostres de murs/vegetació/palmeres amb una còpia congelada de les funcions del main anterior (`tests/fixtures/world-physics-v062.cjs`, commit de referència al fitxer). Aquesta referència no crida el mòdul extret. Verifica ronda JSON, independència dels snapshots, format i límit del treball dels índexs.

Dos actors es mouen sobre la geometria d’aquesta operació amb el nucli de simulació. La mateixa geometria i els actors s’executen també en un Worker de prova empaquetat, dins de workerd natiu, sense renderitzador ni DOM. No és una prova d’una missió completa ni de la generació al servidor.

Han passat també les proves de sala, preparació, WebSockets/Durable Objects, comptes, recuperació i desaments. La restauració del món s’ha comprovat amb el paquet real del navegador. El rellotge semi-fix i el menú de pausa passen. Les dues fallades històriques de proves generals de la fase 2 no s’han declarat resoltes. La matriu completa de llavors/escala 2 i les proves físiques Android continuen pendents. Compatibilitat local de workerd: 2026-08-06; producció: 2026-10-19.

## Desplegament i pendents

No calen SQL, secrets, recursos o plugins nous; es manté el binding Durable Object de la fase 3 i el desplegament existent.

Queda després d’aquesta fase:

1. Completar les superfícies transitables, aigua, gravetat i col·lisions/estat dinàmics de vehicles i IA.
2. Generació o càrrega canònica del món al servidor i sessió de missió persistent, amb permisos, compatibilitat i confirmació dels dos clients.
3. Connectar les intencions de joc al canal amb un tick autoritatiu, snapshots, predicció/interpolació, combat i objectius compartits.
4. Reconnexió de missió, política de pausa/amfitrió i desaments/estadístiques cooperatius.
5. Validació de més llavors/mapa gran, dos navegadors/Android i càrrega; quotes, retenció i les dues fallades històriques. Els altres pendents generals segueixen a PROGRESS.MD.
