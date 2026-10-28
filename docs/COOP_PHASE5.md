# Cooperatiu · fase 5: superfícies transitables (v0.6.12)

## Implementat

`src/walk-surfaces.mjs` concentra la resposta d’altura d’escales per graons i rampes, molls, plantes superiors girades, teulades rectangulars/corbades, sòl i accés al soterrani del búnquer i la projecció de la passarel·la del terminal. Les funcions no depenen de Three.js ni del jugador global.

El joc individual ja utilitza aquestes regles. `groundAt` conserva el suport visual del LOD i els càlculs dinàmics existents del ferri. Les comprovacions d’altura anterior continuen impedint teletransportar un actor des de la planta baixa al pis, del carrer a una teulada o de l’aigua al moll. La resposta del búnquer conserva la prioritat sobre el terreny exterior.

L’adaptador estàtic de les fases anteriors incorpora `groundAt`, índex de candidats d’edificis i dades de les superfícies. Els actors poden reutilitzar aquestes altures sense crear malles. La captura de la passarel·la del terminal només inclou l’estat disponible en el moment de capturar-la; no simula el moviment del ferri.

## Format de geometria

La geometria sota demanda passa a format 2: afegeix escales, molls, edificis/teulades/plantes, búnquer i estats disponibles de les rampes de terminal. S’eliminen referències a objectes gràfics i cicles d’owner. Es validen quantitats, coordenades, dimensions i paràmetres necessaris.

Es continua llegint el format 1 amb el seu significat de terreny i col·lisions bàsiques, sense inventar-hi superfícies noves. La normalització retorna format 2 amb col·leccions buides en aquest cas. Això **no canvia el format dels desaments de partides** ni exigeix migrar-los. No hi ha cap nou endpoint per acceptar un món enviat per un client com a autoritat.

## Validació

- Referència congelada de les funcions del main anterior a `tests/fixtures/walk-surfaces-v062.cjs`. Les comprovacions de paritat no criden el mòdul extret per calcular el resultat esperat.
- Casos de graons, rampes, molls, plantes girades, soterrani, teulades, passarel·la i suport visual local, amb diverses altures anteriors. Inclou la impossibilitat de pujar a un pis/moll només per ser-ne a prop, i rampes internes deshabilitades per destrucció.
- Món generat real 67/1: 551 punts de superfícies, a més dels 961 punts de terreny i les mostres de col·lisions de la fase 4. Es comproven dades normalitzades davant de les funcions anteriors i la compatibilitat del format 1.
- Dos actors i la geometria real executats en Node i workerd natiu; ronda JSON i límits de validació/índexs. El Worker de prova no és un servidor de missió de producció.
- Regressions de desaments amb el paquet del navegador, comptes, recuperació, sales i WebSockets. Les dues fallades històriques de les proves generals documentades a la fase 2 continuen pendents. No s’han repetit proves físiques amb dos navegadors o Android, ajornades per l’usuari.

## Límits i següents passos

Aquestes són superfícies estàtiques de suport, no un motor de gravetat. L’adaptador encara pot canviar d’altura sense una trajectòria física de caiguda; no s’ha connectat a una missió jugable. Les actualitzacions de destrucció, portes, escales o plataformes requereixen actualitzar la còpia de geometria.

Cal completar:

1. Aigua/natació, caigudes/paracaigudes i trajectòries verticals; plataformes mòbils/ferri i vehicles.
2. Estat dinàmic i IA compartits, amb actualització de col·lisions i permisos d’interacció.
3. Generació/càrrega canònica al servidor, sessió de missió persistent i confirmació de compatibilitat dels dos clients. Cal separar també el suport purament visual del LOD de l’estat físic autoritatiu.
4. Ordres de joc i snapshots pel canal, predicció/interpolació, combat, inventari, objectius i final compartits.
5. Reconnexió de missió, política de pausa/amfitrió i desaments/estadístiques cooperatius; més llavors, escala 2, dispositius i càrrega; quotes/retenció i les dues fallades històriques.

El manifest continua indicant `playable:false`. No calen migracions SQL, secrets, recursos Cloudflare o plugins nous. Es manté el desplegament existent.
