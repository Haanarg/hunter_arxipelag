# Cooperatiu · fase 7: estat vertical al tick de dos actors (v0.6.14)

## Implementat

`createPlayerSimulation` incorpora un mode vertical explícit. Requereix un adaptador físic amb `locomotionAt`, `resolveBody` i `roofLanding`, més una funció `vertical.surfaceAt(x,z,time)` proporcionada per codi de confiança. No hi ha un nivell del mar predeterminat que es pugui confondre amb l’onatge canònic del joc. Sense aquesta opció, el comportament anterior del nucli es conserva.

Cada actor manté altura, estat de caiguda/paracaigudes, natació i vida. El tick fix integra gravetat i inèrcia, detecta aterratges, aplica dany una sola vegada i passa entre suport terrestre i aquàtic. La velocitat de moviment es deriva de l’estat físic. El timeout anul·la les intencions però la gravetat continua; un actor mort deixa de controlar el moviment i pot acabar la trajectòria física.

Sortir d’un replà activa una caiguda pel forat de l’escala o quan el suport baixa més de 0,75 m. Aquest últim és un criteri nou del nucli cooperatiu, no un canvi de la locomoció individual. El paracaigudes només es pot incloure en un estat inicial creat pel servidor; encara no hi ha ordres d’expulsió, inventari o desplegament durant la missió.

`locomotionAt` afegeix a l’adaptador estàtic la classificació de sòl, interior, soterrani i caiguda per escala. Conserva la distinció entre el búnquer i els altres interiors; el soterrani ampliat no es converteix en una piscina. La geometria continua en format 2; es preserva també la marca d’escala destruïda. No es modifiquen els desaments.

## Autoritat i consistència

Les entrades continuen sent `forward`, `turn`, `strafe` i `run`. No s’accepten altura, vida, paracaigudes o estat de caiguda com a intencions del client. Les dades inicials i les còpies de snapshots no poden modificar l’estat intern per referència. Els snapshots del mode vertical afegeixen `swimming` i `fall`; no s’han habilitat al WebSocket de sala.

Es calculen i validen els dos actors abans de confirmar cap canvi de posició, vida, caiguda o seqüència reconeguda. Una superfície invàlida per al segon actor no deixa el primer aterrat o ferit. Els proveïdors de món/aigua han de ser deterministes i de lectura: aquesta garantia no desfà efectes externs d’un callback ni és una transacció del futur estat dinàmic del món. El temps de l’aigua deriva del tick, no del rellotge del client.

## Validació

- Casos de dos actors amb velocitats de terra/natació/crol, desnivell sense teletransport, aterratge que travessa tot el gruix d’una teulada, paracaigudes, impacte aquàtic, dany únic i soterrani.
- Intencions falsificades, còpies d’estat, timeout, mort durant el descens, dades inicials invàlides i tick atòmic quan falla el món.
- 500 punts de locomoció en el mapa real 67/1 davant d’una referència congelada de v0.6.13, més els 961 punts de terreny, 551 de superfícies i 80 recorreguts de teulades anteriors. La referència de locomoció utilitza suport físic: exclou el LOD visual i el ferri mòbil del runtime individual.
- Dos actors baixen 40 m, un amb paracaigudes, durant 420 ticks del mateix món real en Node i workerd natiu; es comparen estat final, vida i altura. Prova nativa addicional de natació/crol amb 60 seqüències de cada actor. El mar constant d’aquestes proves és una dada sintètica, no un generador canònic.
- Regressions del nucli anterior, sales/WebSockets, física vertical individual i desaments, també amb el paquet del navegador. Workerd local continua amb compatibilitat 2026-08-06 i producció amb 2026-10-19. Les proves físiques de dos navegadors/Android segueixen ajornades; les tres incidències de fixtures/proves generals documentades a les fases anteriors continuen pendents.

## Què queda

1. Generació/càrrega canònica del món i de l’aigua/onatge al servidor; decidir i validar el criteri de suport físic davant del LOD visual en més llavors i escala 2.
2. Sessió de missió persistent amb confirmació dels dos clients, tick de producció, estats inicials autoritzats i límits de consum. El nucli d’aquesta fase encara s’executa com a component i en proves, no en una missió activa.
3. Ordres/snapshots de joc al canal, representació dels dos jugadors, predicció/interpolació i reconnexió; política de pausa i amfitrió.
4. Vehicles, expulsions, plataformes/ferri, IA i geometria mutable; combat, inventari, objectius i final compartits.
5. Desaments i estadístiques cooperatius; proves físiques, càrrega i quotes/retenció, recuperació excepcional d’administradors i incidències històriques. Les altres fases generals mantenen els seus pendents.

La sala continua en preparació i el manifest manté `playable:false`. No cal cap migració SQL, secret, recurs Cloudflare o plugin nou. Es desplega amb `npm run deploy:cloudflare`.
