# Fase 3 — ritme de simulació, v0.5.77

## Contracte temporal

El bucle anterior avançava una sola vegada amb `min(50 ms, temps del fotograma)`: a 10 FPS, el món només avançava mig segon per segon real. Ara els fotogrames lents es divideixen en passos de fins a **1/60 s**, inclosa la resta final. A 10 FPS això són sis passos; a 120 FPS es conserva un pas de 1/120 s. És un esquema **semi-fix**, no una simulació de pas fix ni una promesa de resultats idèntics bit a bit.

Cada rellotge accepta com a màxim **250 ms i quinze passos per fotograma**. L’excés es descarta i es comptabilitza; no queda cap cua per recuperar-lo més endavant. Això limita el treball després d’un bloqueig llarg. Per sota d’aquest pressupost es recupera el temps del fotograma; el límit no pot garantir temps real durant una sobrecàrrega sostinguda que l’excedeixi.

Joc i cinemàtiques tenen rellotges separats amb el mateix límit. Només avança la cinemàtica present a l’inici del fotograma: una mort o victòria nova no consumeix el temps pendent del combat. Els passos s’aturen quan canvia l’estat. Inici, generació, reinici, pausa, represa, focus i visibilitat reinicien la referència temporal per evitar recuperar temps passat als menús o construint el món.

La cadència sostinguda del jugador conserva només l’excés de l’últim subpas quan travessa el cooldown. El temps inactiu no permet acumular una ràfega. No canvien els intervals escrits de les armes, el dany ni la dificultat. La cadència enemiga es conserva: la quantització residual observada és uniforme entre les taxes provades.

## Treball i diagnòstic per fotograma

Renderitzat, streaming del terreny, millora progressiva de l’aigua i mostreig de rendiment s’executen una vegada per fotograma. La IA manté el pressupost de dues cerques i 160 nodes de navegació per fotograma, compartit pels subpassos. Les matrius i animacions necessàries per a la física continuen amb la simulació; no s’interpolen malles que després serveixen per calcular col·lisions o l’origen dels trets.

`window.HUNTER_SIMULATION_STATS.gameplay` i `.cinematic` exposen comptadors independents:

- `rawSeconds`, `acceptedSeconds` i `simulatedSeconds`: temps comptabilitzat, acceptat i enviat als subpassos.
- `droppedSeconds`: temps descartat, inclosa la part interrompuda per un canvi d’estat.
- `interruptedSeconds`: part acceptada però interrompuda; ja està inclosa a `droppedSeconds`.
- `idleSeconds`, `invalidFrames` i `last`: temps inactiu, entrades temporals invàlides i resum de l’últim fotograma.

Les mètriques de renderitzat continuen rebent el temps real del fotograma, sense substituir-lo pel temps truncat de la simulació. No es canvia la qualitat gràfica ni es promet un augment d’FPS.

## Comprovacions

```sh
npm run test:timing
HUNTER_TEST_BUNDLE=1 npm run test:timing
npm run test:camera
node tools/build-runtime.cjs --check
```

`simulation-clock` comprova límits, comptabilitat, resta final, cancel·lació, reinici i entrades invàlides. `simulation-timing` prova funcions i esdeveniments del joc amb fotogrames regulars i irregulars. El grup `timing` del workflow manual inclou també la regressió de càmera de la fase 2. Cap workflow s’activa automàticament.

## Resultats de la revisió

La prova unitària del rellotge i la bateria de comportament han passat; aquesta última també passa sobre el bundle de producció. La revisió independent supera els mateixos deu escenaris contra fonts i bundle, amb resultats coincidents.

| Comprovació | Resultat mesurat |
| --- | --- |
| Desplaçament a peu | 36 m en 3 s a 10, 20, 30, 60 i 120 FPS, amb fotogrames irregulars i retards de 100/250 ms. |
| Pistola sostinguda | 46 trets en 10 s als set perfils temporals; revisió independent: 91 trets en 20 s a 10/30/60/120 FPS. |
| Cotxe, embarcació i helicòpter | Desviació màxima de 0,867 m i 0,0128 rad en 4 s respecte de la referència; no és igualtat exacta de trajectòries. |
| Temporitzadors i col·lisions | Granades, càrregues, porta de 10 s, expiració de projectils i parets fines: superats. C4 independent: expiració entre 3,000 i 3,0167 s. |
| Retard de cinc segons | Quinze passos, 0,25 s simulats i 4,75 s descartats, sense cua residual. |
| Canvis d’estat | Pausa, focus, visibilitat, reinici amb 30 s de generació simulada i traspàs a mort/victòria: superats. |
| Treball per fotograma | Renderitzat, terreny i millores progressives: una crida; navegació: pressupost compartit de dues cerques/160 nodes. |

També passen les regressions de càmera (16 perfils), cinemàtica de mort, temporitzador de bomba, dany enter, locomoció amb explosions i navegació enemiga. La prova de mort substitueix una expectativa literal del bucle antic per una comprovació temporal sobre el bucle real. Integritat del bundle i política de memòria cau: superades.

El bundle passa de 577.284 a 580.939 bytes sense compressió HTTP: +3.655 bytes, aproximadament un 0,6%.

## Límits

La integració a 120 FPS usa passos més petits que a 60 FPS; les trajectòries es comparen amb toleràncies físiques, no per igualtat exacta. El pressupost de navegació per fotograma pot limitar la rapidesa amb què la IA obté noves rutes a FPS baixos.

El filtre existent de WebAudio pot agrupar sons del mateix tipus durant una recuperació de temps. Les comprovacions de cadència són de projectils i regles del joc, no una certificació del so en temps real.

El harness construeix geometria Three.js i simula el renderitzador. No s’ha mesurat rendiment en GPU, navegador WebGL ni Android físic; a l’entorn de revisió falta l’executable de Chromium. Les fallades antigues de proves aïllades documentades a les fases anteriors es conserven quan no afecten aquest canvi.
