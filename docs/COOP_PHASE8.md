# Cooperatiu · fase 8: base del terreny canònic i onatge (v0.6.15)

## Implementat

`src/world-generation-core.mjs` extreu el PRNG, la disposició de les illes i els cims sense Three.js, DOM o jugador global. `genIslands` del joc individual ja reutilitza aquesta disposició i el seu generador aleatori. Es conserva el consum de nombres aleatoris, inclosa l’elecció de sector del quarter general en escala 2; la resta de la generació continua amb el mateix estat.

`generateTerrainFoundation({seed,mapScale})` implementa també la cerca inicial en un món encara buit: emplaçament candidat de base i quarter general, límits del mapa, pendent, fins a 2.000 intents per emplaçament i fins a vuit llavors derivades com abans. Retorna llavor demanada i efectiva, illes, candidats i estat del PRNG. Els candidats no són encara punts d’aparició de missió.

`src/canonical-water.mjs` proporciona el model immutable d’ones, la mateixa expressió GLSL i un proveïdor de superfície sobre un `heightAt` físic. El bootstrap el comparteix amb el shader/CPU del joc. `waves.js` conserva la fàbrica anterior com a compatibilitat per a pàgines de proves que carreguen scripts clàssics sense bootstrap; les proves en comproven la paritat.

`server/coop-terrain.mjs` construeix la base del terreny a partir de llavor/mida i hi connecta l’adaptador físic i l’aigua canònica. No rep una geometria enviada pel client. És un component del servidor provat en workerd, **encara no invocat per cap endpoint o sala de producció**. No s’ha afegit càrrega de CPU a cada petició de preparació.

## Límits que es mantenen explícits

La base indica `kind:'terrain-foundation'`, `complete:false` i `playable:false`. Falten terrasses i anivellaments dels compounds, edificis, murs, vegetació, accessos, molls, vehicles, objectes i objectius. Les col·leccions corresponents de l’adaptador d’aquesta base són buides. No s’ha canviat el generador de desaments `world:0.6.2`, ni es presenta aquesta base parcial com un món de missió complet.

L’aigua del servidor mostreja el model en el punt físic; l’aigua individual continua interpolant els triangles de la malla visual per mantenir-hi el personatge alineat. La futura representació cooperativa ha d’interpolar/compensar aquesta diferència sense alterar l’altura autoritativa. No s’ha fet passar el mostreig dependent de la qualitat gràfica per una regla canònica.

Node i workerd poden diferir lleugerament en funcions trigonomètriques. En les dues escales provades nativament, el màxim desplaçament d’una coordenada d’illa és aproximadament 1,47×10⁻⁹ m. Les proves exigeixen menys de 10⁻⁸ m per a les illes i menys de 10⁻⁷ m per a l’estat final dels actors. Això no garanteix igualtat binària del JSON ni un hash idèntic entre motors: cal persistir/distribuir l’estat que genera el servidor, no confiar en una regeneració independent del client.

## Validació

- Referència congelada del main v0.6.14 `54e87e19b52ec3d9b710262a9285b8b718cf823f`, amb generació i cerca originals, i referència física independent anterior.
- Dotze combinacions de llavor i escala: 0, 1, 67, 12345, 2147483648 i 4294967295, en escala 1 i 2. Es comparen illes, cims, emplaçaments, llavor efectiva, intents i estat aleatori; també els 100 nombres següents després de disposar les illes.
- 360 mostres d’onatge/profunditat/temps, expressió GLSL, reutilització del model en el runtime, compatibilitat clàssica, entrades invàlides i còpies independents.
- Generació pròpia dins de workerd natiu per a 67/1 i 67/2, seguida de dos actors amb aigua canònica durant 60 ticks; comparació amb Node. Ja no es tracta d’un Worker que només rep una geometria generada al navegador de prova.
- Regressions de món, sales/WebSockets, moviment vertical i desaments, inclòs el paquet del navegador. Workerd local conserva compatibilitat 2026-08-06; producció, 2026-10-19. No es declaren resoltes les tres incidències històriques de proves/fixtures. Les proves físiques de dos navegadors i Android continuen ajornades per l’usuari.

## Què queda

1. Completar la generació física dels compounds, anivellaments, accessos, vegetació i entitats; estat inicial de missió i coherència amb la representació dels clients.
2. Persistir i versionar el món canònic, amb generació/càrrega limitada i memòria cau; completar sessió de missió, confirmació de dos clients i tick de producció. Cal mesurar CPU/memòria i no regenerar el món a cada petició.
3. Ordres/snapshots i visualització dels dos actors, predicció/interpolació i reconciliació del suport visual respecte al físic; reconnexió/pausa/amfitrió.
4. Vehicles, expulsions, ferri/plataformes mòbils, IA, geometria mutable, combat, inventari, objectius i final compartits.
5. Desaments/estadístiques cooperatius; proves físiques, més llavors, càrrega/consum i quotes/retenció; recuperació excepcional d’administradors i incidències històriques. Les altres fases generals mantenen els seus pendents.

No calen migracions SQL, secrets, recursos Cloudflare ni plugins nous. El manifest de sala manté `playable:false`; el desplegament continua amb `npm run deploy:cloudflare`.
