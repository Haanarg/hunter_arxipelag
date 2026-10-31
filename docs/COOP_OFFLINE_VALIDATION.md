# Validació del COOP sense GitHub Actions · 0.6.63

## Context

Per manca de quota d'Actions, `.github/workflows/coop-regression.yml` ha deixat de tenir el disparador automàtic `push`. Queda només `workflow_dispatch` (manual i optatiu). Els altres workflows del repositori també estan configurats com a manuals; no s'ha intentat executar-ne cap en aquesta fase.

Els commits de la 0.6.63 es poden crear i revisar a GitHub sense executar Actions. **Això no és un desplegament**: Cloudflare Pages i el Worker/Durable Object continuen necessitant publicació i comprovació de la versió. El client i el Worker han d'usar la mateixa versió perquè el `hello.gameVersion` és verificat pel servidor.

## Proves locals reproduïbles (Node 22)

Des d'una còpia del repositori:

```bash
npm ci --ignore-scripts
npm run test:coop:offline
npm run test:coop:integration
```

- `test:coop:offline`: deltes sense pèrdua, serialització al Durable Object, telemetria, jitter, trajectòries del company, vehicles i soldats, caché de predicció, i consistència del bundle.
- `test:coop:integration`: proves amb el motor i el món originals, la simulació compartida, la presentació dels remots i les 16 variants de vehicles.
- Els tests de servidor i de presentació inclouen casos de mort, canvi de seient, revisió divergent, teleport, reordenació, pausa i paquets tardans.

**Estat de verificació aquí:** els tests purs d'interpolació (incloses 377 entitats), jitter i deltes, més el test instrumentat del caché de predicció i els nous comptadors de fotograma, han passat en execucions JavaScript aïllades. No s'ha executat aquesta bateria completa de Node 22 ni les proves amb motor GPU en aquesta sessió. La sintaxi de les fonts principals es va comprovar aïlladament. Cal evitar declarar els tests integrats com a superats fins a executar-los.


**Comprovació del runtime 0.6.63:** s'ha reconstruït el paquet clàssic `dist/hunter-runtime.b36d23de2366d773.js` incorporant el contingut **exacte** de `src/coop-world-runtime.js` (inclosa la interpolació visual de soldats, les cames i les optimitzacions de projectils). S'ha verificat el hash FNV64, la correspondència exacta del mòdul dins el paquet i la sintaxi de tot el script agrupat. No s'ha executat l'ordre completa `node tools/build-runtime.cjs --check` ni una prova de navegador amb GPU.

## Validació del jitter de moviment de la 0.6.63

Quan el navegador renderitza a ~240 FPS però la física només avança a 30 Hz, la posició local pot mostrar salts cada 33 ms. El canvi 0.6.63 calcula el següent pas de simulació en una còpia descartable i en dibuixa la fracció, mentre que els snapshots rebuts a 10 Hz no reinicien el rellotge local.

Dues regressions incorporades a `npm run test:coop:offline`:
- `tests/native-coop-local-presentation.mjs`: recepcions correctives constants a 10 Hz, 60/144/240 FPS, girs ±π, canvis de seient, teleports, pausa i conservació de la física.
- `tests/native-coop-subtick.mjs`: reproducció de càmera a 240 FPS amb física exacta a 30 Hz, a peu i amb cotxe, canvi de controls entre ticks i recepció d'un snapshot sense salt.

La regressió `tests/native-coop-prediction-cache.mjs` també comprova que `receive()` no elimina el temps de simulació fraccionari quan no canvia la modalitat de joc.

**Diagnòstic després del desplegament**: recopilar `window.HUNTER_COOP_NETWORK_STATS.localPrediction`, sobretot `corrections`, `smoothedCorrections`, `hardSnaps`, `maxCorrectionM`, `visualErrorM`, `subtickBuilds` i `subtickFrames`. Un nombre alt de `hardSnaps` indica salts reals o discrepàncies massa grans; si `subtickBuilds` s'acosta a `subtickFrames`, caldrà perfilar el cost de la previsualització amb joystick.

Les comprovacions pures d'aquests tres fitxers han passat en entorn JavaScript aïllat. **Encara no equivalen a les proves completes de Node 22 ni a una partida real amb dos dispositius.**

## Optimització de col·lisions 0.6.63

La prova local `npm run test:coop:offline` també executa:

- `tests/native-coop-vehicle-candidates.mjs`: equivalència exacta de candidats i ordre davant 2.125 consultes espacials, 374 vehicles i els 16 tipus de vehicle.
- `tests/native-coop-wall-candidates.mjs`: equivalència exacta amb el filtre de tots els murs, amb 2.725 consultes, 1.352 murs, parets gegants i coordenades negatives.
- `tests/native-coop-prediction-cache.mjs`: indexació un cop per snapshot de flota, reús en deltes sense canvis, invalidació en canviar geometria i absència de treball extra en passatgers o vianants.

S'han executat les proves pures de selecció espacial i la prova instrumentada del caché en un entorn JavaScript aïllat. La prova completa de predicció amb 16 vehicles dins el motor `tests/native-coop-prediction.cjs` encara necessita execució Node 22.

El paquet agrupat `dist/hunter-runtime.b36d23de2366d773.js` correspon a la versió 0.6.63; els índexs nous són mòduls carregats per `src/bootstrap.mjs` i `src/native-coop-prediction.mjs`, no part d'aquest paquet clàssic.

## Diagnòstic quan hi hagi dos navegadors

Copiar a cada participant el contingut de:

```javascript
console.log(JSON.stringify(window.HUNTER_COOP_NETWORK_STATS, null, 2));
```

Camps útils:
- `rttMs`, `rttJitterMs`, `avgStateGapMs`, `maxStateGapMs`: regularitat de xarxa.
- `stateFrames`, `stateBytes`, `fullStateFrames`, `deltaFrames`, `deltaProfile`: volum i seccions més grans.
- `clientFrame.samples`, `clientFrame.averageGapMs`, `maxGapMs`, `over33Ms`, `over50Ms`: irregularitat del render **al navegador**, no temps del servidor. Pauses i canvis de pestanya de més de 250 ms s'exclouen.
- `remoteInterpolation.activeEnemies`, `activeVehicles`, `activePlayers`, `interpolatedFrames`, `extrapolatedFrames`, `speedLimitedFrames`, `maxRenderErrorM`, `staleReceives`: suavització visual i correccions.

Provar a peu, en vehicle, conductor/passatge i desplaçament a prop de soldats. Un augment del trànsit o del p95 de fotogrames després d'una optimització exigeix reconsiderar-la; els benchmarks sintètics no substitueixen una prova real.

## Pendents que requereixen mesures o paritat

1. Confirmar el desplegament conjunt client + Worker de la 0.6.63.
2. Comparar fluïdesa, taxa d'extrapolació i volum amb dos jugadors.
3. Investigar seccions dominants de `deltaProfile.bySection` abans de canviar l'estructura dels paquets.
4. Decidir si pujar snapshots de ~10 Hz fins a ~20 Hz només quan la CPU del Worker, la persistència i la xarxa ho permetin.
5. Completar la paritat amb la IA, presoners, mecànic, patrulles i accions del joc individual.

No s'ha modificat la cadència de 30 ticks/s de simulació ni la física/autoritat dels projectils, inventaris, col·lisions i enemics en aquesta fase.
