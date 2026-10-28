# Cooperatiu · fase 3: canal de sala en temps real (v0.6.10)

## Resultat

La sala manté un WebSocket per participant i envia automàticament els canvis de membres i preparació. El navegador es reconnecta després d’una interrupció i recupera l’estat actual de D1; ignora esdeveniments de connexions substituïdes i revisions antigues. Es manté la consulta HTTP periòdica quan el canal no està disponible. Amb el WebSocket obert no es fan les consultes HTTP de cada cinc segons.

Aquesta és la coordinació de la sala, **no la simulació del món en xarxa**. No s’accepten posicions, ordres de combat ni estat del client pel canal. El nucli de simulació compartit de la fase 2 continua pendent de l’adaptador del món real i del bucle de missió autoritatiu. El manifest continua indicant `playable:false` i no s’ofereix iniciar una missió conjunta.

## Arquitectura i accés

- `server/coop-hub.mjs`: Durable Object `CoopRoomHub` amb un objecte per ID de sala. D1 continua sent la font dels membres, permisos i configuració; no hi ha una segona còpia independent de la sala.
- `GET /api/coop/socket?room=<id>`: el Worker comprova la sessió, aprovació, origen, pertinença i límit d’intents abans de contactar l’objecte. El navegador utilitza la cookie de sessió del mateix origen; no posa credencials a l’URL. Les capçaleres internes d’identitat es construeixen des de la sessió verificada i no es reutilitzen les rebudes del client.
- En cada actualització o heartbeat, l’objecte torna a comprovar la sessió, aprovació, pertinença i caducitat contra D1. La suspensió, recuperació de contrasenya o tancament de sessió impedeixen rebre més estat quan es torna a comprovar l’accés. Un client normal envia heartbeat cada 20 segons. No s’envia informació nova a una sessió revocada.
- Una connexió nova substitueix l’anterior del mateix actor. El client substituït no intenta reprendre el WebSocket, evitant un bucle entre dues pestanyes. Un tercer usuari no pot ocupar una tercera connexió de participant.
- Límit de 10 intents de connexió per minut/IP i 20 missatges per minut/connexió. Només s’accepta un heartbeat de protocol 1 amb format i mida limitats. Un missatge arbitrari, binari, massa gran o excessiu tanca el canal.
- API d’hibernació `acceptWebSocket` i attachments per recuperar identitat/context després d’una reconstrucció. No hi ha timers ni alarmes dins de l’objecte que el mantinguin despert. La correcció funcional s’ha provat amb l’API real; no s’ha forçat una expulsió real de producció per afirmar-ne una prova de cicle complet d’hibernació.

## Client i cicle de vida

`src/coop-connection.mjs` gestiona connexió, heartbeat, detecció de falta de resposta i reconnexió amb esperes d’1 a 15 segons. Els missatges de sockets antics no poden sobreescriure la vista nova. Es cancel·len timers en tancar el panell o quan deixa d’estar actiu; el control de visibilitat del panell tanca també la connexió en ocultar la pestanya. Reobrir-la recupera la plaça persistent de la sala. La desconnexió marca manca de presència recent, sense eliminar la plaça.

Els canvis via API es notifiquen després de confirmar-se a D1. Si falla una notificació, la següent actualització/heartbeat recupera l’estat de la mateixa font. Les revisions protegeixen la preparació de missatges antics; no es concedeixen permisos a través del WebSocket.

## Desplegament

`wrangler.jsonc` afegeix el binding `COOP_ROOMS` i la migració de Durable Objects `coop-room-hub-v1` amb `new_sqlite_classes: ["CoopRoomHub"]`. Wrangler la provisiona amb el desplegament habitual. No cal una nova migració D1 posterior a la 0005, copiar secrets ni crear namespaces manualment. Es conserva `npm run deploy:cloudflare` i el secret existent. `/api/capabilities` exposa `coopRealtime` per comprovar la presència del binding sense mostrar-ne l’ID ni dades privades.

Cloudflare admet Durable Objects SQLite al pla Free, amb els seus límits; no s’ha sol·licitat cap canvi de pla. Referències oficials: [WebSockets i hibernació](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [permisos](https://developers.cloudflare.com/workers/authorization/durable-objects/), [límits i preus](https://developers.cloudflare.com/workers/platform/pricing/). Cal mesurar el consum real quan es provi amb usuaris.

## Validació

`npm run test:realtime` prova el client amb rellotge/sockets controlats i el Worker empaquetat amb **WebSockets reals, Durable Object SQLite, D1 i sessions reals** dins de Miniflare/workerd. Dos comptes creats només a la base de proves: privacitat/origen, capçaleres falsificades, notificació d’entrada i preparació, heartbeat, substitució i reconnexió, compte suspès, sessió revocada, missatges invàlids, límit de missatges i tancament de sala. Proves de comptes, desaments, sala i preparació de les fases anteriors superades. El runtime local té compatibilitat 2026-08-06; producció conserva 2026-10-19.

No es declaren fetes les proves amb dos navegadors/Android ni de missió real; l’usuari les ha ajornat. Les dues fallades històriques de simulation-timing/smoke documentades a la fase 2 continuen pendents.

## Què queda després d’aquesta fase

1. Adaptador del món real: col·lisions, alçada/aigua, gravetat, vehicles i IA fora dels globals locals.
2. Sessió de missió autoritativa amb tick, autenticació d’ordres, estat inicial, compatibilitat dels dos clients, snapshots, predicció/interpolació i recuperació després d’una caiguda.
3. Integració del protocol de joc al canal: moviment, combat, inventari, objectius i final compartits; política de pausa, absència d’amfitrió i reconnexió a la missió.
4. Desaments i estadístiques cooperatius, proves físiques/càrrega, cost i quotes/retenció. La resta del pla general segueix a PROGRESS.MD.
