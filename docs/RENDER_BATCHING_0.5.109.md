# Optimització dels lots de renderització · 0.5.109

## Camins

Els sectors de la xarxa de camins passen de 64 a 128 cel·les (192 m amb pas 1,5). Les posicions, normals, colors i transparències per vèrtex es mantenen exactament. La comprovació de canvis de LOD del terreny es fa en una graella de 32 m dins de cada sector gran; així les vores i l'interior actualitzen la seva cota en canviar el relleu visible.

## Cotxes civils C1A

Les peces opaques amb el mateix model d'il·luminació s'agrupen encara que el seu color sigui diferent: el color RGB lineal original passa a ser un atribut per vèrtex i el material fusionat és blanc. Els materials amb propietats de reflexió diferents es mantenen separats; les vuit peces de vidre transparent i tots els pivots de roda, direcció i volant no es modifiquen.

En proves sintètiques amb Three.js r186: un model C1A ha passat de 177 malles originals a 30; de 21 grups de material opac estàtic a 5 batches. Les comprovacions de caixes, triangles (4.032), colors i transparències coincideixen. Una xarxa de camins sintètica ha passat de 21 sectors a 9 amb els mateixos 13.446 triangles. No són estimacions de millora de FPS, que s'han de comprovar al dispositiu.

## Tests

`node tests/render-batching-regressions.cjs`
`node tests/compound-paths.cjs`
`node tests/vehicle-batching.cjs`
`node tools/build-runtime.cjs --check`

Per a la validació real: `?perfAudit=1&stress=1` amb la mateixa llavor, posició i qualitat de les versions anteriors.
