# HUNTER · ARXIPÈLAG — progrés de les millores

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
