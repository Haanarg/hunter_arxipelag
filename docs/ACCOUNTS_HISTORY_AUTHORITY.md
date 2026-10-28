# Comptes, historial i base per al cooperatiu · v0.6.6

## Decisions

Sense correu, sense Supabase i sense nous plugins de ChatGPT. Better Auth és una dependència del Worker que gestiona contrasenyes i sessions; no és un servei extern. D1 guarda usuaris, sessions, permisos, metadades i estadístiques. R2 privat guarda els JSON de les partides: una partida pot superar el límit de fila de D1.

Registre amb nom d'usuari i contrasenya (10–128 caràcters). El servidor crea sempre un compte pendent, independentment de les dades enviades pel client. L'usuari pot iniciar sessió, però només pot sincronitzar partides i historial després d'aprovació manual. L'administrador pot aprovar o suspendre comptes. Els noms interns `@hunter.invalid` no són adreces de contacte i no s'envia cap missatge.

La recuperació es fa amb vuit codis aleatoris d'un sol ús, generats després de confirmar la contrasenya actual. Es mostren una vegada i es poden descarregar. D1 només en conserva el hash. Generar una tanda nova invalida l'anterior. Recuperar la contrasenya consumeix el codi i anul·la totes les sessions, sense canviar l'aprovació del compte. Si es perden alhora la contrasenya i tots els codis, no hi ha recuperació automàtica: caldrà un procediment assistit de l'administrador, encara pendent. L'aprovació valida l'accés al joc, no una identitat real ni una adreça de correu.

## Activació a Cloudflare

La configuració base publica el Worker i els assets, però manté els comptes desactivats fins que existeixin els bindings i les variables. No s'han creat recursos ni secrets de producció des d'aquesta sessió. No s'ha activat cap servei de correu.

1. Crear D1 i un bucket R2 privat amb les eines del compte Cloudflare (`wrangler d1 create hunter-accounts` i `wrangler r2 bucket create hunter-saves`). Comprovar les condicions i disponibilitat del compte abans d'activar recursos.
2. Afegir a `wrangler.jsonc` els bindings reals: `d1_databases` amb `binding: "DB"`, el nom i `database_id` retornats, i `migrations_dir: "server/migrations"`; `r2_buckets` amb `binding: "SAVES"` i el nom real del bucket. No publicar R2 amb URL pública.
3. Afegir `vars.AUTH_ORIGIN` amb l'origen HTTPS exacte de producció, sense barra final. Crear `AUTH_SECRET` amb `wrangler secret put AUTH_SECRET`, utilitzant almenys 32 caràcters aleatoris. No posar el secret al repositori.
4. Aplicar les migracions: `wrangler d1 migrations apply hunter-accounts --remote`. Fer còpia de seguretat abans de canvis futurs d'esquema.
5. Desplegar el Worker. Registrar el compte de l'administrador. Des de la consola SQL de D1, aprovar-lo explícitament amb `UPDATE hunter_access SET status='approved', role='admin' WHERE owner=(SELECT id FROM user WHERE name='NOM_EXACTE');`. Verificar el nom abans d'executar. El registre web mai atorga aquest rol.
6. Iniciar sessió, generar i guardar codis de recuperació, registrar un segon compte i comprovar aprovació, sincronització i recuperació. Fer servir D1, R2, origen i secret separats per a previews; no connectar previews no revisades a les dades de producció.

`previews: {}` es conserva perquè el CI existent usa `wrangler preview`. Els recursos de producció no es comparteixen automàticament amb previews. Si la configuració o l'esquema no estan preparats, cal corregir-los abans d'anunciar els comptes com a disponibles.

## Partides i estadístiques

Els desaments locals continuen funcionant sense compte. La primera pujada és explícita. Les revisions impedeixen sobreescriure silenciosament una versió modificada en un altre dispositiu. Una baixada crea una còpia local nova. Els conflictes requereixen descarregar o crear una còpia separada. El servidor comprova sessió, propietari i aprovació; no confia en l'identificador enviat pel navegador. R2 conserva el JSON actual i l'anterior amb claus immutables. Una interrupció entre la pujada R2 i l'escriptura D1 pot deixar un objecte orfe: la neteja periòdica queda pendent.

L'historial local és independent dels desaments i inclou llavors, temps, resultat i comptadors. Importar o reprendre conserva l'identificador de la partida; fusionar utilitza màxims acumulats per evitar duplicar totals. Són estadístiques d'un joc local, no puntuacions certificades contra trampes. L'historial es sincronitza només amb comptes aprovats.

## Base cooperativa i límits

Cinc accions del jugador (tir, vehicles, inventari, C4 i accions opcionals) passen per una autoritat local amb validació, identificador d'actor, context de partida i deduplicació. Cada càrrega canvia el context per rebutjar ordres antigues. El format de desament ja separa participants i món.

Això no implementa encara multijugador ni una simulació de servidor completa. Queden moviment, dany, IA i altres globals per separar, protocol de xarxa, servidor autoritatiu, sales, permisos, reconnexió i missions cooperatives.

## Validació i feina pendent

Proves de D1/R2 amb Miniflare: aïllament, aprovació/suspensió, codis hashats, recuperació i revocació de sessions, revisions concurrents, fitxer de més de 2 MB i historial sense duplicats. També es prova el Worker empaquetat dins de workerd. El runtime local disponible arriba a la data de compatibilitat 2026-08-06; producció conserva 2026-10-19. No equival a un desplegament real ni a proves de navegador físic.

Pendents: activar i validar recursos reals de Cloudflare; passada WebGL/Android i mapes grans; transferència real entre dispositius; recuperació assistida si es perden tots els codis; neteja d'objectes orfes, retenció i quotes; completar autoritat i cooperatiu. La resta de les catorze fases es manté a `PROGRESS.MD`.
