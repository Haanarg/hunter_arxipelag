# Optimització d'ombres i auditoria de dibuixos — 0.5.102

## Rendiment i qualitat visual
- El mapa d'ombres conserva **1280 × 1280**, PCF i la mateixa distància de projecció.
- El motor continua dibuixant ombres quan canvia la posició del focus solar, el jugador o qualsevol pivot inclòs entre els models que projecten ombra (inclou rotació, escala i quaternion).
- Si l'escena és estable, el mapa d'ombres ja dibuixat es reutilitza; una actualització preventiva cada **180 ms** absorbeix els canvis no registrats (destrucció, fragments, etc.).
- Els canvis mínims de postura (tolerància 0,02 unitats / radians, segons component) no obliguen a reconstruir cada fotograma. La comparació és amb l'últim fotograma **recalculat**, de manera que els desplaçaments lents s'acumulen correctament.
- En activar les ombres o generar un altre món, s'invalida la memòria cau, i la primera passada torna a dibuixar-les.
- No es canvia la qualitat de l'aigua, geometria, IA, física, ombres dels models ni valors de la configuració visual. La freqüència de refresc del mapa d'ombres pot disminuir quan gairebé no hi ha moviment; les ombres dels objectes que es mouen de manera perceptible continuen actualitzant-se.

## Comptadors de dibuix
- `window.HUNTER_DRAW_CALL_GROUPS`: compta el render principal, ara amb `jugador`, `mar`, `cel` i `efectes`/altres, a més de les categories existents.
- `window.HUNTER_SHADOW_DRAW_GROUPS`: compta les malles que participen en el render d'ombres mitjançant `onBeforeShadow`, **sense** confondre-les amb el dibuix principal.
- `window.HUNTER_DRAW_OTHER_DETAILS`: mostra les malles encara no classificades per pare, nom o tipus de geometria.
- L'auditoria A/B `?perfAudit=1` exporta `shadowGroups`, `shadowDrawCalls`, `shadowRedrawRate`, `otherDetails` i `unclassifiedDrawCalls`, amb els comptadors tradicionals.
- `unclassifiedDrawCalls` és la diferència conservadora amb les crides totals: les passades auxiliars i algunes malles dinàmiques no instrumentades poden romandre en aquest camp.

## Com validar
1. Ejecuta una partida amb la mateixa llavor i gràfics Alts, preferiblement amb el jugador aturat.
2. Activa `?perfAudit=1` i copia el nou JSON complet. Compara `shadowRedrawRate`, `shadowGroups` i els FPS amb la versió 0.5.101.
3. Repeteix-ho movent el personatge i conduint un vehicle per assegurar que les ombres es desplacen correctament.

## Tests
- `node tests/shadow-cache.cjs` comprova la memòria cau, moviments, pivots, canvis de quaternion, actualització periòdica i invalidació.
- `node tests/performance-audit.cjs` valida el JSON de l'auditoria incloent els nous grups.
- `node tests/optimization-ui-render-hooks.cjs` comprova el diagnòstic de malles i la preservació dels callbacks originals.
- `node tools/build-runtime.cjs --check` comprova el paquet publicat.

**Límit:** la verificació estàtica i amb simulació de transforms no substitueix mesurar el resultat real en WebGL al PC i a Android.
