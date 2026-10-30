# Validació del COOP sense GitHub Actions · 0.6.61

## Context

Per manca de quota d'Actions, `.github/workflows/coop-regression.yml` ha deixat de tenir el disparador automàtic `push`. Queda només `workflow_dispatch` (manual i optatiu). Els altres workflows del repositori també estan configurats com a manuals; no s'ha intentat executar-ne cap en aquesta fase.

Els commits de la 0.6.61 es poden crear i revisar a GitHub sense executar Actions. **Això no és un desplegament**: Cloudflare Pages i el Worker/Durable Object continuen necessitant publicació i comprovació de la versió. El client i el Worker han d'usar la mateixa versió perquè el `hello.gameVersion` és verificat pel servidor.

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

1. Confirmar el desplegament conjunt client + Worker de la 0.6.61.
2. Comparar fluïdesa, taxa d'extrapolació i volum amb dos jugadors.
3. Investigar seccions dominants de `deltaProfile.bySection` abans de canviar l'estructura dels paquets.
4. Decidir si pujar snapshots de ~10 Hz fins a ~20 Hz només quan la CPU del Worker, la persistència i la xarxa ho permetin.
5. Completar la paritat amb la IA, presoners, mecànic, patrulles i accions del joc individual.

No s'ha modificat la cadència de 30 ticks/s de simulació ni la física/autoritat dels projectils, inventaris, col·lisions i enemics en aquesta fase.
