# Alliberament físic del camp de presoners — v0.5.85

L'objectiu de rescat ja no depèn de prémer **E** en una porta concreta.
El jugador ha de complir **les dues condicions** següents:

1. Neutralitzar tots els defensors del camp: els **quatre soldats patrullers, els dos sentinelles i les quatre torres**. Si queda una sola unitat viva, no s'activa el rescat.
2. Obrir un forat **real a la filferrada del recinte interior**: es pot tallar amb la cisalla, destruir amb explosius o trencar amb un vehicle. Obrir només la tanca exterior no compta.

Quan es compleixen, el sistema allibera automàticament els captius, sense tecla addicional ni requisit de proximitat del jugador. El forat pot estar en qualsevol tram interior, inclosa la porta si ha estat físicament destruïda. La porta intacta **no** s'obre com per art de màgia.

## Comportaments

- Els presoners captius que detecten el jugador a prop alcen els braços i l'animen abans de ser alliberats. La filferrada no impedeix que el vegin, i es mostra un missatge únic.
- Els supervivents s'aixequen i caminen per la **bretxa real**, triant el recorregut en funció del costat obert, cap a l'única sortida exterior. Si hi ha diverses bretxes, prioritzen la que és més propera a l'antiga porta per reduir obstacles.
- Els quatre camperols s'evacuen. L'únic mecànic es dirigeix a la badia exterior; quan hi arriba pot seguir el jugador a peu o reparar vehicles danyats i aturats mitjançant la interacció existent. No repara automàticament ni fa recàrregues de munició.
- No es pot obtenir l'alliberament eliminant guàrdies d'altres complexos, tallant tanques exteriors o deixant enrere torres intactes.
- Els models civils comparteixen un nou conjunt de geometries de baixa poligonització amb torsos arrodonits, mans, colzes, cames diferenciades, cabells, nassos, orelles, ulls, barrets i roba individualitzada. Mantenen l'alçada real del protagonista, l'escala de la postura asseguda i la física de dany.

## Taller mecànic v0.5.86

El recinte incorpora un edifici industrial de **24 × 24 m i 12 m d'alçada**, sense planta intermèdia. Disposa de **tres parets físiques** (fons i laterals) i una **façana sud totalment oberta** per accedir-hi directament amb camions i altres vehicles terrestres. Té una coberta, marques de seguretat al paviment, armaris d'eines i un banc de treball retirat del recorregut principal.

El punt de treball del mecànic és a **(40,16)** en coordenades locals del camp, al costat est de la nau; el centre d'aparcament resta a **(33,16)**. L'itinerari després del rescat travessa l'entrada pel sud amb punts **(33,36) → (40,30) → (40,16)**, sense travessar les parets. L'entrada no genera graons, porta, llinda ni col·lisions ocultes. L'acció de reparar i la seva durada de sis segons no canvien.

## Implementació

- `src/compound-generation.js` conserva els colliders individuals de la filferrada interior fins i tot si desapareixen del conjunt global després d'una explosió o d'un tall, i registra les quatre torres en el mateix camp.
- `src/prisoners.js` consulta en cada actualització els defensors vius i les bretxes físiques, desencadena el rescat, calcula la ruta per la bretxa i anima els civils. La reparació conserva les condicions de seguretat originals.
- `tests/phase11-prisoners.cjs`, `tests/camp-redesign-independent.cjs`, `tests/phase11-independent.cjs` i `tests/prison-camp-guarantee-independent.cjs` es modifiquen per provar el contracte nou. El cas físic inclou una bretxa lateral, no sols l'antiga porta.

Els tests amb el harness de Three.js comproven la lògica però no substitueixen una validació visual en WebGL i Android físic. La versió passa de 0.5.84 a 0.5.85.
