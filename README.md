# Hunter: Arxipèlag

Joc 3D per al navegador, inspirat en *Hunter* (Amiga): explora un arxipèlag procedural, aconsegueix equipament i elimina el general de l'HQ enemic. Inclou un mode individual i una adaptació cooperativa dins del mateix motor 3D.

**[Jugar](https://hunter.paradoxa.cat/)** · **[Tasques pendents i pla d'optimització](to-do.MD)**

## Estat del projecte

- El joc individual és el punt de referència funcional i visual.
- El COOP utilitza el **runtime original**: pantalla completa, tercera persona, HUD i controls originals; servidor autoritatiu a Cloudflare Worker/Durable Objects.
- La paritat de tots els sistemes i la validació de rendiment en dos dispositius encara necessiten comprovacions reals. Les proves Node no equivalen a prova GPU ni a desplegament.
- La versió canònica és `src/version.mjs`. No confiar en les versions de documents històrics per determinar l'estat actual.
- **La llista única de feines pendents és [to-do.MD](to-do.MD).** Els documents de `docs/` expliquen disseny, decisions i contractes, no són un segon backlog.

## Executar en local

Requereix Node per a les eines, i un navegador compatible amb WebGL 2. Serveix tota la carpeta per HTTP; `index.html` no és autònom.

```bash
npm ci --ignore-scripts
python3 -m http.server 8000
# Obrir http://localhost:8000
```

El codi clàssic de joc es concatena **sense reordenar globals ni reescriure sintaxi** a partir de `src/runtime-scripts.mjs`. Les importacions ESM s'inicialitzen a `src/bootstrap.mjs`. No editar `dist/hunter-runtime.*.js` ni `src/runtime-bundle.mjs` manualment.

```bash
npm run check:version # comprova versió a la portada i importacions
npm run sync:version  # sincronitza imports després d'editar src/version.mjs
npm run build         # regenera bundle de producció + manifest
npm run check:build   # verifica versió, fonts, manifest i bundle
npm run build:worker  # prepara el Worker
```

## Proves

La bateria habitual s'ha reduït a **13 comprovacions essencials**. Es conserva la verificació de versió, arrencada del món i objectiu, moviment, rellotge, dany de vehicles, guardat i autodesat, sincronització i inici del COOP, sales i backend.

```bash
npm ci --ignore-scripts
npm test             # bateria bàsica (també npm run test:basic)
npm run check:build  # coherència del bundle de producció
```

`npm run test:regression:once` es manté com a àlies compatible de `npm test`. Les regressions especialitzades antigues s'han retirat, i també els workflows manuals de proves. El workflow únic `.github/workflows/rebuild-runtime.yml` executa la bateria bàsica i comprova/regenera el runtime.

Les proves Node no substitueixen una partida real, una revisió WebGL/Android o una sessió HOST/GUEST en dos dispositius. Els recursos de `tests/fixtures/` i `tests/helpers/` es conserven per prudència.

## Estructura del codi

| Ubicació | Funció |
| --- | --- |
| `src/game-core.js` i `src/runtime-scripts.mjs` | Bucle/estat original i ordre del motor |
| `src/world-generation.js`, `terrain.js`, `compound-*` | Generació del món, terreny i complexos |
| `src/combat.js`, `enemy-ai.js`, `vehicle-*` | Combat, IA i vehicles |
| `src/*-core.mjs` | Regles compartides o dades independents de la representació |
| `src/coop-world-runtime.js`, `native-coop-*.mjs` | Adaptació i presentació cooperativa original |
| `server/` | Autoritat COOP, comptes, missió, persistència i API Worker |
| `tests/` | Bateria essencial del motor i del COOP, més recursos compartits |
| `tools/` | Generació de bundles, Worker i desplegament |
| `dist/` i `vendor/` | Bundle generat i dependències locals de producció |
| `docs/` | Decisions/contractes tècnics i guia d'auditoria |

## Crèdits de models 3D

- **Huey UH-1 de Duane's Mind** — [Bell Huey helicopter](https://sketchfab.com/3d-models/bell-huey-helicopter-755d8518a06e41b19752c1b54c0da588), llicència [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Modificat per obrir les dues portes laterals de passatgers; [detalls de la modificació i atribució](assets/vehicle-models/README.md). Model definitiu integrat al joc.
- **Apache AH-64 d'Araon** — [model original](https://sketchfab.com/3d-models/ah-64-apache-df0993ee21e74a759cd0519f6fc51cf8), CC BY 4.0. Variant seleccionada: sàlvia mat, aspes i detalls negres, fuselatge 50%/rodes 75%, 2.193 triangles. S'ha connectat a `heli_combat`; **la publicació del GLB binari definitiu encara està pendent** i fins aleshores s'empra la reserva procedural. [Crèdits i instruccions](assets/vehicle-models/README.md).

## Laboratori de models 3D — editor de proves per defecte

**Tanqueta BTR-82 (prototip geomètric actual):** comparativa en tres targetes: base de treball, casc **v3** (`src/btr82-hull-v3.mjs`) i casc **v2** (`src/btr82-hull-v2.mjs`). La v3 modifica la silueta frontal i baixa el sostre de 1,87 a 1,68 m; la panxa estreta central, situada entre les rodes, baixa de 0,39 a 0,15 m. La malla està tancada i és simètrica, amb rodes i canó original conservats. S'ha eliminat la v1. De moment no hi ha fars ni petits detalls, i no està integrat al joc. La casella «Provar el casc girat 90° + ample/llarg intercanviats» està activada inicialment i transforma només la malla del casc v3: (X,Z)→(Z·ample/llarg, −X·llarg/ample) al voltant del centre. Es pot desactivar per comparar la v3 original. Rodes i canó no canvien. Aquest assaig intercanvia les cares dels laterals amb les de la proa/popa, però no garanteix simetria perfecta després de traslladar les diferències entre morro i darrere. Cal validar visualment abans de consolidar la transformació.


El banc de proves de vehicles és [vehicles-externs-proves.html](vehicles-externs-proves.html), publicat a `https://hunter.paradoxa.cat/vehicles-externs-proves.html`. La interfície de referència incorpora l'**editor de marques 3D**, reutilitzable per a tots els vehicles i per a futurs models. El codi general és `src/vehicle-annotation-editor.mjs`; no s'ha d'acoblar exclusivament a la tanqueta.

Modes de l'editor: **Unir peces** (grups acolorits), **Tapar forats** (cercle sobre la superfície real; verd si identifica un contorn de vora lliure simple i prou pla, blau si no) i **Eliminar peces** (marques no destructives). **Tapar forats modifica la geometria de la variant en memòria amb un clic** quan troba un contorn segur, amb «Desfer» per recuperar la malla i el material; el mode blau només registra una anotació de zona pendent. La reparació topològica resideix a `src/vehicle-hole-brush.mjs` i no fa servir plans virtuals. La resta de marques no modifiquen malles i es poden copiar amb coordenades i instruccions. Alt + arrossegar gira la càmera i Alt + roda fa zoom. Els tancaments fets a memòria no es desen automàticament al GLB del repositori. La casella **Forats grans (contorn tancat)** amplia la cerca fins a llaços més extensos (pinzell fins a 2,5 m, contorns amb més vèrtexs, proximitat a arestes i comprovació d'àrea/planaritat); el visor mostra la triangulació en verd abans de clicar i es pot desfer. **No** resol desaparicions d'una cara completa sense perímetre de vores tancat: cal una reconstrucció manual que encaixi a les vores reals. L'eina **Pintar xapa (arrossegar)** (`src/vehicle-surface-paint.mjs`) crea una cinta de triangles mentre es pinta, vinculada a la superfície del model, amb un pont tangent de màxim 0,58 m si el raig travessa una escletxa. Es pot reflectir automàticament al pla X=0 amb «Simetria de la xapa». Es mostra al moment i es retira amb «Desfer». No solda les vores ni fa simètrica tota la geometria preexistent; les reparacions continuen sent temporals en memòria i requereixen validació visual.

El BTR-82 conserva una comparativa de base i low-poly, però l'eina d'anotació es manté independent de les transformacions específiques del BTR-82. L'exportació de marques permet iterar amb seleccions reproduïbles sense fer reconstruccions cegues de la carrosseria. **La presència del codi i les proves Node no equivalen a validació en navegador**; les comprovacions pendents es registren a `to-do.MD`.

## Documents de referència

- [Pla de refactorització i tasques vigents](to-do.MD).
- [Com mesurar rendiment i comparar versions](docs/PERFORMANCE_TESTING.md).
- [Principis del COOP dins el motor original](docs/COOP_REBUILD.md).
- [Integració nativa COOP i antecedents tècnics](docs/COOP_NATIVE_RUNTIME.md).
- [Validació COOP sense Actions](docs/COOP_OFFLINE_VALIDATION.md).
- [Auditoria d'extraccions compartides](docs/SHARED_ENGINE_AUDIT.md).
- [Comptes i autoritat](docs/ACCOUNTS_HISTORY_AUTHORITY.md).
- [Notes de disseny visual](docs/VISUAL_MODERNIZATION.md).
- [Regles del camp de presoners](docs/PRISON_CAMP_RESCUE.md).

## Invariants de manteniment

1. No substituir el joc cooperatiu per un client o generador alternatiu; adaptar el motor original.
2. Una llavor igual ha de correspondre al mateix món en individual i COOP.
3. Una refactorització no ha de canviar balanç, RNG, física, serialització, dades de partides o qualitat sense requeriment explícit.
4. Validar sempre el bundle generat, els tests afectats, la renderització real i el Worker publicat per separat.
5. Registrar qualsevol tasca o validació no feta únicament a `to-do.MD`; no crear nous `PROGRESS`, `PHASE` o informes de pendents per versió.
