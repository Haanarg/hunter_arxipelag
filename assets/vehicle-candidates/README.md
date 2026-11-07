# Candidats de vehicles (provisional)

Aquesta carpeta guarda només **alternatives GLB CC0** per comparar-les a
`/vehicles-externs-proves.html`. No canvien ni la fàbrica ni la física del joc.

## Desar les alternatives

Des de l'arrel del repositori, amb Node.js 22 i connexió:

```bash
node tools/fetch-vehicle-candidates.mjs
```

La descàrrega resol les 3 propostes de cadascun dels 14 vehicles del
`src/vehicle-candidate-catalog.mjs`, verifica la llicència CC0 declarada,
la capçalera GLB 2.0, i guarda els fitxers com
`assets/vehicle-candidates/<tipus>/<opció>-<slug>.glb`.
Genera `manifest.json` amb URL original, identificador, mida, triangles i
llicència. La pàgina de proves prefereix aquests fitxers locals; si no
existeixen, intenta carregar-los des del catàleg extern.
Els GLB són de tercers i s'han de revisar visualment abans d'integrar-los.

Límits voluntaris: **2 MiB per model, 30 MiB per a tota la carpeta**.
Els candidats que no es troben, superen el límit o no poden descarregar-se
no es guarden. Les opcions de ferri, llanxa armada i windsurf inclouen
referències que encara poden requerir reedició important.

## Origen i llicència

Font: https://3dassets.dev/ (packs especificats al catàleg).
Els models seleccionats han d'indicar `CC0 1.0 Universal`.
Referència legal: https://creativecommons.org/publicdomain/zero/1.0/

Les descripcions, les URLs i la mida **no** equivalen a una validació de
l'encaix visual o tècnic. El model definitiu requereix adaptar seients,
animacions, col·lisions, punts d'armes i jerarquia de Three.js.

En descartar una alternativa, es pot eliminar el seu GLB i actualitzar
el manifest (o tornar a executar el script amb `--force`).

**Estat inicial:** carpeta i descarregador preparats. Comprovar
`manifest.json` i els fitxers `.glb` reals abans d'afirmar que s'han desat.
