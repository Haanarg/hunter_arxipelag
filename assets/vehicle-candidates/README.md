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

