# Pla de modernització visual

## Objectiu
Mantenir l'estètica low-poly i tota la jugabilitat existent, però separar progressivament simulació i renderitzat i portar el renderer a una base moderna.

## Diagnosi
- El joc és un únic HTML autònom amb Three.js r128 incrustat.
- La simulació, la generació procedural, la IA, l'àudio, la UI i el renderer comparteixen el mateix script.
- Ja existeixen ACES Filmic, sRGB, ombres, boira, cel procedural i un shader d'aigua propi.
- El principal risc d'una reescriptura total és introduir regressions en mecàniques que ja funcionen.

## Estratègia
1. Baseline visual: qualitat adaptativa, materials físics coherents i preservació del low-poly.
2. Modularització: separar configuració, renderer, món, entitats, vehicles, combat, àudio i UI.
3. Three.js modern: substituir r128 incrustat per una versió moderna empaquetada localment i ES modules.
4. Il·luminació: sol, ambient, ombres i atmosfera amb presets de qualitat.
5. Materials: famílies PBR estilitzades per terreny, metall, pintura, vidre, vegetació i edificis.
6. Aigua: conservar el sistema procedural, afegint reflex/refraction simplificats només als perfils que ho suportin.
7. Postprocessat: bloom molt subtil, contrast/color grading i AA segons dispositiu.
8. Rendiment: instancing, frustum/LOD, pressupost d'ombres i resolució dinàmica.
9. Assets: mantenir geometria procedural on aporti estil; migrar vehicles/personatges a GLTF només quan millori clarament silueta i animació.

## Regla de compatibilitat
Cada fase ha de mantenir una versió jugable al navegador. No es reescriurà la simulació al mateix temps que el renderer.

## Primera fase implementada
- Perfil de qualitat mòbil/escriptori.
- Pixel ratio limitat segons dispositiu.
- Resolució d'ombres adaptativa.
- Renderer amb il·luminació físicament coherent.
- Materials base amb roughness/metalness explícits.
- Material de terreny centralitzat.

## Validació pendent
Cal provar aquesta branca en navegador/WebGL real abans de fusionar-la, especialment FPS, exposició, intensitat de llum, ombres i aspecte de l'aigua.
