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

## Punteria marina segons dificultat i esprint (v0.5.28)

- Les metralladores i els coets navals reben una dispersió proporcional a la dificultat: **molt alta a Fàcil**, intermèdia a Normal i baixa a Difícil.
- Botons de strafe més llargs i corbats, adaptats a la circumferència del joystick.
- Botó superior **CÓRRER** i tecla **Majúscules**: velocitat a peu de 12 a 19, sense activar-se en vehicles, nedant ni amb la mira. Animació amb tronc inclinat cap endavant, passes més ràpides i cames més àmplies.

## Pantalans accessibles amb rampa (v0.5.27)

- Els pantalans de fusta baixen de **2,7 a 2,4 metres**, mantenint marge sobre el màxim de les ones.
- Una **rampa inclinada de fusta de 12 metres**, amb baranes, connecta l'extrem de terra amb la coberta. La superfície caminable segueix exactament la pendent de la rampa. Es genera tant en partida com en les dades del cercador de llavors.
- Les **baranes laterals** impedeixen travessar els costats del pantalà; la col·lisió lateral comprova el punt anterior i el nou punt del jugador. L'alçada de la coberta no s'aplica a qui intenta pujar-hi lateralment des de baix.
- Les rampes de terminals de ferri continuen enllaçades amb la cota compartida del pantalà.

## Impuls d'explosions i caigudes variades (v0.5.26)

- Les explosions empenyen el **jugador a peu** i els **soldats enemics** en direcció contrària al centre, amb distància i elevació dependents de la proximitat. El jugador gesticula amb braços i cames durant el vol i recupera el control després de l'aterratge. No altera les maniobres de sortida de vehicles ni la caiguda amb paracaigudes.
- Els soldats supervivents queden desestabilitzats breument i tornen a combatre quan acaba l'impuls.
- En morir, cada soldat tria una **direcció de caiguda i postura aleatòries** (rotació, braços, cames, tombada), incloent el desplaçament balístic de l'explosió si n'hi havia. Els cossos es retiren passats 18 segons com abans.
- L'impuls s'aplica una vegada per explosió i no afecta els vehicles.

## Projectils pesants i patrulleres destructibles (v0.5.25)

- **Tots els projectils pesants** tenen la **meitat de mida visual** i una velocitat **50% superior** a la de v0.5.24 (factor de velocitat `0.78 → 1.17`, factor visual `0.5`). El dany, les explosions i les dimensions de les col·lisions no canvien.
- **Error de causa arrel corregit:** faltava `patrulla_marina` a la taula `EC`. Les patrulleres naixien sense `hp` i en rebre dany els punts de vida es transformaven en `NaN`, cosa que impedia destruir-les. Ara comencen amb **95 HP** i poden explotar quan s'esgoten.
- Les patrulleres es registren també a la graella espacial de vehicles i la seva categoria es correspon amb la col·lisió de `llanxa`, per evitar radis invàlids en maniobres i consultes entre vehicles.
- Test balístic ampliat per comprovar la velocitat i la mida dels projectils pesants, la vida inicial d'una patrullera **creada amb `mkEn`**, l'aplicació de dany i la seva destrucció. No s'afegeixen execucions automàtiques llargues.

## Bazooka contra patrulleres i retícula discreta (v0.5.24)

- La retícula del bazooka és **verda, petita i translúcida**. Només apareix si l'autoapuntat selecciona un enemic o la trajectòria troba una superfície sòlida (terreny, paret, edifici o vehicle). No es dibuixa quan el míssil només avançaria cap a l'horitzó.
- Els coets del bazooka anticipen la posició de les **patrulleres en moviment** mitjançant la velocitat i el rumb de la llanxa. La retícula continua identificant la posició actual del blanc. El cercador espacial de projectils té en compte les dimensions completes del buc, fins i tot quan el centre queda en una altra cel·la.
- El dany explosiu contra patrulleres té en compte **la superfície del buc** en lloc de dependre de la distància al centre; un impacte directe de bazooka ha de destruir-ne una de 95 HP. El coet disposa de temps de vol suficient per interceptar l'objectiu.
- S'afegeixen dues comprovacions petites al test balístic: anticipació de moviment i explosió al buc, sense incorporar-les a una bateria automàtica llarga.

## Retícula del bazooka i granades de l'helicòpter utilitari (v0.5.23)

- El bazooka mostra una **retícula projectada sobre el mateix objectiu** que selecciona l'autoapuntat (105 m i con de 0,94). És blanca si apunta lliurement i verda si ha fixat un enemic. La mira s'amaga en canviar d'arma, entrar en un vehicle o obrir un menú.
- L'**helicòpter utilitari ja no dispara projectils propis**. Amb **Dispar / F** llança una granada de l'inventari del jugador, encara que no estigui equipada; se'n resta una, es mostra la quantitat al HUD i s'avisa si no en queden.
- Les granades surten de la porta lateral de l'helicòpter, amb inèrcia d'avançament i desplaçament lateral. Utilitzen la física, l'explosió i el model de les granades existents. El sistema de granades carregades a peu i les armes de l'helicòpter de combat continuen igual.

## Cadència de la tanqueta enemiga (v0.5.22)

- La tanqueta enemiga comparteix el mateix interval de tret que la del jugador: **0,16 segons** (fins a 6,25 trets/s).
- La constant `TANKETTE_FIRE_INTERVAL` és comuna a ambdues tanquetes per evitar futures divergències. No canvien dany, precisió, moviment ni condicions de visibilitat i orientació del canó de la IA.

## Patrulleres vulnerables, molls elevats i visió ampliada (v0.5.21)

- Les **patrulleres enemigues** tenen un volum d'impacte coherent amb la longitud del buc. Reben els impactes lleugers de la metralladora de l'helicòpter de combat, la tanqueta i la pistola del jugador; tancs i tanquetes continuen protegits.
- La coberta dels **molls** queda a **2,7 m** sobre el nivell del mar, per damunt del màxim físic d'onatge de **2,2 m**. S'actualitzen les col·lisions de la coberta, els pilars, les baranes, els norais i les rampes de ferri. La cerca de llavors reutilitza la mateixa alçada.
- Les tres qualitats gràfiques amplien la visibilitat d'edificis, vehicles, enemics, tanques i decoració. Els models detallats d'enemics i vegetació es mantenen visibles més lluny, i també s'allunyen les transicions LOD de terreny.
- Es reajusten la boira i el pla de retall de la qualitat mínima per mostrar realment les distàncies noves. No canvien el rang de foc, la IA ni la física de conducció.

## Marques d'heliport i danys de les patrulles (v0.5.20)

- L'anella i la **H de les plataformes d'heliport** es dibuixen clarament per damunt de la llosa (amb separació real i desplaçament de profunditat), evitant que desapareguin de lluny per z-fighting.
- El dany explosiu es calcula des de la **superfície de col·lisió dels vehicles**, no des del seu centre. Així, els coets navals poden danyar helicòpters i altres vehicles fins i tot quan impacten lluny del centre del model.
- Els coets de patrulla conserven la trajectòria fins a arribar al seu abast d'atac; abans expiraven als 2,2 segons. Les armes embarcades també ajusten l'elevació quan apunten cap a aeronaus.
- Es conserva la protecció contra bales lleugeres dels vehicles blindats. S'ha afegit una regressió específica del radi d'explosió als helicòpters, d'execució manual.

## Cercador de llavors ràpid (v0.5.19)

- La cerca fa servir `buildSeedData()`, la mateixa lògica de generació del joc en **mode només dades**. Preserva els emplaçaments físics, l'ordre de les crides a `R()` i les tirades de color/variació que abans feia la construcció visual de vegetació.
- No genera malles de cases, complexos, tanques, armes, enemics, vehicles, rampes, vegetació ni altres decoracions durant la cerca. Conserva les dades de sòls, parets, obstacles i objectes necessàries per obtenir les coordenades originals.
- Reutilitza un contenidor temporal lògic per a totes les llavors, en comptes d'afegir i eliminar escenes 3D i geometries cada vegada.
- **Sortides anticipades:** quan es busquen complexos s'atura després de situar-los; quan es busquen objectes s'atura després de distribuir el botí.
- **Lots cooperatius:** fins a 8 llavors o 12 ms abans de tornar el control al navegador. La cerca es pot cancel·lar entre llavors i només actualitza els resultats en acabar cada lot.
- La partida normal continua construint el món visual complet, sense aquests salts.

## Patrulles marines restaurades i cerca per llavor (v0.5.18)

- Les **5–10 patrulles marines** tornen a formar part del joc. Una reorganització posterior havia perdut el fitxer i les crides de generació de v0.5.16.
- Les coordenades i el nombre es calculen amb el generador de la llavor, tant en partida com al cercador. El cercador mostra la categoria **Enemics → Patrulla marina**, amb nombre total i distància a la base, però no carrega models 3D ni IA.
- S'ha corregit la inicialització de la velocitat angular de les llanxes perquè el moviment no quedi bloquejat.
- Es conserven la metralladora, els coets, la navegació amb viratges graduals, els dos soldats visibles i la immunitat del jugador disfressat.

## Dispar als vehicles oberts i portes de l'helicòpter (v0.5.17)

- Amb munició, la pistola del jugador també pot disparar des de **bicicleta, moto, moto aquàtica, barca de rems, windsurf i llanxa normal**. Manté cadència, dany i autoapuntat de la pistola a peu; no es pot fer cos a cos des d'aquests vehicles.
- El pilot aixeca el braç dret per apuntar i torna a agafar el manillar, el rem o la botavara després del tret. L'arma té model i retrocés propi, amb projectils originats a la boca real del canó. La mà esquerra manté la postura de conducció. La llanxa llançacoets conserva l'arma pesada pròpia.
- L'**helicòpter utilitari** té una obertura real de banda a banda alineada amb les dues portes laterals, sense prisma sòlid a l'interior de la cabina. Es mantenen sòl, sostre, marcs, bancs i patins; l'helicòpter de combat no canvia.

## Patrulles marines (v0.5.16)

- Entre **5 i 10 llanxes militars per mapa**, generades a mar obert al voltant de l'arxipèlag, amb dos soldats visibles a bord. Són enemics que poden rebre dany i explotar.
- Tenen metralladora (tirs curts) i llançacoets (més lent i de més abast); cadascuna gira cap al jugador. També ataquen des del mar quan el jugador és a terra i hi ha línia de tir.
- **Disfressa enemiga:** no detecten, persegueixen ni disparen al jugador mentre està activada, fins i tot si pilota un vehicle.
- Navegació exclusiva d'aigua: velocitat i gir angular graduals, radi de gir condicionat per la velocitat, viratges amplis, detecció de poca profunditat, límits del mapa i altres embarcacions. Si el jugador s'allunya tornen a patrullar.
- El recompte real queda accessible a `world.userData.marinePatrols` (`target`, `spawned`) per ajustar més endavant la densitat de patrulles sense modificar la IA.

## Portada i tanqueta (v0.5.11)

- La tanqueta deixa fixa al xassís la caixa rectangular de sota la torreta; només giren la corona cilíndrica i el canó articulat.
- La portada ordena les dificultats (inici de partida), llavors i mida de mapa, i selector de qualitat amb l'engranatge de Rendiment al costat. La cerca i la versió conserven les posicions.
- El perfil gràfic **Alts** és el predeterminat a tots els dispositius; una selecció explícita de qualitat continua tenint prioritat.

## Torretes mòbils de blindats (v0.5.10)

Els **tancs i les tanquetes**, tant pilotables com enemics, tenen torreta independent del xassís. El bloc superior gira horitzontalment i el canó disposa de pivot per ajustar l'elevació, amb velocitat angular limitada, acceleració i frenada progressives. El tanc gira més lentament que la tanqueta.

- Quan es pilota un blindat, la torreta segueix suaument la direcció de tir prevista per l'autoapuntat existent (rang de 220 per al tanc i 85 per a la tanqueta). El projectil sempre surt de l'extrem real del canó i avança en la direcció que aquest assenyala, fins i tot mentre està girant.
- Els blindats enemics continuen patrullant amb el xassís i orienten la torreta cap a l'objectiu visible. Esperen a estar pràcticament alineats abans de disparar; es conserva una desviació de punteria dependent de la dificultat.
- La comprovació de gir fluid, independència del xassís i coherència del punt de sortida del tret s'inclou a `tests/smoke.cjs`.

## Cinemàtica de victòria (v0.5.8)

Quan el general rep el tret mortal, el joc captura l'origen, la trajectòria i la posició de l'impacte. **No es genera cap altra pantalla**: la simulació de combat queda congelada i la mateixa escena del mapa en curs continua renderitzant-se.

1. **Tres repeticions lentes** de l'últim tret, amb les mateixes posicions del món, des de tres angles. La repetició és exclusivament visual i sonora; no torna a aplicar dany.
2. **Caiguda amb braços alçats i colzes separats**. La postura compartida a `src/victory-pose.js` fa girar el general sobre els malucs i evita que els braços quedin ocults per la gavardina.
3. **Ascens zenital i gir cap al sol existent** de `src/rendering.js`. La càmera passa sobre el mar localitzat al mapa real; no s'afegeix cap astre ni cúpula nous.
4. **Nou gavines** entren des de darrere de la càmera per un costat, creuen el pla aletejant i desapareixen a l'horitzó per l'altre costat. Es mostra **MISSIÓ COMPLERTA** i el botó **Nova partida**.

La seqüència completa dura aproximadament **19 segons**. La pàgina [Final · Proves](final-proves.html) utilitza el mateix cel i la mateixa postura de caiguda amb un decorat de mostra. Validació: `node tests/victory-cinematic.cjs`, `node tests/smoke.cjs`, `node tests/projectile-classes.cjs` i `node tools/build-runtime.cjs --check`.

## Torres: destrucció i selecció d'arma (v0.5.6)

Les torres defensives **només disparen amb l'arma més ràpida que pot fer mal a l'objectiu**:

- A peu i dins de vehicles no blindats (moto, cotxe, ferry, helicòpter normal), fan servir la metralladora **lleugera** cada 0,7 s.
- Dins de blindats (tanc, tanqueta o helicòpter de combat), fan servir el canó **pesat** cada 4,2 s. No disparen trets lleugers que no poden fer mal al blindatge.
- Els dos canons conserven els seus temporitzadors propis, però no disparen alhora contra la mateixa diana; la recàrrega del pesat no provoca un tret lleuger inútil.
- Quan una torre explota, es desintegren només peces petites que cauen i desapareixen. No es clonen les representacions simplificades de la torre per distància (LOD), i les quatre potes deixen de tenir col·lisió immediatament.


## Distribució de botí als complexos (v0.5.4)

- **Polvorins:** cap dels tres mapes (`mapa`, `mapa_heli`, `mapa_tanc`). Mantenen munició, granades, explosius, bazuca i rifle de franctirador.
- **Hangars:** no hi apareix cap objecte recollible; continuen contenint els vehicles previstos.
- **Tallers annexos als hangars:** munició, farmacioles i eines com la cisalla, però mai bazuca, rifle, granades ni explosius. Poden contenir informació o subministraments no armats.
- Les mateixes restriccions s'apliquen tant al botí fix del complex com a la distribució aleatòria. Els mapes garantits i el rifle garantit es reassignen entre edificis vàlids, sense perdre aquestes recollides.


## Franctirador recolzat a l'espatlla (v0.5.3)

La culata del rifle reposa al costat de l'espatlla dreta del model real del jugador (que usa una escala de 1,2 abans de l'escalat final). El rifle és lleugerament més compacte i ja no travessa el cos ni la motxilla. La mà dreta sosté el gallet i la mà esquerra el guardamà mitjançant dos punts de presa i la IK anatòmica dels colzes. La conversió local-món s'aplica una sola vegada per evitar desplaçaments de les mans. La boca del canó continua essent l'origen físic dels trets i convergeix amb la mira de precisió.


## Torre de defensa dual i soldats amb bazuca (v0.5.2)

Les torres defensives tenen una metralladora **lleugera** i un canó **pesat** sobre la mateixa torreta orientable. Tenen cadències independents (0,7 s i 4,2 s respectivament); des de la v0.5.6 escullen exclusivament l'arma més ràpida capaç de fer mal a la diana. L'arma pesada abasta fins a 95 m. Els impactes pesats utilitzen el sistema balístic de la v0.5.1.

Un de cada **cinc soldats de guàrdia** dels complexos enemics rep el bazuca: el seu model reutilitza exactament la geometria i els materials del bazuca del jugador, amb una silueta simplificada per als LOD mitjà i llunyà. El seu tret és pesat, explosiu, més lent i amb 3,4 s entre trets. El comptador és determinista i no consumeix nombres aleatoris de la llavor; les tropes ordinàries conserven l'armament lleuger i el rifle de franctirador continua essent lleuger.


## Munició lleugera i pesada (v0.5.1)

Els projectils es classifiquen com a **lleugers** (pistola, rifle de franctirador, armes dels soldats, tanqueta i canó principal de l'helicòpter de combat) o **pesats** (tanc, bazuca, coets i canons explosius). El canó de l'helicòpter normal manté el projectil explosiu que ja tenia; els míssils secundaris de l'helicòpter de combat també són pesats. Les granades i les càrregues d'explosiu utilitzen el mateix model de dany pesat en àrea.

- Els lleugers travessen la filferrada sense danyar-la, impacten en les construccions però no danyen les parets ni teulades militars i no poden reduir la vida de tanquetes, tancs, helicòpters blindats o torres. Sí que danyen soldats, general i vehicles no blindats.
- Els pesats viatgen al 78% de la velocitat anterior i tenen un multiplicador de dany del 130%; detonen en impactar i poden destruir filferrades, edificis i blindats. Les granades i els explosius conserven els seus radis i temporitzadors, amb dany pesat.
- L'autoapuntat lleuger ignora les unitats blindades i les torres; l'autoapuntat pesat les considera objectius vàlids.

## Reducció del temps de generació (v0.4.31)

La cerca de ports garantits comprova primer cinc ancoratges interiors estables per illa i revalida l'emplaçament amb el mateix validador de costa. Això evita la combinació anterior de 40 intents per illa, cadascun amb fins a 22 cerques de terreny. Si no troba ports, disposa d'una cerca aleatòria acotada. Les posicions dels complexos poden canviar respecte de versions anteriors, però la reproducció de llavors dins la mateixa versió continua funcionant.

Validació essencial actual: `node tests/seed-replay.cjs` i `node tests/smoke.cjs`. A la consola del navegador, `HUNTER_BUILD_STATS.stages.guaranteedPorts` indica els mil·lisegons invertits en aquesta cerca i `HUNTER_BUILD_STATS.portSearch` resumeix els ports col·locats.

## Arrencada optimitzada

- La portada continua sent una imatge fixa i precàrrega Three.js i el paquet del motor quan el navegador està disponible, sense activar WebGL.
- Els 38 scripts clàssics s'agrupen en un sol fitxer `dist/hunter-runtime.<hash>.js` generat amb `node tools/build-runtime.cjs`; l'ordre original es conserva i existeix un carregador alternatiu per a errors de xarxa.
- GitHub Actions regenera el paquet amb una única regressió bàsica automàtica; la resta de comprovacions s'executen manualment. El contingut del paquet determina el nom de fitxer, evitant invalidar tota la memòria cau en cada revisió.
- Cloudflare Pages utilitza `_headers` per conservar els paquets amb hash i revalidar l'HTML i els manifests.
- La textura detallada s'elabora progressivament després del primer fotograma i l'aigua comença amb una malla de 160 divisions (o menys, segons perfil); la malla final es prepara per blocs i substitueix l'anterior quan està completa.
- Des de la consola es poden consultar `window.HUNTER_STARTUP_TIMINGS` (motor, món, total), `window.HUNTER_BUILD_STATS` (generació) i `water.resolution` en les proves. Aquestes xifres són de l'equip real i permeten comparar abans/després.


## Desenvolupament i comprovacions

`src/bootstrap.mjs` carrega el motor i `src/runtime-scripts.mjs` fixa l’ordre dels sistemes. `src/game-core.js` conserva l’estat compartit; generació, combat, IA, models i renderitzat tenen mòduls propis. Les decisions i els pendents es documenten a [l'estat del projecte](docs/VISUAL_MODERNIZATION.md).

### Proves essencials conservades

S'han conservat **10 proves executables** i el suport compartit `tests/harness.cjs`. Es poden executar amb Node.js localment, sense consumir minuts de GitHub Actions:

```sh
node tests/smoke.cjs
node tests/startup-cache.cjs
node tests/compound-generation.cjs
node tests/seed-replay.cjs
node tests/terrain-level-index.cjs
node tests/terrain-stream.cjs
node tests/water.cjs
node tests/enemy-navigation.cjs
node tests/projectile-classes.cjs
node tests/victory-cinematic.cjs
```

- **Automàtic:** `.github/workflows/runtime-bundle.yml`, només quan canvien els scripts del runtime. Regenera el paquet, n'avalua la integritat i executa `smoke.cjs` una sola vegada.
- **Manual:** `.github/workflows/essential-tests.yml`, amb grups `world`, `combat`, `ending`, `startup` o `all`. Les proves especialitzades només consumeixen minuts d'Actions quan algú les inicia expressament.
- Les proves de previews, models experimentals, efectes puntuals i regressions duplicades s'han retirat; si cal es podran recrear. No s'ha eliminat codi funcional del joc.

Per comprovar el paquet manualment sense regenerar-lo: `node tools/build-runtime.cjs --check`.

Laboratoris conservats per a iteracions visuals:

- [Models, caps i ganivet](proves.html).
- [Dispar a dues mans](dispar-proves.html).
- [Explosius](explosius-proves.html).
- [Explosions procedurals · quatre escales](explosions-proves.html): previsualització amb estil B (puntes irregulars 3D), radi visual fix ×2, paleta més viva, densitat i llavors ajustables; no modifica els efectes del joc.
- [Complexos, fases 1–3 integrades](compounds-preview.html).
- [Fase 4: recintes nous, variants i base–costa](compounds-preview.html?fase=4): 32 dissenys (40 escenes amb V1): tres mides de poblat i variants militars V1/V2/V3/V4 integrades al generador; controls de carretera ajornats. [Criteris i distribucions](docs/COMPOUNDS_PHASE4.md).

## Publicació i llicències

`main` és la branca oficial. El domini del joc és https://hunter.paradoxa.cat/, amb desplegament a Cloudflare Pages; no s’ha de reintroduir GitHub Pages. Només el workflow de runtime funciona automàticament; la bateria de regressions es pot iniciar manualment.

Three.js es distribueix sota MIT: [llicència](vendor/THREE-LICENSE.txt) i [procedència i reproducció](vendor/README.md). El projecte no té encara una llicència pròpia de distribució.

## Recintes i costa (v0.5.13)

Poblats irregulars amb portes variades, finestres obertes i teulades de branques. Només V4 incorpora un edifici de dues plantes. Embarcadors civils, dues terminals amb passeres adaptades als ferris i traçat base–costa segons el terreny. La fase 5 (controls de carretera) queda només al visor. [Estat i validació](docs/COMPOUNDS_PHASE4.md).

## Camins integrats al terreny (v0.5.15)

Xarxa contínua compartida entre joc i visor: girs arrodonits, cruïlles sense superfícies duplicades, vores suaus i extrems difuminats només quan no connecten amb un altre camí. La malla segueix el terreny visible i s’ajusta quan canvia el LOD del sector; polígon desplaçat en profunditat per evitar z-fighting.
