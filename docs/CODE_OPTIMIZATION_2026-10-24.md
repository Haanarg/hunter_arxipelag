# Hunter: Arxipèlag — continuació de l'auditoria de codi (24/10/2026)

## Punt de partida

La sessió de Work havia deixat una auditoria només de lectura al commit `74c8b00`,
després de consolidar el Humvee procedural B, retirar els GLB antics i reparar
`?runtime=bundle`. La prioritat era aprimar el repositori **sense alterar la jugabilitat**.

## Aplicat (v0.5.74)

1. **Fitxers orfes retirats:** `src/boat-concepts.mjs`,
   `src/rocket-boat-concepts.mjs`, `src/heli-concepts.mjs`. Cap
   HTML, mòdul ESM de producció ni entrada del manifest els importa.
   Es tracta de prototips desconnectats, no de la geometria dels vehicles actuals.
2. **Workflow duplicat retirat:** `.github/workflows/rebuild-runtime.yml`.
   Es conserva `.github/workflows/runtime-bundle.yml`, que és manual, construeix
   el paquet, verifica el hash i executa regressions abans de publicar.
   `.github/workflows/essential-tests.yml` continua separat per a tests manuals.
3. **Camió A4:** eliminades la cabina alternativa `classic=false`,
   la roda lateral inactiva i les branques `forest`, `patrol` i `long`
   que cap de les quatre variants `A4.1/A4.2/A4.3/A4.4` selecciona.
   `truck-concepts.mjs` passa de 19.022 a 16.831 caràcters.
4. **Categories de renderitzat:** `game-core.js` conserva els comptadors
   i els callbacks originals; ara cada malla rep el wrapper com a màxim
   una vegada (`WeakMap`). Quan es reclassifica una malla, se n'actualitza
   l'etiqueta en lloc d'apilar més `onBeforeRender`.
5. **Interfície d'armes:** `syncWeaponPicker()` només escriu els estils
   si ha canviat la disponibilitat, i ja no es crida duplicada dins el tick
   de HUD. La comprovació de visibilitat es manté al bucle principal,
   inclosos els estats de pausa, mort i cinematogràfiques.
6. **Acció contextual:** `nearV()` només s'executa quan es refresca el
   botó d'acció (~0,12 s), com ja passava amb la resta del HUD. La tecla E
   i les consultes explícites continuen fent la cerca immediata.
7. **Bundle:** recompost amb `game-core.js` actualitzat, com exigeix
   `tools/build-runtime.cjs`: `dist/hunter-runtime.1219d95d24465c3e.js`.
   Eliminat el fitxer hash antic. Versió visible i URLs d'engegada: `0.5.74`.
8. **Regressions:** `tests/optimization-ui-render-hooks.cjs`, incorporat
   als dos workflows manuals. Comprova callbacks idempotents, la reetiquetada
   de malles, el selector d'armes i el ritme de cerca del vehicle proper.

## Verificacions realitzades

- Les quatre variants `createTruckConcept(THREE, 0..3)` es van executar
  amb la mateixa simulació de geometries Three.js abans i després: les signatures
  completes d'objectes, materials, cares i atributs coincidiren.
  **Això no és una prova visual amb WebGL.**
- `game-core.js` i el bundle complet passen comprovació de sintaxi JavaScript.
- La porció `// BEGIN src/game-core.js` del bundle nou coincideix exactament
  amb el fitxer de producció, i el FNV64 coincideix amb el nom del paquet.
- La prova funcional dels hooks, la reetiquetada i el canvi d'estat del
  selector d'armes ha passat amb malles/DOM simulats.
- **No s'ha fet una prova interactiva en Android o al navegador remot**,
  ni s'ha executat el conjunt complet de tests de Node en aquesta sessió.
  L'auditoria anterior ja documentava un test general `KeyG` fallit anterior
  als canvis; no s'ha considerat un error nou.

## Fases posteriors, no implementades

1. Separar la geometria de camió A4.3 usada en producció de les tres
   variants només de la preview; fer-ho preservant els pivots de direcció,
   les hitboxes i els tests `truck-preview`/`truck-game-model`.
2. Mesurar abans de tocar els objectes compartits: `vehicles.js` crea
   malles i materials per instància (sobretot vehicles civils/camions).
   Provar una fàbrica de plantilles amb `clone(true)` i recursos compartits,
   definint primer qui fa `dispose()` per evitar trencar altres vehicles.
3. Perfilar `nearV()`, filtres d'enemics/vehicles i consultes d'atac de
   curt abast; considerar indexació espacial només si el perfil evidencia cost.
4. Revisar les consultes UI restants, la creació de vectors/quaternions
   temporals i els diagnostics per fotograma, garantint que el panell
   de rendiment continua funcionant.
5. Validar el mode `?runtime=bundle`, el mode font i els controls d'Android
   en dispositiu real; després es pot avaluar minificació/compactació adicional.
6. Mantenir les GitHub Actions només manuals pel límit de minuts.

## Continuïtat

Per continuar la feina, revisar aquesta nota, verificar `main`,
executar `node tests/optimization-ui-render-hooks.cjs`,
`node tests/truck-preview.cjs`, `node tests/truck-game-model.cjs`
i `node tools/build-runtime.cjs --check` en un checkout amb Node,
i començar per la separació del mòdul del camió o pel perfil de rendiment.
