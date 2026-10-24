# Contracte de viabilitat de missió

Primera base de regressió per a missions fiables. El contracte valida els requisits previstos de la missió, no una necessitat lògica absoluta: també es pot trobar l’HQ explorant sense mapa. `tools/mission-viability.cjs` és una eina **fora del runtime**: no entra al bundle, no s’executa en començar una partida i no canvia generació, llavor, terreny, botí ni portes. `ok: true` significa que passen els prerequisits i les comprovacions indicades; **no demostra que es pugui completar tota la missió**.

## Què comprova

| Comprovació | Evidència |
| --- | --- |
| Identitat de llavor | La llavor efectiva coincideix amb la sol·licitada. |
| Base i objectiu | Base existent, inici amb suport lliure i general viu registrat al soterrani de l’HQ. |
| Porta del búnquer | Registre físic i registre de portes actiu, amplada i mecanisme d’obertura vàlids. |
| Accés local al general | Cerca acotada amb estat d’altura, `groundAt` real i el radi/cap del jugador de `wallPush`; retorna un recorregut testimoni. |
| Base–costa | Extrems units a base i embarcador; mostreig cada ≤40 cm del corredor central, amb suport real, parets i discontinuïtats d’altura. |
| Intel HQ | Almenys un mapa de l’HQ en una ubicació permesa i amb suport; la ubicació física preval sobre etiquetes de botí errònies. |
| Intel opcional | Mapes d’helicòpters i tancs absents o no aprofitables: avís de cobertura. |
| Transport | Almenys una embarcació neutral en aigua o un helicòpter sobre terra. |
| Cobertura | Absència de complexos opcionals com el port militar: avís, no bloqueig de missió. |

La cerca local usa una quadrícula de 80 cm i un límit de 14.000 nodes; les arestes es mostregen cada ≤40 cm. Un límit exhaurit es distingeix d’una cerca sense recorregut. Les portes que poden obrir-se es modelen segons els seus registres; la matriu **reprodueix després el recorregut amb `updateDoors`, `wallPush` i `groundAt` reals**. Espera l’obertura normal de la porta blindada i de les portes interiors, sense escriure les banderes `open`/`locked` ni retirar obstacles.

Un corredor costaner absent genera un avís explícit: no es dedueix ni es prova una alternativa. Un corredor declarat però desconnectat o obstruït és un error. La manca d’un port militar no força cap construcció nova ni altera una llavor.

## Execució local i manual

```sh
npm run test:mission
# 8 casos: llavors 67, 12345, 2026, 91284 × escales 1 i 2.

MISSION_SEEDS=67,2026 MISSION_SCALES=1 node tests/mission-viability.cjs
# Cas complet amb mobiliari i terreny visual, encara sense WebGL:
MISSION_FULL=1 MISSION_SEEDS=67 MISSION_SCALES=1 node tests/mission-viability.cjs
```

`MISSION_SEEDS` admet entre 1 i 16 valors; `MISSION_SCALES` només 1 i 2. La matriu completa el build lògic amb la categoria `vehicle`: les categories de cerca `compound` i `item` tornen abans d’acabar el món. Cada línia JSON inclou llavor, escala, mode, temps, comprovacions, avisos/errors i resultat del recorregut reproduït. GitHub Actions continua sent exclusivament manual; el grup `mission` executa aquestes proves i `bunker-basement`.

`captureMissionData(game)` extreu les dades del harness existent. `validateMission(data)` retorna un informe sense consumir aleatorietat ni modificar el jugador o les portes. `validateMission(data, {geometry:false})` omet la geometria i declara `geometricAccess: 'not-run'`; no atribueix suport verificat als mapes.

`tests/mission-viability-validator.cjs` injecta fallades sobre un món real: HQ malformat, general no registrat, llavor substituïda, mapes absents o tots dins un hangar prohibit, intel opcional absent com a avís, paret al corredor, extrems desconnectats, porta blindada o interior necessària sense registre/mecanisme, escala sense suport, objectiu segellat i embarcació situada a terra. L’existència dels objectes no pot fer passar aquests casos.

## Límits i següent pas

- No prova la connexió entre illes, l’accés des de la base a cada mapa, l’embarcament ni una via marítima de sortida navegable. La comprovació de transport és només de superfície al centre del vehicle.
- El corredor costaner valida el pas central amb el radi del jugador; no certifica tota l’amplada de la carretera, el pendent rodat ni la conducció d’un vehicle.
- El mode ràpid omet mobiliari del soterrani, vegetació i terreny visual final. El cas complet inclou mobiliari i superfícies de terreny generades pel harness. El recorregut comprova parets i suport, però no col·lisions d’arbres ni de vehicles, percepció visual, navegació real en navegador o Android.
- El generador manté el reintent històric amb una altra llavor efectiva si falla l’emplaçament inicial de base/HQ. No s’ha activat en aquesta matriu; el diagnòstic el detecta amb `seed.changed`. Aquesta entrega no introdueix cap recuperació nova ni modifica aquest comportament.
- La cerca d’accés ignora unitats mòbils i no prova supervivència, munició suficient després del combat, trets al general o la seqüència de victòria. Cal ampliar itineraris i llavors abans d’una afirmació general de missions completables.

La primera matriu també exposa la manca de port militar a `12345`, escala `1`; hi ha altres embarcadors, terminals i transport. És un dèficit de cobertura conegut, no un bloqueig demostrat, i aquesta entrega no modifica la generació per amagar-lo.

## Validació d’aquesta entrega

- Matriu repetida amb el codi final: 8/8 combinacions (`67`, `12345`, `2026`, `91284` × escales `1` i `2`), inclosa la reproducció normal de portes fins al general.
- Cas complet `67/1`, amb mobiliari i el codi final del validador: superat.
- Proves de fallades injectades, `bunker-basement`, `ferry-land-patrols` i comprovació del bundle: superades.
- La prova existent `compound-generation` falla a `12345/1` en les expectatives de port, llanxa de coets i sostres de cabanes. El runtime és el mateix del commit `076cda2`; aquestes discrepàncies no s’han corregit ni s’ha retirat la prova.
- `seed-replay` no s’ha tornat a executar en aquesta entrega. No s’ha fet validació WebGL o Android.
