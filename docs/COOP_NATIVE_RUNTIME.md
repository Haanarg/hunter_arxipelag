# Integració del cooperatiu al runtime original · 0.6.50
## Optimització iniciada el 29-10-2026 · LOD compartit de vehicles

Pla i prioritats acordades: [COOP_REBUILD.md](COOP_REBUILD.md#pla-de-rendiment-cooperatiu-29-10-2026). **Primera fase implementada al codi, validació de rendiment real pendent**.

- `src/game-core.js` extrau el planificador visual de `place()` en `updateVehicleVisualLod(t,dt)`. Les dues modalitats criden **exactament la mateixa funció**: el joc individual a `update()`, el cooperatiu natiu a `updateNativeCoop()`. No s'ha modificat el control autoritatiu del servidor.
- Cadència idèntica a l'individual: vehicle propi i vehicles a menys de 500 m **cada fotograma**; distància mitjana (500–1.200 m) **cada 0,1 s**; llunyans **cada 0,45 s**. La mira de franctirador manté el detall del vehicle enfocat. No es calculen `place()` ni animacions de vehicles destruïts.
- `src/coop-world-runtime.js` continua llegint posicions, HP, seients i torretes autoritatius, però ja no crida `place()` indiscriminadament per tots els vehicles en cada fotograma; la presentació de transformacions passa pel LOD comú. La física, col·lisions, dany i dades del servidor no s'hi redueixen.
- Prova de regressió afegida: `tests/native-coop-vehicle-visual-lod.cjs`, registrada a `npm run test:play`. Comprova 20 passos en individual i cooperatiu, quatre franges de comportament (vehicle propi, proper, intermedi, llunyà) i un destruït. **La prova s'ha escrit, però no s'ha executat en un checkout Node**.
- Fonts i paquet de navegador actualitzats a la branca `main` i coherència estàtica per verificar. **No hi ha encara comparativa d'FPS/CPU en GPU, prova real amb dos clients ni desplegament de Cloudflare verificat.** Per tant no s'atribueix una millora numèrica d'FPS o latència.

**Següent bloc:** aplicar snapshots incrementals només quan canviï el tick, reduir assignacions i cerques repetides; després interpolació de remots/predicció local i optimització de xarxa, mantenint la prova amb dos jugadors.


## Continuació 0.6.53 · prioritat al retard i al rendiment

S'han corregit diversos costos estructurals del camí natiu:

- **Xarxa:** estat complet en entrar/reconnectar i diferències sense pèrdua després. Les entitats immòbils, inventaris i dades estàtiques no es tornen a enviar. Cada connexió té revisions pròpies; si falta una base, es reconnecta per recuperar un estat complet. Això també resol diverses ordres dins d'un mateix tick. El servidor construeix un sol snapshot per difusió i comparteix el càlcul de diferències quan les bases coincideixen.
- **Simulació:** la següent alarma es calcula sobre el termini anterior, sense sumar-hi cada vegada el temps de CPU i desament. Els tres subpassos no generen snapshots de presentació descartats. Els heartbeats no reinicien el calendari d'una missió que ja està corrent.
- **Persistència:** metadades immutables del món desades una sola vegada per missió, separades de l'estat dinàmic. Es manté la transacció abans de difondre estat o confirmar ordres; no s'ha canviat per un desament eventual que pugui perdre impactes confirmats. Es llegeixen també els formats anteriors.
- **Resposta local:** predicció del moviment a peu i de la conducció dels 16 tipus de vehicle amb les funcions pures compartides. Les regles de moviment/contacte de vehicles s'han extret sense reescriure-les. En rebre autoritat es descarten entrades reconegudes i es reprodueixen les pendents; la finestra està limitada a 12 passos (400 ms). Els passatgers no prediuen la direcció. Davant una col·lisió que podria destruir un obstacle, la predicció s'atura i espera l'autoritat. Danys, recollides, inventari i destrucció no es decideixen localment.
- **Dispar mantingut:** viatja amb l'entrada habitual i el servidor manté la cadència. Només es conserva una ordre immediata inicial per als tocs curts; no hi ha una transacció/petició addicional per cada tret d'una ràfega continuada.
- **Client:** les actualitzacions de xarxa respecten l'ocultació per distància del motor original. Ja no fan reaparèixer tots els vehicles i enemics llunyans entre passades LOD. Els vehicles ocults eviten el càlcul visual de col·locació i els enemics ocults eviten animació; les portes es consulten per identificador indexat.

### Mesura reproduïble

`native-coop-performance.cjs`, món original de llavor 67, 30 difusions (3 segons de simulació):

| Mesura | Abans / referència | Després |
| --- | ---: | ---: |
| Dades d'estat serialitzades | 3.429.573 bytes | 322.277 bytes |
| Reducció de dades durant la prova | — | 90,6% |
| Estat complet d'un checkpoint repetit | 200.055 bytes | 123.627 bytes escrits, sense repetir metadades |

La prova reconstrueix exactament l'estat JSON i compara la simulació amb i sense snapshots descartables. Una prova de calendari injecta 50 ms de feina per difusió i conserva 30 ticks/s. Hi ha proves de predicció abans de rebre resposta, reconeixement/reproducció d'entrades, pausa, límit de deriva i paritat de sis passos dels 16 vehicles; i regressions de visibilitat, munició/cadència i transport.

Aquests números són de fixtures locals; **no són una mesura de ping ni una garantia d'FPS de producció**. Cal provar aquesta versió a les connexions/dispositius que patien el retard. La predicció pot corregir la posició en arribar l'autoritat, especialment en xocs destructius o connexions amb més de 400 ms sense estat. La paritat pendent de campanya continua oberta, però la prioritat passa a validar el rendiment real abans de continuar afegint sistemes.

## Continuació 0.6.52 · percepció i combat dels soldats originals

El primer bloc de la IA original passa a `enemy-perception-core.mjs`, utilitzat pel mode individual i pel servidor: configuració de visió i sons, con horitzontal/vertical, reconeixement, efectes d'ajupir-se/disfressar-se, consciència perifèrica de l'elit al soterrani, perfils de punteria i imprecisió del rastre sonor. S'han comparat 11.880 casos amb les fórmules conservades de la 0.6.51. L'animació d'infanteria també és una funció original compartida entre les dues presentacions.

El cooperatiu natiu guarda una observació separada de cada actor; reconèixer el primer no reconeix el company. La percepció funciona a 10 Hz amb el desfasament original de cada guàrdia. Les traçades existents del món compartit bloquegen murs, pisos i vehicles estacionats; el vehicle objectiu no es bloqueja a si mateix. Les finestres continuen utilitzant la geometria compartida.

L'exportació del món conserva les rutes de patrulla, velocitats, cadències, elit i soldats amb bazuca originals. El servidor valida aquests camps i conserva observacions, objectiu, memòria i temporitzadors al checkpoint. El tret utilitza la cadència i el dany originals, amb la mateixa escala de punteria segons dificultat; els coets enemics poden danyar tots dos jugadors. Els sons d'armes/explosions i els crits locals utilitzen els radis originals i una posició recordada, sense donar visió a través dels murs.

Proves superades: paritat de fórmules; dos actors, cobertures, vehicles, disfressa, ajupiment i soterrani; cadència de fusell/elit/bazuca i explosions enemigues; checkpoint; sigil/coordinació individuals; món natiu normal amb dos generadors i món gran de llavor 0 amb 374 vehicles/377 enemics; entrada/presentació natives i Worker amb dos comptes autenticats, reconnexió i restauració en fred. El paquet inclou també els canvis paral·lels de sostres i càmera dels hangars.

**Límit d'aquesta fase:** la percepció/combat dels soldats avança, però no s'ha traslladat encara la navegació tàctica original (persecució, reculada, flancs, entrada per portes i cues), ni les patrulles de vehicles, torres, lògica completa del general i sistemes opcionals. Les rutes de patrulla es conserven, però el moviment del servidor encara utilitza l'adaptador de col·lisions existent. Aquesta fase no acredita la paritat completa de la IA, dues GPU/dispositius ni desplegament verificat.

## Continuació 0.6.51 · estabilització i validació autenticada

- La selecció nativa d'armes des de l'inventari i el selector ràpid comparteix la mateixa funció. Canviar d'arma cancel·la la càrrega de granada i la mira. Una granada seleccionada no manté les banderes visuals del rifle anterior; gastar l'última restaura l'arma confirmada pel servidor.
- El dispar mantingut usa la cadència del catàleg compartit i ticks autoritatius, inclosos els perfils de tanc, tanqueta i helicòpter. S'eviten ordres de pistola en vehicles tancats sense arma.
- El transport natiu recupera el detector de connexions silencioses del client anterior: si no arriba cap resposta durant més de 30 segons, el següent heartbeat tanca el socket i activa el reintent. La mateixa missió conserva la seqüència d'entrada; una missió nova la reinicia. Els tancaments de protocol 1008 són definitius.
- Els rebutjos d'accions habituals (vehicle en marxa, ple, sortida bloquejada, falta de munició) arriben al missatge original del HUD. La sortida elimina projectils/granades/remots i neteja tecles i càrregues pendents. Una arrencada fallida retorna al menú amb la simulació pausada.
- Nova prova `native-coop-authenticated.mjs`: dos comptes aprovats, D1, WebSocket i Durable Object reals dins de Miniflare/workerd; món original de més d'1 MB per fragments, general/flota, identitats, moviment, inventari, pausa/reconnexió i restauració en fred. Ha passat amb el Worker compilat de la 0.6.51.
- També han passat les proves natives d'arrencada, controls, transport, reconnexió, món i presentació; la simulació individual de 10–120 FPS amb pauses/jitter; i la coherència del paquet generat.

Aquesta validació autenticada és local i sense renderitzat GPU. No acredita dos dispositius físics ni el desplegament de producció. Els pendents de paritat detallats més avall continuen oberts.

## Canvi real d'entrada i presentació

La sala del menú original inicia `HUNTER_NATIVE_COOP.start`. `coop.html` redirigeix al mateix `index.html` i carrega el mateix motor; ja no és la pantalla de joc del client ortogràfic. El nou adaptador de xarxa no construeix cap escena, renderer, càmera, HUD o comandament.

El runtime original comparteix `readPlayerControls`, `updatePlayerCamera` i `updatePlayerHUD` entre sessions. Cada compte projecta el seu actor sobre `P`; la càmera en perspectiva original segueix aquest actor des de darrere. El company es representa amb els models i els pilots originals. Les dades de la sala alimenten els vehicles, projectils, granades, portes, finestres i destrucció del món original. Els efectes i la cinemàtica de victòria utilitzen el codi existent.

Les comandes de disparar, triar armes, interactuar amb portes i vehicles, disfressa, farmacioles i C4 es redirigeixen a la infraestructura autoritativa. La càrrega de granada conserva la potència a través del protocol. El mode individual continua executant el seu camí local. Els desaments i autodesaments individuals queden bloquejats durant una sessió remota.

## Un món original verificat pels dos participants

Cada navegador genera el món amb el generador original i exporta registres físics sense meshes ni credencials, amb els identificadors del registre de desaments. Es conserven els complexos, edificis, portes, vegetació, flota i enemics originals, inclòs el general. Les coordenades canòniques s'arrodoneixen a una milionèsima de metre per evitar diferències numèriques insignificants en la identitat del món.

L'amfitrió envia l'estat inicial per fragments limitats. Tots dos participants han de confirmar el mateix SHA-256 i revisió de sala. El servidor comprova la identitat dels fragments, el compte de l'amfitrió, els límits i la geometria, i inicia l'estat compartit només després de les dues confirmacions. Aquesta comprovació és una coincidència de dos generadors originals; no és una nova generació alternativa al servidor.

La preparació sobreviu a la hibernació del Durable Object. Geometria i checkpoints grans es divideixen en valors limitats, evitant superar el límit per valor del magatzem. La confirmació inicial es desa de manera atòmica abans de publicar la missió; els checkpoints mantenen la restauració i reversió d'accions existents.

La inicialització de l'angle d'algunes embarcacions utilitzava Math.random. Ara utilitza el hash de llavor i coordenades ja existent, sense consumir el flux aleatori principal ni moure la distribució del món.

## Validació feta

- Dues instàncies originals de la llavor 67 produeixen exactament el mateix estat canònic.
- El món exportat conté 98 vehicles i 124 enemics a la fixture normal; la fixture gran de llavor 0 en conté 374 i 377, respectivament.
- Preparació per fragments, dos vots, autorització de l'amfitrió, identitat, persistència de valors limitats i restauració en fred.
- Els dos identificadors de jugador, en ordre diferent, utilitzen el mateix renderer/canvas, HUD original i càmera original darrere del seu propi actor.
- Entrada pública de la sessió: generació progressiva original, preparació, vinculació de missió, controls i comandes originals, aïllament de desaments i sortida.
- Regressions de moviment i cadència amb 10–120 FPS, jitter i pauses; combat, armes, vehicles, portes, inventari, reanimació, destrucció, vegetació i finestres.
- El test anterior de la interfície ortogràfica es retira del circuit principal perquè aquella pàgina ja no existeix com a client de joc. Es substitueix per proves del runtime original.

Les proves són de Node/Three i dels adaptadors de transport. No equivalen a haver provat aquesta versió amb dos navegadors autenticats ni amb GPU Android. La suite extensa `camera-controls.cjs` ha estat interrompuda pel límit de memòria del contenidor; la prova específica de les dues càmeres natives i la de timing han passat. No s'ha verificat el desplegament.

## Paritat encara pendent: no declarar el mode acabat

La integració de pantalla, món i sessió és implementada, però la campanya cooperativa encara no té paritat completa:

- La simulació autoritativa reutilitza el combat/guàrdies existents del cooperatiu. Falta traslladar-hi la IA completa original: persecució, navegació, patrulles terrestres i marines, torres i supressió, elit i totes les prioritats.
- Presoners, mecànic, ràdio, fauna amb interaccions i altres sistemes opcionals encara necessiten estat i accions compartits. No s'han duplicat dins d'un segon client.
- Mapes/intel·ligència, paracaigudes i tots els detalls d'inventari encara necessiten projecció autoritativa. Les recollides d'armes i consumibles principals sí estan connectades.
- Cal completar la paritat fina de vehicles: salts en marxa, passatgers, càrrega sobre ferris i animacions/remotes. Falta predicció i reconciliació del moviment local per reduir la latència percebuda.
- Cal una prova real amb dos dispositius, incloent interiors i soterrani, i comprovar el desplegament del Worker i dels assets de la mateixa versió.

Aquesta és la primera integració jugable dins del motor original. No s'ha de presentar com la reconstrucció completa sol·licitada fins que s'hagin tancat aquests punts.

