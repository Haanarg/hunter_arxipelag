## Blindats renovats — M1A1 i NZLAV 8×8 (2026-11-08)

Els **sis GLB antics** del tanc i de la tanqueta (Main Battle Tank, Light Tank, Self-Propelled Gun, Tracked APC, Wheeled APC i Armoured Car) s'han rebutjat i esborrat. El nou banc compara els models **realment identificats** a Sketchfab i no representa un GLB descarregat: el visor oficial és extern i cada autor controla la descàrrega. El joc i les seves col·lisions NO han canviat.

- **Tanc: M1A1/M1 Abrams.** Quasar (29.000 triangles, CC BY 4.0), Scril (12.300 triangles, CC BY 4.0) i Artem Goyko (40.200 triangles, CC BY 4.0).
- **Tanqueta: referència NZLAV 8×8.** Stryker de bunny (137.900 triangles, CC BY-SA 4.0), M1128 Stryker 8×8 de LM3D (231.700 triangles, CC BY 4.0) i BTR 82 low-poly de SIpriv (21.500 triangles, CC BY 4.0). Cap dels tres és un NZLAV exacte; el BTR és una alternativa més distant. La fidelitat i les llicències s'han etiquetat explícitament.
- S'han **exclòs** el LAV III ISC descarregable però extret de *Combat Mission* (CC BY-NC) i altres models extrets de jocs. Aquests no són una font adequada per publicar el joc.
- El límit del descarregador per GLB queda a **32 MiB per fitxer i 128 MiB totals**, sense modificar els 14 GLB locals existents; els models remots tenen uns límits de polígons independents i caldrà optimitzar-los abans de la integració. Els fitxers de Sketchfab no es descarreguen ni publiquen automàticament.
- Font, autor, llicència i recompte de triangles: `manifest.json > externalModels`. Les descàrregues requereixen acció directa de l'usuari al lloc original. Per comparar un GLB a Three.js es pot fer servir `Importa GLB` al banc de proves; fins que no s'importi, el panell és el visor oficial Sketchfab.

# Models externs pendents de triar

El banc de proves `/vehicles-externs-proves.html` conserva **20 GLB CC0** de **set tipus de vehicles** que encara no tenen un model definitiu acceptat. La moto, la moto aquàtica i els dos helicòpters estan acceptats i no figuren entre els candidats. L'Apache definitiu encara té pendent la publicació del GLB de producció.

## Models de moto acceptats

**Motocicleta (Naked streetfighter, GLB de 3dassets.dev, actiu 15425).** S'ha seleccionat l'última variant, **nivell de reducció 25%**, precompilada a `src/streetfighter-25-geometry.mjs` i connectada a la fàbrica de `src/vehicle-model-core.mjs`. La geometria original tenia 4.908 triangles; la variant integrada en conserva **3.862**: el percentatge 25% és l'objectiu de reducció de les peces simplificables, **no** el total final, ja que els pneumàtics, radis, llandes, forquilla, manillar i agafadors no es redueixen. S'han eliminat el cavallet, els retrovisors i les peces vermelles giratòries.

El manillar i els agafadors estan units a la corona de la forquilla i a la roda del davant a través d'un sol pivot de direcció, amb una tija de connexió visible. Les rodes giren independentment de la direcció. La variant es va generar inicialment al **75% de la mida del model antic**, però a la **versió 0.6.187** s'ha ampliat un **50% respecte de la variant anterior**. La carrosseria visible ara fa aproximadament **1,49 × 4,25 unitats** després de l'escala general. Les dimensions de col·lisió s'han adaptat i la tija manillar–forquilla s'ha escurçat i reculat per evitar que sobresurti per davant. Les peces antigament blaves (`paint`) prenen un dels set colors vius de la paleta, de manera cíclica i determinista per llavor, sense canviar les tirades RNG. La posició de braços, peus i seient del motorista s'ha adaptat a la nova mida.

Origen i llicència: https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-naked-streetfighter-9916850c (CC0 1.0).

**Moto aquàtica.** `Recreational Jet Ski` (actiu 39428), de 2.578 triangles, té la geometria precompilada a `src/jet-ski-25-geometry.mjs`. Només `jetski-engine-cover` rep els set colors vius; la resta de materials són fixos. La distribució manté el RNG de la generació de món.

Origen i llicència: https://3dassets.dev/assets/beach-surf-and-paddle-kit-recreational-jet-ski-a61d9936 (CC0 1.0).

Els **tres GLB de moto i tres de moto aquàtica** s'han eliminat de `assets/vehicle-candidates` després de convertir els acceptats en mòduls de geometria locals. Els models procedimentals antics de la moto i de la moto aquàtica també s'han retirat de la fàbrica. No hi ha cap descàrrega de GLB o simplificació meshoptimizer en temps de partida. S'han eliminat els mecanismes de simplificació de la pàgina i les seves proves de GLB acceptats.

## Altres decisions

El **camió militar, la barca de rems i el windsurf** es conserven amb els models originals; s'han retirat del banc de candidats. La **llanxa** encara té models en revisió.

El manifest `manifest.json` conté les mides, la llicència i la procedència dels 20 GLB pendents. Catàleg: https://3dassets.dev/ ; llicència: https://creativecommons.org/publicdomain/zero/1.0/.

Per tornar a recollir candidats, `node tools/fetch-vehicle-candidates.mjs` només recorre els tipus encara presents al catàleg, de manera que **no torna a baixar les motos acceptades ni els vehicles descartats**.

**Pendents de validació visual:** al navegador, comprovar l'encaix del pilot a la moto, el gir dels agafadors i la forquilla, el contacte amb terra i els radis, la diversitat de colors i la paritat SOLO/COOP/Android. Les proves automàtiques cobreixen els punts de dades i la jerarquia de pivots, no una inspecció WebGL real.
