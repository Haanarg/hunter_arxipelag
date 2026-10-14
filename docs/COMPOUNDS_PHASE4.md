# Fase 4 · recintes nous, variants i connexió base–costa

Dissenys iniciats a la revisió **0.4.25**, actualitzats el 14 d’octubre de 2026. Disponibles a [Fase 4 del visor](../compounds-preview.html?fase=4). **32 maquetes de disseny**, més les vuit distribucions integrades per comparar V1/V2/V3/V4. Les dades viuen a `src/compound-phase4-layouts.mjs`; el catàleg del generador continua tenint els vuit tipus aprovats.

El selector «Catàleg» obre els quatre llocs nous, les variants de cada complex o la connexió costanera. Cada maqueta permet girar, apropar, veure la planta, amagar cobertes i mostrar circulació. L’URL conserva el recinte seleccionat.

## Recintes nous

| Tipus | Reserva orientativa | Distribució i ús |
|---|---|---|
| Embarcador civil | 110 × 120 m, incloent aigua | Caseta de pesca, cobert de xarxes, passera de 5 m amb capçal en T, barca de rems, windsurf i bicicleta. Càrrega manual i accés discret. |
| Terminal de ferri | 180 × 190 m, incloent aigua | Bitllets/espera, magatzem, carril de 14 m, cua lateral de 9 m i passeig separat de 5 m. Una plaça de ferri connectada a una rampa de 18 m. |
| Control de carretera | 130 × 140 m | Carretera contínua de 10 m, guàrdia lateral, barrera, cobert d’inspecció amb dues obertures i desviació per tornar a la via. Camí alternatiu a peu de 4 m. |
| Assentaments de cabanes | 110, 140 o 180 m de costat | Tres variants: 3, 5 o 8 habitatges, més una cabana comunal. Portes orientades cap a la plaça i senders radials connectats a un camí circular. Finestres sense vidre a totes les cabanes. |

Els llocs civils no afegeixen guarnicions fixes ni una simulació de població civil. La terminal ha de reservar un dels **dos ferris totals** del mapa, no incrementar-ne el nombre. La seva rampa necessita una connexió física amb la coberta mòbil en la integració; aquesta maqueta és estàtica. La barrera del control es mostra abaixada: el comportament d’obertura/destrucció és pendent.

## Tres variants de cadascun dels vuit complexos

V1 conserva la distribució ja integrada, amb la revisió arquitectònica del visor encara pendent de traslladar al joc. V2 i V3 tenen distribucions pròpies, passos i reserves visibles. V4 conserva la distribució V1 i substitueix exactament un edifici per un model nou de dues plantes; la resta queden en una planta.

| Complex | V2 | V3 |
|---|---|---|
| Hangar | **Pati transversal:** hangar a ponent i taller més endarrerit a llevant | **Taller avançat:** hangar axial al fons, taller al costat de l’entrada i aparcament oposat |
| Avançada | **Caserna transversal:** dos edificis separats per un pati ample | **Guàrdia avançada:** caserna al fons de l’eix i guàrdia avançada a llevant |
| Port militar | **Moll central:** espigó únic de 8 m amb amarradors als dos costats | **Dàrsena oberta:** dos molls laterals de 7 m i boca central lliure |
| Heliport | **Fortificat amb torre:** helicòpter de combat, torre i servei al flanc oriental | **Servei en línia:** helicòpter normal a llevant i franja tècnica occidental |
| Polvorí | **Pati de càrrega ample:** magatzems separats i guàrdia avançada al flanc | **Guàrdia al fons:** magatzems paral·lels i control al final del corredor |
| Comunicacions | **Plataforma de carena:** només torre d’antena de 84 m a llevant; ràdio de dues plantes a ponent | **Pati de ràdio:** només parabòlica de 27 m sobre la ràdio de dues plantes, sense torre d’antena |
| Base inicial | **Plaça oberta:** tres serveis al fons i plaça de sortida ampla | **Serveis esglaonats:** infermeria avançada, caserna/magatzem al fons i aparcament a llevant |
| HQ | **Búnquer oriental:** suport a ponent i pati central ample | **Doble pati:** búnquer occidental, caserna al nord i serveis avançats a llevant |

### Condicions conservades

- Avançades amb filferrada i **dues obertures**.
- Polvorins amb **bazooka i rifle de franctirador garantits**, a més de la resta de subministraments.
- Comunicacions amb **els tres mapes**: V1 conserva antena de 56 m i parabòlica de 18 m; V2 només antena de 84 m i V3 només parabòlica de 27 m. La carena es presenta en una plataforma plana: la selecció del terreny elevat encara s’ha d’implementar.
- Heliports amb un radi de 22 m lliure de construccions, i paracaigudes garantit.
- HQ amb búnquer de parets inclinades, porta acumulativa de 10 segons, quatre torres, general, vuit soldats, dues tanquetes i dos jeeps de patrulla. **Sense tanc aparcat.** Porta i patrulles estàtiques al visor.
- Base sense enemics, amb cotxe, bicicleta, munició i farmaciola.
- La llanxa llançacoets dels ports és la plaça de la variant especial: continua limitada a **una unitat per mapa**.

## Connexió base–costa

La maqueta inclou la base completa i un recorregut continu fins a un embarcador. La reserva de la composició és de 220 × 400 m; no és una petjada que s’hagi d’aplanar sencera al joc.

1. **Sortida de la base:** conservar el pas de 16 m i connectar-lo a un camí rodat de 8 m.
2. **Descens:** cercar un trajecte real de 150–350 m, amb pendent objectiu màxim del 10%, girs practicables i franja lliure d’edificis, arbres i tanques. La polilínia dibuixada és una proposta de circulació, no un traçat fix per a totes les llavors.
3. **Drecera a peu:** sender de 3 m amb sortida de nou al camí, sense obligar a travessar l’aigua ni les instal·lacions militars.
4. **Arribada:** espai de gir/aparcament de 24 × 18 m, caseta de 18 × 14 m i passera de 6 m.
5. **Embarcació:** proposar barca de rems garantida; la llanxa de la maqueta representa l’alternativa. El generador haurà d’escollir-ne una i garantir una sortida navegable.

Si el terreny no admet la connexió, s’ha de cercar una altra costa o moure la parella base/embarcador. Cal validar el recorregut complet amb les col·lisions del jugador i del vehicle abans d’acceptar l’emplaçament. El control de carretera necessita la mateixa xarxa de camins, però no s’ha de col·locar obligatòriament en aquesta primera ruta de la base.

## Revisió arquitectònica · 14 d’octubre de 2026

- Cabanes del poblat, embarcador civil i caseta costanera: mateix sostre de **dos aiguavessos**, frontons tancats i cobertura marró de branques amb relleu geomètric. Els feixos s’agrupen per material per reduir crides de dibuix.
- Decoració comprovada amb la seva petjada completa, incloent la tela de les banderes: dins la filferrada o els límits del recinte. Si un trasllat heretat deixa una peça fora, es recol·loca en espai lliure de rutes, edificis, vehicles, torres i rotors. No s’eliminen peces.
- Un edifici de **dues plantes** per complex militar: taller de l’hangar, caserna de l’avançada, oficina del port, control de l’heliport, guàrdia del polvorí, ràdio, caserna de la base i caserna del HQ. També guàrdia del control de carretera. Finestres als dos nivells, escala interior i forat al forjat; «Veure interiors» retira també el forjat superior.
- **Els magatzems convencionals no tenen finestres ni segona planta**. Per la revisió posterior, totes les cabanes de fusta, també les comunals i d’emmagatzematge civil, tenen obertures amb marcs però sense vidre. Els hangars i el búnquer no s’eleven.
- Comunicacions V2/V3 especialitzades i ampliades un 50%; V2 sense cap parabòlica, V3 sense torre d’antena.

Aquesta revisió s’aplica als **previews**, incloses les distribucions V1. `compound-preview-refinements.mjs` prepara còpies de les dades, sense alterar les distribucions del generador ni el joc publicat. La versió del joc no canvia per aquesta revisió del visor.

### Ampliació: assentaments i V4

Al selector «Assentaments · 3 mides» hi ha el poblat petit (3 habitatges + comunal), mitjà (5 + comunal) i gran (8 + comunal). Les cabanes es giren com a conjunt: parets, sostre, finestres i porxo. Els senders parteixen de les portes girades; no es reutilitzen camins que apuntin a la façana antiga. Totes les cabanes de fusta de qualsevol maqueta tenen finestres obertes sense vidre.

| V4 | Edifici substituït per dues plantes |
|---|---|
| Hangar | Taller |
| Avançada | Guàrdia |
| Port militar | Oficina |
| Heliport | Control de vol |
| Polvorí | Guàrdia |
| Comunicacions | Servei tècnic |
| Base inicial | Infermeria |
| HQ | Serveis |
| Control de carretera | Guàrdia |

La V4 utilitza una façana verd gris clar, dos pisos de 5,4 m, escala interior i terrat amb ampit. Substitueix l’edifici dins la mateixa petjada, conserva els objectes garantits i no n’afegeix un de nou al pati. La V4 del control es troba a «Llocs nous». Les V2/V3 anteriors es mantenen disponibles.

## Validació i següent fase

Durant el desenvolupament es van verificar les 32 maquetes (la prova especialitzada ja s'ha retirat del repositori): geometria finita, vehicles separats dels edificis, recorreguts fora dels interiors, reserva dels rotors, contingut garantit i exclusió del catàleg del joc. També comprova les caixes 3D reals de tota la decoració de les 40 escenes, magatzems convencionals sense finestres, cabanes amb carena i obertures sense vidre, segones plantes i exclusivitat de les antenes V2/V3. El visor s’ha comprovat amb Chromium/WebGL en escriptori i emulació mòbil: 40 escenes comptant les vuit V1, planta, interiors, etiquetes i zoom. Això no certifica el rendiment en Android físic.

La següent fase és integrar primer el cercador de costa i la connexió amb la base; després els recintes civils i la terminal, els controls sobre camins reals i, finalment, la selecció de variants per llavor. Cal conservar límits globals de vehicles, reserves de maniobra, col·lisions i objectes garantits. Els dissenys actuals **encara no es generen durant les partides**.
