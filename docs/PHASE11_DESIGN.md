# Fase 11 — propostes de sandbox opcional

Data: 2026-10-25. Base funcional: v0.5.81. **Disseny pendent d’elecció de l’usuari; cap implementació iniciada.** Les prioritats i els límits aprovats consten al [qüestionari respost](PHASE11_QUESTIONNAIRE.md).

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

## Recomanació pendent d’acceptació

Començar per **A**, d’acord amb la prioritat d’equipament i vehicles. Si l’usuari vol provar aviat l’escena nocturna, combinar aquest magatzem amb **nit i espera** en el primer prototip. B i C poden afegir-se després com a oportunitats independents. Les tres propostes són compatibles dins el sandbox; escollir una primera prova no exclou les altres del pla.

Abans de programar cal que l’usuari triï, combini o corregeixi aquesta primera prova. Després es comprovaran accés, resposta justa de les patrulles, absència d’obligacions secundàries, continuïtat de la missió principal i recuperació dels estats en reiniciar. La persistència completa entre sessions continua pendent de la fase 5.
