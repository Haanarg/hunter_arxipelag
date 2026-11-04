# Camp de presoners obligatori — v0.5.83

## Problema corregit

En v0.5.82, el camp es cercava després de totes les altres reserves. La cerca tenia un nombre finit d’emplaçaments i podia retornar `prisonCampUnavailable` sense impedir que la partida comencés. Les mostres inicials no demostraven que totes les generacions tinguessin camp.

La revisió no ha reproduït la partida concreta de l’usuari, de la qual no es coneix la llavor. Sí que ha reproduït el defecte de contracte: amb els candidats naturals rebutjats, el generador anterior esgotava 6.682 intents i continuava sense cap camp.

## Garantia de generació

1. El generador construeix la base i el quarter general i reserva immediatament **un camp de presoners**, abans de la costa, els poblats i els altres complexos.
2. Cerca determinista d’una superfície seca i prou plana. Examina també l’envolupant de transició de la plataforma i la sortida dels presoners.
3. Si només troba un emplaçament sec amb massa desnivell, prepara una terrassa contínua. La franja plana de fugida arriba fins a z98 local, més enllà de l’últim punt d’evacuació z86.
4. Si tots aquests candidats fallen, crea una illa de reserva de radi 320 m a l’origen. Aquesta alternativa no depèn de trobar terreny natural. No consumeix `R()` ni canvia la llavor per solucionar l’absència del camp.
5. La reserva del camp i els corredors dels NPC impedeixen que els altres emplaçaments, la carretera base–costa o els vehicles inicials bloquegin les seves rutes.
6. Abans de donar el món per preparat, els dos camins d’inici comproven un registre de camp únic, quatre camperols i un mecànic amb vida i coordenades vàlides. En mode físic, els models han d’estar units al món. Si hi ha dades corruptes, s’interromp l’inici i queda disponible el reintent; no s’accepta una partida incompleta.

La presència del camp és obligatòria; el rescat continua sent una activitat opcional. Els marcadors continuen requerint descoberta, de manera que no veure una P al mapa encara no demostra que el camp no existeixi.

## Per què l’últim recurs queda separat

Amb els paràmetres actuals de `genIslands`, el centre de cada illa inicial/HQ és com a mínim a `sqrt(2) × 1000` m de l’origen a escala 1. `landSteps` es desplaça com a màxim `0,75 × 680` m. Per tant, la base i l’HQ queden a més de 904 m de l’origen; a escala 2 la separació mínima és encara més gran.

La influència màxima de l’illa de reserva és de 640 m. Sumada a la reserva de l’HQ més gran actual, 210,92 m, i al marge de 34 m, és inferior a 885 m. Es comproven les distàncies reals abans d’afegir l’illa, perquè una ampliació futura del generador o dels layouts no vulneri silenciosament aquesta condició.

El nucli sec conservador de l’illa té radi 112 m amb el relleu actual. Les cantonades del pad del camp són a menys de 98 m, i l’extrem de la franja d’evacuació és a menys de 100 m. La plataforma i les rutes queden sobre aquest nucli; el terreny de l’illa aporta una costa real al seu voltant. No s’afegeix cap illa en els casos naturals.

## Proves

- `npm run test:camp`: branques del planner, ocupació, cancel·lació, cinc NPC, camins reals, recuperació, paritat síncrona/progressiva i revisió independent.
- `npm run test:camp:stress`: **1.024 llavors úniques × dues mides de mapa = 2.048 construccions reals fins al checkpoint del camp**. Inclou 0, 1, 67, 12345 i el màxim de 32 bits. La resta és una seqüència pseudoaleatòria reproduïble.
- `HUNTER_TEST_BUNDLE=1 node tests/prison-camp-guarantee-independent.cjs --quick`: revisió del paquet final. Omet les mostres de presència ja exercitades en fonts, però conserva fallbacks, validador, món complet i recuperació.
- `HUNTER_TEST_BUNDLE=1 node tests/phase11-camp-generation.cjs --physical`: portes, camió, NPC i sortides del cas físic 67/1.

La passada de 2.048 casos ha completat tots els camps en emplaçament natural, sense canviar la llavor efectiva entre la base/HQ i el camp. Els casos forçats proven separadament la terrassa i l’illa de reserva, incloent les dues mides, evacuació real, paritat progressiva i preservació de la base/HQ.

La revisió independent comprova també deu corrupcions d’estat abans d’activar la partida, la continuació de `R()`, la viabilitat local de la missió de la llavor 67 i el reintent després d’un error en construir el camp.

No s’han enumerat els més de quatre mil milions de valors de llavor. La garantia es basa en la reserva, l’últim recurs determinista i el validador d’activació; el mostreig és una comprovació addicional. Three.js s’exercita amb renderer simulat: la comprovació visual i de rendiment en Android físic continua pendent. Els resultats de publicació històrics es poden consultar a l'historial Git de `PROGRESS.MD`; les comprovacions vigents són a [to-do.MD](../to-do.MD).
