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


## 0.6.287 — correcció mesurada de hitboxes i alçades (20/11/2026)

### Mesures abans del canvi, extretes dels Object3D V18 reals
| Soldat | Cap visible (X,Y,Z) | Hitbox antiga (X,Y,Z) | Resultat |
| --- | --- | --- | --- |
| Cotxe enemic, pilot | (-0.73, 2.3418, -0.43) | (-0.949, 2.70335, -0.559) | Separació ~0.44 |
| Moto enemiga | (0, 2.5652, 0.34) | (0, 2.592, 0.336) | ~0.027 |
| Patrullera, pilot | (-0.58, 2.2918, 0.88) | (-1.131, 3.957525, 1.716) | ~1.95 |
| Patrullera, passatger | (0.58, 2.2918, 1.14) | (1.131, 3.957525, 2.223) | ~2.07 |
| Camió de prova (antic fixture artificial) | (-0.9, 2.5606, -0.42) | (-1.1444, 4.5209, -2.8685) | ~3.15, però **no** representa el seient A4.3 aprovat |

La segona passada ja usa la dada real `TRUCK_CABIN.enemySeat={x:0.6314,y:1.6728,z:-1.5826}` de l'A4.3, no la posició inventada del fixture antic.

### Correccions en codi

1. **Ancoratge compartit i determinista**: `src/vehicle-crew-anchors.mjs` exporta la ubicació local de cada tripulant de cotxe, jeep, civil, camió A4.3, moto i patrulleres/llanxes, més l'alçada d'os del cap V18 mesurada `3.26 × talla nativa`. `truck-model.mjs` reexporta `TRUCK_CABIN` des d'aquest mateix mòdul. `enemy-ai.js` i `marine-patrol.js` ara col·loquen la malla des d'aquests ancoratges, no de constants duplicades.
2. **Hitboxes de terra**: `vehicleSeatWorld` i `vehicleOccupantHeadWorld` fan exactament la mateixa transformació de vehicle i gir que les figures nascudes després del *bake* de VS. No tornen a multiplicar per 1.3, 1.8125 o 1.2 els seients de combat. Per helicòpters i tipus no auditats es conserva la fórmula anterior fins a mesurar els models reals.
3. **Tripulants marins**: `marineCrewHeadWorld` coincideix amb el centre del cap; `marineCrewProjectileContact` calcula un cos amb talla .43 i radis físics no multiplicats pel VS del buc 1.95. La protecció del parabrisa s'estén una mica cap avall per interceptar trets a l'alçada del cap real; conserva els tres panells i la seqüència vidre → soldat.
4. **Alçada física del protagonista**: `src/world-physics.mjs` defineix `PLAYER_COLLISION_HEIGHT=HUMAN_PLAYER_GAME_NATIVE_HEIGHT=3.11232`, importada del catàleg únic. Les sis mostres de col·lisió amb palmeres passen a ser fraccions de l'alçada real, sense les mostres fantasma a 3.8/4.2 m. Les parets, les roques elevades i la selecció/ocupació de portes usen aquest mateix límit; cap coll o malla V18 es consulta durant el tick físic.

### Invariants i límits de la intervenció

- Les funcions de física compartida continuen pures i reproduïbles a client i Worker. Proves geomètriques sobre soldats i patrons reals, gir de la patrullera, col·lisions de cap, ordre vidre → ocupant, palmera per damunt del cap, parets, roques elevades i volum de portes.
- **Sense canvi de dany, PV ni munició**. Hi ha canvi real en les zones on les bales poden tocar un ocupant, que ara concorden amb la figura aprovada.
- **Pendent** comprovació WebGL de vidres, parets i obstacles a altures intermèdies; comprovació COOP real amb dos dispositius. Revisar l'aparença del soldat enemic dins la cabina i el buc respecte del vidre visual.
- **Encara pendents** les hitboxes de cabina dels helicòpters, els volums de col·lisió per ajupiment i pis superior, el suport d'aigua a `surface-2.1`, el pivot visual d'expulsió `waistLocal=2.05`, el volum de col·lisions vehicle-persona i els consumidors visuals restants del controlador ocult `LEGACY_GAME_RIG_SCALE=2/3`.


## 0.6.288 · volum de dany del jugador, ajupiment i natació

**Mòdul únic** `src/player-physical-profile.mjs`: perfil físic sense Three.js que defineix `PLAYER_STANDING_HEIGHT=3.11232`, `PLAYER_CROUCHED_HEIGHT=3.11232-0.30` (marge conservador consistent amb la baixada observada de .2–.35 m del V18) i `PLAYER_SWIM_DRAFT=0.675 × alçada nativa` (2.100816, gairebé el nivell anterior 2.1). No hi ha factor del rig antic ni ajust d'escala en cada fotograma. La simulació continua tenint el punt `P` com a suport, no com a pelvis ni com a cap.

**Detecció de trets SOLO/COOP:** el mateix `playerProjectileContactT` compara un segment amb tres esferes anatòmiques solapades (cames/pelvis, tors i cap) a la postura dreta i ajupida. El volum d'ajupiment és més baix; el cap dret ja no rep trets quan el personatge s'ha ajupit. Els nedadors tenen un parell de volums propers a la superfície (tors i cap) en comptes d'una esfera vertical de persona dreta. `src/combat.js` i `server/coop-combat.mjs` fan servir exactament la mateixa rutina pura; els PV i el càlcul de dany no canvien.

**Col·lisions de món:** `pushWalls`, `pushPalm` i `pushTree` accepten el perfil de postura sense modificar el radi horitzontal; totes les mostres verticals es dimensionen respecte l'alçada física dreta, ajupida o nedant. `game-core.js` llegeix `playerCrouched/swimming` en la col·lisió i la porta pròxima; `world-adapter.mjs` rep el mateix estat validat de `player-simulation.mjs`, sense confiar en dades de col·lisió del client.

**Suport i transició a l'aigua:** `waterSupport` comparteix la nova cota definida pel percentatge de l'alçada del model aprovat en els dos modes. Es manté pràcticament idèntica a l'antic -2.1 per no alterar l'entrada o la flotabilitat de la braça B3, el crol C4 o les llavors de món. Quan un jugador COOP neda o cau, es neteja l'ajupiment antic; checkpoints de COOP conserven la postura només quan és compatible. La flotabilitat física és invariant durant l'animació gràfica de natació.

**Proves implementades** dins `tests/player-simulation.mjs`: impactes a cap, tors i cames en ambdues postures, fallada de cap alt sota ajupiment, hitboxes de nedador al nivell d'aigua, llinda/roca/palmera per damunt del cap ajupit, exposició de la postura física al resolver autoritatiu de COOP, reset d'ajupiment quan hi ha natació, suport d'aigua profunda/poc profunda/interiors/búnquer. Validació visual amb dos clients pendent.

**Pendent després d'aquest bloc**: mesurar l'embolcall tridimensional V18 al crouch més pronunciat durant animació, revisar les hitboxes dels helicòpters, portes al canviar de postura sota sostre, pivots visuals d'expulsió, interacció amb ferri i col·lisions de vehicles, i eliminar els últims consumidors de `LEGACY_GAME_RIG_SCALE=2/3` després de provar les accions.
