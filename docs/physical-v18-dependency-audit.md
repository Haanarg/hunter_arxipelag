# Auditoria de dependències físiques V17 → V18 · 0.6.286

Data: 20/11/2026. Abast: física autoritativa del jugador, col·lisions, ocupants, projectils i presentació SOLO/COOP. Aquesta auditoria **no** implica retirar encara `LEGACY_GAME_RIG_SCALE=2/3`: diferencia contractes de simulació de dependències gràfiques/IK.

## Separació verificada: la física principal NO depèn del rig ocult

| Subsistema | Font d'autoritat | Dependència de la malla V17 | Estat |
| --- | --- | --- | --- |
| Moviment jugador SOLO/COOP | `P={x,y,z,hd}` a `src/game-core.js`; `moveOnFoot` de `src/player-simulation.mjs` | Cap lectura de `humanGameLegacyRig` | Independent |
| Caigudes, paracaigudes, aterratge, suport d'aigua | `src/player-vertical.mjs`: coordenades numèriques i funcions d'altura del món | Cap | Independent de rig |
| Parets, palmeres, roques, vegetació | `src/world-physics.mjs`: resolució contra objectes físics i `P` | Cap transform de bones Three.js | Independent de rig; alçades antigues per revisar |
| Contacte del peu amb terreny visible | `src/game-core.js`, `humanGameCanonicalSoles`, `groundAt`, `visibleHeightAt` | Ja utilitza les soles V18 | Visual: només modifica `pl.position.y`, **no `P.y`** |
| Dispar jugador a peu | `src/combat.js`: boques V18 (pistola, rifles i bazuca); granada des de `humanGameCanonicalJoints.wristR` | No necessita origen V17 per aquestes armes | Migrat; validar altres accions de control |
| Pistola de rider SOLO | `riderSystem.firePistol()` → `src/combat.js` | Ara el punt surt de `hunter-pistol-muzzle` de la malla que es mostra i l'empunyadura es munta sobre el canell V18 | Migrat en 0.6.286 |
| Primera posició gràfica de projectils COOP a peu | `nativeCoopProjectileMuzzle` a `src/coop-world-runtime.js` | Pistola, AEK-971 i SV-98 ara consulten la boca V18; si no és visible, el servidor conserva l'origen de referència | Migrat en 0.6.286 |
| Impactes a tripulants de vehicles | `src/vehicle-occupant-damage-core.mjs` amb esferes, bancs i parabrises numèrics | No llegeix rig antic ni V18 en directe | Determinista, però desalineació potencial respecte la figura V18 |

## Dependències geomètriques/físiques que SÍ queden pendents

1. **Caps i cossos dels ocupants** (`vehicleSeatWorld`, `vehicleOccupantHeadWorld`): contenen valors de cabina històrics i la suma `2.65*.43` per a la posició del cap. No són una lectura en temps real del V17: són constants físiques compartides per servidor i clients. La visualització del GAZ/cotxe/hovercraft ja és V18, de manera que cal contrastar les hitboxes contra els centres del cap/pelvis aprovats de cadascun dels models, en les dues places i girs de vehicle. **No substituir per malles/Box3 gràfiques**: rompria la determinació i el COOP.
2. **Tripulació de llanxes enemigues** (`marineCrewHeadWorld`, `marineCrewProjectileContact`): `MARINE_SCALE=1.95`, valors `(.89+2.65*.43)`, `(.89+1.25*.43)` i proves de parabrisa `MARINE_GLASS_X/W`. Preservar dany i ordre vidre → ocupant; fer futura proposta amb ancoratges numèrics equivalents a la geometria V18 real i provar traçats.
3. **Alçada de volum del jugador** a `src/world-physics.mjs`: `pushPalm` compara `point.y+4.2` i mostra sis talls entre `0.3` i `3.8`; `pushWalls` arriba a `point.y+3.1`. L'alçada visible aprovada és `HUMAN_PLAYER_GAME_NATIVE_HEIGHT=3.11232`. Cal auditar per separat palmeres inclinades, roques, portes, sostres, ajupiment i col·lisions sobre molls: les dues xifres actuals no representen necessàriament la mateixa caixa del V18.
4. **Nivell físic de natació**: `waterSupport` situa el suport a `surface-2.1`. Les malles B3/C4 ja tenen una elevació gràfica independent, però la flotabilitat i la detecció de submersió han de seguir el model de física compartit en SOLO/COOP fins que el volum de la persona estigui modelat en dades numèriques.
5. **Cinemàtiques amb hipòtesis antigues**: `src/game-core.js` conserva `waistLocal=2.05` i `waistScaled=waistLocal*pl.scale.y` en la volta d'expulsió. És un pivot **visual**, no la col·lisió física; derivar-lo de la pelvis nativa V18 quan es revisi el ragdoll/expulsió.
6. **Rig de control ocult per a postures i operacions**: `src/human-game-runtime-v17.mjs` crea `legacyRig.scale=2/3` i conserva rotacions i ancoratges d'armes/animacions que encara poden alimentar braços visibles en determinats estats. Aquesta escala no és llegida per `moveOnFoot` ni per `pushWalls`; no cal modificar la física de món per eliminar-la, però **sí** migrar els consums restants de quaternions, punts d'interacció i postures abans de canviar jerarquia.

## Canvi executat en 0.6.286: pistola de riders

`src/rider.js` fa servir només els marcadors `hunter-pistol-grip-center` i `hunter-pistol-muzzle` reals de la fàbrica d'arma; falla explícitament si no hi són. S'aplica la pose V18 i es munta l'empunyadura en el canell dret real. Cada canvi d'orientació de l'autoapuntat torna a posar el pivot sobre el canell, sense lectura de `limbs[3]` ni boca a coordenades fixes. A moto/bicicleta també es recol·loca l'arma al canell de la figura nativa. La cadència, munició, dany i autoritat de combat continuen intactes.

`src/coop-world-runtime.js` usa `HUNTER_HUMAN_V17.nativeWeaponMuzzleWorld(THREE,pl,kind)` (interfície amb nom de compatibilitat que internament llegeix el V18), sense prendre `u.gun`, `u.assaultMuzzle` ni `u.sniperMuzzle` antics. La reserva determinista del punt `P` continua disponible només si no hi ha pistola V18 visible. L'origen de dany continua essent el de la simulació autoritativa.

## Com es verificarà abans de retirar 2/3

- Proves numèriques d'invariància de `moveOnFoot`, col·lisions paret/vegetació i volum de seients sense render ni rig.
- Proves de pistola amb el marcador del silenciador real, presa al canell V18, autoapuntat, variants de talla, reparenting COOP i rotacions artificials dels controls antics.
- Prova de `vehicleOccupantHeadWorld`/esferes contra coordenades natives de pelvis/cap de GAZ, civil i llanxes. Aquesta **encara no s'ha fet**; no ajustam radis ni danys a cegues.
- Validació WebGL en dos clients COOP, incloses sortides d'un vehicle en moviment, trets al passatger i canvis LOD.
- Un cop migrats tots els consumidors del controlador ocult, retirar `LEGACY_GAME_RIG_SCALE` i fer proves específiques de física i armes abans de desplegar.

Nota: els tests de geometria i física ofereixen cobertura de regressions, però no substitueixen la comparació visual manual.
