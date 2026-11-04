# Guia única de diagnòstic de rendiment

Substitueix els informes curts 0.5.101–0.5.112, que eren fotografies de revisions puntuals. Les tasques pendents i la prioritat són a [to-do.MD](../to-do.MD), no aquí.

## Objectiu i mètode

Comparar **el mateix codi escènic** amb una única variable canviada: commit, llavor, mida del mapa, resolució, perfil gràfic, càmera, estat de partida, acció (quiet/vehicle/combat) i dispositiu. No sumar temps de GPU i CPU com si fossin independents ni confondre els intervals `requestAnimationFrame` amb el temps d'execució del motor.

1. Obrir `?perfAudit=1` per a l'auditoria A/B; si s'ha de reproduir l'escena carregada, usar `?perfAudit=1&stress=1`.
2. Escena de referència històrica: llavor **2407759483**, mapa petit, gràfics Alts, X=**1208**, Z=**−1594**, mirant a l'interior. La posició i la qualitat s'han de registrar: no són garantia de reproduir un FPS concret.
3. A/B: normal → sense ombres → sense aigua → sense totes dues → normal. La prova fa estabilització, pren mostres de cada fase i restaura les opcions originals. Copiar `window.HUNTER_PERF_AUDIT_RESULTS` o el resum de pantalla.
4. Registrar el temps de fotograma (p50, p95, p99 i intervals de ~16,7/33,3 ms), CPU de render/actualització/IA/navegació, `gpuMs` / `gpuP95Ms` quan els temporitzadors de la GPU estan disponibles, `drawCalls` per tipus, motius de refresc de les ombres, i mètriques de camins/vehicles/partícules.
5. Acompanyar-ho de captures idèntiques: costa/terra, cristalls, pintura, cabina/ocupants, ombres, pedres, vegetació i explosió. En COOP, afegir telemetria `window.HUNTER_COOP_NETWORK_STATS` d'HOST i GUEST.
6. Repetir **amb més d'una execució** i separat en PC, Android, mapa gran i explosió activa. Les proves sintètiques no són un benchmark WebGL.

## Interpretació i decisions d'optimització

- **GPU alta, CPU baixa:** revisar overdraw de transparències (fum, explosions, vidres, aigua), ombres, draw calls i resolució. No reduir qualitat abans d'aïllar el subsistema causant.
- **CPU de render alta / draw calls:** batching només de parts rígides amb propietats compatibles. Protegir pivots de rodes, torretes, rotors, veles, timons, armes i cristalls.
- **IA amb pics:** revisar pressupost de cerca A* i la distinció de soldats propers/en combat vs patrulles llunyanes. Les optimizacions anteriors limiten expansions i reutilitzen candidats; no desfer-ho indiscriminadament.
- **Ombres:** la memòria cau i el refresc preventiu (~180 ms històrics) ja existeixen; les gavines i les barques no haurien d'invalidar-les cada frame sense motiu. Mesurar `HUNTER_SHADOW_STATS` abans de tocar-ho.
- **Camins/LOD:** ja existeixen grups grans, revisió de superfície i *fast skip*. Verificar que la memòria cau s'invalida quan es modifica el relleu.
- **Explosions:** buscar spikes per creació/alliberament de malles i materials, saturació de partícules, ombres i sobreposició transparent. Mantenir les tres escales, el fum vertical i l'orientació de l'impacte.
- **COOP:** separar cost de simulació en Durable Object, serialització, difusió, snapshots, integració visual, RTT i predicció. No interpretar «RTT menor» com prova que FPS hagin millorat.

## Regressions automàtiques orientatives

```bash
npm run check:build
npm run test:optimization
npm run test:perf-audit
npm run test:shadow-cache
npm run test:vehicle-batching
npm run test:coop:offline
npm run test:coop:integration
```

Hi ha proves més específiques a `tests/` per a frame pacing, agrupació de camins, pressupost A*, fauna i candidats espacials. Consultar `package.json` o executar el fitxer concret amb Node. Aquestes proves documenten invariants; **no** certificaran per si soles GPU real ni dos jugadors.

## Historial tècnic comprimit

- **v0.5.101–103:** instrumentació A/B, costos de crides de dibuix i ombres, cache de transformacions, agrupació del jugador i de camins.
- **v0.5.104–106:** eliminació d'invalidacions d'ombres causades per fauna i balanceig de barques; desglossament de flota i batching conservador de cotxes/vehicles. Les xifres de malles són de proves sintètiques, no FPS.
- **v0.5.108–110:** optimitzacions de navegació i d'A*, lots de camins/cotxes i via ràpida quan la revisió del terreny no canvia.
- **v0.5.111–112:** histogrames de *frame pacing*, timers GPU si suportats i pressupost temporal d'A* per amortitzar pics (amb preferència de combat). Un ordinador pot no exposar els timers GPU.

El detall de cada intervenció encara es pot consultar a l'historial Git dels fitxers retirats. Aquest document és una **guia de diagnòstic**; les millores efectives exigeixen una mesura abans/després.
