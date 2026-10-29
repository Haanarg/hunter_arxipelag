# Integració del cooperatiu al runtime original · 0.6.50

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
