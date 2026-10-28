# Fase 5 — operacions desades i preparació del cooperatiu

Actualitzat: 2026-10-28. Implementació preparada a la branca `codex/phase5-operation-storage`, versió **0.6.3**, PR #8. Encara no s’ha integrat a `main` ni desplegat al joc públic.

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

Els desaments pertanyen a l’origen, navegador i dispositiu actuals. Esborrar les dades del navegador els elimina. Encara no hi ha autosave ni còpia externa.

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
| B. Autosave i recuperació | Pendent | Desament periòdic i després d’accions importants, segon pla, tancament inesperat i recuperació segura |
| C. Exportar/importar | Pendent | Fitxer de còpia, validació, límits i importació sense sobreescriptura silenciosa |
| D. Comptes i sincronització | Pendent | Autenticació amb recuperació, servidor, permisos per usuari, revisions entre dispositius i conflictes sense pèrdua |
| E. Estadístiques i llavors | Pendent | Historial independent de les partides eliminades, darreres llavors amb mida/versió/resultat, estadístiques per operació i totals; ara només es desen temps i baixes bàsics |
| F. Preparació addicional del cooperatiu | Parcial | Format món/participants, IDs i seients ja preparats. Falta centralitzar/validar accions del joc, separar l’autoritat de simulació i suportar diversos jugadors reals |
| G. Cooperatiu jugable | Futur | Sales, amfitrió/servidor, sincronització, latència, reconnexió, regles de mort/entrada/sortida i objectius compartits |

La fase 1 del pla general està tancada per decisió expressa de l’usuari. La resta del pla general continua a `PROGRESS.MD`; aquesta entrega no reaudita altres fases.
