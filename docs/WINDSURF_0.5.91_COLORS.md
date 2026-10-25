# Windsurf: paleta de colors vius (0.5.91)

El drap del windsurf deixa de tenir un únic color per a totes les instàncies. Cada taula comparteix la paleta de les motos aquàtiques (`HUNTER_CIVILIAN_CARS.jetskiColors`): vermell, llima, groc viu, magenta, blau elèctric, taronja i negre.

- `src/world-generation.js` assigna el color individualment, de manera estable per a cada llavor. La primera variació depèn de la posició de l'illa inicial i cadascun dels windsurfs successius avança un lloc dins de la paleta; set windsurfs consecutius tindran set colors diferents. La tria no consumeix més valors de `R()`, així no desplaça els vehicles, complexos ni terreny generat anteriorment.
- `src/vehicles.js` utilitza `appearance.color` per a la membrana principal i aplica una combinació de panells contrastats, incloent groc brillant sobre el negre. Els materials i les peces visuals pertanyen a cada instància; no es recoloregen les altres veles.
- `tests/windsurf-stance.cjs` comprova la gamma completa amb Three.js real i verifica la determinació dels colors i el nombre de crides a RNG.

No s'ha modificat la postura, el tir dretà, la mida de la vela o la transició a la sorra introduïdes a 0.5.90. Pendent de validació gràfica al navegador i a Android.
