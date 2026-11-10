# Tanqueta BTR-82 · simetria, canó, rodes i optimització (10 novembre 2026)

La pàgina de proves conserva **només dos GLB**:

| Versió | Triangles | Malles | Bytes |
|---|---:|---:|---:|
| Base de referència | 5.371 | 18 | 428.172 |
| **50% escollit refinat** | **4.253** | **12** | **148.760** |

S'ha refet la cara anterior i posterior amb parells de planxes
**simètriques respecte a X=0**, i un panell central fosc
centrat explícitament als dos extrems. S'ha substituït la
geometria d'un antic fragment de canó per **un tub negre cilíndric
prim** (radi 0,065 m) i **una boca més ampla** (radi 0,096 m),
agrupats en una única malla.

Les vuit rodes són **geometries tancades independents**, cadascuna
amb dotze facetes, pneumàtic bisellat, llanta metàl·lica i cub
central; 144 triangles per roda. Se n'ha recuperat el detall
anterior sense tornar a crear rodes buides ni UV corruptes.

**Optimització:** s'han fusionat les peces del casc amb colors per
vèrtex (`COLOR_0`), mantenint-ne els diferents colors militars en
**una sola malla**. Les malles totals passen de **23 a 12** (-47,8%)
i la mida del GLB de 175.632 a 148.760 bytes (-15,3%). Els triangles
pugen de 3.671 a 4.253 (+15,9%) per tornar a donar volum a les rodes,
però són un 20,8% menys que els 5.371 de la base.

La geometria s'ha revisat amb renderitzacions VTK de davant, darrere,
costat i perspectives. Les proves del repositori comproven els dos
panells centrals de debò (coordenades i colors), les rodes, el canó
negre, els malles, els bytes i el SHA256. **No s'ha modificat la
tanqueta jugable** ni la seva física, hitboxes o IA.

Font: **Low Poly BTR 82**, SIpriv, **CC BY 4.0**:
https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5
