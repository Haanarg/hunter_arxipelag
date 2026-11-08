# Huey UH-1 — model definitiu (CC BY 4.0)

**Model original:** «Bell Huey helicopter», de **Duane's Mind**.
- Font: https://sketchfab.com/3d-models/bell-huey-helicopter-755d8518a06e41b19752c1b54c0da588
- Llicència: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- Modificacions realitzades per a *Hunter: Arxipèlag* (2026-11-08): eliminades les superfícies de les portes i els vidres laterals de la zona de passatgers, de manera que queda oberta a banda i banda. Es conserva la geometria del 100%, els materials/textures originals i els dos pivots animables dels rotors.
- Fitxer aprovat: `huey-duane-doors-open.glb` — 1.767 triangles.

Llicència i autoria aplicables també als redistribuïts modificats. Aquest fitxer no és de domini públic ni CC0; qualsevol distribució del joc que l'inclogui ha de conservar l'atribució.

**Integració:** `src/huey-duane-runtime.mjs` prepara el GLB abans de les missions; `src/vehicle-model-core.mjs` el fa servir com a model `heli` en joc individual i cooperatiu.

## Apache AH-64 — variant definitiva d'Araon (CC BY 4.0)

**Font:** [AH-64 Apache, d'Araon](https://sketchfab.com/3d-models/ah-64-apache-df0993ee21e74a759cd0519f6fc51cf8), llicència [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

**Fitxer definitiu verificat i restaurat:** `assets/vehicle-models/apache-araon-salvia-black.glb` — **4.123.680 bytes**, **2.193 triangles**, **quatre textures incrustades**, cos 50%, rodes 75%, fuselatge sàlvia mat, rotors, rodes i detalls negres. SHA256 `be906866d6ac87835f2e30b11ce14bcc6b6ff13ee2cb39e798fd3cf6167f89df`. El blob Git original `6f36c98354d7ed9e6750ea8c33ed7745a266b9a9` s'ha recuperat del commit `df4eff85852da263e9354050cc2ed444f9320136` i reposat a `main` sense recompressió ni cap modificació. Això resol la falta de l'arxiu que feia sortir el model procedural antic.

**Carregador:** `src/apache-araon-runtime.mjs` importa el GLB abans d'iniciar les missions. Conserva el pivot del rotor principal i el de cua, adapta l'orientació +Z a -Z, escala segons la longitud real, fixa el contacte de les rodes amb el sòl i entrega una fàbrica síncrona compartida entre SOLO i COOP.

**Reserva de seguretat opcional:** `assets/vehicle-models/apache-araon-50mesh.zlib` (18.862 bytes), geometria original d'Araon simplificada al 50% amb 2.173 triangles, cinc malles diferenciades i colors mate sàlvia/negre reconstruïts per vèrtex. Si no es pot carregar el GLB definitiu, el joc prova aquesta versió abans de recórrer a la geometria procedural antiga. Aquesta reserva compacta no té les rodes recuperades al 75% ni les textures de la versió principal.

**Proves:** `tests/apache-approved.cjs` confirma la presència i SHA256 del GLB definitiu, els 2.193 triangles, els rotors negres, quatre textures, i també la integritat i dimensions de la reserva compacta. Resten pendents les proves visuals WebGL de les ombres, les textures, el pilotatge i les animacions en una partida real.
