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


## 0.6.289 — helicòpters, expulsió i banda vertical de vehicles

1. **Caps de la cabina de Ka-60 i Mi-24D**: `vehicleSeatWorld` ja tenia el centre numèric de la plaça amb factor intrínsec. `vehicleOccupantHeadWorld` calculava el cap amb un factor diferent i el situava **per davall** de la plaça del pilot. Ara es fa `head={...seat,y:seat.y+COMMANDO_HEAD_PIVOT_HEIGHT*.43}`, amb X/Z exactes del seient. Els tests cobreixen pilot/copilot, gir, vidre intacte i vidre trencat. **Limitació:** això resol una incoherència física verificable, però l'helicòpter no mostra un pilot V18 amb el qual contrastar visualment el volum final. No afirmar que l'alineació amb pell de pilot d'helicòpter estigui validada.
2. **Atropellament fals des d'helicòpters alts:** `pedestrianVehicleHeightCompatible` de `vehicle-specs.mjs` unifica `Math.abs(P.y-vehicleY)<Math.max(2.8,vehicleCollisionPlayerBand(...))` i es consulta abans dels solapaments horitzontals en SOLO i COOP. Un helicòpter que passa per damunt del jugador ja no produeix dany ni empenta al terra simplement perquè coincideixi la planta XY; una aeronau molt baixa encara pot fer contacte. El volum de GAZ conserva la seva banda aprovada.
3. **Volta per expulsió:** `src/player-ejection-pivot.mjs` utilitza la pelvis V18 real i calcula el desplaçament mundial abans/després de cada gir, passant-lo a coordenades del pare. Les translacions del joc continuen autoritatives a `P`: el desplaçament és només visual. S'han retirat `waistLocal=2.05` i `waistScaled`, i s'ha provat l'invariant del pivot amb angle complet i pare rotat/escalat. `src/ragdoll-lite.js` continua governant braços/cames: encara és un consumidor de control antic per revisar.
4. **Ferri:** la caminada per coberta i el bloqueig de la cabina continuen implementats en `ferry-deck-core.mjs`, compartit per SOLO i COOP; s'han afegit proves de col·lisió de vianant al mig del pont, a l'interior de la cabina i amb un buc massa lluny en vertical. La comparació entre sortida de vehicle en marxa i transferència a ferri de dos dispositius continua pendent.

**No s'ha retirat el controlador V17 ni s'han canviat els punts de vida, el dany de caiguda, la inèrcia i el suport del ferri.**


## 0.6.290 — revisió pilots visibles Ka-60 / Mi-24D i ragdoll

- `src/vehicle-model-core.mjs` ja instanciava els dos pilots d'helicòpter amb la **mateixa geometria V18 aprovada que l'editor**. No es dobla el nombre de tripulants ni es toca el model del fuselatge.
- `src/vehicle-crew-anchors.mjs` declara el seient real i la talla nativa específica de cada cabina (Ka-60 dues places laterals; Mi-24D dues places en tàndem). La conversió del vehicle `VS` ja es consolida en geometria, i `vehicleSeatWorld`/`vehicleOccupantHeadWorld` utilitzen ara els mateixos ancoratges; els punts de cap es calibren en una prova de malla V18 real.
- `ragdoll-lite.js` ara prioritza `humanGameCanonicalJoints` V18 del protagonista i té una fase de re-aplicació després de l'animació d'un fotograma. `applyNativeFlip` dóna la postura de braços i cames al rig visible; la pelvis de la cabriola continua regida per `player-ejection-pivot.mjs`.
- **Pendents:** l'anàlisi final del ragdoll dels soldats (encara hi ha un fallback heretat), provar el COOP real de dos dispositius amb pilots d'heli i rampes i retirar el factor 2/3 després de comprovar els consumidors restants.


## 0.6.291 — salt i paracaigudes en V18 natiu

- `player-native-air-pose.mjs` defineix les postures de caiguda i descens amb vuit articulacions de l'esquelet V18 visible. `animatePlayerControls` ja no escriu braços/genolls del V17 quan l'actor és a l'aire.
- El controlador publica estat i pes de transició; `humanGamePose` el mescla després de la locomoció. Es preserven física, velocitat, paracaigudes i prioritat del ragdoll després del render.
- La rèplica COOP rep les banderes `airborne` i `parachuting` de `other.fall`, que abans no li arribaven. Les proves comproven la independència de l'escala 2/3, el blending i la connexió COOP.
- **Encara pendent:** el ragdoll dels soldats, els altres consumidors de controls V17, retirar `LEGACY_GAME_RIG_SCALE`, prova WebGL i comprovació COOP en dos dispositius.


## 0.6.292 — tors, cap i ajupiment V18 autòctons

- `animatePlayerControls` publica un estat numèric V18 propi (yaw de pelvis per a strafe, pitch/yaw de tors, compensació de cap i descens de l'ajupiment). Les interpolacions es calculen des de l'entrada i els mateixos vectors de mira, no llegint `u.lowerBody/u.upperBody/u.head`.
- La postura visible consumeix les dades en el mateix `humanGamePose()` d'abans, amb el descens extret del perfil físic compartit SOLO/COOP (`PLAYER_STANDING_HEIGHT-PLAYER_CROUCHED_HEIGHT`). El tors compensa el gir Y lateral de la pelvis per conservar la punteria global.
- El camí de compatibilitat només queda per als estats encara no inicialitzats, els tests històrics i les extremitats/armes que es migraran a continuació. Regres­sió amb torçaments deliberats dels controls antics: cap, tors i descens visibles han de ser invariants.
- **Pendent:** extreure braços/genolls i muntatges de les armes del controlador antic, després suprimir `LEGACY_GAME_RIG_SCALE`; soldats i civils encara utilitzen adaptadors, i cal validació real WebGL/COOP.

La mateixa 0.6.292 també genera directament els vuit canals V18 de locomoció (malucs, genolls, espatlles i colzes) a partir del moviment, fase, velocitat, gir i ajupiment. Després d'inicialitzar la locomoció, el render deixa de llegir els quaternions de `u.ll/u.lr/u.lkl/u.lkr/u.al/u.ar/u.ael/u.aer`. Els controls encara existeixen per muntatges d'armes i l'antic `createCommando`; aquestes darreres dependències no estan migrades. Prova d'invariància amb les vuit articulacions antigues alterades.


## 0.6.293 — mira de les armes visibles i fulla V18

- Quan l'animador natiu de cos i extremitats ja està inicialitzat, la pistola, el rifle, el fusell d'assalt i el bazuca visibles deriven el quaternion mundial de `u.visualAimSmoothed` (el vector de mira del tick). No necessiten llegir la rotació de `u.gun/u.assault/u.sniper/u.bazooka` amagats.
- El ganivet 3B/4B publica l'orientació exacta de la fulla V18 durant la transició. La granada conserva rotació local neutra i es munta al canell canònic. Els antics grups segueixen existint per controls de dispar i compatibilitat; no s'ha retirat el 2/3 encara.
- Regressió: quan es força un quaternion incorrecte al grup ocult de pistola, el canó visible V18 continua seguint el vector mundial d'apuntat. **Pendent** comprovar de forma real l'animació de recoil i els canons en COOP i WebGL, i retirar el controlador ocult de lògica d'armes.


## 0.6.294 — V18 inicialitzat des del primer fotograma i sense objectius fixos d'IK

- La fàbrica real `HUNTER_CHARACTERS.createPlayer` inicialitza `humanGameNativeBodyPose` i els vuit `humanGameNativeLimbPose` abans de lliurar el protagonista, també en les rèpliques COOP. El primer render ja entra exclusivament al controlador nadiu (la compatibilitat abans del primer tick només resta en els fixtures antics de `playerModel.create`).
- El destí de pistola utilitza sempre les articulacions d'espatlla/canell V18 reals; no hi ha reserva `3.10/-1.13` ni transformació amb `humanGameLegacyRig` a `characters.js`. Si falta un rig canònic, s'informa d'error en lloc de pintar una animació falsa.
- **Encara NO suprimim** l'escala del controlador ocult `2/3`: l'arma lògica, grups de muntatge i rig d'enemics/civils poden dependre d'aquest espai. La seva retirada requereix adaptar també la lògica d'armes i la generació de models no protagonistes i passar tota la suite CI/COOP. No s'ha d'entendre com una migració completa.


## 0.6.296 — Presoners i mecànic: esquelet canònic V18, sense skinning sobre els controls antics

- `installCivilian` genera directament el model d'editor amb els 16 pivots originals `humanMotionJoint` per a `farmer` i `mechanic`; no duplica malles deformades en `u.legs/u.arms/u.head` ni utilitza les escales heterogènies `.70/.78/.85/.86` de l'adaptador anterior. La talla local (1,7175 m agricultor i 1,75 m mecànic) continua derivant del contracte físic del camp i de `modelScale` fixat en generar l'actor; l'arrel visual nova es manté a escala 1.
- L'animació visible s'obté només dels estats `pose/state/phase/cheering/civilianV18Walking/civilianV18Repairing`, compartits per SOLO i `applyCoopState`. Genolls i turmells articulats per seure, cames en marxa, gest de saludar i braços per reparar. El cap i les rotacions de braços de control antics no són font de la pose. Es manté el rig antic sense malles com a compatibilitat lògica, i els tests verifiquen independència fins i tot després d'alterar aquests controls.
- `configure/reset` alliberen geometries i materials canònics dels civils en desaparèixer el camp. Les propietats `humanGameV17*` continuen temporalment per compatibilitat de tests i estats guardats; els models actius es marquen amb `humanCivilianCanonicalRig` i `humanCivilianCanonicalJoints`.
- **Pendent per retirada total de V17**: soldats/elits/general incloses mans, armes, 3 nivells LOD i ragdoll; ancoratges lògics dels riders i el controlador de les armes del protagonista. Cal prova visual real SOLO/COOP dels moviments de rescat i el taller.


## 0.6.297 — Bake físic de la talla dels civils: cap arrel escalada

- Després de crear el model canònic V18 del presoner i del mecànic, `bakeFixedModelScales(root)` consolida una vegada el valor de `modelScale` a totes les geometries i pivots, deixant `u.o.scale = (1,1,1)`. El model visual i el controlador lògic tenen ara coordenades mundials finals sense transformació d'escala d'arrel ni multiplicacions per fotograma.
- La verificació abans/després compara els dos extrems del bounding box V18 mundial a tolerància 1e-6. Els punts d'ancoratge de seure i posar-se dempeus fan servir els valors físics preconsolidats, convertits a distància final quan el rig ja és natiu. L'estat numèric `modelScale` es conserva com a metadada de la mida física de les caixes i interaccions i no per pintar el cos.
- Les regressions integrades de la fàbrica real comproven alçada mundial, arrel unitària, cota d'ajupiment al seient, alliberament i animació COOP. Encara queda el rig lògic de `u.legs/u.arms` invisible i els altres sistemes V17 del combat/enemics/riders: no declarar la migració total.


## 0.6.298 — Infanteria i general amb articulacions V18 nadiues, separats dels conductors

- La fàbrica de soldats **a peu** fa servir `installNativeOnFootEnemy` abans de construir els tres LOD: crea `createHumanProposal` del rol `soldier`, `elite` o `general` i els 16 pivots originals de l'editor. Ja no fa `copySkin()` dels polígons V18 sobre malucs, colzes o cap V17 per als enemics a peu.
- L'arma del soldat es munta al canell dret V18 i conserva la mateixa instància de canó (també en elits); els dos braços antitanc segueixen les preses reals del bazuca amb IK canònica. El casc/visor de l'elit prové del V18 original, sense duplicats enganxats al cap ocult.
- `animateSoldier` publica les postures de caminar, apuntar i genolls directament als `humanEnemyNativeJoints`; no llegeix els angles dels braços/cames antics. El ragdoll d'impacte/mort també consulta aquests ossos natius en soldats/elits/general; els tres LOD es continuen generant i normalitzant una sola vegada a escala d'arrel 1.
- La bifurcació de la fàbrica evita afectar `createCommando` fora de `createSoldier`, que encara proporciona tripulants de vehicles/barques amb ancoratges vells. Aquest camí antic es manté amb `install(T,...)` fins a migrar els seients. Les factories directes de proves conserven les interfícies de compatibilitat.
- `tests/enemy-native-v18.mjs` crea soldats, elits, generals i tripulants des dels scripts reals; comprova esquelet, malla original, armes, escala unitària, independencia de controls vells, IK antitanc, LOD i ragdoll. No es considera retirada total de V17 fins a desconnectar vehicles/riders i contractes lògics d'armes.


## 0.6.299 — Tripulants enemics terrestres i marins amb esquelet V18 directe

- `HUNTER_CHARACTERS.createNativeEnemyCrew()` crea el comando antic només com a controlador sense malles, gràcies a `runtime.suppress()`. `installNativeEnemyCrew()` afegeix un model anatòmic V18 original de soldat amb 16 pivots. No genera `copySkin()` ni malles V17 en els enemics embarcats. La fàbrica `createCommando()` directa manté temporalment compatibilitat amb editor, save i altres sistemes fins al darrer canvi de contractes.
- `attachEnemyCarCrew` i `attachEnemyBoatCrew` aprofiten la nova via per a cotxes, GAZ, camió, moto, patrulleres i llanxes de coets; mantenen un fallback només en harnessos antics que no implementen `createNativeEnemyCrew`. El pilot rep la pose de conducció V18, el motorista flexiona genolls anatòmics, i els mariners tenen pose asseguda. `poseNativeEnemyCrew()` actualitza les mans del bazuca per IK després de cada canvi d'orientació de l'arma a bord.
- Les talles històriques `size=.31/.43/.52` s'integren una sola vegada a les geometries/pivots amb `normalizeEnemyCrew` (arrel final 1); aquestes talles no es tornen a multiplicar en moure el vehicle. Els seients, marcadors de cap físic, vidres i origen de projectils continuen prenent les mateixes coordenades deterministes de `vehicle-crew-anchors.mjs` i `vehicle-occupant-damage-core.mjs` compartides per SOLO/COOP.
- `tests/enemy-crew-native-v18.mjs`: construeix els vehicles i patrulleres dels scripts reals amb els dos ocupants, comprova els 16 ossos V18, talles, manillar/mans, rifle i bazuca, hitboxes de cap, vidres, projectils i rotació de vehicles en SO/COOP; també verifica que canviar els angles del controlador antic no desplaci la figura visible.
- **Pendent per retirada final V17:** treure els controladors de física/armes invisibles que mantenen `u.head/u.ll/u.ar`, eliminar `copySkin` per a crides de `createCommando` genèriques, eliminar escalats originals de la fàbrica de comandes i revisar altres muntatges de seients no enemics. No confondre la migració visual amb la completa del controlador balístic.


**Producció 0.6.299 confirmada:** GitHub Actions [#44888297242](https://github.com/Haanarg/hunter_arxipelag/actions/runs/44888297242), 29 passos correctes incloent Cloudflare, paritat source/bundle i arrencada real. Els enemics embarcats tenen cos visible V18 directe i els seus seients/caps provenen dels mateixos punts numèrics de SOLO i COOP; resta l'antic controlador lògic invisible, els muntatges de tiradors exteriors i la comprovació visual multijugador en dispositius diferents.


## v0.6.300 — Consolidació final del camí visual d'enemics i preses de tiradors

- Totes les crides **reals** de `HUNTER_CHARACTERS.createCommando()` i `HUNTER_GENERAL_MODEL.create()` passen ara per `installNativeOnFootEnemy()` i `createHumanProposal()`, sense invocar `runtime.install()/copySkin()`. Tant les factories genèriques com l'elit, el general, els tripulants i l'artiller comparteixen articulacions V18 originals. L'adaptador històric `install/copySkin` continua existint exclusivament per fixtures de proves i altres contractes transitoris; no s'ha de declarar encara completament retirat.
- `HUNTER_CHARACTERS.animateSoldier()` mou directament el rig V18 i no interpola abans braços o genolls ocults. `enemy-ai` deixa d'animar els controls invisibles en LOD llunyà, i la caiguda sense ragdoll fa servir malucs/espatlles V18 (a més del ragdoll natiu existent).
- Els fusells de tiradors de torre segueixen units al muntatge balístic original, amb el seu muzzle al mateix punt. Dues preses geomètriques (gallet i guardamans) permeten resoldre la mà dreta i esquerra per IK a `humanEnemyNativeRifleSupport`, tant a la construcció com després de cada gir yaw/pitch, sense desplaçar projectils, hitboxes ni el vehicle. El resultat de l'abast dels dos braços es registra en cada animació per auditoria.
- Tests nous/actualitzats: constructors genèrics V18 i general directe, comprovació que no es toquen els controls antics durant l'animació, dues preses de rifle de torreta en rotació, manteniment de caps/seients SOLO+COOP i totes les proves anteriors. Encara falta revisar els **controladors lògics invisibles** del protagonista/riders, eliminar el codi de fixtures V17 quan es puguin reemplaçar i comprovar COOP visual amb dos dispositius.


## 0.6.301 — Els riders deixen d'executar copySkin() en crear-se

- La fàbrica compartida `playerModel.create` ofereix `controllerOnly:true` (per defecte `false`): conserva els pivots i les mesures originals del rider però salta `HUNTER_HUMAN_V17.install()` en lloc d'instal·lar una segona pell V17 que mai no és visible. `runtime.install()` també descarta qualsevol intent posterior de tornar a generar la pell si el model té `humanControllerOnly`.
- `HUNTER_RIDER.create` demana `controllerOnly:true` per als cotxes, GAZ, moto, bicicleta, hovercraft, llanxes, jetski, barca de rems i windsurf. La visualització aprovada ja prové de `createSeatRider` (V18 anatòmic), `createTwoWheelRider` (V18 anatòmic) o del LOD distant. El controlador antic encara manté marcadors de mans, peus i seient i malles originals de suport ocultes; eliminar-lo sencer requereix migrar els seus contractes de física i armes.
- Prova de regressió a `tests/human-game-runtime-v17.mjs`: figura `controllerOnly` sense `humanGameV17` ni `humanGameV17Mesh`; intent de reinstal·lació inert; rider del joc real sense cap malla de pell copiada. Es conserva la suite extensa de 2 rodes, seients i conducció, LOD, caps, armes i COOP.
- **No** equival encara a eliminar totes les estructures V17: `LEGACY_GAME_RIG_SCALE` queda associat al controlador lògic del protagonista i els ossos ocults dels riders són referents de compatibilitat. No ocultar-ne la necessitat; suprimir només quan els contractes natius d'armes, natació, orientació i física estiguin substituïts i provats amb COOP real.


## Tancament auditat fins a 0.6.301 — realment acabat vs dependències encara vives

**Validació de producció 0.6.300:** [#44900106174](https://github.com/Haanarg/hunter_arxipelag/actions/runs/44900106174), 29/29. **0.6.301:** [#44900802524](https://github.com/Haanarg/hunter_arxipelag/actions/runs/44900802524), 29/29 incloent compilació de l'últim runtime, Cloudflare, comprovació HTTP i arrencada Chromium publicada (llavor 148 i `mapScale=2`).

- **Pell/rig del protagonista, enemics, civils i riders:** el camí visual ordinari ja construeix el V18 natiu. El V17 copiat per `copySkin` no participa en els actors corrents dels constructors revisats. `playerModel.create` encara ofereix un adaptador històric per als fixtures de laboratori i altres constructors genèrics no articulats.
- **Pendent real, no cosmètic:** `src/characters.js` manté referències de controlador `u.upperBody/u.lowerBody/u.head/u.ll/u.ar/u.aer` per orientar tors/armes i resoldre ancoratges lògics. `src/human-game-runtime-v17.mjs` encara recull alguns estats d'aquest controlador i defineix `LEGACY_GAME_RIG_SCALE`, encara que el jugador real en consolida l'escala a arrel 1 abans del combat. `src/rider.js` conserva pivots lògics i longituds de braç/cama per a controls, encara que no executa `copySkin` i el render usa V18.
- **Condició per esborrar l'esquelet antic:** moure els últims punts físics i de munició a marcadors/estats V18, substituint explícitament el càlcul d'angles i posicions de cada consumidor; després retirar els objectes ocults, `LEGACY_GAME_RIG_SCALE`, les factories i l'adaptador històric. Cal provar el gir del tors i armes (pistola/AEK/SV-98/bazuca), ajupiment, natació, paracaigudes, pilots/passatgers, projectils i salvaguardes SOLO/COOP. La suite automàtica ja ha passat; **continua pendent la inspecció visual COOP amb dos dispositius**, que no queda substituïda pel smoke test.


## 0.6.302 — Controladors lògics V18 sense geometria oculta ni fallback de pose

- `playerModel.create({controllerOnly:true})` continua lliurant TOTS els pivots lògics en la mateixa posició i mida, però elimina les malles `isMesh` del maniquí antic i allibera els BufferGeometry i materials propis. La moto, la bicicleta i els seients propers ja dibuixen exclusivament `createTwoWheelRider` o `createSeatRider` V18; el LOD distant manté les seves primitives generades independentment al `rider.js`. Les variants de talla del proxy llunyà se segueixen consolidant sense escalar l'arrel ni punts físics de seient/arma. Cap material compartit del jugador real es destrueix: la neteja és exclusiva del controlador `controllerOnly` de cada rider.
- En `createPlayer` real, la bandera `humanGameNativeOnly` s'activa quan estan preparats tant `humanGameNativeBodyPose` com els 8 canals d'extremitats des del primer fotograma. `sync()` rebutja immediatament canals inexistents en aquest cas: ja no hi ha un camí silenciós de retorn al controlador V17 invisible per al tronc, l'ajupiment ni caminar/córrer. El fallback històric es conserva només als fixtures de laboratori que no són partida real.
- El controlador del cap invisible `u.head` deixa de rebre interpolacions redundants de cursa, natació i estat aeri, mentre que `headPitch/headYaw/headRoll` continuen arribant al crani real V18 en totes les animacions. Els mounts lògics de fusells/pistola i `u.upperBody` continuen per ara com a contractes de balística en espera de migració explícita.
- Proves reforçades: eliminació física de malles rider i materials, manteniment de pivots `Object3D`, cap V18 real del cotxe GAZ, LOD distant escalat de base, seient/arma/moto/bici/COOP; el protagonista real rebutja canals corporals natius absents i manté quiet el cap ocult durant cursa, braça i caiguda. **No** declarar eliminat `LEGACY_GAME_RIG_SCALE` ni `copySkin` de factories de test fins a migrar els altres consumidors.


## v0.6.303 — Les postures reals de sis seients V18 deixen d'animar els controls V17

- `HUNTER_RIDER.update` exigeix una fàbrica V18 per a qualsevol vehicle obert proper: seient anatòmic V18, moto/bici V18 o LOD distant. Si falta la figura de seient, falla explícitament en lloc de generar un cos extensible antic. L'estat `riderNativeOnlyPose` identifica les figures realment natives.
- Retirades les **24 crides** `limbBetween` dels sis camins de seient: cotxe/GAZ, hovercraft, moto aquàtica, barca de rems, windsurf i llanxes/llanxa de coets. Eliminades les escriptures repetides sobre `boots[i]` de compatibilitat, la neutralització del cap antic i els càlculs de `shoulderAt`, colzes i genolls que no arribaven al V18. Les coordenades *aprovades* de les mans i els peus són idèntiques: `poseCanonicalSeat` les rep directament i resol la IK a partir de l'esquelet real de l'editor; `aimNativeSeatPistol` i els grips/muzzle V18 continuen essent els únics que s'utilitzen en els sis seients.
- La bici i la moto ja feien servir `poseCanonicalTwoWheel` i no depenien del vell `limbBetween`; el LOD llunyà conserva el seu proxy i la reserva històrica d'arma/compatibilitat. `aimOneHand` i l'últim `limbBetween` resten com a fallback de tiradors llunyans o marcadors antics; ja no s'activen en el motor de les sis postures de seient.
- Tests: comprovació estructural que cap dels sis camins de seient invoca `limbBetween/shoulderAt`, `riderNativeOnlyPose=true`, i que els segments de control no s'estiren (`limbs.scale.y===1`); seients GAZ, hovercraft, llanxes, remador, windsurf, jetski, pilot/passatge COOP, altura de cap, fusells i boca de la pistola continuen coberts per les suites existents.


### Verificació de producció v0.6.303 i dependències residuals

- [PR #51](https://github.com/Haanarg/hunter_arxipelag/pull/51) fusionada; [Actions #44922520176](https://github.com/Haanarg/hunter_arxipelag/actions/runs/44922520176) amb **29/29 passes aprovades**, build i test integral, paritat SOURCE/BUNDLE, deploy Cloudflare, comprovació HTTP de la versió, i SOLO real publicat en Chromium (seed 148, mapScale 2).
- L'IK de les sis postures de seient és exclusivament nativa; les 24 crides dels segments V17 i els càlculs de colzes/genolls associats ja no s'executen. Els controls antics continuen com a contractes lògics en parts de `HUNTER_CHARACTERS.animatePlayerControls` i en el fallback de pistola dels riders llunyans; no es poden destruir globalment fins a separar el sistema de punts de presa, orientació balística i controls físics del protagonista.
- **Prioritat següent:** desplaçar els marcadors d'armes/cos del jugador de `u.upperBody/u.ar/u.aer` a dades natives V18, resoldre la pistola del LOD llunyà sense `limbBetween`, i només llavors eliminar els últims ossos antics i `LEGACY_GAME_RIG_SCALE`. Provar munició, fusell, franctirador, bazuca, granada, natació, ajupiment, riders, cascos i seients COOP. La suite automàtica **no substitueix** una sessió visual COOP en dos dispositius.

## v0.6.304 — Retirada dels braços extensibles V17 en tots els riders

- Eliminades definitivament de `src/rider.js` les funcions `limbBetween()`, `shoulderAt()` i `aimOneHand()`. El camí antic final de seient ja no és executable: qualsevol vehicle obert sense ruta V18 falla explícitament, sense dibuixar ni estirar ossos ocults.
- La pistola d'un pilot en LOD distant conserva el proxy de dues malles i calcula excepcionalment la sortida de projectil a través de la figura nativa de seient, el canell dret, el grip i el `hunter-pistol-muzzle` originals. L'arma de llarga distància es torna a ocultar després del tret i no deixa cues de tir per a la transició a la vista propera. **El punt d'ancoratge transitori distant és aproximat**: manca validació visual i paritat balística al límit exacte de LOD amb dos clients.
- `tests/human-game-runtime-v17.mjs`: comprova que no resta cap invocació de la IK extensible en el rider, que un tret llunyà manté grip/muzzle en el canell V18, no mou pivots antics ni mostra una pistola flotant i que en tornar a prop es descarta el canell transitori.
- **No retirar encara el grup `humanGameLegacyRig` ni `LEGACY_GAME_RIG_SCALE`**: la dependència principal que segueix viva és el posicionament/control balístic de `u.upperBody/u.ar/u.aer` del protagonista a `src/characters.js`. També resten els pivots lògics dels riders, encara que ja no executin IK extensible. La validació COOP amb dos dispositius continua pendent.

## v0.6.305 — IK d'armes reals del protagonista sense escriptures V17

- Per als actors reals marcats `humanGameNativeOnly`, `animatePlayerControls` ja **no executa** `aimPlayerPistolArm` de la cisalla, AEK-971, SV-98, bazuca ni de la pistola. `humanGamePose()` ja resol l'IK real de mans i els punts de presa natius dels models V18, mentre les rutes històriques d'armes de tests romanen disponibles per a fixtures sense rig natiu.
- El `pistolRig.idle/idleQ` (àncora lògica de la pistola que queda en compatibilitat) es deriva ara de `humanGameCanonicalJoints.wristR` i de la transformació de coordenades del seu pare, no de `u.ar/u.aer`. La font `u.gun` continua invisible en render i conserva els esdeveniments balístics/reculada.
- `tests/human-game-runtime-v17.mjs` assegura que activar les quatre eines no escriu a les articulacions ocultes i que els quatre solvers canònics ofereixen punts de presa finits. També altera els quaternions antics durant el repòs de pistola i verifica la invariància de l'àncora V18.
- **Important:** és una desconnexió de la IK d'armes, NO l'eliminació de tot el controlador V17. Encara hi ha escriptures de locomoció/ganivet/granada i el pivot `u.upperBody` per compatibilitat de l'arma lògica; el grup `humanGameLegacyRig` i l'escala de laboratori `LEGACY_GAME_RIG_SCALE` es mantindran fins que es migrin aquests contractes.
- **Validació pendent:** la nova ruta requereix prova visual en WebGL/COOP de transició pistola-repòs↔apuntar, cisalla, bazuca, rifles i munició amb host/guest, després de comprovar la suite i el desplegament de producció.
