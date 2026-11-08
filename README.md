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
- L'Apache d'Araon encara és un candidat en revisió, no un model definitiu del joc.

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
