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
| Ka-60 variant A i pilots | Candidat ×2 i posterior `KA60_WORLD_SCALE/vehicleScale`, amb els pilots heretant l'escala del pare | **v0.6.261:** mida ×2 del candidat integrada a geometria/pivots natius, runtime amb arrel 1 i conversió de VS integrada abans de crear els dos pilots; seients i alçades de pilots natius en unitats de cabina |

## Migració incremental del protagonista · v0.6.258

L'objectiu de l'IK de pistola de `characters.js` ara neix de les articulacions reals del V18: posició mundial de l'espatlla dreta i del tors, longituds natives de braç i avantbraç i vector suavitzat d'apuntat. El controlador antic només rep aquest objectiu transformat al seu espai local per compatibilitat; s'ha eliminat el punt històric `(0, 3.10, -1.13)` del camí habitual del protagonista. La regressió SOURCE/BUNDLE verifica que el destí del controlador coincideix amb l'objectiu V18 i es manté sota el cap.

**No s'ha retirat encara** el grup de control `2/3` ni les IK de fusells i bazuca: necessiten migrar els grips, boques de foc, física i cinemàtiques abans de suprimir-lo. Això és el primer tall de la fase 1, no la fase completa.

## Migració parcial de suport d'armes llargues · v0.6.259

Les dues mans V18 del fusell AEK-971, el rifle SV-98 i el bazuca ara fan IK directament sobre **els grips reals del model visible**. L'arma s'ancora al tors canònic V18 i la mà dreta es dirigeix al gallet a una distància derivada dels ossos natius, sense dependència circular del canell. L'esquerra arriba fins al guardamà i cap articulació canvia d'escala. Les còpies visuals d'aquestes armes integren l'escala fixa en geometria i pivots (`scale=1` a l'arrel), sense modificar-ne la mida o la balística. Els ancoratges del fusell d'assalt ja tenen identitat pròpia.

El controlador físic antic `2/3`, la balística, l'IK invisible de compatibilitat i els sistemes de seient continuen **no migrats**. Els trets surten exactament dels mateixos punts que a la versió anterior; no es reivindica encara paritat visual del canó en moviment.

## Consolidació de les armes visibles · v0.6.260

La pistola, els fusells, el bazuca, el ganivet, la granada i les cisalles del protagonista V18 fan el bake dels factors fixes sobre les geometries, els pivots i les preses originals quan es clonen per primera vegada, deixant **totes les arrels visuals a escala 1**. La cisalla conserva la seva mida final 0.864 a la geometria, ja no canvia l'escala a `sync()` en cada fotograma. La pistola declara `hunter-pistol-grip-center` com a punt de presa geomètric real per evitar coordenades de prova que només funcionaven amb una escala d'arrel antiga.

Aquesta consolidació NO elimina encara el `legacyRig.scale=2/3` dels controls físics antics, ni normalitza riders o pilots. Les mides finals es mantenen, no s'han redissenyat les armes.

## Geometria nativa Ka-60 i seients · v0.6.261

El Ka-60 A ara té la mida aprovada ×2 **dins les malles, els pivots i els rotors** de `createKamovCandidate` (`scale=1` al candidat). A `createKa60Runtime` la conversió legítima a les unitats `vehicleSpecs.scales.heli` es consolida a la geometria abans de muntar la tripulació, i torna `scale=1`. Els dos pilots V18 es construeixen directament amb alçada/ancoratges de cabina natius, de manera que no hereten una arrel de model reescalada. El volum final de fuselatge, l'alçada del rotor, el tren i les posicions mundials de la tripulació es mantenen.

S'han afegit proves explícites de mides per a quatre valors VS (inclosa la conversió real del joc), de volums, rotors i places dels pilots. **No es modifica encara** el factor de contacte amb terres/teulades calculat a `game-core.js`, ni els conductors generals de `rider.js`.

## Referències trobades, NO eliminades encara perquè alteren altres contractes

| Codi | Situació | Migració necessària |
|---|---|---|
| `human-game-runtime-v17.mjs`: `LEGACY_GAME_RIG_SCALE=2/3` | Rig antic ocult d'armes/IK i pell V18 visible; s'usen espais locals diferents | Migrar les armes i les mans a un únic rig V18 i recalcular grips, seients, canons i física; abans d'això suprimir el 2/3 pot reintroduir les mans sobre el cap |
| `rider.js`: `.825`, `.82`, `.63` i `1/riderScale` | Reescala tot el model del passatger segons vehicle durant la partida | Figures natives de cabina/seient i ancoratges físics llegits del model, amb IK i COOP adaptats |
| `vehicle-model-core.mjs`: `BICYCLE_VISUAL_SCALE=.74`, `MOTORCYCLE_VISUAL_SCALE=1.24` | Mida fixa aplicada abans de `bakeFixedModelScales` | Integrar els dos valors als generadors de bicicleta i streetfighter; actualment els models lliurats ja tenen arrel a 1 |
| `vehicle-model-core.mjs`: `hover.scale=(1.28,1,1.20)` | Escala no uniforme i cabina amb posicions compensades; no commuta amb rotació del ventilador | Generar nativament un hovercraft amb l'amplada/llargada aprovades, incloent les aspes animades i els ancoratges, sense shear |
| `ka60-runtime.mjs`: `KA60_WORLD_SCALE/vehicleScale` | **Consolidat v0.6.261:** cap malla, rotor o pilot hereta escala d'arrel; el ×2 aprovat és intrínsec, i `1/vehicleScale` només converteix les unitats del vehicle abans de crear la tripulació | La col·lisió dinàmica de `game-core.js` continua fent servir altures/factors independents; auditar-la contra la geometria nativa |
| `game-core.js`: `visualScale=1.5/1.1` pels helicòpters | Contacte amb terreny/teulades obtingut per factors històrics, no per malles | Derivar volum de col·lisió de fuselatge i rotor del model aprovat |
| `characters.js` i `general-model.js`: `fit*0.8` en comandos i general | Factor de generació de personatges antics vinculat als pivots i als enemics | Produir els soldats/generals amb el rig anatòmic V18 final, conservant dany, ragdoll, COOP i presa d'armes |
| `enemy-ai.js`: models de tripulants `scale=.31/.43/.52` | Figures enemigues dependents del vehicle; la geometria de la tripulació encara canvia després de la creació | Fàbriques natives per tipus de vehicle i IK de passatger sense escalats de l'arrel |
| `vehicle-model-core.mjs`: models llunyans GAZ ×1,25 | La malla proxy, no el vehicle complet, encara es retoca a posteriori | Fer un LOD natiu de les dimensions del GAZ i comparar-ne el contorn amb el model complet |
| `human-game-runtime-v17.mjs` / `human-weapon-preview.mjs`: proxies d'armes escalats | **Consolidat al joc v0.6.260:** les 7 còpies visibles tenen `scale=1`; la mida de l'editor encara és independent | Unificar en una fàbrica compartida els ancoratges natius d'arma de joc i editor, sense eliminar els controls antics abans de migrar-los |

## Variacions legítimes no candidates a eliminació

- Escala de partícules, esquitxos i explosions segons el temps d'animació.
- Escala anatòmica de primitives (esferes, cilindres, dits) durant la construcció de geometria.
- `vehicleSpecs.scales`: relació de les dimensions de cada vehicle amb les unitats mundials; `bakeFixedModelScales` la consolida als Object3D abans de publicar-los.
- Escala aleatòria de vegetació, roques i decoració: variació procedural de cada exemplar, no una correcció tardana del model aprovat.
- Escala física dependent de dany o desintegració de models, si forma part de l'efecte.

**La migració pendent no es pot fer amb un cercar/substituir de multiplicadors:** desalinearia animacions i col·lisions. L'auditoria es manté oberta fins que els casos de la taula tinguin mides natives i regressions verificades visualment.
