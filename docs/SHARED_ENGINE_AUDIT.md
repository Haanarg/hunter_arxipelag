# Reutilització del motor individual · v0.6.34

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

1. Connectar la IA del relleu al vol compartit i completar la integració amb totes les armes/entitats del món. Selecció, vol, primitives, primer contacte i models de projectils ja són compartits; les armes dels jugadors del relleu ja no són hitscan.
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

## Segona extracció · autoapuntat compartit (v0.6.33)

`src/aiming-core.mjs` extreu la selecció real de `autoAimWeaponShot`: prioritats segons classe d’arma, con horitzontal/vertical, obertura per blancs alts/baixos, excepció de blancs sobre el canó, puntuació i desempat, resultat/focus i intercepció de patrulleres mòbils. El navegador només enumera enemics/geometria i aporta `weaponAimClear`; el servidor enumera les seves dianes i aporta la seva traça física. La selecció ja no té una versió alternativa al cooperatiu.

La pistola i el fusell cooperatius adquireixen blancs amb el mateix con 3D del mode individual i abasts de 75/85 m. El servidor comprova després el primer impacte físic del raig; seleccionar una diana no permet saltar-se parets, portes, pisos, sostres ni terreny. Els actors, orientació i dianes provenen de l’estat autoritatiu. El client no pot enviar ni blanc, ni punt de mira, ni vector de tret. La ràfega continua recalculant blanc per a cada bala, amb la munició i cancel·lació compartides.

512 casos congelats abans d’extreure el codi conserven exactament selecció, vector, focus i punt d’apuntat del mode individual. Hi ha casos de totes cinc classes d’arma, prioritats, terreny/ocultació simulats, fallback d’armes pesades, altures i patrulleres mòbils. Proves cooperatives amb contacte físic, blancs alts/baixos, murs, sostres/pisos, terreny, abast, retarget després d’eliminar una diana i idempotència.

La primera revisió pendent de l’apartat anterior queda reduïda al **recorregut complet dels projectils** i la seva integració amb armes/retícules: la selecció, el con i la prioritat ja estan compartits. El pilot encara resol la bala per hitscan; no s’afirma que s’hagi migrat tot `updPj`. IA completa, contactes avançats dels vehicles i la resta de fàbriques continuen pendents.

Els imports del nucli compartit usen un únic URL per mòdul, sense instanciar una còpia amb query i una altra sense query a la mateixa pàgina. Es conserva la revalidació de `/src/*.mjs` i la comprovació exacta de versió.

## Tercera extracció · vol de projectils (v0.6.34)

`src/projectile-core.mjs` extreu l’avanç que feia `updPj`, la vida restant i l’arbitratge del primer contacte continu del segment. El constructor de trajectòria també és compartit. Es conserva la política individual: un contacte anterior al final del pas guanya a la caducitat; els empats conserven l’ordre de consulta. El navegador conserva les consultes espacials i l’aplicació de dany/efectes a les seves entitats; el servidor aporta geometria i dianes autoritatives.

La pistola i el fusell **dels jugadors** del relleu deixen de ser hitscan: 130 m/s i vida de 2,2 s, com la bala lleugera individual. L’autoapuntat es calcula en sortir la bala; després manté el vector, sense seguir un blanc que es mogui. El dany s’aplica en arribar al primer contacte físic, amb la geometria actual d’aquell tick. Una porta que es tanca després de disparar pot interceptar-la. L’abast de selecció de 75/85 m no és una caducitat artificial de la bala: un tret sense assistència pot continuar volant fins a contacte o caducitat, com a l’individual.

`src/projectile-model.mjs` comparteix les geometries originals de bala cilíndrica i projectil pesat. Es retira la seva definició local de `game-core.js`; el cooperatiu reutilitza la bala blanca i projecta l’impacte separat del tret, a Three i Canvas. Els tirs de guàrdies del pilot encara són instantanis: queden pendents de connectar a aquest mateix nucli, juntament amb els seus criteris complets de punteria/IA. No es presenta aquesta fase com tota la integració de combat del món individual.

Snapshot/checkpoint de posició, velocitat, vida i identificador de cada bala. La pausa congela les que ja han sortit i cancel·la només les bales pendents de la ràfega; canviar d’arma tampoc esborra una bala en vol. Fi de missió retira tots els projectils. Error de persistència reverteix tant dany com trajectòria abans de difondre estat. La confirmació `FIRED` anuncia el tret, no un impacte futur. No es poden enviar col·lisions, trajectòries o dany des del client.

Validació del runtime individual real (font i bundle), cobertures, impactes i caducitat; proves de primer contacte i empats, retard de dany, porta en moviment, blanc que s’aparta, pausa, restauració, repetició d’ordres i rollback d’un impacte. La integració amb civils, edificis, blindatge, filferrades, altres armes i la IA completa continua aportada per l’adaptador individual i pendent al món cooperatiu.
