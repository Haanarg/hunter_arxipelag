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
