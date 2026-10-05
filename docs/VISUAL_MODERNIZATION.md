# Hunter: Arxipèlag — estat visual i tècnic

Document consolidat de l'estat actual del projecte.  
S'han eliminat plans de treball completats, registres històrics substituïts i descripcions de versions intermèdies que ja no representen el joc actual.

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
- Tret principal inclinat 20° cap avall.

### Tanqueta
- Sis rodes, sense erugues.
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
Estat actual deliberadament simplificat per continuar-ne el redisseny:
- eliminat el buc detallat anterior;
- cos únic marró, ovalat i apuntat;
- rems i pivots conservats;
- animació de rem sincronitzada amb el moviment.

---

## Combat i destrucció

- Pistola, ganivet, bazooka, canons, metralladores, coets i míssils.
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
