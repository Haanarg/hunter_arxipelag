# Candidats de vehicles en revisió

Aquesta carpeta guarda **32 models externs GLB CC0**, aproximadament **9,89 MiB**, per al laboratori `/vehicles-externs-proves.html`. **No substitueixen automàticament cap model del joc.**

## Decisions del 8 de novembre del 2026

- **Camió militar, barca de rems i windsurf:** es conserven els models procedimentals originals. No apareixen al selector de candidats; els 6 GLB del camió i la barca s'han esborrat de Git, i no hi havia GLB de windsurf.
- **Moto:** opció núm. 2, `Naked streetfighter`. Les propostes eliminen els nodes `side-stand` i `naked-streetfighter_13` (vidres dels retrovisors), i fan girar 180° el node `handlebar`. Cal comprovar visualment si les tiges dels retrovisors estan fusionades amb el xassís i necessiten un retoc addicional.
- **Moto aquàtica:** opció núm. 3, `Recreational Jet Ski`.
- **Moto i moto aquàtica:** el comparador mostra el model del joc, el GLB descarregat sense retocar i quatre variants **simplificades realment** amb els percentatges objectiu de vèrtexs 85%, 65%, 45%, 25%. El nombre real de triangles es calcula i es mostra al navegador (meshoptimizer, carregador local Three.js r186). No guardam quatre còpies quasi idèntiques de cada GLB: es deriven en memòria per evitar inflar el repositori.
- La **llanxa** continua al catàleg existent. La petició d'afegir un nou apartat de llanxa va arribar incompleta; no se n'ha suposat el contingut.

## Models i manifest

`manifest.json` és la font dels fitxers existents, la procedència, els nombres de triangles i la llicència. Els models externs provenen de https://3dassets.dev/ i consten com a **CC0 1.0 Universal**. Text legal: https://creativecommons.org/publicdomain/zero/1.0/.

Es poden incorporar altres candidats executant `node tools/fetch-vehicle-candidates.mjs` (Node.js 22). El script només recorre els tipus del catàleg actual: **no torna a descarregar les opcions descartades**. Límits voluntaris: 2 MiB per fitxer i 30 MiB totals.

Per comparar i acceptar una variant al joc encara caldrà revisar visualment l'encaix i després integrar-ne articulacions, seients, hitboxes, física, animacions i materials. La simplificació en memòria del laboratori no altera aquests sistemes.
