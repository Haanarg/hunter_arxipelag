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
| F / Dispar | Disparar; amb granades, mantenir per carregar i deixar anar per llançar; amb la cisalla equipada, tallar una filferrada propera |
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
- Pistola, ganivet, granades, bazooka, rifle de franctirador, explosius, **cisalla silenciosa**, disfressa, farmacioles, mapes i paracaigudes. Les bales lleugeres travessen les filferrades; es trenquen amb granades, míssils, explosius o vehicles. Hi ha una cisalla garantida als tallers dels hangars, en lloc de les granades.
- Transport de vehicles en ferry, natació, onatge, fauna, models articulats i tres perfils gràfics.

## Torres: destrucció i selecció d'arma (v0.5.6)

Les torres defensives **només disparen amb l'arma més ràpida que pot fer mal a l'objectiu**:

- A peu i dins de vehicles no blindats (moto, cotxe, ferry, helicòpter normal), fan servir la metralladora **lleugera** cada 0,7 s.
- Dins de blindats (tanc, tanqueta o helicòpter de combat), fan servir el canó **pesat** cada 4,2 s. No disparen trets lleugers que no poden fer mal al blindatge.
- Els dos canons conserven els seus temporitzadors propis, però no disparen alhora contra la mateixa diana; la recàrrega del pesat no provoca un tret lleuger inútil.
- Quan una torre explota, es desintegren només peces petites que cauen i desapareixen. No es clonen les representacions simplificades de la torre per distància (LOD), i les quatre potes deixen de tenir col·lisió immediatament.

Proves: `node tests/defense-weapons.cjs` (infanteria, transports, blindats, abasts i recàrregues) i `node tests/tower-destruction.cjs` (destrucció amb LOD llunyà, fragments i col·lisions), a més de la regressió general.

## Distribució de botí als complexos (v0.5.4)

- **Polvorins:** cap dels tres mapes (`mapa`, `mapa_heli`, `mapa_tanc`). Mantenen munició, granades, explosius, bazuca i rifle de franctirador.
- **Hangars:** no hi apareix cap objecte recollible; continuen contenint els vehicles previstos.
- **Tallers annexos als hangars:** munició, farmacioles i eines com la cisalla, però mai bazuca, rifle, granades ni explosius. Poden contenir informació o subministraments no armats.
- Les mateixes restriccions s'apliquen tant al botí fix del complex com a la distribució aleatòria. Els mapes garantits i el rifle garantit es reassignen entre edificis vàlids, sense perdre aquestes recollides.

Proves: `node tests/loot-restrictions.cjs` (dues llavors d'arxipèlag petit i una de gran), `node tests/compound-generation.cjs` i `node tests/smoke.cjs`.

## Franctirador recolzat a l'espatlla (v0.5.3)

La culata del rifle reposa al costat de l'espatlla dreta del model real del jugador (que usa una escala de 1,2 abans de l'escalat final). El rifle és lleugerament més compacte i ja no travessa el cos ni la motxilla. La mà dreta sosté el gallet i la mà esquerra el guardamà mitjançant dos punts de presa i la IK anatòmica dels colzes. La conversió local-món s'aplica una sola vegada per evitar desplaçaments de les mans. La boca del canó continua essent l'origen físic dels trets i convergeix amb la mira de precisió.

Proves: `node tests/sniper-shoulder-pose.cjs` (culata, canells en repòs, caminant i apuntant), `node tests/sniper-muzzle.cjs` (tir i òptica) i `node tests/player-model.cjs` (regressió d'animacions).

## Torre de defensa dual i soldats amb bazuca (v0.5.2)

Les torres defensives tenen una metralladora **lleugera** i un canó **pesat** sobre la mateixa torreta orientable. Tenen cadències independents (0,7 s i 4,2 s respectivament); des de la v0.5.6 escullen exclusivament l'arma més ràpida capaç de fer mal a la diana. L'arma pesada abasta fins a 95 m. Els impactes pesats utilitzen el sistema balístic de la v0.5.1.

Un de cada **cinc soldats de guàrdia** dels complexos enemics rep el bazuca: el seu model reutilitza exactament la geometria i els materials del bazuca del jugador, amb una silueta simplificada per als LOD mitjà i llunyà. El seu tret és pesat, explosiu, més lent i amb 3,4 s entre trets. El comptador és determinista i no consumeix nombres aleatoris de la llavor; les tropes ordinàries conserven l'armament lleuger i el rifle de franctirador continua essent lleuger.

Proves: `node tests/defense-weapons.cjs` verifica la distribució, la igualtat del model i els dos disparadors independents; també passen `node tests/projectile-classes.cjs`, `node tests/weapon-classification.cjs`, `node tests/compound-generation.cjs` i `node tests/enemy-navigation-world.cjs`.

## Munició lleugera i pesada (v0.5.1)

Els projectils es classifiquen com a **lleugers** (pistola, rifle de franctirador, armes dels soldats, tanqueta i canó principal de l'helicòpter de combat) o **pesats** (tanc, bazuca, coets i canons explosius). El canó de l'helicòpter normal manté el projectil explosiu que ja tenia; els míssils secundaris de l'helicòpter de combat també són pesats. Les granades i les càrregues d'explosiu utilitzen el mateix model de dany pesat en àrea.

- Els lleugers travessen la filferrada sense danyar-la, impacten en les construccions però no danyen les parets ni teulades militars i no poden reduir la vida de tanquetes, tancs, helicòpters blindats o torres. Sí que danyen soldats, general i vehicles no blindats.
- Els pesats viatgen al 78% de la velocitat anterior i tenen un multiplicador de dany del 130%; detonen en impactar i poden destruir filferrades, edificis i blindats. Les granades i els explosius conserven els seus radis i temporitzadors, amb dany pesat.
- L'autoapuntat lleuger ignora les unitats blindades i les torres; l'autoapuntat pesat les considera objectius vàlids.
- Proves: `node tests/projectile-classes.cjs`, `node tests/weapon-classification.cjs`, `node tests/bullet-impact-fx.cjs`, `node tests/smoke.cjs` i `node tests/compound-generation.cjs`.

## Reducció del temps de generació (v0.4.31)

La cerca de ports garantits comprova primer cinc ancoratges interiors estables per illa i revalida l'emplaçament amb el mateix validador de costa. Això evita la combinació anterior de 40 intents per illa, cadascun amb fins a 22 cerques de terreny. Si no troba ports, disposa d'una cerca aleatòria acotada. Les posicions dels complexos poden canviar respecte de versions anteriors, però la reproducció de llavors dins la mateixa versió continua funcionant.

Proves CI: `node tests/port-startup.cjs`, `node tests/build-profiler.cjs`, `node tests/seed-replay.cjs` i `node tests/smoke.cjs`. A la consola del navegador, `HUNTER_BUILD_STATS.stages.guaranteedPorts` indica els mil·lisegons invertits en aquesta cerca i `HUNTER_BUILD_STATS.portSearch` resumeix els ports col·locats.

## Arrencada optimitzada

- La portada continua sent una imatge fixa i precàrrega Three.js i el paquet del motor quan el navegador està disponible, sense activar WebGL.
- Els 38 scripts clàssics s'agrupen en un sol fitxer `dist/hunter-runtime.<hash>.js` generat amb `node tools/build-runtime.cjs`; l'ordre original es conserva i existeix un carregador alternatiu per a errors de xarxa.
- GitHub Actions verifica el paquet amb la regressió general i les proves gràfiques abans de regenerar-ne el manifest. El contingut del paquet determina el nom de fitxer, evitant invalidar tota la memòria cau en cada revisió.
- Cloudflare Pages utilitza `_headers` per conservar els paquets amb hash i revalidar l'HTML i els manifests.
- La textura detallada s'elabora progressivament després del primer fotograma i l'aigua comença amb una malla de 160 divisions (o menys, segons perfil); la malla final es prepara per blocs i substitueix l'anterior quan està completa.
- Des de la consola es poden consultar `window.HUNTER_STARTUP_TIMINGS` (motor, món, total), `window.HUNTER_BUILD_STATS` (generació) i `water.resolution` en les proves. Aquestes xifres són de l'equip real i permeten comparar abans/després.

Validació local: `node tests/startup-cache.cjs`, `node tools/build-runtime.cjs --check`, `node tests/water.cjs`, `node tests/high-graphics.cjs` i `HUNTER_TEST_BUNDLE=1 node tests/smoke.cjs`.

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
- [Fase 4: recintes nous, variants i base–costa](compounds-preview.html?fase=4): 32 dissenys (40 escenes amb V1): tres mides de poblat i variants militars V2/V3/V4, encara fora del generador. [Criteris i distribucions](docs/COMPOUNDS_PHASE4.md).

## Publicació i llicències

`main` és la branca oficial. El domini del joc és https://hunter.paradoxa.cat/, amb desplegament a Cloudflare Pages; no s’ha de reintroduir GitHub Pages. Els workflows del repositori fan comprovacions i tasques auxiliars.

Three.js es distribueix sota MIT: [llicència](vendor/THREE-LICENSE.txt) i [procedència i reproducció](vendor/README.md). El projecte no té encara una llicència pròpia de distribució.
