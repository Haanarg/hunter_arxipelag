# Hunter: Arxipèlag

Joc 3D per al navegador inspirat en *Hunter* (Amiga). Comença a la teva base, explora un arxipèlag procedural, aconsegueix equipament i elimina el general de l’HQ enemic.

[Jugar](https://hunter.paradoxa.cat/) · [Estat del projecte i pendents](docs/VISUAL_MODERNIZATION.md)

## Executar en local

Cal un navegador amb WebGL 2 i servir **tota la carpeta** per HTTP; `index.html` no és un fitxer autònom.

```sh
python3 -m http.server 8000
```

Obre http://localhost:8000. Three.js 0.186.1 es carrega des de `vendor/`, sense CDN ni compilació necessària. La versió del joc té una única font: `src/version.mjs`.

## Controls

| Control | Acció |
|---|---|
| WASD / fletxes | Avançar, frenar i girar |
| Y / U | Desplaçament lateral a peu, en hovercraft i helicòpters |
| E / Acció | Entrar o sortir del vehicle; obrir l’inventari si no n’hi ha cap a prop |
| F / Dispar | Disparar; amb granades, mantenir per carregar i deixar anar per llançar |
| T / Mira | Òptica x8 del rifle de franctirador |
| H / J | Pujar / baixar l’helicòpter |
| G | Míssil de l’helicòpter de combat; altrament, col·locar un explosiu |
| I o R | Inventari |
| M | Mapa |
| C / L | Disfressa / anotar coordenades |
| Esc o P | Pausa / reprendre |
| Arrossegar / roda | Orientar la vista / zoom de càmera |

Amb la mira activa, els controls de moviment orienten la mira i el personatge queda quiet. En mòbil hi ha joystick, desplaçament lateral i botons contextuals. Els mapes recollits s’activen automàticament. Els ajustos gràfics i interruptors de diagnòstic són al menú **Rendiment**, accessible des de la portada i la pausa.

## Contingut implementat

- Mapes de 4,8 × 4,8 km o 9,6 × 9,6 km, llavor configurable i cercador per vehicles, objectes o complexos.
- **15 vehicles conduïbles:** cotxe, moto, bicicleta, camió, tanqueta, tanc, helicòpter, helicòpter de combat, llanxa, llanxa llançacoets, moto aquàtica, hovercraft, ferry, barca de rems i windsurf.
- **8 tipus de complexos:** base, HQ, hangar, avançada, port, heliport, polvorí i comunicacions; les tres fases de renovació estan integrades.
- Edificis explorables i destructibles, filferrada, molls, patrulles, persecució enemiga pels accessos dels edificis i general com a objectiu de missió.
- Pistola, ganivet, granades, bazooka, rifle de franctirador, explosius, disfressa, farmacioles, mapes i paracaigudes.
- Transport de vehicles en ferry, natació, onatge, fauna, models articulats i tres perfils gràfics.

## Desenvolupament i comprovacions

`src/bootstrap.mjs` carrega el motor i `src/runtime-scripts.mjs` fixa l’ordre dels sistemes. `src/game-core.js` conserva l’estat compartit; generació, combat, IA, models i renderitzat tenen mòduls propis. El detall de l’arquitectura, les decisions i els pendents es manté en un únic [document d’estat](docs/VISUAL_MODERNIZATION.md).

Proves específiques, sense navegador:

```sh
node tests/compound-preview.cjs
node tests/compound-generation.cjs
node tests/terrain-stream.cjs
node tests/graphics-quality.cjs
node tests/seed-search.cjs
node tests/smoke.cjs
node tests/seed-replay.cjs
```

`tests/smoke.cjs` comprova conjuntament arrencada, combat, inventari, vehicles, pausa i reinici amb DOM i renderer simulats; té un workflow propi a GitHub. `tests/seed-replay.cjs` reconstrueix diversos mapes i comprova que una llavor reprodueixi el mateix món. Executa aquestes dues proves de generació seqüencialment per evitar competència pels recursos. Els resultats i els límits coneguts consten a l’apartat de validació del [document d’estat](docs/VISUAL_MODERNIZATION.md).

Per a WebGL, instal·la Playwright i Chromium i executa `node tests/browser.cjs` o `node tests/compound-game-browser.cjs`. Es poden indicar `PLAYWRIGHT_MODULE` i `BROWSER_EXECUTABLE_PATH`; les captures es guarden al directori temporal. L’emulació mòbil no substitueix les mesures en Android físic.

Laboratoris conservats per a iteracions visuals:

- [Models, caps i ganivet](proves.html).
- [Dispar a dues mans](dispar-proves.html).
- [Explosius](explosius-proves.html).
- [Complexos, fases 1–3 integrades](compounds-preview.html).
- [Fase 4: recintes nous, variants i base–costa](compounds-preview.html?fase=4): 21 dissenys, encara fora del generador. [Criteris i distribucions](docs/COMPOUNDS_PHASE4.md).

## Publicació i llicències

`main` és la branca oficial. El domini del joc és https://hunter.paradoxa.cat/, amb desplegament a Cloudflare Pages; no s’ha de reintroduir GitHub Pages. Els workflows del repositori fan comprovacions i tasques auxiliars.

Three.js es distribueix sota MIT: [llicència](vendor/THREE-LICENSE.txt) i [procedència i reproducció](vendor/README.md). El projecte no té encara una llicència pròpia de distribució.
