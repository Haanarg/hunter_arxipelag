# Húnter: Arxipèlag

Joc 3D per al navegador inspirat en Hunter (Amiga), amb arxipèlags generats a cada partida. Comença a la teva base, busca equipament i elimina el general al quarter general enemic.

## Jugar

Obre `index.html` en un navegador amb WebGL. La branca principal (`main`) inclou Three.js r128 a l’HTML i mòduls locals a `src/`. Els colors de jugador/enemics i fauna estan centralitzats i els models de personatge tenen una lectura visual més marcada, mantenint l’estètica low-poly. Conserva tota la carpeta: `index.html` ja no és autònom.

També pots servir aquesta carpeta amb `python3 -m http.server 8000` i obrir http://localhost:8000.

## Controls

- WASD o fletxes: moviment i gir.
- E: entrar o sortir d’un vehicle.
- F: disparar; G: col·locar explosius.
- C: disfressa; L: anotar coordenades; M: mapa.
- U/J: pujar o baixar l’helicòpter.
- Esc/P o Ⅱ: pausa. El reinici és al menú de pausa.
- Roda del ratolí: zoom. Controls tàctils disponibles.

## Contingut

Mapa de 4,8 × 4,8 km, set tipus de vehicles, edificis explorables amb escales, objectes, enemics, destrucció, platges amb escuma, fons marí profund i natació de braça.

## Desenvolupament

La versió actual separa renderitzat, aigua, terreny, vehicles, controls, vegetació, edificis, personatges, paleta visual i fauna en mòduls locals. L’HTML encara inclou Three.js i el nucli de simulació. Conserva l’avís de llicència de Three.js quan el distribueixis.

Executa `node tests/smoke.cjs` per comprovar arrencada i regressions bàsiques sense GPU. La renderització visual encara requereix comprovació en un navegador amb WebGL.

El seguiment i les tasques pendents són a [docs/VISUAL_MODERNIZATION.md](docs/VISUAL_MODERNIZATION.md). `main` és la base oficial de desenvolupament. No hi ha desplegament configurat al repositori; no s’ha d’activar GitHub Pages. El desplegament previst és mitjançant Cloudflare Pages a `hunter.paradoxa.cat`.

## Dependència

Three.js r128, distribuït sota llicència MIT. L’avís original està inclòs a `index.html`. Aquest projecte no té encara una llicència pròpia de distribució.
