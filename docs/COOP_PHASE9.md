# Cooperatiu · fase 9: coordenades i terrasses dels compounds (v0.6.16)

## Implementat

`src/compound-planning.mjs` calcula l’orientació, transformació de coordenades, reserva circular, entrades, patrulla, rutes, posicions d’edificis i àrea d’anivellament d’un disseny en un emplaçament donat. No crea malles, col·lisions, soldats ni vehicles. Les dades retornades són independents del disseny original.

El runtime individual reutilitza aquest càlcul abans de construir cada compound; `compoundTransform` delega també en la funció compartida. Es mantenen les regles originals de gir, els casos especials de costa/base/HQ i el consum de l’orientació aleatòria. El constructor de murs, edificis i altres elements encara és el mateix runtime.

`createCoopTerrain` incorpora la tria del primer disseny de base i la seva terrassa física. El snapshot parcial passa a versió 2 i inclou `basePlan`; el format de geometria continua en 2 i els desaments no canvien. La primera àrea d’anivellament ja modifica l’altura física i l’aigua del component de servidor.

## Límit de la continuació del generador

Construir la base consumeix nombres aleatoris abans de triar el disseny del quarter general. Aquesta fase no simula ni ignora aquest consum. El camp `randomState` continua sent l’estat posterior a la cerca inicial de terreny, tal com a la fase 8; **no és un cursor posterior a la construcció de la base**.

Per això el servidor només incorpora el primer pla de base. No es tria encara una variant d’HQ amb un estat incorrecte, no s’omplen col·leccions d’edificis amb descripcions que semblin col·lisions reals i no es presenta el pla com un món complet. Les regles generals de cerca de nous emplaçaments/camp/ports continuen pendents; aquesta fase transforma un emplaçament ja escollit.

## Validació

- Referència congelada del main v0.6.15 `ff5a17025a20c0b12f83ed03bd015b0f85ecca45`, anterior a l’extracció.
- 304 combinacions: els 38 dissenys, quatre orientacions i altura explícita/derivada. Es comparen dades de pla, terrassa, transformacions i estat aleatori, i es comprova que el disseny/emplaçament no es modifiquen.
- Comparació de la primera base i `terrainLevels[0]` amb el generador real fins al checkpoint «Base i quarter general», en escala 1 i 2. La prova s’atura en aquest checkpoint perquè és el tram que valida la fase, sense substituir-lo per una imitació del generador.
- El servidor genera el pla i la terrassa dins de workerd per a les dues escales, comparats amb Node; es mantenen les proves del terreny, onatge i dos actors.
- Regressions de món, nucli de dos actors, sales/WebSockets i desaments de món complet en escala 1, inclòs el paquet del navegador. Workerd local continua amb compatibilitat 2026-08-06 i producció amb 2026-10-19.
- Un intent addicional de generació **completa** d’escala 2, amb altres proves executant-se en paral·lel, ha esgotat el límit de 120 s de la crida VM del harness. No es declara superat ni s’atribueix a una causa demostrada. Cal diagnosticar-lo i mesurar el mapa gran; la validació del checkpoint inicial no substitueix aquesta prova completa.
- Les tres incidències històriques de proves/fixtures i les proves físiques ajornades continuen pendents.

## Què queda

1. Separar la construcció física de la base (edificis, murs, portes, escales i accessos), preservant el consum aleatori; continuar després amb HQ i la resta de compounds/camp/ports i anivellaments.
2. Vegetació, entitats i estat inicial complet; validar coherència amb la representació dels clients i amb el suport físic/visual.
3. Persistència/versionat del món, memòria cau, sessió de missió i tick de producció amb confirmació dels dos clients i límits de CPU/memòria.
4. Xarxa i representació dels dos actors, predicció/interpolació, reconnexió/pausa/amfitrió; vehicles, expulsions, ferri/plataformes, IA i geometria mutable.
5. Combat, inventari, objectius i final compartits; desaments/estadístiques cooperatius; diagnòstic de l’escala 2, més llavors, proves físiques/càrrega, quotes/retenció i recuperació excepcional d’administradors, més incidències històriques.

La base del servidor continua sent parcial (`complete:false`), sense endpoint de missió ni activació des d’una sala de producció. El manifest manté `playable:false`. No calen migracions SQL, secrets, recursos Cloudflare ni plugins nous.
