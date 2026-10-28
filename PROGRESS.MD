# HUNTER · ARXIPÈLAG — progrés de les millores

## Estat actual · v0.6.25

**Publicació:** la versió del codi d’aquesta fase és v0.6.25. Integració a `main` i desplegament amb Cloudflare Builds; les comprovacions de producció es fan separadament de les proves locals.

**Primera missió cooperativa jugable: Relleu d’emergència**, per a dos comptes aprovats. Inici confirmat pels dos clients, moviment/col·lisions autoritatius, terminals simultanis, extracció/victòria, pausa per desconnexió i recuperació de checkpoint. Vista 3D provisional amb alternativa Canvas i controls tàctils. Des de v0.6.20, portes compartides (actualment E / Acció), col·lisions dinàmiques i estat persistent en reconnectar. [Instruccions, validació i límits](docs/COOP_PLAYABLE.md).

Des de v0.6.21, cada jugador té **inventari independent** de bales, granades i disfressa, recollida exclusiva de paquets, capacitats, equipament de disfressa visible i persistència en reconnectar/reiniciar durant la mateixa versió. Ordres autoritzades per sessió, idempotència i desament abans de confirmar.

Des de v0.6.22, **recollida automàtica per contacte** (sense botó R), primer contacte resolt pel servidor, i **G / Deixar** amb selector de bales, granada o disfressa per passar objectes al company. Els objectes deixats són compartits i persistents dins del checkpoint temporal.

Des de v0.6.23, **combat bàsic autoritatiu contra dues dianes opcionals**: X / Disparar davant teu i B / Granada, amb munició individual, cadència, impactes, trajectòria/detonació i dany amb obstacles. Efectes i vida de les dianes compartits en 3D/Canvas. Les dianes no són enemics amb IA; els dos terminals i l’extracció continuen sent l’objectiu de la missió.

Des de v0.6.25, **F dispara i E és l’acció contextual (porta o terminal)**. Les dues dianes s’han convertit en guàrdies amb patrulla, alerta, atacs i dany als jugadors. La disfressa redueix la detecció de 18 a 4 m; atacar genera alerta. La vida dels dos jugadors és visible i perdre’n un fa fracassar la missió.

L’usuari ha prioritzat la jugabilitat sobre l’estètica. Aquest és un mode reduït de base, no la campanya completa amb combat/vehicles. Els apartats antics que diuen «no jugable» descriuen l’estat de cada fase històrica. Els pendents generals i la fase 1 tancada per l’usuari es conserven.

Actualitzat: 2026-10-28 (estat general històric fins a v0.5.84; decisions i inici de fase 5 actualitzats). Aquest fitxer és el punt de represa del pla de catorze fases, ordenat inicialment per impacte. S’han completat i desplegat les fases **6, 8, 10 i 12**. L’usuari ha triat B + C de la fase 11: sabotatge de ràdio i camp de presoners amb camperols i un mecànic únic. La versió v0.5.84 està desplegada amb el camp redissenyat i exigeix un camp amb cinc presoners abans d’activar cada operació; A i la nit/espera continuen pendents. La resta continua pendent segons la taula. «Implementada» no equival a validació física en Android.

## Estat de les fases

| Fase | Objectiu | Estat i evidència | Què queda |
| --- | --- | --- | --- |
| 1 | Missions completables | **Tancada per decisió de l’usuari el 2026-10-28.** Validador fora del runtime i regressions d'accés local; commit `79bdca3`. Matriu de 8 combinacions llavor/escala i cas complet 67/1 superats. [Detall](docs/MISSION_VIABILITY.md). | Sense feina pendent en aquesta fase per decisió de l’usuari. Les proves històriques no equivalen a una demostració universal. |
| 2 | Separar càmera i conducció; interiors segurs | **Implementada**, v0.5.76, commit `a982a9b`. Mirada lliure als vehicles i càmera restringida al soterrani; proves de 16 perfils i geometria. [Detall](docs/PHASE2_CAMERA.md). | Passada visual WebGL i Android físic. |
| 3 | Simulació coherent amb FPS baixos | **Implementada**, v0.5.77, commit `404f246`. Subpassos de fins a 1/60 s, límit de 250 ms, rellotges de joc/cinemàtiques separats i proves de cadència/trajectòria. [Detall](docs/PHASE3_SIMULATION.md). | Mesura en dispositiu real; no és determinisme exacte ni una garantia d'FPS. |
| 4 | Rendiment sostingut a Android | **Pendent**, ajornada en prioritzar 6 i 8. | Perfilar CPU/GPU, memòria i bateria durant partides llargues; optimitzar segons les mesures. |
| 5 | Desar, suspendre i reprendre l'operació | **En curs.** v0.6.5 integrada a main i desplegada. v0.6.7 preparada en branca: comptes Cloudflare amb aprovació manual i recuperació per codis, sincronització, estadístiques/llavors i autoritat local per a cinc accions. [Desaments](docs/PHASE5_SAVES.md), [comptes i pendents](docs/ACCOUNTS_HISTORY_AUTHORITY.md). | Activar D1/R2/secrets i validar producció; navegador/Android i mapes grans; transferència real entre dispositius; recuperació excepcional d’administradors; quotes i retenció; completar autoritat i cooperatiu. |
| 6 | Combat llegible | **Implementada i desplegada**, v0.5.78, commit `f80705b`. Espurnes distintives d’ineficàcia, sang més visible als ferits, confirmació d’impacte real i direcció del dany. [Detall](docs/PHASE6_COMBAT.md). | Aspecte visual/GPU i Android físic pendents. |
| 7 | Orientació i ritme de missió | **Pendent**, ajornada. | Guia d'intel/objectius i direcció útil del waypoint, sense revelar informació desconeguda. |
| 8 | Sigil i IA llegibles | **Implementada i desplegada**, v0.5.79, commit `fc2a3c3`. Marcadors visibles de sospita/contacte/cerca, posicions de tir i flanc reservades i torns d’entrada. [Detall](docs/PHASE8_STEALTH.md). | Llegibilitat visual, GPU i Android físic pendents. |
| 9 | Controls tàctils personalitzables | **Pendent.** | Esquerrans, sensibilitat, posicions i persistència de preferències. |
| 10 | Generació progressiva del món | **Implementada i desplegada**, v0.5.80, commit `7d967fe`. Un mateix generador per camins síncron i progressiu, feina fragmentada i càrrega/cancel·lació recuperables. [Detall](docs/PHASE10_GENERATION.md). | Latència i aspecte en GPU/Android físic pendents. |
| 11 | Exploració opcional amb decisions | **Primer prototip B + C implementat i desplegat**, v0.5.84, amb camp redissenyat i presència obligatòria validada abans de jugar. Ràdio sabotejable, camp amb camperols i únic mecànic per reparar. [Detall](docs/PHASE11_EXPLORATION.md) i [decisió](docs/PHASE11_QUESTIONNAIRE.md). | Revisió jugant amb l’usuari; A i nit/espera pendents. Transport del mecànic en vehicles i ampliacions del sandbox fora d’aquest prototip. |
| 12 | So espacial informatiu | **Implementada i desplegada**, v0.5.81, commit `27b3d77`, integrada sobre la fase 10. [Detall](docs/PHASE12_AUDIO.md). | Escolta i qualitat auditiva en Android físic pendents. |
| 13 | Modularització i regressions | **Pendent com a fase.** Hi ha extraccions i proves parcials a les fases anteriors. | Reduir dependències globals i ampliar regressions de comportament. |
| 14 | Acabat visual i final de partida | **Pendent com a fase.** | Animacions/LOD, poliment, salt de cinemàtiques i resum final. |

## Base publicada i desplegament

- Neteja i recursos compartits: v0.5.75, commit `076cda2`; [notes](docs/CODE_OPTIMIZATION_2026-10-24.md).
- Correcció de Cloudflare Workers Static Assets: commit `9a1b87b`. `wrangler.jsonc` explícit i `.assetsignore` impedeixen publicar `node_modules`, eines i documentació. La configuració conserva el Worker existent.
- Última versió comprovada abans d'aquestes fases: **0.5.77** a <https://hunter.paradoxa.cat/>. Check Cloudflare reeixit i bundle públic idèntic al verificat localment; l'usuari també en confirma la versió.
- GitHub Actions continua **només manual**. El desplegament de Cloudflare es comprova separadament: un commit a GitHub no demostra que sigui públic.

## Criteris de validació de les fases 6 i 8

1. Proves de comportament de les fonts i del bundle de producció, més regressions afectades.
2. Recursos visuals limitats, neteja en reiniciar i cap canvi accidental a dany, cadència o immunitats.
3. En sigil, cap marcador darrere d'obstacles ni coneixement de la posició actual del jugador només per haver sentit un soroll.
4. Versió i bundle coherents; commit publicat, check de Cloudflare i fitxers públics comprovats.
5. Registrar aquí els resultats i els límits de validació real.

## Registre de la fase 6

- v0.5.78 preparada amb runtime `d88c4ce38ac40c05` (53 mòduls). Les dues suites de feedback passen sobre fonts i bundle final. Integritat/cache, dany enter, dany enemic, UI, càmera i cinemàtica de mort superats.
- La revisió independent inclou cobertura, owners de projectils/explosius, immunitats, ferides supervivents, gir de càmera amb rumb del jugador constant, casc/pilot i 20 ràfegues sense més de 112 malles ni efectes orfes.
- Publicada com a `f80705b643a7dde2e235701cdd33a4c3f19c7ce2`. Check de Cloudflare completat amb èxit (build `9bbbb943-4bf6-4647-9f07-4f857c99ed1a`, Worker version `8a8824f7-c280-416a-8600-d68c8e27dbf5`). HTTP públic comprovat: entrada i `version.mjs` a 0.5.78; runtime `d88c4ce38ac40c05`, 585.964 bytes, idèntic byte a byte al local verificat.
- Prova visual intentada sobre la base pública v0.5.77: el navegador cloud no pot crear un context WebGL, també amb qualitat mínima. No s’atribueix aquest error als canvis de fase 6.

## Registre de la fase 8

- v0.5.79, runtime `2d9cc3d4303144f1`: 54 mòduls, 597.628 bytes. Conserva totes les millores de la fase 6.
- Fonts i bundle final: percepció, marcadors, coordinació i revisió independent superats. Regressions de feedback de combat, càmera de 16 perfils, dany enter, cinemàtica de mort, UI i navegació superades; integritat/cache i dry-run de Wrangler correctes. Les regressions temporals passen en fonts i bundle (36 m/3 s, 46 trets/10 s als set perfils).
- Cas real de porta 2,5 m: de 1/3 soldats que entraven en 30 s a **3/3 en tots dos ordres**. Separació mínima 2,40029 m / 2,41392 m i zero posicions dins de murs. Tres reserves de tir separades almenys 10,20 m en el cas independent.
- Provats alliberament per mort, absència de tasca, bloqueig i pausa; reintents després d’un reset amb rellotge antic de 1.000 s; desaparició de marcadors amb cobertura i immediata revalidació en obrir-la; cos/forjat/envà del soterrani; límits de malles i comprovacions.
- La cerca conserva la posició i alçada recordades, ignora l’interior/planta actuals del jugador ocult i no reinvestiga el propi crit. Rang de detecció, dany i cadència conservats.
- Publicada com a `fc2a3c3e19718dccc68807c47d85d076a14b17d3`. Check de Cloudflare completat amb èxit (build `e1629722-49f0-4382-9087-e1a8be69b87a`, Worker version `01148b74-c0aa-4704-9459-c5f8a95bcc74`). Verificació pública `2026-10-24T20:52:48.015792+00:00`: entrada i `version.mjs` a **0.5.79**, runtime `2d9cc3d4303144f1`, 597.628 bytes, idèntic byte a byte al local verificat (SHA-256 `ea86d357006287bd34f08aafe6fe74b7f21ee1172c9d9fed4985ba1d4b1b8323`).
- Fases **4, 5 i 7 pendents**, i resta del pla segons la taula. La fase 1 continua parcial; la validació visual en GPU/Android continua pendent.

## Registre de la fase 10

- v0.5.80 preparada amb runtime `5968caddcf5e5fe0`: 54 mòduls, 624.916 bytes. Inici i reinici de producció asíncrons; eines i cercador conserven build síncron.
- Matriu independent sobre la base intacta `651884f`: 67/12345 × escales 1/2 lògics i 67/1 físic, camins síncron i onclick progressiu. Conserven emplaçaments, col·lisions, botí i continuació RNG; fingerprints compactes amb procedència i dos comptadors interns de consulta exclosos.
- Món físic 67/1: 15.800 nodes, buffers/instàncies/transforms/visibilitat exactes al baseline (`8c64015e34be5868a382ac2d14501452c76f218499ee9d203a5f20325e2635ca`).
- Proves de dobleclic, cancel·lació/callback obsolet, error abans del primer await, retry/restart, recursos de terreny parcial, focus/hidden, promesa de bootstrap, desbloqueig d’àudio sense RNG anticipat i absència de simulació/deute temporal. Els errors injectats de prova són intencionats.
- El scheduler té objectiu 6 ms/32 checkpoints, no termini dur. Es registren maxStepMs/maxTurnMs i etapa; encara hi ha constructors/operacions natives atòmiques. No s’ha afirmat millor rendiment Android ni equivalència universal de llavors.
- Fonts i paquet final `5968caddcf5e5fe0`: suites pròpia i independent de generació superades (matriu de cinc casos, lifecycle i física). Les regressions de timing, càmera, combat/sigil, recursos, aigua, roques, palmeres, camins, navegació i cache també passen.
- La passada final del paquet va mesurar un pas màxim de 52,49 ms al cas 67/1 físic (2.318 torns); és una mesura Node/harness amb renderer simulat, no un benchmark Android.
- Publicada com a `7d967fe8a224b86be455a419f5011cc3d56920d2`. Cloudflare: èxit, build `0772c6e8-fcb8-465a-a7c9-1305b6686715`, Worker version `5860cdaf-29d1-4c6c-8549-29544ff704f2`. Verificació HTTP `2026-10-24T21:41:22.221803+00:00`: entrada i version.mjs a 0.5.80, runtime `5968caddcf5e5fe0` de 624.916 bytes, idèntic al local (SHA256 `f28000759f5313fb690e79b0fe701e7e99df721ceac76fe5d7239374ac934dff`).

## Registre de la fase 12

- v0.5.81 preparada amb runtime `70ae02e240d66267`: 54 mòduls, 634.752 bytes. Integrada sobre la fase 10, amb la mateixa geometria i inici progressiu.
- Fonts i paquet: suite espacial i revisió independent d’integració superades. Buffer/context/bucles reutilitzats, atenuació única, listener real, veus 18/24 amb prioritats, throttle per emissor, neteja/pausa/mute/focus, errors de graf i autoplay provats.
- Repetició del món físic 67/1 sobre el paquet integrat: buffers i 15.800 nodes exactes al baseline. Passen també timing (set perfils), càmera (16 perfils), feedback 6, sigil 8, mort/victòria i integritat/cache. La comprovació auditiva real en Android continua pendent.
- En acabar la fase 12 es va lliurar el qüestionari de la fase 11. Les respostes s’han recollit el 2026-10-25; vegeu-ne el registre següent. La fase 11 encara no té implementació.
- Publicada com a `27b3d779ccdae5a6037f6f07a963149623487323`. Cloudflare: èxit, build `2c6a70e8-8a9e-4920-ad85-98535d2711a3`, Worker version `49154c54-aacd-4cb4-aea4-154cb66fab54`. Verificació HTTP `2026-10-24T21:48:05.039830+00:00`: entrada i version.mjs a **0.5.81**, runtime `70ae02e240d66267` de 634.752 bytes, idèntic al local verificat (SHA256 `d4bae8ce06dc72b1cb1cf10e6f60f7586ac73224dd87247afd3f39986d8461b9`).

## Registre de la fase 11 — direcció creativa

- 2026-10-25: respostes de l’usuari desades al [qüestionari](docs/PHASE11_QUESTIONNAIRE.md), amb la seva escena literal i els límits explícits.
- Sandbox obert: preparació de l’assalt, aventures i descoberta lliure. Prioritat d’activitats: **vehicles/equipament → sabotatge → rescats**. Prioritat de recompenses: **equipament/transport → defenses/patrulles → conseqüències visibles**.
- Descoberta per pistes, documents/ràdio i identificació després de descobrir; ritme mixt. Les errades poden canviar condicions tàctiques, mantenint viable l’objectiu principal. Sense fabricació d’objectes, diàlegs llargs ni obligacions secundàries.
- Les [propostes](docs/PHASE11_DESIGN.md) són compatibles dins el sandbox. L’usuari ha triat B (ràdio) i C, ampliada amb un camp de presoners, per al primer prototip; A (magatzem de costa) continua pendent.
- Base reutilitzada: cisalla, disfressa, patrulles, búnquer, general i guàrdies. La disfressa no garanteix pas segur i la porta del búnquer fa soroll. La nit/espera encara necessita desenvolupament; el sabotatge i els rescats s’han implementat en el prototip següent.
- L’usuari ha escollit **B + C** i ha substituït la proposta inicial de C per un camp amb camperols i un únic mecànic que repari vehicles. A i nit/espera queden pendents.
- Primer prototip v0.5.82 implementat amb tres agents de desenvolupament i una revisió independent. Sabotatge real dels avisos cap a dues unitats existents de l’HQ; camperols que evacuen, mecànic rescatable, seguiment a peu voluntari i reparació local de sis segons. Sense fabricació ni obligacions secundàries. [Detall](docs/PHASE11_EXPLORATION.md).
- Runtime inicial validat `4e3793350807674d`: 56 mòduls, 666.019 bytes, SHA-256 `7ce2a0e22b83d8f4081bbd8b6e64ebcbe786fd6a401b30fb08dfe19ae1bebd43`.
- Fonts: proves pròpies i independents de B/C, quatre variants de comunicacions × quatre orientacions, dany a neutrals amb cobertura, sis segons de reparació i interrupcions, rescat/seguiment, registre del cercador i límits visuals superats. Matriu de camp 67/12345 × 1/2 i presència addicional a 0/1/42/999/2026/4294967295 superades; físic 67/1 amb rutes reals i camió de 6,525 × 14,1375 m.
- Fonts: càrrega completa superada, amb semàntica i continuació RNG en cinc casos, geometria física síncrona/progressiva exacta (15.829 nodes; SHA-256 `f636be53fe6b8f4511cdd6ec12b8f0cb11d4215b67f26a3989254025a57a4865`), cancel·lació/error/retry/restart, focus, neteja parcial i bootstrap. Els fingerprints històrics v0.5.79 continuen intactes; mode explícit `PHASE10_LEGACY_BASELINE=1`, perquè l’addició del camp canvia legítimament el món. El màxim de pas observat de 113,4 ms és una mesura Node/harness, no Android ni una garantia del pressupost de 6 ms.
- Regressions en fonts: timing de set perfils, càmera de 16 perfils, feedback, sigil/coordinació, so i revisió independent, dany enter i dany enemic, mort/victòria, pausa i hooks de render superats. Paquet final: B/C i revisió independent, feedback, sigil/coordinació i so superats; build/cache correctes.
- Paquet del prototip `4e3793350807674d`: càrrega física 67/1 síncrona/progressiva amb els mateixos 15.829 nodes i SHA de geometria que en fonts; semàntica/16R, zero deute temporal, cancel·lació obsoleta, error/retry/restart, focus/reprendre, disposició parcial i bootstrap superats. Càmera de 16 perfils i revisió independent de B/C també superades al paquet.
- Paquet final: camp físic 67/1 superat, 159 mostres de ruta, quatre vies d’evacuació i ruta del mecànic sense obstacles, entrada/badia per al camió real i màxim desnivell 0,269 m per 0,5 m. Totes les comprovacions programades completades. La passada visual/tàctil en Android continua pendent.
- Publicació inicial `a933f5bbdfc9c6ef3c7543d5a548d59732043343`: Cloudflare completat amb èxit, build `7f65f7f9-cb8b-47e1-99aa-1801c09c2b35`, Worker version `40f779ad-0d23-4be5-a650-51e122866fd8`.
- Correcció final: un panell físicament destruït continua ocult en canviar la distància de visió; un panell intacte sabotejat conserva la representació desactivada. Prova amb explosió real i seqüència prop/lluny/prop superada. Runtime final `f20fabb09fdfc2ce`: 56 mòduls, 666.040 bytes, SHA-256 `dc1e6246f748ff9a8cf44231d1c3a70a3b3649fa9877e2b755a2bbf5115d6a7f`. Aquesta correcció no modifica la generació. Ràdio, integració independent B/C, càmera de 16 perfils i integritat/cache repetits sobre el paquet final.
- Correcció final publicada com a `254e88d8e4d10ab20fa32eee2f95a53e4d893ec7`. Cloudflare completat amb èxit: build `62ea4f6b-7126-4de6-80e8-c256b6697a9c`, Worker version `b8ea74e6-f5af-4865-bd35-28077a2b6fae`. Manifest, fonts i runtime final verificats al repositori remot contra els blobs locals.
- Des d’aquest entorn no s’han pogut llegir els fitxers públics de hunter.paradoxa.cat (HTTP 403 i eina web sense accés); no s’afirma comprovació HTTP byte a byte de v0.5.82. Els desplegaments inicial i de la correcció final estan confirmats pels checks Cloudflare dels commits exactes.

## Correcció del camp per llavor — v0.5.83

- L’usuari informa que no ha trobat camp en una partida aleatòria. La llavor concreta no es coneix. En la base 0.5.82 s’han observat 18 casos amb camp i s’ha reproduït el defecte de contracte amb candidats rebutjats: 6.682 intents, cap camp i la generació continuava.
- Camp reservat immediatament després de base/HQ. S’eliminen l’omissió silenciosa i el resultat reeixit amb `prisonCampUnavailable`. Cerca seca, terrassa i última illa de reserva determinista amb comprovació de separació. No hi ha canvi de llavor per trobar camp.
- Franja contínua d’evacuació fins z98 i corredors protegits de camins/vehicles inicials. Validador abans d’activar l’operació: un camp, quatre camperols i un mecànic vius, coordenades finites i models físics al món. [Detall](docs/PRISON_CAMP_GUARANTEE.md).
- Font: 2.048 prefixos reals de generació (1.024 llavors úniques × escales 1/2) superats en 37,134 s a Node/harness; tots naturals, zero terrasses/illes de reserva i cap canvi de llavor efectiva durant la reserva. No és una prova de totes les 2^32 llavors ni un benchmark Android.
- Fonts: branques normal/terrassa/illa, candidats ocupats, zero consum de R del planner, cancel·lació, fallback complet en dues mides amb cinc NPC i paritat progressiva superats. Matriu natural 67/12345 ×1/2 i mostra independent de 18 casos amb rutes/camió superades.
- Paquet `c52522b0f3a8cfb0`, 56 mòduls, 671.319 bytes, SHA-256 `3e55a26ac833a8b0a93abc60e2eba27d2fa5d5bd4e7a9e319f18895cdb2f3f62`. Revisió independent del paquet superada: deu corrupcions d’activació rebutjades, dos fallbacks amb evacuació i base/HQ intactes, paritat de fallback, món complet 67 amb viabilitat local i continuació RNG, error/reintent recuperable. B/C, ràdio i integritat/cache també passen.
- Paquet final: camp físic 67/1 amb rutes, camió i recintes crítics superat; desnivell màxim de fugida 0. Generació física síncrona/progressiva amb geometries, instàncies, transforms i estat/RNG exactes: 16.831 nodes, SHA-256 `f000bb6cad13819017af18d51dde7aec5a2fb55571e6327447a1a521e1cdb9e1`. Cap deute temporal, error abans del primer await, focus/reprendre i neteja parcial superats. Totes les comprovacions planificades completades. Android visual pendent.
- Publicada com a `689572586c6f2da31a1e58818af8159f6e5f8001`. Cloudflare completat amb èxit el 2026-10-25: build `ad45eb55-d047-42a8-adad-291392baaf1d`, Worker version `5e7566e7-870c-4c76-b4b6-3b33c75b0685`. Fonts, manifest i bundle remots verificats contra els blobs locals; els tres recursos upstream absents del checkout s’han conservat. La lectura HTTP pública d’aquest entorn continua bloquejada amb 403, per tant no s’afirma comparació byte a byte del servidor.
- Per provar la correcció cal recarregar el joc, comprovar 0.5.83 i iniciar una operació nova. El marcador del camp continua apareixent després de descobrir-lo.

## Redisseny del camp — v0.5.84

- Petició de l’usuari: una sola entrada exterior, barracó llarg com una casa de pescadors, caseta de guàrdia, quatre torres a les cantonades, recinte interior de filferrada amb els presoners tancats, civils drets o asseguts a terra amb l’alçada del jugador, quatre patrullers i dos soldats apostats a banda i banda de la porta interior.
- Implementat amb arquitectura de fusta existent: barracó amb petjada de 68 × 18 m i teulada estreta a dues aigües; caseta de 14 × 12 m. Perímetre exterior amb únic pas sud de 24 m; recinte interior de 40 × 34 m amb porta tancada de 10 m. Quatre torres funcionals i sis soldats reals.
- Porta interior amb col·lisió real: el rescat amb E l’obre abans del moviment. Dos camperols asseguts a terra, dos drets i mecànic dret; s’aixequen en rescatar-los. Alçada drets de 2,84648 unitats, contrastada amb el model del protagonista; zones d’impacte adaptades a la postura. [Detall](docs/PRISON_CAMP_REDESIGN.md).
- Rutes del mecànic i d’evacuació al voltant de la tanca interior, accessos del camió conservats. Patrulla amb trams curts per respectar el temporitzador real de la IA. La garantia per llavor es manté.
- Matriu de 2.048 prefixos reals (1.024 llavors × escales 1/2) superada en 46,882 s a Node/harness: tots amb camp natural, zero illes/terrasses de reserva i zero canvis de llavor. És una mostra; no prova exhaustiva de totes les llavors ni benchmark Android.
- Runtime verificat: `d21e3e560108ff7e`, 56 mòduls, 673.292 bytes, SHA-256 `d088f6dab496922c614470ef7a69fe491ba684b6d295e3725e3ee668622e2d33`.
- Revisió independent en fonts i paquet superada: 484 travessies del perímetre exterior i 136 del recinte interior, quatre torres físiques funcionals, sis soldats, alçada/postures reals dels cinc civils. En 180 s de IA real cada patruller recorre 629,825 m i visita 26 punts; els dos sentinelles no es desplacen. Rescat real amb E, amenaça que impedeix obrir, obertura física, civils que s’aixequen i evacuació dels quatre camperols/mecànic preparat després de 60 s superats. La geometria real també s’ha inspeccionat amb projecció CPU; no és una passada WebGL ni Android.
- Paquet: matriu natural 67/12345 × escales 1/2 amb rutes a radi adult de 0,94, camió real de 6,525 × 14,1375 m i continuació RNG/paritat progressiva superada. Cas físic 67/1: 143 mostres d’evacuació, desnivell màxim 0, accés i badia del camió lliures. Fallback complet a escales 1/2, deu corrupcions de món rebutjades, error/reintent i viabilitat local del món complet 67 superats.
- Paquet: càrrega física síncrona/progressiva amb geometries/instàncies/transforms i estat/RNG exactes: 15.594 nodes, SHA de geometria `30609c0b5249727d1f175d460d7d631b504237930194e023f9a77e7d7b729f45`, 933 torns al harness. Cap deute temporal; error abans del primer await, focus/reprendre i neteja parcial superats. Integració B/C i ràdio passen en fonts i paquet; escala/postures/rescat/reparació, navegació d’enemics i build/cache també passen. El canvi de disposició/guàrdies altera legítimament el món de la mateixa llavor respecte de v0.5.83; els snapshots històrics no s’han reescrit.
- Publicada com a `b3a612626279663061e1f92540f97f4bfaded2e9`. Cloudflare completat amb èxit el 2026-10-25: build `828df0a3-bb1f-4f6d-a81b-3aaf03ebb036`, Worker version `584905d9-06bb-416e-9026-1c7403636e16`. Les 22 entrades canviades s’han verificat contra els blobs locals i s’han conservat els tres recursos upstream absents del checkout.
- HTTP públic comprovat el `2026-10-25T14:52:49.576497+00:00`: entrada amb loader 0.5.84, versió i manifest actuals; disseny del camp i runtime públics idèntics byte a byte als locals verificats. L’HTML incorpora únicament la inserció del beacon d’analítica de Cloudflare. El runtime públic mesura 673.292 bytes i té el mateix SHA-256 registrat més amunt. La verificació visual i tàctil en Android continua pendent.

## Represa

La **v0.5.84 està desplegada**, amb el camp redissenyat, quatre torres, quatre patrullers i dos sentinelles, recinte interior amb porta física i cinc civils amb escala/postures corregides. Cloudflare confirma el commit funcional `b3a6126`. **Següent pas: l’usuari recarrega, comprova 0.5.84 i inicia una operació nova per provar el camp.** El marcador continua requerint descoberta. B + C continuen implementats; A i nit/espera pendents. Les fases 4, 5, 7, 9, 13 i 14 continuen pendents; la 1 continua parcial. La comprovació visual en Android continua pendent.

## Límits coneguts de la base

El harness usa geometria Three.js amb un renderitzador simulat: no certifica aspecte visual ni rendiment en GPU o Android. Es conserven discrepàncies antigues en proves aïllades (`compound-generation` a 12345/1, contextos de `vehicle-weapon-reticle` i `player-locomotion`, una expectativa literal de `rowing-audio-camera`, les distàncies LOD antigues de `terrain-stream` (reproduït també sobre `651884f`), `light-projectile-aim` (`autoAimDown`, reproduït també sobre la base intacta `9a1b87b`), i fixtures antics de `damage-consistency` (context sense `window`) i `combat-heli-rocket-boats` (regex de generació antiga)); no s'han eliminat per obtenir un resultat verd. Vegeu les notes de cada fase.


## Decisions i inici de fase 5 — 2026-10-28

- Fase 1 tancada expressament per l’usuari; les mencions anteriors de «parcial» són històriques.
- Autoritzat començar desament local de diverses operacions, preparant comptes i cooperatiu futurs. Primera entrega de dades implementada i provada; integració al runtime pendent. Vegeu [PHASE5_SAVES.md](docs/PHASE5_SAVES.md).
- Els canvis posteriors a v0.5.84 de la resta del joc no s’han reauditat en aquesta actualització.



## Fase 5 — segona entrega, 2026-10-28

Desament manual i restauració del món connectats als menús de portada i pausa, preparats en branca a v0.6.3, encara sense desplegar. Prova de món real generat i càrrega progressiva sobre el bundle final superada amb destrucció, inventari, intel, civils, ràdio, vehicle en vol, càrrega de ferri i C4. Limitacions i llista de pendents després de cada entrega a [PHASE5_SAVES.md](docs/PHASE5_SAVES.md). La validació visual real continua pendent; no es dona tota la fase 5 per tancada.


## Fase 5 — autosave, 2026-10-28

Entrega B implementada en branca, v0.6.4 preparada: autosave periòdic, checkpoints agrupats, intents en segon pla, errors visibles i control de concurrència amb desament manual. La còpia anterior continua disponible per recuperar. No garanteix capturar l’últim instant si Android mata el procés. Queda C exportació/importació (següent), comptes/sincronització, estadístiques/llavors i cooperatiu. Detall i validació a docs/PHASE5_SAVES.md.


## Fase 5 — exportació/importació i pendents finals, 2026-10-28

Entrega C implementada després de B, versió preparada 0.6.5: exportació de la darrera revisió desada i importació amb resum/confirmació, checksum SHA-256, límits de mida, esquema i compatibilitat. Cada importació crea una operació nova; conserva les existents i la partida activa. Roundtrip del món real generat i càrrega progressiva verificats sobre fonts i paquet final, a més de l’autosave i els errors de fitxer.

**Queda per desenvolupar:** D comptes/sincronització; E estadístiques ampliades/historial de llavors; F centralització d’accions i autoritat de simulació; G cooperatiu jugable; migracions quan canviïn format/generador. **Queda per validar/publicar:** navegador i Android reals, mapa gran/més llavors, selector/descàrrega natius i transferència real de fitxers, integració i producció. Fase 5 oberta. Detall i llista després de cada entrega a [PHASE5_SAVES.md](docs/PHASE5_SAVES.md).

## Tanda v0.6.6 · comptes sense correu

La base v0.6.5 es va integrar a `main` amb `fea0c7c961991d9c632337d30097684954f366f0` i comprovació Cloudflare satisfactòria. La tanda següent es prepara a `codex/accounts-history-authority`. No s’instal·len plugins addicionals ni s’utilitza Supabase.

1. Comptes/sincronització: implementació D1 + R2, registre amb aprovació manual, sessions i recuperació amb vuit codis d’un sol ús. Pendent activar recursos reals i validar producció.
2. Estadístiques/historial: implementació local i sincronització amb identificador estable per evitar duplicats. Pendent verificació entre dispositius reals i poliment visual.
3. Autoritat: implementació local parcial per a cinc accions. Pendent extreure moviment/dany/IA i desenvolupar xarxa, sales i missions cooperatives.

El detall de configuració, limitacions de recuperació i feina pendent és a [ACCOUNTS_HISTORY_AUTHORITY.md](docs/ACCOUNTS_HISTORY_AUTHORITY.md). La fase 5 continua oberta; la fase 1 es manté tancada per decisió de l’usuari.

## Tanda v0.6.7 · recuperació assistida i manteniment

Implementat després del PR #9 (la compilació Cloudflare de v0.6.6 ha acabat correctament):

1. Recuperació assistida per a usuaris sense codis personals: verificació manual del titular, contrasenya actual de l’administrador, codi d’un sol ús de 30 minuts guardat com a hash, anul·lació de sessions/codis anteriors i auditoria. Exclou administradors i comptes suspesos.
2. Neteja programada dels objectes orfes de R2 amb 24 hores de gràcia, protecció de la partida actual i anterior, cursor persistent i lloguer contra execucions simultànies. No elimina partides referenciades.
3. Comprovació de configuració, migració 0004 i accés al bucket abans d’habilitar comptes. Sense correu ni plugins nous.

Queda per desenvolupar o validar:

- Activar D1/R2, variables i secret reals; aplicar les quatre migracions, configurar el primer administrador i verificar producció. Aquesta sessió no té accés de gestió al compte Cloudflare.
- Proves natives WebGL/Android, mapes grans, transferència entre dispositius i mesura de CPU/cost del servei de comptes.
- Quotes i política de retenció per a partides/historial; procediment excepcional del propietari si tots els administradors perden els codis.
- Completar l’autoritat de moviment/dany/IA i separar globals; després xarxa, sales, permisos, reconnexió i missions cooperatives.
- Les altres fases generals pendents continuen a la taula inicial; la fase 1 segueix tancada.

Detall i instruccions d’activació: [ACCOUNTS_HISTORY_AUTHORITY.md](docs/ACCOUNTS_HISTORY_AUTHORITY.md).

## Activació manual de Cloudflare · recursos vinculats

L’usuari ha creat D1 `hunter-accounts` (`f4879e20-1085-4a51-b132-96cfad61cb90`) i R2 privat `hunter-saves`. La configuració versionada ja inclou `DB`, `SAVES` i `migrations_dir`, així com l’entrada de servidor `server/worker.mjs`, `nodejs_compat` i el binding d’assets `ASSETS`. Això permet desplegar un Worker amb servidor en lloc d’un Worker exclusivament estàtic.

Pendent després d’integrar aquesta tanda a main: comprovar el desplegament de producció, aplicar les quatre migracions a D1, configurar `AUTH_ORIGIN` amb l’URL real i `AUTH_SECRET` directament a Cloudflare, i registrar/aprovar el primer administrador. Els comptes es mantenen deshabilitats fins que aquestes comprovacions passen. Cap secret es guarda al repositori. Les previews no s’han habilitat per operar comptes contra les dades de producció; calen recursos i variables separats abans de provar-hi comptes.

La resta de pendents (proves físiques, quotes/retenció, recuperació excepcional d’administradors i cooperatiu) es manté segons la tanda v0.6.7 anterior.

## Diagnòstic d’activació

L’usuari informa que les migracions retornen versió 4 i ha desat origen i secret. El servidor encara retorna `configuration`, malgrat que les captures mostren els noms correctes. `/api/capabilities` ara enumera únicament els noms dels camps invàlids/absents a la versió activa, sense valors ni secrets, per identificar la causa. L’activació i prova d’un compte real continuen pendents.

`AUTH_ORIGIN=https://hunter.paradoxa.cat` queda versionat a Wrangler per conservar-lo en desplegaments nous. `AUTH_SECRET` continua exclusivament a Cloudflare; cal que sigui un secret del Worker en execució, no només una variable de compilació.

## Secret en execució amb el tauler bloquejat

El servidor confirma que només falta `AUTH_SECRET`; D1, R2 i l’origen passen la comprovació. El tauler impedeix afegir variables per un missatge d’assets estàtics, malgrat que el domini executa el servidor. Es prepara `npm run deploy:cloudflare` per transferir el secret de compilació al secret en execució mitjançant `wrangler deploy --secrets-file`. Pendent que l’usuari canviï Deploy command a Cloudflare i executi un build de main; després cal comprovar capabilities, registre i primer administrador. Els altres pendents continuen vigents.

## Cooperatiu · fase 1 (v0.6.8)

L’usuari informa que la sincronització ja funciona i autoritza començar el cooperatiu. Implementades sales privades de dos comptes aprovats, invitació aleatòria, llavor/mida/dificultat compartides, preparació, presència recent, revisions, sortida i tancament. Concurrència protegida per restriccions i transaccions D1. Interfície des de la portada i Compte / núvol; no s’ofereix iniciar una missió conjunta encara.

Cal aplicar només `0005_coop_lobby.sql` i desplegar aquesta tanda per activar sales. Els comptes continuen funcionant sense aquesta migració. Proves D1/R2 i Worker natiu, regressions de comptes/desaments i documentació a [COOP_PHASE1.md](docs/COOP_PHASE1.md).

Queda després d’aquesta fase: validació real de dos navegadors/Android i cost del polling; separar globals de moviment/dany/IA; protocol i transport en temps real; servidor autoritatiu i estat inicial; combat/objectius compartits, reconnexió i política d’amfitrió/pausa; desaments i estadístiques cooperatius. Queden també quotes/retenció i les altres fases generals pendents. Cap plugin o recurs Cloudflare nou.

## Cooperatiu · fase 2 (v0.6.9)

L’usuari confirma que ha aplicat la migració de sales i autoritza continuar/desplegar sense esperar una prova manual amb dos comptes. No es creen comptes de prova de producció.

Implementades regles compartides de moviment horitzontal i vida, ja utilitzades pel joc individual; nucli independent de dos actors amb tick fix, validació d’intencions, context/seqüència, timeout i adaptador de geometria; preparació autenticada de sala amb comprovació de versions, revisió, participants i manifest idèntic. No és encara un servidor de missió en temps real ni permet jugar junts. No requereix una migració posterior a la 0005.

Proves noves del nucli i manifest, Worker natiu amb dos comptes locals, comptes i desaments. Dues proves generals fallen igual al main anterior: cadència de pistola de simulation-timing i geometria inferior de tanqueta de smoke. No s’han modificat els asserts ni es declaren superades. [Detall](docs/COOP_PHASE2.md).

Queda: adaptador del món real i extracció de gravetat/vehicles/IA; servidor de sessió i xarxa en temps real; combat/objectius/inventari compartits; reconnexió/pausa/amfitrió; desaments/estadístiques cooperatius; proves físiques i càrrega; corregir les dues fallades històriques. Les quotes/retenció i les altres fases generals continuen pendents.

## Cooperatiu · fase 3 (v0.6.10)

Implementat canal WebSocket de sala amb Durable Object SQLite, notificació immediata de membres/preparació, cookies de sessió del mateix origen, validació d’origen/pertinença, revocació d’accés, límits, reconnexió, substitució d’una altra pestanya i alternativa HTTP. No és encara la transmissió de la simulació ni una missió cooperativa jugable. [Detall](docs/COOP_PHASE3.md).

El desplegament incorpora `COOP_ROOMS` i una migració automàtica de Durable Objects. No cal SQL D1 posterior a la 0005, secrets nous ni plugins. Proves de dos comptes locals amb WebSockets reals i Durable Object/D1 natius, més regressions de comptes, desaments i sales. No es creen comptes de prova de producció. La prova física de dos navegadors es manté ajornada per decisió de l’usuari.

Queda: adaptador del món real i extracció de gravetat/vehicles/IA; sessió/tick de missió persistent, compatibilitat dels dos clients, estat inicial i protocol de joc; moviment/combat/objectius compartits, predicció/interpolació, pausa/amfitrió i reconnexió de missió; desaments/estadístiques cooperatius; proves de dispositius, càrrega i consum; quotes/retenció i les dues fallades històriques de proves generals. La resta de les catorze fases es manté segons el pla.

## Cooperatiu · fase 4 (v0.6.11)

Implementada una extracció parcial de la física del món: relleu, platges/profunditat, anivellaments i resposta de murs/arbres/roques/palmeres sense renderitzador ni jugador global. El joc individual reutilitza aquestes regles. Captura de geometria sota demanda, validació i índexs espacials, còpies independents i altura al nucli de dos actors. No s’accepta geometria de clients com a autoritat. [Detall i límits](docs/COOP_PHASE4.md).

Proves: món real 67/1, 961 punts i col·lisions contra una referència congelada del main anterior, ronda JSON i límits, dos actors contra la geometria real en Node i workerd natiu. Regressions de comptes/sala/WebSockets/desaments i paquet del navegador superades. No cal cap migració o configuració manual nova.

Queda: escales/interiors/teulades/molls/aigua, gravetat i vehicles/IA dinàmics; món canònic i sessió de missió al servidor; ordres/snapshots en temps real, combat/objectius compartits i predicció/interpolació; reconnexió/pausa/amfitrió, desaments/estadístiques cooperatius; més llavors/mapa gran, proves físiques i càrrega, quotes/retenció i les dues fallades històriques. La missió conjunta encara no s’inicia (`playable:false`). La resta del pla general continua vigent.

## Cooperatiu · fase 5 (v0.6.12)

Implementades superfícies transitables compartides: graons/rampes, molls, pisos girats, teulades, búnquer i projecció de passarel·la de terminal. El runtime individual reutilitza les regles preservant els controls d’altura anterior, el suport visual i els càlculs dinàmics existents. L’adaptador estàtic incorpora groundAt i índex d’edificis; geometria format 2 amb lectura compatible de format 1. No canvia el format dels desaments. [Detall](docs/COOP_PHASE5.md).

Proves amb referència independent congelada del main anterior, casos de transició entre nivells, 551 punts reals de superfícies de 67/1 i els 961 de terreny de la fase 4; dos actors en Node/workerd i regressions de comptes/sales/WebSockets/desaments. No cal cap migració ni configuració manual nova.

Queda: gravetat/caigudes/paracaigudes i aigua/natació; ferri/plataformes/vehicles dinàmics i IA; actualització de col·lisions; món canònic i sessió al servidor, compatibilitat dels dos clients i separació del suport visual de l’estat físic; ordres/snapshots, combat/objectius/inventari compartits, predicció/interpolació; reconnexió/pausa/amfitrió i desaments/estadístiques; matriu de llavors/escala 2, proves físiques/càrrega, quotes/retenció i les dues fallades històriques. La missió conjunta encara no es pot iniciar (`playable:false`); els altres pendents generals continuen vigents.

## Cooperatiu · fase 6 (v0.6.13)

Extretes les regles de gravetat/caiguda lliure, control i inèrcia del paracaigudes, dany d’impacte, llindar de natació i suport aquàtic/interiors/búnquer. El joc individual ja les reutilitza. Detecció compartida d’aterratge sobre teulades, disponible també a l’adaptador estàtic. Es preserven les equacions existents; no canvien desaments ni geometria. [Detall](docs/COOP_PHASE6.md).

Validació: 6.480 passos contra una referència independent del main anterior; dany, natació, soterrani i teulades; 120 passos pel runtime real, font i paquet; 80 recorreguts de teulades reals i execució en workerd natiu. Regressions de món, sales/WebSockets, dos actors i desaments. No cal configuració manual nova.

Prova addicional: `water-jumps` passa; `player-locomotion` té un fixture aïllat incomplet (`knifeEquipped` absent), amb prova i mòduls carregats idèntics al main anterior. Queda pendent juntament amb les dues incidències generals ja registrades; no es declara superada.

Queda: integrar les trajectòries/transicions al tick autoritatiu; onatge/natació canònics, expulsions per explosions i plataformes/ferri/vehicles/IA dinàmics; geometria mutable; món canònic i sessió persistent al servidor amb confirmació dels dos clients i separació del LOD visual; ordres/snapshots de joc, predicció/interpolació, combat/inventari/objectius/final compartits; reconnexió/pausa/amfitrió i desaments/estadístiques; més llavors/escala 2, proves físiques i càrrega/consum, quotes/retenció, recuperació excepcional d’administradors i les dues fallades històriques. La missió continua sense ser jugable (`playable:false`); les altres fases generals mantenen els seus pendents.

## Cooperatiu · fase 7 (v0.6.14)

El nucli de dos actors ja integra, en un mode vertical explícit, caiguda lliure/paracaigudes, suport terrestre/aquàtic, natació i dany d’aterratge. El món i el nivell de l’aigua provenen exclusivament de callbacks de confiança; les intencions del client no inclouen estat físic. L’adaptador estàtic classifica interiors, soterrani i forats d’escala. Les actualitzacions de posició, vida i caiguda dels dos actors es confirmen juntes després de validar-les. [Detall i límits](docs/COOP_PHASE7.md).

Proves de transicions, velocitats, teulades, dany únic, autoritat, timeout/mort i atomicitat; 500 punts de locomoció reals contra referència anterior, dos actors i 420 ticks de descens sobre el mapa 67/1 en Node/workerd i natació amb intencions en el runtime natiu. Regressions de sales/WebSockets, física i desaments. No canvia la configuració manual ni el format dels desaments.

Queda: món i aigua/onatge canònics al servidor, separar/validar suport físic i LOD en més llavors/escala 2; sessió persistent i tick de producció amb confirmació dels dos clients i límits de consum; ordres/snapshots de joc i representació dels dos actors, predicció/interpolació, reconnexió/pausa/amfitrió; plataformes/ferri/vehicles, expulsions, IA i geometria mutable; combat/inventari/objectius/final compartits; desaments/estadístiques cooperatius, proves físiques/càrrega, quotes/retenció i recuperació excepcional d’administradors. Les tres incidències històriques de proves/fixtures continuen pendents, igual que les altres fases generals. La missió encara no és jugable (`playable:false`): el mode vertical no s’ha connectat a una sessió de producció.

## Cooperatiu · fase 8 (v0.6.15)

Extreta la disposició d’illes/cims i el PRNG, reutilitzats pel joc individual sense alterar-ne la seqüència. Base de terreny generada amb llavor/mida, cerca d’emplaçaments inicials i estat aleatori per continuar; model d’onatge compartit amb el shader i proveïdor canònic independent de la malla visual. Component de servidor que genera aquesta base i l’utilitza amb l’adaptador físic i l’aigua, provat dins de workerd. [Detall i límits](docs/COOP_PHASE8.md).

Proves amb referència congelada anterior: dotze combinacions de llavor/escala, seqüència aleatòria, emplaçaments i 360 mostres d’onatge; generació en workerd per a les dues escales i dos actors durant 60 ticks, més regressions de món, sales/WebSockets, física i desaments. Les diferències numèriques entre motors es mesuren amb toleràncies explícites: no es pressuposen JSON/hash idèntics ni autoritat del client. No cal configuració manual nova.

Queda: completar el món físic (compounds/anivellaments, edificis, accessos, vegetació i entitats) i l’estat inicial; persistir/versionar el món del servidor amb memòria cau i límits, sessió i tick de producció amb confirmació dels clients; xarxa/representació dels dos actors, predicció/interpolació i coherència del suport físic/visual, reconnexió/pausa/amfitrió; vehicles/expulsions/ferri/plataformes/IA i geometria mutable, combat/inventari/objectius/final compartits; desaments/estadístiques, proves físiques i càrrega/consum, quotes/retenció, recuperació excepcional d’administradors i les tres incidències de proves històriques. Els altres pendents generals continuen vigents. La base és parcial (`complete:false`), encara no s’invoca des d’una sala de producció i la missió no és jugable (`playable:false`).

## Cooperatiu · fase 9 (v0.6.16)

Compartit el càlcul de coordenades, orientació, reserva i terrassa d’un compound en un emplaçament donat; plans de rutes/entrades/patrulla i edificis sense malles. El runtime individual el reutilitza i el component de servidor ja incorpora el primer pla de base i el seu anivellament físic. La continuació aleatòria posterior a construir la base encara no està extreta; no es tria un HQ amb un estat incorrecte. [Detall](docs/COOP_PHASE9.md).

Proves: 304 combinacions de disseny/orientació/altura contra referència anterior i paritat de consum aleatori; primera base i terrassa del generador real en les dues escales fins al checkpoint inicial; pla de base en workerd i regressions de món, sales/WebSockets, dos actors i desaments. Una prova addicional de generació completa d’escala 2 ha esgotat el límit VM de 120 s sota execució paral·lela: el diagnòstic/rendiment del mapa gran queda pendent i no es declara validat. No cal configuració manual nova.

Queda: construcció física de base/edificis/murs/portes/escales/accessos preservant RNG, després HQ i la resta de compounds/camp/ports; vegetació/entitats i estat inicial complet; persistència/versionat/memòria cau del món i sessió/tick de producció amb confirmació dels clients; xarxa/representació de jugadors, predicció/interpolació i suport físic/visual, reconnexió/pausa/amfitrió; vehicles/expulsions/ferri/plataformes/IA i geometria mutable; combat/inventari/objectius/final compartits, desaments/estadístiques; diagnòstic d’escala 2, llavors/proves físiques/càrrega/consum, quotes/retenció, recuperació excepcional d’administradors i les tres incidències històriques. Els altres pendents generals es mantenen. El món segueix parcial (`complete:false`) i la missió no és jugable (`playable:false`).

## Cooperatiu · fase 10 (v0.6.17)

Compartides les instruccions de murs/obertures/particions/pisos i les dades d’escala exterior/rampa interior, reutilitzades per `mkB` i el component de servidor. El servidor ja construeix les col·lisions i superfícies dels edificis de les quatre variants de base, amb portes inicialment tancades i identificadors de les estructures. No inclou encara la resta de la base ni interaccions dinàmiques de porta/destrucció. [Detall](docs/COOP_PHASE10.md).

Validació: 180 casos contra el constructor anterior en mode normal/cerca, seqüència aleatòria i grups destructibles; cinc checkpoints reals amb totes les variants i un cas d’escala 2, comparant íntegrament murs/escales/edificis; generació nativa workerd amb dades d’estructures, dos actors i regressions de món/compounds/sales/WebSockets/desaments. El diagnòstic de generació completa d’escala 2 (límit VM de 120 s) continua pendent i no es declara superat. No cal configuració manual nova ni migrar desaments.

Queda: perímetres/portes de tanca i altres objectes/passos de base preservant RNG, després HQ/búnquer/hangars i altres compounds/camp/ports; vegetació/entitats/estat inicial, interaccions autoritatives de porta/destrucció i geometria mutable; persistència/versionat/memòria cau del món i sessió/tick de producció amb confirmació dels clients; xarxa/representació/predicció/interpolació i suport físic/visual, reconnexió/pausa/amfitrió; vehicles/expulsions/ferri/plataformes/IA, combat/inventari/objectius/final compartits i desaments/estadístiques; diagnòstic d’escala 2, proves físiques/llavors/càrrega/consum, quotes/retenció, recuperació excepcional d’administradors i les tres incidències històriques. La resta del pla general continua vigent. El món és parcial (`complete:false`) i la missió continua sense ser jugable (`playable:false`).

## Cooperatiu · fase 11: prioritat jugable (v0.6.18)

Implementada la missió reduïda Relleu d’emergència: dos jugadors confirmen l’inici, es mouen en una zona segura de la base, activen cadascun el seu terminal durant tres segons simultanis i s’extreuen junts. El Durable Object executa la simulació, desa el checkpoint abans d’enviar snapshots i valida les intencions. Pausa/represa per desconnexió, revocació d’accés, neteja i caducitat de sessió; interfície 3D provisional/Canvas, teclat i tàctil. El manifest ja indica `playable:true` per a aquest mode, sense declarar complet el generador de campanya. [Detall i com jugar](docs/COOP_PLAYABLE.md).

Validació completa amb dos comptes locals i serveis natius D1/DO/WebSockets: moviment, confirmació doble, terminals, extracció/victòria, pausa/reconnexió, reinici de workerd i recuperació, falsificació de posicions i suspensió durant la missió. Proves de sis llavors/dues escales, checkpoints/alarms/fallades, pantalla/controls i escena Three.js sense GPU, més regressions de comptes/món/sales/desaments. La passada visual GPU i les proves físiques Android/dos dispositius continuen pendents; no es creen comptes de prova en producció. No cal configuració manual nova.

Queda: validació física i mesures de latència/CPU/GPU/memòria/consum/quotes; millorar representació i predicció/reconciliació; portes/destrucció/perímetres i generador complet amb HQ/altres compounds/vegetació/entitats; combat/inventari/IA/vehicles/ferri/plataformes/presoners/objectius de campanya; desaments cooperatius duradors/exportables, estadístiques/historial, versions/retenció i política de pausa/permisos; diagnòstic del mapa complet d’escala 2, les tres incidències històriques i recuperació excepcional d’administradors. Els altres pendents generals segueixen vigents. Els checkpoints pilot caduquen als 30 minuts i no es migren entre versions; els desaments individuals es conserven.

## Cooperatiu · fase 12: portes compartides (v0.6.20)

Implementades ordres d’obrir/tancar portes a la missió reduïda, amb F o botó tàctil. El servidor valida sessió, proximitat, altura, estat de missió i pas desocupat; actualitza l’adaptador físic, desa l’estat i després el comunica als dos jugadors. Revisió de portes, cooldown i historial acotat d’ordres idempotents, restaurats amb el checkpoint. Vistes 3D/Canvas actualitzades sense recrear tota l’escena. [Detall](docs/COOP_DOORS.md).

Verificat sobre main v0.6.19, conservant el fusell d’assalt i els canvis recents. Proves natives amb dos comptes: obertura/remot rebutjat/pas ocupat/tancament/bloqueig/reobertura, terminals i victòria, reconnexió i reinici complet amb estat de portes recuperat. Proves d’errors de persistència sense publicació, validació del protocol i UI F/tàctil/representació 3D, més regressions de comptes/món/sales/desaments. La passada física WebGL/Android/dos dispositius continua pendent. No cal cap migració, plugin, secret o recurs Cloudflare nou.

Queda: animació i millores visuals de portes, destrucció i resta d’interaccions; combat/inventari/IA i objectius de campanya compartits, vehicles/ferri/plataformes/presoners; perímetres i generador complet amb HQ/búnquer/hangars/altres compounds/vegetació/entitats; desaments cooperatius duradors/exportables i estadístiques/historial, versions/retenció/permisos; validació física, mesures de latència/CPU/GPU/memòria/consum/quotes i predicció/reconciliació; diagnòstic del mapa complet d’escala 2, les tres incidències històriques i recuperació excepcional d’administradors. El mode reduït continua jugable; les sessions temporals caduquen als 30 minuts i no es migren entre versions. Es mantenen els pendents generals i la fase 1 tancada per decisió de l’usuari.


## Cooperatiu · fase 13 · Inventari personal (v0.6.21)

- Implementat: inventaris separats per actor autenticat; 24 bales, 2 granades i 1 disfressa inicials. Capacitats 120/8/1. Subministraments als terminals amb un únic beneficiari, validació de proximitat/alçada, C/disfressa i R/recollir amb alternativa tàctil. Equipament visible als dos clients, reserves només pròpies al panell.
- Persistència: checkpoint del Durable Object amb inventaris, paquets recollits i historial limitat de confirmacions. Errors de desament reverteixen el canvi abans de difondre’l. No hi ha migració de missions temporals entre versions.
- Validació: proves d’independència, quantitats, capacitat, cursa de recollida, idempotència, pausa/alçada, còpies d’estat, rollback i restauració; interfície/teclat/botons i dues sessions locals al Worker natiu. Validació física amb dos comptes i Android pendent.

### Què queda després d’aquesta fase

1. Combat autoritatiu: disparar, consumir bales, granades amb trajectòria/explosió/dany, recàrrega i armes individuals (inclòs el fusell d’assalt de la partida individual).
2. Enemics i IA compartida; efecte real de la disfressa sobre el sigil; ferits/reanimació i equilibri.
3. Intercanvi d’objectes, equipament ampliat i botí de la campanya completa.
4. Vehicles, món complet, destrucció i objectius de campanya; preservar el consum de RNG del generador complet.
5. Desaments cooperatius permanents, migracions, estadístiques i historial de missions als comptes.
6. Validació física amb dos navegadors/comptes, GPU i Android, rendiment/controls, estètica i errors històrics documentats de fixtures/escala 2.

Les bales i granades es poden recollir però encara no gastar: no s’ha presentat aquesta fase com a combat implementat.


## Cooperatiu · fase 14 · Recollida automàtica i objectes deixats (v0.6.22)

- Recollida automàtica a cada tick, amb contacte escombrat del trajecte i primer contacte entre els dos actors. Empat exacte resolt per ordre estable de sala; un únic beneficiari. Capacitat del paquet sencer, alçada, salut, caiguda/aigua i col·lisions amb parets/portes validades pel servidor. Recollida sense missatge de client ni botó.
- G / Deixar i selector: 12 bales (o les restants), 1 granada o 1 disfressa. Descompta només el propietari autenticat, posa el paquet als seus peus i treu la disfressa si estava equipada. El propietari no el pot recuperar fins que s’allunya; el company el pot recollir immediatament.
- Objectes dinàmics visibles en 3D i Canvas, checkpoint de paquets/seqüència/exclusió del propietari, idempotència limitada a l’historial de 64 ordres, límit de 128 paquets simultanis. Desament abans de confirmar/difondre i rollback en error. No es migren checkpoints temporals entre versions.
- Proves: contacte automàtic i ràpid, competició/empat, capacitat, alçada/paret, transferència amb conservació de quantitats, deixar disfressa equipada, sortir/tornar, pausa, idempotència, rollback, restauració, controls de selecció/botó i dues sessions natives locals. GPU i Android físic pendents.

### Què queda després d’aquesta fase

1. Combat autoritatiu: trets, consum de munició, granades i explosions/dany; armes individuals inclòs fusell d’assalt.
2. IA enemiga compartida, sigil/disfressa amb efecte real, ferits/reanimació i equilibri.
3. Ampliar l’equipament i el botí a la campanya completa; quantitats personalitzades en deixar objectes si cal. El traspàs bàsic per deixar/recollir ja està implementat.
4. Vehicles, món complet, destrucció i objectius de campanya, preservant la seqüència RNG completa.
5. Desaments cooperatius permanents, migracions entre versions, estadístiques i historial als comptes.
6. Prova física de dos comptes/navegadors, GPU/Android, rendiment, controls/estètica i errors històrics de fixtures/escala 2 documentats.


## Cooperatiu · fase 15 · Combat bàsic compartit (v0.6.23)

- Pistola amb X / Disparar: un tret per pulsació, rumb actual del jugador, abast 70 m, 4 punts de dany i separació mínima de 10 ticks (1/3 s). Consumeix una bala pròpia. Dianes vermelles opcionals amb 12 punts de vida; no alteren l’objectiu de relleu.
- B / Granada: consumeix una granada pròpia, impuls frontal amb gravetat i col·lisió amb terreny, parets, portes, sostres i pisos. La col·lisió frena el llançament (sense rebot). Detona als 60 ticks (2 s de simulació); radi 8 m, dany decreixent i bloquejat per obstacles. Separació mínima de 30 ticks entre llançaments.
- Sense foc amic ni autodany en aquest mode d’entrenament. Disparar/llançar treu la disfressa. No hi ha enemics, armes seleccionables, recàrrega ni efecte real del sigil encara.
- Esquema de combat tancat: sessió determina l’actor, rumb/posició i resultats són del servidor, no s’accepten danys/coordenades del client. Límit separat de 12 ordres/s, cadència per ticks, historial limitat de 128 confirmacions; desament abans de difondre, rollback en error.
- Checkpoint de dianes, granades en vol, fusibles, cadència i confirmacions. Una pausa atura trajectòria i fusible; en acabar la missió es retiren les granades/efectes restants. No hi ha migració de missions temporals entre versions.
- Render 3D/Canvas de dianes/vida, trets, granades i explosions; botons tàctils. Proves de consum individual, cadència, duplicats, obstacles/alçada, detonació/dany, persistència/rollback, controls i dues sessions locals del Worker. La validació visual GPU, so i Android físic continua pendent.

### Què queda després d’aquesta fase

1. IA enemiga autoritativa compartida: moviment/percepció/atacs, dany als jugadors, sigil amb efecte real de la disfressa i ferits/reanimació. Les dianes actuals són d’entrenament.
2. Equipament i armes de la campanya (inclòs fusell d’assalt), selecció/recàrrega, inventari ampliat, balanç i tractament de foc amic si es decideix activar-lo.
3. Vehicles, món complet, destrucció d’edificis i objectius de campanya, preservant la seqüència RNG completa.
4. Desaments cooperatius permanents, migracions, estadístiques/historial als comptes.
5. Prova física amb dos comptes/navegadors, GPU/Android, àudio, controls/rendiment/acabat visual i errors històrics de fixtures/escala 2 documentats.

### Registre de publicació de la fase anterior

**Publicació:** codi i proves v0.6.22 a `main` (commit `ce1a81c916e88fd462c6ab3b6641c4ef4bd47ce6`). Desplegament de producció confirmat amb èxit: [build cb293c90-e9a4-4465-96c3-0cf753b588f8](https://dash.cloudflare.com/e8c1784f0b4c91e60ee62af2e3dae4f3/workers/services/view/hunter-arxipelag/production/builds/cb293c90-e9a4-4465-96c3-0cf753b588f8), Version ID `23a738eb-7db8-4e36-9ee0-b503f413d369`. Versió pública i HTML cooperatiu verificats. El primer build (`393d617d-e19e-484f-8398-403ea6180a19`) havia fallat sense motiu a GitHub; el desplegament posterior ha reeixit, sense canvis de codi ni configuració. La causa del primer error no s’ha determinat.


## Cooperatiu · fase 16 · Guàrdies, dany i controls (v0.6.25)

- F / Disparar, com al joc individual; E / Acció contextual obre/tanca portes o activa el terminal. X ja no dispara. Textos, botons i proves de teclat actualitzats.
- Dos guàrdies de 12 PV als recorreguts dels terminals. Patrullen a 2 m/s entre punts del trajecte verificat, amb col·lisions i suport de terra del servidor. Quan detecten algú s’aturen i l’apunten.
- Percepció bàsica de 360° amb abast 18 m, línia de visió bloquejada per parets/portes/sostres/pisos. Disfressa: 4 m mentre no hi ha alarma. Disparar/llançar treu la disfressa i alerta guàrdies a menys de 35 m durant 6 s; explosions també alerten. El soroll pot alertar darrere una paret però no permet disparar-hi a través.
- Un segon mínim d’alerta visible abans del tret, després mínim 90 ticks (3 s) entre atacs. Dany `ceil(2*dificultat)`, aplicat pel servidor a un jugador visible. Sense contacte durant 4 s: cerca estàtica i retorn a patrulla. No hi ha persecució ni cerca amb navegació fora del recorregut.
- Guàrdies feribles amb pistola/granades; els eliminats no ataquen. Sense foc amic ni autodany de granades. Vida 0 d’un jugador finalitza la missió; el cop fatal es resol abans d’adjudicar activació/extracció. Reanimació encara pendent.
- Vida dels dos jugadors al panell, colors d’alerta/atac i orientació dels guàrdies a la vista 3D; representació Canvas equivalent. Persistència d’estat de patrulla, salut, focus, memòria i cadència dins del checkpoint. Pausa també congela la IA.
- Proves: percepció/cobertura, patrulla, disfressa/alarma, avís/cadència/dany, guàrdia eliminat, pausa, restauració, dany fatal abans de victòria i F/E sense conflicte. Regressions de missió/inventari/portes/combat i dues sessions locals natives. GPU/Android i dos comptes físics continuen pendents.

### Què queda després d’aquesta fase

1. Ferits i reanimació cooperativa, tractament de caigudes i retorn al joc; resum i equilibri de missió.
2. IA ampliada: visió direccional, persecució/cerca amb navegació, coordinació i integració amb els enemics complets del joc individual.
3. Més armes (inclòs fusell d’assalt), selecció/recàrrega, equipament i botí de campanya.
4. Vehicles, món complet, destrucció i objectius de campanya, preservant RNG.
5. Desaments cooperatius permanents, migracions, estadístiques i historial als comptes.
6. Prova física amb dos navegadors/comptes, GPU/Android, controls/rendiment, àudio i acabat visual; errors històrics de fixtures/escala 2 documentats.


## Portes contextuals als dos modes · v0.6.25

- E / Acció obre i tanca portes. F es conserva per disparar. Un sol botó contextual al cooperatiu: icona de porta i Obrir/Tancar a prop d’una porta; mà per mantenir Activar al terminal propi. El terminal té prioritat si els dos contextos coincideixen. O i X no fan drecera de porta/tret.
- Mode individual: les portes deixen d’obrir-se/tancar-se per proximitat. E i el botó d’acció amb icona SVG de porta alternen estat, que es conserva en allunyar-se. Búnquer i portes interiors també són manuals i mantenen la seva animació; la porta principal conserva els 10 s, iniciats per E, i acaba el moviment encara que el jugador marxi. Hangars permanentment oberts no mostren acció.
- En un vehicle, E continua baixant-ne; a peu es prioritza una porta operable sobre vehicles propers i la resta d’accions. Sense porta, es mantenen les accions habituals i la motxilla. Col·lisions i alçada limiten la interacció; no es tanca sobre jugador, soldat o vehicle.
- Desaments: `desiredOpen` es captura com a estat de paret; els desaments antics sense aquest camp recuperen la intenció a partir d’obertura/progrés. No es canvia ni la versió del generador ni l’esquema de desament. Les portes destruïdes continuen fora de les col·lisions.
- Proves de món individual real amb teclat/tàctil/icona, proximitat, ocupació, animació del búnquer, estat nou/antic, canvi a icona de vehicle i desament/exportació/importació amb regeneració. Proves del botó cooperatiu amb terminals/portes, F només dispara i cap repetició de commutació en mantenir E.
- Pendents: comprovació visual/física en GPU/Android, animació de fulles ordinàries/cooperatives, interacció autònoma de la IA individual amb portes tancades i els pendents cooperatius enumerats a la fase 16.

Integració de main: es conserva la correcció de ràfegues seqüencials del fusell d’assalt publicada a v0.6.24 (PR #12), incloent cancel·lació en pauses/canvi d’arma i reinici de món. La fase de portes/guàrdies s’ha numerat v0.6.25.
