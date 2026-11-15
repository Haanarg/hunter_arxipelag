# Helicòpters definitius de Hunter: Arxipèlag — geometria nativa Three.js

Els dos helicòpters es construeixen al motor del joc amb `THREE.BufferGeometry`,
material PBR, pivots separats per als dos rotors i geometria compartida entre
instàncies SOLO i COOP. **Els GLB de runtime s'han eliminat del repositori**
en adoptar aquesta implementació. Les fonts externes conserven la seva autoria
i llicència Creative Commons Attribution 4.0.

## Kamov Ka-60 — variant A

- Model propi Three.js, sense textura externa ni GLB.
- Variant A exacta del laboratori (`src/kamov-reference-candidates.mjs`), escala mundial ×2, rodes, dos seients i fenestron.
- Adaptador: `src/ka60-runtime.mjs`. Pivots independents; dades de contacte calculades del model.
- El Huey de Duane's Mind (CC BY 4.0) és una referència històrica retirada de la distribució actual; l'atribució i els fitxers originals es conserven a l'historial Git.

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
  Ka-60, i són utilitzats per l'animació del motor.

## Integració i verificacions

- `src/bootstrap.mjs`: prepara els models abans d'iniciar el motor clàssic.
- `src/vehicle-model-core.mjs`: fàbrica síncrona única de SOLO i COOP.
- `src/vehicle-specs.mjs`, `src/game-core.js`: dimensions de col·lisió
  proporcionals als augments de mida, contacte de patins/rodes i rotor.
- `helicopters-engine-compare.html`: previsualització de les geometries
  definitives amb materials i vista en filferro.
- `tests/ka60-game-integration.mjs`, `tests/apache-approved.cjs`,
  `tests/apache-native-runtime.mjs`: proves estructurals de geometria,
  rodes, escala i integració.
- **Pendent:** inspecció visual en un navegador i comprovació del pilotatge,
  els ocupants, les ombres i l'aterratge en una partida real (SOLO/COOP/Android).

L'atribució a Araon acompanya la distribució actual; Duane's Mind conserva l'atribució a l'historial de l'antic Huey.
