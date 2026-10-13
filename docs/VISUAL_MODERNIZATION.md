# Hunter: Arxipèlag — estat del projecte i pendents

Revisió documental: **13 d’octubre de 2026**. Base contrastada: **0.4.24**, commit `78572e7604d8b104c902165e7e64a8ed571de268` de `main`. Revisió d’estabilització i dissenys de fase 4: **0.4.25**.

Aquest document substitueix la cronologia acumulada de propostes i revisions intermèdies. Descriu el que existeix al codi i conserva els objectius encara oberts. L’historial detallat es pot recuperar amb Git. **Implementat no vol dir validat en totes les llavors ni en tots els dispositius.**

## Resum de la revisió

| Àmbit | Estat actual |
|---|---|
| Modernització Three.js i separació de sistemes | Motor local modern i sistemes extrets; encara hi ha estat global compartit |
| Complexos, fases 1, 2 i 3 | Els vuit tipus aprovats estan integrats al generador |
| Ampliació de complexos | Quatre tipus proposats encara sense implementar; falta varietat de distribucions |
| Models aprovats, armes i vehicles | Integrats, inclosos rifle, paracaigudes i ferry |
| Optimitzacions de terreny, palmeres i enemics | Implementades; no s’ha de donar el rendiment per definitivament resolt |
| Òptica del franctirador | Detall complet en el corredor de la mira i retorn al LOD normal en sortir |
| Proves | Proves específiques i WebGL disponibles; la prova general té una expectativa de terreny desfasada |
| Android | Funcionament confirmat per l’usuari; falta un benchmark prolongat i reproduïble de la versió actual |

## Complexos: propostes antigues i resultat actual

Les fonts compartides pel joc i el visor són `src/compound-layouts.mjs`, `src/compound-phase2-layouts.mjs` i `src/compound-phase3-layouts.mjs`. La integració és a `src/compound-generation.js` i `src/world-generation.js`.

| Proposta | Implementació actual | Què falta |
|---|---|---|
| Hangar i taller, fase 1 | Hangar arquejat, taller, tanc a dins, cotxe, tres soldats, munició i farmaciola. Boca de 30 m i ruta de sortida. Eliminat el mur rectangular posterior; es conserva el tancament semicircular. | Altres distribucions i alternatives de vehicles |
| Avançada, fase 1 | Caserna, guàrdia, torre, moto, quatre soldats, munició i granades. Filferrada amb dues obertures. | Altres distribucions |
| Port militar, fase 1 | Magatzem, oficina, torre, dos molls i tres places navals. Cinc soldats, munició, granades i mapa. Llanxa llançacoets única; en ports addicionals se substitueix per una llanxa. | Altres distribucions; més cobertura de costes difícils |
| Heliport, fase 2 | Plataforma de 40 m, reserva de rotors, control, magatzem, quatre soldats i paracaigudes garantit. El segon heliport rep l’helicòpter de combat. | Variant fortificada amb torre i distribució pròpia |
| Polvorí, fase 2 | Dos magatzems, guàrdia, camió i quatre soldats. Munició, granades, explosius, **bazooka i rifle de franctirador garantits a cada polvorí**. | Altres distribucions |
| Comunicacions, fase 2 | Ràdio, servei, cotxe, quatre soldats, filferrada i generador decoratiu. Antena de 56 m i parabòlica de 18 m de diàmetre al terrat. **Els tres mapes garantits**; disfressa opcional. | Altres distribucions; la preferència per un emplaçament elevat no està implementada com a criteri de selecció |
| Base inicial, fase 3 | Caserna, magatzem, infermeria, teulades i bandera blaves; cotxe i bicicleta reservats, jugador al pati. Es conserva la llanxa costanera. | El camí continu fins al punt costaner associat encara no es construeix explícitament |
| HQ enemic, fase 3 | Búnquer de 40 × 34 × 10 m amb quatre parets inclinades cap endins, portal trapezoidal, particions i general. Dos edificis auxiliars, vuit soldats, quatre torres, filferrada amb entrada desalineada. Dues tanquetes en circuits nord/sud separats i dos jeeps a l’exterior. **Sense tanc aparcat ni helicòpter assignat a l’HQ**. | Més proves de recorregut i combat en partides completes |
| Embarcador civil | Hi ha molls independents i vehicles costaners, però no aquest tipus de complex | Caseta/cobert, moll, servei i distribució propis |
| Terminal de ferri | Existeixen dos ferris i la seva física de càrrega, però no terminals | Platja i rampa accessibles, esplanada, caseta, marques i espai de maniobra |
| Control de carretera | No hi ha layout ni generació d’aquest tipus | Primer calen camins que connectin destinacions reals; després caseta, barrera, defenses i vehicle fora del pas |
| Petit assentament | No hi ha layout ni generació d’aquest tipus | 3–5 cases, pati, cobert i accessos; possible variant costanera |

Les dues tanquetes de l’HQ conserven circuits independents per evitar el bloqueig mutu. La porta del búnquer s’obre amb **10 segons acumulats** davant seu a peu; conserva el progrés quan el jugador s’allunya i allibera el pas en acabar.

### Regles comunes: què ja existeix i què no

- Hi ha reserves de terreny, separació entre recintes, exclusió de vegetació, portes orientades als accessos, camins locals i dades de patrulla.
- Hi ha **una distribució principal per tipus**, no les tres distribucions previstes. Els girs i miralls no compten com a layouts nous.
- Els recintes comuns utilitzen girs de 90° i mirall; els ports s’orienten segons la costa. Base i HQ mantenen orientació fixa. L’afirmació antiga de gir lliure 0–360° no descriu aquest generador.
- Les comprovacions de rutes i separació són a les proves. No hi ha una validació exhaustiva de qualsevol maniobra i llavor durant cada partida.
- La cerca descarta emplaçaments inadequats i amplia intents; les proves de llavors concretes no garanteixen que apareguin tots els recintes en qualsevol mapa.
- Caixes, bidons i generadors continuen principalment decoratius. No s’ha acordat ni implementat una mecànica general de combustible o sabotatge.

## Funcionalitats implementades

### Món, exploració i interfície

- Arxipèlags de dues mides, costa amb sorra, relleu, límit del mapa, onatge, fons marí i natació de braça.
- Palmeres variades i corbades; gavines que eviten relleu i edificis; taurons representats per una aleta. La quantitat de fauna es va augmentar de 16 a 48 gavines i de 10 a 30 taurons.
- Portada amb imatge fixa, sense generar un món de fons. La partida es genera en començar.
- Llavor configurable i cercador incremental/cancel·lable per **vehicles, objectes i complexos**, amb resultats per proximitat a la base. Ja no es limita al ferry.
- Inventari, minimapa, carta de navegació, coordenades i intel·ligència de HQ, helicòpters i tancs. Els mapes s’activen en recollir-los.
- Controls tàctils i teclat, desplaçament lateral Y/U, E per vehicles, H/J per helicòpters i T per la mira. L’ajuda del joc és a `src/ui.js`; resum al [README](../README.md).
- Menú **Rendiment** separat, accessible des de portada i pausa, amb perfils i interruptors de palmeres, aigua i ombres. Ja no cal fer aquesta agrupació.

### Models i animació

| Proposta aprovada | Estat i font |
|---|---|
| Cap D del jugador, coll curt i riders | Integrat; `src/player-model.js`, `src/rider.js`, `src/player-head-concepts.mjs` |
| Soldat enemic i general redissenyats | Integrats; `src/characters.js` i `src/general-model.js`; escala visual 0,8 |
| Pistola amb presa a dues mans en disparar | Integrada al rig del protagonista a `src/characters.js`; no és una tasca pendent encara que la pàgina de prova mantingui un rètol antic |
| Ganivet, postura 4B i atac 3B | Integrats a `src/characters.js`; comparatives conservades |
| Llanxa normal i radar | Integrats a `src/vehicles.js` |
| Llanxa llançacoets C4, bateria de 12 tubs | Integrada a `src/vehicles.js` |
| Huey i helicòpter de combat compacte | Integrats a `src/vehicles.js`; els comentaris actuals identifiquen Huey 3B-4 i Combat Compacte B3 |
| Explosiu plàstic amb temporitzador i cables RGB | Integrat; `src/explosive-visuals.js`, compartit per objecte recollible i explosiu plantat |
| Barca de rems i windsurf | Buc obert, màscara d’aigua, rems i postura del rider; postura lateral del windsurf corregida |

Les antigues variants no seleccionades no són feina pendent. Els mòduls de conceptes es conserven com a material reutilitzable; no formen part per això del catàleg jugable.

### Vehicles

Hi ha **15 tipus conduïbles**, definits a `src/vehicle-dynamics.js`; models a `src/vehicles.js`, conductors a `src/rider.js` i integració física a `src/game-core.js`.

- Ferry amb rampes i coberta mòbil per vehicles terrestres i helicòpters; dos emplaçaments costaners al mapa. La separació d’embarcacions té tractament específic i les motos aquàtiques tenen una correcció seguint la costa.
- Mínim de quatre motos aquàtiques i una única llanxa llançacoets com a objectius explícits del generador.
- Des de 0.4.18, els helicòpters tenen col·lisió amb cobertes planes i arquejades, suport en aterrar i bloqueig del rotor en ascendir des de sota. La col·lisió desapareix amb la coberta destruïda.
- A 0.4.19 s’han augmentat les velocitats dels helicòpters i l’agilitat del de combat; a 0.4.20 s’han afegit obstacles aeris per a l’antena i la parabòlica, amb impactes dels helicòpters.
- Helicòpter normal i de combat amb controls verticals; el de combat disposa de míssils limitats i botó propi.
- Erugues animades, conductors articulats, pedaleig, remada i sortida de vehicles en marxa amb una sola voltereta.
- La configuració efectiva actual és **llanxa `maxF: 35` i ferry `maxF: 15`**. Les xifres intercanviades de peticions o resums antics no s’han de presentar com el codi actual.
- El tanc no perd vida per col·lisions i pot trencar obstacles a baixa velocitat. Tanc i tanqueta disparen des del canó; les regles de trajectòria i autoapuntat són a `src/combat.js`.

### Combat, equipament i IA

- Munició inicial i recollides normals de **16 bales**; no ocupa una entrada de l’inventari.
- Granades: cinc per recollida, càrrega mantenint Dispar, trajectòria/punt de caiguda visibles i animació de llançament. Explosius plantats amb radi 48 i dany base 300, triple dels valors antics.
- Rifle de franctirador: sis cartutxos per recollida, mira x8, tir des de la boca real del canó amb convergència cap al punt de la mira (corregit a 0.4.17) i controls que mouen el punt de vista sense caminar.
- Paracaigudes automàtic en saltar d’un helicòpter en vol si es porta a l’inventari, descens frenat i bloqueig de reentrada durant la caiguda.
- Soldats amb navegació, separació, recuperació de bloquejos i persecució pels accessos dels edificis ordinaris. Les portes bloquejades i el búnquer tenen tractament propi; no és una garantia de trobar qualsevol ruta possible.
- Canons, metralladores, coets, míssils, disfressa, destrucció de vehicles i torres, filferrada i parets destructibles.
- Caiguda de cobertes per pèrdua de suport als edificis ordinaris; hangars amb coberta arquejada destructible com a conjunt. El búnquer té una excepció al col·lapse per suport.

## Optimització: implementada, amb validació pendent

| Sistema | Canvi existent | Font principal |
|---|---|---|
| Terreny | Generació progressiva per sectors, quatre LOD segons perfil i histèresi; terreny distant més simple | `src/terrain.js` |
| Contacte amb el terreny | Suport basat en el triangle visible i correcció del mostreig en baixar pendents | `src/game-core.js`, `groundAt()` |
| Palmeres | Instancing per sectors, tres nivells visuals i exclusió de zones funcionals | `src/vegetation.js` |
| Enemics | Agrupació de peces, representacions simplificades segons distància i retorn al model articulat | `src/enemy-lod.js` |
| Òptica x8 | Màxim detall en el corredor de la mira per terreny, vegetació i enemics; restauració en sortir | `src/sniper-focus.js`, integracions als sistemes visuals |
| Geometria estàtica | Agrupació de filferrades, finestres, sostres i decoració per reduir crides de dibuix | `src/buildings.js`, `src/world-generation.js`, `src/game-core.js` |
| Visibilitat i ombres | Límits de distància, selecció de projectors d’ombra i ocultació d’edificis pel relleu | `src/game-core.js` |
| Simulació | Índexs espacials, percepció enemiga a baixa freqüència, pressupostos de navegació i filtratge de projectils | `src/enemy-navigation.js`, `src/enemy-ai.js`, `src/combat.js` |
| Qualitat i diagnòstic | Perfils escriptori, mòbil i Mínims; mètriques i interruptors al menú Rendiment | `src/visual-config.js`, `src/performance.js`, `src/ui.js` |

La resolució adaptativa que provocava fotogrames foscos es va substituir per una política estable; no s’ha de recuperar com a proposta pendent. El perfil Mínims ja redueix distància i simplifica l’aigua. Les proves amb DOM simulat o SwiftShader no mesuren els FPS del telèfon de l’usuari.

## Pendents reals i ordre recomanat

### 1. Estabilització i proves

La revisió 0.4.25 actualitza les expectatives del banc de proves al joc actual: perfils de terreny i aigua, catàleg de complexos, patrulles, inventari, trajectòria del rifle, granades, postura del paracaigudes, visibilitat, fragments d’explosions i rellotge de pausa. El DOM simulat conserva ara els atributs i la prova general disposa de workflow propi.

El tram final de `tests/seed-replay.cjs` feia dues generacions dins una sola crida VM: compartien el mateix límit de 120.000 ms. Ara cada generació té una crida independent amb el mateix límit; es conserven les comparacions de mapes i es registren els temps. No es modifica el generador ni s’augmenta el timeout.

1. Confirmar la reproducció de llavors sense competència pels recursos i a CI: la passada local simultània va superar els 120 s en una reconstrucció, després de superar les comparacions inicials. El timeout continua obert; la prova general ja passa completa.
2. Ampliar la cobertura de generació de complexos, accessos, ports i rutes d’IA a més llavors i a les dues mides de mapa. Les proves actuals no són una garantia universal.
3. Comprovar en partida completa pujades i baixades de pendents, entrada als edificis, destrucció de sostres, persecució enemiga i càrrega/aterratge al ferry. Hi ha correccions implementades; queda la regressió conjunta.
4. Fer una sessió reproduïble de 20–30 minuts en Android: mateixa llavor, qualitat i recorregut; registrar FPS, temps de fotograma, dibuixos, memòria i temperatura. Incloure mirada terra endins i zoom del rifle.
5. Revisar ergonomia dels botons de dispar/mira, joystick, desplaçament lateral i controls d’helicòpter en dispositiu físic.

### 2. Completar propostes de món encara obertes

La fase 4 ja té **21 dissenys al visor**: quatre recintes nous, dues variants de cadascun dels vuit tipus existents i una connexió base–costa. Es documenten a [COMPOUNDS_PHASE4.md](COMPOUNDS_PHASE4.md). El catàleg de partides continua amb els vuit tipus aprovats.

- Revisar i integrar els dissenys d’embarcador civil, terminal de ferri, control de carretera i assentament de cabanes.
- Integrar la selecció de les variants V2/V3 per llavor, preservant reserves, accessos, objectes garantits i patrulles.
- Implementar el traçat real base–costa i els camins necessaris per als controls de carretera; la maqueta ja mostra la connexió completa.
- Integrar la variant fortificada d’heliport amb torre, ja dissenyada.
- Implementar el criteri d’emplaçament elevat però accessible de comunicacions; el visor encara mostra una plataforma plana.

### 3. Poliment i manteniment

- Validar en GPU mòbil real les millores ja incorporades a 0.4.22–0.4.23: qualitat alta ampliada, ombra del jugador, escuma costanera, esquitxos de passes, rastres de vehicles i pols dels helicòpters. Queda el calibratge de rendiment i aparença.
- Continuar extraient estat global de `src/game-core.js`, amb contractes compatibles i sense reescriure alhora simulació i renderer d’un sistema.
- Decidir una llicència pròpia abans de presentar el projecte com a distribuïble sota una llicència determinada. La MIT del motor no cobreix automàticament el joc.

## Decisions superades o tancades

| Text o proposta antiga | Decisió vigent |
|---|---|
| «Integrar les fases 1/2/3» | Completat: 0.3.48, 0.3.97 i 0.4.16 respectivament |
| Tanc aparcat a l’HQ | Retirat expressament; no restaurar-lo |
| Parets verticals o contraforts del vell búnquer | Substituïts pel búnquer amb quatre parets inclinades |
| Mur rectangular posterior del hangar | Eliminat; tancament semicircular conservat |
| Munició inicial/paquets de 12 | Substituïda per 16 |
| Polvorí amb bazooka o rifle opcionals | Tots dos garantits |
| Comunicacions amb un sol mapa | Els tres mapes garantits |
| Cercador limitat a ferris | Substituït pel cercador per categories |
| Toggles de rendiment dispersos a la portada | Agrupats en un menú propi |
| «Optimització completada» sense matisos | Canvis implementats, mesura i estabilització contínues |
| `heli-concepts.html` o `previews.html` com a pàgines presents | Aquests HTML no són al repositori actual; no mantenir-hi enllaços |
| Versions descartades de models | Referència històrica, no obligacions pendents |
| Laboratoris de fase 3 i dispar marcats com a no integrats | Rètols corregits a 0.4.25 |

## Arquitectura i fonts de veritat

- `src/version.mjs`: versió visible del joc. La revisió 0.4.25 actualitza les comprovacions, els rètols i el visor de dissenys de fase 4.
- `src/bootstrap.mjs` i `src/runtime-scripts.mjs`: arrencada i ordre de sistemes; Three.js local ESM a `vendor/three-r186.module.mjs`.
- `src/world-generation.js`, `src/compound-generation.js`, `src/compound-*-layouts.mjs`: món i complexos. `src/compound-concepts.mjs` construeix el visor; el visor no substitueix la prova del generador.
- `src/vehicles.js`, `src/vehicle-dynamics.js`, `src/rider.js`: models, catàleg físic i conductors.
- `src/player-model.js`, `src/characters.js`, `src/general-model.js`: personatges i animació.
- `src/combat.js`, `src/enemy-ai.js`, `src/enemy-navigation.js`: combat i IA.
- `src/terrain.js`, `src/water.js`, `src/waves.js`, `src/vegetation.js`, `src/buildings.js`, `src/fauna.js`: entorn.
- `src/ui.js`, `src/minimap.js`, `src/joystick.js`, `src/seed-search.js`: interfície i cerca.
- `main`: branca oficial; Cloudflare Pages i `hunter.paradoxa.cat` per al joc. No reintroduir GitHub Pages.

Els canvis funcionals publicats han de revisar `GAME_VERSION` i aquest document. Les llavors s’han de comprovar en la mateixa versió i mida de mapa; canviar el generador pot canviar-ne el resultat entre versions.

## Validació i límits de l’auditoria

Aquesta revisió contrasta fonts, layouts, controls, pàgines existents, proves i workflows. No torna a executar totes les suites ni certifica el comportament de totes les funcionalitats.

- A la integració 0.4.16 van passar les proves de geometria de les vuit maquetes i de generació amb llavors **12345 i 67**, incloent porta acumulativa, armes/mapes garantits, separació i patrulles.
- La base i l’HQ es van comprovar en Chromium/WebGL 2 amb SwiftShader, en perfils escriptori i mòbil, sense errors de consola. Això no és una prova en Android físic.
- A 0.4.25 `tests/smoke.cjs` passa completa en local: 15 tipus de vehicles, 40 edificis, combat, inventari, física, pausa i reinici; 218,4 s. També passen les comprovacions específiques de paracaigudes i de càrrega de granada. El test de llavors conserva la limitació indicada als pendents.
- Els workflows consultats de la 0.4.16 confirmen proves específiques de terreny, palmeres, ombres, filferrada, decoració, menú de rendiment, òptica del rifle, aigua, granades, impactes i aterratge. A la 0.4.18 també passen els workflows de LOD enemic, boca/trajectòria del rifle i col·lisió d’helicòpters amb cobertes. El workflow de llavors falla per timeout de `seed-replay.cjs`, després de superar catàleg i integració del cercador. Logs consultats el 12 d’octubre; no s’atribueix aquest timeout a una causa de rendiment concreta sense perfilar-lo.

| Àmbit | Proves de referència |
|---|---|
| Complexos | `tests/compound-preview.cjs`, `tests/compound-generation.cjs`, `tests/compound-game-browser.cjs` |
| Terreny i qualitat | `tests/terrain-stream.cjs`, `tests/graphics-quality.cjs`, `tests/performance.cjs` |
| LOD i visibilitat | `tests/vegetation-lod.cjs`, `tests/enemy-lod.cjs`, `tests/sniper-lod.cjs`, `tests/distance-performance-menu.cjs` |
| Agrupació de malles | `tests/fence-batching.cjs`, `tests/window-batching.cjs`, `tests/static-decor-batching.cjs`, `tests/shadow-optimization.cjs` |
| Llavors | `tests/seed-search.cjs`, `tests/seed-search-integration.cjs`, `tests/seed-replay.cjs` |
| Navegació | `tests/enemy-navigation.cjs`, `tests/enemy-navigation-world.cjs` |
| Vehicles i aigua | `tests/helicopter-landing.cjs`, `tests/helicopter-roof.cjs`, `tests/jet-skis.cjs`, `tests/rowboat-water.cjs`, `tests/water.cjs` |
| Personatges i combat visual | `tests/player-model.cjs`, `tests/enemy-model.cjs`, `tests/general-model.cjs`, `tests/grenade-charge-pose.cjs`, `tests/bullet-impact-fx.cjs`, `tests/sniper-muzzle.cjs` |
| Arrencada general | `tests/smoke.cjs`, `tests/browser.cjs` |

## Neteja documental aplicada

- Reescrit el README amb controls, 15 vehicles, vuit complexos, laboratoris reals i límits de les proves.
- Eliminada d’aquest document la cronologia repetida de revisions intermèdies, els plans ja executats, les comprovacions antigues presentades com a actuals i les xifres contradictòries.
- Conservades les decisions vigents i les propostes encara obertes, amb fonts per reprendre-les.
- Conservat `vendor/README.md`: és necessari per a la procedència i reproducció del motor. El SHA-256 del bundle s’ha comprovat i coincideix.
- No s’eliminen codi, models de comparació ni llicències. Els documents d’estat, disseny i procedència del motor tenen funcions diferenciades; la informació sobrant s’ha eliminat dins dels documents.
