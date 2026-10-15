# Fase 4 · recintes nous, variants i connexió base–costa

Dissenys iniciats a la revisió **0.4.25**, integrats a la revisió **0.5.13**, el 15 d’octubre de 2026. Disponibles a [Fase 4 del visor](../compounds-preview.html?fase=4). **32 maquetes de disseny**, més les vuit distribucions integrades per comparar V1/V2/V3/V4. Les dades viuen a `src/compound-phase4-layouts.mjs`; el generador comparteix els models del visor, amb quatre variants per complex militar i els nous recintes civils.

El selector «Catàleg» obre els quatre llocs nous, les variants de cada complex o la connexió costanera. Cada maqueta permet girar, apropar, veure la planta, amagar cobertes i mostrar circulació. L’URL conserva el recinte seleccionat.

## Recintes nous

| Tipus | Reserva orientativa | Distribució i ús |
|---|---|---|
| Embarcador civil | 110 × 120 m, incloent aigua | Caseta de pesca, cobert de xarxes, passera de 5 m amb capçal en T, barca de rems, windsurf i bicicleta. Càrrega manual i accés discret. |
| Terminal de ferri | 180 × 190 m, incloent aigua | Bitllets/espera, magatzem, carril de 14 m, cua lateral de 9 m i passeig separat de 5 m. Una plaça de ferri connectada a una rampa de 18 m. |
| Control de carretera | 130 × 140 m | Carretera contínua de 10 m, guàrdia lateral, barrera, cobert d’inspecció amb dues obertures i desviació per tornar a la via. Camí alternatiu a peu de 4 m. |
| Assentaments de cabanes | 110, 140 o 180 m de costat | Tres variants: 3, 5 o 8 habitatges, més una cabana comunal. Distribució irregular, portes en direccions diferents i un únic pas principal, sense cercle ni senders individuals. Finestres sense vidre a totes les cabanes. |

Els llocs civils no afegeixen guarnicions fixes ni una simulació de població civil. Cada terminal utilitza un dels **dos ferris totals** del mapa. Al joc, la passera segueix l’altura del ferri amarrat i es retira quan s’allunya; al visor és estàtica. La barrera del control es mostra abaixada: el comportament d’obertura/destrucció és pendent.

## Tres variants de cadascun dels vuit complexos

V1 conserva la distribució original. V1, V2 i V3 només tenen edificis d’una planta. V2 i V3 tenen distribucions pròpies, passos i reserves visibles. V4 conserva la distribució V1 i substitueix exactament un edifici per un model nou de dues plantes; la resta queden en una planta.

| Complex | V2 | V3 |
|---|---|---|
| Hangar | **Pati transversal:** hangar a ponent i taller més endarrerit a llevant | **Taller avançat:** hangar axial al fons, taller al costat de l’entrada i aparcament oposat |
| Avançada | **Caserna transversal:** dos edificis separats per un pati ample | **Guàrdia avançada:** caserna al fons de l’eix i guàrdia avançada a llevant |
| Port militar | **Moll central:** espigó únic de 8 m amb amarradors als dos costats | **Dàrsena oberta:** dos molls laterals de 7 m i boca central lliure |
| Heliport | **Fortificat amb torre:** helicòpter de combat, torre i servei al flanc oriental | **Servei en línia:** helicòpter normal a llevant i franja tècnica occidental |
| Polvorí | **Pati de càrrega ample:** magatzems separats i guàrdia avançada al flanc | **Guàrdia al fons:** magatzems paral·lels i control al final del corredor |
| Comunicacions | **Plataforma de carena:** només torre d’antena de 84 m a llevant; ràdio d’una planta a ponent | **Pati de ràdio:** només parabòlica de 27 m sobre la ràdio d’una planta, sense torre d’antena |
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

El joc cerca una costa navegable i un trajecte sobre terra des de l’entrada de la base fins a l’embarcador civil. El camí té 8 m d’amplada i un perfil objectiu màxim del 12%; la longitud s’adapta a l’orografia i pot superar la distància de la maqueta. El traçat reserva vegetació i evita les petjades dels edificis existents. L’embarcador inclou barca de rems, windsurf i bicicleta. La maqueta és una referència visual, no una plataforma de 220 × 400 m que s’aplani sencera.

La cerca és limitada i no constitueix una garantia per a totes les llavors possibles. Si no troba un corredor vàlid, registra `baseCoast.unavailable` sense construir una carretera que travessi l’aigua. S’han comprovat nou llavors en aquesta integració, inclosa una que requeria ampliar la cerca a 1.600 m.

## Revisió arquitectònica · 14 d’octubre de 2026

- Cabanes del poblat, embarcador civil i caseta costanera: mateix sostre de **dos aiguavessos**, frontons tancats i cobertura marró de branques amb relleu geomètric. Els feixos s’agrupen per material per reduir crides de dibuix.
- Decoració comprovada amb la seva petjada completa, incloent la tela de les banderes: dins la filferrada o els límits del recinte. Si un trasllat heretat deixa una peça fora, es recol·loca en espai lliure de rutes, edificis, vehicles, torres i rotors. No s’eliminen peces.
- **Només V4** té un edifici de dues plantes, segons la taula següent. V1/V2/V3 són d’una planta. Escala, forjat, col·lisions, persecució enemiga i retirada del suport en destruir-se la coberta estan integrats.
- **Els magatzems convencionals no tenen finestres ni segona planta**. Per la revisió posterior, totes les cabanes de fusta, també les comunals i d’emmagatzematge civil, tenen obertures amb marcs però sense vidre. Els hangars i el búnquer no s’eleven.
- Comunicacions V2/V3 especialitzades i ampliades un 50%; V2 sense cap parabòlica, V3 sense torre d’antena.

Els models arquitectònics es comparteixen entre joc i visor mitjançant `compound-architecture.mjs`. `compound-runtime-layouts.mjs` exclou els controls de carretera i la maqueta base–costa del catàleg de generació.

### Ampliació: assentaments i V4

Al selector «Assentaments · 3 mides» hi ha el poblat petit (3 habitatges + comunal), mitjà (5 + comunal) i gran (8 + comunal). Les cabanes es giren com a conjunt: parets, sostre, finestres i porxo. No formen un cercle i no hi ha camins individuals des de cada porta. Totes les cabanes de fusta de qualsevol maqueta tenen finestres obertes sense vidre.

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

## Estat de les fases acordades

| Fase | Estat |
|---|---|
| 1 · Arquitectura i plantes | Integrada; models compartits, escales, forjat, col·lisions i destrucció |
| 2 · Connexió base–costa | Cerca de costa i traçat segons terreny implementats |
| 3 · Embarcadors i poblats | Integrats; poblats de 3, 5 o 8 habitatges més cabana comunal |
| 4 · Terminals de ferri | Integrades amb passera mòbil i dos ferris totals |
| 5 · Controls de carretera | **Ajornada expressament: només disseny** |
| 6 · Variants militars | V1–V4 seleccionades per llavor; només V4 té dues plantes |
| 7 · Validació | Generació, arquitectura i rampes comprovades; navegador d’escriptori i mòbil emulat sense errors. Sessió en Android físic pendent |

Les comprovacions de generació i col·lisions es concentren a `tests/compound-generation.cjs`. No s’han restaurat les antigues bateries eliminades ni afegit workflows automàtics costosos. La prova de navegador no certifica rendiment en Android físic ni totes les llavors possibles.

## Camins · revisió 0.5.15

`compound-paths.mjs` genera una única superfície per xarxa, dividida en sectors de 48 m. Les polilínies tenen transicions arrodonides als girs; les cruïlles comparteixen la mateixa malla sense acumular plans. El color es fon amb el terra a les vores i als extrems lliures; les connexions entre rutes conserven la continuïtat. Els vèrtexs segueixen el terreny físic i els triangles visibles, amb actualització només quan canvia el LOD del sector. La reserva de vegetació segueix també els girs. El joc i tots els previews utilitzen el mateix generador.

Comprovació dirigida: `node tests/compound-paths.cjs` (girs, cruïlles, transparència, extrems i canvi d’altura). Revisió visual de navegador al visor i en un mapa real.
