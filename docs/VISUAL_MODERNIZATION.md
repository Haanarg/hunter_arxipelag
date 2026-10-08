# Hunter: Arxipèlag — estat visual i tècnic

Document consolidat de l'estat actual del projecte.  
S'han eliminat plans de treball completats, registres històrics substituïts i descripcions de versions intermèdies que ja no representen el joc actual.

## Sistema de versions

Versió actual: **0.3.42**.

Revisió 0.3.34: catàleg de redisseny registrat i preview Three.js d’hangar, avançada i port; generador jugable conservat.

### Revisió 0.3.42 — correcció d'arrencada WebGL (2026-10-08)

- Corregit l'error de Three.js `Cannot read properties of undefined (reading 'byteLength')` després de prémer un botó de dificultat.
- Les malles dels sectors del terreny proporcionen ara els índexs de triangles com a `THREE.BufferAttribute`, no com a `Uint16Array` directament.
- El carregador dels sistemes del joc afegeix la versió als URL per evitar reutilitzar el fitxer de terreny antic de la memòria cau.
- Afegides comprovacions dels buffers d'índex a les proves dels sectors inicials, els generats progressivament i els actualitzats per LOD.
- Es mantenen totes les optimitzacions de la versió 0.3.41.

### Revisió 0.3.41 — optimització d'arrencada i sectors de terreny (2026-10-08)

- Eliminada la captura síncrona WebGL / `toDataURL()` de l'inici de partida; si existeix una imatge anterior desada al navegador es pot continuar mostrant a la portada.
- El terreny visual ja no es genera en una sola malla de 400×400 subdivisions: es divideix en sectors de prop de 800 m amb tres nivells de detall (12/28/56 subdivisions en qualitat alta, 10/20/40 en baixa).
- A l'arrencada es generen només els sectors immediats del jugador; la resta i les millores de detall es preparen al llarg de fotogrames amb pressupost d'uns 2 ms (1,2 ms en mode reduït).
- Afegits faldons a les vores dels sectors per reduir escletxes entre diferents nivells de detall. La simulació, col·lisions, llavors i altures reals continuen amb `hAt()`, independents de la resolució visual.
- Càlcul de color de terreny sense instanciar colors nous per a cada vèrtex; interpolació directa de paleta RGB.
- Càlcul del fons marí accelerat amb mostres disperses en aigües profundes i valors exactes al litoral; es manté la relació CPU/GPU de les ones.
- Eina interna de mesura: `window.HUNTER_BUILD_STATS` amb temps inicials totals, terreny, fons marí i vegetació, i estat dels sectors; es pot activar el registre a consola amb `window.HUNTER_PERF_DEBUG = true` abans de generar el món.
- Proves noves: `node tests/terrain-stream.cjs`; ampliades `tests/smoke.cjs` i `tests/water.cjs`.

### Revisió 0.3.40 — cascs tancats sense prisma inferior (2026-10-08)

- Eliminat el prisma rectangular negre inferior de la llanxa normal i de la llanxa llançacoets.
- Tancada la quilla amb les mateixes anelles i vèrtexs del casc facetat: la darrera secció de cada anella s'uneix amb el vèrtex central inferior.
- Proa, popa, laterals i superfície inferior formen una única malla tancada; la silueta dels models aprovats, el radar i els tubs de coets es mantenen.
- Aplicada la mateixa correcció als prototips Three.js i actualitzada la prova de regressió per detectar arestes obertes i la caixa antiga.

### Revisió 0.3.39 — proes tancades (2026-10-08)

- Tancades les cares frontals de les proes de les llanxes normal i llançacoets amb cinc triangles orientats cap enfora.
- Conservada la coberta superior original del casc, sense afegir superfícies duplicades, i actualitzats els models Three.js de prova.
- Afegida una prova smoke de la geometria de les dues proes.

### Revisió 0.3.38 — explosiu plàstic RGB (2026-10-08)

- Incorporada la proposta 1 del bloc d'explosiu plàstic al joc: cos verd oliva, nou display digital i nou cables superiors vermells, verds i blaus en arcs paral·lels.
- El mateix model s'utilitza per als objectes recollibles i les càrregues col·locades; també s'actualitzen la icona i la descripció de l'inventari.
- Quan la càrrega està activa, el display mostra el compte enrere i parpelleja ràpidament en **vermell** (5 vegades per segon); als objectes recollibles resta verd i fix.
- El retard de 3 segons i la força destructiva dels explosius es mantenen sense canvis.

### Revisió 0.3.37 — munició inicial reduïda (2026-10-08)

- El jugador comença cada partida amb **12 bales** en lloc de 24.
- Cada paquet de munició (`arma`) afegeix **12 bales** en lloc de 40.
- Actualitzada la prova smoke perquè verifiqui el nou valor de recàrrega.

### Revisió 0.3.36 — llanxa llançacoets C4 (2026-10-08)

- La `llanxa_coets` adopta el mateix casc facetat de la llanxa normal actual, amb popa tancada i proa neta.
- Eliminat el radar posterior de l'antic model.
- Implementat el model C4 seleccionat: llançador endarrerit amb **12 tubs cilíndrics 3×4**, sense bloc massís, tubs més llargs i bastidor posterior reforçat.
- La llanxa llançacoets passa a la mateixa escala gran de la llanxa normal; radi i hitbox s'actualitzen al nou volum.
- El rider conserva la seva mida anterior (escala corporal 1.35) i només es reposiciona dins la cabina ampliada. Es mantenen els cinc coets i la mecànica existent.

### Revisió 0.3.35 — llanxa normal ampliada (2026-10-08)

- La llanxa normal augmenta un 50% de mida, amb radi i hitbox coherents.
- El rider manté la mida anterior i es reposiciona dins la cabina ampliada.

### Revisió 0.3.33 — navegació i separació enemiga (2026-10-08)

Implementat sobre `main` 74ee66e (0.3.32), conservant els canvis recents de models, cases i compounds:

- `src/enemy-navigation.js`: cerca local A* per rodejar obstacles, compartida per soldats, jeeps, tanquetes i tancs. Camins amb marge segons la mida; el moviment final dels vehicles comprova la caixa orientada completa.
- Comprovació del recorregut i del gir amb passos de 45 cm com a màxim a la vora de la petjada. Eliminat el salt de desencallament que només comprovava la destinació.
- Separació física soldat–soldat, soldat–vehicle i vehicle–vehicle, inclosos vehicles aparcats i torres. Esquiva local, espera i marxa enrere curta quan no hi ha pas segur. Els moviments no empenyen altres unitats dins de parets.
- Actualització immediata de les cel·les espacials quan un enemic es mou. La IA refresca l'índex després del moviment dels vehicles del jugador.
- Comprovació final de les posicions inicials, després de situar els vehicles: cerca determinista d'una posició lliure pròxima si un enemic apareix solapat. El general es manté dins del seu búnquer.
- Els vehicles limiten el gir i frenen per encarar-se; ja no roten instantàniament per apuntar travessant una paret. Els soldats animen la marxa només quan es desplacen.
- Cerca incremental: màxim global de 160 nodes expandits per fotograma i dues cerques ateses; màxim de 1.600 nodes per cerca. Resultats i trajectes directes reutilitzats. La comprovació física de cada moviment continua activa.

Validat:

- `node tests/enemy-navigation.cjs`: quatre tipus d'enemic rodejant un edifici; sortida d'un recinte en U; dotze soldats convergint sense superposar-se; vehicles en sentits contraris; vehicle contra soldat aturat; pas estret; paret fina; gir d'un tanc; obertura d'un obstacle; separació inicial; canvi de cel·la espacial.
- `node tests/enemy-navigation-world.cjs`: mapa de llavor 12345, 59 enemics sense posicions inicials bloquejades i nou segons de simulació de la IA sense moviments que acabin en obstacles o altres unitats.
- `node tests/smoke.cjs`: regressió general amb els 15 vehicles, generació, destrucció i reinici.

Pendent / límits:

- Revisió visual i jugable en Android real. L'intent de `tests/browser.cjs` d'aquesta entrega ha fallat abans de carregar el joc: Chromium acaba amb SIGSEGV. No es dona per validat el navegador en aquesta revisió.
- La cerca és local i limitada; davant d'una destinació inaccessible s'espera o es busca una altra ruta, sense travessar obstacles. No és una garantia de trobar qualsevol ruta possible en qualsevol llavor. Els passos estrets per a vehicles s'accepten si la petjada orientada i el gir hi caben.
- Els temps del banc de proves amb DOM/GPU simulats no són una mesura d'FPS ni de rendiment en Android.


Revisió 0.3.27 (2026-10-07): general substituït pel model aprovat, Estat major amb gavardina grana llarga, bigoti del primer model i muscleres clàssiques gruixudes (opció 1 de la segona comparativa). Gorra de plat, ulleres d'aviador, deu medalles, passadors i cordó daurat. Reutilitza la base articulada actual del jugador; muscleres unides als braços i faldons de gavardina units a les cuixes. Manté l'alçada anterior, l'arma, la IA i el paper d'objectiu de missió. `src/general-model.js` concentra la geometria; aprofita les animacions articulades dels enemics. Integrat sobre 0.3.26, conservant els darrers ajustos de braços, vehicles i desbloqueig d'enemics.

Validació 0.3.27: proves de geometria, mida, animacions, color independent, generació del general a l'HQ i victòria en eliminar-lo; smoke general i arrencada WebGL amb perfils d'escriptori/mòbil. Android físic pendent per a aquesta revisió.


Revisió 0.3.21 (2026-10-07): soldats normals substituïts per l'opció 3 aprovada, comando vermell amb boina, corretja diagonal i ràdio. Reutilitza `HUNTER_PLAYER_MODEL` i conserva l'alçada del soldat anterior, inclosa la reducció del 10%. Colzes i genolls articulats en caminar, apuntar i morir; genolls flexionats en el sentit anatòmic. Fusell unit a l'avantbraç. El general conserva el seu model distintiu. No es modifica la IA, la vida, les col·lisions ni les regles de combat. Integrat sobre 0.3.20, preservant els canvis de vehicles d'altres xats.

Validació: `tests/enemy-model.cjs` comprova alçada, color, 96 postures, sentit dels genolls, direcció del fusell, mort i aïllament respecte del jugador. `tests/enemy-model-browser.cjs` renderitza el model real amb WebGL. Smoke general i comprovació de navegador en perfils desktop/mobile. Prova en Android físic pendent per a aquesta revisió.


Revisió 0.3.9 (2026-10-07): protagonista tàctic aprovat després de les comparatives 3D. Espatlles estretes, genolls i colzes articulats, cabell curt sota una gorra ajustada, visera arrodonida allargada i botes amb turmell, empenya i sola. `src/player-model.js` és la font comuna de geometria del protagonista i dels conductors visibles de bicicleta, moto, moto aquàtica, llanxa, llanxa llançacoets, barca de rems i windsurf. El rig a peu conserva els noms i les armes; el de conducció reutilitza les mateixes peces amb els punts de contacte existents. Es mantenen pedaleig, peus a terra en aturar-se, mans als rems i orientació del windsurf. La disfressa afecta també el conductor i la gorra. Corregit el sentit de flexió dels genolls durant la braça. Els vehicles de cabina que no mostraven conductor continuen igual.

Validació 0.3.9: smoke general; prova específica de model, sis estats d'animació/equipament, disfressa sincronitzada, 168 postures de conductors i sortida de vehicle; comprovació WebGL de protagonista i set conductors; arrencada i shaders en perfils desktop/mobile i qualitat reduïda. Android físic pendent per a aquesta revisió. Les captures de validació són temporals; el codi del model aprovat és al repositori.

Revisió 0.3.8: el botó de cerca de llavors surt del bloc de la llavor i passa al cantó inferior esquerre de la pantalla inicial, mantenint intacta la pantalla de cerca i el seu comportament.

Revisió 0.3.7: porta principal del búnquer de l'HQ amb obertura progressiva de 10 segons acumulats. Només avança quan el jugador és a peu davant de la porta; si se'n va, conserva el progrés i el reprèn en tornar. Visualment es recull cap amunt de manera contínua i deixa de col·lisionar quan és completament oberta.

Revisió 0.3.6: mínim de quatre motos aquàtiques per mapa. Comprovació final contra les caixes de tots els vehicles, inclosos els enemics, amb marge de separació. En cas de conflicte es busca una posició seguint la costa en trams de 100 m; es prova l’altra direcció o un altre punt costaner si no hi ha espai vàlid. Es mantenen dins del límit i sobre l’aigua. La generació no accepta silenciosament un mapa amb menys de quatre motos aquàtiques.

Revisió 0.3.5: barca de rems amb flotació 30 cm més baixa i màscara d’aigua interior. Integrada sobre 0.3.4, conservant ferris, transport de vehicles, granades i selector de qualitat. La prova smoke inclou l’offset, les ombres i l’exclusió de la màscara dels fragments; s’ha reparat també una cometa imbricada i el nom de variable d’una comprovació de la tanqueta.

Revisió 0.3.18: el laboratori Three.js passa a mostrar quatre iteracions derivades del model 2 de l'helicòpter de combat. Totes connecten els patins al fuselatge, escurcen les aletes laterals i reutilitzen les barquilles grans del model 3. Les variants 3 i 4 exploren cabines més angulars inspirades en l'Apache. Encara no s'ha modificat `heli_combat` al joc.

Revisió 0.3.17: el laboratori Three.js passa temporalment a mostrar quatre propostes per a l'helicòpter de combat: Cobra clàssic, combat compacte, gunship i combat modern. Encara no substitueixen `heli_combat`; serveixen per triar la línia visual abans d'integrar-la.

Revisió 0.3.16: s'eliminen les tres barres del frontal de la cabina del nou Huey 3B-4, deixant el vidre frontal més net i obert visualment.

Revisió 0.3.15: la variant **3B-4 amb carenats laterals** passa del laboratori al joc com a model visual de l'helicòpter normal. Manté física, hitbox, controls i comportament, però adopta fuselatge estret arrodonit, cabina frontal tipus Huey, grans obertures laterals, bancs interiors, cua afinada, patins i carenats laterals. El rotor principal s'ajusta a la nova silueta i es conserven els dos rotors animats.

Revisió 0.3.14: iteració específica sobre el model 3B. El comparador mostra quatre variants del detall lateral de la cabina: dos models amb cilindres complets (gran i petit), un model sense aquests volums i una alternativa amb petits carenats arrodonits.

Revisió 0.3.13: el comparador Huey passa a mostrar quatre variants derivades exclusivament del model 3 seleccionat. Totes fan el cos més estret i acosten la cabina frontal al Huey original, amb diferències de proporció i grau de simplificació per poder triar la següent iteració directament al navegador.

Revisió 0.3.12: iteració del model 3 del laboratori Huey. El fuselatge de transport deixa de ser una caixa pura i passa a una secció rectangular amb cantonades arrodonides, panxa lleugerament corba, sostre suavitzat i morro vidrat millor integrat, mantenint portes laterals grans i proporcions de transport.

Revisió 0.3.11: correcció del laboratori Huey: el mòdul de conceptes ara importa Three.js des de la ruta correcta (`../vendor/three-r186.module.mjs`) i la pàgina mostra un error visible si falla la càrrega.

Revisió 0.3.10: laboratori Three.js amb quatre propostes de model Huey per a l'helicòpter normal, comparables dins del mateix motor abans de substituir el model jugable.

La versió del joc es defineix en un únic punt: `src/version.mjs`, mitjançant la constant `GAME_VERSION`. La pantalla inicial llegeix aquesta constant i mostra la versió en un cantó, de manera que la UI i el codi comparteixen la mateixa font de veritat.

### Criteri de numeració

- **Versió base o salt major de desenvolupament:** `0.1`, `0.2`, `0.3`...
  - S'utilitza quan hi ha un conjunt important de canvis: sistemes nous, canvis substancials de gameplay, reestructuracions rellevants o fites clares del projecte.
- **Revisió menor:** `0.1.1`, `0.1.2`, `0.1.3`...
  - S'utilitza per correccions, ajustos petits, poliment, equilibratge o millores puntuals que no justifiquen un salt a `0.2`.
- Després d'un salt major, el comptador de revisions torna a zero implícitament: per exemple, de `0.1.4` a `0.2`, i després `0.2.1`.
- Cada vegada que es publiqui un canvi a `main` que vulguem identificar com una revisió o una nova fita, s'ha d'actualitzar `GAME_VERSION`.
- Aquest document s'ha de mantenir coherent amb la versió publicada.

La versió **0.1** correspon a l'estat del joc en el moment d'introduir aquest sistema de versionat. La versió **0.2** introdueix el ferry i, sobretot, el primer sistema de transport de vehicles sobre una plataforma mòbil. La revisió **0.2.1** evita que la llanxa inicial comparteixi posició amb un ferry: si hi ha solapament, la llanxa es desplaça 100 m paral·lelament a la costa, mantenint-se a l'aigua. La revisió **0.2.2** corregeix l'orientació inicial del ferry perquè la proa apunti cap al mar i el jugador quedi encarat mar endins quan en pren el control. La revisió **0.2.3** distribueix els dos ferris entre costes d'illes diferents de tot el mapa, en lloc de concentrar-los a l'illa inicial. La versió **0.3** incorpora una pantalla integrada de cerca de llavors que prova mapes amb el generador real i ordena els resultats per distància entre la base inicial i el ferry més proper. La revisió **0.3.1** augmenta moderadament la velocitat dels dos vehicles aquàtics principals: la llanxa passa a 35 de velocitat punta i el ferry a 15; el ferry conserva una acceleració baixa per mantenir la sensació de massa. La revisió **0.3.2** separa l'orientació visual dels canons de la trajectòria dels projectils: tanqueta i tanc mantenen el canó recte, mentre la tanqueta dispara 5° cap avall i el tanc redueix la seva caiguda de 20° a 5°. La revisió **0.3.3** evita guardar la munició a l'inventari i afegeix a la portada un commutador de gràfics reduïts que força en ordinadors el mateix perfil visual que Android. La revisió **0.3.4** fa realment transitables les rampes del ferry per als vehicles terrestres: la detecció usa tota la petjada del vehicle, permetent entrar per proa o popa sense topar prematurament amb la hitbox del buc, mentre els laterals continuen sent sòlids.

---

## Cerca de llavors

- El menú inicial incorpora un botó **Cerca** al costat del camp de llavor.
- Obre una pantalla específica sense iniciar la partida.
- Permet definir:
  - llavor numèrica inicial;
  - nombre de llavors consecutives a provar, entre 1 i 100;
  - distància objectiu al ferry;
  - mida de mapa, heretada de la selecció del menú principal.
- Cada candidat es genera amb el mateix `build()` i la mateixa transformació de llavor que utilitza una partida normal.
- La distància mostrada és la distància real entre la base inicial i el ferry actiu més proper.
- Els millors resultats s'ordenen en temps real.
- La cerca és incremental i cancel·lable.
- **Usa aquesta llavor** torna al menú principal, desactiva la llavor aleatòria i emplena automàticament el camp amb la llavor seleccionada.

## Objectiu

Mantenir l'estètica low-poly i la jugabilitat de *Hunter: Arxipèlag* mentre es milloren progressivament:

- llegibilitat visual;
- varietat del món procedural;
- models i animacions;
- comportament dels vehicles;
- rendiment en navegador i Android;
- separació entre presentació, entrada i simulació.

La prioritat és evitar regressions de gameplay mentre es modernitza el projecte.

---

## Arquitectura actual

- Branca de producció: `main`.
- Desplegament: Cloudflare Pages.
- Domini de producció: `hunter.paradoxa.cat`.
- No s'ha de reintroduir GitHub Pages.
- Three.js modern local en ESM: `vendor/three-r186.module.mjs`.
- Arrencada ESM a `src/bootstrap.mjs`.
- Ordre compartit de sistemes a `src/runtime-scripts.mjs`.
- `src/game-core.js` continua concentrant part de l'estat compartit i del bucle principal.
- Sistemes extrets en fitxers específics: terreny, aigua, vegetació, edificis, vehicles, dinàmica, rider, personatges, combat, IA, minimapa, UI, àudio i generació procedural.
- Els globals compatibles es mantenen temporalment mentre no es completi una modularització més profunda.

### Fitxers principals

- `src/game-core.js`: estat compartit, bucle principal i integració.
- `src/world-generation.js`: generació procedural i compounds.
- `src/combat.js`: projectils, explosions i armes.
- `src/enemy-ai.js`: percepció, combat i animació enemiga.
- `src/enemy-navigation.js`: rutes, esquiva i separació física enemiga.
- `src/terrain.js`: malla i paleta del terreny.
- `src/waves.js`, `src/water.js`, `src/water-config.js`: onatge i renderitzat d'aigua.
- `src/vegetation.js`: geometria i instancing de vegetació.
- `src/buildings.js`: construcció visual d'edificis.
- `src/vehicles.js`: models de vehicles.
- `src/vehicle-dynamics.js`: perfils físics i resposta de conducció.
- `src/rider.js`: postures del jugador en vehicles oberts.
- `src/characters.js`: jugador i soldats.
- `src/ui.js`, `src/minimap.js`, `src/joystick.js`: interfície i entrada.

---

## Fauna

- Quantitat augmentada un 200% respecte de l'estat anterior:
  - gavines: 16 → 48;
  - taurons: 10 → 30.
- El tauró queda simplificat visualment a una única aleta dorsal low-poly.
- L'aleta segueix directament la superfície de l'aigua i genera escuma a prop del jugador.
- Les gavines mantenen la seva òrbita però calculen una altura mínima de seguretat:
  - 10 m per damunt del terreny;
  - 8 m per damunt de qualsevol teulada dins la seva trajectòria.
- L'altura es suavitza quan poden fer-ho, però mai se'ls permet quedar dins del relleu o d'un edifici.

---

## Renderitzat i món visual

### Renderer
- Perfils diferenciats per mòbil i escriptori.
- El commutador **Gràfics reduïts** de la portada força el perfil `mobile` també en ordinadors: pixel ratio 1.3, ombres desactivades, cel simplificat i aigua amb 240 segments.
- WebGL 2.
- Color management modern amb sRGB.
- ACES Filmic.
- Ombres adaptatives.
- Cel, llum solar i atmosfera separats del nucli de simulació.
- Materials centralitzats per terreny, orgànic, maçoneria, pintura, metall, goma i vidre.

### Aigua
- Model compartit CPU/GLSL.
- Física i superfície visual utilitzen el mateix model d'ones.
- Les embarcacions segueixen l'altura real de la superfície.
- La mida de la malla s'adapta al mapa actiu.
- Bounds de culling adaptats al desplaçament màxim de les ones.

**Pendent real:** refinar l'escuma, que encara pot seguir massa visiblement la triangulació, i calibrar-la en GPU mòbil real.

### Terreny
- Mides disponibles: 4,8 × 4,8 km i 9,6 × 9,6 km.
- Generació determinista per llavor.
- Zones de construcció anivellades amb transició suau cap al relleu natural.
- L'interior de les illes té aproximadament un 24% més de contrast vertical, aplicat progressivament lluny de costa.
- Afegida una capa de soroll de freqüència mitjana per crear turons i valls més marcats sense embrutar excessivament la conducció.
- Cada illa té un cim principal desplaçat determinísticament respecte del centre, fins aproximadament un 20% del radi per eix.
- La franja costanera queda deliberadament poc afectada perquè platges, ports i accessos mantinguin pendents suaus.
- La paleta continua verda a les cotes altes; ja no passa a gris/blanc.
- Minimapa i terreny comparteixen la mateixa paleta.

---

## Vegetació

### Palmeres
- Instancing amb variants de capçada.
- Variació d'escala i tonalitat.
- Destrucció individual.
- Els troncs tenen ara una corba segmentada, no són sempre rectes.
- La desviació màxima del tronc és aproximadament del 25% de l'altura al tram central.
- L'arrel i la copa tornen a l'eix per mantenir ben encaixada la capçada.
- La direcció aparent de la corba varia amb la rotació de cada palmera.

### Distribució
- Cotes baixes: es conserva la probabilitat històrica.
- Per sota de 4 m: 12%.
- Cotes mitjanes favorables: 20%.
- A partir de 28 m: 22%, augmentant progressivament fins aproximadament 34% a les cotes més altes.
- Les zones altes són, per tant, més denses en palmeres que les baixes.

---

## Redisseny de compounds — catàleg i generació (2026-10-08)

Estat: **proposta de disseny registrada; tres primers recintes disponibles en preview Three.js**. Les quantitats són objectius d'equilibratge, no una descripció de la generació actual. Els vehicles són aparcats i utilitzables excepte les patrulles indicades. No tots els objectes opcionals apareixen a cada instància.

| Tipus | Edificis i elements obligatoris | Vehicles | Enemics i objectes |
|---|---|---|---|
| Base inicial | Caserna petita, magatzem, infermeria, pati, bandera blava, sortida ampla i camí a la costa. | 1 cotxe, 1 bicicleta; barca o llanxa al punt costaner associat. | Sense enemics. Munició i 1 farmaciola. |
| HQ enemic | Búnquer amb habitacions i porta progressiva actual; 2 edificis auxiliars, pati de maniobres, filferrada, 4 torres i bandera vermella. | 1 tanc aparcat, 2 tanquetes de patrulla interior i 2 jeeps de patrulla exterior. Sense helicòpters. | General i 6–8 soldats entre entrada, pati i interior. Munició, farmaciola i disfressa. |
| Avançada | Caserna, caseta de guàrdia, torre, sacs, barreres, caixes, llum i bandera. Perímetre parcial amb dos accessos. | 1 moto o jeep. | 3–4 soldats. Munició; granades o farmaciola opcionals. |
| Garatge/hangar | Hangar gran, taller annex, aparcament exterior, dipòsits, bidons i caixes. Espai de sortida i gir davant de la boca. | 1 tanc, tanqueta o camió a dins; 1 cotxe o moto fora. | 2–3 soldats. Munició i farmaciola opcional. |
| Heliport | Plataforma marcada, control, magatzem, combustible, llums i defenses fora de l'àrea dels rotors. | 1 helicòpter normal; variant fortificada amb helicòpter de combat. | 3–5 soldats; torre només a la variant fortificada. Munició i farmaciola. |
| Polvorí | 2 magatzems separats, guàrdia, filferrada, càrrega, caixes de munició i barreres. | 1 camió amb sortida practicable. | 3–4 soldats. Munició, granades i explosius garantits; bazooka opcional. |
| Port militar | Magatzem, oficina, pati de càrrega, 2 molls transitables, pilones, caixes, bidons, torre i bandera. Accés terrestre ample. | 2–3 embarcacions entre llanxa, moto aquàtica i hovercraft. La llanxa llançacoets única s'assigna a un port. | 4–6 soldats. Munició, granades i mapa opcional. |
| Embarcador civil — nou com a recinte | Caseta o cobert, moll petit, caixes i pilones, sense fortificació. | 1–2 entre barca de rems, windsurf i moto aquàtica. | Normalment buit; ocasionalment 1–2 soldats. Farmaciola opcional. |
| Terminal de ferri — nou | Platja accessible, esplanada, caseta, marques d'embarcament i maniobra. Una rampa del ferri accessible des de terra. | 1 ferri; cotxe o camió opcional a terra. | 0–3 soldats. Munició o farmaciola opcionals. |
| Comunicacions — nou | Ràdio, antena alta, generador, caseta, filferrada i sacs. Preferentment elevació accessible. | 1 jeep o moto. | 3–4 soldats. Mapa del HQ o de vehicles garantit; disfressa opcional. |
| Control de carretera — nou | Caseta, barrera, sacs i refugi lateral. Només sobre camins que connectin llocs reals. | 1 jeep fora del pas. | 2–3 soldats. Munició; granades ocasionals. |
| Petit assentament — nou | 3–5 cases, plaça/pati, cobert, tanques baixes i camins fins a les portes. Variant costanera amb embarcador. | 1–2 entre bicicleta, moto i cotxe. | 0–3 soldats. Farmaciola, disfressa o mapa distribuïts pels interiors. |

### Regles comunes acordades com a proposta

1. Reservar tot el recinte abans de construir: edificis, molls, rampes, accessos, aparcaments i maniobra. Calcular les separacions des dels límits reservats.
2. Generar primer camins i superfícies transitables, després edificis i finalment vehicles, enemics i decoració. Cap caixa, palmera o bidó dins d'un pas reservat.
3. Preparar tres distribucions per tipus, amb variacions, gir i mirall. Ports i terminals orientats segons la costa; controls segons el camí.
4. Encarar les portes als accessos. Cada vehicle ha de poder sortir de l'aparcament i del compound amb la seva mida i radi de gir.
5. Validar les patrulles sobre el recinte acabat, amb punts de guàrdia separats i trajectes que evitin edificis, vehicles i filferrada.
6. Objectes segons funció: armes al polvorí, informació a comunicacions, transport a garatges i ports. Bidons i generadors decoratius fins que se'ls assigni una mecànica.
7. Una base, un HQ i dues terminals amb els dos ferris actuals. Garantir accés a munició, transport naval i helicòpters; completar segons superfície útil i distàncies.

### Primera entrega de disseny — 0.3.34

Preview a `compounds-preview.html`, enllaçat també des de `proves.html`. Models reals de Three.js local, edificis amb obertures i interiors, vehicles i comandos reutilitzats del joc a la mateixa escala.

- **Hangar:** reserva 100 × 110 m; hangar 36 × 38 m, taller lateral, tanc interior i cotxe aparcat. Boca de 30 m, recorregut reservat de 18 m i pati de maniobra de 30 × 24 m. Combustible i caixes a la zona de servei. Tres soldats.
- **Avançada:** reserva 90 × 90 m; caserna, guàrdia i torre, pati central, entrada principal de 12 m i accés lateral de 6 m. Moto i quatre soldats. Barreres baixes amb obertures i patrulla al voltant dels edificis.
- **Port militar:** reserva 110 × 120 m incloent aigua; magatzem, oficina, torre, àrea de càrrega de 18 × 12 m, accés de 14 m, passeig i dos molls de 6 m. Tres places navals separades, llanxa, moto aquàtica i llanxa llançacoets de la variant especial; cinc soldats.

El visor permet seleccionar recinte, orbitar arrossegant, zoom amb pinça/roda/botons, vista en planta, interiors sense sostres, etiquetes, rotació automàtica i guies de circulació/maniobra/patrulla. Només es renderitza el recinte seleccionat i es reutilitza la imatge mentre no canvia la càmera. Les franges de colors són guies de disseny, no superfícies del joc.

Fitxers nous:
- `src/compound-layouts.mjs`: especificacions en metres, edificis, vehicles, objectes, rutes i reserves.
- `src/compound-concepts.mjs`: construcció dels tres models.
- `src/compound-preview.mjs`: controls i renderitzat del visor.

Validació de la preview:
- `node tests/compound-preview.cjs`: geometria amb coordenades finites, recompte de vehicles, separació vehicle/edifici i recorreguts de patrulla amb marge d'1 m respecte dels edificis. Aproximadament 15.000 / 14.800 / 19.200 triangles per recinte.
- `node tests/compound-preview-browser.cjs`: les tres escenes carreguen sense errors JavaScript/consola en Chromium/WebGL 2 amb SwiftShader, perfils d'escriptori i mòbil. Selecció, planta, interiors, circulació, etiquetes i zoom comprovats; captures inspeccionades i enquadrament adaptat a pantalles estretes.
- Això valida el visor i els models de proposta; la simulació de navegació i la integració procedural d'aquests layouts encara són pendents. Rendiment i gestos en Android físic pendents.

**Integració pendent:** aprovació/revisió visual dels primers layouts; incorporar-los al generador procedural i al terreny real; validar sortida de vehicles, portes, col·lisions, rutes de la IA, costa i destrucció amb els sistemes del joc; després crear les altres dues distribucions de cada tipus. Aquesta entrega és un preview de disseny i no substitueix els compounds de la partida.


---

## Edificis, compounds i HQ

### Compounds
Tipus consolidats:
- avançada enemiga;
- garatge/hangar;
- port;
- polvorí;
- heliport.

Característiques:
- orientació completa de 0–360°;
- possibilitat de mirall;
- patis i accessos transitables;
- camins i superfícies locals;
- vegetació exclosa de les zones funcionals;
- patrulles i punts defensius contextuals.

### Hangars
- Gran coberta arquejada low-poly.
- Sense parets laterals independents.
- La volta baixa pràcticament fins al terra i forma els laterals.
- Es mantenen el tancament posterior i els muntants de la boca frontal.
- Les col·lisions laterals antigues també s'han eliminat.
- El sostre arquejat és una única peça destructible amb 90 punts de vida, equivalent a una paret normal.
- Els impactes es detecten contra els segments reals de la volta, però tots comparteixen la mateixa vida.
- En destruir-se, la coberta sencera s'inclina, cau i genera pols/debris abans de desaparèixer.
- Barrils, caixes, dipòsits i bandera del recinte es reparteixen fora de la casa annexa i de la boca de l'hangar.

### HQ
- Búnquer central fortificat.
- La porta principal necessita **10 segons acumulats** amb el jugador a peu situat davant seu per obrir-se del tot.
- Si el jugador marxa, l'obertura queda congelada al percentatge assolit i continua des del mateix punt quan torna.
- La porta es recull visualment cap amunt amb una animació contínua i només deixa lliure la col·lisió quan arriba al 100%.
- Perímetre ampliat de filferrada destructible.
- Entrada desalineada respecte de la porta del búnquer.
- Torres als cantons del perímetre.
- Patrulles interiors i exteriors.
- Tanquetes enemigues i defenses fixes contextuals.

---

## Personatge i animació

- Els soldats enemics normals tenen escala visual 0.9 respecte del model anterior; el general manté escala 1.
- El canvi és només visual: no modifica radi de combat, detecció ni estadístiques de la IA.
- Model articulat amb espatlles, colzes, malucs i genolls.
- Animació de caminar amb flexió anatòmica dels genolls.
- Natació amb articulacions.
- Respiració subtil en repòs.
- Gorra verda, ulleres, coll i cabell curt.
- Cabell actual construït amb closca cilíndrica curta i secció posterior tancada.
- Pistola, ganivet i bazooka amb postures específiques.
- Sortida d'un vehicle en marxa amb una sola volta de 360° pivotada visualment a la cintura.
- El frame final de la volta queda explícitament dret.

---

## Vehicles

### Laboratori de models d'helicòpter
> **Recordatori:** el projecte disposa de la pàgina `heli-concepts.html` per previsualitzar i comparar models d'helicòpter fets amb Three.js abans d'integrar-los al joc. Cal reutilitzar aquesta web en futures iteracions de models.

- S'ha afegit `heli-concepts.html`, un comparador visual renderitzat amb el mateix Three.js del projecte.
- Inclou quatre propostes reals per al futur helicòpter normal, totes construïdes amb geometria low-poly reutilitzable: **Huey clàssic**, **Huey curt**, **Huey transport** i **Huey low-poly**.
- Els models del laboratori viuen a `src/heli-concepts.mjs`. La variant 3B-4 seleccionada ja s'ha integrat com a `heli` a `src/vehicles.js`; el comparador es conserva per a iteracions visuals.



Vehicles conduïbles actuals:
- llanxa;
- moto aquàtica;
- hovercraft;
- ferry;
- barca de rems;
- windsurf;
- llanxa llançacoets;
- cotxe;
- moto;
- bicicleta;
- camió militar;
- tanqueta;
- tanc;
- helicòpter;
- helicòpter de combat.

### Llanxa
- Velocitat punta actual: **35**; acceleració: **35**.
- Manté la mateixa maniobrabilitat, deriva i velocitat de marxa enrere.

### Ferry
- Nou vehicle aquàtic gran i lent.
- Velocitat punta actual: **15**; acceleració: **10**. Continua sent clarament més lent i pesant que la llanxa.
- Resistència estructural: **8 impactes**.
- Apareixen **2 ferris garantits per mapa**, situats a prop de platges.
- Model amb gran coberta oberta, cabina lateral i rampes frontal i posterior.
- La coberta funciona com una superfície mòbil transitable:
  - cotxes, motos, bicicletes, camions, tanquetes i tancs poden entrar i sortir per les rampes;
  - la detecció de la rampa usa la petjada completa del vehicle, no només el seu centre; el frontal pot començar a pujar abans de topar amb la hitbox del buc, mentre els laterals continuen sent sòlids;
  - els helicòpters poden aterrar-hi i quedar transportats;
  - quan estan aterrat sobre la coberta, els helicòpters segueixen també el moviment vertical, el capcineig i el balanceig del ferry sobre les ones;
  - els vehicles transportats conserven la seva posició i orientació relatives quan el ferry avança o gira;
  - els helicòpters es desacoblen de la coberta quan tornen a enlairar-se.
- El buc continua tenint col·lisió pròpia, però la zona útil de rampes/coberta no bloqueja els vehicles que hi accedeixen.

### Física
- Perfils diferenciats terra/aigua/aire.
- Inèrcia, grip, deriva, massa i resposta de gir específics per família.
- Col·lisions OBB entre vehicles.
- Impactes amb jugador, soldats, roques, palmeres i filferrada.
- Tombar una palmera resta sempre exactament 1 impacte estructural al vehicle.
- Atropellar un soldat no resta impactes estructurals al vehicle; es mantenen el dany al soldat i la pèrdua de velocitat.
- Una envestida prou ràpida pot trencar filferrada i parets normals:
  - filferrada: llindar de velocitat 8 i cost fix de 2 impactes estructurals;
  - paret: llindar de velocitat 14 i cost fix de 3 impactes estructurals.
- Excepció del tanc: no rep mai dany estructural per col·lisions físiques i trenca parets/filferrada sempre que les toca, sense llindar mínim de velocitat.
- Aquesta immunitat és només per col·lisions; armes i explosions continuen podent danyar el tanc.
- Les portes no es consideren parets envestibles per aquesta regla.
- Blindatge, vida estructural, fum de dany, destrucció i debris.
- Els vehicles conserven inèrcia després que el jugador en baixi.

### Tanc
- Escala actual: 2.25.
- Erugues arrodonides amb baules animades.
- Animació diferencial de les erugues durant girs i pivot.
- Canó principal visualment recte; només la trajectòria del projectil baixa **5°**.

### Tanqueta
- Sis rodes, sense erugues.
- Canó/metralladora visualment recte; només les bales mantenen la trajectòria inclinada 5° cap avall.
- Escala actual: 1.8125.
- Metralladora ràpida.

### Camió
- Escala actual: 1.8125.
- Model militar de sis rodes.

### Helicòpters
- L'helicòpter normal i el de combat disparen a **30° cap avall**.
- Els míssils de l'helicòpter de combat també surten a 45° cap avall.
- L'helicòpter de combat és més ràpid i maniobrable que el normal.
- Controls tàctils d'altitud compartits: ⬆️ / ⬇️.
- L'helicòpter de combat té un botó 🚀 separat, situat a l'esquerra del botó 🎯.
- La pulsació llarga del botó de tret ja no llança míssils.
- Teclat: `G` continua sent l'arma secundària compatible.

### Windsurf
- Rider dempeus amb cames pràcticament rectes.
- Mans al travesser.
- Tors i cap girats cap a la vela.
- Braços i cames mantenen la postura específica de navegació.

### Barca de rems
Redissenyada el 2026-10-06 segons la referència de fusta aportada:
- buc obert amb proa apuntada, popa ampla, borda, juntes de taulons i dos bancs;
- un rem articulat a cada costat, conservant el cicle de remada del joc;
- jugador assegut al banc de proa, d’esquena a la proa i mirant cap a popa/càmera habitual;
- peus dirigits cap a popa; braços calculats a partir dels punts d’agafada reals dels rems, també amb balanceig i gir del vehicle;
- peces fixes fusionades per material: 1.932 triangles i 15 crides de dibuix per barca buida en la previsualització aïllada, sense ombres;
- escala, caixa de col·lisió, controls i resposta de conducció conservats;
- ajust del 2026-10-06: flotació 30 cm més baixa (offset de +0,20 a −0,10 m respecte de la superfície local);
- màscara stencil de 14 triangles a l’obertura, solidària amb el buc: sòlids primer, màscara invisible després i mar al final. No escriu color ni profunditat, no projecta ombres i no genera fragments en destruir-se;
- renderer amb stencil activat; només el material del mar consulta la màscara. Una crida de dibuix addicional per barca visible, sense textures ni un segon renderitzat de l’escena.

Validació: model buit i ocupat inspeccionat des de proa i popa; entrada i moviment dins del joc en Chromium/WebGL 2 amb perfil mòbil, sense errors de consola. Smoke complet superat sobre la base amb les optimitzacions i orografia noves; afegides 24 postures que comproven el contacte mà-rem, orientació i peus. Reparades dues cometes imbricades de les proves de tanc i una comprovació literal de palmeres que encara usava el nom antic de la funció de dany. Aquesta revisió del model encara no s’ha provat en un Android físic.

---

## Combat i destrucció

- Pistola, ganivet, bazooka, granades, explosius plantats, canons, metralladores, coets i míssils.
- Cada objecte de granades recollit afegeix 5 granades a l'inventari.
- Les granades s'equipen des de l'inventari i es llencen amb Dispar; bazooka i granades són equipaments exclusius entre si.
- El jugador sosté una granada a la mà dreta amb el braç lleugerament enrere i separat; en llançar, el braç va cap endavant i amunt i la granada s'allibera aproximadament als 0,23 s.
- La granada segueix una trajectòria parabòlica amb gravetat i explota en tocar la superfície, una paret o un sostre, o en acabar el fusible.
- Potència de granada: radi 16 i dany base 100, equivalent a l'explosiu plantat anterior.
- Els explosius plantats s'han reforçat a 3×: radi 48 i dany base 300.
- Les granades apareixen al pool general, amb prioritat especial als polvorins (garantides, amb possibilitat d'una segona caixa) i a les avançades (80% de probabilitat).
- Bazooka d'un sol ús.
- Filferrada, vehicles, torres i diversos elements del món són destructibles.
- Vehicles destruïts generen fragments del model.
- Soldats morts conserven una animació de caiguda abans de desaparèixer.
- Torres destruïdes es desmunten en peces.
- Els marcadors d'intel·ligència deixen de referenciar vehicles destruïts.

---

## UI i controls

- Joystick virtual analògic en mòbil.
- WASD/fletxes continuen disponibles.
- HUD simplificat.
- Inventari en graella.
- Les caixes de munició sumen directament **40** al comptador de munició i no creen cap entrada a l'inventari.
- Switch **Gràfics reduïts** a la portada; en Android el perfil reduït continua activant-se automàticament.
- Botons contextuals per vehicles i helicòpters.
- Minimapa i carta de navegació modulars.
- Selector de llavor i mida de mapa a la pantalla inicial.
- La portada reutilitza una captura real de l'inici de partida desada localment; no genera un món extra.

**Pendent real:** calibratge final de mida/sensibilitat i ergonomia en Android físic.

---

## Optimització — roadmap completat

Les cinc millores prioritzades el 2026-10-05 estan implementades.

### 1. ✅ Índex espacial d'illes
- Graella de 512 m.
- Cada illa s'indexa fins a 2× el seu radi d'influència útil.
- `rawHAt()` només examina candidates locals.
- Es conserva l'equivalència matemàtica amb l'escaneig complet.

### 2. ✅ Índexs espacials de vehicles, enemics, parets i edificis
- Graella dinàmica de 64 m per vehicles.
- Índex local d'enemics.
- Graella lazy de 64 m per `Wl`.
- Graella lazy de 96 m per edificis.
- Col·lisions, moviment enemic, línia de visió i impactes utilitzen candidats locals.

### 3. ✅ Percepció enemiga desacoblada
- Percepció a 10 Hz.
- Fases repartides entre enemics.
- `sight()` cachejat a `u.canSee`.
- `chooseDefense()` cachejat a `u.defenseTarget`.
- Moviment, animació i dispars continuen a freqüència de frame.

### 4. ✅ Broad-phase i trajectes segmentats dels projectils
- Eliminat el micro-substepping global de 0,008 s.
- Parets/teulades: segment–AABB.
- Enemics/vehicles/jugador: segment–esfera.
- Terreny i arbres mantenen mostreig curt al llarg del segment.
- Explosions també utilitzen índexs espacials.

### 5. ✅ LOD lògic
- Vehicles no pilotats:
  - < 500 m: visual cada frame;
  - 500–1.200 m: cada 0,1 s;
  - > 1.200 m: cada 0,45 s.
- Edificis: visibilitat/materials cada 0,2 s.
- Ítems: animació només dins de 500 m.
- Fauna:
  - < 650 m: cada frame;
  - fins a 1.400 m: cada 0,12 s;
  - més lluny: cada 0,4 s.
- Diverses comprovacions de proximitat utilitzen distància al quadrat en lloc de `Math.hypot()`.
- IA, projectils i col·lisions crítiques no es congelen per distància.

---

## Validació automatitzada

### Model del protagonista i conductors
`node tests/player-model.cjs` comprova model compartit, 2.636 triangles del cos, genolls en caminar/nedar, equipament, disfressa i postures dels set conductors. `tests/player-model-browser.cjs` genera captures WebGL del model i cada vehicle obert; usa les mateixes variables `PLAYWRIGHT_MODULE` i `BROWSER_EXECUTABLE_PATH` que la prova de navegador.

### Smoke
`tests/smoke.cjs` cobreix, entre altres:
- arrencada diferida;
- generació del món;
- vehicles;
- articulacions;
- postura de rem i contacte mà-rem durant 24 fases;
- erugues;
- OBB;
- destrucció;
- flotació;
- pausa/reinici;
- vegetació;
- índex espacial d'illes;
- índexs de vehicles/parets/edificis;
- percepció enemiga cachejada;
- col·lisions segmentades de projectils;
- LOD lògic.

### Generació de motos aquàtiques
`tests/jet-skis.cjs`: costa recta controlada amb els helpers OBB reals; desplaçament de 100 m, destinació ocupada, mínim de quatre, separació de ferris/llanxes/vehicles enemics, límits de les dues mides i passada final repetible. `tests/smoke.cjs` comprova també recompte i absència de solapaments en un món complet.

### Aigua
`tests/water.cjs` comprova:
- coherència CPU/GLSL;
- triangulació;
- mides de mapa;
- perfils de segments;
- bounds;
- resize;
- disposal.

### Màscara de la barca
`tests/rowboat-water.cjs` comprova al navegador WebGL l’interior amb aigua oculta, amb màscara i sense màscara, en tres fases d’onatge i orientacions. L’interior emmascarat coincideix amb el terra sec; l’aigua exterior coincideix amb la versió sense màscara. Comprova també l’offset de flotació. Execució igual que `tests/browser.cjs` (Playwright, `PLAYWRIGHT_MODULE` i `BROWSER_EXECUTABLE_PATH` opcionals).
Validat en Chromium amb SwiftShader i perfil mòbil. Les lectures de píxels de la prova poden produir un avís de sincronització GPU; no formen part del bucle del joc. Pendent provar aquest ajust en Android físic.

### Navegador
`tests/browser.cjs` cobreix:
- arrencada real;
- perfils desktop/mobile;
- compilació de shaders;
- vehicles;
- sRGB;
- controls contextuals;
- pausa/represa;
- captures de base i costa.

---

L’usuari confirma el 2026-10-05 que la versió modernitzada funciona en Android; això no substitueix una mesura prolongada de rendiment.

## Pendents reals

### Prioritat alta
1. Prova prolongada de 20–30 minuts en Android físic.
2. Mesurar FPS, frame time, memòria i temperatura en dispositiu real.
3. Revisar ergonomia del joystick i dels controls d'helicòpter.
4. Comprovar visualment el LOD i les noves optimitzacions en mapa gran.

### Prioritat mitjana
1. Refinar escuma i costa de l'aigua.
2. Calibrar transparències, ombres i exposició en GPU mòbil real.
3. Continuar reduint globals compartits de `game-core.js` amb dependències explícites.
4. Mesurar abans/després dels hot paths per quantificar el guany de les optimitzacions ja implementades.

### Regla de compatibilitat
No reescriure simultàniament simulació i renderer d'un mateix sistema. Quan es modularitzi una part del nucli, conservar temporalment els contractes que utilitza el gameplay fins que la nova ruta estigui validada.






