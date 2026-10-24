# HUNTER · ARXIPÈLAG — progrés de les millores

Actualitzat: 2026-10-24. Aquest fitxer és el punt de represa del pla de catorze fases, ordenat inicialment per impacte. L'usuari ha prioritzat ara **6 → 8**; les fases saltades continuen pendents. «Implementada» no equival a validació física en Android.

## Estat de les fases

| Fase | Objectiu | Estat i evidència | Què queda |
| --- | --- | --- | --- |
| 1 | Missions completables | **Parcial.** Validador fora del runtime i regressions d'accés local; commit `79bdca3`. Matriu de 8 combinacions llavor/escala i cas complet 67/1 superats. [Detall](docs/MISSION_VIABILITY.md). | Rutes entre illes, accés als mapes, embarcament, sortida navegable, seqüència completa de victòria i més llavors. No s'ha demostrat viabilitat universal. |
| 2 | Separar càmera i conducció; interiors segurs | **Implementada**, v0.5.76, commit `a982a9b`. Mirada lliure als vehicles i càmera restringida al soterrani; proves de 16 perfils i geometria. [Detall](docs/PHASE2_CAMERA.md). | Passada visual WebGL i Android físic. |
| 3 | Simulació coherent amb FPS baixos | **Implementada**, v0.5.77, commit `404f246`. Subpassos de fins a 1/60 s, límit de 250 ms, rellotges de joc/cinemàtiques separats i proves de cadència/trajectòria. [Detall](docs/PHASE3_SIMULATION.md). | Mesura en dispositiu real; no és determinisme exacte ni una garantia d'FPS. |
| 4 | Rendiment sostingut a Android | **Pendent**, ajornada en prioritzar 6 i 8. | Perfilar CPU/GPU, memòria i bateria durant partides llargues; optimitzar segons les mesures. |
| 5 | Desar, suspendre i reprendre l'operació | **Pendent**, ajornada. | Format versionat de partida, restauració segura i proves de lifecycle. |
| 6 | Combat llegible | **Implementada**, v0.5.78. Espurnes distintives d’ineficàcia, sang més visible als ferits, confirmació d’impacte real i direcció del dany. [Detall](docs/PHASE6_COMBAT.md). | Comprovació del desplegament en curs; aspecte visual/GPU i Android físic pendents. |
| 7 | Orientació i ritme de missió | **Pendent**, ajornada. | Guia d'intel/objectius i direcció útil del waypoint, sense revelar informació desconeguda. |
| 8 | Sigil i IA llegibles | **Següent**, després de la fase 6. | Comunicar sospita/contacte/cerca i repartir posicions de tir i torns d'entrada, preservant percepció i cobertura. |
| 9 | Controls tàctils personalitzables | **Pendent.** | Esquerrans, sensibilitat, posicions i persistència de preferències. |
| 10 | Generació progressiva del món | **Pendent.** | Resposta durant la càrrega i treball distribuït sense canviar llavors. |
| 11 | Exploració opcional amb decisions | **Pendent.** | Recompenses i alternatives que aportin decisions a la missió. |
| 12 | So espacial informatiu | **Pendent.** | Indicacions acústiques i memòria cau dels buffers recurrents. |
| 13 | Modularització i regressions | **Pendent com a fase.** Hi ha extraccions i proves parcials a les fases anteriors. | Reduir dependències globals i ampliar regressions de comportament. |
| 14 | Acabat visual i final de partida | **Pendent com a fase.** | Animacions/LOD, poliment, salt de cinemàtiques i resum final. |

## Base publicada i desplegament

- Neteja i recursos compartits: v0.5.75, commit `076cda2`; [notes](docs/CODE_OPTIMIZATION_2026-10-24.md).
- Correcció de Cloudflare Workers Static Assets: commit `9a1b87b`. `wrangler.jsonc` explícit i `.assetsignore` impedeixen publicar `node_modules`, eines i documentació. La configuració conserva el Worker existent.
- Última versió comprovada abans d'aquestes fases: **0.5.77** a <https://hunter.paradoxa.cat/>. Check Cloudflare reeixit i bundle públic idèntic al verificat localment; l'usuari també en confirma la versió.
- GitHub Actions continua **només manual**. El desplegament de Cloudflare es comprova separadament: un commit a GitHub no demostra que sigui públic.

## Criteris per tancar les fases 6 i 8

1. Proves de comportament de les fonts i del bundle de producció, més regressions afectades.
2. Recursos visuals limitats, neteja en reiniciar i cap canvi accidental a dany, cadència o immunitats.
3. En sigil, cap marcador darrere d'obstacles ni coneixement de la posició actual del jugador només per haver sentit un soroll.
4. Versió i bundle coherents; commit publicat, check de Cloudflare i fitxers públics comprovats.
5. Registrar aquí els resultats i els límits de validació real.

## Registre de la fase 6

- v0.5.78 preparada amb runtime `d88c4ce38ac40c05` (53 mòduls). Les dues suites de feedback passen sobre fonts i bundle final. Integritat/cache, dany enter, dany enemic, UI, càmera i cinemàtica de mort superats.
- La revisió independent inclou cobertura, owners de projectils/explosius, immunitats, ferides supervivents, gir de càmera amb rumb del jugador constant, casc/pilot i 20 ràfegues sense més de 112 malles ni efectes orfes.
- Publicació i comprovació pública: pendents en aquest commit; el resultat s’anotarà a la següent actualització.
- Prova visual intentada sobre la base pública v0.5.77: el navegador cloud no pot crear un context WebGL, també amb qualitat mínima. No s’atribueix aquest error als canvis de fase 6.

## Límits coneguts de la base

El harness usa geometria Three.js amb un renderitzador simulat: no certifica aspecte visual ni rendiment en GPU o Android. Es conserven discrepàncies antigues en proves aïllades (`compound-generation` a 12345/1, contextos de `vehicle-weapon-reticle` i `player-locomotion`, una expectativa literal de `rowing-audio-camera`, i `light-projectile-aim` (`autoAimDown`, reproduït també sobre la base intacta `9a1b87b`)); no s'han eliminat per obtenir un resultat verd. Vegeu les notes de cada fase.
