## Implementació de la correcció — v0.6.243 (2026-11-19)
L'auditoria original següent descriu l'estat de 0.6.242. Els problemes P0 i P1 s'han corregit en el motor posterior: els valors d'escala ja són definitius; el moviment antic quiet/lateral s'ha implementat sobre el rig de l'editor; B3 i C4 tenen prioritat quan s'avança; `animatePlayer()` és l'únic selector i crida `humanGamePose()` després de cada tick; el renderitzat no anima articulacions. Es conserva només un grup antic ocult per a controls, física i armes, sense que pugui imposar la braçada visible. Proves prèvies actualitzades, sense afegir proves.

---
# Auditoria de la natació B3/C4 — Hunter: Arxipèlag
**Data:** 19 de novembre de 2026  
**Versió del joc auditada:** 0.6.242  
**Abast:** model del protagonista (SOLO i COOP), entrada, animació antiga i nova, malles Three.js, shader de l'aigua, compilació i publicació.

## Conclusió
**Hi ha dos animadors de natació executant-se en paral·lel.** El controlador antic continua animant braços i cames dins `src/characters.js` fins i tot quan s'ha seleccionat B3/C4. El controlador nou anima el model de l'editor a través de **l'efecte lateral de `visual.updateMatrixWorld()`**, no directament des de `animatePlayer()`. Aquesta estructura és redundant, fràgil i és la primera candidata a explicar la discrepància entre el codi i el fotograma real. **Encara no s'ha confirmat la causa exacta dins el navegador.** La hipòtesi anterior de l'opacitat de l'aigua és secundària i no explica per si sola que tampoc aparegui el crol.

## Traçabilitat del camí real
1. `src/player-input-core.mjs`, `createReader()`: `f` és positiu amb W/fletxa amunt o joystick endavant; `running` depèn de SHIFT o la prolongació del joystick.
2. `src/game-core.js`, `update()` i `animPl()`: `waterSupport()` determina `swimming`, i `animPl(f,dt,running,strafe)` passa aquestes dades al motor de personatges.
3. `src/coop-world-runtime.js`: el jugador local també passa per `animPl()`; els remots reconstrueixen moviment longitudinal/lateral a partir de les posicions interpolades.
4. `src/characters.js`, `animatePlayer()`: selecciona `gameSwimStyle='B3'` quan `swimming && forward>.12 && forward>=abs(strafe)*.75`, o `C4` si també `running`. Actualitza `gameSwimSeconds`, `gameSwimBlend` i `crawlBlend`. **Tot seguit entra a l'animador antic**, que manipula `u.ar`, `u.al`, `u.aer`, `u.ael`, cames i tronc amb sinus i cosinus.
5. `src/player-model-core.mjs` crea els pivots antics per compatibilitat, i crida `HUNTER_HUMAN_V17.install()`.
6. `src/human-game-runtime-v17.mjs`, `installCanonicalPlayer()`: elimina la major part de les malles humanes antigues, afegeix el model canònic de l'editor i mapeja els pivots antics als nous. L'animació B3/C4 només es calcula des de `sync()`, que està connectat a un reemplaçament de `visual.updateMatrixWorld()`. **No hi ha crida explícita des de `animatePlayer()`**.
7. `src/human-game-swim-bridge.mjs`: restaura la postura anterior, calcula B3 i/o C4 amb `poseHumanSwimming()`, en desa quaternions, la torna a restaurar i interpola. Aquest mostreig pot repetir-se quan càmera, ombres, col·lisions visuals o el render exigeixen matrius.
8. `src/human-swim-proposals.mjs`: les trajectòries B3 i C4 continuen sent les de l'editor. La resolució IK fa `model.updateMatrixWorld(true)` dues vegades per mostra de braços; pot entrar de manera reentrant al mateix punt d'actualització del rig (el guard `updatingCanonical` evita executar de nou `sync()` durant la reentrada).
9. `src/water.js` és una capa de visualització; l'aclariment local de l'aigua de 0.6.242 no substitueix ni executa cap animació.

## Evidència independent (sense afegir proves al repositori)
He executat els mòduls reals Three.js i els controladors `characters.js`, `human-game-runtime-v17.mjs`, `human-game-swim-bridge.mjs` i `human-swim-proposals.mjs` sobre el mateix protagonista; no només s'han inspeccionat les variables sinó les **posicions mundials d'una malla real d'Avantbraç**, filla de `elbowL/elbowR`.

| Estat | Estil declarat | Rotació X del model visual | Centre dels avantbraços esquerre/dret (m, valors arrodonits) |
|---|---|---:|---|
| Quiet (0,5 s) | lateral-idle | 0 | (-0,43; 1,71; -0,08) / (0,43; 1,71; -0,08) |
| Braça B3 (0,6 s) | B3 | -1,56 rad | (-0,79; 0,23; -2,50) / (0,78; 0,23; -2,50) |
| Braça B3 (1,2 s) | B3 | -1,56 rad | (-0,30; 0,09; -2,55) / (0,30; 0,09; -2,55) |
| Crol C4 (~1,6 s rellotge) | C4 | -1,57 rad | (-0,25; 0,50; -1,15) / (0,29; 0,31; -2,80) |
| Crol C4 (~1,9 s rellotge) | C4 | -1,57 rad | (-0,76; 0,89; -1,50) / (0,01; 0,05; -2,50) |

**Interpretació:** el codi font, en execució aïllada, pot animar malles reals del model nou. **No demostra** que la postura aplicada al fotograma final a Cloudflare/navegador sigui la mateixa; cal instrumentar la ruta de render real o eliminar les vies d'actualització duplicades.

En aquesta execució, la pell del protagonista incorpora **56 malles canòniques de l'editor** i ha eliminat **71 malles del model anterior**. No s'ha detectat que el jugador creat per `HUNTER_CHARACTERS.createPlayer()` sigui, per defecte, un duplicat de la pell antiga.

## Redundàncies i riscos ordenats per prioritat
**P0 · Dos propietaris de l'animació.** `characters.js` segueix fent la braçada antiga, mentre que `human-game-runtime-v17.mjs` executa la nova. Si el pont natiu no s'aplica en el moment correcte, el resultat observable és la postura antiga. Cal deixar **un únic propietari de la postura de natació**, amb l'animador antic només per al moviment estacionari/lateral.

**P0 · Animació oculta dins l'actualització de matrius.** `sync()` canvia articulacions com a efecte secundari de `visual.updateMatrixWorld()`, que es pot invocar múltiples vegades per render, ombres o mesures. Cal actualitzar la postura **exactament un cop en el tick de joc**, just després d'interpretar l'entrada, i deixar `updateMatrixWorld()` només per a geometria/matrius.

**P1 · Pont de mostres mutable i restauracions reentrants.** `createGameSwimBridge()` usa mostres B3/C4 sobre el **mateix rig visual**, `restoreHumanSwimming()` i còpies de 16 quaternions, amb `model.updateMatrixWorld(true)` dins de l'IK. Cal separar el mostreig de la seva aplicació, evitar restauracions de la postura durant el render i reutilitzar resultats temporals sense mutar el rig principal en cada braç.

**P1 · Dos rellotges i dos pesos de natació.** `u.ph` per a l'animador antic, `u.gameSwimSeconds` per al nou, `u.crawlBlend` i `u.gameSwimBlend` per a mescles diferents. Han de centralitzar-se en un estat amb `mode = idle | lateral | B3 | C4`, una fase per al moviment seleccionat i una única transició.

**P1 · Variants i fonts en el cooperatiu.** L'actor local usa ordres d'entrada; l'actor remot dedueix si avança de diferències d'ubicació interpolades. Això pot triar B3/C4 incorrectament per jitter o renderització amb retard, fins i tot amb el mateix model. Enviar el tipus d'animació o reconstruir-lo a partir d'inputs autoritatius, sense modificar l'autoritat de la física.

**P2 · Multiplicacions d'escala encara presents.** El protagonista manté `player.scale=2/3`, `FOOT_PLAYER_VISUAL_FACTOR=8/5` i una compensació `visual.scale = (8/5)*editorScale/model.scale`. No prova la incidència de natació, però contradiu l'objectiu del projecte de consolidar escales. S'ha de tractar com l'auditoria de vehicles: dimensions finals mesurades i sense factors acumulatius.

**P2 · L'aigua com a explicació secundària.** En B3 les mans s'enfonsen entre 25 i 50 cm, i el shader oceànic anterior era opac. La transparència local pot fer més visible la braçada, però **no justifica per si sola l'absència també de C4**. La combinació `transparent:true` amb `depthWrite:true` s'haurà de revisar perquè no generi altres efectes d'ordenació.

**P2 · Validació insuficient del fotograma final.** Les proves existents del laboratori validen IK i geometria, no el fotograma WebGL real. La CI de 0.6.242 confirma paquet, compilació i asset servit, no quin animador ha guanyat a l'hora de dibuixar.

## Hipòtesis a descartar abans de retocar la natació
- **Model vell carregat com a malla principal:** no observat a la reproducció aïllada; el protagonista natiu elimina la major part de la pell antiga. L'esquelet/controlador antic sí que continua existint, per compatibilitat.
- **B3 o C4 no definides o no mostrejades:** descartat en codi font i malles Three.js amb ordres sintètiques.
- **La compilació no conté els fitxers:** la publicació 0.6.242 té workflow 44601820762 verd, paquet de 70 mòduls i verificació HTTP exacta; no demostra, però, que el navegador local dibuixi les mateixes articulacions.

## Pla de simplificació (sense afegir proves)
1. Unificar la decisió d'estil a `animatePlayer()`: `idle/lateral` només amb la postura antiga; `B3` en avançar; `C4` en avançar amb córrer.
2. Aplicar les animacions natives B3/C4 sobre els **pivots de la pell que es dibuixa** en una crida explícita immediatament després de la selecció d'estat, per a SOLO i COOP. Deixar els pivots antics només per a física, armes i altres moviments.
3. Treure la natació IK del `updateMatrixWorld()` i eliminar la doble animació d'extremitats en estat B3/C4. Preservar la compatibilitat de posar-se dret, armes i vehicles.
4. Consolidar rellotges, blend i escales. Mantenir la transparència de l'aigua separada de la lògica d'animació.
5. Fer una comprovació manual en el joc amb els tres casos (avançar, córrer nedant, quiet/lateral). No afegir cap fitxer de proves automàtiques, per indicació de l'usuari.

**Estat final de l'auditoria:** redundàncies confirmades i font de fragilitat localitzada. La causa concreta en el navegador no està demostrada encara. No s'han modificat les animacions ni la física en aquesta auditoria.
