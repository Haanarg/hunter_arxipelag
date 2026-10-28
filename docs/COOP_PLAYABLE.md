# Primera missió cooperativa jugable · v0.6.28

## Què es pot jugar

**Relleu d’emergència** és una missió reduïda de dos jugadors en una zona acotada de la base. Té moviment, col·lisions, escales i plantes superiors del servidor, dos terminals, un objectiu que exigeix coordinació i una extracció amb victòria compartida. Ja no és només una sala o una prova de física.

L’usuari ha prioritzat que sigui jugable encara que l’estètica quedi provisional. Aquesta versió utilitza una vista 3D senzilla, dos personatges de colors, murs, terminals i recorreguts orientatius. Si WebGL no es pot crear, s’ofereix un mapa Canvas 2D amb els mateixos controls i la mateixa sessió. El joc individual conserva el seu món i la seva interfície.

No és encara la campanya Hunter completa en cooperatiu: combat, IA, vehicles, inventari i objectius de la campanya continuen pendents. La missió reduïda té un generador propi `relay:2`; no es presenta la geometria parcial del món general com si fos una campanya completa.

## Com jugar

1. Dos comptes aprovats, cadascun en una sessió de navegador o dispositiu diferent.
2. Des de **Sala cooperativa**, crear una sala i compartir-ne el codi. Entrar-hi amb el segon compte.
3. Marcar tots dos **Estic preparat** i obrir **Entrar a la missió cooperativa**.
4. Cadascú prem **Estic a punt: iniciar missió**. El servidor exigeix la confirmació dels dos clients amb la mateixa versió i revisió de sala.
5. El jugador blau va al terminal 1 i el groc al 2. Tots dos mantenen **E**, **espai** o **Activar** al seu terminal durant tres segons simultanis.
6. Després es reuneixen al cercle verd. Dos segons junts completen l’extracció i la victòria.

**F** o el botó **Porta** obre o tanca la porta propera; el botó indica l’acció disponible. No es pot tancar si hi ha un jugador al pas.

W/S o fletxes amunt/avall per avançar/retrocedir; A/D o fletxes esquerra/dreta per girar; Y/U per al moviment lateral; Majúscules per córrer. La pantalla inclou botons tàctils de mantenir premut. Perdre el focus allibera els controls.

Si la sala s’obre des d’una partida individual iniciada, la missió s’obre en una altra pestanya i la partida individual queda en pausa. Només es manté una connexió de sala per compte: una altra pestanya del mateix compte pot substituir la connexió activa.

## Servidor i persistència

- El Durable Object de la sala ja executa la missió. El servidor genera i guarda la geometria canònica; el client només rep dades de representació i envia intencions. No envia posicions, vida o victòries.
- S’escullen punts inicials i terminals fora dels edificis, sobre la terrassa construïda, amb recorreguts connectats i comprovació de col·lisions. L’àrea d’operació queda limitada. Les portes es poden obrir i tancar amb E / Acció. Els objectius mantenen recorreguts accessibles sense exigir que s’obri cap edifici.
- Tres passos fixos de simulació de 1/30 s per lot, amb un objectiu d’enviament d’estat cada 100 ms. El client envia intencions a 20 Hz i interpola la representació. No hi ha predicció local ni una garantia de latència/FPS; els retards del servei poden alentir la simulació.
- Les portes es validen contra la posició i altura autoritatives. El servidor impedeix tancaments sobre els dos actors, limita la freqüència i conserva els últims 32 resultats de comanda per evitar repeticions. El nou estat es desa abans d’actualitzar els dos clients; en una fallada es restaura el checkpoint.
- Geometria canònica guardada una vegada, amb estats de portes aplicats en restaurar, i checkpoint del tick, posicions, vida, seqüències reconegudes i objectiu abans de publicar cada lot. La prova de recuperació reinicia completament workerd i reutilitza el mateix D1 i emmagatzematge de Durable Objects.
- Els alarms duplicats no apliquen un altre lot abans del següent venciment. Una fallada de persistència restaura l’últim checkpoint i no publica el resultat no desat; programa una recuperació. Referència de la plataforma: [Alarms de Durable Objects](https://developers.cloudflare.com/durable-objects/api/alarms/).
- Quan falta un jugador, la missió es pausa i es buiden les intencions. Tornar a entrar amb el mateix compte i versió permet reprendre-la. Sortir de la sala, canviar-ne la revisió o participants finalitza la sessió de missió corresponent.
- La dificultat modifica el temps disponible i, des de v0.6.25, el dany dels guàrdies: 25 minuts en fàcil, 15 en normal i 10 en difícil. La sessió temporal caduca als 30 minuts de rellotge o quan caduca la sala, si és abans.
- Els checkpoints d’aquesta primera missió són temporals: no són desaments cooperatius exportables ni estadístiques de compte. No es garanteix la represa entre versions publicades; un canvi de versió elimina el checkpoint temporal incompatible. Els desaments individuals no canvien.

## Accés i límits

S’utilitzen els comptes, aprovació manual, cookies, origen i bindings existents. El Worker verifica l’accés al WebSocket i el Durable Object torna a comprovar sessió, aprovació i pertinença. Durant el joc actiu es revalida aproximadament cada segon, segons l’execució dels alarms; els missatges de control forcen validació. Les intencions tenen límit de freqüència, format tancat, seqüència monòtona, context de missió i timeout. Els terminals exigeixen proximitat física i els dos participants; una activació remota no produeix progrés.

No calen migracions SQL, secrets, plugins ni recursos Cloudflare nous. `coopPlayable` i el manifest indiquen disponibilitat de la missió reduïda. Es mantenen el binding `COOP_ROOMS` i la migració SQLite existents.

## Validació feta

- Missió completa en proves de nucli per a sis llavors i les dues escales: dos actors recorren la geometria real, activen els terminals i s’extreuen; victòria final, pausa, rebuig d’un tercer actor/activació remota, checkpoint i protecció de seqüències després de restaurar-lo.
- **Prova nativa completa amb dos comptes locals aprovats**, D1, WebSockets i Durable Object SQLite: una confirmació no inicia la missió; dues sí; moviment per intencions, objectiu simultani, extracció i victòria; desconnexió/pausa/represa; reinici de workerd i recuperació del resultat; rebuig de coordenades falsificades i revocació d’un participant durant una nova missió.
- Prova dels alarms: lots fixos, duplicació, fallada de persistència sense publicació, recuperació i pausa/neteja.
- Client: seqüències, pausa, reconnexió, detecció de manca de resposta, substitució de pestanya i neteja de timers. Entrada real de la pàgina amb compte/sala, botó d’inici, teclat, activació tàctil, pèrdua de focus i navegació.
- Representació: dibuix Canvas i construcció de l’escena real Three.js amb coordenades/geometries finites i alliberament de recursos. La prova utilitza un renderer substitut: **no és una passada visual de GPU ni una prova física Android**. Les proves físiques de dos dispositius continuen pendents.
- Regressions de comptes, recuperació, emmagatzematge, món, sales i desaments individuals, inclòs el paquet del navegador. Les tres incidències històriques i el diagnòstic del mapa complet d’escala 2 segueixen pendents. El mapa complet no es genera durant aquesta missió reduïda.
- Compilació del Worker i execució amb workerd natiu; compatibilitat local 2026-08-06, producció 2026-10-19. El dry-run local de Wrangler no s’ha executat perquè la versió no era a la memòria cau offline; el desplegament real de Cloudflare és la comprovació de publicació.

## Què queda

1. Passada real amb dos navegadors/dispositius i Android; qualitat visual, llegibilitat, ergonomia tàctil, latència, CPU/memòria i consum/quotes sota càrrega. Afegir predicció/reconciliació si les mesures ho requereixen.
2. Animació de portes i destrucció compartida, perímetres i resta de la base, HQ/búnquer/hangars i altres compounds; món complet, vegetació, entitats i coherència amb el render.
3. Combat, inventari, IA, vehicles, ferri/plataformes, presoners i objectius de campanya compartits.
4. Desaments cooperatius duradors/exportables, estadístiques i historial, política de versions/retenció, pausa i permisos més amplis; recuperació excepcional d’administradors.
5. Diagnòstic de generació completa d’escala 2 i les incidències històriques de proves, més les altres fases generals del pla original.

## Actualització v0.6.20

Portes compartides amb E / Acció: proximitat, altura, pas ocupat, cooldown, ordres idempotents, persistència i actualització de les col·lisions dels dos jugadors. Les vistes 3D i Canvas reflecteixen l’estat confirmat; no es modifica la física local per anticipació. Les proves natives recorren portes, completen la missió i recuperen l’obertura després de reiniciar workerd. La passada física de dos dispositius i l’animació de les fulles continuen pendents. Detall: [COOP_DOORS.md](COOP_DOORS.md).

### Inventari personal · v0.6.22

Cada jugador comença amb **24 bales, 2 granades, 1 disfressa i 1 farmaciola**. El panell mostra només el teu inventari. **C / Posar disfressa** canvia el teu aspecte a verd; no altera el company. **La recollida és automàtica** en tocar un subministrament als terminals (marcadors +), sense botó; els paquets disponibles contenen 12 bales, 1 granada, 1 disfressa o 1 farmaciola. Només el primer jugador que el toca i té capacitat rep el paquet. El servidor compara el primer contacte durant cada pas de simulació; si coincideixen exactament, resol l’empat segons l’ordre de la sala. No es recullen objectes a través de parets/portes tancades ni d’un altre pis. Capacitats: 120 bales, 8 granades, 1 disfressa i 3 farmacioles. La disfressa es pot posar i treure sense consumir-la.

**Deixar objectes:** tria 12 bales (o les que et queden), 1 granada, 1 disfressa o 1 farmaciola al selector i prem **G / Deixar**. L’objecte queda als teus peus i el company el recull passant-hi per sobre. Qui l’ha deixat ha d’allunyar-se i tornar-hi si el vol recuperar; així no el recull immediatament. Deixar la disfressa també se la treu. Si l’inventari no té prou capacitat per al paquet sencer, l’objecte es manté a terra. Els objectes deixats i l’exclusió temporal del propietari també es desen al checkpoint. Hi ha un límit de 128 paquets deixats simultàniament.

El servidor deriva el propietari de la sessió, comprova distància, alçada, capacitat i missió activa, i desa abans de confirmar. Inventaris, equipament i paquets recollits es recuperen en reconnectar i en reiniciar el Worker durant aquesta versió. Les ordres repetides no dupliquen objectes. No s’importa l’inventari de la partida individual.

### Combat d’entrenament · v0.6.23

- **F / Disparar**: pistola en la direcció on mires; gira amb A/D per apuntar. Un tret per pulsació, 1 bala, abast 70 m i cadència màxima de 3 trets/s. Les dianes vermelles opcionals tenen 12 punts de vida (3 impactes de pistola). El panell n’indica el recompte destruït.
- **B / Granada**: llançament frontal, gravetat i col·lisions. La granada s’atura contra els obstacles, sense rebot, i detona al cap de 2 segons de simulació. Radi 8 m i dany decreixent; les parets, portes tancades, sostres i pisos bloquegen els impactes/explosions. Munició individual.
- Botons equivalents per a pantalla tàctil. Trets, granades, explosions i vida de les dianes són compartits. Disparar o llançar una granada treu la disfressa. **Sense foc amic ni autodany** en aquest mode d’entrenament.
- Si falta un jugador, la pausa també atura les granades i els fusibles. En reconnectar o reiniciar el Worker, el checkpoint recupera els projectils en vol durant aquesta versió. En acabar la missió es retiren els projectils restants.

### Guàrdies i supervivència · v0.6.25

**F dispara; E obre/tanca portes o activa el terminal propi. X ja no dispara.** Els dos antics objectius d’entrenament són ara guàrdies de 12 PV: patrullen un tram de camí i detecten jugadors visibles fins a 18 m. El color ambre avisa de l’alerta; el vermell indica atac. Després d’un segon d’alerta disparen amb un interval mínim de 3 s. La vida dels dos jugadors apareix al panell.

La disfressa redueix la detecció a 4 m. Atacar se la treu i alerta els guàrdies propers durant 6 s. Una paret o porta tancada serveix de cobertura. Els guàrdies que perden la visió deixen de disparar, esperen/cerquen durant 4 s i reprenen la patrulla; encara no persegueixen els jugadors fora del recorregut. Es poden eliminar amb pistola o granades. L’objectiu continua sent activar els terminals i extreure’s; matar-los no és obligatori.

**Des de v0.6.28, 0 PV deixa el jugador ferit i permet reanimar-lo.** La missió fracassa si cauen tots dos o si s’esgoten els 30 segons de rescat. Podeu reiniciar-la quan tots dos confirmeu. La pausa per desconnexió congela també patrulles i atacs, i el checkpoint conserva salut/memòria/cadència dels guàrdies.

**Límit actual:** percepció de 360° i patrulla bàsica. Pendents IA completa, persecució, visió direccional, més armes i campanya completa. No hi ha foc amic ni autodany de granades. La campanya individual i el seu fusell d’assalt es conserven. Els checkpoints cooperatius temporals continuen sense migració entre versions ni desament permanent al compte.

El botó contextual mostra 🚪 Obrir/Tancar quan hi ha una porta operable; al terminal propi mostra ✋ Mantenir Activar. Si coincideixen els dos contextos, té prioritat el terminal. Un sol toc d’E commuta una porta; mantenir E no l’alterna repetidament. També funciona amb el botó tàctil o Enter/espai quan té el focus. Les portes romanen en l’estat confirmat pel servidor fins que un jugador les torna a accionar.


### Reanimar el company · v0.6.28

Quan el company queda ferit, tens **30 segons de simulació** per ajudar-lo. Acosta-t’hi (menys de 3,2 m), al mateix nivell i sense parets/portes entre vosaltres. El botó E canvia a **✚ Reanimar**. Queda’t quiet i mantén E o el botó durant **3 segons seguits**. Rebre dany, moure’s, allunyar-se o deixar E reinicia l’ajuda. També pots mantenir Enter/espai sobre el botó amb el focus.

El company torna amb **8 PV i 3 segons de protecció contra trets enemics**, **gastant una farmaciola de qui l’ajuda**. Cal tenir-la abans de començar i encara tenir-la en acabar; si interromps l’ajuda no se’n gasta cap. El ferit conserva l’inventari, però no pot moure’s ni fer accions. Els caiguts/nedadors han de quedar en una superfície accessible per poder rebre ajuda. Els terminals i l’extracció s’aturen mentre hi ha un ferit.

Si cauen tots dos o s’acaba el temps, la missió fracassa. Desconnectar pausa el compte enrere i les granades/guàrdies; el progrés de reanimació es reinicia. El checkpoint conserva el compte enrere i la salut durant aquesta versió, inclòs després de reiniciar el Worker. La caducitat absoluta de la missió continua sent de 30 minuts de rellotge.

**Farmacioles:** cada jugador en té una inicial i pot dur-ne fins a tres. També n’hi ha als terminals, recollibles automàticament en passar-hi per sobre. Pots triar «1 farmaciola» al selector de G / Deixar per passar-la al company. Sense farmaciola no es pot reanimar; el botó ho indica quan no hi ha una altra acció contextual. Les farmacioles del ferit no serveixen per autoreanimar-se.
