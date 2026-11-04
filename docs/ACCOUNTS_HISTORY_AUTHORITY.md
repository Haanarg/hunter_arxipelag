> **Document de referència/historial.** El registre de treball pendent i el pla d'optimització vigents són únicament a [to-do.MD](../to-do.MD); les anotacions «pendent» d'aquest document reflecteixen l'estat de la versió de què parla, no necessàriament la del codi actual.

# Comptes, historial i base per al cooperatiu · v0.6.7

## Decisions

Sense correu, sense Supabase i sense nous plugins de ChatGPT. Better Auth és una dependència del Worker que gestiona contrasenyes i sessions; no és un servei extern. D1 guarda usuaris, sessions, permisos, metadades i estadístiques. R2 privat guarda els JSON de les partides: una partida pot superar el límit de fila de D1.

Registre amb nom d'usuari i contrasenya (10–128 caràcters). El servidor crea sempre un compte pendent, independentment de les dades enviades pel client. L'usuari pot iniciar sessió, però només pot sincronitzar partides i historial després d'aprovació manual. L'administrador pot aprovar o suspendre comptes. Els noms interns `@hunter.invalid` no són adreces de contacte i no s'envia cap missatge.

La recuperació es fa amb vuit codis aleatoris d'un sol ús, generats després de confirmar la contrasenya actual. Es mostren una vegada i es poden descarregar. D1 només en conserva el hash. Generar una tanda nova invalida l'anterior. Recuperar la contrasenya consumeix el codi i anul·la totes les sessions, sense canviar l'aprovació del compte. Si es perden alhora la contrasenya i tots els codis, un administrador pot emetre un codi temporal després de verificar personalment el titular i confirmar la seva pròpia contrasenya. El codi dura 30 minuts, es mostra una vegada, només se’n desa el hash i substitueix qualsevol codi temporal anterior. En utilitzar-lo s’anul·len totes les sessions i els codis personals anteriors. No aprova ni reactiva el compte. No s’emet per a administradors ni comptes suspesos. Si se suspèn l’administrador emissor, el seu codi temporal deixa de ser vàlid. Canviar la contrasenya o generar codis personals nous també anul·la un codi temporal pendent. Les emissions i els usos es registren sense guardar el codi. La comprovació del titular es fa fora del joc; el programari no pot demostrar-la. L'aprovació valida l'accés al joc, no una identitat real ni una adreça de correu.

## Activació a Cloudflare

La configuració base publica el Worker i els assets, però manté els comptes desactivats fins que existeixin els bindings, les variables, la migració 0004 i accés al bucket. Els orígens de producció han de ser HTTPS i no poden incloure rutes o una barra final; HTTP només es permet en localhost. No s'han creat recursos ni secrets de producció des d'aquesta sessió. No s'ha activat cap servei de correu.

1. Crear D1 i un bucket R2 privat amb les eines del compte Cloudflare (`wrangler d1 create hunter-accounts` i `wrangler r2 bucket create hunter-saves`). Comprovar les condicions i disponibilitat del compte abans d'activar recursos.
2. Afegir a `wrangler.jsonc` els bindings reals: `d1_databases` amb `binding: "DB"`, el nom i `database_id` retornats, i `migrations_dir: "server/migrations"`; `r2_buckets` amb `binding: "SAVES"` i el nom real del bucket. No publicar R2 amb URL pública.
3. Afegir `vars.AUTH_ORIGIN` amb l'origen HTTPS exacte de producció, sense barra final. Crear `AUTH_SECRET` amb `wrangler secret put AUTH_SECRET`, utilitzant almenys 32 caràcters aleatoris. No posar el secret al repositori.
4. Aplicar les migracions: `wrangler d1 migrations apply hunter-accounts --remote`. Fer còpia de seguretat abans de canvis futurs d'esquema.
5. Desplegar el Worker. Registrar el compte de l'administrador. Des de la consola SQL de D1, aprovar-lo explícitament amb `UPDATE hunter_access SET status='approved', role='admin' WHERE owner=(SELECT id FROM user WHERE name='NOM_EXACTE');`. Verificar el nom abans d'executar. El registre web mai atorga aquest rol.
6. Iniciar sessió, generar i guardar codis de recuperació, registrar un segon compte i comprovar aprovació, sincronització i recuperació. Fer servir D1, R2, origen i secret separats per a previews; no connectar previews no revisades a les dades de producció.

`previews: {}` es conserva perquè el CI existent usa `wrangler preview`. Els recursos de producció no es comparteixen automàticament amb previews. Si la configuració o l'esquema no estan preparats, cal corregir-los abans d'anunciar els comptes com a disponibles.

## Partides i estadístiques

Els desaments locals continuen funcionant sense compte. La primera pujada és explícita. Les revisions impedeixen sobreescriure silenciosament una versió modificada en un altre dispositiu. Una baixada crea una còpia local nova. Els conflictes requereixen descarregar o crear una còpia separada. El servidor comprova sessió, propietari i aprovació; no confia en l'identificador enviat pel navegador. R2 conserva el JSON actual i l'anterior amb claus immutables. Una interrupció entre la pujada R2 i l’escriptura D1 pot deixar un objecte orfe. La neteja diària conserva les claus actuals i anteriors referenciades per D1 i només elimina objectes del prefix `saves/` sense referència i amb més de 24 hores. Les claus són immutables: cap càrrega nova reutilitza una clau antiga. Cada execució revisa fins a 400 objectes en dues pàgines, guarda el cursor i continua l’endemà; un lloguer temporal evita execucions simultànies. Si falla una pàgina, es pot repetir sense avançar-la. No s’aplica cap caducitat a una partida vàlida.

L'historial local és independent dels desaments i inclou llavors, temps, resultat i comptadors. Importar o reprendre conserva l'identificador de la partida; fusionar utilitza màxims acumulats per evitar duplicar totals. Són estadístiques d'un joc local, no puntuacions certificades contra trampes. L'historial es sincronitza només amb comptes aprovats.

## Base cooperativa i límits

Cinc accions del jugador (tir, vehicles, inventari, C4 i accions opcionals) passen per una autoritat local amb validació, identificador d'actor, context de partida i deduplicació. Cada càrrega canvia el context per rebutjar ordres antigues. El format de desament ja separa participants i món.

Això no implementa encara multijugador ni una simulació de servidor completa. Queden moviment, dany, IA i altres globals per separar, protocol de xarxa, servidor autoritatiu, sales, permisos, reconnexió i missions cooperatives.

## Validació i feina pendent

Proves de D1/R2 amb Miniflare: aïllament, aprovació/suspensió, codis hashats, recuperació i revocació de sessions, revisions concurrents, fitxer de més de 2 MB i historial sense duplicats. També es prova el Worker empaquetat dins de workerd. El runtime local disponible arriba a la data de compatibilitat 2026-08-06; producció conserva 2026-10-19. No equival a un desplegament real ni a proves de navegador físic.

Pendents: activar i validar recursos reals de Cloudflare; passada WebGL/Android i mapes grans; transferència real entre dispositius; recuperació excepcional d’administradors via accés del propietari a Cloudflare; límits de quota, retenció de partides/historial i mesura de cost/CPU; completar autoritat i cooperatiu. La resta de les catorze fases es manté a `PROGRESS.MD`.

## Tanda v0.6.7: manteniment i recuperació assistida

- Migració `0004_maintenance_recovery.sql`: codis temporals, registre d’auditoria, cursor/lloguer del manteniment, índexs de les claus R2 i marcador d’esquema. Aplicar-la abans d’activar els comptes.
- `triggers.crons` programa el manteniment cada dia a les 04:17 UTC. Sense configuració funcional no fa cap canvi. El registre d’auditoria es conserva 90 dies, els codis temporals caducats 7 dies i els comptadors d’intents 1 dia. El manteniment no envia correus.
- `/api/capabilities` comprova configuració, versió d’esquema i accés R2. Retorna només un motiu genèric si falta alguna cosa; cap identificador o secret. La configuració incompleta manté el desament local disponible.
- Proves noves amb D1/R2 natius: verificació i contrasenya de l’administrador, restriccions de destinatari, caducitat/substitució/reutilització del codi, revocació de sessions i codis personals, auditoria, emissor suspès, protecció de versions actual/antiga, període de gràcia, cursor, concurrència i represa després d’error. El Worker empaquetat també prova la recuperació assistida dins de workerd.

L’administrador ha de conservar els seus propis codis personals. Si tots els administradors perden l’accés, la recuperació requereix el propietari del compte Cloudflare i un procediment fora del joc; no hi ha cap porta de recuperació pública. L’activació real, les proves en dispositius i el desenvolupament cooperatiu continuen pendents.

## Recursos reals preparats per l’usuari

`wrangler.jsonc` incorpora D1 `hunter-accounts`, identificador `f4879e20-1085-4a51-b132-96cfad61cb90`, amb binding `DB` i directori de migracions, i R2 privat `hunter-saves` amb binding `SAVES`. No cal tornar a crear aquests recursos. Primer cal desplegar aquesta configuració amb el servidor: Cloudflare no permet aquests bindings si la versió activa només té assets estàtics. Després cal aplicar les migracions i configurar l’origen/secret reals. No s’ha escrit cap valor fictici per activar comptes.

## Alternativa al tauler bloquejat per assets estàtics

El domini executa el servidor però el tauler pot impedir afegir secrets amb el missatge que el Worker només té assets. S’ha preparat `npm run deploy:cloudflare` per usar el secret `AUTH_SECRET` ja desat a Settings > Build > Variables y secretos: crea un fitxer temporal fora dels assets amb permisos 0600 i executa Wrangler amb `deploy --secrets-file`, que adjunta el secret al Worker en execució. El fitxer s’elimina en acabar, també si falla Wrangler. El valor no s’escriu al repositori ni als arguments de la comanda.

A Cloudflare, canviar **Settings > Build > Deploy command** a `npm run deploy:cloudflare`, desar i executar un build nou de main. Mantenir la comanda de previews separada. El secret de compilació continua sent la font utilitzada en els desplegaments de producció futurs: si es rota, actualitzar aquest secret, perquè tornar a desplegar amb el valor antic anul·laria la rotació. No publicar-lo al xat. Sense un secret vàlid, la comanda s’atura sense desplegar.

Aquesta alternativa no explica la discrepància del tauler; evita dependre’n. La transferència real necessita l’execució del build amb el secret del compte de l’usuari.
