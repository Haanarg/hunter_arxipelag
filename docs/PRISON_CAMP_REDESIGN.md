# Camp de presoners — redisseny v0.5.84

> **Actualització v0.5.85:** el rescat per la tecla E i l'obertura automàtica de la porta descrits en aquest document corresponen al disseny anterior. Ara cal eliminar els sis guàrdies i les quatre torres i obrir una bretxa física a qualsevol tram de la tanca interior. Vegeu [PRISON_CAMP_RESCUE.md](PRISON_CAMP_RESCUE.md).

Petició de Gaspar: concretar el camp com un complex militar amb una única entrada exterior, barracó llarg, caseta de guàrdia, quatre torres, presoners dins un segon recinte i guàrdies amb funcions diferenciades.

## Distribució

| Element | Construcció |
| --- | --- |
| Perímetre exterior | Filferrada a ±62 m, amb una única obertura sud de 24 m en generar el camp. La cisalla, les explosions i els vehicles conserven la destrucció existent. |
| Barracó | Petjada de 68 × 18 m al nord. Reutilitza la fusta i la teulada a dues aigües de les cases de pescadors. S’allarga la profunditat del model abans de girar-lo perquè la teulada mantingui l’amplada habitual. |
| Caseta de guàrdia | 14 × 12 m a ponent, amb porta i una farmaciola. |
| Torres | Quatre enemics de tipus torre, amb armes i potes físiques, a les quatre cantonades. |
| Recinte interior | Filferrada de 40 × 34 m i porta sud de 10 m inicialment tancada, amb col·lisió real. |
| Presoners | Quatre camperols i un únic mecànic dins el recinte interior. Dos camperols asseguts a terra, dos drets i el mecànic dret. |
| Soldats | Quatre patrullers que recorren el perímetre i dos sentinelles, un a cada costat de la porta interior. |
| Reparació | Badia exterior de 24 × 24 m, amb accés per al camió del joc. |

Els sentinelles mantenen el lloc durant la vigilància ordinària. Conserven la IA de combat i poden reaccionar quan detecten el jugador. Les patrulles tenen trams de com a màxim 16 m: així el temporitzador de vuit segons de la IA no salta cantonades ni crea dreceres per edificis o filferrada.

## Rescat i escala dels civils

L’acció **E / botó d’acció** davant la porta interior allibera el grup si no hi ha una amenaça immediata. Primer s’obre físicament la porta, després els civils asseguts es posen drets i comencen a caminar. Els camperols evacuen per l’entrada exterior; el mecànic segueix la seva ruta per la porta i al voltant de la tanca fins a la badia de reparació.

Els cinc civils drets mesuren **2,84648 unitats de joc**, la mateixa alçada que el model real del protagonista. La postura asseguda baixa el maluc i estén les cames sobre el terra; conserva l’escala del cos. L’alçada i el radi de col·lisió/impacte reflecteixen la postura. Els models reposen sobre el terreny.

El mecànic continua essent l’única font de reparació i les seves condicions de servei es conserven. El rescat continua opcional. La garantia de camp per llavor introduïda a v0.5.83 continua activa; no es canvia la llavor per trobar-hi lloc. Vegeu [PRISON_CAMP_GUARANTEE.md](PRISON_CAMP_GUARANTEE.md).

## Fitxers i comprovacions

- `src/prison-camp-layout.mjs`: distribució, dues tanques, porta, guàrdies, torres i rutes.
- `src/compound-generation.js`: construcció física de la porta i assignació de sentinelles.
- `src/world-generation.js`: protecció del nou recorregut del mecànic.
- `src/prisoners.js`: escala, postures, zones d’impacte i obertura durant el rescat.
- `tests/camp-redesign-independent.cjs`: món físic complet, 484 travessies del perímetre exterior, 136 del recinte interior, torres funcionals, geometria dels civils, 180 segons de patrulla/sentinelles i rescat real amb evacuació de 60 segons.
- `tests/phase11-prisoners.cjs`: alçada comparada amb el jugador real, postures a terra, ordre d’obertura, recorregut i regressions de rescat/reparació.
- Suites de garantia del camp, accés del camió i càrrega progressiva: presència, fallbacks, rutes i paritat entre generació síncrona i progressiva. Els fingerprints històrics de v0.5.79 es conserven intactes.

`npm run test:camp` inclou la revisió independent del nou camp. `npm run test:camp:stress` recorre 1.024 llavors en dues escales. `HUNTER_TEST_BUNDLE=1` prova el paquet real de producció amb les suites que utilitzen el harness.

El harness usa Three.js i geometria real amb renderitzador simulat. La comprovació visual amb WebGL, els controls tàctils i el rendiment en Android físic continuen pendents. Els resultats executats històrics i l'estat del desplegament d'aquella versió es poden consultar a l'historial Git de `PROGRESS.MD`; les comprovacions vigents són a [to-do.MD](../to-do.MD).
