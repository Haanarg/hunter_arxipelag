# Hunter: Arxipèlag — estat visual i tècnic

Document consolidat de l'estat actual del projecte.  
S'han eliminat plans de treball completats, registres històrics substituïts i descripcions de versions intermèdies que ja no representen el joc actual.

## Sistema de versions

Versió actual: **0.3.2**.

La versió del joc es defineix en un únic punt: `src/version.mjs`, mitjançant la constant `GAME_VERSION`. La pantalla inicial llegeix aquesta constant i mostra la versió en un cantó, de manera que la UI i el codi comparteixen la mateixa font de veritat.

### Criteri de numeració

- **Versió base o salt major de desenvolupament:** `0.1`, `0.2`, `0.3`...
  - S'utilitza quan hi ha un conjunt important de canvis: sistemes nous, canvis substancials de gameplay, reestructuracions rellevants o fites clares del projecte.
- **Revisió menor:** `0.1.1`, `0.1.2`, `0.1.3`...
  - S'utilitza per correccions, ajustos petits, poliment, equilibratge o millores puntuals que no justifiquen un salt a `0.2`.
- Després d'un salt major, el comptador de revisions torna a zero implícitament: per exemple, de `0.1.4` a `0.2`, i després `0.2.1`.
- Cada vegada que es publiqui un canvi a `main` que vulguem identificar com una revisió o una nova fita, s'ha d'actualitzar `GAME_VERSION`.
- Aquest document s'ha de mantenir coherent amb la versió publicada.

La versió **0.1** correspon a l'estat del joc en el moment d'introduir aquest sistema de versionat. La versió **0.2** introdueix el ferry i, sobretot, el primer sistema de transport de vehicles sobre una plataforma mòbil. La revisió **0.2.1** evita que la llanxa inicial comparteixi posició amb un ferry: si hi ha solapament, la llanxa es desplaça 100 m paral·lelament a la costa, mantenint-se a l'aigua. La revisió **0.2.2** corregeix l'orientació inicial del ferry perquè la proa apunti cap al mar i el jugador quedi encarat mar endins quan en pren el control. La revisió **0.2.3** distribueix els dos ferris entre costes d'illes diferents de tot el mapa, en lloc de concentrar-los a l'illa inicial. La versió **0.3** incorpora una pantalla integrada de cerca de llavors que prova mapes amb el generador real i ordena els resultats per distància entre la base inicial i el ferry més proper. La revisió **0.3.1** augmenta moderadament la velocitat dels dos vehicles aquàtics principals: la llanxa passa a 35 de velocitat punta i el ferry a 15; el ferry conserva una acceleració baixa per mantenir la sensació de massa. La revisió **0.3.2** separa l'orientació visual dels canons de la trajectòria dels projectils: tanqueta i tanc mantenen el canó recte, mentre la tanqueta dispara 5° cap avall i el tanc redueix la seva caiguda de 20° a 5°.

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
- `src/enemy-ai.js`: IA enemiga.
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
  - els helicòpters poden aterrar-hi i quedar transportats;
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
- L'helicòpter normal i el de combat disparen a 45° cap avall.
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
- escala, caixa de col·lisió, controls i física conservats.

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

### Aigua
`tests/water.cjs` comprova:
- coherència CPU/GLSL;
- triangulació;
- mides de mapa;
- perfils de segments;
- bounds;
- resize;
- disposal.

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

