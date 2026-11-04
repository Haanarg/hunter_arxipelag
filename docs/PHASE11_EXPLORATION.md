# Fase 11 — sabotatge, camp de presoners i mecànic

Primer prototip B + C introduït a v0.5.82, amb garantia de camp reforçada a v0.5.83 i camp redissenyat a v0.5.84. L’usuari ha triat aquestes dues oportunitats i ha concretat que el presoner mecànic sigui l’únic que pugui reparar vehicles. La proposta A i la nit/espera queden pendents.

## Com es juga

- **Ràdio:** apropa’t a un panell de comunicacions i usa **E / el botó d’acció** per sabotejar-lo discretament. També el pots destruir amb armament pesant o explosius. La llum i el marcador indiquen si continua operatiu.
- **Camp de presoners:** un complex amb una única entrada exterior, quatre torres a les cantonades, un barracó llarg de fusta com les cases de pescadors i una caseta de guàrdia. Quatre soldats patrullen i dos sentinelles custodien la porta d’un recinte interior de filferrada. Dins hi ha quatre camperols i un mecànic, drets o asseguts a terra, amb l’alçada adulta del jugador. Davant la porta interior, **E / el botó d’acció** allibera el grup i obre físicament la porta si no hi ha una amenaça immediata. [Disseny i proves](PRISON_CAMP_REDESIGN.md).
- **Camperols:** un cop alliberats, fugen per una ruta curta a través de la porta del camp. El rescat no exigeix acompanyar-los fins a la base ni acaba l’operació.
- **Mecànic:** va a la badia exterior de reparació, seguint la ruta per la porta interior i al voltant de la tanca. Apropa-hi un vehicle danyat i aturat, baixa’n i activa **Reparar**. La reparació dura sis segons, retorna la vida màxima i conserva la munició. No necessita materials ni inventari de fabricació.
- **Moure el mecànic:** a peu, prop seu i sense un vehicle que ocupi l’acció contextual, pots demanar-li **segueix-me / espera aquí**. Això permet acostar-lo a un vehicle o a la costa. Camina, respecta obstacles i no travessa el mar; cal guiar-lo al voltant d’un bloqueig. No és passatger dels vehicles en aquest prototip.
- **Mapa:** les oportunitats només es marquen després de descobrir-les amb proximitat i visió. **R** és ràdio, **P** presoners i **M** mecànic; el gris identifica un estat desactivat o perdut.

El botó d’acció i E resolen la mateixa acció. Rescat, sabotatge i reparació poden tenir prioritat sobre embarcar; una simple ordre de seguiment cedeix el pas a un vehicle proper perquè el jugador hi pugui pujar. Conduint, E continua servint per baixar.

## Conseqüències i límits del servei

Cada relé operatiu connecta el seu recinte de comunicacions amb el quarter general. Un soldat d’aquell recinte ha de tenir contacte visual confirmat per transmetre un avís. El receptor mobilitza les mateixes **dues unitats exteriors existents** de l’HQ; no apareixen reforços nous.

Si la incursió és lluny, els guàrdies es desplacen a posicions defensives separades vora l’entrada del seu HQ. Si el report és local, investiguen aquella posició. No intenten travessar el mar, no coneixen la posició posterior del jugador ocult i han de veure’l per disparar. Les reserves d’avís duren 30 segons i la IA conserva el temps necessari per arribar al destí i tornar a patrullar. El relé té un cooldown de 18 segons.

Sabotejar o destruir el relé talla els avisos nous. Els guàrdies que ja havien rebut informació la conserven. La vista, l’oïda, els crits d’alerta locals i els sorolls d’una explosió continuen funcionant. Les quatre variants de comunicacions tenen panell, inclosa la que només té una parabòlica al terrat.

El mecànic és únic i ha d’estar viu i alliberat. Només atén vehicles pilotables, existents, danyats i aturats que siguin físicament propers. El radi s’ajusta a la mida del vehicle, amb màxim de 32 m; no és un servei a tot el mapa. Els helicòpters han d’estar aterrats. Els vaixells s’han d’acostar a un mecànic situat a terra, prop de la costa.

Moviment del vehicle, dany nou al vehicle o al mecànic, combat proper, distància excessiva, incapacitat del jugador o pausa interrompen la reparació. No hi ha cura parcial, reparació automàtica, recuperació de munició ni reconstrucció d’un vehicle destruït. Els civils poden rebre bales perdudes, explosions i atropellaments. Si el mecànic mor, es perd el servei durant aquella operació; això no bloqueja eliminar el general.

Totes dues activitats continuen sent opcionals. No s’han afegit claus, fabricació, diàlegs llargs ni una cadena de preparació obligatòria. Els estats duren dins de l’operació actual; desar i restaurar partides entre sessions continua pendent de la fase 5.

## Implementació

- `src/prison-camp-layout.mjs`: especificació del complex de 130 × 130 m, entrada exterior de 24 m, barracó, caseta, quatre torres, quatre patrullers, dos sentinelles, recinte de captius amb porta, rutes d’evacuació i badia de reparació.
- `src/world-generation.js`: camp obligatori reservat després de base/HQ i abans dels altres recintes. Cerca seca determinista, terrassa si cal i illa de reserva com a últim recurs. Plataforma i sortides protegides. Abans d’entrar a jugar es valida un camp amb quatre camperols i un mecànic; el món no es declara preparat si falten. [Garantia i proves](PRISON_CAMP_GUARANTEE.md).
- `src/prisoners.js`: estat i models procedurals de cinc civils a escala del jugador, postures dretes/assegudes, obertura de la porta interior, evacuació, seguiment, reparació, dany i neteja. No entren a la llista d’enemics ni a l’autoapuntat.
- `src/radio-relay.js`: panells amb col·lisions i dany reals, descoberta, sabotatge, missatges coneguts i resposta limitada d’unitats existents.
- `src/game-core.js`, `src/combat.js`, `src/enemy-ai.js`, `src/minimap.js` i `src/ui.js`: controls contextuals, dany amb cobertura, avisos i presentació.

Els NPC i panells tenen culling visual a 400 m, ampliat amb la mira. La simulació opcional comparteix el rellotge del joc: pausa/focus/fi de partida la detenen; nedar o caure només impedeixen interaccions, sense congelar evacuacions ni el temps de ràdio. Reiniciar o cancel·lar la generació elimina estats, col·lidors i recursos propis.

## Verificació reproduïble

- `npm run test:camp` i `npm run test:camp:stress`: garantia estructural i 2.048 prefixos reals de generació.
- `npm run test:exploration`: estat dels presoners/reparació, ràdio, revisió independent d’integració i generació del camp.
- `node tests/phase11-camp-generation.cjs --presence`: sis llavors addicionals en el camí real de cerca de complexos.
- `npm run test:loading`: paritat entre generació síncrona i progressiva del món actual, continuació RNG, recuperació, cancel·lació, focus i bootstrap.
- `HUNTER_TEST_BUNDLE=1` repeteix les suites que usen el harness sobre el paquet real de producció.

La matriu principal és 67/12345 × escales 1/2, amb un camp en cada cas. Les llavors 0, 1, 42, 999, 2026 i 4294967295 també tenen un camp a escala 1 en la cerca lògica. El cas físic 67/1 valida la porta, la badia per al camió real de 6,525 × 14,1375 m, les quatre vies d’evacuació i el trajecte del mecànic amb les col·lisions del joc.

La comparació històrica exacta de la fase 10 amb v0.5.79 té ara un abast diferent: el món incorpora legítimament un complex, guàrdies i col·lidors. Els fingerprints originals es conserven sense actualitzar-los. `PHASE10_LEGACY_BASELINE=1` conserva el mode de comprovació d’aquella base; per al món actual es compara un món síncron net amb el progressiu i les recuperacions equivalents.

El harness usa Three.js amb renderer simulat. Cal revisar jugant la llegibilitat visual, la navegació del mecànic, els controls tàctils i el rendiment en Android físic. Els resultats de publicació i les suites històriques es poden consultar a l'historial Git de `PROGRESS.MD`; les comprovacions vigents són a [to-do.MD](../to-do.MD).
