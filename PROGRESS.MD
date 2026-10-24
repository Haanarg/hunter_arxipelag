# HUNTER · ARXIPÈLAG — progrés de les millores

Actualitzat: 2026-10-24. Aquest fitxer és el punt de represa del pla de catorze fases, ordenat inicialment per impacte. S'han completat i desplegat **6 → 8** per prioritat de l'usuari; les fases saltades continuen pendents. «Implementada» no equival a validació física en Android.

## Estat de les fases

| Fase | Objectiu | Estat i evidència | Què queda |
| --- | --- | --- | --- |
| 1 | Missions completables | **Parcial.** Validador fora del runtime i regressions d'accés local; commit `79bdca3`. Matriu de 8 combinacions llavor/escala i cas complet 67/1 superats. [Detall](docs/MISSION_VIABILITY.md). | Rutes entre illes, accés als mapes, embarcament, sortida navegable, seqüència completa de victòria i més llavors. No s'ha demostrat viabilitat universal. |
| 2 | Separar càmera i conducció; interiors segurs | **Implementada**, v0.5.76, commit `a982a9b`. Mirada lliure als vehicles i càmera restringida al soterrani; proves de 16 perfils i geometria. [Detall](docs/PHASE2_CAMERA.md). | Passada visual WebGL i Android físic. |
| 3 | Simulació coherent amb FPS baixos | **Implementada**, v0.5.77, commit `404f246`. Subpassos de fins a 1/60 s, límit de 250 ms, rellotges de joc/cinemàtiques separats i proves de cadència/trajectòria. [Detall](docs/PHASE3_SIMULATION.md). | Mesura en dispositiu real; no és determinisme exacte ni una garantia d'FPS. |
| 4 | Rendiment sostingut a Android | **Pendent**, ajornada en prioritzar 6 i 8. | Perfilar CPU/GPU, memòria i bateria durant partides llargues; optimitzar segons les mesures. |
| 5 | Desar, suspendre i reprendre l'operació | **Pendent**, ajornada. | Format versionat de partida, restauració segura i proves de lifecycle. |
| 6 | Combat llegible | **Implementada i desplegada**, v0.5.78, commit `f80705b`. Espurnes distintives d’ineficàcia, sang més visible als ferits, confirmació d’impacte real i direcció del dany. [Detall](docs/PHASE6_COMBAT.md). | Aspecte visual/GPU i Android físic pendents. |
| 7 | Orientació i ritme de missió | **Pendent**, ajornada. | Guia d'intel/objectius i direcció útil del waypoint, sense revelar informació desconeguda. |
| 8 | Sigil i IA llegibles | **Implementada i desplegada**, v0.5.79, commit `fc2a3c3`. Marcadors visibles de sospita/contacte/cerca, posicions de tir i flanc reservades i torns d’entrada. [Detall](docs/PHASE8_STEALTH.md). | Llegibilitat visual, GPU i Android físic pendents. |
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

## Criteris de validació de les fases 6 i 8

1. Proves de comportament de les fonts i del bundle de producció, més regressions afectades.
2. Recursos visuals limitats, neteja en reiniciar i cap canvi accidental a dany, cadència o immunitats.
3. En sigil, cap marcador darrere d'obstacles ni coneixement de la posició actual del jugador només per haver sentit un soroll.
4. Versió i bundle coherents; commit publicat, check de Cloudflare i fitxers públics comprovats.
5. Registrar aquí els resultats i els límits de validació real.

## Registre de la fase 6

- v0.5.78 preparada amb runtime `d88c4ce38ac40c05` (53 mòduls). Les dues suites de feedback passen sobre fonts i bundle final. Integritat/cache, dany enter, dany enemic, UI, càmera i cinemàtica de mort superats.
- La revisió independent inclou cobertura, owners de projectils/explosius, immunitats, ferides supervivents, gir de càmera amb rumb del jugador constant, casc/pilot i 20 ràfegues sense més de 112 malles ni efectes orfes.
- Publicada com a `f80705b643a7dde2e235701cdd33a4c3f19c7ce2`. Check de Cloudflare completat amb èxit (build `9bbbb943-4bf6-4647-9f07-4f857c99ed1a`, Worker version `8a8824f7-c280-416a-8600-d68c8e27dbf5`). HTTP públic comprovat: entrada i `version.mjs` a 0.5.78; runtime `d88c4ce38ac40c05`, 585.964 bytes, idèntic byte a byte al local verificat.
- Prova visual intentada sobre la base pública v0.5.77: el navegador cloud no pot crear un context WebGL, també amb qualitat mínima. No s’atribueix aquest error als canvis de fase 6.

## Registre de la fase 8

- v0.5.79, runtime `2d9cc3d4303144f1`: 54 mòduls, 597.628 bytes. Conserva totes les millores de la fase 6.
- Fonts i bundle final: percepció, marcadors, coordinació i revisió independent superats. Regressions de feedback de combat, càmera de 16 perfils, dany enter, cinemàtica de mort, UI i navegació superades; integritat/cache i dry-run de Wrangler correctes. Les regressions temporals passen en fonts i bundle (36 m/3 s, 46 trets/10 s als set perfils).
- Cas real de porta 2,5 m: de 1/3 soldats que entraven en 30 s a **3/3 en tots dos ordres**. Separació mínima 2,40029 m / 2,41392 m i zero posicions dins de murs. Tres reserves de tir separades almenys 10,20 m en el cas independent.
- Provats alliberament per mort, absència de tasca, bloqueig i pausa; reintents després d’un reset amb rellotge antic de 1.000 s; desaparició de marcadors amb cobertura i immediata revalidació en obrir-la; cos/forjat/envà del soterrani; límits de malles i comprovacions.
- La cerca conserva la posició i alçada recordades, ignora l’interior/planta actuals del jugador ocult i no reinvestiga el propi crit. Rang de detecció, dany i cadència conservats.
- Publicada com a `fc2a3c3e19718dccc68807c47d85d076a14b17d3`. Check de Cloudflare completat amb èxit (build `e1629722-49f0-4382-9087-e1a8be69b87a`, Worker version `01148b74-c0aa-4704-9459-c5f8a95bcc74`). Verificació pública `2026-10-24T20:52:48.015792+00:00`: entrada i `version.mjs` a **0.5.79**, runtime `2d9cc3d4303144f1`, 597.628 bytes, idèntic byte a byte al local verificat (SHA-256 `ea86d357006287bd34f08aafe6fe74b7f21ee1172c9d9fed4985ba1d4b1b8323`).
- Fases **4, 5 i 7 pendents**, i resta del pla segons la taula. La fase 1 continua parcial; la validació visual en GPU/Android continua pendent.

## Represa

La versió pública comprovada és **0.5.79**, amb les fases 6 i 8 integrades. Per continuar el pla original, la fase pendent de més prioritat és la **4** (perfilar Android), després la **5** (desar/recuperar) i la **7** (orientació); la taula conserva també els pendents de les fases 1 i 9–14. Aquesta anotació no inicia cap fase nova.

## Límits coneguts de la base

El harness usa geometria Three.js amb un renderitzador simulat: no certifica aspecte visual ni rendiment en GPU o Android. Es conserven discrepàncies antigues en proves aïllades (`compound-generation` a 12345/1, contextos de `vehicle-weapon-reticle` i `player-locomotion`, una expectativa literal de `rowing-audio-camera`, `light-projectile-aim` (`autoAimDown`, reproduït també sobre la base intacta `9a1b87b`), i fixtures antics de `damage-consistency` (context sense `window`) i `combat-heli-rocket-boats` (regex de generació antiga)); no s'han eliminat per obtenir un resultat verd. Vegeu les notes de cada fase.
