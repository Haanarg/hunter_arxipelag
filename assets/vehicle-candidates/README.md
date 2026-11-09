## Segona generació BTR-82 a partir de l'antiga variant 25% — 9 novembre 2026

La nova **referència 100%** és l'antic `btr82-25pct.glb`, que té
**5.371 triangles i 18 malles**. No és el GLB original de l'autor (21.483
triangles); aquest es conserva a `btr82-original.glb` únicament com a
arxiu de procedència i per atribució (SIpriv · CC BY 4.0).

La comparativa del banc utilitza quatre GLB complets:
- `btr82-base-100.glb`: 5.371 triangles, 18 malles (nova base)
- `btr82-base-75.glb`: 4.025 triangles, 18 malles
- `btr82-base-50.glb`: 2.684 triangles, 18 malles
- `btr82-base-25.glb`: 1.338 triangles, 18 malles

Els models nous s'han calculat independentment sobre el **nou 100%**, no
reduint un LOD un altre cop. Els materials són deu colors militars mats i
opacs, sense textures d'atles/UV. Les vuit rodes conserven grups independents;
al LOD 25% tenen una geometria octogonal neta (48 triangles per roda) per
evitar pics i peces deformades. El casc, la torreta, la mida i la silueta
s'han inspeccionat amb renderitzacions VTK de costat i des de dalt.

Es carreguen automàticament al banc de candidats. El tanc i la tanqueta
jugables no s'han canviat. Els antics LOD intermedis 75/50/25 de la primera
generació se substitueixen; l'original de 21.483 triangles continua arxivat.

assets/vehicle-candidates/README.md## Incidència resolta — BTR-82 sense artefactes UV (9 de novembre de 2026)

Una captura real del visor mostrava les rodes amb peces roses, blaves i verdes i el
casc aparentment desaparegut. La causa és que la reducció offline amb VTK
DecimatePro desplaçava les coordenades UV dins d'uns atlas PNG de paleta amb
moltes zones transparents o de color viu. La posició dels triangles es
conservava, però les UV decimades ja no corresponien als dibuixos de l'atles.
No era un problema del codi de renderitzat o dels punts de vida.

Per corregir-ho de manera robusta, les **tres variants de LOD** 75%, 50% i 25%
utilitzen **10 materials PBR mats** en verd oliva, verd grisós, metall i
negre per a les rodes. S'han eliminat les referències als atles de textures
i les màscares alfa d'aquestes variants, sense tocar cap vèrtex ni índex.
El **GLB original 100% conserva els 11 PNG** i la llicència de SIpriv (CC BY 4.0).

- 75%: 16.109 triangles, 18 malles, 1.164.540 bytes
- 50%: 10.745 triangles, 18 malles, 843.888 bytes
- 25%: 5.371 triangles, 18 malles, 428.172 bytes

S'han fet captures tècniques renderitzades amb VTK dels GLB reals i s'ha
comprovat que el casc, la torreta i les vuit rodes tornen a ser recognoscibles
i que no apareixen els quadrats fluorescents. La cadena de proves valida
SHA256, triangles, materials opacs i la inexistència d'atles als LOD.

Script de regeneració reproduïble: `tools/repair-btr82-materials.cjs`.

