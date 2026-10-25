# Correccions i incidències · versió 0.5.88

Incidències registrades per separat a GitHub (#2, #3, #4 i #5). Els canvis s'han integrat al runtime de producció; les incidències romanen obertes fins a validar-les al joc.

- **#2 Bazuca:** autoapuntat amb un abast de 185 m i tolerància de ±35° en azimut. L'elevació s'adapta automàticament als objectius molt per sobre o per sota del jugador. Retícula i projectil comparteixen els mateixos paràmetres.
- **#3 Vol per explosions:** braços i cames roten al voltant dels seus pivots; mai no es desplacen físicament fora del cos. La simulació de 250 fotogrames confirma la fixació de les espatlles.
- **#4 Cabanes de fusta civils:** parets amb 4 PV, portes amb 4 PV, cobertes amb 8 PV; els edificis militars conserven els valors anteriors. Cada rib lateral es vincula a la paret corresponent. Un impacte directe de bazuca a paret o coberta enderroca tota la cabana.
- **#5 Pous i bancs:** obstacles físics als pobles (banc: AABB amb rotació; pou: dotze segments al voltant de l'anell, sense omplir l'espai central). Les hitboxes també existeixen en generació sense grafismes.

Comprovacions CPU dirigides: `node tests/bug-regressions-20261025.cjs`, `node tests/ragdoll-lite.cjs` i `node tests/vehicle-weapon-reticle.cjs`. Resta pendent una prova visual completa en navegador i Android. El paquet runtime actual s'ha recompost a partir de les fonts modificades i validat sintàcticament; no s'ha reproduït una build Terser completa.
