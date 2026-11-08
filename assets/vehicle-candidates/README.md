# Models externs pendents de triar

El banc de proves `/vehicles-externs-proves.html` conserva **26 GLB CC0 (8,55 MiB)** de **nou tipus de vehicles** que encara no tenen un model definitiu acceptat. Ni la moto ni la moto aquàtica no s'hi mostren; els seus models nous ja són dins del joc.

## Models de moto acceptats

**Motocicleta (Naked streetfighter, GLB de 3dassets.dev, actiu 15425).** S'ha seleccionat l'última variant, **nivell de reducció 25%**, precompilada a `src/streetfighter-25-geometry.mjs` i connectada a la fàbrica de `src/vehicle-model-core.mjs`. La geometria original tenia 4.908 triangles; la variant integrada en conserva **3.862**: el percentatge 25% és l'objectiu de reducció de les peces simplificables, **no** el total final, ja que els pneumàtics, radis, llandes, forquilla, manillar i agafadors no es redueixen. S'han eliminat el cavallet, els retrovisors i les peces vermelles giratòries.

El manillar i els agafadors estan units a la corona de la forquilla i a la roda del davant a través d'un sol pivot de direcció, amb una tija de connexió visible. Les rodes giren independentment de la direcció. L'escala uniforme és el **75% de la mida ajustada del model antic**, prenent la dimensió limitant (amplada), i genera una carrosseria d'uns **0,99 × 2,83 m en escena** després de l'escala general de vehicle. Les peces antigament blaves (`paint`) prenen un dels set colors vius de la paleta, de manera cíclica i determinista per llavor, sense canviar les tirades RNG. La posició de braços, peus i seient del motorista s'ha adaptat a la nova mida.

Origen i llicència: https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-naked-streetfighter-9916850c (CC0 1.0).

**Moto aquàtica.** `Recreational Jet Ski` (actiu 39428), de 2.578 triangles, té la geometria precompilada a `src/jet-ski-25-geometry.mjs`. Només `jetski-engine-cover` rep els set colors vius; la resta de materials són fixos. La distribució manté el RNG de la generació de món.

Origen i llicència: https://3dassets.dev/assets/beach-surf-and-paddle-kit-recreational-jet-ski-a61d9936 (CC0 1.0).

Els **tres GLB de moto i tres de moto aquàtica** s'han eliminat de `assets/vehicle-candidates` després de convertir els acceptats en mòduls de geometria locals. Els models procedimentals antics de la moto i de la moto aquàtica també s'han retirat de la fàbrica. No hi ha cap descàrrega de GLB o simplificació meshoptimizer en temps de partida. S'han eliminat els mecanismes de simplificació de la pàgina i les seves proves de GLB acceptats.

## Altres decisions

El **camió militar, la barca de rems i el windsurf** es conserven amb els models originals; s'han retirat del banc de candidats. La **llanxa** encara té models en revisió.

El manifest `manifest.json` conté les mides, la llicència i la procedència dels 26 GLB pendents. Catàleg: https://3dassets.dev/ ; llicència: https://creativecommons.org/publicdomain/zero/1.0/.

Per tornar a recollir candidats, `node tools/fetch-vehicle-candidates.mjs` només recorre els tipus encara presents al catàleg, de manera que **no torna a baixar les motos acceptades ni els vehicles descartats**.

**Pendents de validació visual:** al navegador, comprovar l'encaix del pilot a la moto, el gir dels agafadors i la forquilla, el contacte amb terra i els radis, la diversitat de colors i la paritat SOLO/COOP/Android. Les proves automàtiques cobreixen els punts de dades i la jerarquia de pivots, no una inspecció WebGL real.
