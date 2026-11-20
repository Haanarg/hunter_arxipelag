# Hunter · Auditoria de correccions d'escala

## Criteri de treball

No s'elimina cap factor sense preservar les dimensions mundials, les coordenades dels pivots, les boques de foc, les rodes, els seients i els volums físics. Cal distingir **mida intrínseca de model** de **conversió legítima d'unitats** (`vehicleSpecs.scales`) i de **transformació animada**. Un factor dinàmic de moviment no és una correcció històrica de mida.

`node tools/audit-model-scales.cjs` inspecciona exhaustivament tots els .js/.mjs/.cjs sota `src/`, sense excloure models o geometries grans. Comprova també que no es reintrodueixin els pegats que ja hem eliminat.

## Correccions consolidades en la geometria de base

| Model | Ajust posterior anterior | Estat |
|---|---|---|
| T-90M | Model de laboratori ×1,5 + model de joc ×2, amb metadades d'eruga independents | ×1,5 integrat a la geometria i les dades de les erugues; ×2 segueix sent conversió mundial a la fàbrica de vehicles i queda consolidat abans de lliurar el model |
| GAZ Tigr-M | `car.scale=1.25`, `gazVisualScale` i factor de col·lisió genèric | Dimensions aprovades de la carrosseria integrades a la fàbrica de referència; perfil físic `GAZ_TIGR_COLLISION` amb amplada, longitud, radi i alçades concretes |
| Camió A4.3 | `truck.scale=0.82`, `truckVisualFit` i multiplicacions dels seients enemics | Geometria i pivots canònics; posicions de cabina declarades a `TRUCK_CABIN`; rodes i ocupants comparteixen la mida real |
| Pilots i figures decoratives de cabina | `pilot.scale *= 1.30/humanHeight` després de crear el model | Variant d'alçada nativa 1,30 produïda per `createHumanProposal`, amb rig i malles a escala unitària |
| Protagonista V18, comparador i pilots bicicleta/moto | `visual.scale=1.6` i reescalat manual del pilot | **v0.6.254:** les geometries es creen de base a 3.11232 unitats amb escala d'arrel 1 |

## Migració incremental del protagonista · v0.6.258

L'objectiu de l'IK de pistola de `characters.js` ara neix de les articulacions reals del V18: posició mundial de l'espatlla dreta i del tors, longituds natives de braç i avantbraç i vector suavitzat d'apuntat. El controlador antic només rep aquest objectiu transformat al seu espai local per compatibilitat; s'ha eliminat el punt històric `(0, 3.10, -1.13)` del camí habitual del protagonista. La regressió SOURCE/BUNDLE verifica que el destí del controlador coincideix amb l'objectiu V18 i es manté sota el cap.

**No s'ha retirat encara** el grup de control `2/3` ni les IK de fusells i bazuca: necessiten migrar els grips, boques de foc, física i cinemàtiques abans de suprimir-lo. Això és el primer tall de la fase 1, no la fase completa.

## Referències trobades, NO eliminades encara perquè alteren altres contractes

| Codi | Situació | Migració necessària |
|---|---|---|
| `human-game-runtime-v17.mjs`: `LEGACY_GAME_RIG_SCALE=2/3` | Rig antic ocult d'armes/IK i pell V18 visible; s'usen espais locals diferents | Migrar les armes i les mans a un únic rig V18 i recalcular grips, seients, canons i física; abans d'això suprimir el 2/3 pot reintroduir les mans sobre el cap |
| `rider.js`: `.825`, `.82`, `.63` i `1/riderScale` | Reescala tot el model del passatger segons vehicle durant la partida | Figures natives de cabina/seient i ancoratges físics llegits del model, amb IK i COOP adaptats |
| `vehicle-model-core.mjs`: `BICYCLE_VISUAL_SCALE=.74`, `MOTORCYCLE_VISUAL_SCALE=1.24` | Mida fixa aplicada abans de `bakeFixedModelScales` | Integrar els dos valors als generadors de bicicleta i streetfighter; actualment els models lliurats ja tenen arrel a 1 |
| `vehicle-model-core.mjs`: `hover.scale=(1.28,1,1.20)` | Escala no uniforme i cabina amb posicions compensades; no commuta amb rotació del ventilador | Generar nativament un hovercraft amb l'amplada/llargada aprovades, incloent les aspes animades i els ancoratges, sense shear |
| `ka60-runtime.mjs`: `KA60_WORLD_SCALE/vehicleScale` | Relació entre candidat Ka60 i VS del joc | Consolidar el prototip i normalitzar simultàniament seients, rotors i geometria de col·lisió |
| `game-core.js`: `visualScale=1.5/1.1` pels helicòpters | Contacte amb terreny/teulades obtingut per factors històrics, no per malles | Derivar volum de col·lisió de fuselatge i rotor del model aprovat |
| `characters.js` i `general-model.js`: `fit*0.8` en comandos i general | Factor de generació de personatges antics vinculat als pivots i als enemics | Produir els soldats/generals amb el rig anatòmic V18 final, conservant dany, ragdoll, COOP i presa d'armes |
| `enemy-ai.js`: models de tripulants `scale=.31/.43/.52` | Figures enemigues dependents del vehicle; la geometria de la tripulació encara canvia després de la creació | Fàbriques natives per tipus de vehicle i IK de passatger sense escalats de l'arrel |
| `vehicle-model-core.mjs`: models llunyans GAZ ×1,25 | La malla proxy, no el vehicle complet, encara es retoca a posteriori | Fer un LOD natiu de les dimensions del GAZ i comparar-ne el contorn amb el model complet |
| `human-game-runtime-v17.mjs` / `human-weapon-preview.mjs`: proxies d'armes escalats | Proxies muntats a canells d'escales diferents | Compartir geometria i punts d'ancoratge real entre partida i editor |

## Variacions legítimes no candidates a eliminació

- Escala de partícules, esquitxos i explosions segons el temps d'animació.
- Escala anatòmica de primitives (esferes, cilindres, dits) durant la construcció de geometria.
- `vehicleSpecs.scales`: relació de les dimensions de cada vehicle amb les unitats mundials; `bakeFixedModelScales` la consolida als Object3D abans de publicar-los.
- Escala aleatòria de vegetació, roques i decoració: variació procedural de cada exemplar, no una correcció tardana del model aprovat.
- Escala física dependent de dany o desintegració de models, si forma part de l'efecte.

**La migració pendent no es pot fer amb un cercar/substituir de multiplicadors:** desalinearia animacions i col·lisions. L'auditoria es manté oberta fins que els casos de la taula tinguin mides natives i regressions verificades visualment.
