# Helicòpters definitius de Hunter: Arxipèlag — geometria nativa Three.js

Els dos helicòpters es construeixen al motor del joc amb `THREE.BufferGeometry`,
material PBR, pivots separats per als dos rotors i geometria compartida entre
instàncies SOLO i COOP. **Els GLB de runtime s'han eliminat del repositori**
en adoptar aquesta implementació. Les fonts externes conserven la seva autoria
i llicència Creative Commons Attribution 4.0.

## Huey UH-1 — Duane's Mind

- **Autor i font:** [Bell Huey helicopter, Duane's Mind](https://sketchfab.com/3d-models/bell-huey-helicopter-755d8518a06e41b19752c1b54c0da588).
- **Llicència:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Geometria:** `src/huey-duane-native-geometry.mjs`. 1.767 triangles
  extrets amb fidelitat dels accessors GLB 100% aprovats, amb les portes
  laterals de passatgers obertes, normals, UV i jerarquia originals.
- **Pintura/textures:** atles original separat a
  `assets/vehicle-models/huey-duane-native-atlas.png` (926.565 bytes).
- **Modificacions per al joc:** **10% més gran** que l'aprovat anterior
  (escala local 1.35 → 1.485), seients tridimensionals de pilot i copilot
  a la cabina, textura i materials originals, rotors independents.
  Els dos seients afegeixen 352 triangles: **2.119 triangles totals**.
- **Carregador natiu:** `src/huey-duane-runtime.mjs`; ni GLB ni
  `GLTFLoader` ni cap descàrrega de malla. La textura PNG s'ha de carregar
  una sola vegada pel navegador, compartida entre la flota.
- **Contacte amb el sòl:** punt inferior dels patins a .405 unitats locals,
  amb altura del rotor calculada a partir del nou model.

## Apache AH-64 — Araon

- **Autor i font:** [AH-64 Apache, Araon](https://sketchfab.com/3d-models/ah-64-apache-df0993ee21e74a759cd0519f6fc51cf8).
- **Llicència:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Geometria:** `src/apache-araon-runtime.mjs` reconstrueix malles
  `BufferGeometry` des de dades APG2 compactades dins del mateix mòdul
  JavaScript (18.862 bytes deflate; 2.173 triangles de la geometria 50%
  abans de substituir les rodes). No depèn de GLB ni de fitxers .zlib.
- **Rodes:** retirada selectiva de triangles de les antigues rodes deformades
  de la malla compacta i construcció nativa de tres pneumàtics circulars
  `CylinderGeometry`, boixes i tirants, materials negre/grafit.
- **Color:** sàlvia mat i elements negres; la variant compacta representa
  el pintat mitjançant colors de vèrtex en lloc de les textures del GLB antic.
- **Mida:** **50% més gran** que la variant anterior (longitud objectiu
  7.15 → 10.725 unitats locals); dades de contacte i col·lisió ajustades.
- **Rotors:** els pivots principal i de cua queden separats, igual que el
  Huey, i són utilitzats per l'animació del motor.

## Integració i verificacions

- `src/bootstrap.mjs`: prepara els models abans d'iniciar el motor clàssic.
- `src/vehicle-model-core.mjs`: fàbrica síncrona única de SOLO i COOP.
- `src/vehicle-specs.mjs`, `src/game-core.js`: dimensions de col·lisió
  proporcionals als augments de mida, contacte de patins/rodes i rotor.
- `helicopters-engine-compare.html`: previsualització de les geometries
  definitives amb materials i vista en filferro.
- `tests/huey-approved.cjs`, `tests/apache-approved.cjs`,
  `tests/apache-native-runtime.mjs`: proves estructurals de geometria,
  rodes, escala i integració.
- **Pendent:** inspecció visual en un navegador i comprovació del pilotatge,
  els ocupants, les ombres i l'aterratge en una partida real (SOLO/COOP/Android).

L'atribució a Duane's Mind i Araon ha d'acompanyar qualsevol distribució del
joc que inclogui les seves geometries modificades.
