# Fase 2 — càmera i conducció, v0.5.76

## Comportament

- En tots els perfils de vehicle, arrossegar horitzontalment orienta la càmera sense escriure el rumb, la velocitat o els controls de direcció del vehicle. Torretes i projectils conserven la seva direcció física.
- En deixar anar hi ha 0,7 segons de marge. Si el vehicle es mou, la càmera torna gradualment al darrere pel camí angular més curt; aturat, conserva la mirada lliure. També es considera el desplaçament lateral o vertical.
- A peu es conserva el gir del personatge. Amb el franctirador es mantenen els controls de la mira.
- Un segon dit no substitueix el gest de càmera actiu. Les cancel·lacions, la pèrdua de captura, pausa, canvi de focus, canvi de vehicle, sortida, destrucció i reinici descarten els gestos antics.
- Les cases ordinàries mantenen les parets opaques i només oculten les peces interposades entre càmera i jugador. Les transicions de coberta i pis s’actualitzen en canviar d’interior. Les col·lisions no es modifiquen.
- Dins el soterrani, la posició interpolada queda restringida al volum interior i per sota del sostre opac. L’entrada i la sortida canvien de volum directament per evitar travessar el forjat durant la interpolació.
- L’oclusió es restaura també en canviar a mira, pausa o cinematogràfica. La restauració comprova que la peça continuï existint i que la porta no estigui oberta; no restitueix murs destruïts o separats de la seva jerarquia.

## Implementació

`src/camera-controls.js` conté l’estat reutilitzable de mirada i oclusió, amb recursos limitats a les peces ocultes del fotograma. `game-core.js` integra els gestos i la càmera; els punts de sortida/destrucció i el reinici cancel·len l’estat visual. No s’afegeixen cerques sobre tota l’escena, còpies de materials per fotograma ni canvis al pas temporal, la conducció o el balanç de combat.

## Comprovacions

```sh
npm run test:camera
HUNTER_TEST_BUNDLE=1 npm run test:camera
node tools/build-runtime.cjs --check
```

El grup `camera` de les proves essencials executa la bateria de càmera i la del búnquer. Els workflows continuen sent exclusivament manuals.

La bateria nova utilitza els handlers reals de punters i l’estat del joc: perfils de vehicle, teclat i joystick simultanis, mirada aturada, retorn i límits angulars, cancel·lació/multitàctil, controls a peu i amb mira, canvis d’estat i invariància dels trets. També construeix un món amb geometria completa de la llavor 67 per comprovar soterrani, escales, interiors i restauració visual. El harness simula el renderitzador; això no és validació WebGL.

Resultats de la revisió:

- Bateria funcional final sobre el bundle: superada, inclosos els 16 perfils configurats, vehicles embarcats al ferri i inici de victòria.
- Revisió independent de les fonts i del mateix bundle: 10 escenaris superats, amb 48 posicions de càmera al soterrani i comprovació de les quatre peces opaques del forjat.
- `bunker-basement`, `truck-exit`, sintaxi, integritat del bundle i política de memòria cau: superats.
- El paquet passa de 574.327 a 577.284 bytes sense compressió HTTP: +2.957 bytes, aproximadament un 0,5%. Això no és una mesura de rendiment en GPU.

## Límits

No s’ha fet una passada visual en navegador o Android: Playwright és disponible a l’entorn de revisió, però hi falta l’executable de Chromium. Les proves de geometria i controls no certifiquen el resultat visual ni el rendiment d’una GPU real.

La revisió de la base `79bdca3` va reproduir errors previs a les proves aïllades `vehicle-weapon-reticle` (`HELI_MISSILE_ANGLE` absent del seu context), `player-locomotion` (`knifeEquipped` absent) i una expectativa literal antiga de `rowing-audio-camera`. Aquestes proves es conserven; la comprovació de punteria de la fase 2 utilitza el harness complet. No s’ha executat tota la bateria general ni la matriu de vuit llavors de la fase 1.
