# Fase 5 — operacions desades i preparació del cooperatiu

Actualitzat: 2026-10-28. Implementació preparada a la branca `codex/phase5-operation-storage`, versió **0.6.5**, PR #8. Encara no s’ha integrat a `main` ni desplegat al joc públic.

## Fase A — desament local manual: implementat, validació visual pendent

- Portada: **Continuar / operacions desades**. La càrrega diferida del motor també funciona des d’aquest botó.
- Pausa: **Desar / operacions**. Permet posar nom, desar, desar com a operació nova i desar i sortir. L’eliminació i la substitució d’una partida en curs tenen confirmació dins del menú.
- IndexedDB conserva diverses operacions, cada una amb la revisió actual i una còpia anterior. L’escriptura és transaccional i només es confirma en completar-la; les revisions eviten sobreescriptures des de pestanyes amb dades antigues.
- En carregar es reconstrueix el món, es comprova la identitat del generador i de les entitats, s’aplica l’estat i es reprèn **en pausa**. La càrrega d’una còpia anterior no sobreescriu el desament actual fins a un desament explícit posterior.
- Es conserva posició/orientació, vida, inventari, munició, arma, disfressa, postura, vehicle ocupat i els indicadors de trucs del jugador.
- Es conserven temps de simulació, dificultat, baixes, mapes descoberts, indicis d’HQ, sectors investigats, marques i diari.
- Vehicles: posició, vida, destrucció, velocitat, altura de vol, inundació i referències de càrrega sobre ferris. Enemics: baixes persistents, posició, vida, estat de percepció i dades de ruta/tàctica.
- Món: objectes recollits, parets/filferrades destruïdes, sostres i escales ensorrats, portes, palmeres talades i fauna. Els IDs es fixen abans de començar a jugar, de manera que les eliminacions no canvien la identitat dels elements restants.
- Ràdio: descoberta, sabotatge, avisos i defensors mobilitzats. Presoners/mecànic: salut, alliberament, recorregut, postura i seguiment. C4 plantat: posició, caiguda i temps restant; el temps fora del joc no avança.

### Límits deliberats

Aquest adaptador continua sent d’un sol jugador. El format separa món compartit i participants, amb IDs de compte opcionals i seients explícits; encara no hi ha xarxa, comptes ni servidor autoritatiu.

El generador queda identificat com `world:0.6.2`, perquè aquesta entrega no altera la generació. La compatibilitat es comprova amb aquesta versió, l’adaptador i una empremta de les entitats inicials. No s’ha implementat migració de mons entre generadors diferents.

No es desen projectils, partícules, fragments ni posicions exactes dels cadàvers. Les baixes i la destrucció sí que persisteixen. No es permet desar durant una caiguda/ejecció del jugador o amb una granada encara llançada o pendent; el menú demana acabar aquesta transició. Sí que es permet desar navegant i pilotant en vol. Les operacions acabades per mort o victòria no es desen com una partida activa en aquesta entrega.

Es conserva l’estat de `R`, el generador del món. Les decisions futures que utilitzen `Math.random` poden variar; no s’afirma una reproducció determinista exacta de la simulació.

Els desaments pertanyen a l’origen, navegador i dispositiu actuals. Esborrar les dades del navegador els elimina. Hi ha autosave i exportació/importació de fitxers; encara no hi ha sincronització al núvol.

## Validació efectuada

- Repositori: múltiples operacions, reobertura, còpia anterior, dues connexions competint per revisió, eliminació amb revisió antiga, identitat immutable, formats incompatibles, seients/referències invàlids, dades no finites/circulars, indisponibilitat i fallada de quota sense perdre revisions.
- Integració amb món real generat, llavor 67 / mida petita, executada també sobre el **bundle final**: desament amb canvis, lectura des d’IndexedDB simulat i càrrega pel camí progressiu de producció. Recuperats inventari, vida, baixes, recollides, parets, sostres, palmeres, intel, ràdio, civils, helicòpter en vol, càrrega sobre ferri, inundació i C4 amb temporitzador. Comprovats desar com a nova, desar i sortir i rebuig d’empremta incompatible.
- Build i comprovació del paquet, sintaxi, rellotge, menú de pausa, temporitzador de bomba i regressió de ràdio superats. Les proves són **manuals** i no bloquegen el build.
- La prova històrica `phase11-prisoners.cjs` falla per una ruta de mecànic que espera els punts 33/36 i 33/16; el disseny actual passa per 40/30 i 40/16. El mateix error s’ha reproduït amb `src/prisoners.js` intacte de la base de la branca. No s’han alterat aquestes expectatives per obtenir una passada.
- La prova de navegador no s’ha pogut executar: no hi ha Chromium instal·lat i la descàrrega del navegador retorna un arxiu invàlid. **Aspecte visual, IndexedDB natiu, partida completa i Android físic continuen pendents.** El harness usa models i lògica reals amb DOM/GPU i IndexedDB simulats; això no certifica ergonomia ni rendiment físic.

Comandes: `npm run test:saves`; `HUNTER_TEST_BUNDLE=1 node tests/operation-runtime.cjs`; `npm run build`; `npm run check:build`.

## Què queda segons el pla acordat

| Entrega | Estat | Què queda |
|---|---|---|
| A. Desament local manual i diverses operacions | Implementada en branca | Revisió visual i funcional en navegador i Android, ampliar llavors/mida gran i desplegament |
| B. Autosave i recuperació | Implementada en branca | Validació en navegador i Android físic; després d’un tancament forçat es recupera la darrera transacció completada |
| C. Exportar/importar | Implementada en branca | Validació del selector/descàrrega natius, transferència real entre dispositius i navegadors |
| D. Comptes i sincronització | Pendent | Autenticació amb recuperació, servidor, permisos per usuari, revisions entre dispositius i conflictes sense pèrdua |
| E. Estadístiques i llavors | Pendent | Historial independent de les partides eliminades, darreres llavors amb mida/versió/resultat, estadístiques per operació i totals; ara només es desen temps i baixes bàsics |
| F. Preparació addicional del cooperatiu | Parcial | Format món/participants, IDs i seients ja preparats. Falta centralitzar/validar accions del joc, separar l’autoritat de simulació i suportar diversos jugadors reals |
| G. Cooperatiu jugable | Futur | Sales, amfitrió/servidor, sincronització, latència, reconnexió, regles de mort/entrada/sortida i objectius compartits |

La fase 1 del pla general està tancada per decisió expressa de l’usuari. La resta del pla general continua a `PROGRESS.MD`; aquesta entrega no reaudita altres fases.


## Fase B — desament automàtic i segon pla (2026-10-28)

Implementat a la versió preparada 0.6.4: primer desament d’una operació nova, interval de 60 segons de simulació, checkpoints agrupats després de recollides/intel·ligència i canvis de ràdio/presoners/mecànic, i intents immediats a visibilitychange, blur i pagehide. L’autosave no pausa la partida. El menú de pausa permet desactivar-lo i conserva aquesta preferència al navegador.

Els checkpoints es retarden tres segons i es limita la freqüència ordinària a una escriptura cada deu segons. Si hi ha una caiguda/ejecció o una granada en curs, s’ajorna el nou desament i es conserva l’últim complet. Les escriptures automàtiques i manuals se serialitzen; no es pot canviar de món mentre s’escriu. Els errors es mostren, tenen espera abans de reintentar i no eliminen la còpia anterior. Un conflicte amb una altra pestanya atura els reintents fins que es carrega o es desa com a nova.

Un tancament forçat del sistema pot impedir acabar l’últim intent en segon pla: la recuperació fiable és la darrera transacció completada, amb opció de triar la còpia anterior. No s’instal·len gestors beforeunload ni diàlegs que impedeixin tancar la pàgina. No s’avança la simulació mentre l’usuari és fora. La validació física en Android continua pendent.

Proves del coordinador: interval, agrupació, segon pla, transicions insegures, exclusió d’escriptures simultànies, desactivació, conflicte, espera després d’error i reinici. La prova del món real verifica també el checkpoint pagehide i que desactivar-lo impedeix una nova revisió.

Pendents en acabar B: validació real i desplegament, C exportació/importació, D comptes/sincronització, E estadístiques/historial, F preparació addicional del cooperatiu i G cooperatiu jugable.


## Fase C — exportació/importació (2026-10-28)

Implementada a la versió preparada 0.6.5. A «Operacions desades», cada partida té «Exportar fitxer». La descàrrega és la darrera revisió desada, no els canvis encara sense desar. Es pot exportar una operació incompatible amb el generador actual per conservar-la com a còpia externa.

El selector d’importació accepta fitxers JSON de partida. Abans de confirmar es mostra nom, llavor, mida i temps jugat. Sempre s’importa **com a operació nova**, amb un identificador nou i revisió pròpia: no reemplaça cap partida existent ni canvia la partida en curs. Les dades de compte importades no s’associen a cap identitat local.

Format `.hunter-save.json`, capçalera i versió de fitxer pròpies, payload versionat i comprovació SHA-256. Límit de 17 MiB per fitxer i 16 MiB per payload de partida. Es comproven mida abans de llegir el fitxer, JSON, versió, integritat, esquema i compatibilitat amb l’adaptador. Les referències i la identitat de les entitats es tornen a comprovar contra el món reconstruït abans d’aplicar-les. El checksum comprova integritat; no és una signatura ni un sistema antitrampes. No hi ha migració automàtica entre generadors incompatibles.

### Validació final de B + C

- Repositori IndexedDB simulat: transaccions, revisions, còpia anterior, quota i conflictes.
- Coordinador d’autosave: primer desament, interval, checkpoints, segon pla, transicions insegures, exclusió de concurrència, desactivació i reintents.
- Fitxers: roundtrip UTF-8 i BOM, capçalera/versió, checksum incorrecte, JSON invàlid, límit de mida abans i després de lectura i propietats de prototip rebutjades.
- Món real generat 67/petit: desar → exportar → importar com a nova → càrrega progressiva → captura i comparació de l’estat, incloent destructibles, baixes, recollides, ràdio, presoners, inventari, helicòpter en vol, càrrega sobre ferri, inundació i C4. Fitxers amb checksum incorrecte, adaptador incompatible o referències de model no admeses es rebutgen sense afegir operacions. S’ha comprovat que l’original i la partida activa no es modifiquen en importar. També checkpoint pagehide i preferència d’autosave desactivada. Proves executades sobre fonts i paquet final.
- Rellotge, menú de pausa, ràdio, sintaxi i build/check superats. La discrepància històrica de ruta del mecànic documentada més amunt no s’ha alterat.
- Encara no s’han comprovat selector de fitxers, descàrrega, IndexedDB natiu, GPU, mida gran ni Android físic. El desplegament de prova d’autosave 0.6.4 ha superat Cloudflare; l’estat de 0.6.5 es comprova després del commit final.

### Què queda per desenvolupar en acabar aquesta tasca

1. **Validació i publicació:** navegador real i Android; més llavors i mapa gran; transferència real de fitxers entre dispositius; integrar i publicar a producció quan correspongui.
2. **D — Comptes i sincronització:** registre/inici de sessió i recuperació, servei d’autenticació, dades al servidor, permisos, gestió de desconnexions i conflictes entre dispositius sense sobreescriptura silenciosa.
3. **E — Estadístiques i llavors:** totals i estadístiques detallades per operació; historial persistent independent dels desaments eliminats; darreres llavors amb mida, versió i resultat. Ara només es conserven temps i baixes bàsics dins cada desament.
4. **F — Preparació addicional del cooperatiu:** centralitzar les accions, validar-les en una autoritat de simulació i retirar les dependències que pressuposen un jugador únic. Format, IDs i seients ja preparats.
5. **G — Cooperatiu jugable:** sales, amfitrió/servidor, transport de xarxa, sincronització, latència, reconnexió, participants i objectius compartits.
6. **Manteniment del desament:** migracions explícites quan canviïn el format o el generador; ampliar cobertura de casos abans no validats.

Les fases A, B i C tenen implementació en branca; les comprovacions natives pendents impedeixen donar tota la fase 5 per tancada. El pla general de catorze fases continua a `PROGRESS.MD`, amb la fase 1 tancada per l’usuari.
