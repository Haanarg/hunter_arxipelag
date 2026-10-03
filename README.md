# Húnter: Arxipèlag

Joc 3D per al navegador inspirat en Hunter (Amiga), amb arxipèlags generats a cada partida. Comença a la teva base, busca equipament i elimina el general al quarter general enemic.

## Jugar

Obre `index.html` en un navegador amb WebGL. El fitxer inclou Three.js r128 i no necessita instal·lació ni connexió a internet.

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

La versió actual és un HTML autònom. El primer script conté Three.js; el segon conté la lògica del joc. Conserva l’avís de llicència de Three.js quan el distribueixis.

Les proves de simulació de la versió exportada han passat; la renderització visual encara requereix comprovació en un navegador amb WebGL.

## Dependència

Three.js r128, distribuït sota llicència MIT. L’avís original està inclòs a `index.html`. Aquest projecte no té encara una llicència pròpia de distribució.
