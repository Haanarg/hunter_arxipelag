# Fase 5 — desament d’operacions

## Estat: primera entrega tècnica, integració jugable pendent

2026-10-28. L’usuari autoritza iniciar la implementació amb preparació per a comptes futurs i missions cooperatives. Aquesta entrega incorpora el contracte de dades i el repositori IndexedDB a `src/operation-save.mjs`. Encara no s’importa al runtime: no hi ha botons de desament ni restauració d’una partida real i no es canvia la versió publicada.

## Implementat

- Diverses operacions identificades i amb nom; crear, desar, llistar, carregar i eliminar per API.
- Format 1 amb versió del joc i del generador, llavor, mida i temps de simulació.
- Món compartit separat dels participants. Cada participant té estat, estadístiques i un identificador de compte opcional; no es desen contrasenyes.
- Col·leccions d’entitats per vehicles, enemics, civils, estructures, objectes i explosius. IDs explícits; no s’admeten duplicats ni seients ocupats per dues persones.
- Escriptura transaccional de la revisió actual i la còpia anterior. La promesa només es resol en completar la transacció.
- Revisió esperada obligatòria per desar/eliminar. Les pestanyes amb estat antic reben `CONFLICT`; no sobreescriuen la còpia més recent.
- Validació de dades JSON finites, format i compatibilitat explícita. Les càrregues retornades no comparteixen objectes amb el cridant.
- Les proves són manuals (`npm run test:saves`) i no bloquegen build ni desplegament.

## Contracte d’ús

`createOperation` crea un document en memòria, revisió 0. El cridant l’omple amb l’estat real i crida `store.save(snapshot, {expectedRevision: snapshot.revision})`; ha de conservar la revisió retornada. `store.load(id, {gameVersion, generatorVersion})` comprova compatibilitat abans d’aplicar dades al món. `store.load(id, {previous: true, ...compatibility})` permet inspeccionar la còpia anterior sense promocionar-la silenciosament.

Els IDs generats han d’utilitzar claus estables del generador, assignades abans que s’eliminin objectes. Un índex recalculat després d’una mort o recollida no és una clau estable. La versió del generador delimita la identitat dels elements; no es pressuposa que una llavor produeixi el mateix món entre versions. Les entitats creades durant la partida necessitaran IDs nous persistents.

L’esquema només valida l’envolupant i les referències comunes. Els adaptadors de cada sistema han de validar els camps físics i lògics abans de restaurar-los. Cap objecte Three.js, funció, referència circular o graf d’escena ha d’entrar al document.

## Integració necessària per completar la primera fase funcional

1. Assignar IDs durant la generació real i inventariar l’estat persistent de cada sistema: jugador/inventari/intel, vehicles i càrregues sobre ferris, enemics/torres/general, parets/cobertes/portes, recollides, ràdio, presoners/mecànic i explosius amb temporitzador.
2. Adaptadors explícits de captura i restauració. Conservar també l’estat del generador aleatori quan afecti la continuació; no regenerar visualment destruccions només canviant HP.
3. Reconstruir el món amb la mateixa llavor/mida i generador compatible; validar totes les referències abans d’aplicar l’estat. Recuperació segura si falla: conservar els desaments i tornar al menú, sense activar una partida a mig restaurar.
4. Connectar menú de partides i desament manual a pausa; reprendre sempre en pausa. Mostrar els errors d’emmagatzematge i conflictes, sense anunciar èxit anticipadament.
5. Prova de tancament/reobertura amb món modificat: sabotatge, rescat, destrucció parcial, objectes recollits, vehicle ocupat, navegació i vol. Passada real en navegador i Android abans de considerar la fase funcional completa.

Després: autosave, segon pla, exportació/importació; comptes i sincronització en entregues posteriors. No hi ha encara servidor, autenticació, transport multijugador ni simulació autoritativa. La separació de participants prepara el format, però no converteix la simulació global actual en cooperativa.

## Validació d’aquesta entrega

Proves Node amb `fake-indexeddb`: diverses operacions, reobertura de base de dades, còpia anterior, dues connexions que competeixen per la mateixa revisió, eliminació amb revisió antiga, identitat immutable del món, format/generador incompatibles, referències/seients invàlids, valors no finits, cicles, indisponibilitat d’IndexedDB i fallada de quota sense perdre les dues revisions. És una prova del repositori de dades; no certifica persistència en Android físic ni restauració del joc.
