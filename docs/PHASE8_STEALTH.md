# Fase 8 — sigil llegible i coordinació, v0.5.79

## Senyals visibles

Els soldats mostren un senyal petit sobre el cap segons el seu estat real: **? ambre** per sospita, **! coral** per contacte confirmat i **◇ blau** per cerca o investigació. La forma diferencia els estats sense dependre només del color. La pausa inclou la llegenda; no cal activar els cons de depuració de F9.

El marcador exigeix que el soldat sigui dins del camp de càmera i a menys de 100 m, i que hi hagi visibilitat tant al cos com al senyal. Els segments comproven murs/portes, teulades, forjats de plantes, vehicles i terreny, inclòs el nivell excavat del búnquer. No es conserva una visibilitat antiga per seguir soldats amagats. Els traços també fan prova de profunditat en el renderitzador.

Hi ha un màxim de **24 marcadors** i **48 candidats comprovats per dibuix**. Geometries i materials es comparteixen, les malles es reutilitzen i els indicadors es netegen en reinici, pausa, focus, mort i victòria. Això limita el treball afegit; no és una mesura d'FPS en Android.

## Repartiment i accessos

- Les posicions de flanc i tir tenen un cost addicional quan hi ha companys a prop o una posició ja reservada. La cerca usa graelles locals i reserves breus, i conserva una posició durant un interval per evitar canviar d'objectiu cada fotograma.
- Les portes ordinàries tenen torns d'entrada i punts d'espera laterals. Només un soldat ocupa el pas cada vegada; els altres deixen lliure l'aproximació. Les portes blindades del búnquer i els hangars conserven el seu tractament anterior.
- El soldat s'alinea amb el centre del portal abans de travessar-lo. Manté les col·lisions i la separació originals; no es teletransporta ni redueix el seu radi per cabre-hi.
- Les reserves s'alliberen en abandonar la tasca, morir o quedar bloquejat. El reinici dels temporitzadors també neteja els reintents anteriors.

## Informació justa

Es conserven el con i rang de visió, l'acumulació de reconeixement, els temps de memòria, el dany i la cadència de les armes. Els marcadors representen l'estat de la IA; no el modifiquen.

En perdre contacte, l'accés a un edifici i la ruta de pis es decideixen amb la **posició i alçada recordades**, en lloc de consultar l'interior o el pis actuals del jugador amagat. Sentir un soroll continua donant una ubicació aproximada de l'esdeveniment. Un soldat ja no torna a investigar el seu propi crit d'alerta en perdre de vista el jugador; els aliats continuen sentint-lo.

## Comprovacions

```sh
npm run test:stealth
HUNTER_TEST_BUNDLE=1 npm run test:stealth
npm run test:feedback
node tests/enemy-navigation.cjs
node tools/build-runtime.cjs --check
node tests/startup-cache.cjs
```

El grup `stealth` de GitHub Actions continua sent exclusivament manual. Les proves cobreixen transicions de percepció, memòria de sons, oclusió dels marcadors, recursos, reserves i la continuació efectiva de rutes després d’entrar. Les quatre bateries passen tant sobre fonts com sobre el bundle final `2d9cc3d4303144f1`; també passen feedback de combat, càmera, dany enter, mort, navegació i UI. Integritat/cache i `wrangler deploy --dry-run`: correctes.

Cas independent d'accés: porta de 2,5 m i tres soldats, amb navegació, graella, col·lisió i moviment reals. La base deixava dos soldats fora durant 30 s; la implementació permet entrar els tres en els dos ordres provats, amb separació mínima superior a 2,4 m i cap posició dins d'un mur.

## Límits

La comprovació de visibilitat és conservadora: un cos parcialment cobert pot perdre el marcador encara que se'n vegi una part. El límit de candidats pot retardar l'aparició d'un marcador nou en escenes molt concorregudes. Les reserves són coordinació local, no una planificació global d'esquadres.

La validació disponible usa geometria Three.js amb renderitzador simulat. El navegador cloud no pot crear un context WebGL, com ja es va observar abans de la fase 6. Aspecte visual, llegibilitat en pantalla petita i rendiment sostingut en Android físic continuen pendents. El registre de fases i els resultats finals de publicació són a [PROGRESS.MD](../PROGRESS.MD).
