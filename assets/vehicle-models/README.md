# Huey UH-1 — model definitiu (CC BY 4.0)

**Model original:** «Bell Huey helicopter», de **Duane's Mind**.
- Font: https://sketchfab.com/3d-models/bell-huey-helicopter-755d8518a06e41b19752c1b54c0da588
- Llicència: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- Modificacions realitzades per a *Hunter: Arxipèlag* (2026-11-08): eliminades les superfícies de les portes i els vidres laterals de la zona de passatgers, de manera que queda oberta a banda i banda. Es conserva la geometria del 100%, els materials/textures originals i els dos pivots animables dels rotors.
- Fitxer aprovat: `huey-duane-doors-open.glb` — 1.767 triangles.

Llicència i autoria aplicables també als redistribuïts modificats. Aquest fitxer no és de domini públic ni CC0; qualsevol distribució del joc que l'inclogui ha de conservar l'atribució.

**Integració:** `src/huey-duane-runtime.mjs` prepara el GLB abans de les missions; `src/vehicle-model-core.mjs` el fa servir com a model `heli` en joc individual i cooperatiu.

## Apache AH-64 — model d'Araon carregat al joc (CC BY 4.0)

**Model original:** [AH-64 Apache, d'Araon](https://sketchfab.com/3d-models/ah-64-apache-df0993ee21e74a759cd0519f6fc51cf8), llicència [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

**Integració funcional actual (2026-11-08):** la malla Apache 50% provinent del GLB d'Araon, amb **2.173 triangles**, s'ha passat a un paquet binari compactat de 18.862 bytes que es publica de debò a `assets/vehicle-models/apache-araon-50mesh.zlib`. El paquet conserva cinc malles diferenciades: fuselatge, interior/cabina, vidre, rotor principal i rotor de cua. Comprimeix les coordenades en mil·límetres, conserva les cares i la lluminositat de l'atles original per vèrtex i es descomprimeix abans de carregar el món.

El runtime `src/apache-araon-runtime.mjs` reconstrueix la malla Three.js, acoloreix el fuselatge de **sàlvia mat** i els rotors de **negre mat**, deixa els vidres translúcids, manté els dos pivots animables i calibra dimensions, rodes i altura del rotor segons el model real. El mateix model es fa servir als modes SOLO i COOP per `src/vehicle-model-core.mjs`. Si hi ha un problema de càrrega, queda la reserva procedural i s'informa de l'error a la consola.

**Diferències respecte del GLB final aprovat a les proves:** el GLB fototexturitzat de ~4 MB (`apache-50-rodes75-salvia-negre.glb`, **2.193 triangles**, rodes recuperades del 75%) continua essent la variant visual preferida, però no s'ha publicat aquí. La versió compacta **sí** es pot carregar immediatament al joc sense passar per cap visor extern, però conserva les rodes del 50% i reprodueix el detall de les textures mitjançant lluminositat per vèrtex, no pas amb els quatre mapes d'imatge. No s'ha de presentar com un GLB idèntic al fototexturitzat.

**Integritat de la geometria compacta:** SHA256 `23a6b241470d04f8cd021293d85b68ec65ecaace1e5a52fa3551f6edeb00ea56`. `tests/apache-approved.cjs` comprova el paquet binari, les cinc peces, els triangles, les dimensions i els pivots.
