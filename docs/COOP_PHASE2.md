# Cooperatiu · fase 2: regles compartides i preparació (v0.6.9)

## Implementat

`src/player-simulation.mjs` conté les regles de moviment horitzontal a peu/nedant/ajupit i d’arrodoniment/aplicació de dany, sense DOM, Three.js ni globals del joc. El runtime individual ja utilitza aquestes regles. Es conserven les velocitats, diagonal normalitzada, límits del mapa i comportament de vida anteriors. La rotació local, les col·lisions, vehicles, gravetat, IA i efectes visuals continuen als sistemes existents: no s’ha substituït la simulació sencera.

El mateix mòdul ofereix un nucli per a dos actors amb passos fixos de 30 Hz. Accepta intencions (avanç, gir, strafe i córrer), no posicions, velocitats, vida o temps declarats pel client. Rebutja actors desconeguts, protocols/contextos diferents, seqüències repetides/antigues i entrades invàlides. Sense entrada nova durant aproximadament 250 ms s’atura el moviment; un actor mort no es mou. Els snapshots són còpies amb tick i seqüència confirmada. Un adaptador de món de confiança pot resoldre geometria/estat de moviment; una resolució invàlida no confirma mig tick.

Aquest nucli encara **no s’executa com un servidor de missió de producció**. L’adaptador del món real i el transport en temps real no estan connectats; les proves de dos actors utilitzen un món de prova controlat. La separació serveix per reutilitzar les mateixes regles en la futura autoritat i predicció, no per simular avui dues missions locals independents com si fossin compartides.

## Preparació de la sala

`POST /api/coop/prepare` requereix sessió, aprovació i pertinença a la sala, a més de protocol, versió del joc i revisió actual. Només retorna un manifest si els dos membres estan aprovats, preparats i amb presència recent. Els dos obtenen el mateix context: sala/revisió, actors/places, llavor, mida, dificultat, versió del generador, protocol i freqüència de simulació. Una preparació d’una revisió antiga o una versió de client antiga es rebutja.

El botó **Verificar preparació de la missió** apareix quan tots dos estan preparats. Confirma el contracte compartit; no inicia el món. El manifest indica `playable:false`, no és un token d’autorització ni un desament, i un futur servidor haurà de tornar a validar l’accés abans de qualsevol ordre.

No cal cap migració addicional a la 0005, binding, plugin ni recurs nou. L’usuari informa que ha aplicat la migració de sales; la passada manual amb dos comptes es posposa perquè ara només disposa d’un compte.

## Validació

- Paritat amb les equacions anteriors en combinacions d’angles, direccions, natació, cursa i ajupiment; vida fraccionària, mal invàlid i immunitat.
- Dos actors de prova: identitat, context, seqüències, timeout, tick fix, mort, snapshots independents, restricció de geometria i resolució atòmica.
- Dos comptes generats només a D1 local de Miniflare: manifest idèntic, revisions/versions antigues i participant absent. No s’han creat comptes de prova de producció.
- Worker empaquetat dins workerd: registre, aprovació, entrada de dos usuaris, preparació i manifest. Regressions de comptes i desaments superades.
- `simulation-timing.cjs` i `smoke.cjs` fallen també amb els fitxers originals de main previs a aquesta tanda: respectivament l’assert de cadència de pistola (0 davant 46) i la geometria inferior de la tanqueta (`lowerFixed:false`). No es declaren superades ni s’han alterat per fer-les passar. El rellotge semi-fix passa.

## Què queda després d’aquesta fase

1. Connectar el món real al nucli: col·lisions, alçada/aigua, gravetat, vehicles i IA, separant les dependències globals restants.
2. Autoritat de sessió persistent i transport en temps real, amb autenticació per actor, límits de freqüència, sincronització inicial, predicció/interpolació i reconnexió.
3. Combat, inventari, presoners/objectius i final de missió compartits; absència de l’amfitrió i pausa.
4. Desaments i recuperació de missió cooperativa i estadístiques per participant.
5. Validació manual amb dos navegadors/Android, latència/càrrega i correcció de les dues regressions històriques identificades. Quotes/retenció continuen segons el pla general.
