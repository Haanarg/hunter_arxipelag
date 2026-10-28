# Cooperatiu · fase 6: caigudes i contacte amb l’aigua (v0.6.13)

## Implementat

`src/player-vertical.mjs` extreu les regles de caiguda lliure, gravetat, inèrcia i control del paracaigudes, límit de descens, inclinació i límits horitzontals. El pas retorna dades noves i no modifica els arguments. També concentra el dany d’impacte (terra/aigua), el llindar de natació i l’altura de suport, amb l’excepció dels interiors i el soterrani del búnquer.

El runtime individual ja utilitza aquestes funcions a través de `HUNTER_PLAYER_SIMULATION`; les equacions i l’ordre dels efectes es conserven. El càlcul dels candidats d’aterratge, l’estat de l’inventari/paracaigudes, els efectes visuals i la notificació del dany continuen sent responsabilitat del runtime. No s’ha afegit un salt nou ni s’ha canviat l’equilibri del joc.

La detecció de teulades travessades durant un descens també és compartida. `createStaticWorldAdapter().roofLanding(from,to)` l’exposa sobre les dades físiques sense Three.js. Les coordenades i els passos invàlids es rebutgen; el recorregut de teulades té un límit de treball. La geometria continua en format 2 i els desaments no canvien.

## Validació

- Referència independent congelada del main `46d019e52b4c42f9790c45938c3266cedfd9499e`, anterior a l’extracció.
- 6.480 passos comparats de trajectòries a 30, 60 i 120 Hz, amb/sense paracaigudes, rumbs diferents, entrada variable i límits del mapa. No es promet igualtat entre freqüències: es comprova paritat amb el comportament anterior a cadascuna.
- Dany segons altura i velocitat, protecció del paracaigudes, impacte aquàtic, llindar de natació i totes les combinacions d’interior/soterrani/vehicle/vol/caiguda. Descens de teulades sense aterrar abans que els peus hi arribin.
- 120 passos a través de l’`update` real del joc, tant amb scripts font com amb el paquet del navegador, davant de la referència anterior.
- 80 recorreguts de teulades del món real 67/1 comparats amb referències anteriors; execució de les trajectòries i l’adaptador en workerd natiu. L’entorn local utilitza compatibilitat 2026-08-06, mentre que producció conserva 2026-10-19.
- Regressions de món, nucli de dos actors, sales, WebSockets i desaments, incloent exportació/importació del paquet del navegador. Les dues fallades històriques generals no es declaren resoltes. No s’han fet proves físiques de WebGL/Android o dos navegadors, ajornades per l’usuari.
- La prova addicional `player-locomotion.cjs` s’atura amb `knifeEquipped is not defined` en el seu context aïllat de `characters.js`. Els tres mòduls que carrega i la prova són idèntics als de main abans d’aquesta fase; aquest problema del fixture queda pendent. `water-jumps.cjs` passa. La integració vertical nova es valida amb el context complet del joc.

## Què queda

1. Connectar aquest estat vertical al tick autoritatiu de dos actors i les seves transicions/ordres. El nucli cooperatiu encara només resol moviment horitzontal amb suport estàtic; aquesta fase no l’ha convertit en una missió jugable.
2. Aigua i onatge canònics al servidor, natació completa i transicions, expulsions per explosions, ferri/plataformes mòbils, vehicles i IA dinàmics; actualització de geometria per destrucció/portes.
3. Generació/càrrega canònica del món, sessió de missió persistent, confirmació de compatibilitat dels dos clients i separació del suport visual del LOD. Cap client pot imposar la geometria ni un aterratge com a autoritat.
4. Ordres/snapshots de joc, predicció/interpolació, combat, inventari, objectius i final compartits.
5. Reconnexió de missió, pausa/amfitrió, desaments/estadístiques cooperatius; més llavors i escala 2, proves físiques/càrrega/consum, quotes/retenció, recuperació excepcional d’administradors i les dues fallades històriques.

`playable:false` es manté. No calen migracions SQL, secrets, recursos Cloudflare ni plugins nous. Es conserva `npm run deploy:cloudflare`.
