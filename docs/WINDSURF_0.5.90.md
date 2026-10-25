# Windsurf redissenyat — 0.5.90

Referència: fotografia de windsurfista aportada el 25/10/2026.

- Vela invertida a babord (X negatiu), més alta (8,35 unitats de màstil × 1,05 escala = 8,77 m), més semblant a la vela alta i triangular de la referència. El conjunt de vela i botavara té un pivot a peu de màstil i una inclinació petita cap a proa quan navega.
- Pilot a estribord, amb tors en 7/8 (1,13 rad), lleugerament tirat cap enrere (rotació X ≈ 0,21), genolls flexionats i peus en posició escalonada. S'ha corregit una inversió dels índexs de braços esquerre/dret.
- Dos punts reals d'agafada sobre la botavara (aprox. 45 cm entre mans), calculats amb la transformació 3D del pal. Braços interpolats amb IK; la mà esquerra continua agafant la botavara quan la dreta dispara.
- La pistola del pilot surt de la dreta i el projectil surt des de la boca física de la pistola, orientada a proa, sense girar excessivament tot el cos.
- Quan la taula és varada i no hi ha pilot, la vela descansa horitzontal en direcció longitudinal a la taula; en pilotar-la s'alça progressivament. Per defecte, els windsurfs varats es col·loquen a la sorra, aproximadament a +0,32 m de la superfície del terreny.
- Prova `node tests/windsurf-stance.cjs`: Three.js real, geometria de vela, dues mans sobre la barra, postura, tret amb mà dreta i transició platja-aigua.

Canvis al motor integrats a la distribució v0.5.90. Falta comprovació visual amb el navegador/Android; la prova CPU no emula WebGL real.
