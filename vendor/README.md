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

## Simplificació de candidats

El taller de models incorpora el modificador oficial de Three.js **r186**:
`three-addons/modifiers/SimplifyModifier.js`, i la seva dependència
`three-addons/libs/meshopt_simplifier.module.js`, basada en **meshoptimizer**.
El modificador i les utilitats de Three.js es distribueixen sota **MIT**;
meshoptimizer també sota **MIT**, amb el copyright original
«Copyright (C) 2016-2026, by Arseny Kapoulkine (arseny.kapoulkine@gmail.com)»,
inclòs a la capçalera del fitxer. Font:
https://github.com/mrdoob/three.js/tree/r186/examples/jsm.

Només es carreguen al laboratori extern `vehicles-externs-proves.html`,
mai durant el joc. Els quatre LOD es deriven en memòria: no es creen
quatre fitxers duplicats de les motocicletes.
