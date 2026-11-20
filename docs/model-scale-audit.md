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

## LOD natiu del GAZ i variants d'ocupació · v0.6.262

El GAZ Tigr-M ja no fa `proxy.scale.setScalar(1.25)`: les tres variants de llarga distància es creen amb la proporció de les dues caixes físiques aprovades del GAZ, integrant-hi la mida de cada vèrtex directament a la geometria. La mida física del vehicle complet, els controls, els seients i les col·lisions **no canvien**.

Una auditoria posterior ha detectat que `bakeFixedModelScales(g)` només normalitzava la geometria de la variant de LOD muntada en aquell instant. Quan `setDistantVehicleLOD` canviava la quantitat de tripulants, carregava altres geometries preconstruïdes sense la conversió `vehicleSpecs.scales`. Ara, en tancar la fàbrica de vehicles, **les tres variants s'entreguen en unitats del món**, es sincronitza `variants[0]` amb `proxy.geometry` i s'evita reintroduir l'escala en alternar nivells de detall. Això s'aplica a tota la flota amb LOD, no només al GAZ.

Les regressions contrasten les caixes dels tres LOD amb les geometries originals i el factor físic de cada tipus, també amb 0/1/2 ocupants. La comprovació visual de siluetes i els models humans en seients COOP encara és pendent.

## Ocupants de cabina amb geometria nativa · v0.6.263

A `rider.js`, el protagonista visible als cotxes, al GAZ Tigr-M i a l'hovercraft ja no reescala la seva arrel amb `g.scale.setScalar(.82/.825/.63)`. Les talles definitives aprovades són **variants de geometria i pivots anatòmics**, derivades del model de partida quan apareixen per primer cop i reutilitzades en canviar de vehicle; en tornar a moto o bicicleta es recupera la variant original sense multiplicacions acumulatives. El grup de l'ocupant roman a `scale=(1,1,1)` en qualsevol vehicle.

Els objectius de mans, peus, espatlles i tors es calculen en coordenades mundials/directes de la cabina, sense els anteriors `1/riderScale`. Els segments animats preserven les seves longituds i els moviments de braços, la pistola i el perfil llunyà es converteixen a la mateixa talla. Les proves comparen dimensions de pell, places de conductor i passatger, muntatge de l'hovercraft, estabilitat de geometries entre ticks i retorn a la moto.

Encara existeixen les talles de cabina aprovades `.825/.82/.63` com a **paràmetres de creació de variants**, no factors sobre el model en execució. Això NO modifica els models enemics ni elimina el controlador ocult `2/3`; cal validació WebGL, animacions de trets i COOP real.

## Tripulants enemics en geometria nativa · v0.6.266

Els ocupants enemics de **cotxe, camió A4.3, moto, patrullera marina i llanxes requisades** ja no reben `root.scale=.31/.43/.52` després de ser creats. El mateix adaptador V18 exposa `normalizeEnemyCrew(root,size)`: consolida la talla aprovada **una única vegada** dins les malles, els pivots, els punts de canó i la cadena articulada. Les arrels es lliuren a escala `(1,1,1)` amb postures i dimensions mundials invariants. La funció és idempotent i rebutja reutilitzar una figura amb una talla diferent.

A `marine-patrol.js`, l'altura d'apuntat ja no consulta `rider.scale.y`: un punt d'apuntat fill de la figura es transforma conjuntament amb ella i després es llegeix en coordenades de la barca. Això manté exactament la cota històrica però elimina la dependència d'un factor aplicat tard. Les armes muntades del cotxe i camió queden fora de la normalització del soldat: no es reescala la boca de foc de la torreta.

Les regressions creen figures reals V18 i comparen silueta, coll/cap, longituds de membres, punts de trets i postures per a les tres talles; també fan exercir les fàbriques reals de **dos tripulants marins i tres vehicles terrestres**, incloent l'origen del canó de moto i l'altura de mira de la patrullera. Aquest tall **no migra** el general, les escales anatòmiques fixes del soldat de combat ni el controlador ocult `2/3`. La verificació WebGL i dues sessions COOP continua pendent.

## General amb escala de base nativa · v0.6.269

El **general** de la partida passa a escala d'arrel `(1,1,1)` amb la reducció visual aprovada `0.8` integrada a la geometria i als pivots. La normalització s'executa **després** de `HUNTER_ENEMY_LOD.optimize`, sobre el general que ha construït `HUNTER_CHARACTERS.createSoldier`. D'aquesta manera es consoliden al mateix temps el cos articulat (cassaca, bigoti i arma), el model mitjà i el model llunyà, i no hi ha salts d'escala en el canvi de distància.

Es conserven els mateixos objectes articulats, els valors de gir/animació, les coordenades de la boca de foc, el contacte amb el terra, la hitbox, el ragdoll i els PV. Les proves fan servir una malla real V18 d'oficial, amb articulacions, arma i tres variants de LOD; comparen els volums i coordenades de cap, braços, genolls i canó abans i després, també durant el moviment. La fàbrica interceptada només normalitza el perfil del general.

**No hem migrat encara els soldats a peu:** `equipBazooka` pot afegir el tub i els punts d'IK després que s'hagi creat el LOD. Normalitzar-ne l'arrel sense adaptar aquesta ruta alteraria la posició del bazuca. Així mateix queden pendents el rig ocult del protagonista, els volums dels helicòpters i la validació visual WebGL/COOP.

## Infanteria normal, elit i antitanc amb escala nativa · v0.6.271

Els soldats a peu del joc tenen ara **l'arrel a escala 1**. La mida aprovada 0,8 es consolida en la geometria, els pivots anatòmics i les tres variants LOD *després* de crear el soldat, inclosa la cuirassa i la metralladora d'elit. Els comandos que encara s'utilitzen com a figures de tripulació mantenen el contracte de la fàbrica original; en entrar al vehicle la conversió de cabina és independent.

El bazuca de les torres pot equipar-se després d'aquesta normalització: la seva posició, llargada, preses de les dues mans, longitud del solver IK i tubs visibles als LOD s'expressen ja en coordenades natives. La boca de foc i les mides mundials són les mateixes que a la versió anterior. Les geometries comunes fusionades i els models llunyans comparteixen una memòria cau de peces normalitzades per no multiplicar els bufers de cada patrulla.

Les proves realitzen una comparació geomètrica del soldat antic i el nou, inclòs el bazuca equipat tard, el seu canó, les preses i els tres LOD; validen el cache de geometries i les fàbriques de soldat, elit i general. **No es canvia** la física, la IA, els PV, la requisició ni el controlador ocult V18 ×2/3. Queden per revisar visualment els canvis de LOD i les animacions de disparar.

## Dimensions natives de bicicleta i streetfighter · v0.6.272

La moto ja no rep `bike.scale.setScalar(1.24)` dins `vehicle-model-core.mjs`: la nova fàbrica `createNativeStreetfighter25` parteix de l'actiu original CC0, afegeix els punts anatòmics de selló, punys i reposapeus al seu rig, i **consolida la talla aprovada en malles, pivots i geometria** abans de tornar el model (escala d'arrel 1). El radi físic de rodament també incorpora la mida del model una sola vegada; la fàbrica de vehicles només afegeix la conversió mundial `vehicleSpecs.scales.moto`.

La bicicleta de carretera ara tanca la construcció del quadre, la direcció i el pedalier amb `finalizeNativeBicycle`: la talla `0.74` queda consolidada sobre rodes, barres, selló, punys i les dues bieles, abans de lliurar el model a la fàbrica. No queda cap grup amb escala 0.74; els radis i el valor declarat del punt superior del selló es converteixen a coordenades locals natives. Les propietats `bicycleVisualScale` i `motorcycleVisualScale` són metadades històriques per a compatibilitat i **no transformacions actives**.

Les proves enfronten la moto nativa amb la peça original escalada en tres angles de gir i rodament, comprovant els cinc punts de pilotatge i els eixos de roda. Una segona prova construeix una bicicleta amb forquilla i pedalier animables, compara el sistema anterior amb el model normalitzat durant diferents fases i comprova que els contorns i els cinc punts anatòmics coincideixen. Es mantenen intactes les mides i col·lisions existents en el món, i el pilot V18 i els controls no canvien.

## Hovercraft D natiu amb ventilador rodó · v0.6.273

El model D «Comandament» ja **no** utilitza `hover.scale.set(1.28,1,1.20)`. La fàbrica `createNativeHovercraftD` incorpora el factor de casc aprovat als vèrtexs de les peces estàtiques, incloent bigues girades, finestres, interiors, seients i antenes, mentre conserva `scale=(1,1,1)` a l'arrel. El ventilador manté la cota i la posició de popa originals i la profunditat escalada en Z, però l'**eix X de les seves formes circulars queda sense estirar**: conducte, anelles, gàbia i pales mantenen el radi circular al pla XY independentment de l'angle de gir.

La transformació de cada malla es fa en l'espai local adequat (`M⁻¹·S·M`) i es consolida a la geometria sense perdre la rotació artística de les primitives o la transparència. El pivot animat del rotor no hereta cap escala de pare, i la seva velocitat continua sent `time*19`. Els dos punts dels seients i el del volant es guarden en coordenades locals definitives, sense multiplicar `1,28` i `1,20` una segona vegada.

Les regressions comparen totes les malles no circulars de l'hovercraft antic i el nou, la silueta del casc, les finestres accessibles per impactes, els dos seients, el timó, la cota del rotor i els diàmetres del conducte i les anelles. Addicionalment fan rotar les sis pales diverses vegades i exigeixen un radi constant. L'escala mundial `vehicleSpecs.scales.hover` és legítima i uniforme; la física i les col·lisions no canvien.

## Referències trobades, NO eliminades encara perquè alteren altres contractes

| Codi | Situació | Migració necessària |
|---|---|---|
| `human-game-runtime-v17.mjs`: `LEGACY_GAME_RIG_SCALE=2/3` | Rig antic ocult d'armes/IK i pell V18 visible; s'usen espais locals diferents | Migrar les armes i les mans a un únic rig V18 i recalcular grips, seients, canons i física; abans d'això suprimir el 2/3 pot reintroduir les mans sobre el cap |
| `rider.js`: `.825`, `.82`, `.63` i `1/riderScale` | **Consolidat parcialment v0.6.263:** el rider de cotxe/GAZ/hover té arrel a 1, geometries de cabina estables i seients en unitats directes | Encara cal substituir les proporcions numèriques de les variants per dimensions declaratives de cabina i verificar COOP, trets i animacions amb WebGL |
| `vehicle-model-core.mjs`: bicicleta `.74`, moto `1.24` | **Consolidat v0.6.272:** la fàbrica nativa integra la mida a malles, forquilla, rodes i ancoratges abans de lliurar cada model; cap transform tardà de dimensió visual | `vehicleSpecs.scales` és només conversió legítima d'unitats de món; verificar visualment postures i contactes en WebGL/COOP |
| `vehicle-model-core.mjs`: hovercraft D `(1.28,1,1.20)` | **Normalitzat v0.6.273:** casc, finestres i seients incorporen la mida a geometria; ventilador, conducte i gàbia tenen diàmetres circulars | Validar visualment ventilador rodó i seients a l'aigua, també COOP i impactes a les finestres |
| `ka60-runtime.mjs`: `KA60_WORLD_SCALE/vehicleScale` | **Consolidat v0.6.261:** cap malla, rotor o pilot hereta escala d'arrel; el ×2 aprovat és intrínsec, i `1/vehicleScale` només converteix les unitats del vehicle abans de crear la tripulació | La col·lisió dinàmica de `game-core.js` continua fent servir altures/factors independents; auditar-la contra la geometria nativa |
| `game-core.js`: `visualScale=1.5/1.1` pels helicòpters | Contacte amb terreny/teulades obtingut per factors històrics, no per malles | Derivar volum de col·lisió de fuselatge i rotor del model aprovat |
| `characters.js` i `general-model.js`: `fit*0.8` dels comandos i del general | **Consolidat en soldats a peu i general v0.6.271:** arrel 1 i geometries finals dels tres LOD, incloent equipament antitanc afegit després | El comando de la fàbrica de tripulació manté l'ajust previ fins a convertir-se a cabina; validació visual WebGL/COOP pendent |
| `enemy-ai.js`, `marine-patrol.js`: tripulants `.31/.43/.52` | **Consolidat v0.6.266:** les talles es couen una vegada a malles i punts d'ancoratge V18, arrel 1, i la mira marina llegeix l'ancoratge real | Encara cal validar visualment en WebGL la postura, la punteria, els seients i COOP i migrar, separadament, el general i els combatents a peu |
| `vehicle-model-core.mjs`: models llunyans GAZ ×1,25 | **Consolidat v0.6.262:** la silueta distant neix de les caixes aprovades del GAZ; no hi ha factor posterior al proxy | La comparació visual de contorns entre el GAZ complet i el LOD en WebGL encara és pendent |
| `human-game-runtime-v17.mjs` / `human-weapon-preview.mjs`: proxies d'armes escalats | **Consolidat al joc v0.6.260:** les 7 còpies visibles tenen `scale=1`; la mida de l'editor encara és independent | Unificar en una fàbrica compartida els ancoratges natius d'arma de joc i editor, sense eliminar els controls antics abans de migrar-los |

## Variacions legítimes no candidates a eliminació

- Escala de partícules, esquitxos i explosions segons el temps d'animació.
- Escala anatòmica de primitives (esferes, cilindres, dits) durant la construcció de geometria.
- `vehicleSpecs.scales`: relació de les dimensions de cada vehicle amb les unitats mundials; `bakeFixedModelScales` la consolida als Object3D abans de publicar-los.
- Escala aleatòria de vegetació, roques i decoració: variació procedural de cada exemplar, no una correcció tardana del model aprovat.
- Escala física dependent de dany o desintegració de models, si forma part de l'efecte.

**La migració pendent no es pot fer amb un cercar/substituir de multiplicadors:** desalinearia animacions i col·lisions. L'auditoria es manté oberta fins que els casos de la taula tinguin mides natives i regressions verificades visualment.


## Contactes natius dels helicòpters · v0.6.275

Els contactes dels Ka-60 i Mi-24 amb sostres, pendents i palmeres passen a utilitzar una envolupant derivada dels vèrtexs del model aprovat **una sola vegada** quan es crea el vehicle, abans de crear-hi els pilots. El disc principal defineix el radi del rotor; les malles estàtiques de la secció central defineixen el radi i la cota superior del fuselatge; el contacte inferior i l'eix de rotor provenen del tren i de l'objecte rotor. El factor VS legítim de conversió a unitats del món només s'aplica en construir les metadades, mai en els bucles de física.

S'han retirat els valors històrics `visualScale=1.5/1.1` dels tres camins de contacte, substituïts pel mateix perfil físic. La nova regressió comprova que les dues variants tenen disc, volum i altures coherents, sense alteracions d'escala sobre les arrels dels vehicles. **Queda pendent** la validació visual de contactes a baixa altura, aterratges en teulades i col·lisions de cua, així com una sessió COOP real.


## Pistola visible amb IK nativa de V18 · v0.6.276

El braç dret i el palmell esquerre del protagonista quan apunta amb la pistola deixen de copiar la posició final de les mans del controlador invisible V17. La meta del canell dret es calcula des de l'espatlla i les longituds de braç **del V18 visible**, amb un límit d'elevació anatòmic; el canell esquerre es col·loca sota la pistola ja subjectada a la dreta, sense crear una dependència circular de pivots. La interpolació de la postura conserva les transicions de caminar a apuntar, i el quaternion del canó visible es recomputa després de moure el braç per mantenir la mateixa direcció que l'arma balística. La pistola continua tenint geometria nativa i arrel d'escala 1.

No s'ha retirat el controlador ocult `LEGACY_GAME_RIG_SCALE=2/3`: continua alimentant la física, els trets, la resta de postures, les armes i els seients; tampoc no s'han substituït les trajectòries de projectils. La prova de regressió canvia dràsticament els angles del braç invisible mentre fixa l'apuntat mundial, i comprova que el canell V18 no es desplaça ni queda sobre el cap. **La validació visual WebGL de la pistola, les transicions i el COOP continua pendent.**


## Ajupiment V18 per transform real i fallback natiu de pistola · v0.6.277

La baixada del protagonista deixa de calcular-se com un delta del controlador multiplicat per la constant visual `LEGACY_GAME_RIG_SCALE`. L'adaptador obté el desplaçament de la cintura de l'Object3D ocult, el transforma a l'espai local del model visible, i aplica una proporció anatòmica derivada de l'alçada real del pivot de pelvis V18. **La transformació de pare del COOP no introdueix un factor addicional ni canvia l'efecte de l'ajupiment.** La variació de la pell visible conserva les profunditats aprovades; el controlador físic i el seu factor ocult no canvien.

Per als protagonistes V18, l'objectiu de la pistola antiga (usada per la balística i transicions) també es calcula sempre des de les espatlles, pit i llargada dels braços reals; si el vector d'autoapuntat encara és nul en un primer fotograma o en COOP, s'utilitza la direcció mundial de la càmera/jugador en lloc de tornar a les coordenades fixes `(0, 3.10, -1.13)`. Aquesta reserva només es manté per a models que no disposin del rig canònic. No es canvien la cadència ni el punt de sortida de projectils.

Les proves comproven els trams d'ajupiment amb i sense pare traslladat/girat/escalat, així com el punt de destí de la pistola quan el vector d'autoapuntat és inicialment nul. **Encara pendent:** normalitzar el pont de desplaçament de natació, acabar les dependències del rig ocult i validar en WebGL els moviments i COOP.


## Pont de posició de natació 100 % V18 · v0.6.278

El pont de braça B3 i crol C4 deixa d'aplicar `LEGACY_SWIM_POSITION=2/3` al `visual.position`. L'animació visible ara rep un **centre de natació natiu i explícit** del V18 (`lift=0.35`, `centerZ=0.61` unitats de joc); el laboratori continua fent servir els seus valors originals, independents de la física del joc. La interpolació de posicions es fa amb `lerp` directe entre postures V18. L'oscil·lació idle queda integrada a `0.016` unitats, sense correcció tardana. Les proves de regressió contrasten idle, B3, C4, transicions, blend i un pare COOP girat i escalat, i comproven `visual.scale=(1,1,1)`. El controlador invisible `LEGACY_GAME_RIG_SCALE=2/3` **encara es conserva** per armes/física/seients; la seva retirada és la següent fase, no s'ha fet precipitadament. Pendent validació visual amb WebGL i dues sessions COOP reals.


## Boca real dels fusells V18 · v0.6.279

Unificat el càlcul de l'origen de projectils de l'AEK-971 (fusell d'assalt) i la SV-98 (franctirador) amb `nativeRifleMuzzleWorld` de l'adaptador canònic V18. El combat prioritza sempre l'ancoratge de boca de l'**arma dibuixada i realment equipada**, que manté escala 1, fins i tot amb gir/traslació del jugador o un pare COOP. Si el rig encara no s'ha creat o el model no està disponible, es conserva la boca del fusell antic com a reserva de compatibilitat. La simulació balística, la mira x8, la ràfega i l'autoapuntat segueixen el sistema existent; no es modifica la direcció física ni els factors de dany. Les proves comproven els dos models reals, les translacions del controlador ocult i un pare COOP transformat. **Encara no s'han migrat a origen V18 els trets de pistola, bazuca i altres sistemes**, ni s'ha retirat el rig antic. Validació WebGL i COOP de dos dispositius pendent.


## Orígens de pistola silenciada i bazuca V18 · v0.6.281

La pistola i el bazuca han incorporat els seus punts de sortida **dins del generador geomètric**, respectivament al llavi del silenciador (`hunter-pistol-muzzle`, fill de la corredora) i a l'extrem del tub del bazuca (`hunter-bazooka-muzzle`). Aquests ancoratges passen al model visible V18 quan les armes es reprodueixen amb dimensions natives. `nativeV18WeaponMuzzleWorld` ofereix ara un contracte únic per a pistola, bazuca, AEK-971 i SV-98; no requereix desplaçaments del rig ocult ni correctors d'escala. L'àlies anterior `nativeV18RifleMuzzleWorld` segueix disponible per compatibilitat.

En trets a peu, la posició de sortida de pistola i bazuca prové de la geometria V18 visible, amb fallback als punts físics antics només si encara no hi ha pell/arma preparada. Les pistoles dels conductors continuen regides pel mòdul propi del rider. No canvia la cadència, l'autoapuntat, els límits de con, la munició, el dany ni el model de projectils; només l'origen dels trets a peu. Les regressions comproven que la boca segueix les malles i que el desplaçament arbitrari del controlador antic no la mou, també en un pare COOP girat/escalat, i que una arma desequipada no aporta origen. Queda pendent validar en WebGL l'origen real dels tirs, les col·lisions del bazuca i la coincidència visual balística, incloent COOP real. `LEGACY_GAME_RIG_SCALE=2/3` encara és necessari per als controls físics i les postures no migrades.


## Accions de ganivet i granada nadiues V18 · v0.6.282

El controlador de personatge de `characters.js` calcula les fases de la punyalada 3B (amb repòs 4B), la càrrega, l'impuls i el contrapès de la granada com a **objectius anatòmics independents**. El mateix tick actualitza un estat `humanGameNativeAction` per avatar, amb interpolació exponencial pròpia iniciada des de l'última postura visible V18; el sistema de compatibilitat antic conserva els seus moviments per als contractes que encara en depenen, però el dibuix de les quatre articulacions del braç (espatlla i colze, esquerra i dreta) no en copia els quaternions mentre l'acció és activa.

L'adaptador `human-game-runtime-v17.mjs` aplica els angles finals directament als ossos aprovats V18 en el tick de pose, sense executar una segona interpolació al render ni derivar els angles dels ossos ocults. Les còpies visuals de ganivet i granada són filles del canell V18: prenen **l'orientació local de l'accessori**, no el quaternion mundial de `u.aer` del controlador V17. El llançament físic de granada ja pren l'origen del canell V18; no es canvia el vol de les granades ni la mecànica/interval de les punyalades. La natació, l'aire, els vehicles i les altres armes desactiven l'estat de postura especial i retornen al selector normal. Les regressions provenen de la fàbrica real de personatges i comproven les articulacions, el ganivet, la granada, la invariància després de modificar explícitament els ossos ocults, la idempotència de pose i el canvi de mode.

**Encara pendent:** desacoblar del V17 l'orientació i el solver de cisalla, completar postures de seient/conductors i la física, eliminar eventualment el grup `LEGACY_GAME_RIG_SCALE=2/3` i fer verificacions visuals WebGL/COOP de la punyalada i la trajectòria de granada.


## Cisalla amb muntatge i dues mans nadiues V18 · v0.6.283

El model aprovat de la cisalla incorpora una metadada geomètrica `nativeV18Mount` de muntatge al pit i inclinació local, definida **una sola vegada** en crear l'arma. El V18 visible ja no calcula l'orientació amb els quaternions mundials de la cisalla ni del tors ocult V17, i tampoc no copia les rotacions de les fulles antigues. Els dos braços de la cisalla visible reprodueixen directament el paràmetre `humanGameNativeCutterClosing` que es calcula al tick de tall. El control antic encara rep el mateix valor per preservar els contractes mecànics existents.

Les mans s'ajusten als marcadors dels mànecs reals mitjançant el solver compartit `solveNativeLongGunHand` del V18, amb exposició de la distància de cadascuna i control de presència quan s'equipa/des equipa. S'han eliminat les temporals i la IK duplicada anterior de la cisalla. El model continua amb geometria definitivament cuita i escala d'arrel unitària; no s'introdueix cap nova escala després de generar-lo.

La regressió de la fàbrica real comprova que canviar artificialment els angles, la posició, la rotació i l'obertura de la cisalla del V17 no afecta les espatlles ni els mànecs V18; també avalua la transformació d'un pare COOP, la rotació de les fulles, la disponibilitat de la IK i el desequipament. **Pendent** prova gràfica amb tall en filferrades i COOP real; el rig físic ocult `2/3` encara alimenta altres modes, seients i la mecànica.


## Conductors i passatgers de cotxe i hovercraft sobre V18 · v0.6.284

S'ha separat la representació de **pilots i passatgers de cabina** del controlador V17: els cotxes (GAZ Tigr-M, cotxe utilitari i civil) i l'hovercraft D fan servir una figura canònica `createSeatRider` derivada de la mateixa geometria de l'editor que el protagonista i els ciclistes. Cada talla autoritzada (.825, .82 i .63) es fabrica una sola vegada amb `nativeHeight`, geometria i pivots a dimensions finals, i es reutilitza durant els ticks; les arrels dels models mantenen escala (1,1,1). No hi ha multiplicadors per fotograma ni braços/cames reescalats.

La pelvis V18 coincideix amb el punt autoritatiu del seient calculat pel rider original. Els dos braços i les dues cames articulen espatlles/colzes/malucs/genolls directament amb l'IK canònica de longitud fixa ja utilitzada per a moto/bicicleta, cap als objectius existents de volant, reposabraços, comandaments i pedals. En COOP, el canvi 0↔1 mou la figura entre seients esquerre/dret sense alterar-ne la talla ni les longituds òssies. Les malles estirables antigues s'oculten en aquesta modalitat; només persisteixen internament per preservar les posicions de la pistola i els contractes de combat existents. La figura llunyana de dos polígons, els vehicles de dues rodes i la resta de riders no canvien.

S'han afegit regressions sobre la fàbrica real: figura visible, variants de talla i escala unitària, pelvis sobre el seient, cap duplicat antic visible, longituds reals constants, canvi SOLO/COOP i pare girat/escalat. **Pendent** revisar visualment els punts de contacte (volant i pedals) als GAZ, cotxe civil, hovercraft amb dos ocupants, transició d'equipar pistola, distàncies sota alta escala de vehicle i rendiment. **No s'ha eliminat encara** `LEGACY_GAME_RIG_SCALE=2/3` ni l'antic controlador de la pistola del rider; tampoc no s'han migrat les poses dels ocupants de llanxes, barca de rems, moto aquàtica i windsurf.


## Ocupants nàutics amb articulacions V18 · v0.6.285

Després de cotxes i hovercraft, `src/rider.js` fa servir el mateix `createSeatRider(T,1)` V18 d'escala d'arrel unitària per a **llanxa, llanxa_coets, barca_rems, moto_aquatica i windsurf**. La figura nativa es crea i es conserva per talla: no es clonen malles ni s'escala la pell a cada tick. Les figures antigues de segments extensibles continuen només com a font de les posicions autoritatives d'interacció, pistola i compatibilitat; la seva geometria queda **oculta** en aquestes variants. El LOD llunyà continua econòmic i no manté figures V18 visibles.

La nova opció de `poseCanonicalSeat(...,wholeBody=true)` transfereix la rotació completa del tors (inclinació de moto aquàtica, 180° de l'orientació del remador, 1.13 rad envers la vela al windsurf i gir de dispar). Compensa geomètricament el pivot de pelvis **després de girar-lo**, mantenint-la al seient original; els objectius de les quatre extremitats es resolen amb la IK V18 existent, sense allargar segments ni modificar escala mundial. La barca de rems conserva les preses de cada rem; el windsurf conserva els punts reals de la botavara; les llanxes mantenen pilot i passatger costat per costat en COOP. La pistola encara fa servir els ancoratges antics, i la mà dreta V18 n'acompanya el moviment visible.

Regressions: tots cinc models amb talla real V18, seient/pelvis, longitud dels vuit ossos constants, rems independents, rotació 180° i 1.13 rad, llanxes amb seients COOP 0/1, tir des de barca, LOD llunyà, transformació COOP de pare amb escala/gir, i prova d'alteració dels segments antics que no canvia el canell V18. **Pendent** revisió WebGL/dues màquines dels punts de contacte, girs dels peus, caixes del buc i ombres; retirada del sistema de punteria/pistola del rider i consolidació de les col·lisions abans de suprimir `LEGACY_GAME_RIG_SCALE=2/3`.


## 0.6.286 · arma nativa de riders i límit real entre física/representació

La pistola del rider de moto/bici i dels conductors/passatgers ja es munta a partir del marcador geomètric de l'empunyadura i del canell **V18** amb reancoratge després de l'autoapuntat. El projectil del rider surt de `hunter-pistol-muzzle` (silenciador visible) i el primer projectil dibuixat en COOP de pistola/AEK/SV-98 passa per `nativeWeaponMuzzleWorld`, no per posicions heretades del controlador V17. S'han preparat proves de control d'escala, origen físic/visual, transformacions COOP i independència de braços ocults.

**Auditoria nova:** `docs/physical-v18-dependency-audit.md`. La posició autoritativa `P`, l'IK gràfica i els volums de col·lisió són sistemes diferents: les funcions pures `player-simulation.mjs`, `player-vertical.mjs`, `world-physics.mjs` i `vehicle-occupant-damage-core.mjs` no llegeixen les transformacions del rig V17. **Pendents:** alçades `+4.2/+3.1` de vegetació i parets, valors històrics de caps de tripulants (`2.65*.43`), suport d'aigua `surface-2.1` i pivot visual d'expulsió `waistLocal=2.05`. Aquestes dades físiques s'han de contrastar amb l'anatomia aprovada i conservar determinisme SOLO/COOP abans de tocar-les. L'escala del grup ocult `2/3` encara no es retira.


## 0.6.287 · hitboxes numèriques V18 i alçada física

Les posicions dels soldats visibles i les hitboxes de cap/seient ara surten del mòdul pur `vehicle-crew-anchors.mjs` en cotxes, civil, camió i patrulleres. El camió A4.3 comparteix `TRUCK_CABIN` amb la geometria aprovada. Els tests comparen realment cada punt de cap `Object3D` normalitzat amb la hitbox numèrica física i validen els tirs i el vidre sense introduir raycast de models al servidor. La palmera, la paret, la roca elevada i les portes es calculen segons l'alçada nativa única `3.11232`; no hi ha més seccions de palmera sobre el crani (3.8/4.2). Notes quantitatives i dependències pendents a `docs/physical-v18-dependency-audit.md`. **No s'ha retirat el rig ocult 2/3**.


## 0.6.288 · perfil físic canònic del jugador V18

Un mateix `player-physical-profile.mjs` governa els tres volums solapats de dany a peu i ajupit, els dos punts del nedador i la cota de flotació, utilitzat per `combat.js`, `server/coop-combat.mjs`, `world-physics.mjs` i `player-vertical.mjs`. Ajupiment: altura física en baixada conservadora de .30 m respecte l'alçada nativa real 3.11232. Natació: suport `surface - PLAYER_SWIM_DRAFT` amb `PLAYER_SWIM_DRAFT=alçada × .675`, conservant gairebé exactament la immersió visual original. Aquests contractes són dades deterministes i no interroguen cap os V17 en el servidor. L'escala oculta `2/3` continua existent només per compatibilitat d'algunes postures.


## 0.6.289 — expulsió nativa V18 i helicòpters

La volta del protagonista ja pivota exclusivament sobre `humanGameCanonicalJoints.pelvis`: `player-ejection-pivot.mjs` compensa l'orientació de la malla sense `2.05 * pl.scale.y`, també sota pares COOP transformats. Els caps numèrics dels tripulants de `heli/heli_combat` no reutilitzen les antigues coordenades incomparables de seient i cap. Proves de vidre i trajectòria. Les bandes verticals de contacte amb vehicles són ara una única funció comuna de SOLO i COOP, inclosa la geometria del GAZ aprovat. L'escala residual `LEGACY_GAME_RIG_SCALE=2/3` encara existeix en altres controladors i no es pot retirar sense migrar-los.


## 0.6.290 · rigs V18 d'helicòpter i ragdoll del protagonista

Els dos helicòpters ja incloïen V18 pilots visibles dins `vehicle-model-core.mjs`: es mantenen sense substitució. Els seus seients (`HELIPILOT`) són ara dades numèriques úniques compartides per fabricació visual, hitbox física i Worker, sense heretar el seient de cotxe multiplicat per VS. La prova real mesura els caps i la base a la malla aprovada. `ragdoll-lite.js` opera directament sobre `humanGameCanonicalJoints` per al protagonista i es reaplica després de cada pose de render; la cabriola també escriu sobre el V18 en lloc de sobre `u.al/u.ael/u.ll/u.lkl`. Els soldats sense articulacions canòniques al motor conserven un fallback temporal: **no es retira encara el rig ocult 2/3**.


## 0.6.291–0.6.293 · Desacoblament visible del protagonista

El jugador aprovat V18 ja governava salt, natació, IK de fusells, mans, col·lisions i ragdoll. La 0.6.291 ha traslladat els vuit angles aeris (salt/paracaigudes) a les articulacions V18. La 0.6.292 ha creat un controlador numèric nadiu de pelvis/torç/cap/ajupiment i vuit canals de caminar/córrer amb interpolació; el render visible no ha de copiar les rotacions del rig antic una vegada inicialitzada la simulació. La 0.6.293 pren el vector mundial d'apuntat per a les armes visibles, i el ganivet/granada segueixen el canell i corbes natives. Les proves deliberadament alteren controls antics sense canviar la pose visible.

**Important:** això no constitueix la retirada de l'esquelet antic: l'arbre `humanGameLegacyRig` amb `LEGACY_GAME_RIG_SCALE=2/3` continua com a font interna dels controls lògics de les armes, i `human-game-runtime-v17.mjs` encara construeix soldats, general i civils amb `copySkin` de geometria V18 sobre pivots heretats. Els riders ja mostren malles V18 però mantenen controls interns per algunes transicions. No seria segur canviar només `scale` ni substituir les dades de física del servidor per mesures del render; cal migrar els ancoratges lògics/les animacions, després eliminar l'arbre i passar les regressions, la paritat SOURCE/BUNDLE i el COOP real.


## 0.6.295 · Bake del controlador lògic del jugador

Durant la fabricació del protagonista real (SOLO i COOP), i **abans** de crear armes i accessoris, `normalizeGamePlayerControls` consolida l'escala uniforme de l'antic grup de control dins les seves malles i pivots. L'arrel resulta `(1,1,1)` i el `player` V18 visible no rep cap transform; test de posicions mundials de deu ancoratges abans/després i invariància del volum visible. La càrrega genèrica de fixtures/editor manté el contracte antic de proves fins que es migri totalment. La versió 0.6.295 s'ha fusionat a main després de superar les regressions i Chromium de branca. Encara **NO** retira les factories V17 de soldats i civils ni les lògiques antigues d'armes. GitHub Actions 44831621106 ha aprovat 29 passos de CI inclosos build SOURCE/BUNDLE i deploy Cloudflare, comprovació HTTP i arrencada publicada en Chromium. Només falta la verificació manual COOP amb dos dispositius.


## 0.6.296–0.6.297 · Civils amb rig V18 directe i escala arrel unitària

El mecànic i els presoners ara es construeixen amb `createHumanProposal` directament, amb totes les articulacions independents del V18. Les postures visibles se sintetitzen des de fase de marxa i estats deterministes (seure, saludar, treballar, COOP), sense llegir les rotacions de les estructures velles `u.legs/u.arms/u.head`. `humanCivilianCanonicalRig` assenyala la nova geometria; els controls antics resten buits de malles per preservar la lògica de rescat i treball. La geometria/materials nadius es disposen al reset.

La 0.6.297 consolida en una sola operació `modelScale` sobre malles i pivots de l'actor, i verifica abans/després els extrems de la caixa mundial del model canònic (tolerància 1e-6). L'arrel física i visual queda a escala exacta 1 i les altures del seient i del peu romanen invariants. El número `modelScale` només continua disponible per a mides lògiques de les interaccions i els volums físics, no com a corrector de render. Tests de branca: `test:lab`, `test:all`, `test:deploy`, SOURCE/BUNDLE i arrencada Chromium. No s'han eliminat encara els rigs V17 de soldats/general ni les interfícies de controls d'armes/riders.
