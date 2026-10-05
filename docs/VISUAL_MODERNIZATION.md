# Pla de modernització visual

## Estat vigent dels punts 5 i 6 — 2026-10-05

Base de represa: `main` a `57a04751335469b1fce5b11ab26e30fedb3631fe`. Els registres datats de sota són historial; no substitueixen aquest estat.

| Bloc | Implementat | Validació / pendent |
| --- | --- | --- |
| 5 · Onatge | Model únic CPU/GLSL, interpolació sobre triangles reals, rellotge de partida, suport de les embarcacions | Proves numèriques superades; calibratge visual WebGL/Android pendent |
| 5 · Renderitzat | Malla ajustada a la mida activa amb el pressupost de vèrtexs existent, bounds d’onatge, aigua integrada amb tone mapping i sortida sRGB | Comprovats perfils 240/400 i mides 4,8/9,6 km; compilació GPU, aspecte, FPS i ergonomia no verificats |
| 6 · Separació | Motor local a `vendor/`; generació, combat, IA i àudio extrets; HTML sense lògica inline | Smoke executat; globals compatibles conservats |
| 6 · Actualització del motor | Dependència fixada, carregador explícit i proves adaptades | **Pendent**: ESM, nova revisió de Three.js, API de color/llums i validació dedicada |

### Canvis d’aquesta entrega
- `src/waves.js` és l’únic lloc que defineix freqüències, amplituds i atenuació costanera. El shader es genera a partir d’aquests mateixos valors.
- La física mostreja els mateixos triangles desplaçats que es renderitzen. Això evita la diferència entre una ona contínua ideal i la superfície facetada, sobretot al perfil mòbil.
- Llanxes i altres vehicles de mode aquàtic segueixen l’amplitud completa de la superfície, conservant l’offset del buc; l’hovercraft també usa aquesta altura quan flota.
- La pausa i el final de partida congelen l’onatge; el reinici torna el seu rellotge a zero. No hi ha un salt de fase pel temps passat al menú de pausa.
- La malla d’aigua es redimensiona amb el mapa seleccionat, sense augmentar els 240/400 segments dels perfils actuals. En canviar de mida es disposa la geometria anterior.
- La caixa i l’esfera de culling inclouen el desplaçament màxim de les ones.
- El fragment shader incorpora els chunks de tone mapping i codificació sRGB de r128, coherents amb el renderer. Els colors i l’exposició encara necessiten inspecció visual real.
- `vendor/three-r128.min.js` conserva exactament el codi del motor anterior, amb avís MIT i hash a `vendor/README.md`.
- `src/world-generation.js`, `src/combat.js`, `src/enemy-ai.js` i `src/audio.js` conserven les funcions i els contractes previs. `src/game-core.js` conserva temporalment les variables compartides i el bucle. Són scripts clàssics locals, **no** una conversió ESM completa.
- Afegides comprovacions d’arrencada per detectar sistemes extrets absents.
- `tests/smoke.cjs` anterior tenia errors de sintaxi per cometes imbricades i encara donava per fet que hi havia un món generat abans de prémer la dificultat. S’ha reparat el banc de proves perquè carregui els scripts reals en ordre i comenci des del botó del menú.
- Les comprovacions antigues de fragments literals de codi s’han substituït per comprovacions de comportament: vehicles, col·lisions, destrucció, erugues, pausa i reinici. No es dona per validat l’aspecte dels models amb cerques de text.

### Validació d’aquesta entrega
- `node tests/water.cjs`: superat. 600 mostres independents de triangles, 100 mostres de la fórmula prèvia, quatre combinacions de mida/perfil, bounds, chunks de shader presents i alliberament de geometria.
- `node tests/smoke.cjs`: superat. Arrencada diferida, botó real de dificultat, els 14 vehicles, articulacions, erugues, OBB, neteja de destrucció, flotació, pausa/represa, reinici i vegetació.
- Comparació abans/després amb llavor `12345`, mapa petit: coincideixen illes, anivellaments, edificis, murs, enemics, defenses, objectes i posicions/tipus de 58 vehicles. Només s’exclou l’orientació dels vehicles varats: el codi anterior ja hi feia servir `rn()` (atzar no sembrat). Aquesta incidència de reproducció queda registrada i no s’ha alterat en aquesta entrega.
- El renderer, el DOM i l’àudio estan simulats en aquestes proves. **No s’ha executat una comprovació GPU ni una partida completa en Android.**

### Continuació del punt 6
1. Revisió WebGL del color i les transparències amb aquesta base separada.
2. Extreure l’estat compartit amb dependències explícites, sistema a sistema.
3. Migrar Three.js a una revisió moderna local/ESM en una entrega dedicada, adaptant color, llums i shaders, tal com estableix la fase E. Aquesta entrega no afirma haver actualitzat Three.js.

## Objectiu
Mantenir l'estètica low-poly i la jugabilitat de *Hunter: Arxipèlag*, modernitzant progressivament el renderitzat i separant presentació, entrada i simulació per reduir regressions i facilitar l'evolució del joc.

## Estat de la base
- Three.js r128 es carrega localment des de `vendor/three-r128.min.js`; se’n conserva la llicència i la revisió fixada.
- `index.html` conté la interfície i l’ordre de càrrega. `src/game-core.js` conserva l’estat compartit i la simulació principal; generació, combat, IA i àudio tenen arxius propis.
- La modernització ja s'ha fusionat a `main`, que és ara la branca oficial i la base de treball.
- No hi ha cap workflow de GitHub Pages i no s'ha de reintroduir. El desplegament previst és mitjançant Cloudflare Pages, amb `main` com a branca de producció i `hunter.paradoxa.cat` com a domini.
- Regla principal: cada extracció ha de conservar els contractes que utilitza el gameplay.

## Implementat

### Renderer i atmosfera
- Perfil adaptatiu mòbil/escriptori a `src/visual-config.js`.
- Pixel ratio, ombres, exposició, boira i complexitat geomètrica adaptatius.
- Renderer, càmera, llums, cel i sol separats a `src/rendering.js`.
- sRGB, ACES Filmic i materials compatibles amb il·luminació física.
- Nota pendent: Three.js r128 usa APIs antigues com `outputEncoding`; la migració es farà més endavant.

### Materials
- Perfils centralitzats a `src/materials-config.js`: terreny, orgànic, maçoneria, pintura, metall, goma i vidre.
- Vehicles amb assignació explícita de material; eliminat el classificador heurístic basat en colors.
- Edificis i vegetació reutilitzen els perfils comuns.

### Aigua
- Paràmetres visuals a `src/water-config.js`.
- Renderitzat separat a `src/water.js`.
- Absorció segons profunditat, Fresnel, reflex especular del sol, escuma i boira marítima.
- `src/waves.js` genera la fórmula GLSL i les mostres CPU des d’un mateix model. `wy()` interpola els triangles de la malla que es dibuixa.

### Terreny
- Construcció visual, paleta i frontera del mapa a `src/terrain.js`.
- La funció física/procedural d'altura `hAt()` continua al nucli.
- La paleta del terreny també alimenta el minimapa.
- Corregida una regressió on el minimapa encara cridava l'antiga funció eliminada `colH()`.

### Vehicles
- Construcció visual a `src/vehicles.js`.
- Escales i radis centralitzats.
- Conservats els contractes d'animació: rodes, rotor, rotor de cua, ventilador i pedalier.
- Física i perfils de resposta a `src/vehicle-dynamics.js`.
- Resposta diferenciada per bicicleta, moto, cotxe, tanc, llanxa, hovercraft i helicòpter.
- Acceleració i direcció suavitzades per aprofitar entrada analògica.

### Controls
- Els quatre botons direccionals tàctils s'han substituït per un joystick virtual analògic a `src/joystick.js`.
- Zona morta, magnitud gradual i recentrat automàtic.
- WASD i fletxes continuen disponibles.
- Cal calibrar sensibilitat i mida en un dispositiu tàctil real.

### Pilot
- Pilot de bicicleta/moto separat a `src/rider.js`.
- Conservat el pedaleig de la bicicleta.
- Els peus transicionen cap a terra quan el vehicle s'atura.
- La postura respon progressivament al moviment.

### Vegetació
- Geometries i instancing de palmeres, arbustos i roques a `src/vegetation.js`.
- Distribució procedural, col·lisions, `treeHit`, `treePush` i destrucció continuen al nucli.
- Això manté separada la presentació sense traslladar encara regles de gameplay.

## Incidències detectades durant la refactorització
- L'extracció inicial de vehicles va deixar temporalment fora la taula física `VT`; ara viu a `src/vehicle-dynamics.js`.
- L'extracció del terreny va deixar una referència residual a `colH()` al minimapa; corregida.
- Aquestes incidències reforcen la política de fer extraccions petites i comprovar referències residuals després de cada canvi.

## Deute tècnic conegut
- Three.js r128 ja és extern, però la migració a ESM i a una revisió moderna continua pendent.
- `src/game-core.js` encara concentra estat, controls, efectes i simulació. Els arxius extrets mantenen globals compatibles; encara no són mòduls ESM independents.
- `physicallyCorrectLights=true` necessita calibratge visual en navegador real.
- `outputEncoding` haurà de migrar a l'API moderna de color quan s'actualitzi Three.js.
- El vidre i altres transparències necessiten una revisió conjunta de materials i ordenació de transparència.
- El model d’onatge ja és únic; cal calibrar visualment el color de l’aigua i el detall de la malla en WebGL/Android.
- Falta una passada sistemàtica de validació de consola/runtime després de la modularització.
- No s'ha calibrat encara el joystick ni els perfils de conducció en Android real.

## Següents fases proposades

### Fase A — Estabilització
1. Auditoria de referències residuals i globals després de les extraccions.
2. Revisió d'ordre de càrrega dels mòduls i inicialització.
3. Afegir comprovacions simples de desenvolupament per detectar globals/mòduls absents amb errors clars.
4. Corregir regressions abans de continuar extraient sistemes grans.

### Fase B — Món visual
1. ✅ Extreta la construcció visual d'edificis, finestres, portes, escales i banderes.
2. ✅ Col·lisions, vida/destrucció i navegació es mantenen al nucli.
3. ✅ Revisada la transparència del vidre: perfil `glass` amb transparència real, menor roughness i `depthWrite:false`.
4. Afegir variació visual low-poly sense augmentar gaire el cost de draw calls.

### Fase C — Personatge i entitats
1. ✅ Separats model i animació del jugador.
2. ✅ Models de soldats i general traslladats a `HUNTER_CHARACTERS.createSoldier`.
3. ✅ Fauna visual separada a `src/fauna.js`; moviment, spawning i dany continuen al nucli.
4. ✅ Paletes de jugador/enemics/fauna centralitzades a `src/palette.js`, amb verd i vermell més inequívocs i més contrast de silueta.
5. Preparar una interfície comuna d'animació sense reescriure la IA.

### Fase D — UI i entrada
1. ✅ HUD separat a `src/ui.js`.
2. ✅ Minimapa i carta de navegació separats a `src/minimap.js`.
3. ✅ Menús de pausa, mapa i reinici separats del bucle principal.
4. ✅ Joystick recalibrat: zona morta més petita, resposta progressiva i recorregut ampliat.
5. ✅ Controls tàctils ampliats i reposicionats respectant safe areas laterals i inferiors.
6. Afegir opcions de sensibilitat només si les proves en Android mostren que fan falta.

### Fase E — Actualització de Three.js
Només després d'estabilitzar les fases anteriors:
1. ✅ Three.js r128 extret de l’HTML a `vendor/`, amb llicència i hash.
2. Passar a una versió moderna local i modular.
3. Adaptar color management, llums, ombres i shaders a les APIs actuals.
4. Fer la migració en una fase dedicada, sense canviar simultàniament gameplay.

### Fase F — Millores visuals avançades
- ✅ Primera passada de món: paleta de terreny ampliada amb més separació entre fondària, platja, vegetació, roca i cotes altes.
- ✅ Vegetació amb més volum low-poly, palmeres més orgàniques i variació controlada.
- ✅ Edificis amb cornises, marcs i ampits per donar més relleu sense canviar col·lisions.
- ✅ Atmosfera reforçada: gradient de cel de tres tons, llum de farciment, sol més llegible i halo solar.
- Ombres/LOD adaptatius.
- Aigua millorada segons pressupost de GPU.
- Color grading i AA/postprocessat moderat.
- GLTF només per als assets on aporti una millora clara.
- Optimització de draw calls, culling i resolució dinàmica segons proves.

## Auditoria d'estabilitat — 2026-10-03
- Verificada la sintaxi de tots els mòduls `src/*.js` i dels blocs inline de `index.html`: sense `SyntaxError` estàtics.
- Verificat l'ordre de càrrega dels mòduls visuals, controls, vehicles, rider i vegetació.
- Eliminades referències residuals conegudes de refactoritzacions anteriors: `colH`, `palmCrown`, `dum`, `inst`, `classifyVehicleMaterial` i l'antic constructor inline `mkV`.
- Corregit un error de cicle de vida a vegetació: el mòdul capturava `world` abans que `build()` el creés; ara el món actiu es passa quan es construeixen les instàncies.
- Afegida una comprovació d'integritat d'arrencada que informa explícitament si falta algun mòdul `HUNTER_*`.
- El joystick es reinicia quan es reconstrueix el món per evitar entrada analògica residual després d'un reinici.
- Confirmat que no hi ha workflow de GitHub Pages a les diferències actuals.
- Límit de l'auditoria: no substitueix una execució real en WebGL/Android; encara poden existir errors només reproduïbles en runtime o dependents de GPU/navegador.

## Validació pendent
No s'ha fet encara una validació completa en navegador WebGL/dispositiu Android real. La fusió a `main` ja s'ha fet. La validació següent s'ha de fer directament sobre `main` i ha de comprovar com a mínim:
- consola sense errors;
- inici/reinici de partida;
- moviment a peu i natació;
- entrada/sortida i conducció de tots els vehicles;
- bicicleta: pedaleig i peus a terra;
- helicòpter i vehicles aquàtics;
- minimapa;
- generació de món, vegetació i edificis;
- combat i destrucció;
- FPS, exposició, ombres i aigua en mòbil i escriptori.

## Regla de compatibilitat
No reescriure simulació i renderer simultàniament. Quan un sistema s'extreu, conservar temporalment una interfície compatible amb el codi existent i eliminar-la només després de validar la nova ruta.

## Represa i correccions de runtime — 2026-10-03

Base revisada inicialment: `a40b1ceb8731d44aaf26a77f7dcbc93857e4ca65`, aleshores a la branca `visual-modernization`. Aquesta feina ja s'ha fusionat posteriorment a `main`.

- Reproduït un bloqueig real d’arrencada en executar els scripts en l’ordre de l’HTML: `ReferenceError: soldier is not defined`. La comprovació de sintaxi no detectava aquest error.
- Restaurada la construcció de soldats i general dins `src/characters.js`, amb els colors vermells, les extremitats articulades i els contractes `userData.arms`/`legs` que consumeix la IA. `mkEn()` fa servir aquesta interfície explícita.
- Corregides les coordenades de les escales: el mòdul rebia altures del món dins un grup que ja estava elevat. Ara rep altures locals i cada graó visible coincideix amb la superfície transitable.
- Les portes baixes amb llinda es conserven. Comprovada l’entrada des de les quatre orientacions.
- Afegit `tests/smoke.cjs`, executable amb `node tests/smoke.cjs`, sense dependències addicionals: carrega el Three.js inclòs i tots els scripts de l’HTML en ordre, construeix el món i comprova enemics, escales, portes, els set vehicles, minimapa, reinici, joystick i vegetació.
- Prova superada amb 98 edificis i 186 vehicles en el mapa aleatori d’aquesta execució.
- Límit: DOM, àudio i renderer GPU simulats. Aquest test no valida shaders, aspecte visual, so real, rendiment GPU ni ergonomia Android.
- README adaptat al fork modular: cal conservar `src/` al costat de `index.html`.
- La feina ja s'ha fusionat a `main`. No s'ha afegit cap workflow de GitHub Pages. El desplegament previst és Cloudflare Pages a `hunter.paradoxa.cat`.

Validació visual inicial de `main`: el joc arrenca i és jugable en navegador. Les millores prèvies eren sobretot estructurals i per això el salt visual percebut era modest.

Passada visual posterior: paleta centralitzada, contrast reforçat de jugador/soldats/general i fauna modular amb models low-poly més recognoscibles.

Pròxim pas: completar la interfície comuna d’animació de la fase C i continuar la fase D amb calibratge del joystick i revisió dels controls tàctils.


## Passada tàctil i visual — 2026-10-03
- Joystick augmentat a 148 px, pom de 64 px, zona morta reduïda i resposta analògica progressiva.
- Botons d'acció augmentats a 58 px i reposicionats amb safe areas.
- Qualitat adaptativa lleugerament incrementada: més resolució efectiva en mòbil/escriptori i ombres de 2048 px en escriptori.
- Terreny amb una paleta més rica i contrastada, especialment entre aigües fondes, aigües costaneres, sorra i vegetació.
- Palmeres, arbustos i roques amb geometria i variació visual millorades.
- Edificis amb cornises, marcs i ampits nous; les col·lisions no s'han modificat.
- Cel i il·luminació revisats amb gradient de tres tons, fill light i halo solar.
- La validació completa de rendiment i ergonomia continua pendent en Android real.


## Obertures arquitectòniques — 2026-10-03
- Portes exteriors redimensionades: menys amples i més altes respecte al personatge.
- Les tres façanes sense porta ja no són murs continus amb vidres superposats.
- Les finestres es construeixen com obertures reals: ampit inferior, llinda superior i pilars laterals/intermedis.
- El vidre queda lleugerament endins del buit i conserva marcs low-poly.
- Les col·lisions generals de façana es mantenen per no alterar IA ni navegació; visualment, però, el mur ja té el forat real.
- La destrucció de façanes amaga també vidres i marcs associats.

## Passada visual de vehicles — 2026-10-03
- Cotxe: carrosseria més definida, sostre, acabats frontals i detalls de llums/para-xocs reforçats.
- Moto: dipòsit, seient, llums posteriors i estructura mecànica més clara.
- Bicicleta: seient i acabats més llegibles mantenint pedalier i contracte d'animació.
- Tanc: més volum, faldons laterals, torreta i canó reforçats, detalls frontals afegits.
- Helicòpter: fuselatge/cabina més definida, detalls laterals, rotor principal reforçat i llums frontals.
- Es mantenen sense canvis els valors de `scales`, `radii` i els contractes `wheels`, `rotor`, `tailRotor`, `fan` i `crank`.

## Llanxa i hovercraft — 2026-10-03
- Llanxa: coberta i bordes més definits, detall interior, llums i acabats de popa millorats.
- Hovercraft: faldó i carrosseria més marcats, cabina reforçada, conducte i ventilador de quatre pales, suports i llums frontals.
- Es mantenen intactes `scales`, `radii` i el contracte `userData.fan` de l'hovercraft.

## Torres i assentaments funcionals — 2026-10-04
- Torres de vigilància redissenyades amb quatre pilars, plataforma, baranes, cabina i sostre; s'elimina la silueta tipus "xampinyó".
- Les torres ja no roten visualment per seguir el jugador.
- Cadència de tir de les torres duplicada: cooldown de 1,4 s a 0,7 s.
- El punt de detecció i de tir de les torres s'ha elevat fins a la plataforma superior.
- Les cases aleatòries aïllades s'han substituït en gran part per compounds funcionals: avançada enemiga, garatge, port i polvorí.
- Els garatges poden generar hangars amb portes amples permanentment obertes i vehicles estacionats a dins.
- Els hangars fan servir col·lisió per parets/obertures en lloc del volum AABB complet per permetre que els vehicles en surtin per la porta.
- Els ports concentren la generació de vehicles aquàtics i s'ha eliminat l'antic bucle que generava fins a quatre vehicles aquàtics per illa.
- Es manté una llanxa de servei prop de la base i els vehicles aquàtics addicionals queden principalment vinculats als ports.

## Col·lisions d'edificis i proporcions humanes — 2026-10-04
- Els vehicles deixen d'utilitzar la caixa AABB global dels edificis, que sobresortia massa i provocava enganxaments.
- La conducció col·lisiona ara amb les parets reals `Wl` més el radi del vehicle, respectant portes i obertures.
- Jugador i enemics mantenen l'alçada i els punts d'animació, però tenen tors, braços, cames i cap més estrets i proporcionats.
- Es conserven els contractes d'animació `legs`, `arms`, `ll/lr`, `al/ar` i l'escala general del jugador.

## Hangars arquejats i rampes — 2026-10-04
- Els hangars de garatge passen a una nau de gran llum amb coberta arquejada low-poly, inspirada en hangars semicilíndrics.
- Mida del hangar principal ampliada a 30 × 42 m i alçada visual aproximada de 18 m.
- Porta principal ampliada a 18 m i boca frontal oberta perquè els vehicles hi entrin i surtin amb marge.
- Les parets laterals queden baixes sota l'arrencada de la volta; la coberta incorpora nervis metàl·lics.
- Els hangars ja no generen escales d'accés. Si hi ha desnivell, creen una rampa contínua alineada amb la porta.
- `groundAt()` reconeix les rampes i interpola l'altura de manera contínua.
- La coberta arquejada és un grup separat perquè es pugui ocultar o destruir sense fer desaparèixer tot l'edifici.


## Full de ruta — assentaments funcionals
### Fase G1 — Identitat visual de compounds — COMPLETADA
- Avançada enemiga: sacs/barreres, torre, il·luminació o senyalització vermella i punts defensius.
- Garatge: hangar, taller auxiliar, bidons, caixes i vehicles aparcats amb una lectura clara de zona mecànica.
- Port: molls, amarradors, magatzem i equipament naval/portuari.
- Polvorí: caixes de munició, tanques/perímetre, senyalització i separació de seguretat.

### Fase G2 — Composició espacial coherent — COMPLETADA
- Evitar offsets rígids repetitius.
- Crear pati o espai central als compounds.
- Orientar portes, rampes i vehicles cap a l'espai central o cap a la sortida funcional.
- Reservar espai lliure de vegetació i obstacles entre edificis.

### Fase G3 — Camins i superfícies — COMPLETADA
- Terra compactada o asfalt als garatges i avançades.
- Camins curts entre edificis.
- Moll/plataforma als ports.
- Transicions de superfície coherents amb el terreny.

### Fase G4 — IA contextual — COMPLETADA
- Patrulles dins de l'avançada.
- Soldats utilitzant punts defensius, torres i edificis com a referència.
- Reaccions diferenciades segons el tipus de compound.


### Implementació inicial G1/G2 — 2026-10-04
- Afegits props funcionals reutilitzables: caixes, bidons, barreres, caixes de munició, bol·lards i senyalització.
- Afegides plataformes/superfícies locals per donar lectura d'espai central als compounds.
- Avançada: barreres defensives, senyalització, caixes, bidons, torre i soldats disposats al voltant d'un pati.
- Garatge: hangar gran, taller auxiliar, zona de bidons/caixes i vehicles aparcats.
- Polvorí: barreres, caixes de munició, senyalització i guarda.
- Port: bol·lards, equipament bàsic, magatzems i vehicle aquàtic vinculat al port.
- Els compounds tenen una rotació lleugerament variable per evitar patrons massa repetitius.


### Implementació inicial G3 — 2026-10-04
- Afegits camins segmentats que segueixen l'altura local del terreny en trams curts.
- Afegides zones de compound excloses de vegetació perquè patis, accessos i molls quedin transitables.
- Avançades: camí interior entre accés, pati i edificis.
- Garatges: vial d'accés ample cap a l'hangar i connexió amb el taller auxiliar.
- Polvorins: accés intern més estret i clar.
- Ports: connexió pavimentada entre magatzems i línia de costa.
- Afegits molls físics de fusta amb pilons metàl·lics que s'estenen fins a aigua prou fonda.
- Els vehicles aquàtics de port apareixen al costat del moll en lloc de damunt seu.


### Implementació inicial G4 — 2026-10-04
- Els soldats poden tenir rutes de patrulla explícites i les segueixen quan no estan en alerta.
- Avançades: patrulles de perímetre/pati.
- Polvorins: guàrdies amb recorreguts més curts i defensius.
- Garatges i ports: poden generar un guarda local amb patrulla contextual.
- HQ enemic: diversos soldats patrullen un circuit interior del perímetre.
- La lògica d'alerta/combat continua tenint prioritat sobre la patrulla.

### Fortificació del HQ — 2026-10-04
- Afegit perímetre de filferrada funcional al voltant del complex del HQ.
- La filferrada té pals metàl·lics, tres línies horitzontals i fil superior en ziga-zaga.
- El perímetre bloqueja jugador i vehicles mitjançant la mateixa infraestructura `Wl` que les parets.
- Es deixa una entrada ampla al costat sud del recinte perquè el HQ continuï sent accessible.
- La zona interior del HQ queda exclosa de vegetació per preservar la lectura del perímetre.


## Llavor de generació del mapa — 2026-10-04
- La pantalla d'inici incorpora un camp de llavor.
- Per defecte, l'opció **Llavor aleatòria** està activada.
- Si es desactiva, es pot escriure una llavor numèrica o de text.
- Les llavors de text es converteixen de manera determinista a un valor de 32 bits.
- En començar la partida, el món es regenera amb la llavor seleccionada.
- La llavor activa es mostra al HUD perquè es pugui reutilitzar.
- Illes, assentaments, vehicles i vegetació estructural/visual utilitzen la mateixa font pseudoaleatòria sembrada.
- Si una llavor concreta no produeix un mapa vàlid en el primer intent, s'aplica una derivació determinista i el HUD mostra la llavor final realment usada.


### Tancament G1–G4 — 2026-10-04
- G1 completada: identitat visual diferenciada per avançades, garatges, polvorins i ports amb props específics (sacs, dipòsits, llums, malla, munició i equipament portuari).
- G2 completada: portes dels edificis de compound orientades cap al pati o centre funcional sempre que no hi ha una orientació explícita; es manté variació espacial per evitar patrons rígids.
- G3 completada: camins amb voral/transició, accessos segmentats adaptats al terreny i molls enriquits amb baranes i amarradors.
- G4 completada: patrulles contextuals més punts defensius; els soldats en alerta poden ocupar posicions preparades amb línia de tir abans de perseguir directament el jugador.
- HQ: patrulles interiors i punts defensius associats al perímetre de filferrada i a l'accés principal.


## Anivellament de terreny i separació de compounds — 2026-10-04
- Afegit un sistema de zones de terreny normalitzat (`terrainLevels`) integrat directament a `hAt()`.
- Bases, HQ i compounds defineixen una petjada plana abans de crear el mesh del terreny.
- La transició entre zona plana i relleu natural es fa amb una franja de blend suau per evitar talussos verticals.
- Els edificis s'ancoren a la cota normalitzada del centre en lloc d'agafar el màxim de les cantonades.
- Els paviments dels compounds queden encaixats pràcticament a ras del terreny i deixen de surar.
- Els camins continuen seguint la cota local, ara sobre un terreny ja normalitzat a les zones de construcció.
- La base del jugador i el HQ també tenen plataformes de terreny planificat més àmplies.
- Els edificis interns dels compounds s'han separat significativament: avançades, garatges, polvorins i ports ocupen una petjada més gran.
- Els centres dels compounds intenten mantenir almenys 150 m de separació.
- Un segon compound a una mateixa illa només es genera en illes grans, amb menor probabilitat i una separació mínima aproximada de 190 m respecte del primer.


## Ports garantits i molls independents — 2026-10-04
- La generació intenta reservar primer fins a dos ports funcionals en illes amb costa i aigua fonda adequades.
- Si no es poden col·locar dos ports, es fa un segon intent més permissiu per garantir-ne almenys un sempre que el terreny ho permeti.
- Els ports aleatoris només es creen quan la ubicació té accés real a aigua fonda; en cas contrari es reconverteixen en un altre tipus de compound.
- Els molls dels ports reutilitzen la zona costanera validada i mantenen els vehicles aquàtics al costat del moll.
- Afegits entre 3 i 5 molls de fusta independents per mapa, sense edificis associats.
- Els molls independents busquen costa vàlida, eviten les illes que ja tenen un port garantit i mantenen distància respecte dels compounds.


## Vehicles militars en zones protegides — 2026-10-04
- Els tancs i helicòpters deixen de formar part de la generació aleatòria general de vehicles.
- La base del jugador i les illes obertes mantenen principalment cotxes, motos i bicicletes.
- El HQ enemic genera un tanc i un helicòpter estacionats dins la zona protegida sempre que hi hagi espai lliure.
- Les avançades enemigues poden generar tancs i helicòpters amb probabilitat moderada, vinculats visualment a la presència militar.
- Els vehicles militars previstos pels compounds validen espai contra edificis, vegetació i altres vehicles abans d'aparèixer.


## Selector de mida del mapa — 2026-10-04
- Afegit selector al menú inicial: Petit (4,8 × 4,8 km) i Gran (9,6 × 9,6 km).
- Petit és el valor per defecte i conserva la mida històrica del joc.
- Gran duplica l'amplada i l'alçada del món, és a dir, quadruplica la superfície total.
- Les illes conserven aproximadament la mateixa escala física; en mode Gran augmenta el nombre d'illes i illes grans per mantenir una densitat semblant.
- La mida seleccionada entra en l'espai de generació de la llavor: mateixa llavor textual + mateixa mida + mateixa versió reprodueixen el mateix món.
- Ports garantits i molls independents escalen moderadament amb la mida del mapa.
- El sistema d'aigua cobreix la mida màxima de 9,6 km i el terreny/bordes utilitzen la mida activa.
- El minimapa i la carta de navegació actualitzen escala, coordenades i etiqueta de mida dinàmicament.


## HUD simplificat i inventari — 2026-10-04
- La pantalla principal deixa només dos botons tàctils: Dispar i Acció.
- El botó Acció entra/surt de vehicles quan n'hi ha un de contextual i, en cas contrari, obre l'inventari.
- Afegida tecla I per obrir l'inventari amb teclat.
- Farmacioles, explosius, disfressa i mapa es gestionen des d'un inventari en graella amb panell de detall i accions Usa/Deixa.
- Les farmacioles ja no es consumeixen automàticament en recollir-les; queden guardades fins que el jugador les usa.
- Els explosius es planten des de l'inventari i es valida que el jugador no sigui dins d'un vehicle ni nedant.
- La disfressa es pot activar/desactivar des de l'inventari i el mapa obre directament la carta de navegació.
- El HUD textual s'ha simplificat a vida, munició, baixes, estat, missatges contextuals, llavor i coordenades.
- El menú de pausa inclou accés directe a l'inventari.


## Combat cos a cos i mapes militars — 2026-10-04
- Quan el jugador va a peu i té 0 munició, el botó Dispar passa automàticament a atac cos a cos.
- Afegit un ganivet visual al model del jugador que només és visible durant l'animació del cop.
- L'atac amb ganivet té abast curt (aprox. 2,6 m), una cadència més lenta i 6 punts de dany, per sota dels 12 punts de la pistola.
- Afegits dos nous tipus d'objecte: mapa d'helicòpter i mapa de tanc.
- Aquests mapes apareixen en alguns edificis addicionals i es mostren dins l'inventari en graella.
- En usar-los, marquen una posició coneguda d'un helicòpter o d'un tanc militar a la carta de navegació sense revelar l'HQ.
- Els marcadors d'intel·ligència es mostren sempre a la carta, encara que el vehicle sigui lluny: cian per helicòpter i taronja per tanc.


## Garantia de vehicles i camió militar — 2026-10-04
- Afegit el camió militar com a nou vehicle conduïble.
- El camió és més lent i menys àgil que el cotxe, amb acceleració 24 davant de 36 del cotxe.
- El camió té model propi de caixa militar coberta, sis rodes i pintura verda.
- Els garatges amb hangar sempre reserven com a mínim un vehicle interior; el validador ja no descarta aquest vehicle per col·lisió amb el propi hangar.
- Els hangars poden contenir cotxe, moto o camió militar, i ocasionalment una bicicleta addicional.
- HQ i avançades poden generar camions militars com a part de la seva dotació protegida.
- Al final de la generació de cada mapa es comprova que existeixi almenys una unitat de cada vehicle conduïble: llanxa, hovercraft, cotxe, moto, bicicleta, camió militar, tanc i helicòpter.
- Si en falta algun, el generador crea una ubicació de reserva coherent: costa per vehicles aquàtics, zona protegida per tanc/helicòpter/camió i terreny proper a la base per vehicles civils.


## Heliports, tancs múltiples i nous objectes — 2026-10-04
- Cada mapa reserva almenys un garatge/hangar abans de la resta de compounds; el primer hangar conté obligatòriament un tanc.
- Cada mapa garanteix almenys dos tancs conduïbles, a més dels tancs enemics que es puguin generar.
- El mapa de tanc mostra tots els tancs conduïbles i enemics, amb marcadors que segueixen la seva posició si es mouen.
- Afegit el compound `heliport`: plataforma anivellada amb H blanca, il·luminació, sacs terrers, tres soldats en patrulla/defensa i un helicòpter propi.
- Es força almenys un heliport per mapa. L'helicòpter de l'heliport queda etiquetat com a especial i no satisfà la garantia d'helicòpter general, de manera que és un helicòpter addicional.
- Avançades i garatges poden generar plataformes d'aterratge opcionals; aquestes plataformes anivellen també la seva petjada per evitar terres flotants.
- Redissenyats els objectes físics: mapes prims amb pictograma del contingut, TNT amb metxa, farmaciola blanca amb tirita, caixa de munició amb bales visibles i camisa enemiga vermella en vertical.
- Les icones de l'inventari s'han substituït per pictogrames SVG coherents amb els nous models.


## Nous vehicles armats i sistema de dany — 2026-10-04
- Afegits cinc vehicles conduïbles: barca de rems, helicòpter de combat, taula de windsurf, tanqueta blindada i llanxa llançacoets.
- Els cinc tipus nous formen part de la generació per llavor i el generador intenta garantir-ne almenys un exemplar per mapa.
- Helicòpter de combat: metralladora frontal com a arma principal i 6 míssils limitats. En mòbil, una pulsació llarga de Dispar llança el míssil; amb teclat també es pot usar G.
- Llanxa llançacoets: 5 coets limitats, disparats amb el botó Dispar.
- Tanqueta: metralladora frontal/superior ràpida i blindatge elevat.
- Barca de rems i windsurf no generen so de motor.

### Blindatge i vida dels vehicles
| Vehicle | Blindatge | Vida (impactes estructurals) |
| --- | ---: | ---: |
| Bicicleta | 0 | 1 |
| Moto | 0 | 2 |
| Windsurf | 0 | 1 |
| Barca de rems | 0 | 2 |
| Llanxa | 1 | 4 |
| Cotxe | 2 | 4 |
| Hovercraft | 2 | 5 |
| Llanxa llançacoets | 3 | 7 |
| Camió militar | 4 | 6 |
| Helicòpter | 4 | 8 |
| Helicòpter de combat | 6 | 12 |
| Tanqueta blindada | 7 | 10 |
| Tanc | 10 | 18 |

- El blindatge usa escala 0–10 i redueix el dany que arriba al pilot; amb blindatge 10 els impactes normals no fan mal al conductor.
- Cada impacte resta com a mínim una unitat de vida estructural; explosions fortes poden restar-ne diverses.
- Els vehicles danyats emeten fum, amb freqüència i densitat creixents segons el percentatge de dany rebut.
- Quan la vida arriba a zero, el vehicle explota i s'elimina del món.
- Si el jugador conduïa el vehicle destruït, és expulsat en una direcció aleatòria durant un breu impuls i rep dany per l'explosió.
- El HUD mostra blindatge, vida actual/màxima i munició especial quan correspon.
## Darrer estat verificat — 2026-10-04
Sincronitzat amb `main` fins al commit de codi `66df938` i els commits posteriors de HUD, controls i documentació (`43837f7`).

- Nous vehicles implementats i conduïbles: barca de rems, helicòpter de combat, windsurf, tanqueta blindada i llanxa llançacoets.
- Física específica afegida per als nous tipus de vehicle i integració amb la generació determinista per llavor.
- Sistema estructural de vehicles actiu: blindatge 0–10, vida pròpia per vehicle, fum proporcional al dany i explosió en arribar a 0.
- El blindatge redueix el dany transferit al conductor; el tanc, amb blindatge 10, protegeix completament el pilot dels impactes normals.
- En destruir-se un vehicle ocupat, el jugador és expulsat amb un impuls en direcció aleatòria i rep dany de l'explosió.
- Helicòpter de combat: metralladora frontal i 6 míssils limitats; míssil amb G en teclat i pulsació llarga de Dispar en tàctil.
- Llanxa llançacoets: 5 coets limitats; tanqueta: metralladora ràpida.
- HUD ampliat amb blindatge, vida actual/màxima i munició especial.
- Controls tàctils ampliats per donar accés a les armes especials.
- Barca de rems diferenciada visualment i, igual que el windsurf, sense so de motor.
- La documentació i el menú de controls ja descriuen les armes especials.

### Validació que continua pendent
- Provar en navegador real que tots els nous vehicles apareixen correctament amb diferents llavors i mides de mapa.
- Validar en Android els controls tàctils de míssils/coets i la pulsació llarga.
- Revisar balanç de blindatge, vida, dany al pilot, força d'expulsió i dany d'explosió.
- Comprovar visualment la progressió del fum i que no queden vehicles destruïts amb col·lisions o marcadors fantasma.
- Verificar que els mapes de tanc/helicòpter i el HUD reaccionen correctament quan un vehicle cartografiat es mou o és destruït.


## Bazooka d’un sol ús — 2026-10-04
- Afegit el **bazooka** com a nou objecte recollible i gestionable des de l’inventari.
- Creat un model low-poly propi per a l’objecte al món: tub, boca, culata, empunyadura i mira.
- Afegida una icona SVG específica coherent amb la resta de pictogrames de l’inventari.
- El bazooka es pot equipar/desequipar des de l’inventari i el HUD indica quan està equipat.
- El model del jugador mostra físicament el bazooka sobre l’espatlla/mans quan està equipat; pistola i ganivet queden ocults mentre es porta.
- El tret consumeix una unitat de bazooka: cada exemplar és **d’un sol dispar**.
- El projectil té velocitat moderada i una explosió de gran potència (radi 18 i dany base 135), capaç d’afectar enemics, vehicles, murs, edificis i altres elements destructibles.
- L’explosió del bazooka també pot fer mal al jugador si dispara massa a prop.
- S’ha incorporat el bazooka al pool procedural d’objectes que poden aparèixer dins d’edificis.
- Els polvorins tenen, a més, una probabilitat específica de contenir un bazooka.
- No es pot equipar mentre es neda o es condueix; si ja estava equipat en entrar en un vehicle queda ocult fins que el jugador torna a anar a peu.


## Simplificació de l’inventari — 2026-10-04
- Eliminats els textos “Motxilla”, “Objectes trobats” i el recompte total d’objectes.
- Eliminats els botons “Usa” i “Deixa”; els objectes ja no es deixen caure des de l’inventari.
- En prémer directament un objecte utilitzable, s’executa la seva acció: consumir, equipar/desequipar, plantar explosius o obrir el mapa segons el tipus.
- L’inventari redueix la graella mínima de 20 a 15 espais, eliminant la fila inferior innecessària en escriptori.
- El botó inferior “Continua” s’ha substituït per una creu de tancament a la cantonada superior dreta del panell, mantenint la mateixa funció de reprendre la partida.


## Vehicles aquàtics oberts i barca de rems — 2026-10-04
- Simplificada la llanxa llançacoets: eliminats tubs, bastidors i detalls sobrants; queda una silueta més neta amb dos llançadors principals.
- La barca de rems és ara més petita i compacta.
- Redissenyada la barca amb proa arrodonida/ovalada i una forma de buc més pròxima a una barca real.
- Els rems tenen mànec i pala diferenciats visualment.
- El jugador es mostra físicament quan ocupa barca de rems, llanxa, llanxa llançacoets o windsurf.
- La barca de rems es pilota assegut i d’esquena a la direcció d’avanç, com en una barca real.
- Afegida animació de remar sincronitzada amb la velocitat del vehicle: braços, tronc i rems comparteixen la mateixa fase.
- El windsurf mostra el jugador dret amb postura específica subjectant la botavara.
- Les llanxes mostren el jugador assegut en posició de pilotatge.


## Col·lisions dinàmiques de vehicles — 2026-10-04
- Corregida la roda de recanvi del cotxe: queda exclosa del conjunt de rodes animades i ja no gira mentre el vehicle avança.
- Afegits atropellaments de soldats amb vehicles terrestres: el dany al soldat escala amb la velocitat de l’impacte i el vehicle rep també un impacte estructural.
- Els atropellaments redueixen lleugerament la velocitat però no aturen en sec el vehicle.
- Les palmeres deixen de funcionar com a murs per als vehicles: en xocar-hi, cauen amb l’animació existent i el vehicle rep dany proporcional a la velocitat.
- Les roques provoquen dany estructural, espurnes, una petita desviació i un bump visual.
- Els impactes contra roca redueixen moderadament la velocitat però permeten continuar avançant, sense bloqueig total.
- Afegits cooldowns curts als impactes per evitar aplicar dany cada frame mentre el vehicle encara se solapa amb l’objectiu.


## Correcció de destrucció durant col·lisions — 2026-10-04
- Corregit un bloqueig del joc quan un vehicle arribava a 0 de vida arran d’un atropellament o impacte amb palmera/roca.
- La causa era que `explodeVehicle()` eliminava el vehicle conduït i posava `cv=null`, però el mateix frame encara intentava llegir `cv.x`, `cv.z` i `cv.hd`.
- `stepV()` retorna ara si el vehicle continua viu després de processar l’impacte.
- El bucle principal conserva una referència local al vehicle conduït i només sincronitza la posició del jugador si aquell vehicle continua existint.
- Els impactes amb soldats, palmeres i roques tallen immediatament la resta de lògica si el vehicle queda destruït.


## Generador de vehicles, heliports i hangars — 2026-10-04
- Eliminats els helicòpters de la base enemiga: la reserva militar fixa de l’HQ ja no en col·loca cap.
- Els heliports es generen ara amb reserva reforçada fora de la base enemiga; en mapes petits se’n busca més d’un i en mapes grans encara més.
- Afegit un fallback de generació d’heliports que pot reutilitzar altres illes adequades si les candidates especials inicials no són suficients.
- Els helicòpters normals, helicòpters de combat i tanquetes es garanteixen en posicions distribuïdes pel mapa, lluny de l’HQ enemic.
- Els ports poden generar llanxa, llanxa llançacoets, barca de rems, windsurf o hovercraft.
- Reforçada la cerca de punts d’aigua per garantir que els vehicles aquàtics nous tinguin una posició vàlida encara que el primer port o costa no serveixi.
- Els hangars ja no poden generar motos ni bicicletes a dins; ara poden contenir tanc, cotxe, camió o tanqueta.
- L’hangar de tanc s’ha ampliat: 34 m d’amplada, boca de 26 m i porta més alta.
- La rampa d’accés pot arribar ara fins a 24 m d’amplada, suficient per al radi de col·lisió del tanc.
- El tanc apareix una mica més a prop de l’eix de sortida i orientat directament cap a la boca de l’hangar.


## HQ enemic, filferrada i vehicles militars — 2026-10-04
- L’edifici central de l’HQ enemic s’ha convertit en un búnquer blanquinós, sense finestres laterals, amb laterals inclinats i una entrada frontal més contundent, prenent com a referència visual el búnquer de l’original.
- La bandera vermella enemiga queda associada visualment al búnquer central.
- La composició fixa de vehicles dins del recinte és ara: 1 tanc i 2 tanquetes armades.
- Eliminats els antics spawns de jeeps/tancs enemics dins del recinte que podien alterar aquesta composició.
- Afegits 2 cotxes enemics patrullant per l’exterior de la filferrada en sentits oposats.
- La filferrada del HQ s’ha refet visualment amb pals metàl·lics, tres fils horitzontals, diagonals creuades i fil superior irregular.
- El perímetre està dividit en seccions curtes independents; cada secció té vida pròpia i pot ser destruïda individualment.
- Els explosius continuen danyant la filferrada mitjançant el sistema general de murs.
- Els vehicles terrestres poden embestir la filferrada: la secció rep dany, el vehicle també, es generen espurnes/bump i, si la secció cau, s’obre un pas.
- Els helicòpters ja no depenen només de la cerca probabilística: els heliports registren explícitament la seva posició i forcen un helicòpter associat.
- El segon heliport prioritza un helicòpter de combat; hi ha un fallback dur que garanteix helicòpters normals i de combat en terreny vàlid lluny de l’HQ si la generació habitual falla.
- Les tanquetes tenen garantia addicional de generació distribuïda i, a més, n’hi ha dues garantides al HQ.
- Els reforços militars addicionals (tancs, camions, helicòpters, heli de combat i tanquetes) ja no es creen al voltant de la base enemiga, sinó distribuïts pel mapa.


## Explosió i desmuntatge dels vehicles — 2026-10-04
- Quan un vehicle arriba a 0 de vida, el seu model ja no desapareix de cop.
- Abans d’eliminar el vehicle original, es clonen diverses peces reals del model i es converteixen en fragments físics independents.
- Les peces surten disparades radialment, amb velocitat vertical, rotació als tres eixos, gravetat i rebot contra el terreny.
- Els vehicles pesants (tanc, tanqueta i camió) generen més fragments que els vehicles lleugers; els helicòpters també generen un nombre elevat de peces.
- S’afegeixen fragments metàl·lics addicionals, fum i l’explosió central existent per donar més lectura visual a la destrucció.
- Les peces romanen visibles durant uns segons abans de desaparèixer progressivament.


## Animacions de baixes i redisseny de vehicles — 2026-10-04
- Els soldats enemics ja no desapareixen en morir: surten de la lògica activa, fan una animació de caiguda lateral amb braços i cames relaxats i queden estesos a terra durant uns segons.
- Les torres enemigues es desmunten en peces quan són destruïdes; cada element surt projectat amb rotació, gravetat, rebot, fum i explosió.
- La tanqueta deixa d’utilitzar erugues: ara té 6 rodes de vehicle, tres a cada costat, amb una carrosseria de blindat lleuger.
- Simplificat el model de la llanxa bàsica eliminant baranes i detalls sobrants; manté una silueta clara de llanxa oberta.
- L’helicòpter bàsic s’ha redissenyat amb silueta inspirada en un UH-1 Huey: cabina ampla, fuselatge simple, patins i cua llarga.
- L’helicòpter de combat s’ha redissenyat amb silueta inspirada en un AH-64 Apache: fuselatge més estret, cabina en tàndem, ales curtes amb armament i canó frontal.
- Els rems de la barca són ara peces rígides alineades: mànec, canya i pala comparteixen exactament el mateix eix.
- Durant la palada, els rems basculen cap avall perquè la pala entri visualment dins l’aigua.
- La postura de les mans del remer s’ha ajustat per seguir millor el punt interior dels rems durant el cicle.


## Moto aquàtica — 2026-10-04
- Afegit un nou vehicle aquàtic: moto aquàtica.
- Té acceleració i resposta clarament superiors a les llanxes, amb gir més ràpid i millor resposta de control.
- Té menys resistència: armadura 0 i vida 2, per sota de la llanxa bàsica.
- Afegit model visual compacte amb casc estret, seient i manillar.
- El jugador es mostra sobre la moto aquàtica amb postura inclinada endavant, mans al manillar i peus recolzats als laterals.
- La moto aquàtica forma part de la distribució de vehicles dels ports.
- També s’inclou en el sistema de garantia de tipus de vehicle aquàtic perquè pugui aparèixer encara que la selecció aleatòria dels ports no la triï.


## HUD, inèrcia i baixada en marxa — 2026-10-04
- La icona de pistola del HUD i del control de dispar s’ha substituït per un punt de mira (🎯).
- El botó d’acció ja no mostra la lletra E: ara mostra una mà (✋), mantenint KeyE com a control de teclat.
- Els vehicles conserven la seva velocitat quan el jugador en baixa; ja no es força `v=0`.
- Els vehicles sense conductor amb velocitat residual continuen simulant la física i avancen fins perdre inèrcia segons el drag propi de cada tipus.
- Es pot baixar d’un vehicle en marxa; els helicòpters mantenen la restricció d’haver d’estar pràcticament aterrats.
- Si la velocitat és superior a un llindar mínim, el jugador hereta part de la velocitat del vehicle, rep una mica de dany proporcional a la velocitat i fa una voltereta visual.
- La baixada en marxa afegeix un petit impuls lateral per separar el jugador de la trajectòria immediata del vehicle.
- Les explosions de vehicles reutilitzen ara la mateixa animació de voltereta per al conductor expulsat.


## Salt des d'helicòpter i barrena — 2026-10-04
- El jugador pot abandonar un helicòpter encara que estigui en vol; ja no és obligatori aterrar abans de baixar.
- En saltar, el jugador conserva part de la velocitat horitzontal de l'helicòpter i entra en caiguda lliure amb gravetat.
- Durant la caiguda el model del jugador gira i fa una animació de voltereta.
- El dany d'impacte es calcula segons l'alçada de la caiguda i la velocitat vertical en tocar superfície.
- Les caigudes a l'aigua redueixen el dany respecte a les caigudes sobre terra.
- En quedar sense pilot, l'helicòpter entra en barrena: gira progressivament, conserva part de la velocitat, perd alçada i es desestabilitza visualment.
- Els rotors continuen girant durant la barrena però perden velocitat gradualment.
- Quan l'helicòpter toca terra o la superfície de l'aigua, es destrueix mitjançant el sistema d'explosió i peces ja implementat.


## Reforç defensiu de l'HQ enemic — 2026-10-04
- Els dos cotxes de patrulla exterior continuen sent vehicles enemics amb IA i ruta perimetral.
- Les dues tanquetes del HQ deixen de ser vehicles neutrals conduïbles: ara són entitats enemigues armades amb IA, moviment i tir, amb patrulles interiors en sentits oposats.
- El tanc del recinte es manté com a vehicle independent.
- Les quatre torres de vigilància s'han recol·locat als quatre cantons reals del perímetre, just per dins de la filferrada.
- La filferrada del HQ és aproximadament el doble d'alta, amb pals de gairebé 5 m, cinc línies horitzontals i reforços diagonals.
- La porta principal del búnquer és més estreta i baixa, i queda bloquejada: ja no s'obre automàticament quan el jugador s'hi acosta.
- La porta continua formant part del sistema destructible de murs, de manera que es pot forçar per combat/explosius.
- L'interior del búnquer té ara una distribució fixa amb passadís central, diverses cambres laterals i una cambra posterior.
- El general apareix aleatòriament en una de diverses posicions interiors, de manera que no queda sempre al mateix punt.


## Fum de dany, rampa de tanc i molls caminables — 2026-10-04
- Les partícules de fum dels vehicles danyats són ara més petites i de gris més fosc.
- El fum de dany té velocitat vertical pròpia i puja progressivament mentre s'esvaeix, en lloc de quedar-se fix al punt d'emissió.
- La física dels vehicles terrestres utilitza ara `groundAt()` per reconèixer rampes i altres superfícies elevades, en lloc de dependre només de l'altura bruta del terreny.
- L'hangar principal s'ha ampliat a 40 m d'amplada, amb una boca de 32 m i una porta d'11 m d'alçada.
- La rampa de l'hangar pot ser més llarga i arribar fins a 30 m d'amplada, facilitant la sortida del tanc.
- El vehicle dins l'hangar apareix una mica més alineat amb l'eix de sortida.
- Els molls ja no generen una carretera artificial fins a la costa o el compound.
- Cada tram de moll registra ara una superfície caminable pròpia; `groundAt()` la tracta com a terra elevada.
- El jugador pot caminar sobre els molls i deixa de travessar-los o caure visualment a través de la plataforma.


## Mapes de vehicles i variants de palmeres — 2026-10-04
- El mapa d'helicòpters marca ara tots els helicòpters actius del mapa, tant els bàsics com els de combat.
- El mapa de tancs manté tots els tancs actius marcats i ara conserva referències als vehicles reals en lloc de còpies fixes de coordenades.
- Les marques dels mapes segueixen així la posició actual dels vehicles si aquests es mouen.
- La densitat general de palmeres s'ha augmentat aproximadament al doble mantenint la resta de vegetació en proporcions similars.
- Les palmeres poden aparèixer ara a zones més altes de les illes, fins aproximadament a cota 42, sempre que el pendent sigui acceptable.
- L'alçada/escala de cada palmera varia aproximadament un ±25% respecte de la mida base.
- La tonalitat de cada palmera varia entre aproximadament un 25% més fosca i un 25% més clara.
- S'han creat tres variants reals de capçada: 6, 8 i 10 fulles principals, equivalents aproximadament a -25%, normal i +25% respecte de la variant central.
- La segona corona de fulles també varia en densitat (5, 7 o 9 fulles) per reforçar la diferència visual.
- La destrucció individual de palmeres continua funcionant amb les noves variants instanciades.


## Visió enemiga i articulacions del personatge — 2026-10-04
- El radi general de detecció dels enemics s'ha duplicat: detecció normal 60→120, alerta 150→300 i general 30→60.
- La detecció amb disfressa també s'ha duplicat de 10 a 20 per mantenir la mateixa proporció.
- L'abast de foc de les torres de vigilància augmenta un 50%, de 75 a 112,5.
- El personatge principal deixa de tenir braços i cames rígids d'una sola peça.
- Cada braç té ara espatlla, colze i avantbraç articulats; l'arma i el ganivet queden ancorats a l'avantbraç dret.
- Cada cama té maluc, genoll i cama inferior articulats.
- L'animació de caminar coordina oposadament braços i cames, flexiona els genolls durant la passa i afegeix una lleugera oscil·lació corporal.
- Els colzes mantenen una flexió natural en repòs i canvien d'angle durant el moviment.
- Apuntar, atacar amb ganivet i portar el bazooka utilitzen postures específiques de colzes i espatlles.
- La natació utilitza ara flexió alterna de colzes i genolls, en lloc de fer girar extremitats rígides.
- S'ha afegit una respiració subtil en repòs per reduir l'aspecte robòtic quan el personatge està aturat.


## Orientació, mirall i senyalització dels compounds — 2026-10-04
- Els compounds deixen d'estar limitats a una orientació gairebé fixa: l'angle general es genera ara entre 0 i 360 graus.
- Cada compound té, a més, un 50% de probabilitat d'aparèixer reflectit horitzontalment.
- El mirall s'aplica a posicions d'edificis, rutes, defenses, decoració i vehicles; així, per exemple, la caseta auxiliar del garatge pot aparèixer a qualsevol dels dos costats de l'hangar.
- Les orientacions de vehicles, props i heliports segueixen la rotació i el mirall del compound.
- El polvorí té ara un perímetre complet de filferrada destructible, amb una obertura d'accés frontal.
- La zona útil del polvorí s'ha ampliat lleugerament per donar espai al nou perímetre.
- Tots els antics cartells vermells dels compounds s'han substituït visualment per un màstil alt amb bandera vermella.


## Caixes d'impacte dels vehicles — 2026-10-04
- Cada tipus de vehicle té ara una caixa d'impacte pròpia amb amplada i longitud específiques.
- Les caixes són rectangles orientats (OBB): roten amb l'angle real del vehicle i substitueixen el radi circular aproximat en les col·lisions principals.
- El jugador ja no pot travessar els vehicles; si entra dins la caixa, és expulsat cap al costat més proper.
- Un vehicle en moviment pot fer mal al jugador si l'impacta, amb dany proporcional a la velocitat.
- Els vehicles conduïbles col·lisionen entre ells i amb els vehicles enemics terrestres (cotxes de patrulla, tanquetes i tancs).
- Les col·lisions vehicle-vehicle redueixen la velocitat, poden provocar dany estructural a velocitats altes i generen efecte visual d'impacte.
- Els vehicles enemics amb IA comproven també les caixes abans d'avançar i eviten travessar o solapar altres vehicles.
- Els helicòpters utilitzen la seva caixa només quan l'altura és compatible amb l'altre vehicle, evitant col·lisions falses quan sobrevolen vehicles terrestres.
- El radi antic es manté com a fallback per a sistemes secundaris i tipus sense caixa específica.


## Voltereta més natural en baixar d'un vehicle — 2026-10-04
- La sortida voluntària d'un vehicle en marxa deixa d'utilitzar una rotació rígida del cos sencer.
- La nova animació fa una voltereta endavant amb entrada baixa, genolls flexionats, colzes recollits i braços protegint el cap.
- Durant el gir, el cos es manté compacte i s'eleva menys, per simular millor el contacte successiu amb espatlles i esquena.
- Al final de la voltereta, braços i cames s'estenen progressivament per recuperar la postura dreta.
- L'impuls lateral en saltar d'un vehicle s'ha reduït lleugerament perquè la trajectòria sigui menys artificial.
- L'expulsió causada per una explosió manté una animació separada i més caòtica, adequada a un impacte violent.


## Estabilització de col·lisions i destrucció — 2026-10-04
- Ampliat `tests/smoke.cjs` dels 7 vehicles històrics als 14 tipus conduïbles actuals: llanxa, moto aquàtica, hovercraft, cotxe, moto, bicicleta, barca de rems, windsurf, camió, tanqueta, llanxa llançacoets, tanc, helicòpter i helicòpter de combat.
- El smoke test comprova ara que tots els tipus conduïbles es generen, es poden ocupar i abandonar i conserven una posició visual finita després d'un pas de física.
- Afegides comprovacions de cobertura de caixes d'impacte per a tots els vehicles conduïbles.
- Afegida una prova bàsica de solapament OBB: dues caixes coincidents han de col·lidir i dues caixes molt separades no.
- Afegida una prova de destrucció que comprova que un vehicle destruït surt de `V` i deixa d'estar referenciat pels marcadors d'intel·ligència.
- Afegida una comprovació dels nous colzes i genolls del model del jugador.
- Afegida una comprovació estàtica que els compounds conserven rotació completa de 0–360° i mirall aleatori.
- Corregida una regressió potencial dels mapes militars: `explodeVehicle()` elimina ara qualsevol `intelMark` que apunti al vehicle destruït.
- `src/minimap.js` incorpora una segona defensa i ignora referències destruïdes o coordenades no finites, evitant marcadors fantasma encara que una referència residual arribés al renderitzat.
- Auditoria manual del flux `stepV() -> handleVehicleImpacts() -> damageVehicle() -> explodeVehicle()`: es conserva el retorn immediat quan una col·lisió destrueix el vehicle, evitant continuar accedint a un vehicle eliminat dins del mateix frame.
- Es manté pendent la validació visual/ergonòmica en navegador WebGL i Android real, especialment la nova voltereta, la resposta de col·lisions a diferents velocitats i la pulsació llarga de les armes especials.
- El smoke ampliat queda preparat per executar-se amb `node tests/smoke.cjs`; en aquesta sessió de manteniment no hi ha un runner Node connectat directament al repositori privat, així que no es declara com a execució superada fins que es llanci en un entorn amb checkout del repo.


## Dinàmica diferenciada de vehicles — 2026-10-04
- La física deixa d'utilitzar pràcticament el mateix model cinemàtic per a totes les famílies de vehicles.
- Tots els vehicles incorporen límits de velocitat endavant/enrere i una resposta de gir amb inèrcia pròpia (`yawResponse`).

### Vehicles terrestres
- Cotxe, moto, bicicleta, camió, tanqueta i tanc tenen ara perfils diferenciats d'adherència (`landGrip`), massa i pèrdua d'autoritat de gir a velocitat elevada.
- Els vehicles pesants responen més lentament als canvis de direcció; els lleugers reaccionen més ràpid.
- S'ha afegit una petita component de lliscament lateral dependent de l'adherència, sense convertir la conducció en un model de derrapatge arcade exagerat.
- En col·lisions vehicle-vehicle, la pèrdua de velocitat i el dany tenen en compte la relació aproximada de massa entre els vehicles.

### Vehicles aquàtics
- Llanxa, moto aquàtica, barca de rems, windsurf i llanxa llançacoets tenen ara deriva lateral específica (`waterDrift`).
- La capacitat de gir depèn de la velocitat: a molt baixa velocitat el timó/govern té menys autoritat, amb excepcions parcials per als vehicles més àgils.
- La moto aquàtica té resposta ràpida i més deriva; el windsurf és especialment sensible lateralment; la llanxa llançacoets és més estable i pesada.
- La barca de rems conserva velocitat i resposta baixes, amb una deriva moderada coherent amb un buc lleuger.
- L'hovercraft manté el mode híbrid terra/aigua però incorpora lliscament lateral superior als vehicles terrestres.
- La representació visual afegeix inclinació i balanceig suau en funció de gir, velocitat i onatge.

### Helicòpters
- Helicòpter bàsic i helicòpter de combat incorporen inèrcia de guiñada: el canvi de rumb ja no és instantani.
- L'ascens i descens utilitzen ara velocitat vertical suavitzada (`verticalV`) i resposta de sustentació (`liftResponse`).
- Quan es deixa anar el control vertical, la velocitat d'ascens/descens es dissipa gradualment en lloc de desaparèixer de cop.
- La inclinació visual longitudinal depèn de la velocitat i el banc lateral depèn de la taxa real de gir.
- L'helicòpter de combat és lleugerament més pesant i menys reactiu que el model bàsic, compensat per més blindatge i vida.

### Validació
- `tests/smoke.cjs` comprova ara que els vehicles terrestres tenen perfil d'adherència, els aquàtics perfil de deriva/govern a baixa velocitat i els helicòpters perfil de sustentació i actitud.
- El smoke existent continua fent un pas de física sobre cadascun dels 14 vehicles conduïbles i comprova que la posició visual segueixi sent finita.
- Queda pendent calibrar la sensació final en navegador real i Android, especialment els valors de deriva aquàtica, gir del tanc/camió i resposta vertical dels helicòpters.


## Erugues del tanc més arrodonides — 2026-10-04
- Redissenyada únicament la geometria visual de les erugues del tanc; la hitbox, l'escala, la física i la conducció es mantenen intactes.
- Eliminada la silueta rectangular tipus "caixa" de cada eruga.
- Cada costat utilitza ara un nucli de goma amb forma de càpsula: tram central i extrems circulars al voltant de les rodes davantera i posterior.
- Les baules metàl·liques recorren tant els trams rectes superior/inferior com els arcs frontal i posterior.
- Les rodes de rodament internes continuen visibles i mantenen el contracte d'animació de rodes existent.
- El resultat busca una lectura més pròxima a una eruga real, prenent com a referència visual el contorn arrodonit aportat per l'usuari.


## Animació diferencial de les erugues del tanc — 2026-10-04
- Les baules de cada eruga ja no són estàtiques: circulen contínuament al voltant del contorn arrodonit de l'eruga.
- En avançar, la part superior de les erugues es desplaça visualment cap enrere respecte al tanc.
- En retrocedir, el sentit de l'animació s'inverteix.
- Cada costat té una fase independent.
- En gir pivotant, una eruga circula cap endavant i l'altra cap enrere segons el sentit del gir.
- En girs mentre el tanc avança, la velocitat visual de cada eruga es diferencia segons la taxa de gir, de manera coherent amb una transmissió diferencial.
- Les rodes de rodament del tanc també reben velocitat específica per costat i giren de manera coherent amb l'eruga corresponent.
- `tests/smoke.cjs` comprova ara que existeixin dues erugues animades, que avancin/reculin amb el sentit correcte i que contrarotin durant un gir pivotant.


## Pedaleig i nova sortida acrobàtica — 2026-10-04
- Invertida la fase visual del pedaleig de la bicicleta perquè, en avançar, cames i pedalier girin en el sentit correcte.
- El canvi afecta només la bicicleta; la fase de la barca de rems i la resta d'animacions que reutilitzen `pedalPhase` es mantenen intactes.
- Substituïda l'antiga voltereta rígida en baixar d'un vehicle en marxa per una seqüència acrobàtica nova:
  - salt inicial vist de perfil;
  - braços estirats mentre el cos gira a l'aire;
  - contacte amb el terra amb les mans;
  - flexió de colzes, malucs i genolls per absorbir el moviment;
  - entrada dels peus a terra;
  - extensió progressiva fins recuperar la postura dreta.
- Durant la seqüència, la càmera es desplaça al costat del personatge per mostrar el moviment de perfil.
- Quan l'animació acaba, la càmera torna progressivament a la posició habitual darrere de l'espatlla.
- Es manté separada l'animació d'expulsió violenta per explosió, que continua sent més caòtica.
- Afegides comprovacions al smoke test per evitar regressions cap al sentit de pedaleig anterior o cap a l'antiga animació de sortida.


## Vehicles aquàtics varats a les costes — 2026-10-04
- Afegida una passada de generació costanera independent dels ports.
- Cada illa té un 75% de probabilitat d'intentar generar un vehicle aquàtic varat a la riba.
- Els vehicles es col·loquen en aigua molt poc fonda, just després de la transició terra-aigua, perquè visualment semblin encallats/varats però continuïn sent utilitzables.
- Distribució de probabilitat del pool costaner:
  - 40% barca de rems;
  - 32% windsurf;
  - 16% moto aquàtica;
  - 12% llanxa.
- L'hovercraft queda fora del pool de vehicles varats i continua apareixent principalment per ports/garanties.
- Els ports ja no poden generar llanxes llançacohets aleatòriament.
- La llanxa llançacohets passa a ser estrictament única: al final de la generació es garanteix exactament una unitat per mapa.
- Els vehicles varats queden marcats internament amb `beached:true` i `coastal:true` per facilitar futures regles o ajustos.
- Afegides comprovacions al smoke test per validar el pool costaner, el 75% configurat i l'existència d'una sola llanxa llançacohets.


## Personatge, windsurf i barca de rems — 2026-10-04
- El personatge principal té ara un cap més arrodonit construït amb geometria esfèrica, substituint la silueta cúbica anterior.
- Afegides gorra amb visera i ulleres de sol al model principal.
- El mateix llenguatge visual s'ha aplicat al rider dels vehicles oberts, de manera que també apareix correctament a la barca de rems.
- Recol·locat el rider del windsurf: ara va dret sobre la taula, de costat respecte a l'eix longitudinal, amb els peus separats i els braços subjectant el travesser/boom de la vela.
- Refeta la barca de rems perquè deixi de semblar un bloc sòlid:
  - fons baix;
  - costats oberts;
  - regales/baranes visibles;
  - bancs transversals per seure;
  - suports de rem sobre la regala.
- Els rems queden ara més alts i pivoten des de suports situats sobre les baranes.
- Invertit el cicle visual de remada perquè avançar i retrocedir deixin d'estar intercanviats.
- Afegides comprovacions al smoke test per cobrir el nou cap/gorra/ulleres, la postura del windsurf, la geometria oberta de la barca i la inversió de la remada.


## Correcció de genolls i pivot del salt — 2026-10-05
- Invertida la flexió dels genolls del personatge principal durant la marxa perquè articulin en el sentit anatòmic correcte.
- Corregida també la flexió dels genolls durant la sortida acrobàtica d'un vehicle en moviment.
- La rotació de la maniobra ja no pivota visualment des dels peus.
- Durant el salt es compensa la translació del grup principal perquè el punt de gir efectiu quedi a l'altura de la cintura/maluc.
- La càmera de perfil i la recuperació posterior a l'espatlla es mantenen sense canvis.
- Afegides comprovacions al smoke test per evitar regressions en el sentit de flexió i en el pivot de cintura.


## Coll, cabell curt i ajust de gorra — 2026-10-05
- Afegit un coll visible al personatge principal.
- Afegit cabell curt al darrere, laterals i part superior.
- El cap deixa de ser una esfera completa: la geometria queda retallada a la zona superior perquè la gorra s'hi ajusti més i no sembli simplement col·locada a sobre.
- Rebaixada lleugerament la gorra i ajustada la seva corona per seguir millor el contorn del cap.
- El mateix tractament s'ha replicat al rider dels vehicles oberts, inclosa la barca de rems i el windsurf.
- Afegida comprovació al smoke test per detectar regressions en coll, cabell i geometria del cap.


## Escala de camió/tanc i ampliació del HQ — 2026-10-05
- Augmentada l'escala visual i física efectiva del camió militar i del tanc un 25%:
  - camió: 1.45 → 1.8125;
  - tanc: 1.8 → 2.25.
- Com que radii i hitboxes es multipliquen per l'escala del vehicle, el volum de col·lisió i la separació de spawn també s'ajusten automàticament.
- El HQ enemic ocupa ara una àrea aproximadament un 25% més gran.
- El perímetre de filferro passa de 58×52 semieixos a 72.5×65.
- Els edificis auxiliars s'han separat més del búnquer central.
- Les patrulles interiors, posicions defensives i rutes de tanquetes s'han expandit per aprofitar el nou espai.
- Les patrulles exteriors de cotxes també recorren un rectangle més ampli.
- Les quatre torres s'han reposicionat gairebé a les cantonades del filferro (±69, ±61), deixant només un marge petit respecte del perímetre.
- L'entrada del filferro ja no queda alineada amb la porta frontal del búnquer: s'ha desplaçat 26 unitats lateralment.
- El tanc fix del HQ també s'ha mogut fora de l'eix central per reforçar la desalineació visual i funcional de l'accés.
- Afegides comprovacions al smoke test per cobrir les noves escales, el perímetre ampliat, les torres de cantonada i l'entrada desplaçada.


## Escala de la tanqueta — 2026-10-05
- Augmentada la tanqueta blindada un 25%: escala 1.45 → 1.8125.
- El canvi segueix el mateix criteri aplicat al camió i al tanc.
- Radi, hitbox efectiva i separació de spawn creixen automàticament perquè depenen de l'escala del vehicle.
- Actualitzat el smoke test per validar conjuntament les escales de camió, tanqueta i tanc.


## Cabell més llarg i orgànic — 2026-10-05
- Allargat lleugerament el cabell del clatell del personatge principal.
- Substituïdes les peces més rígides del darrere i laterals per volums esfèrics de baixa resolució per donar una silueta més orgànica.
- Afegit un volum específic de nuca i laterals arrodonits, mantenint el cabell curt i compatible amb la gorra.
- Replicat el mateix tractament al rider dels vehicles oberts perquè el personatge mantingui el mateix aspecte a bicicleta, moto, barca de rems i windsurf.
- Actualitzat el smoke test per comprovar la presència dels nous volums de cabell al jugador i al rider.


## Controls tàctils d'altitud per helicòpter — 2026-10-05
- Afegits dos botons contextuals tàctils al bloc de controls de la dreta: Pujar (KeyU) i Baixar (KeyJ).
- Els botons només es mostren quan el vehicle actual pertany a la família aèria, de manera que apareixen tant a l'helicòpter bàsic com a l'helicòpter de combat.
- Es mantenen al mateix grup visual que Dispar i Acció, tal com demana el HUD contextual.
- Els controls de teclat U/J i Space/Shift continuen funcionant sense canvis.
- Afegida una comprovació al smoke test per detectar regressions en la presència i activació contextual dels botons.


## Voltereta ràpida i nova barca de rems — 2026-10-05
- Simplificada la sortida d'un vehicle en moviment: l'animació `vault` llarga s'ha substituït per una única voltereta ràpida d'aproximadament 0,62 s.
- Eliminada la càmera lateral específica de la maniobra; la càmera habitual continua seguint el personatge durant la voltereta.
- La postura de braços i cames durant el gir és compacta i simple, sense seqüència de mans-peus-incorporació.
- Refeta la geometria de la barca de rems prenent com a referència la imatge aportada:
  - buc obert tipus skiff;
  - proa i popa més estretes;
  - costats continus i regales marcades;
  - tres bancs transversals;
  - un escàlem a cada banda;
  - un rem independent a cada costat, amb mànec cap a l'interior i pala ampla cap a fora.
- Ajustada la remada perquè els dos rems pivotin des de les regales de forma coherent amb la nova geometria.
- Actualitzat el smoke test perquè comprovi la nova voltereta curta i la nova estructura de la barca.


## Gir únic a la cintura i ajust del cabell/gorra — 2026-10-05
- Simplificada encara més la sortida d'un vehicle en moviment: ara hi ha una sola rotació contínua exacta de 360°.
- La durada de la voltereta s'ha reduït a aproximadament 0,5 s.
- El pivot visual es compensa a l'altura de la cintura (waistLocal=2.05), evitant que el personatge sembli girar des dels peus.
- Eliminades subfases i qualsevol segon gest de rotació corporal durant la maniobra.
- Eliminats els volums de cabell laterals que baixaven sobre les orelles.
- Mantingut el volum del darrere i la nuca perquè el cabell continuï sent una mica més llarg per darrere.
- Rebaixada i ajustada la gorra: corona lleugerament més estreta i baixa, amb visera reposicionada.
- El mateix retoc s'ha replicat al rider dels vehicles oberts.
- Actualitzades les comprovacions del smoke test per cobrir el gir únic, el pivot a cintura, l'absència de sideHair i el nou ajust de gorra.


## Aterratge dret de la voltereta — 2026-10-05
- La sortida en marxa continua fent una sola volta completa de 360°.
- El temps de l'animació ara es limita exactament a zero en lloc de saltar d'un valor positiu a un valor negatiu.
- Es renderitza explícitament el frame final amb rotació 0°, de manera que el personatge arriba dempeus sense necessitat de corregir la postura després de l'animació.
- La compensació de pivot a la cintura es manté durant tota la volta i desapareix naturalment al frame final.
- La postura compacta de braços i cames es relaxa progressivament abans de tocar terra.


## Fum de vehicles més dens i superior — 2026-10-05
- Augmentada la freqüència d'emissió del fum dels vehicles danyats.
- Cada cicle genera ara 2 partícules i, amb dany greu, 3 partícules.
- Les partícules són sensiblement més petites que abans i continuen creixent suaument mentre pugen.
- El color s'ha enfosquit: gris gairebé negre amb dany greu i gris fosc amb dany moderat.
- El punt d'emissió ja no usa una alçada fixa. La primera vegada que un vehicle fuma, es calcula la seva caixa visual i es desa l'offset de la part superior del model.
- El fum surt així de la part alta real del vehicle, inclosos els models grans com camió, tanqueta i tanc.
- La dispersió lateral es manté reduïda i proporcional a la mida del vehicle per conservar una columna de fum llegible.
- Actualitzat el smoke test per detectar regressions en densitat, color i punt d'emissió.


## Cabell continu de banda a banda — 2026-10-05
- Ampliada lleugerament la capa superior de cabell perquè cobreixi millor tot l'ample del cap.
- Afegits dos petits volums laterals de farciment, molt estrets i enganxats al crani, per eliminar els buits visibles als costats.
- Aquests volums no sobresurten com les antigues peces laterals sobre les orelles.
- El volum del clatell i la nuca es manté, amb una transició més contínua cap a la part superior.
- Replicat el mateix ajust al rider dels vehicles oberts.
- Actualitzat el smoke test per cobrir l'amplada del hairTop i la presència dels nous sideFill.


## Helicòpters més estrets i cabell integrat — 2026-10-05
- Estrenyit el fuselatge de l'helicòpter bàsic perquè tingui pràcticament la mateixa amplada visual que la cabina.
- Estrenyit també el fuselatge de l'helicòpter de combat fins a aproximar-lo a l'amplada de la cabina.
- Afegits pilons metàl·lics entre el fuselatge i els pods/míssils laterals de l'helicòpter de combat.
- Afegits muntants inclinats entre el fuselatge i els patins perquè deixin de semblar flotants.
- El cabell del jugador s'ha reduït i desplaçat cap amunt i cap a dins del volum del cap.
- Reduïts també els farciments laterals perquè cobreixin sense formar una esfera externa.
- Replicat el mateix ajust de cabell al rider dels vehicles oberts.
- Actualitzat el smoke test per cobrir amplada dels helicòpters, suports del model de combat i nova posició del cabell.


## Pantalla inicial amb captura real i generació diferida — 2026-10-05
- Eliminada la crida inicial `build(); mini();` que generava un arxipèlag complet només per quedar ocult sota la pantalla de títol.
- Eliminat l'SVG inventat de la portada.
- En prémer Fàcil / Normal / Difícil, el joc genera la partida normal i, abans de mostrar el personatge, renderitza un únic frame real de l'inici.
- Durant aquesta captura el personatge queda ocult, de manera que la imatge mostra exactament l'escena inicial del joc sense el jugador.
- La captura WebP es desa a `localStorage` i s'utilitza com a fons en les arrencades següents.
- Si encara no existeix cap captura real en aquell navegador, la portada usa només un degradat neutre: no es mostra cap imatge inventada.
- No es genera cap món extra per obtenir la captura; s'aprofita el mateix món que el jugador acaba de demanar amb el botó de dificultat.
- Actualitzat el smoke test per impedir el retorn de l'asset inventat i comprovar la captura real diferida.


## Cabell opció 4 — 2026-10-05
- Substituït el cabell esfèric del jugador per una closca cilíndrica curta.
- El cilindre arriba de banda a banda del cap sense sobresortir per sobre de la gorra.
- La part posterior baixa lleugerament més per reproduir l'aspecte de l'opció 4.
- S'ha mantingut la gorra verda sense canviar-ne el color.
- El mateix estil s'ha replicat al rider dels vehicles oberts.
- Actualitzat el smoke test per comprovar geometria cilíndrica i color de gorra.


## Ajust de límits del cabell cilíndric — 2026-10-05
- Revisats els límits geomètrics del cap i del cabell en X/Z.
- Jugador: el cap arriba aproximadament a X ±0,40 i Z ±0,39; el cilindre inferior del cabell passa ara a radi 0,405 i es desplaça cap enrere fins a Z +0,09.
- Rider: el cap arriba aproximadament a X ±0,361 i Z ±0,352; el cabell passa a radi 0,37 i es desplaça cap enrere fins a Z +0,07.
- La peça posterior també s'ha eixamplat i mogut lleugerament enrere per evitar que aparegui pell per sota del cabell.
- El límit superior del cabell del jugador es manté a Y 4,38, just per sota de la gorra, de manera que no sobresurt per dalt.
- Actualitzat el smoke test per comprovar radis i desplaçament posterior.


## Postura correcta al windsurf — 2026-10-05
- Reposicionat el rider del windsurf perquè estigui realment dempeus sobre la taula.
- Els malucs passen a una alçada coherent amb unes cames gairebé rectes; els genolls només tenen una flexió mínima visual.
- El tors queda girat 90° de costat respecte de la taula.
- Les dues mans se situen sobre el travesser de la vela, amb colzes lleugerament flexionats.
- La vela s'ha fet una mica més alta i ampla, i el travesser s'ha elevat i allargat perquè la proporció amb el personatge sigui natural.
- La taula també s'ha allargat lleugerament per donar una base coherent a la postura dempeus.
- Actualitzat el smoke test per cobrir postura, cames rectes i alineació mans/travesser.


## Cabell cilíndric una mica més exterior — 2026-10-05
- Incrementat lleugerament el radi del cilindre del cabell del jugador i del rider.
- Desplaçat el conjunt una mica més cap enrere perquè quedi clarament per fora de l'esfera del cap.
- Mantingut el límit superior sota la gorra per evitar que sobresurti per dalt.
- Ajustada també la peça posterior perquè segueixi la nova envolupant.


## Clatell tancat i radi reduït del cabell — 2026-10-05
- Tancada la part posterior del cilindre del cabell amb una peça cilíndrica completa al clatell.
- Això elimina el buit visible entre els dos extrems laterals del cabell.
- Un cop tancat el clatell, s'ha pogut reduir lleugerament el radi del cilindre principal perquè quedi més ajustat al cap.
- Jugador: radi màxim reduït de 0,42 a 0,405 i posició posterior ajustada.
- Rider: radi màxim reduït de 0,385 a 0,37 amb el mateix criteri.
- Mantingut el límit superior sota la gorra verda.



## Troncs de palmera corbats — 2026-10-05
- Substituït el cilindre recte del tronc per una geometria segmentada amb arc suau.
- El tronc conserva l'arrel i la copa sobre l'eix original per mantenir ben encaixada la corona de fulles.
- La desviació lateral màxima es produeix al centre del tronc i és del 25% de la seva alçada.
- La rotació aleatòria que ja tenia cada palmera fa que la direcció de l'arc variï entre exemplars.
- Es manté el tronc cònic, més gruixut a la base i més prim a la part superior.
- El smoke test comprova també que la geometria resultant té una desviació lateral efectiva.


## Cotes altes verdes i més densitat de palmeres — 2026-10-05
- Eliminada la transició de verd a gris/blanc a les cotes altes; el terreny continua en una gamma de verds fins a 40 m.
- Es manté exactament la probabilitat original de palmeres a les cotes baixes: 12% per sota de 4 m.
- També es conserva el comportament original de les cotes mitjanes favorables: 20% quan el soroll de vegetació supera el llindar existent.
- A partir de 28 m la probabilitat passa a 22% i augmenta progressivament amb l'altitud fins a 34% a les cotes més altes.
- Això fa que les zones elevades siguin clarament més denses en palmeres que les baixes, sense empobrir la vegetació de costa i plana.


## Orientació del rider al windsurf — 2026-10-05
- Girat el tors del rider 180° respecte de l'orientació anterior perquè miri cap a la vela.
- El cap gira amb el tors perquè és fill directe d'aquest grup.
- Braços i cames es mantenen sense canvis, conservant les mans al travesser i la postura dempeus.
