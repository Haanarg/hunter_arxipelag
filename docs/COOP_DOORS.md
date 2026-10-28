# Portes compartides · v0.6.20

La missió Relleu d’emergència permet obrir i tancar les portes dels edificis amb **F** o el botó **Porta**. El botó s’activa quan hi ha una porta operable a prop i mostra Obrir/Tancar segons el darrer estat del servidor. Mantenir F no provoca alternances repetides. E / Activar continua reservat als terminals.

## Autoritat i física

Les portes provenen de la geometria generada pel servidor, amb identificador i índex de col·lisió. La comanda només conté context de missió, identificador de porta, estat desitjat i identificador de comanda. No accepta coordenades o identitat d’actor del client. Es torna a validar la sessió abans de processar l’acció.

Una ordre nova requereix actor viu i sense caiguda, missió activa, distància màxima de 4,5 m i diferència d’altura màxima de 2 m respecte al peu de la porta. Un jugador de la planta superior no pot accionar una porta del pis inferior només perquè coincideixi en planta.

El tancament es rebutja si el cos de qualsevol dels dos actors ocupa l’obertura, amb marge de seguretat. Després d’un canvi s’esperen 18 ticks abans d’una altra alternança del mateix actor (aproximadament 0,6 s al ritme objectiu). Es manté també el límit de missatges de control de sala de 20 per minut i connexió, compartit amb heartbeat/inici.

El servidor reconstrueix l’adaptador de col·lisió amb l’estat nou. La simulació consulta l’adaptador actual, de manera que els dos actors poden travessar una porta oberta i queden bloquejats quan es tanca. Es conserven la llinda, parets, escales i la resta de superfícies.

## Persistència i protocol

El generador de missió passa a `relay:2`. El checkpoint afegeix estats de portes, revisió, cooldowns i els últims 32 resultats de comanda. Repetir un identificador dins d’aquest historial retorna el resultat anterior sense canviar de nou la porta; la mateixa garantia es manté després de restaurar la sessió. L’estat desitjat explícit també evita el problema d’una ordre de toggle repetida.

Primer es desa el checkpoint i després s’envien els snapshots compartits i la resposta de l’acció. Si falla el desament, es reconstrueixen física i estat des del darrer checkpoint i el client rep un error recuperable. La geometria canònica inicial es conserva separada; en un reinici s’hi apliquen els estats de portes persistits.

El client espera la confirmació i representa el darrer estat rebut en 3D o Canvas. No anticipa l’obertura en la física local. En reconnectar rep geometria i portes actuals; els missatges d’una altra connexió o missió no substitueixen l’estat vigent. Hi ha un timeout de confirmació perquè el botó no quedi bloquejat si la connexió falla.

S’ha afegit revalidació explícita del cache HTTP de la pàgina cooperativa i del CSS per mantenir els controls HTML sincronitzats amb els mòduls versionats.

## Proves

- Nucli: proximitat i altura, tercer actor rebutjat, obertura i pas real, tancament compartit, obertura ocupada, cooldown, pausa, historial acotat i restauració idempotent.
- Transport: una fallada de persistència no publica l’obertura; el reintent funciona; el reinici aplica l’estat guardat a la col·lisió; coordenades afegides a la comanda provoquen rebuig del protocol.
- Client/UI: comanda explícita, bloqueig mentre està pendent, F sense repeticions per mantenir premut, botó tàctil, missatge de pas ocupat i visibilitat de la porta en una escena Three.js real amb renderer substitut.
- Workerd natiu amb dos comptes locals: ordre remota rebutjada; obertura visible a l’altre client; tancament ocupat rebutjat; tancament segur i bloqueig físic de l’actor dins; reobertura i sortida; terminals/extracció/victòria; reinici del runtime amb obertura i revisió recuperades; reintent idempotent i revocació d’accés.
- Regressions de comptes, món, preparació de sala i desaments individuals, inclòs el paquet del navegador. Els fitxers del fusell d’assalt de main v0.6.19 es conserven.

No s’ha fet una passada física de dos dispositius o GPU real; no es declara resolt el diagnòstic del mapa complet d’escala 2 ni les tres incidències històriques. Les portes canvien de visibilitat immediatament, sense animació de fulla. Destrucció, combat, inventari, IA, vehicles, campanya completa i desaments cooperatius duradors continuen pendents segons [PROGRESS.MD](../PROGRESS.MD).

No cal cap migració SQL, secret, recurs Cloudflare o plugin nou. Es manté el desplegament existent. Els checkpoints pilot continuen temporals i no es migren entre versions; no canvien els desaments individuals.
