# Reutilització del motor individual · v0.6.31

Criteri: les regles i els models tenen una única implementació. Els adaptadors de navegador i servidor només aporten estat, geometria, autoritat, presentació i serveis. No es converteix tot el joc individual en un Worker: DOM, Three, àudio, càmera i comptes continuen fora de la simulació compartida.

## Duplicacions retirades

| Àmbit | Font compartida | Adaptador individual | Adaptador cooperatiu |
| --- | --- | --- | --- |
| Resistències i perfils de vehicles, suavitzat d’inputs, deriva, acceleració, frenada, gir i moviment lateral | `src/vehicle-dynamics-core.mjs`, extret de `vehicle-dynamics.js` i `stepV` | `stepV` conserva contactes amb món, aigua i ferri | `coop-vehicles.mjs` només aporta seients, inputs autenticats i contactes del recinte |
| Configuració de combat | `src/combat-rules.mjs` | Pont `HUNTER_COMBAT_BALANCE` | Perfil d’entrenament explícit derivat del mateix balanç |
| Ràfegues de tres trets amb temps de simulació, cancel·lació i mínim de tres bales | `beginBurst`, `stepBurst`, `cancelBurst` | Efectua el tret, animació i so originals | Efectua el tret autoritatiu i persisteix la mateixa estructura de ràfega |
| Dany d’explosions, impactes i atropellaments | `explosionDamage`, `impactDamage`, `runoverDamage` | Ponts compatibles a `combat.js` | Explosions usen el mateix càlcul; les funcions de vehicle queden disponibles per a la integració posterior |
| Contacte segment/caixa i segment/esfera | `segmentAabbT`, `segmentSphereT` | Bales, trajectòries i geometria originals | Trets, parets i contacte amb objectes recollibles |
| Integració balística de granades | `ballisticStep` | Granada real i previsualització de trajectòria | Granada del servidor; contactes i política de metxa queden a l’adaptador |
| Con de visió | `inView` | `stealth.js` aporta el seu perfil | Guàrdies aporten el perfil reduït i reconeixement proper |
| Salut entera | `player-simulation.mjs` | Regla ja compartida abans d’aquesta revisió | Jugadors i dany de dianes |
| Paleta i model tàctic de persones | `palette-core.mjs`, `player-model-core.mjs` | Ponts clàssics sense còpia de la fàbrica | Jugadors i guàrdies usen la mateixa geometria; color/estat són projeccions del snapshot |
| Vehicle 3D | `humvee-d31-runtime.mjs` i model procedural B existents | Fàbrica original de cotxe militar | Mateix Humvee; instàncies disposables pròpies i escala del recinte. S’ha eliminat el jeep alternatiu fet de caixes |
| WebSocket: generacions, heartbeat, reintents, missatges vells i neteja | `coop-socket.mjs` | Panell de sala | Client jugable; conserva esquema, inputs i seqüències propis |

`vehicle-dynamics.js`, `palette.js` i `player-model.js` són ara ponts curts: no mantenen una segona implementació. S’ha eliminat també el camp redundant `speed`: la velocitat del vehicle és `v`, com al motor individual.

## Codi que ja era compartit i es conserva

- Moviment a peu, salut i física vertical: `player-simulation.mjs`, `player-vertical.mjs`.
- Terreny, aigua canònica, nivells i col·lisions: `world-generation-core.mjs`, `canonical-water.mjs`, `world-physics.mjs`, `world-adapter.mjs`, `walk-surfaces.mjs`.
- Planificació i estructures de base: planificador, layouts, shell d’edificis i fàbriques compartides. Els adaptadors de base no són un segon generador arbitrari.

## Diferències que són dades o responsabilitats pròpies

- El perfil d’entrenament conserva dany de pistola/fusell 4 i granada 16, davant els 2/10 del balanç individual. Són dues sobreescriptures de dades identificades, no fórmules alternatives. La metxa i la gravetat reduïdes del pilot també es passen com a paràmetres. Unificar motor no introdueix canvis silenciosos en tot l’equilibri de la missió.
- El jeep ara usa realment la dinàmica original del perfil `cotxe` (màxim 38 m/s endavant i 14 enrere, amb suavitzat, arrossegament i inèrcia). L’antic accelerador lineal de 14/6 m/s s’ha eliminat. La física de contacte continua restringida al recinte exterior pla.
- La ràfega del cooperatiu exigeix tres bales com la individual. Els 75 ms s’avaluen amb el mateix controlador, un tret màxim per pas: a 30 Hz resulten ticks 0/3/5.
- Seients, validació d’identitat, pausa amb un client absent, rollback, límits de missatges, persistència i reanimació amb farmaciola són responsabilitats cooperatives sense equivalent individual redundant.
- Terminals de relleu, activació simultània i extracció pertanyen a una missió específica. No substitueixen la campanya Hunter.
- HTML, HUD i vista Canvas del pilot projecten una missió/snapshot diferent del navegador individual. Compartir les fàbriques no exigeix duplicar la seva escena ni executar el seu DOM al servidor.

## Revisions pendents abans d’ampliar la campanya

1. Extreure la selecció de blancs, autoapuntat i recorregut complet dels projectils. Ara comparteixen primitives i integració, però la pistola cooperativa continua essent hitscan i no és encara tot `updPj`.
2. Extreure navegació, persecució i màquina d’estats de la IA individual. El con i els models ja es comparteixen; la patrulla reduïda del relleu encara és específica.
3. Compartir els contactes complets de vehicles amb formes orientades, terrenys, ferri, aigua i aire. Després integrar salut/destrucció/armes muntades a partir de les regles individuals.
4. Reutilitzar les fàbriques d’equipament, animacions, efectes i àudio que encara falten al pilot. Els models de persones i Humvee ja estan unificats.
5. Ampliar món/objectius i desament permanent sense crear un segon generador o format de campanya.

El prototip local de jeep de 60 PV, multiplicador de dany propi i destrucció especial s’ha retirat abans de publicar-lo. No forma part d’aquesta versió: primer s’ha de connectar la destrucció individual al motor compartit.

## Validació

- 3.840 passos de conducció congelats abans de l’extracció, en els 16 perfils, amb acceleració, coasting, marxa enrere, girs, deriva i diferents passos de temps. Les traces numèriques originals es conserven.
- Ràfega individual real, cancel·lació, consum i retarget; mateix controlador a pas fix cooperatiu.
- Primitives de dany/contacte i balística, inventaris, guàrdies, portes, física vertical i models Three sense GPU.
- Sala i client jugable: connexió, heartbeat, reintents, sockets vells, substitució, pausa i alliberament de temporitzadors.
- Worker amb dues sessions locals: armes, conducció, passatger, sortides, portes, objectius, reconnexió, checkpoint i reanimació amb consum d’una farmaciola.

No substitueix la prova amb dos dispositius físics, WebGL real i Android. Els checkpoints temporals anteriors no es migren: generador `relay:10`, clients actualitzats i missió nova.
