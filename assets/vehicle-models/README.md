# Huey UH-1 — model definitiu (CC BY 4.0)

**Model original:** «Bell Huey helicopter», de **Duane's Mind**.
- Font: https://sketchfab.com/3d-models/bell-huey-helicopter-755d8518a06e41b19752c1b54c0da588
- Llicència: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- Modificacions realitzades per a *Hunter: Arxipèlag* (2026-11-08): eliminades les superfícies de les portes i els vidres laterals de la zona de passatgers, de manera que queda oberta a banda i banda. Es conserva la geometria del 100%, els materials/textures originals i els dos pivots animables dels rotors.
- Fitxer aprovat: `huey-duane-doors-open.glb` — 1.767 triangles.

Llicència i autoria aplicables també als redistribuïts modificats. Aquest fitxer no és de domini públic ni CC0; qualsevol distribució del joc que l'inclogui ha de conservar l'atribució.

**Integració:** `src/huey-duane-runtime.mjs` prepara el GLB abans de les missions; `src/vehicle-model-core.mjs` el fa servir com a model `heli` en joc individual i cooperatiu.

## Apache AH-64 — model seleccionat d'Araon (CC BY 4.0)

Font original: [AH-64 Apache d'Araon](https://sketchfab.com/3d-models/ah-64-apache-df0993ee21e74a759cd0519f6fc51cf8) — [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

Modificacions: fuselatge simplificat a un detall equivalent al 50%, rodes simplificades separadament al 75% des de la font 100%, pintura sàlvia mat, rotors principal i de cua i detalls en negre mat, quatre textures incrustades. Model final: 2.193 triangles.

Fitxer definitiu esperat: `assets/vehicle-models/apache-araon-salvia-black.glb`. Verificació local del GLB preparat: SHA256 `be906866d6ac87835f2e30b11ce14bcc6b6ff13ee2cb39e798fd3cf6167f89df`.

**Estat: la integració del codi és a GitHub, però la pujada del fitxer GLB de 4 MB està pendent.** El connector de GitHub d'aquesta conversa permet escriure codi, no transferir directament un binari de `/mnt/data`. Quan no hi ha GLB publicat, la fàbrica `heli_combat` fa servir la geometria procedural de reserva.

El runtime `src/apache-araon-runtime.mjs` prepara el GLB un cop, separa els pivots del rotor principal i de cua, ajusta orientació, escala i contacte de les rodes; SOLO i COOP comparteixen la mateixa fàbrica.
