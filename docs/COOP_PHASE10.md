# Cooperatiu · fase 10: estructures físiques dels edificis de la base (v0.6.17)

## Implementat

`src/building-shell.mjs` separa les instruccions de construcció de murs, obertures, particions i pisos superiors de les malles visuals. `mkB` les reutilitza, conservant les peces destructibles, els grups de porta/flancs/llinda, els punts de suport de la coberta i les tirades aleatòries. També es comparteixen les dades d’escala exterior i la posició de la rampa interior.

El constructor individual continua creant les malles, associacions de propietari, portes i efectes. No s’ha modificat la diferència anterior entre la porta del mode de cerca de llavors i la porta del mode normal: el mode normal limita l’altura i pot afegir una llinda. La generació del servidor es compara amb **el mode normal**, que és el que juga l’usuari.

`server/coop-base-buildings.mjs` crea els cossos físics dels edificis de les quatre variants de base: murs, portes inicialment tancades, llindes, escales exteriors, rampa interior i planta superior quan correspon. No crea representacions gràfiques. La base del servidor ja incorpora aquestes col·lisions i superfícies al seu adaptador.

El snapshot parcial de `createCoopTerrain` passa a versió 3 i incorpora `baseStructures`: dades d’edificis, murs/portes i escales amb identificadors estables dins del món, separades de les dades normalitzades de col·lisió. Les còpies retornades no poden modificar l’estat intern. El format de geometria continua en 2; no canvien els desaments.

## Límits

Això completa les estructures dels edificis de la primera base, no el conjunt de la base: falten perímetres, portes de tanca, altres objectes sòlids, vehicles, persones i inventari. No s’ha avançat el cursor aleatori com si tota la construcció de base s’hagués executat. Cal acabar aquesta seqüència abans de continuar amb la tria/generació d’HQ i la resta de compounds.

Les portes del servidor tenen dades i col·lisió estàtiques; encara no hi ha una ordre autenticada d’obrir-les, animació compartida ni destrucció/reconstrucció de geometria durant una missió. La prova de porta oberta reconstrueix l’adaptador amb l’estat modificat: no es presenta com una interacció de producció.

El constructor específic de base rebutja tipus especials no previstos (búnquer, hangar, taller i fusta) en lloc de generar-los parcialment en silenci. El constructor individual manté aquests tipus i les proves de paritat els cobreixen. Calen constructors físics específics quan s’avanci cap a altres compounds.

## Validació

- Referència congelada del constructor del main v0.6.16 `b0c587f69d62e395cb526129f3339cf8ed1ee6ad`, amb substituts només de les malles visuals.
- 180 casos del constructor real, normal i de cerca, davant del constructor anterior: dimensions, portes, pisos, particions, parets sòlides, taller/hangar/búnquer/fusta, vida, suport estructural, seqüència aleatòria i agrupacions de destrucció. En el mode normal també es comparen les col·lisions generades sense renderitzador.
- Cinc checkpoints del generador real: les quatre variants de base en escala 1 i un cas en escala 2. Comparació íntegra de murs, escales i edificis normalitzats, inclosa la infermeria de dos pisos. Comprovació de porta tancada/oberta, unicitat d’identificadors i còpies independents.
- Generació nativa workerd de les dues escales amb comparació d’identificadors, coordenades i estats de murs/portes/escales; es mantenen les comprovacions de dos actors sobre el món generat.
- Regressions del món, planificació de compounds, nucli de dos actors, sales/WebSockets i desaments, també amb el paquet del navegador. Workerd local conserva compatibilitat 2026-08-06; producció, 2026-10-19.
- La generació completa d’escala 2 no es declara validada: continua pendent el diagnòstic del límit VM de 120 s registrat a la fase 9. No s’han fet les proves físiques ajornades; les tres incidències històriques de proves/fixtures continuen pendents.

## Què queda

1. Completar perímetres/portes de tanca, objectes sòlids i altres passos de la base, preservant el consum aleatori; després HQ/búnquer, hangars i altres compounds/camp/ports.
2. Vegetació, entitats i estat inicial complet; interaccions de portes/destrucció i geometria mutable, amb permisos autoritatius.
3. Persistència/versionat del món, memòria cau i sessió/tick de missió de producció amb confirmació dels dos clients i límits de CPU/memòria.
4. Xarxa i representació dels jugadors, predicció/interpolació i suport físic/visual, reconnexió/pausa/amfitrió; vehicles, expulsions, ferri/plataformes i IA.
5. Combat/inventari/objectius/final compartits; desaments/estadístiques cooperatius, diagnòstic d’escala 2, més llavors, proves físiques/càrrega/consum, quotes/retenció, recuperació excepcional d’administradors i incidències històriques. Les altres fases generals mantenen els pendents.

El component continua sent parcial (`complete:false`), sense iniciar missions des d’una sala de producció. El manifest manté `playable:false`. No calen migracions SQL, secrets, recursos Cloudflare ni plugins nous.
