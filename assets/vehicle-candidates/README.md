# BTR-82 · reparació real del buit frontal, darrere i canó — 10/11/2026

La versió anterior de 4.199 triangles s'havia validat erròniament perquè
**conservava** tots els triangles del casc de referència. Però el referent
ja tenia el morro obert i una sèrie de cares no connectades als laterals
posteriors. Conservar una superfície oberta no repara cap forat.

## Model del comparador

- **Base:** `btr82-base-100.glb` — 5.371 triangles, 18 malles.
- **BTR-82 corregit:** `btr82-50-repaired.glb` — **4.581 triangles,
  25 malles, 185.796 bytes**.
- Només dos models visibles a la pestanya Tanqueta; **no s'ha modificat**
  el vehicle de les partides SOLO/COOP.

El model nou conserva *exactament* els 2.556 triangles dels vuit grups de
casc de la base, però hi afegeix **superfícies noves de tancament**:
panells del morro i sota el frontal, unió superior amb el sostre,
galtes laterals simètriques al darrere i faldons inferiors que segueixen
el perfil estret de la popa. Les peces addicionals són agrupades per
material per contenir les crides de dibuix. No es fan servir textures UV
que podrien retornar els colors fluorescents.

El canó negre prim (amb boca més gruixuda) va de **z = −4,35** fins
**z = −1,015**: l'extrem posterior se solapa àmpliament amb el volum real
de la torreta, que arriba fins a z = −0,31. Per tant, no queda penjat
davant de la torreta. El frontal del model és −Z. La geometria també
inclou quatre fars davanters i les vuit rodes independents, de 12
facetes i **168 triangles cadascuna, totes watertight**.

## Validacions

`tests/btr82-published-assets.cjs` obre els dos GLB publicats i comprova
SHA256, triangles, malles, conservació exacta de cadascun dels triangles
de casc originals, superfícies de tancament noves a ambdós extrems,
posició dels fars, rodes independents i el solapament del tub del canó
dins de la torreta. S'ha renderitzat **el mateix GLB final** amb VTK
en vistes frontal i posterior. Aquesta validació tècnica no substitueix
la comprovació final del visor Three.js des de Chrome Android.

**Autoria original:** SIpriv, Low Poly BTR 82, CC BY 4.0
https://sketchfab.com/3d-models/low-poly-btr-82-6226acae68424d99bf03882b245ff7c5
