## Models BTR-82 publicats directament al visor (2026-11-09)

El model original i les reduccions 75%, 50%, 25% (SIpriv · CC BY 4.0) es carreguen des de
`assets/vehicle-candidates/tanqueta/` sense importar arxius locals. Fitxers:
`btr82-original.glb`, `btr82-75pct.glb`, `btr82-50pct.glb`, `btr82-25pct.glb`.
Els tres GLB precomputats són la geometria validada anteriorment (16.109/10.745/5.371
triangles, 18 malles) i no se simplifiquen de nou al navegador. El 100% en conserva
21.483 triangles, 199 malles. El seu origen i les llicències continuen visibles.

Per transferir els binaris aprovats, s'ha creat una càrrega comprimida efímera a
`assets/vehicle-candidates/tanqueta/.btr82-viewer-transfer.tar.xz`; GitHub Actions
verifica el SHA256, n'extreu els quatre models, valida els GLB, elimina l'arxiu
temporal i publica els quatre fitxers finals. Les proves eviten versions corruptes
o models equivocats. En cas de no disposar dels assets, el visor conserva l'opció
d'importar el GLB i generar els LOD.

## 2026-11-09 — BTR-82: tres reduccions conservadores 75/50/25%

Els nivells 5%, 4%, 3% i 2% han quedat descartats: perdien massa silueta. El banc de tanqueta mostra només el vehicle actual del joc, el GLB original 100% (21.483 triangles, 199 malles) i les tres reduccions 75%, 50%, 25%. El model del joc continua intacte.

Les tres variants descarregables en el ZIP de la conversa s'han reconstruït amb VTK DecimatePro (offline), preservant els 11 PNG originals amb paleta i transparència, les vuit rodes i la torreta i fusionant les peces compatibles en 18 malles. S'ha validat la càrrega glTF, la integritat de les UV i els límits geomètrics per evitar deformacions.

| Detall | Triangles offline | Malles |
|---|---:|---:|
| 100% | 21.483 | 199 |
| 75% | 16.109 | 18 |
| 50% | 10.745 | 18 |
| 25% | 5.371 | 18 |

El banc genera els mateixos percentatges amb SimplifyModifier/meshoptimizer de Three.js r186, que pot donar xifres diferents; cada targeta mostra els triangles i malles reals. També es poden importar els GLB precomputats directament al panell corresponent sense resimplificar-los. El sistema reconeix els noms btr82-75pct.glb, btr82-50pct.glb i btr82-25pct.glb i rebutja els GLB antics de 5/4/3/2%.

**Llicència:** Low Poly BTR 82 de SIpriv, CC BY 4.0 — https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5

**Pendent:** els nous GLB s'han lliurat en un ZIP de la conversa; no s'han publicat els binaris a GitHub. La web permet importar-los i guarda el model original en aquest navegador. Encara cal triar el nivell final i validar-lo al joc en SOLO/COOP.

---
## Correcció d'importació i textures — 2026-11-09

L'usuari va detectar dos errors reals: els quatre nivells semblaven duplicar el 100% i els GLB externs del ZIP anterior no es veien.

1. **Paleta original perduda.** Els GLB reduïts offline del primer ZIP tenien 11 textures PNG amb valors de paleta reinterpretats com RGB (0..16) i alfa 0..1, per sota del tall de 0,05: els models quedaven invisibles. S'han regenerat quatre GLB amb les onze textures PNG originals i la seva paleta/transparència. El nou paquet (distribuït en aquesta conversa, no allotjat a GitHub) inclou també l'original adaptat a PBR de Three.js.
2. **Importació de variants.** Abans, tots els GLB importats es tractaven com a originals i es re-simplificaven. Ara s'identifiquen per recompte de triangles, malles i nom (5pct/4pct/3pct/2pct): els GLB ja reduïts es mostren directament al panell adequat, sense tocar els altres. El 100% activa la generació automàtica dels quatre LOD.
3. **Compatibilitat dels GLB antics.** Quan l'original és present al navegador, els LOD recuperen els seus materials i textures per nom; sense l'original, els quatre GLB vells específics reben colors sòlids de reserva en lloc de quedar invisibles. Es recomana substituir-los pels GLB corregits.
4. **Diagnòstic.** Cap reducció amb més del 70% dels triangles d'origen o sense fusió de malles es pot mostrar com si hagués arribat al 5/4/3/2%; es mostra un error. Els recomptes reals són visibles. Una prova addicional executa el simplificador real contra un model sintètic de 199 malles i verifica que els LOD siguin progressivament menors.

No s'han alterat els models de la partida. Les quatre variants offline corregides tenen 1.077/875/654/448 triangles i 18 malles cadascuna.

## Reduccions agressives BTR-82 — 2026-11-09

El model original **Low Poly BTR 82**, de **SIpriv** (Sketchfab, **CC BY 4.0**), s'ha rebut de l'usuari. Mida: **1.592.644 bytes**, **21.483 triangles i 199 malles**.

La pestanya Tanqueta compara el model jugable amb l'original 100% i quatre versions ultralleugeres **5%, 4%, 3% i 2%**. En comptes de reduir 199 peces aïllades, s'agrupen per material i rol (casc/torreta/vuit rodes). El GLB original queda en **18 grups** de dibuix, preservant els pivots de la torreta i de les vuit rodes. El motor executa el `SimplifyModifier` (Three.js r186/meshoptimizer); per topologies molt discontínues, utilitza `MeshoptSimplifier.simplifySloppy` i reindexa les UV, les normals i les altres dades dels vèrtexs. El percentatge és un **objectiu**, no una garantia exacta: la web indica triangles i malles reals.

Versions precomputades **fora del navegador** amb VTK Quadric Decimation, per comparació (no confondre amb el resultat Meshopt del motor): **5% = 1.077 △ / 18 malles**, **4% = 875 △ / 18**, **3% = 654 △ / 18**, **2% = 448 △ / 18**. Incloses al ZIP generat en aquesta conversa; no estan pujades al repositori.

**Fitxer de producció pendent:** el binari del BTR-82 original no es pot publicar directament amb el connector GitHub textual. La web intenta carregar `assets/vehicle-candidates/tanqueta/btr82-original.glb`; si no hi és, s'ha d'importar una sola vegada al visor, que el conserva a IndexedDB.

El GLB original conté l'extensió requerida `KHR_materials_pbrSpecularGlossiness`, no admesa pel GLTFLoader de Three.js r186. L'importador la converteix en PBR metallic-roughness abans de crear els quatre LOD, mantenint geometria, textures i animacions del fitxer original.

No s'ha canviat el model jugable; cal revisar silueta, rodes, torreta, normals, UV i rendiment (SOLO/COOP) abans de decidir un LOD.

## BTR-82 seleccionat i reduccions (2026-11-09)

L'únic candidat de tanqueta és **Low Poly BTR 82** de **SIpriv** (CC BY 4.0). Les dues opcions Stryker de bunny i M1128 de LM3D s'han retirat del catàleg i del manifest; mai no s'havien descarregat els seus GLB.

La pestanya **Tanqueta** del banc general `/vehicles-externs-proves.html` mostra el model actual del joc i els cinc nivells del BTR-82: **100% original** (referència) i quatre simplificacions reals **75%, 50%, 25% i 10%**. S'utilitza el `SimplifyModifier` de Three.js r186 (meshoptimizer), amb malles, UV i materials conservats. Les malles complexes de múltiples materials, morph targets o gairebé sense triangles es preserven sense simplificar per evitar deformacions; els percentatges de triangles reals es mostren a cada targeta.

El banc carrega `assets/vehicle-candidates/tanqueta/btr82-original.glb` si existeix, o permet importar-lo amb **Importa GLB**. Un cop importat, el guarda en IndexedDB d'aquest navegador i genera els quatre nivells. Cada targeta permet desar el seu GLB individual; aquests binaris no es publiquen automàticament a GitHub.

**Limitació actual:** en aquest torn no s'ha rebut cap GLB BTR-82 muntable com a adjunt i el fitxer encara no és present al repositori. La generació real encara necessita la importació del GLB. El model del joc no s'ha canviat. Respectar l'atribució de l'autor SIpriv (CC BY 4.0).

## Blindats renovats — M1A1 i NZLAV 8×8 (2026-11-08)

Els **sis GLB antics** del tanc i de la tanqueta (Main Battle Tank, Light Tank, Self-Propelled Gun, Tracked APC, Wheeled APC i Armoured Car) s'han rebutjat i esborrat. El nou banc compara els models **realment identificats** a Sketchfab i no representa un GLB descarregat: el visor oficial és extern i cada autor controla la descàrrega. El joc i les seves col·lisions NO han canviat.

- **Tanc: M1A1/M1 Abrams.** Quasar (29.000 triangles, CC BY 4.0), Scril (12.300 triangles, CC BY 4.0) i Artem Goyko (40.200 triangles, CC BY 4.0).
- **Tanqueta: referència NZLAV 8×8.** Stryker de bunny (137.900 triangles, CC BY-SA 4.0), M1128 Stryker 8×8 de LM3D (231.700 triangles, CC BY 4.0) i BTR 82 low-poly de SIpriv (21.500 triangles, CC BY 4.0). Cap dels tres és un NZLAV exacte; el BTR és una alternativa més distant. La fidelitat i les llicències s'han etiquetat explícitament.
- S'han **exclòs** el LAV III ISC descarregable però extret de *Combat Mission* (CC BY-NC) i altres models extrets de jocs. Aquests no són una font adequada per publicar el joc.
- El límit del descarregador per GLB queda a **32 MiB per fitxer i 128 MiB totals**, sense modificar els 14 GLB locals existents; els models remots tenen uns límits de polígons independents i caldrà optimitzar-los abans de la integració. Els fitxers de Sketchfab no es descarreguen ni publiquen automàticament.
- Font, autor, llicència i recompte de triangles: `manifest.json > externalModels`. Les descàrregues requereixen acció directa de l'usuari al lloc original. Per comparar un GLB a Three.js es pot fer servir `Importa GLB` al banc de proves; fins que no s'importi, el panell és el visor oficial Sketchfab.

# Models externs pendents de triar

El banc de proves `/vehicles-externs-proves.html` conserva **14 GLB CC0** i **4 referències externes** de **set tipus de vehicles** que encara no tenen un model definitiu acceptat. La moto, la moto aquàtica i els dos helicòpters estan acceptats i no figuren entre els candidats. L'Apache definitiu ja té el GLB aprovat publicat a `assets/vehicle-models/`.

## Models de moto acceptats

**Motocicleta (Naked streetfighter, GLB de 3dassets.dev, actiu 15425).** S'ha seleccionat l'última variant, **nivell de reducció 25%**, precompilada a `src/streetfighter-25-geometry.mjs` i connectada a la fàbrica de `src/vehicle-model-core.mjs`. La geometria original tenia 4.908 triangles; la variant integrada en conserva **3.862**: el percentatge 25% és l'objectiu de reducció de les peces simplificables, **no** el total final, ja que els pneumàtics, radis, llandes, forquilla, manillar i agafadors no es redueixen. S'han eliminat el cavallet, els retrovisors i les peces vermelles giratòries.

El manillar i els agafadors estan units a la corona de la forquilla i a la roda del davant a través d'un sol pivot de direcció, amb una tija de connexió visible. Les rodes giren independentment de la direcció. La variant es va generar inicialment al **75% de la mida del model antic**, però a la **versió 0.6.187** s'ha ampliat un **50% respecte de la variant anterior**. La carrosseria visible ara fa aproximadament **1,49 × 4,25 unitats** després de l'escala general. Les dimensions de col·lisió s'han adaptat i la tija manillar–forquilla s'ha escurçat i reculat per evitar que sobresurti per davant. Les peces antigament blaves (`paint`) prenen un dels set colors vius de la paleta, de manera cíclica i determinista per llavor, sense canviar les tirades RNG. La posició de braços, peus i seient del motorista s'ha adaptat a la nova mida.

Origen i llicència: https://3dassets.dev/assets/motorcycle-racing-and-street-bikes-naked-streetfighter-9916850c (CC0 1.0).

**Moto aquàtica.** `Recreational Jet Ski` (actiu 39428), de 2.578 triangles, té la geometria precompilada a `src/jet-ski-25-geometry.mjs`. Només `jetski-engine-cover` rep els set colors vius; la resta de materials són fixos. La distribució manté el RNG de la generació de món.

Origen i llicència: https://3dassets.dev/assets/beach-surf-and-paddle-kit-recreational-jet-ski-a61d9936 (CC0 1.0).

Els **tres GLB de moto i tres de moto aquàtica** s'han eliminat de `assets/vehicle-candidates` després de convertir els acceptats en mòduls de geometria locals. Els models procedimentals antics de la moto i de la moto aquàtica també s'han retirat de la fàbrica. No hi ha cap descàrrega de GLB o simplificació meshoptimizer en temps de partida. S'han eliminat els mecanismes de simplificació de la pàgina i les seves proves de GLB acceptats.

## Altres decisions

El **camió militar, la barca de rems i el windsurf** es conserven amb els models originals; s'han retirat del banc de candidats. La **llanxa** encara té models en revisió.

El manifest `manifest.json` conté les mides, la llicència i la procedència dels 14 GLB locals pendents, i les sis referències de blindats en `externalModels`. Catàleg: https://3dassets.dev/ ; llicència: https://creativecommons.org/publicdomain/zero/1.0/.

Per tornar a recollir candidats, `node tools/fetch-vehicle-candidates.mjs` només recorre els tipus encara presents al catàleg, de manera que **no torna a baixar les motos acceptades ni els vehicles descartats**.

**Pendents de validació visual:** al navegador, comprovar l'encaix del pilot a la moto, el gir dels agafadors i la forquilla, el contacte amb terra i els radis, la diversitat de colors i la paritat SOLO/COOP/Android. Les proves automàtiques cobreixen els punts de dades i la jerarquia de pivots, no una inspecció WebGL real.
