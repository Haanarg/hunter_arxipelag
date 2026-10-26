# Optimització conservadora dels vehicles — 0.5.106

## Origen
Auditoria pesada (llavor 2407759483, X=1208, Z=−1594, qualitat Alts) a v0.5.105: ~805 crides de dibuix, de les quals ~358 eren del grup vehicles i ~196 dels cotxes civils visibles.

## Canvis implementats
1. **C1A**: el model manté les quatre rodes animades i els dos pivots davanters de direcció. Les peces rígides germanes que comparteixen material es fusionen dins del pivot de cada roda, incloent els radis, els dos tapaboques i els dos centres. No se suprimeix cap triangle. Cada roda creada tenia 17 malles; la fusió conservadora pot deixar-ne 4 (un pneumàtic, un conjunt de tapaboques, un conjunt de centres i un conjunt de radis): **fins a 52 malles menys per cotxe**. El valor exacte es reporta al joc.
2. **Altres vehicles**: el mateix batching s'aplica a la fàbrica de tots els vehicles. Només fusiona malles opaques i rígides amb material idèntic, flags d'ombres i de càmera idèntics, sense referències d'animació ni noms propis, i al **mateix parent**. Els grups de rodes, rems, torretes, timons, rotor, vela i punts de foc es conserven. No hi ha canvis de silueta, textures, materials ni física.
3. **Patrulleres**: després de col·locar els dos soldats i els muntatges de metralladora i coets, un segon batching agrupa les seves peces rígides aptes, respectant els braços dels soldats, els pivots i els punts de dispar. L'LOD d'enemics existent continua actiu.
4. **Auditoria**: cada arrel de vehicle conserva `vehicleBatchStats`; les patrulleres afegeixen `marineBatchStats`. `vehicleFleet` informa `meshes` (després), `savedMeshes` (estalvi acumulat) i `originalMeshes` (abans), a més del recompte anterior de vehicles i ombres. La finestra de `?perfAudit=1` presenta els models que més malles estalvien.

## Preservació visual i mecànica
- No es modifiquen els perfils gràfics, els límits de visibilitat, les distàncies de les ombres, els materials transparents, les malles amb materials múltiples, ni els pivots referenciats per `userData`.
- Els radis mantenen la geometria, però s'agrupen en una malla per material i pivot.
- El batch només es construeix quan es crea el model, no cada fotograma.
- La memòria compartida de vehicles en cache continua utilitzant `HUNTER_RESOURCES.cloneModel` i preserva els camps `userData`.

## Regressions
`node tests/vehicle-batching.cjs` comprova amb models reals que:
- Els cotxes C1A mantenen quatre rodes, dos pivots, el bounding box i el nombre de triangles.
- Les rodes continuen girant i la direcció continua funcionant.
- Les altres fàbriques conserven els pivots i redueixen o mantenen el nombre de malles.
- Els muntatges de les armes de les patrulleres mantenen les referències dels punts de dispar.

També: `node tests/optimization-ui-render-hooks.cjs`, `node tests/player-batching.cjs`, `node tests/shadow-boat-cache.cjs` i `node tools/build-runtime.cjs --check`.

**Pendent**: l'impacte real sobre FPS, CPU del renderitzador i crides totals requereix repetir la mateixa prova en navegador amb `?perfAudit=1&stress=1`; la reducció teòrica no és una mesura d'FPS.
