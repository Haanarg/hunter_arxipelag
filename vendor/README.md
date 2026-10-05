# Three.js local

- Paquet fixat: **three@0.186.1**, revisió `186`, llicència MIT.
- Entrada oficial: https://registry.npmjs.org/three/-/three-0.186.1.tgz
- Integritat npm: `sha512-blFeqb49wRCSGUGj7gtpfnSGHy2lwDk94RhUmS1c/hTby70kvChbWpkJ4Pm1390LqzzvTmzgXKHPEafJwCb8jA==`.
- Distribució: `three-r186.module.mjs`; ESM únic generat des de `build/three.module.js` i `build/three.core.js`, sense modificar el motor.
- SHA-256: `ed11a90814a27be663f430328985511ad86e03fd56a610d2347eea6f3139e705`.
- Llicència completa a `THREE-LICENSE.txt`; avisos originals conservats al bundle.
- Cap CDN durant l’arrencada. El joc requereix HTTP i WebGL 2.

## Reproducció del bundle

Descarrega el paquet amb `npm pack three@0.186.1`, verifica’n la integritat indicada i extreu-lo. Amb esbuild **0.25.12**:

```sh
esbuild package/build/three.module.js --bundle --format=esm --minify --target=es2020 --legal-comments=inline --outfile=vendor/three-r186.module.mjs
cp package/LICENSE vendor/THREE-LICENSE.txt
```

No cal npm ni compilació per servir el joc. El carregador és `src/bootstrap.mjs`; els sistemes clàssics mantenen temporalment el pont `window.THREE`. L’antiga r128 es conserva a l’historial Git.
