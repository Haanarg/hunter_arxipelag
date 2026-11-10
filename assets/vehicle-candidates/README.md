# BTR-82: restauració de la silueta del casc i del canó (10 novembre 2026)

## Correcció de regressions

El refinament anterior havia incorporat grans planxes **planes, superposades i
mal orientades** als dos extrems. A més, el tub del canó s'havia dibuixat cap
a **+Z**, quan el frontal real del BTR-82 i el canó de la geometria d'origen
estan orientats a **−Z**.

Aquesta versió **elimina del tot** les planxes artificials i reconstrueix el
casc usant els vuit grups originals del GLB de referència
`btr82-base-100.glb`. Preserva els seus **2.556 triangles exactes** de
superfície i hi manté els **44 triangles** del folre interior ja existents
(per cobrir buits). No s'ha realitzat cap decimació addicional al casc.

La torreta escollida es manté (303 triangles), sense el canó gris antic.
El canó negre cilíndric (96 triangles) està ara orientat cap a **−Z**:
tub de radi **0,065 m** i boca de radi **0,096 m**. Les vuit rodes
independents conserven el detall millorat (144 triangles per roda, llanta,
cub i pneumàtic tancat). Els dos fars auxiliars que s'havien posat a
l'extrem equivocat s'han reorientat cap al frontal real, preservant el
mateix material opac de les lents.

## Resultats

| Model de comparació | Triangles | Malles | GLB |
|---|---:|---:|---:|
| Base de referència | 5.371 | 18 | `btr82-base-100.glb` |
| **Versió restaurada** | **4.199** | **13** | `btr82-50-repaired.glb` |

El GLB restaurat pesa **147.776 bytes**. El nombre de malles puja de 12
a 13 respecte de la versió incorrecta perquè els fars tenen la seva
carcassa independent, però queda molt per sota de les 23 malles de la
reparació inicial. No s'ha introduït cap atles UV que torni a mostrar
colors estranys.

Les proves automatitzades comparen les coordenades de **cada triangle
del casc de la base** amb el GLB restaurat, verifiquen el sentit del canó
i de la boca, les vuit rodes, els fars i el SHA256 del model. La
comprovació visual final s'ha fet amb vistes anterior, posterior,
lateral i perspectives mitjançant VTK.

**Font i llicència:** Low Poly BTR 82 de SIpriv · CC BY 4.0
https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5

La tanqueta jugable NO ha canviat. El comparador manté només els dos
models i carrega la versió nova automàticament.
