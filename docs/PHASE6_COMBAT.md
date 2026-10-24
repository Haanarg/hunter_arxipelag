# Fase 6 — resposta del combat, v0.5.78

## Comportament

- Els impactes físics que no poden fer mal produeixen una ràfega d'espurnes blanques/blaves, més llarga que les espurnes taronges ordinàries. Es consulten les immunitats actuals: bales lleugeres contra tancs, tanquetes, torres i construccions militars, i objectes amb vida infinita. L'helicòpter de combat conserva la vulnerabilitat que ja tenia.
- Un soldat o general que sobreviu a un impacte real emet nou partícules de sang més grosses, més vives i durant 0,4–0,6 s. La sang queda a prop del cos: el punt visual de la bala es limita a 60 cm del centre i a l’alçada del soldat, sense modificar la col·lisió física més ampla. No s'afegeix sagnat continu, dany addicional ni decals permanents.
- Una creu petita al centre confirma una reducció real dels punts de vida d'un enemic o vehicle provocada per una arma pròpia, inclosos ganivet, granades i explosius. Tocar una paret, un objectiu immune o fer foc amic enemic no confirma un encert del jugador.
- Un arc discret indica durant 0,72 s l'origen del dany, segons l'orientació actual de la càmera. Funciona també amb mirada lliure en vehicle; el casc pot rebre dany sense ferir el pilot. Una caiguda vertical o una causa sense origen horitzontal no inventa una direcció.

La col·lisió, l'autoapuntat, la trajectòria, el punt de sortida del projectil, la cobertura, els intervals de tret i els valors de dany conserven les regles anteriors. Les filferrades continuen deixant passar les bales lleugeres.

## Recursos i lifecycle

Els quatre tipus d'impacte comparteixen el pool existent, amb un màxim total de **112 malles**. Geometries i materials es creen una vegada i es reutilitzen; els efectes caducats es retiren de l'escena. El HUD utilitza dos elements persistents i no afegeix listeners per impacte. Les confirmacions fan servir temps absolut i es dibuixen una vegada per fotograma, després dels subpassos de simulació.

Inici/reinici, pausa/represa, pèrdua de focus, visibilitat, mort i victòria netegen els indicadors. La reconstrucció del món també recicla les partícules.

## Verificació

```sh
npm run test:feedback
HUNTER_TEST_BUNDLE=1 npm run test:feedback
node tools/build-runtime.cjs --check
node tests/startup-cache.cjs
```

El grup `feedback` de GitHub Actions és exclusivament manual. Les proves independents fan servir segments balístics i punts de vida reals: blindats/torres/murs/teulades, helicòpter vulnerable, filferrada, cobertura, propietat del tret, zero dany, ferides supervivents, càmera girada, dany del vehicle pilotat, expiració i pausa. Vint ràfegues reutilitzen 112 malles amb zero efectes orfes.

La prova antiga `light-projectile-aim` falla a `autoAimDown` també sobre la base intacta `9a1b87b`; es conserva sense modificar. Els detalls de la resta de discrepàncies prèvies són a [PROGRESS.MD](../PROGRESS.MD).

Resultats: les dues bateries de feedback passen tant en fonts com en el bundle final `d88c4ce38ac40c05`; integritat i política de memòria cau superades. També passen dany enter, dany enemic i les regressions afectades de càmera, mort i actualització d’UI.

## Límit visual

El harness simula el renderitzador. S'ha intentat arrencar la base pública v0.5.77 amb el navegador cloud i qualitat mínima: l'entorn retorna `THREE.WebGLRenderer: Error creating WebGL context`. Per tant, aquesta entrega no certifica l'aspecte dels efectes ni el rendiment en GPU/Android físic. És una limitació observada abans dels canvis de la fase 6.
