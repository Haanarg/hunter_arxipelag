# Fase 12 — so espacial i buffers compartits, v0.5.81

## Comportament

Els trets, explosions, trencaments, passes dels enemics propers i avisos d'alerta tenen una posició al món. El listener és a l'alçada d'oïda del jugador i s'orienta amb la càmera real, també en mirada lliure de vehicle, mira i cinemàtiques. Les recollides, el mal personal i els sons de la repetició/campanes mantenen la presentació centrada.

Un `PannerNode` HRTF aporta direcció, inclosa l'elevació. La distància s'aplica una sola vegada al gain i el rolloff natiu és zero; s'ha retirat la preatenuació de les crides de tret/explosió. Sense Panner es conserva el volum per distància; sense Web Audio el joc continua funcionant.

| So del món | Rang auditiu |
| --- | --- |
| Tret lleuger o canó | 140 m |
| Explosió | 200 m |
| Passes d'enemic | 30 m |
| Avís d'alerta | 70 m |

Les passes depenen de la distància real recorreguda: un enemic aturat no fa passes. Els avisos coincideixen amb l'alerta que la IA ja emetia. **Reproduir un so no emet ni consumeix esdeveniments STEALTH**: rangs de percepció, dany, dificultat i cadència no canvien.

El menú de pausa inclou **So activat**. Silenciar talla els efectes i l'ambient immediatament; tornar-lo a activar en pausa no reprèn la partida. La preferència es conserva durant la sessió.

## Recursos i lifecycle

- Un únic context vigent, un motor i una font de mar; `initAudio()` és idempotent i adopta el context buit desbloquejat al clic del menú. El slot d'aquest context també s'actualitza si s'ha de recuperar un context tancat.
- Un `AudioBuffer` reutilitzat per tipus i context, amb una font nova per reproducció. La síntesi fa servir un PRNG local i no consumeix `R()`, `rn()` ni `Math.random` de joc/generació.
- Màxim de **18 veus del món i 24 veus totals**, més els dos bucles persistents. Les prioritats eviten que una passa talli una explosió, una alerta o una campana. La limitació temporal és per emissor; dos enemics diferents no es cancel·len globalment.
- Les fonts acabades i les reproduccions fallides desconnecten el graf. La memòria de throttle té un límit de 256 claus primitives; les claus d'objecte fan servir `WeakMap`.
- Pausa, pèrdua de focus, visibilitat, silenci i inici d'una nova operació netegen les veus. La generació de la fase 10 manté el graf en silenci fins a completar-se i no recupera sons antics en acabar.
- Les promeses de `resume()`/`suspend()` es capturen, inclosos rebuigs d'autoplay i resolucions tardanes. La inicialització no pot impedir generar o reprendre el món.

## Comprovacions

```sh
npm run test:audio
HUNTER_TEST_BUNDLE=1 npm run test:audio
HUNTER_TEST_BUNDLE=1 PHASE10_PROGRESSIVE_ONLY=geometry node tests/progressive-generation.cjs
node tools/build-runtime.cjs --check
node tests/startup-cache.cjs
```

El grup manual `audio` de GitHub Actions executa les proves noves. No s'han activat workflows automàtics.

La bateria usa un context d'àudio fals amb graf, rellotge, fonts d'un sol ús, finalització i promeses. Comprova reús, atenuació única, posició i orientació reals, HRTF/fallback, límits, prioritats, neteja, rebuigs i control de pausa. La prova independent integra el controller progressiu real: atura sons de l'operació anterior, manté la càrrega en silenci i reprèn amb el mateix context i bucles. També injecta errors de connexió/start, comprova distància vertical i confirma que STEALTH continua igual.

Resultats sobre fonts i paquet final `70ae02e240d66267`: les dues bateries d’àudio passen. També passen la geometria física de la fase 10 (15.800 nodes exactes a la base), timing, càmera de 16 perfils, combat/sigil, mort/victòria i integritat/cache.

## Límits

No es simula propagació acústica ni atenuació per materials dels murs: aquests sons informen per posició, orientació i distància. Un graf correcte en les proves no certifica el resultat auditiu, el rendiment HRTF o la mescla en altaveus/auriculars reals. L'escolta en Android físic continua pendent; la fase 4 conserva el perfilat sostingut.

La fase 11 només té un [qüestionari de direcció creativa](PHASE11_QUESTIONNAIRE.md). Les seves activitats i recompenses s'acordaran amb l'usuari abans d'implementar-les. L'estat complet del pla és a [PROGRESS.MD](../PROGRESS.MD).

Referències de l'API: [Web Audio API 1.1, W3C](https://www.w3.org/TR/webaudio-1.1/) i [Web Audio/autoplay en Chrome](https://developer.chrome.com/blog/web-audio-autoplay).
