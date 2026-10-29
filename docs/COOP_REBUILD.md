# Reconstrucció del multijugador sobre el joc original

Estat: replantejament motivat per la petició de l'usuari del 29-10-2026. Implementació del nou client pendent. Aquest document substitueix la direcció de desenvolupament del client cooperatiu separat. No descriu una funcionalitat ja acabada.

## Objectiu

Hunter: Arxipèlag és un únic joc que admet una sessió individual o una sessió de dos jugadors. En cooperatiu, cada dispositiu mostra el personatge propi des de darrere, amb la càmera, pantalla completa, controls, HUD, models, animacions, món i missió del joc individual. La diferència és la presència del company i la sincronització de l'estat compartit.

## Diagnòstic del prototip

- `coop.html` i `src/coop-play.css` defineixen una segona pàgina de joc amb una vista dins del document, botons externs i formularis d'inventari.
- `src/coop-play-view.mjs` crea una altra escena, un altre renderer i una càmera ortogràfica. El joc original utilitza `src/rendering.js` i una càmera en perspectiva de 58 graus, amb seguiment, interiors, soterrani, vehicles i mira propis a `src/game-core.js`.
- `src/coop-play.mjs` replica controls, inventari, context de portes/vehicles i HUD. Compartir fàbriques de models no unifica aquests comportaments.
- `server/coop-open-world.mjs` genera una distribució alternativa de complexos i entitats. La mateixa llavor encara no significa el mateix món complet que al mode individual.
- El relleu de terminals i el món d'exploració sense general són missions del prototip, no la campanya original en cooperatiu.

Això exigeix substituir el client separat. Afegir-li funcionalitats visuals no resol aquesta divergència.

## Arquitectura escollida

### Una entrada i una presentació

`index.html`, `src/menu-boot.mjs`, `src/bootstrap.mjs` i el runtime original continuen essent l'entrada del joc. La sala privada és un pas del menú existent. Iniciar una sessió cooperativa activa aquest mateix joc amb un adaptador de xarxa.

No es creen un segon canvas, renderer, escena, HUD, joystick o sistema de càmera. Els botons i panells originals es conserven a les seves posicions, superposats al canvas. Les zones segures i la mida del viewport utilitzen el comportament original. La càmera segueix sempre l'actor local identificat pel compte; mai el primer jugador d'un array ni el centre del mapa. Només s'afegeix la informació necessària del company i de la connexió.

### Separar les responsabilitats del runtime existent

El primer treball de codi és separar, dins del joc original, tres responsabilitats actualment barrejades a `update(dt,t)`:

1. Llegir intencions del teclat, joystick i botons originals, incloses les accions contextuals.
2. Avançar l'estat del joc mitjançant les regles originals.
3. Presentar aquest estat amb els models, animacions, càmera, àudio i HUD originals.

El mode individual aplica les intencions localment. El cooperatiu les envia a l'autoritat compartida i presenta l'estat confirmat. La predicció del jugador local i la interpolació del company s'apliquen sobre les mateixes regles de moviment; no creen una segona simulació independent d'IA, dany o recollides al navegador.

`P`, `hp`, `inv`, `cv` i altres globals locals han de passar a un context d'actor explícit en els límits de simulació i comandes. L'actor local continua controlant la càmera i la interfície. Les propietats del company no poden substituir l'inventari ni els controls propis.

### Un sol món canònic

La generació completa original s'ha de separar de la construcció de meshes, conservant l'ordre aleatori i assignant identificadors estables a complexos, edificis, parets, portes, vehicles, enemics, objectes i vegetació. La simulació del servidor i la presentació original han de consumir aquest mateix estat canònic.

No s'iniciaran dos generadors diferents amb la mateixa llavor esperant que coincideixin. Les proves compararan coordenades, col·lisions, entitats, inventari inicial i estat aleatori del món original amb el món cooperatiu. També es verificarà que aquesta separació preservi els mons individuals existents.

### Autoritat i transport

Es mantenen els comptes, sales privades, WebSocket, identificació dels dos actors, control de seqüències, comandes idempotents, persistència i reconnexió del Durable Object. El servidor continua validant les intencions i resolent recollides, dany, vehicles, portes, enemics i objectius. La càmera i els efectes cosmètics són locals.

Les regles pures ja compartides són una base útil. Les regles que encara viuen dins del runtime original s'extreuen d'aquell codi amb proves de paritat. No es completa la campanya escrivint un segon sistema d'IA o missions dins del prototip.

La desconnexió conserva la pausa de sala i l'estat persistent existents. La migració del món tindrà una versió pròpia: una partida del prototip no es reinterpretarà silenciosament com una partida de la campanya.

## Què es conserva i què se substitueix

| Peça | Decisió |
| --- | --- |
| Joc individual, entrada, renderitzat, controls, HUD i càmera | Base de la implementació; han de continuar funcionant durant la migració |
| Comptes, sales, sockets, validació i persistència | Es conserven i s'adapten al nou estat canònic |
| Mòduls purs compartits de moviment, armes, col·lisions i destrucció | Es conserven, comprovant la paritat amb el joc original |
| Segona escena, càmera ortogràfica i controls de `coop-play` | Se substitueixen per la presentació original |
| Generador alternatiu de `coop-open-world` | Se substitueix pel generador canònic original |
| Relleu i camp de proves | Poden servir com a fixtures tècniques; no defineixen el multijugador del joc |
| Proves del prototip | Es mantenen com a regressions de transport/regles, però no acrediten paritat del joc |

## Ordre d'implementació i comprovació

1. **Separació del runtime original.** Entrada, simulació i presentació diferenciades; el mode individual manté els controls i el resultat. Separar també els bloquejos d'autodesat/historial de la sessió remota.
2. **Món únic.** Estat canònic complet, identificadors i generació original reproduïble; servidor i client coincideixen en llavors normals i de càrrega alta, a les dues escales.
3. **Primera secció jugable nativa.** Dos comptes entren des del menú original al mateix món; cadascú es mou amb els controls originals, veu el company i té la càmera original darrere del seu personatge. Tota la pantalla és de joc. Aquesta és la primera prova amb dos dispositius, abans d'afegir més sistemes.
4. **Interaccions originals.** Inventari individual, recollida compartida, portes, armes, vehicles, seients, destrucció i reanimació connectats als botons originals i a l'autoritat del servidor.
5. **Campanya original.** Enemics que tenen en compte els dos actors, torres, general al búnquer, presoners, mecànic i desenllaç compartit. Verificació de mort, derrota i reconnexió.
6. **Substitució de l'entrada antiga.** Quan la secció nativa és jugable, el menú i els enllaços cooperatius obren el runtime original; `coop.html` queda com a compatibilitat d'enllaços, sense mantenir un segon client de joc.

## Criteris d'acceptació

- A Android, el joc ocupa el mateix viewport que l'individual, sense document desplaçable ni comandaments fora del canvas.
- Joystick, accions contextuals, armes, inventari, minimapa i càmera procedeixen del joc original.
- Dos jugadors en posicions i rumbs diferents veuen cadascun el seu personatge des de darrere, a peu, dins d'edificis i en vehicles.
- La mateixa llavor i configuració generen el mateix món complet als dos modes, excepte les dades específiques de dos actors.
- La missió continua essent Hunter: Arxipèlag, amb el general i els sistemes originals.
- Una sola recollida, impacte, explosió o acció persisteix una sola vegada, també en reconnectar.
- La validació inclou el mode individual i dues sessions reals amb GPU. Les proves de Node del prototip, per si soles, no completen aquests criteris.

## Límit d'aquest canvi

Aquest canvi fixa el diagnòstic, l'arquitectura i els criteris de substitució. El client jugable existent continua essent el prototip separat fins que s'implementin les etapes anteriors. No s'ha presentat cap canvi de CSS o de càmera del prototip com si fos la reconstrucció.
