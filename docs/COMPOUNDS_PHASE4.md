# Fase 4 · recintes nous, variants i connexió base–costa

Dissenys de la revisió **0.4.25**, 13 d’octubre de 2026. Disponibles a [Fase 4 del visor](../compounds-preview.html?fase=4). **21 maquetes noves**, més les vuit distribucions integrades per comparar V1/V2/V3. Les dades viuen a `src/compound-phase4-layouts.mjs`; el catàleg del generador continua tenint els vuit tipus aprovats.

El selector «Catàleg» obre els quatre llocs nous, les variants de cada complex o la connexió costanera. Cada maqueta permet girar, apropar, veure la planta, amagar cobertes i mostrar circulació. L’URL conserva el recinte seleccionat.

## Recintes nous

| Tipus | Reserva orientativa | Distribució i ús |
|---|---|---|
| Embarcador civil | 110 × 120 m, incloent aigua | Caseta de pesca, cobert de xarxes, passera de 5 m amb capçal en T, barca de rems, windsurf i bicicleta. Càrrega manual i accés discret. |
| Terminal de ferri | 180 × 190 m, incloent aigua | Bitllets/espera, magatzem, carril de 14 m, cua lateral de 9 m i passeig separat de 5 m. Una plaça de ferri connectada a una rampa de 18 m. |
| Control de carretera | 130 × 140 m | Carretera contínua de 10 m, guàrdia lateral, barrera, cobert d’inspecció amb dues obertures i desviació per tornar a la via. Camí alternatiu a peu de 4 m. |
| Assentament de cabanes | 140 × 140 m | Cinc cabanes i magatzem comunal de fusta, porxos, plaça amb pou, bancs i senders de 4–5 m. Moto i bicicleta; farmaciola al magatzem. |

Els llocs civils no afegeixen guarnicions fixes ni una simulació de població civil. La terminal ha de reservar un dels **dos ferris totals** del mapa, no incrementar-ne el nombre. La seva rampa necessita una connexió física amb la coberta mòbil en la integració; aquesta maqueta és estàtica. La barrera del control es mostra abaixada: el comportament d’obertura/destrucció és pendent.

## Dues variants de cadascun dels vuit complexos

V1 és sempre la distribució ja integrada. V2 i V3 tenen distribucions pròpies, passos i reserves visibles.

| Complex | V2 | V3 |
|---|---|---|
| Hangar | **Pati transversal:** hangar a ponent i taller més endarrerit a llevant | **Taller avançat:** hangar axial al fons, taller al costat de l’entrada i aparcament oposat |
| Avançada | **Caserna transversal:** dos edificis separats per un pati ample | **Guàrdia avançada:** caserna al fons de l’eix i guàrdia avançada a llevant |
| Port militar | **Moll central:** espigó únic de 8 m amb amarradors als dos costats | **Dàrsena oberta:** dos molls laterals de 7 m i boca central lliure |
| Heliport | **Fortificat amb torre:** helicòpter de combat, torre i servei al flanc oriental | **Servei en línia:** helicòpter normal a llevant i franja tècnica occidental |
| Polvorí | **Pati de càrrega ample:** magatzems separats i guàrdia avançada al flanc | **Guàrdia al fons:** magatzems paral·lels i control al final del corredor |
| Comunicacions | **Plataforma de carena:** ràdio a ponent, antena a llevant; criteri d’emplaçament elevat accessible | **Pati de ràdio:** ràdio al fons, antena occidental i servei tècnic oriental, al voltant d’un pati |
| Base inicial | **Plaça oberta:** tres serveis al fons i plaça de sortida ampla | **Serveis esglaonats:** infermeria avançada, caserna/magatzem al fons i aparcament a llevant |
| HQ | **Búnquer oriental:** suport a ponent i pati central ample | **Doble pati:** búnquer occidental, caserna al nord i serveis avançats a llevant |

### Condicions conservades

- Avançades amb filferrada i **dues obertures**.
- Polvorins amb **bazooka i rifle de franctirador garantits**, a més de la resta de subministraments.
- Comunicacions amb **els tres mapes**, antena de 56 m i parabòlica de 18 m sobre la sala de ràdio. La carena es presenta en una plataforma plana: la selecció del terreny elevat encara s’ha d’implementar.
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

## Validació i següent fase

`tests/compound-phase4.cjs` comprova les 21 maquetes: geometria finita, vehicles separats dels edificis, recorreguts fora dels interiors, reserva dels rotors, contingut garantit i exclusió del catàleg del joc. El visor s’ha comprovat amb Chromium/WebGL en escriptori i emulació mòbil: 29 escenes comptant les vuit V1, planta, interiors, etiquetes i zoom. Això no certifica el rendiment en Android físic.

La següent fase és integrar primer el cercador de costa i la connexió amb la base; després els recintes civils i la terminal, els controls sobre camins reals i, finalment, la selecció de variants per llavor. Cal conservar límits globals de vehicles, reserves de maniobra, col·lisions i objectes garantits. Els dissenys actuals **encara no es generen durant les partides**.
