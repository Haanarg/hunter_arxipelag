# Cooperatiu · fase 1: sales privades (v0.6.8)

Implementació d’una sala privada per a dos comptes aprovats: crear sala, entrar amb codi d’invitació, compartir llavor numèrica de 32 bits, mida i dificultat, veure participants i marcar preparació. Hi ha accés des de la portada i des de Compte / núvol. No existeix encara un botó per iniciar una missió compartida; la interfície ho indica explícitament. El joc individual i els seus desaments continuen independents.

## Activació

1. Aplicar `server/migrations/0005_coop_lobby.sql` a la mateixa D1 `hunter-accounts`, després de les quatre migracions existents. No repetir les anteriors. En desplegaments amb CLI: `wrangler d1 migrations apply hunter-accounts --remote`. Si les anteriors es van executar manualment al tauler, aplicar només aquest fitxer al tauler per evitar que Wrangler intenti repetir-les.
2. Desplegar la branca/versió amb el Worker i els assets nous. Es conserva `npm run deploy:cloudflare` i el secret existent. No cal cap binding ni servei nou. L’esquema de comptes continua a versió 4; la sala té un marcador propi, per no desactivar els comptes si falta la migració cooperativa.
3. Entrar amb dos comptes aprovats diferents. Crear sala amb el primer, compartir el codi privat i entrar amb el segon. Marcar preparació i comprovar que tots dos veuen la mateixa llavor i estat. Una finestra d’incògnit ha d’utilitzar un altre compte, perquè un compte només ocupa una plaça.

## Contracte i persistència

- API privada `/api/coop/rooms`, `/join`, `/current`, `/ready`, `/leave`: sessió vàlida, aprovació i capçalera de propietari comprovades al servidor. Les mutacions també passen la comprovació d’origen existent. No hi ha llistat públic de sales ni consulta per ID per a tercers.
- Invitació aleatòria de 80 bits, no derivada de l’usuari o la llavor. Només es mostra als membres. La sala té una caducitat fixa de 24 hores; les sales caducades es netegen en consultar l’API cooperativa. Els codis es guarden a D1 per poder-los recuperar després de recarregar, no als desaments del joc.
- D1 imposa una plaça per usuari i dues posicions úniques per sala; la creació és una transacció. Dues entrades simultànies no poden crear una tercera plaça. Sortir com a amfitrió elimina la sala i les dues places; sortir com a convidat reinicia la preparació de qui queda. Es pot tancar i tornar a crear una sala si el convidat abandona el navegador sense sortir.
- Revisions del servidor protegeixen el canvi de preparació de peticions antigues. La llavor, mida i dificultat són immutables durant aquesta primera fase: cal crear una altra sala per canviar-les.
- Actualització cada cinc segons mentre el panell és obert i la pestanya visible; no és xarxa en temps real de la simulació. Més de 45 segons sense consulta marca el participant sense connexió recent i impedeix `allReady`. Tancar el panell conserva la plaça; reobrir recupera la sala. La preparació efectiva també exigeix que el compte continuï aprovat. No hi ha inici automàtic ni el client pot iniciar una missió cooperativa a través d’aquest API.

## Validació

`npm run test:coop`: Worker amb sessions reals de Better Auth i D1/R2 natius de Miniflare. Aprovat/pendent/suspès, propietari fals, tercer usuari, concurrència per l’última plaça, transacció revertida quan l’usuari ja ocupa sala, revisions antigues, preparació, desconnexió, sortida, tancament i caducitat. El Worker empaquetat també prova crear/entrar a una sala amb workerd. Es comproven regressions de comptes i desaments individuals. La data de compatibilitat del runtime local continua sent 2026-08-06, no la de producció. La interfície encara necessita una passada manual en dos navegadors i Android; no s’ha provat una sala real de producció des d’aquesta sessió.

## Què queda després d’aquesta fase

1. Aplicar la migració i validar dos comptes/navegadors reals; revisar llegibilitat i accessibilitat en Android. Mesurar el cost del polling segons ús real.
2. Separar moviment, dany, IA, rellotge i estat de simulació dels globals locals; contracte de protocol i compatibilitat de versions.
3. Transport en temps real i autoritat de servidor; sessió de missió, generació/estat inicial compartit, interpolació, permisos i validació d’ordres.
4. Combat, vehicles, inventari, presoners/objectius i victòria/derrota compartits; reconnexió, absència de l’amfitrió i política de pausa.
5. Desaments cooperatius, recuperació de missió, estadístiques per participant i regressions multijugador.

No s’ha afegit cap plugin, servei de correu ni recurs Cloudflare nou. Les quotes/retenció dels comptes i les altres fases del pla general continuen pendents segons `PROGRESS.MD`.
