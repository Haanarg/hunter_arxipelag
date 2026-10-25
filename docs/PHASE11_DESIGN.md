# Fase 11 — propostes de sandbox opcional

Data: 2026-10-25. **L’usuari ha triat B + C**, ampliant C amb un camp de camperols i un únic mecànic que repari vehicles. El primer prototip és v0.5.82; vegeu-ne el [comportament implementat](PHASE11_EXPLORATION.md). A i la nit/espera continuen pendents. Les seccions següents conserven el ventall inicial de propostes, no una llista de funcionalitats implementades. Les prioritats i els límits aprovats consten al [qüestionari respost](PHASE11_QUESTIONNAIRE.md).

L’escena de referència és la incursió nocturna que ha proposat l’usuari. Ha de poder sorgir de les decisions del jugador: aconseguir material, triar hora i ruta, aprofitar una disfressa, esquivar patrulles i assaltar el búnquer. Cap pas de preparació es converteix en requisit de la missió principal.

## A. Magatzem de costa — equipament i transport

**Descoberta:** un moll i un magatzem vigilats, recognoscibles des del mar o a peu. Una pista breu pot revelar què s’hi guarda. El marcador només apareix quan el jugador ho ha descobert.

**Decisió:** endur-se ràpidament una llanxa, infiltrar-se a cercar cisalla i disfressa o arriscar-se a recuperar-ho tot. També pot abordar el recinte amb un assalt directe, tornar-hi més tard o passar de llarg. No es necessita cap encàrrec ni clau prèvia.

**Recompensa:** transport per aproximar-se a la base per una altra costa i equipament per preparar la infiltració. Són exemplars addicionals; no es retiren les fonts de botí existents per imposar aquesta visita.

**Conseqüència:** els guàrdies reaccionen si observen el jugador o senten l’assalt; la cerca es concentra en el sector detectat. El vehicle que s’ha pres deixa de ser al moll. Robar sense ser vist no activa una alarma omniscient. Ignorar el magatzem conserva la situació inicial.

**Primer prototip possible:** un magatzem, una llanxa existent, cisalla/disfressa i una patrulla local. Provar descoberta, accés, recuperació, resposta local i capacitat de continuar cap al general sense visitar-lo. Orientació de durada: retirada ràpida de 2–4 minuts o incursió més completa de 5–8; no és un temporitzador.

## B. Antena muda — sabotatge amb conseqüències tàctiques

**Descoberta:** una instal·lació de comunicacions amb un relé operatiu recognoscible. Un mapa o una comunicació breu permet entendre quin sector connecta.

**Decisió:** acostar-se i inutilitzar el relé discretament o destruir-lo amb explosius des d’una posició exposada. També es pot deixar intacte.

**Recompensa:** interrompre la comunicació d’alarma entre aquesta instal·lació i un altre sector concret. El sabotatge no elimina la vista, l’oïda ni l’avís proper dels soldats.

**Conseqüència:** l’estat del relé i els avisos de ràdio fan visible el resultat. Una destrucció sorollosa pot atreure la patrulla local abans que el relé quedi inutilitzat. Si continua operatiu i els enemics detecten una incursió, poden avisar el sector connectat. Cap d’aquestes situacions tanca l’accés al general.

**Primer prototip possible:** un únic relé, dos sectors i un grup existent que pugui rebre l’avís. Cal crear l’enllaç i els seus estats: l’antena actual no implementa aquest sistema. No implica reforços infinits ni una simulació de comunicacions a tot l’arxipèlag.

## C. El presoner del taller — rescat i canvi visible

**Descoberta:** un presoner sota vigilància en un taller proper a vehicles. Se’l pot veure o descobrir amb una pista breu, sense una conversa llarga.

**Decisió:** alliberar-lo aprofitant el pas de la patrulla, combatre els guàrdies o continuar l’operació. El rescat no exigeix acceptar una missió ni completar una escorta obligatòria.

**Recompensa:** accés a un vehicle del taller o informació breu sobre equipament recuperable. La sortida i la recompensa són opcionals, i no substitueixen cap requisit de l’objectiu principal.

**Conseqüència:** el presoner surt del recinte per una ruta validada; la seva absència i la situació del taller queden reflectides al món. Una alarma pot concentrar vigilància al recinte i dificultar un segon intent. Si s’ignora el rescat, continua la situació inicial. No s’imposa un compte enrere ni una derrota de l’operació per abandonar-lo.

**Primer prototip possible:** un presoner, una zona de vigilància, una sortida curta segura i una recompensa de transport. Cal crear el personatge rescatable, la interacció i els estats; no és una mecànica existent.

## La nit com a eina del jugador

**Proposta oberta:** cicle de llum i una acció opcional d’esperar fins al vespre des d’un lloc segur, de manera que el jugador no hagi d’esperar minuts reals. L’hora afecta la visibilitat exterior; el jugador encara ha de poder orientar-se i veure els enemics. Un búnquer il·luminat conserva el risc dels guàrdies, la proximitat i els murs.

La disfressa ajuda a passar desapercebut, però no es proposa com una autorització infal·lible. Disparar i ser reconegut continuen tenint conseqüències. La nit tampoc torna sordes les patrulles.

Cal acordar si s’inclou al primer prototip. La durada del cicle, les condicions exactes d’espera i els valors de detecció es concretaran amb aquest abast. No es modifiquen el comportament de pausa/suspensió ni les condicions de victòria només per avançar el rellotge.

## Què existeix a la base i què cal crear

Revisió del codi v0.5.81; no és una prova visual nova en WebGL o Android.

| Part de l’escena | Estat actual |
| --- | --- |
| Tallar filferrada | Implementat a `src/combat.js`, `cutBarbedWire`: tram proper, sense consum ni alerta. |
| Disfressa | Botí i canvi visual existents. `soldierVisualContact` a `src/enemy-ai.js` redueix la visibilitat; no dóna immunitat ni permisos d’accés. Algunes aparicions de botí de disfressa depenen de l’atzar. |
| Patrulles i reacció | Existents, amb percepció i coordinació de la fase 8. |
| Búnquer, general i guàrdies | Existents a `src/compound-generation.js` i `src/game-core.js`. La porta s’obre progressivament per proximitat, fa soroll i no comprova la disfressa. Eliminar el general inicia la victòria; no s’afegeix una fugida obligatòria. |
| Vehicles i equipament | Catàleg, conducció, inventari i recollida existents. La nova oportunitat, les pistes i els estats del lloc s’han de dissenyar i implementar. |
| Nit i espera | Pendents: `src/rendering.js` crea sol i cel fixos; no hi ha un cicle jugable ni una acció per avançar l’hora. |
| Sabotatge funcional de comunicacions | Pendent. Hi ha instal·lacions i elements decoratius, però no l’enllaç de ràdio proposat. |
| Rescats | Pendents: no hi ha estats de presoner ni evacuació del rescat proposat. |

## Abast escollit per l’usuari

**B + C**, amb un nou camp de presoners i una recompensa de rescat concreta: només el mecànic alliberat pot reparar vehicles. La C inicial del taller queda substituïda per aquest camp amb quatre camperols i un mecànic. El sabotatge transmet o talla avisos entre comunicacions i dues unitats exteriors existents del quarter general.

La reparació és local, dura sis segons i no consumeix materials; no omple munició ni reviu vehicles destruïts. El mecànic pot seguir el jugador a peu voluntàriament. Els camperols evacuen sense una escorta obligatòria. La missió principal continua sent eliminar el general.

El detall del prototip, les comprovacions i els límits són a [PHASE11_EXPLORATION.md](PHASE11_EXPLORATION.md). A, nit/espera, transport del mecànic com a passatger i ampliacions del sandbox requereixen decisions posteriors; no formen part d’aquest primer prototip.
