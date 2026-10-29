## Estat actual · 0.6.50

L'entrada cooperativa inicia ara una sessió dins del runtime original: mateix canvas, controls, HUD i càmera en perspectiva. L'enllaç antic redirigeix a aquesta entrada. Vegeu [la implementació, validació i límits pendents](COOP_NATIVE_RUNTIME.md): la IA completa i els sistemes opcionals encara no tenen paritat. No és una declaració de reconstrucció acabada.

## Historial del prototip fins a 0.6.49

> **Estat històric fins a 0.6.49: prototip tècnic separat.** La prova real amb dos jugadors ha confirmat que aquesta interfície, càmera i generació alternativa no compleixen l'objectiu d'adaptar el joc individual. La direcció de desenvolupament queda substituïda per [la reconstrucció sobre el runtime original](COOP_REBUILD.md). Les funcionalitats i proves descrites a continuació són l'historial del prototip, no una certificació de paritat amb el joc original.

# Cooperatiu · v0.6.45

## Què es pot jugar

**Relleu d’emergència** és una missió reduïda de dos jugadors en una zona acotada de la base. Té moviment, col·lisions, escales i plantes superiors del servidor, dos terminals, un objectiu que exigeix coordinació i una extracció amb victòria compartida. Ja no és només una sala o una prova de física.

L’usuari ha prioritzat que sigui jugable encara que l’estètica quedi provisional. Aquesta versió utilitza una vista 3D senzilla, dos personatges de colors, murs, terminals i recorreguts orientatius. Si WebGL no es pot crear, s’ofereix un mapa Canvas 2D amb els mateixos controls i la mateixa sessió. El joc individual conserva el seu món i la seva interfície.

No és encara la campanya Hunter completa en cooperatiu. Hi ha armes, inventaris personals, reanimació, guàrdies i un jeep compartit dins del recinte. La campanya completa continua pendent. Generador temporal actual: `relay:20`; cal iniciar una missió nova després d’actualitzar els dos clients. Les seccions amb versions anteriors conserven l’històric.

També hi ha la modalitat **Món obert · exploració de l’arxipèlag**, amb el terreny complet i les famílies de complexos dels dissenys individuals. És exploració/combat compartit, encara sense victòria de campanya ni rescat de presoners. Vegeu l’actualització v0.6.44 al final.

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

## Què quedava en el pilot inicial

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

**F dispara; E obre/tanca portes o activa el terminal propi. X ja no dispara.** Els dos antics objectius d’entrenament són ara guàrdies de 12 PV: patrullen un tram de camí i detecten jugadors visibles fins a 18 m dins d’un con frontal de 120° (des de v0.6.29); a menys de 2 m també perceben algú al darrere, sempre amb línia de visió. El color ambre avisa de l’alerta; el vermell indica atac. Després d’un segon d’alerta disparen amb un interval mínim de 3 s. La vida dels dos jugadors apareix al panell.

La disfressa redueix la detecció a 4 m. Atacar se la treu i alerta els guàrdies propers durant 6 s. Una paret o porta tancada serveix de cobertura. Els guàrdies que perden la visió deixen de disparar, giren explorant al voltant de l’última posició vista o sentida durant 4 s i reprenen la patrulla; encara no persegueixen els jugadors fora del recorregut. Es poden eliminar amb pistola o granades. L’objectiu continua sent activar els terminals i extreure’s; matar-los no és obligatori.

**Des de v0.6.28, 0 PV deixa el jugador ferit i permet reanimar-lo.** La missió fracassa si cauen tots dos o si s’esgoten els 30 segons de rescat. Podeu reiniciar-la quan tots dos confirmeu. La pausa per desconnexió congela també patrulles i atacs, i el checkpoint conserva salut/memòria/cadència dels guàrdies.

**Límit actual:** visió direccional i cerca amb girs, amb patrulla bàsica. Els sorolls a menys de 35 m fan girar cap a l’origen però no permeten atacar a través de parets ni seguir la posició oculta d’un jugador. Pendents persecució i cerca amb navegació, coordinació, més armes i campanya completa. No hi ha foc amic ni autodany de granades. La campanya individual i el seu fusell d’assalt es conserven. Els checkpoints cooperatius temporals continuen sense migració entre versions ni desament permanent al compte.

El botó contextual mostra 🚪 Obrir/Tancar quan hi ha una porta operable; al terminal propi mostra ✋ Mantenir Activar. Si coincideixen els dos contextos, té prioritat el terminal. Un sol toc d’E commuta una porta; mantenir E no l’alterna repetidament. També funciona amb el botó tàctil o Enter/espai quan té el focus. Les portes romanen en l’estat confirmat pel servidor fins que un jugador les torna a accionar.


### Reanimar el company · v0.6.28

Quan el company queda ferit, tens **30 segons de simulació** per ajudar-lo. Acosta-t’hi (menys de 3,2 m), al mateix nivell i sense parets/portes entre vosaltres. El botó E canvia a **✚ Reanimar**. Queda’t quiet i mantén E o el botó durant **3 segons seguits**. Rebre dany, moure’s, allunyar-se o deixar E reinicia l’ajuda. També pots mantenir Enter/espai sobre el botó amb el focus.

El company torna amb **8 PV i 3 segons de protecció contra trets enemics**, **gastant una farmaciola de qui l’ajuda**. Cal tenir-la abans de començar i encara tenir-la en acabar; si interromps l’ajuda no se’n gasta cap. El ferit conserva l’inventari, però no pot moure’s ni fer accions. Els caiguts/nedadors han de quedar en una superfície accessible per poder rebre ajuda. Els terminals i l’extracció s’aturen mentre hi ha un ferit.

Si cauen tots dos o s’acaba el temps, la missió fracassa. Desconnectar pausa el compte enrere i les granades/guàrdies; el progrés de reanimació es reinicia. El checkpoint conserva el compte enrere i la salut durant aquesta versió, inclòs després de reiniciar el Worker. La caducitat absoluta de la missió continua sent de 30 minuts de rellotge.

**Farmacioles:** cada jugador en té una inicial i pot dur-ne fins a tres. També n’hi ha als terminals, recollibles automàticament en passar-hi per sobre. Pots triar «1 farmaciola» al selector de G / Deixar per passar-la al company. Sense farmaciola no es pot reanimar; el botó ho indica quan no hi ha una altra acció contextual. Les farmacioles del ferit no serveixen per autoreanimar-se.


## Armes i jeep compartit · v0.6.30

Cada jugador comença amb pistola i fusell d’assalt. **1/2** o el selector canvia l’arma; **F** dispara. El fusell fa una ràfega de fins a tres bales, separades al llarg de cinc ticks (aprox. 0,17 s). Cada tret consumeix una bala pròpia i apunta segons l’orientació actual. Les dues armes comparteixen la reserva de bales de cadascú. No hi ha carregadors ni recàrrega en aquesta primera integració. Sense prou bales, la ràfega queda parcial. Canviar d’arma, pujar al jeep, quedar ferit o pausar cancel·la els trets pendents, sense gastar-los. El fusell també es pot deixar amb **G / Deixar** i recollir per contacte, amb capacitat d’un per jugador.

Hi ha un **jeep de dues places** en un aparcament exterior verificat a prop del punt inicial. Amb **E / Acció** s’hi puja: la primera plaça lliure és la del conductor, la segona la del passatger. El conductor usa **W/S** per avançar/frenar o fer marxa enrere i **A/D** per girar. Y/U i córrer no donen moviment addicional al vehicle. Velocitat màxima 14 m/s endavant i 6 m/s enrere, acceleració/frenada de 8 m/s². Cal deixar W/S i aturar-lo abans de baixar amb **E**; si la sortida està bloquejada no es pot baixar. El servidor prova diverses sortides laterals i comprova tot el trajecte. El passatger viatja amb el conductor i no pot dirigir-lo. Si el conductor baixa, el passatger no canvia de plaça automàticament; pot baixar i tornar a pujar.

El vehicle queda restringit al terra exterior pla del recinte, amb comprovacions d’amplada, parets/portes, desnivells i límits. No pot travessar portes tancades ni fer que una porta es tanqui sobre seu. Pujar exigeix proximitat i camí lliure. Inputs caducats o pausa aturen el jeep. El servidor conserva posició, orientació, seients i velocitat al checkpoint, però no conserva inputs antics. Un ocupant que queda ferit deixa el seient i el vehicle s’atura; pot ser reanimat amb les regles habituals i una farmaciola del company.

Mentre s’és dins no es dispara, no es llancen granades, no es recull ni es deixa equipament, no es reanima ni s’activen terminals/extracció. Els ocupants continuen sent vulnerables als guàrdies. Baixar té prioritat al botó contextual; a peu es conserven reanimació, terminal i porta abans d’oferir pujar. Representació 3D i Canvas del jeep i panell de conductor/passatger/velocitat.

**Límits d’aquesta fase:** jeep de transport sense blindatge, salut pròpia, combustible, destrucció, atropellaments ni armes muntades. Encara no integra tancs, barques, helicòpters ni la física completa dels vehicles individuals. No amplia la missió fora del recinte. Cal iniciar una missió nova amb tots dos clients actualitzats: `relay:9`, sense migració dels checkpoints temporals anteriors.


## Motor compartit · v0.6.31

Conducció horitzontal, perfils de vehicles, controlador de ràfegues, primitives de contacte/dany, visió i integració de granades s’han extret del joc individual i ara són compartits. Els jugadors/guàrdies fan servir el model tàctic original i el jeep fa servir el Humvee procedural B. Sala i missió també comparteixen el cicle de connexió.

El jeep deixa de tenir l’acceleració lineal pròpia: usa el perfil `cotxe` original, amb inèrcia i arrossegament (màxim 38 m/s endavant, 14 enrere). Deixeu W/S per reduir la velocitat i atureu-lo abans de baixar. La ràfega requereix tres bales com la individual i usa el mateix temporitzador de 75 ms (ticks 0/3/5 a 30 Hz). Es manté el perfil de dany de la missió reduïda, separat com a dades.

La salut/destrucció especial de 60 PV que s’estava preparant no es publica: s’ha retirat perquè repetia regles del joc individual. La seva integració futura partirà del motor compartit. Auditoria completa i treball pendent a [SHARED_ENGINE_AUDIT.md](SHARED_ENGINE_AUDIT.md).

## Autoapuntat compartit · v0.6.33

F utilitza ara la selecció 3D del mode individual: pistola fins a 75 m i fusell fins a 85 m, amb el mateix con i ampliació per blancs alts o baixos. Cada bala d’una ràfega busca de nou un blanc viu. Només s’adquireixen dianes dins del con/abast i visibles per al servidor, i el raig continua aturant-se al primer obstacle físic. Sense diana, es dispara en la direcció del jugador. No hi ha foc amic ni cap ordre de client per fixar un blanc.

Els controls no canvien: F dispara, 1/2 tria arma, E fa l’acció contextual i G deixa equipament. La missió continua usant hitscan per a les bales; el recorregut complet de projectils encara s’ha d’integrar. Generador temporal `relay:11`: recarregueu els dos clients i inicieu una missió nova. Es conserven les portes estretes/altes de v0.6.32 i el búnquer.

## Bales amb vol real · v0.6.34

La pistola i el fusell dels jugadors creen bales a **130 m/s**, amb **2,2 segons** de vida. F confirma el tret i gasta la bala en sortir; el dany arriba quan el projectil toca la diana. L’autoapuntat continua usant el nucli individual, però la bala no és guiada: si la diana es mou després del tret, pot esquivar-lo. Portes, parets, pisos, sostres i terreny es consulten durant tot el recorregut. El primer contacte decideix l’impacte.

Es mostren les bales blanques originals i l’impacte separat. La pausa congela el vol i el checkpoint el conserva. Canviar d’arma cancel·la la resta de la ràfega però no fa desaparèixer bales que ja han sortit. No canvien F, E, 1/2 ni G, ni la regla de farmacioles per reanimar. Els trets dels guàrdies encara usen el sistema instantani del pilot; la seva migració al mateix nucli queda pendent amb la IA.

Generador temporal `relay:12`: cal recarregar els dos clients i iniciar una missió nova. Es conserven les portes de v0.6.32 i el búnquer.

## Bales dels guàrdies i punteria compartida · v0.6.38

Els trets dels guàrdies també viatgen: fusell a **70 m/s**, amb l’error per dificultat/distància del mode individual. Després de l’avís d’un segon surt la bala, però el dany només arriba si el trajecte toca un jugador. Podeu esquivar-la o posar una cobertura pel mig; no és guiada. Es conserva el mínim de 3 s entre trets del pilot.

El servidor guarda la tirada de punteria i la trajectòria: reconnectar o reintentar un desament no canvia la bala. Un company que entri al seu trajecte pot rebre el tret. Les bales pròpies continuen sense fer foc amic. Les regles de farmacioles, ferits i protecció després de reanimar es conserven, i es comproven en el moment de l’impacte.

Generador temporal `relay:14`: recarregueu tots dos clients i inicieu una missió nova. La IA completa, navegació/persecució, altres armes i la campanya encara són pendents.


## Vida del jeep i destrucció · v0.6.38

El jeep té **5 PV**, com el cotxe militar individual. El panell mostra la vida mentre s’hi viatja. Bales i granades poden destruir-lo; el casc protegeix els ocupants dels impactes directes fins que explota. La destrucció atura el vehicle, allibera els dos seients, retira el model i fa 4–6 PV de dany a cadascun dels ocupants. No es pot tornar a pujar a un vehicle destruït. Les explosions d’un vehicle també poden fer mal als jugadors a peu i a altres vehicles propers, respectant la cobertura. Les granades pròpies poden ferir qui les llança; conserven la protecció directa del company.

Els trets a vehicles buits poden fer-los esclatar. Les bales no travessen el jeep per tocar un soldat que hi hagi darrere. Vida/destrucció es conserven en reconnexions i reinicis; una explosió no es repeteix en restaurar. Inicieu una missió nova (`relay:14`). Encara no hi ha armes muntades, atropellaments ni xocs destructius, ni impuls físic d’ejecció/ferralla original.


## Camp de proves · v0.6.40

A la pàgina cooperativa, trieu **Camp de proves · totes les armes i vehicles**. Tots dos participants heu de prémer **Aplicar / reiniciar modalitat** amb la mateixa selecció. Es pot canviar des del relleu; no es reinicia la missió fins als dos vots. Repetir-ho crea un camp nou amb la flota, les dianes i els inventaris reposats. No és una ampliació de la campanya ni un canvi als desaments individuals.

El camp té terra, una bassa navegable i espai de vol, sense enemics que disparin. A l’esquerra hi ha cotxe militar/Humvee, cotxe civil, bici, moto, camió, tanqueta, tanc, hovercraft i els dos helicòpters. A la dreta, llanxa, llanxa de coets, moto aquàtica, barca de rems, windsurf i ferri. Són les 16 famílies, amb els models/escales originals. El jeep reduït del relleu es conserva.

Cada jugador rep armes i reserves pròpies: pistola, fusell d’assalt, franctirador, bazuca, ganivet, cisalla, granades i C4. Escolliu l’arma al selector i premeu **F**; **B** llança granades. El C4 seleccionat es col·loca amb F i esclata als 5 s. La cisalla talla el tram de filferrada del camp en mirar-lo de prop. Es poden deixar armes i munició amb G i passar-les per contacte. El zoom del mapa segueix el jugador; el botó ×8 ajuda a examinar objectius, però encara no és el visor en primera persona del mode individual.

**E** puja/baixa; cal aturar-se i, als helicòpters, aterrar. Es pot pujar a una embarcació nedant. **W/S** condueix, **A/D** gira, **Y/U** desplaça lateralment hover i helicòpters. **Re Pàg / Av Pàg** o els botons de vol pugen/baixen. La primera plaça condueix; els monoplaça no admeten passatger. Inputs caducats o desconnexió aturen els controls.

El conductor dispara amb F el canó del tanc/tanqueta, el canó de l’helicòpter de combat, els coets navals o la pistola dels vehicles oberts. **V / Míssil** és l’arma secundària de l’helicòpter de combat (12 míssils per aparell al camp). El Huey deixa llançar granades amb B; si s’hi puja amb C4 seleccionat, F en deixa caure una càrrega. El passatger no dispara. La munició de mà és personal; els míssils pertanyen al vehicle.

**Límits coneguts:** disponibilitat i prova funcional de totes les famílies; encara no és paritat completa amb el motor individual. Resten contactes OBB/entre vehicles, atropellaments, transport sobre el ferri i obstacles/accidents aeris complets, destrucció d’edificis i filferrades per explosions, animacions de conductor/armes, canons/torretes orientats amb boca exacta, visor real, càrrega variable de granades i temporitzador editable del C4. Granades del camp: potència mitjana fixa; C4: 5 s. La validació GPU/Android i dos navegadors físics continua pendent.


## Torretes de blindats · v0.6.41

Al camp nou, el tanc i la tanqueta ja giren i eleven el canó amb el controlador individual. Els trets surten de la **boca real** i segueixen el canó, també conduint. Feu que el xassís miri aproximadament el blanc i doneu temps a la torreta perquè s’hi orienti. Prémer F abans que hagi acabat de girar pot fer fallar el tret: disparar no recol·loca instantàniament la torre.

Pausa/reconnexió conserven orientació i inèrcia. Cal camp nou (`relay:16`) i dos clients actualitzats. Això completa la boca/orientació dels dos blindats; les d’helicòpters, embarcacions i armes personals, així com les altres limitacions de contacte/animació del camp, continuen pendents.


## Destrucció compartida de filferrades

Les explosions de granades, C4, projectils pesats i vehicles trenquen els trams de filferrada que assoleixen, respectant els murs de cobertura. El càlcul de proximitat al tram real s’ha extret del mode individual a `combat-rules.mjs` i és compartit pels dos modes. El servidor actualitza les col·lisions i comunica `removedWalls` a les dues vistes; els checkpoints conserven la bretxa després de reconnectar o restaurar. Les bales lleugeres continuen travessant el filferro sense destruir-lo.

Validació: proves de granada/C4 a l’extrem del tram, cobertura sòlida, fora d’abast, pausa i restauració; regressions d’arsenal, combat i destrucció de vehicles. Encara pendents: destrucció d’edificis, xocs/atropellaments, campanya i proves físiques de dos dispositius.


## Edificis destructibles compartits · relay:17

Els murs i sostres cooperatius conserven els punts de vida de les peces originals. Les explosions de granades, C4, armes pesades i vehicles apliquen les mateixes fórmules del mode individual, extretes a `combat-rules.mjs`: dany per proximitat/altura i ensorrament en perdre tres unitats de suport. Les bales lleugeres continuen sense destruir estructures militars. El sostre del búnquer manté la protecció original.

Destruir un brancal elimina tota l’obertura (porta, brancals i llinda). Una porta destruïda no es pot tornar a tancar ni apareix com a acció contextual. En ensorrar un edifici desapareixen sostre, forjat i escala interior, amb actualització de les col·lisions i de la vista 3D. El dany parcial i les destruccions es guarden al checkpoint. Els efectes originals de pols i runa encara són pendents.

El camp de proves incorpora un edifici de dues plantes a x=55, z=60. Recarregueu tots dos clients i inicieu un camp nou: `relay:17` invalida els checkpoints temporals anteriors. La campanya completa i els xocs/atropellaments encara són pendents.

Validació local: proves de dany acumulat i restauració, ensorrament, escala/sostre sense col·lisions residuals, destrucció atòmica d’entrada, immunitat de bales lleugeres, suports i protecció del búnquer. Regressions de missió, portes, arsenal, combat, vehicles, reanimació, projectils, inventari, apuntat i armes. Interfície Canvas/Three.js amb renderer substitut, flota i torretes originals també passen; no és validació GPU ni dos dispositius físics. Les proves del hub de sales no s’han pogut executar perquè l’entorn local no té `better-auth`. Paquet del navegador regenerat i verificat.


## Xocs i atropellaments · relay:18

El servidor comprova el recorregut i la rotació del vehicle amb les caixes orientades originals (SAT), evitant travessar murs prims o altres vehicles. Es reutilitzen `obbOverlap`, `relativeVehicleImpactSpeed`, `impactDamage`, `runoverSweepHit`, `runoverDamage` i `tankCanCrush`, extrets del motor individual i consumits també pel joc individual. El relleu conserva la caixa del jeep reduït; el camp de proves usa les dimensions originals.

Els xocs ràpids fan dany segons velocitat relativa i masses, amb la immunitat original del tanc al dany directe de contacte. El tanc pot aixafar vehicles més lleugers. Les destruccions passen pel mateix sistema de dany, ocupants alliberats i explosions en cadena ja existent; les bicicletes continuen sense explotar. Un cooldown compartit evita repetir el dany immediat del mateix contacte.

Els vehicles terrestres/hover poden atropellar soldats/dianes durant tot el trajecte del pas de simulació. S’apliquen el llindar, el dany i la pausa de 0,35 s originals. No s’afegeix dany directe d’atropellament al company. Els estats i cooldowns són autoritatius i es desen al checkpoint. Pausa o inputs caducats aturen la conducció.

Recarregueu tots dos clients i inicieu una missió/camp nou (`relay:18`). Pendents: embestida destructiva de murs/filferrades, transport sobre ferri, accidents aeris complets amb sostres/rotors, impulsos/ferralla originals i campanya completa. Les col·lisions amb murs ara bloquegen també al camp de proves.

Validació: proves de mur prim a alta velocitat, separació per altura, mur obert, SAT, contacte entre vehicles, dany de les dues carrosseries, immunitat/aixafament del tanc, atropellament entre ticks, cooldown, absència de foc amic, bicicleta destruïda sense explosió, pausa i checkpoint. Passen 18 suites locals de lògica/interfície/flota/torretes i regressió; Three.js amb renderer substitut, sense validació GPU ni dos dispositius físics. Paquet del navegador regenerat i verificat. Les proves del hub continuen pendents de la dependència local `better-auth`.


## Embestida de murs i filferrades · relay:19

Vehicles terrestres poden obrir bretxes per contacte autoritatiu. Els llindars, la penalització de marxa enrere, la recuperació, la pèrdua de velocitat i el cost de carrosseria provenen del mode individual, extrets a `combat-rules.mjs` i consumits pels dos modes. També es comparteix el contacte amb el segment real de filferrada, evitant els falsos impactes de l’AABB ampla.

Valors originals: més de 16 m/s per filferrades i 22 m/s per murs; en marxa enrere, 5 m/s més. Camió contra filferro: més de 12 m/s, sense perdre vida ni velocitat. Tanc: excepció de força, sense cost de carrosseria i factor de velocitat 0,995. Altres vehicles perden 2 PV en filferro o 3 PV en murs, i conserven respectivament el 72% o 55% de velocitat. No es destrueixen peces marcades com a no embestibles.

Es reutilitza la destrucció estructural existent per eliminar de manera atòmica portes, brancals i llindes, comptar suports i actualitzar col·lisions, vista i checkpoint. Una embestida pot destruir també un vehicle fràgil; les bicicletes mantenen la destrucció sense explosió. Pausa i caducitat d’inputs conserven el comportament anterior. Cal recarregar tots dos clients i iniciar una missió/camp nou (`relay:19`).

Validació: prova específica dels llindars endavant/enrere, recuperació, excepcions de tanc/camió, filferro diagonal, mur no embestible, bretxes de mur/filferro, costos de vida, impacte letal, restauració i obertura atòmica real de l’edifici de proves. Passen també 18 suites de regressió. Paquet del navegador regenerat i verificat; servidor de sales, GPU i dos dispositius físics continuen sense nova validació.

### Pendent principal després d’aquest bloc

- Campanya completa: generació del món/complexos, objectius i entitats compartides; el relleu/camp continuen sent els escenaris jugables.
- IA amb navegació, persecució i coordinació; presoners, rescat i mecànic.
- Ferri amb vehicles a coberta, accidents aeris complets i altres contactes de l’entorn.
- Paritat visual i de maneig: animacions de conductors/armes, boques i orientació de les armes restants, visor real, càrrega de granada/C4 editable, efectes de runa i impulsos.
- Desaments cooperatius duradors/exportables, historial i política de versions.
- Prova real de dos navegadors/dispositius, Android, latència, rendiment i quotes del servidor; executar les proves de hub quan es disposi de `better-auth`.


## Món obert i complexos · v0.6.44 · relay:20

### Ús

A la pàgina cooperativa trieu **Món obert · exploració de l’arxipèlag**. Tots dos participants heu de seleccionar-la i prémer **Aplicar / reiniciar modalitat**. Repetir els dos vots genera un món nou; la reconnexió normal conserva el món i el checkpoint de la versió actual. Cal recarregar els dos clients després d’actualitzar: `relay:20` descarta checkpoints temporals incompatibles sense impedir l’obertura de la sala.

Es pot recórrer tot el mapa, a peu, nedant o amb els vehicles. No hi ha terminals obligatoris ni extracció de relleu. Es manté la sessió temporal de 30 minuts. E fa l’acció contextual, F dispara, B llança granades i Re Pàg / Av Pàg controlen els helicòpters. El zoom segueix el jugador i arriba a 64; a zoom baix es pot veure l’arxipèlag. El panell mostra coordenades i el complex més proper.

### Codi reutilitzat i geometria

- Illes i relleu complets amb `generateTerrainFoundation`, `createIslandLayout`, `rawTerrainAt`, nivells i adaptador físic originals. Dues mides de mapa.
- Famílies i variants dels `runtimeLayouts`, selecció amb `chooseCompoundLayout`, transformacions amb `compoundPoint`/`planCompound`, murs/portes/llindes/escales amb `shellColliders` i les funcions compartides. La base usa ara les dimensions de porta `STANDARD_BUILDING_DOOR`, també al relleu.
- 17 complexos en mida normal i 20 en mida gran: base, HQ, camp de presoners garantit, hangar, avançada, port militar, heliport, polvorí, comunicacions, moll civil, terminal de ferri i les tres famílies de poblats; més avançades/polvorins addicionals. Els emplaçaments són deterministes i validen reserva/separació/terra o costa. **No s’afirma paritat de posicions amb la mateixa llavor individual**: la seqüència completa de construcció individual encara no està extreta; es comparteixen terreny, dissenys i primitives.
- Edificis especials, dues filferrades del camp, molls físics i accessos, torres estàtiques, antenes i parabòliques. El model de torre s’ha extret d’`mkEn` a `tower-model.mjs` per usar-lo als dos modes; antenes/parabòliques usen `createCompoundStructures`.
- Búnquer amb sala superior i soterrani: mateixa variant derivada de llavor/lloc amb `bunkerBasementPlan`, escales, envans, portes elevables representades provisionalment com la resta de portes, llindes i forjat amb obertura. Es reutilitzen `bunkerFloorAt` i l’adaptador físic. El traçat cooperatiu ja distingeix el terra del soterrani del terreny superficial. Mobiliari, llums i seguiment de càmera del búnquer encara pendents de paritat visual.
- Vehicles, soldats i subministraments parteixen de les coordenades dels dissenys. La flota de les llavors provades té 31/34 vehicles, incloent embarcacions, ferri i helicòpter normal o de combat segons variant. Es comprova la fondària sota tota la planta de les embarcacions. Armes, munició, granades, farmacioles, disfressa, cisalla i C4 són recollibles amb el sistema autoritatiu existent; els franctiradors tenen munició separada.
- Conducció, aigua, vol, combat, reanimació, destrucció, xocs i embestides reutilitzen el mateix camí que el camp de proves. Geometria i col·lisions canòniques del servidor; els clients només envien intencions. No hi ha migracions, bindings ni dependències de servidor noves.

### Representació i límits

La vista mostra el relleu de l’arxipèlag, mar, complexos, molls i els models compartits de vehicles/personatges/torres/antenes. Retalla el terreny i l’aigua al volum del soterrani i dibuixa terra i graons. Si falla WebGL hi ha mapa Canvas amb altures canòniques mostrejades i noms dels complexos.

Encara no és la campanya individual completa en cooperatiu: falten l’objectiu del general i la victòria, els presoners/mecànic actius i la seva porta condicionada, defenses de torres amb IA, navegació/persecució avançada, ferri amb vehicles a coberta, fauna/vegetació i paritat visual detallada dels edificis/efectes. Els soldats conserven la IA del pilot. Les torres col·locades són estàtiques. Els subministraments de mapes/intel·ligència i paracaigudes encara no s’han integrat. La col·locació de ports/molls utilitza comprovacions pròpies de la modalitat sobre les dades originals; falta la paritat completa de rampes costaneres i trajectes de ferri.

### Validació

- 14 combinacions: llavors 0, 1, 3, 4, 67, 4294967295 i 2407759483, en les dues mides. Totes les famílies de complexos, identitats úniques, punts inicials lliures, dades finites, embarcacions/helicòpters, subministraments, búnquer, límits complets, pauses i checkpoints. Generació determinista repetida.
- Moviment autoritatiu fora de la zona antiga i ascens d’helicòpter en món obert. Traç de projectil al soterrani sense falsa col·lisió amb el terreny superficial.
- Entrada real del client simulat: vots amb `mode:world`, missió sense terminals, HUD/zoom/neteja; escenes Three.js del món amb geometries finites i terreny/torres/antenes, renderer substitut i Canvas alternatiu.
- Comparació amb la generació real individual de les quatre variants de base: portes, llindes, murs i escales. Harness actualitzat per carregar el model compartit de torres.
- 22 suites locals de lògica/interfície/regressió passen. Paquet del navegador regenerat, verificat i analitzat sintàcticament. Les mostres de configuració es mantenen sota el límit actual d’1 MB del canal del client.
- **Pendents**: execució nativa del hub/Worker (l’entorn local no té `better-auth`), desplegament Cloudflare, GPU/Android i dos dispositius físics; rendiment/latència/quotes sota ús real. Les mesures locals de generació no acrediten rendiment del Worker ni del navegador real.


## Paritat visual i vegetació compartida · v0.6.45 · relay:21

### Codi compartit en tots dos sentits

La distribució original s’ha extret de `vegetateSteps` a `vegetation-layout.mjs`: mateix mostreig, probabilitats, variació de palmeres, exclusió de complexos/escales/spawn, camps de roca i consum del generador aleatori. El mode individual també utilitza aquest mòdul; manté els registres TG/PL i la progressió del RNG, incloent la cerca de llavors. Un ajust del generador beneficia els dos modes.

Models de palmeres, arbustos i roques, instanciació, materials, colors, copes inclinades i LOD provenen de la mateixa fàbrica. `vegetation-visual-core.mjs`, `building-visual-core.mjs` i `material-profiles.mjs` adapten les fàbriques originals, que continuen carregables com a scripts clàssics per no trencar les previews. El bosc cooperatiu usa el perfil desktop original; el LOD segueix la posició del jugador.

El cooperatiu aporta la descripció compacta `geometry.vegetation`: estat inicial de RNG, spawn i reserves dels complexos, sobre el terreny i les estructures canòniques. Servidor i clients reconstrueixen les mateixes files i col·lisions amb el generador compartit. Els checkpoints i missatges no dupliquen milers de registres d’arbres. La recepta està validada i la generació es conserva en una memòria cau feble durant la vida del món; obrir una porta no torna a generar el bosc. **Aquesta representació encara no substitueix el format de desament individual**; és una peça reutilitzable per a una integració posterior.

### Canvis visibles

- Palmeres, arbustos i roques originals al món obert, amb instanciació i els tres nivells de detall de les palmeres. Les roques inclouen els grups i distribucions de costa/cims originals.
- Finestres i perfils PBR originals, cobertes arquejades dels hangars, cabanes de dos aiguavessos amb relleu de branques, forjats amb buit i escales interiors originals.
- Cobertes opaques a l’exterior; en entrar-hi, s’oculten per veure el personatge. Els forjats s’oculten segons la planta. La destrucció confirmada segueix tenint prioritat i no reapareixen peces en sortir de l’edifici.
- Filferrades amb la geometria original de pals, fils, diagonals i espines, compartida també amb el joc individual via `fence-visual-core.mjs`. El món obert divideix els perímetres en trams de fins a sis metres, amb alçades derivades del terreny i bretxes per tram.
- Neteja de geometries/instàncies en canviar de missió o passar a Canvas després d’una fallada de representació.

Recarregueu tots dos clients i inicieu un món nou. Generador temporal `relay:21`, sense migració dels checkpoints de versions anteriors.

### Validació i límits

S’ha executat el generador individual anterior (commit 29df8d6) sobre una configuració de referència i comparat amb el compartit. La prova conserva un SHA-256 del resultat: posicions, variants/tons, files de col·lisió, camps de roques i estat de RNG coincideixen. La mateixa configuració produeix 296 palmeres, 153 arbustos i 82 roques amb estat final 416447023.

En les dues mides, servidor, còpia JSON del client i snapshot generen la mateixa vegetació; hi ha col·lisió amb el tronc, es respecten els espais reservats i els missatges continuen sota el límit actual d’1 MB del client. Per a la llavor 67 les mostres locals tenen 3422/12011 palmeres, 1956/6545 arbustos i 1213/4359 roques (normal/gran); són recompte de contingut, no mesures de rendiment del navegador.

Passen 27 suites locals, incloent les proves individuals de copes, roques, batching i destrucció de dues plantes; l’escena Three.js cooperativa comprova instàncies, finestres, cobertes de cabana/hangar, filferrades i buffers finits. El renderer de prova és substituït: encara cal inspecció GPU/Android i amb dos dispositius reals. Paquet del navegador regenerat i verificat.

La vegetació és estàtica en cooperatiu en aquesta fase: les col·lisions del personatge es reprodueixen des de la recepta; encara no s’ha connectat el dany/tombament de palmeres ni tota la interacció dels vehicles amb vegetació/roques. També continuen pendents l’aigua/il·luminació i altres detalls visuals, la IA completa, presoners, general i la validació nativa del hub/Worker i del desplegament.
