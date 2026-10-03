# Pla de modernització visual

## Objectiu
Mantenir l'estètica low-poly i la jugabilitat de *Hunter: Arxipèlag*, modernitzant progressivament el renderitzat i separant presentació, entrada i simulació per reduir regressions i facilitar l'evolució del joc.

## Estat de la base
- Three.js r128 continua incrustat dins `index.html`.
- `index.html` encara conté bona part de la simulació, generació procedural, IA, combat, àudio i UI.
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
- La funció de simulació d'ones `wy()` continua al nucli i s'ha de mantenir sincronitzada amb el vertex shader.

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
- Three.js r128 continua incrustat al gran `index.html`.
- `index.html` encara és massa monolític.
- `physicallyCorrectLights=true` necessita calibratge visual en navegador real.
- `outputEncoding` haurà de migrar a l'API moderna de color quan s'actualitzi Three.js.
- El vidre i altres transparències necessiten una revisió conjunta de materials i ordenació de transparència.
- El vertex shader de l'aigua i `wy()` estan duplicats conceptualment i poden desincronitzar-se si es modifiquen per separat.
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
1. Treure Three.js r128 incrustat de l'HTML.
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
