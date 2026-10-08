# Húnter: Arxipèlag

Joc 3D per al navegador inspirat en Hunter (Amiga), amb arxipèlags generats a cada partida. Comença a la teva base, busca equipament i elimina el general al quarter general enemic.

## Jugar

Serveix el projecte per HTTP i obre’l en un navegador amb WebGL 2. La branca principal (`main`) carrega Three.js 0.186.1 (ESM) des de `vendor/` i els sistemes locals de `src/`. Els colors de jugador/enemics i fauna estan centralitzats i els models de personatge tenen una lectura visual més marcada, mantenint l’estètica low-poly. Conserva tota la carpeta: `index.html` ja no és autònom.

Pots servir aquesta carpeta amb `python3 -m http.server 8000` i obrir http://localhost:8000.

## Controls

La interfície principal es manté minimalista: joystick, Dispar i Acció. Farmacioles, explosius, disfressa i mapa es gestionen des d'un inventari en graella.


- WASD o fletxes: moviment i gir.
- E: entrar o sortir d’un vehicle.
- F: disparar; G: col·locar explosius.
- C: disfressa; L: anotar coordenades; M: mapa.
- U/J: pujar o baixar l’helicòpter.
- Esc/P o Ⅱ: pausa. El reinici és al menú de pausa.
- Roda del ratolí: zoom. Controls tàctils disponibles.

## Contingut

Mapa seleccionable de 4,8 × 4,8 km o 9,6 × 9,6 km amb llavor configurable, catorze tipus de vehicles, camió militar, compounds funcionals, heliports protegits (avançades, garatges amb hangars, ports i polvorins), edificis explorables, camins i molls, patrulles i defensa contextual, HQ fortificat, objectes, destrucció, platges amb escuma, fons marí profund i natació de braça.

## Desenvolupament

La versió actual separa renderitzat, aigua, terreny, vehicles, controls, vegetació, edificis, personatges, paleta visual i fauna en mòduls locals. L’HTML és ara la portada i el carregador. El nucli és a `src/game-core.js`; generació, combat, IA i àudio tenen arxius propis. Conserva l’avís de llicència de Three.js quan el distribueixis.

Executa `node tests/smoke.cjs` per comprovar arrencada, els 14 vehicles i regressions bàsiques sense GPU, i `node tests/water.cjs`, `node tests/terrain-stream.cjs` i `node tests/vegetation-lod.cjs`, `node tests/seed-search.cjs` i `node tests/seed-search-integration.cjs` per verificar la coherència de l’onatge i els perfils de malla. La migració també s’ha comprovat amb Chromium i WebGL 2 (SwiftShader), en perfils d’escriptori i mòbil. Rendiment i ergonomia en Android físic pendents. Per repetir la prova real, instal·la Playwright i Chromium i executa `node tests/browser.cjs`. Pots indicar un navegador existent amb `BROWSER_EXECUTABLE_PATH` i un paquet Playwright extern amb `PLAYWRIGHT_MODULE`. Les captures es guarden al directori temporal.

El seguiment i les tasques pendents són a [docs/VISUAL_MODERNIZATION.md](docs/VISUAL_MODERNIZATION.md). `main` és la base oficial de desenvolupament. No hi ha desplegament configurat al repositori; no s’ha d’activar GitHub Pages. El desplegament previst és mitjançant Cloudflare Pages a `hunter.paradoxa.cat`.

## Dependència

Three.js 0.186.1, distribuït sota llicència MIT. La llicència completa és a `vendor/THREE-LICENSE.txt`; procedència i reproducció a `vendor/README.md`. Aquest projecte no té encara una llicència pròpia de distribució.


Els vehicles disposen de blindatge i vida estructural. La versió actual inclou també barca de rems, windsurf, tanqueta blindada, helicòpter de combat amb míssils limitats i llanxa llançacoets.


