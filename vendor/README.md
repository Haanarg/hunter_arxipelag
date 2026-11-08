# Three.js local

- Paquet fixat: **three@0.186.1**, revisió `186`, llicència MIT.
- Entrada oficial: https://registry.npmjs.org/three/-/three-0.186.1.tgz
- Integritat npm: `sha512-blFeqb49wRCSGUGj7gtpfnSGHy2lwDk94RhUmS1c/hTby70kvChbWpkJ4Pm1390LqzzvTmzgXKHPEafJwCb8jA==`.
- Distribució: `three-r186.module.mjs`; ESM únic generat des de `build/three.module.js` i `build/three.core.js`, sense modificar el motor.
- SHA-256: `ed11a90814a27be663f430328985511ad86e03fd56a610d2347eea6f3139e705`.
- Llicència completa a [THREE-LICENSE.txt](THREE-LICENSE.txt); avisos originals conservats al bundle.
- Cap CDN durant l’arrencada. El joc requereix HTTP i WebGL 2.

## Reproducció del bundle

Descarrega el paquet amb `npm pack three@0.186.1`, verifica’n la integritat indicada i extreu-lo. Amb esbuild **0.25.12**:

```sh
esbuild package/build/three.module.js --bundle --format=esm --minify --target=es2020 --legal-comments=inline --outfile=vendor/three-r186.module.mjs
cp package/LICENSE vendor/THREE-LICENSE.txt
```

No cal npm ni compilació per servir el joc. El carregador és `src/bootstrap.mjs`; els sistemes clàssics mantenen temporalment el pont `window.THREE`. L’antiga r128 es conserva a l’historial Git.

## Carregador GLB local per a les previsualitzacions

- `three-addons/loaders/GLTFLoader.js`, `three-addons/utils/BufferGeometryUtils.js` i `three-addons/utils/SkeletonUtils.js` són còpies dels mòduls oficials Three.js **r186**, distribuïts sota la mateixa llicència **MIT** de Three.js (vegeu `THREE-LICENSE.txt`).
- Origen: https://github.com/mrdoob/three.js/tree/r186/examples/jsm
- L'`importmap` de `vehicles-externs-proves.html` resol tant `three` com `three/addons/` contra fitxers locals. No es necessita jsDelivr per carregar els GLB guardats a `assets/vehicle-candidates/`.
- El carregador és exclusivament per al laboratori de models; el joc principal no el carrega durant una missió.

## Models definitius de vehicles

Els models CC0 acceptats de moto (`Naked streetfighter`) i moto aquàtica (`Recreational Jet Ski`) són **mòduls locals de geometria precompilada**, incorporats a `src/streetfighter-25-geometry.mjs` i `src/jet-ski-25-geometry.mjs`.

La simplificació es va executar una vegada durant la preparació de l'actiu. Els modificadors `SimplifyModifier.js` i `meshopt_simplifier.module.js` ja no són necessaris i han estat retirats, com també els GLB i les proves de les motos acceptades. No hi ha simplificació en temps de joc ni al banc de comparació dels nou vehicles que continuen pendents.
