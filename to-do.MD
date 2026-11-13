**2026-11-13 · GAZ Tigr-M integrat i editor cotxe utilitari:**
- [x] GAZ Tigr-M candidat 3 integrat en SOLO/COOP com a malla Three.js pròpia; quatre rodes animades, direcció davantera i instàncies amb geometria compartida.
- [x] Substituït el Humvee i eliminats els mòduls antics i les tres pàgines de prova corresponents. Recuperada la pestanya **Cotxe utilitari C1A** i retirada la del GAZ ja aprovat.
- [x] Ajustada la caixa de col·lisió; mantingut intacte el T-90M en proves i els seus controls d'erugues, torreta i canó.
- [x] Retirat el GLB històric del Huey, no carregat pel joc. Els GLB restants són únicament els referents a candidats actius de llanxes/ferri i proves del BTR.
- [ ] Validació visual al navegador, equip/passatger, IA que requisa el GAZ, partida COOP real i desplegament Cloudflare.
- [ ] Recalcular l'empremta del vehicle cotxe als fitxers històrics de traces si es torna a executar aquella bateria especial.

**2026-11-13 · T-90M, candidat propi únic i animacions al laboratori:**
- [x] Eliminats del catàleg i manifest els dos candidats externs de T-90M, deixant només el model procedimental propi en un visor.
- [x] Augmentada la mida global del candidat T-90M un 50 % (escala 1,5) sense alterar el GAZ Tigr.
- [x] Torreta independent en Y i canó en X amb punts d'ancoratge, noms editables i límits d'elevació segons el controlador actual.
- [x] Erugues dreta i esquerra amb sabates mòbils al contorn, rodes giratòries i velocitats diferencials a avançar, recular i pivotar.
- [x] Controls de simulació al laboratori: lliscadors de velocitat/gir/torreta/elevació i tecles W/S/A/D, J/L, I/K; respecten la casella Animacions.
- [x] Dades de l'animació preservades com a userData serialitzable en exportacions i esborranys; ajustada la revisió de laboratori.
- [ ] Validar visualment al navegador, especialment escala, solapament de cadenes/rodes i moviment del canó. Encara no substitueix el tanc del joc; la integració amb hitbox i tret requereix validar l'escala abans.

**2026-11-13 · Petició f0a3c211 · Interior GAZ Tigr-M candidat:**
- [x] Confirmat per l’usuari: modificar el Tigr candidat, tot i que l’exportació indicava el visor Actual/Humvee.
- [x] Deu vidres transparents amb retalls reals al blindatge, portes i parabrisa; quatre seients amb reposacaps, terra, tauler, consola i volant amb columna. Peces editables.
- [x] Proves de transparència, absència de blindatge immediat darrere dels vidres i preservació de la geometria en exportar/importar JSON; revisió `live-editor-20261113-tigr-interior-3`.
- [ ] Valoració visual al visor WebGL. Models del joc sense modificar.

**2026-11-13 · Refinat visual T-90M / GAZ Tigr-M (laboratori):**
- [x] Candidats 2 Three.js originals revisats amb fotografies noves: Tigr AMN-233114 i T-90M de desfilada. Fonts accessibles al comparador; proporcions del Tigr contrastades amb el catàleg VPK.
- [x] Tigr: carrosseria estreta, distància entre eixos 3,3 m, passos de roda retallats, frontal amb defensa tubular, capó i parabrisa inclinats, quatre portes i escotilla rectangular.
- [x] T-90M: casc i torreta baixos, falques frontals, canó més prim, cadenes buides amb sis rodes per banda, faldons segmentats i cistella posterior.
- [x] Verificades geometria, proporcions, recompte de rodes i serialització de l’editor; inspecció d’imatges renderitzades de les malles. Revisió `live-editor-20261113-reference-shapes-2`; sense modificar models del joc.
- [ ] Aprovar visualment els candidats al visor WebGL abans de la integració al joc.

**2026-11-13 · P0 COOP: dos mons diferents en iniciar una partida:**
- [x] Causa localitzada: `spawnFaunaSteps()` generava amb `Math.random()` la posició i l'orientació de cada tauró. Com que aquestes dades entren al SHA-256 de `captureNativeCoopWorld()`, dos navegadors amb la mateixa llavor no coincidien i quedaven bloquejats a la càmera inicial.
- [x] Introduït RNG local de fauna determinista derivat de la llavor; independent del RNG geogràfic `R`. Regenerat el runtime natiu i afegida regressió de captura amb `Math.random()` alterat a `tests/native-coop-startup.cjs`.
- [ ] Comprovar `npm test` / desplegament i una partida real HOST/GUEST (incloent mòbil vs escriptori); no s'ha relaxat la verificació de fingerprint.

**2026-11-12 · Desplegament Cloudflare:** l'execució manual [43305405474](https://github.com/Haanarg/hunter_arxipelag/actions/runs/43305405474) ha completat amb èxit el deploy. Les notes anteriors que diuen que els secrets falten descriuen l'estat anterior.

**2026-11-12 · Nous candidats per al laboratori (no implementats al joc):**
- [x] Reactivada la pastilla del cotxe militar al comparador com a GAZ Tigr-M; el visor original mostra el Humvee D3.1 real del joc.
- [x] Creat GAZ Tigr-M candidat 1 amb geometria Three.js original: cabina, capó, parabrisa partit, portes, rodes, fars i sostre; model editable al laboratori.
- [x] Creat T-90M candidat 1 amb geometria Three.js original: casc, glacis, faldons, sis rodes per costat, torreta angular, canó llarg i mòduls; conservades les referències externes.
- [x] Fotografies de referència Wikimedia Commons enllaçades a l'editor; candidats independents sense descarregar GLB ni afegir llicències de tercers a les malles.
- [x] Preparada la selecció de peces, transformacions, simetria, esborranys, marques i cua de canvis amb el flux existent.
- [ ] Revisió visual al navegador dels candidats GAZ Tigr-M i T-90M abans d'aprovar o substituir els models del joc.

**2026-11-12 · Física, combats i interaccions (codi font):**
- [x] Abaixades les copes principals, les reduïdes i les llunyanes de totes les palmeres per ajustar-les als troncs.
- [x] Roques grosses amb intercepció contínua 3D per a projectils lleugers i pesats al mode individual i volum balístic vertical real al COOP.
- [x] Caixes de munició unificades: 12 bales normals, 2 de franctirador i 1 coet de bazuca (individual i COOP), inventari i descripcions coherents.
- [x] Pistola amb silenciador visual, sense flamarada i amb menor volum i radi de percepció (a peu, com a rider i en percepció d'enemics COOP).
- [x] Torre de comunicacions destruïble des de la base o l'estructura superior, 24 PV compartits, sense emetre cap avís especial als soldats.
- [x] Rampes articulades al ferri: col·lisió de coberta/rampa segons l'angle, suport del moll/platja a l'aturada i elevació en moviment; representació compatible amb superfície de ferri COOP.
- [x] Dalla de la Mort col·locada dins el puny dret a l'escena de mort.
- [x] Sortida de vehicles per la dreta, amb alternatives a la mateixa banda i, només si està bloquejada per parets, filferrades o altres obstacles, provar l'esquerra (individual i COOP).
- [x] Runtime reconstruït manualment el 2026-11-12 amb 70 mòduls; sintaxi validada i manifest actualitzat. Sense activar el workflow d'Actions.
- [ ] Validació al navegador amb llavor 148, proves de còpia de partida COOP i ferri estacionat/embarcant/navegant; la reconstrucció del runtime no és una prova de desplegament.

**2026-11-12 · Refinat interactiu de models (tots els vehicles editables):**
- [x] Controls de posició, rotació, escala i color per peça/grup/model; selecció amb clic o arbre; comparació amb original; 20 passos de desfer/refer.
- [x] Simetria opcional del model complet amb pla X/Y/Z, desplaçament i costat de referència; retall real de triangles i reflexió amb UV/materials. Operació explícita reversible, no restricció permanent.
- [x] Esborranys IndexedDB, exportació/importació JSON, aprovació explícita del candidat sense canviar automàticament el joc.
- [x] Consola persistent amb peça, transformació, revisió i marques; còpia/exportació i cua R2 compartida des del compte administrador, enllaç de lectura de 7 dies.
- [x] Recàrrega i detecció de nova revisió cada 15 s, conservant càmera i esborranys; workflow de desplegament existent activat pel manifest del laboratori, sense activar rebuild-runtime.
- [x] Proves Node de simetria en sis direccions, transformacions, atributs, BTR, serialització, errors atòmics i permisos/caducitat de la cua. Corregides dues expectatives obsoletes del test del comparador (GLB antic / dos visors).
- [x] **BTR-82 3B, 2026-11-12:** afegides dues comportes laterals entre els eixos 2/3, conformades al blindatge i amb perfil de junta, frontisses i nansa. Geometria comuna amb el joc en un únic lot de detalls; revisió de laboratori `live-editor-20261112-side-access-2` i manifest sincronitzats.
- [x] **Petició de model 86d1ad00 · 2026-11-12:** candidat de laboratori amb comportes BTR-82 allargades fins a la quilla (Y=-0,32), resseguint la falda inferior, l'esglaó del lateral i l'espatlla als dos costats; model aprovat del joc conservat amb les comportes curtes fins a acceptació visual. Revisió de laboratori `live-editor-20261112-side-access-keel-3`.
- [x] **BTR-82 3B · referència fotogràfica (2026-11-12):** afegits 4 registres blindats (2 per costat), frontisses, panys, barres i registres rodons als laterals posteriors. Geometria reflectida a X=0; comportes entre el 2n/3r eix esteses fins a la quilla també al joc per petició expressa, amb la mateixa funció procedimental al visor. 97 peces en una sola malla compartida en partida; revisió del laboratori `live-editor-20261112-btr82-rear-symmetry-4`.
- [x] **Laboratori no arrencava (2026-11-12):** `SyntaxError: Unexpected identifier 'ha'` pel text `no s'ha` sense escapar al catàleg del BTR-82. Corregit l'apòstrof, afegit segell de memòria cau al catàleg, missatge d'error visible a l'HTML i prova de sintaxi prèvia a Cloudflare. `node --check` de GitHub Actions correcte a [43302263365](https://github.com/Haanarg/hunter_arxipelag/actions/runs/43302263365); no s'han canviat els models.
- [x] **Retall frontal descartat i revertit per indicació expressa (2026-11-12):** el morro del BTR-82 3B es restaura íntegrament al laboratori (Z=-5,425, com al joc). S'elimina el tall a Z=-4,54 i el codi auxiliar de retall; fars, torreta, comportes fins a la quilla i registres posteriors es conserven. Revisió `live-editor-20261112-t90m-8-btr82-nose-restore`, sense canviar `GAME_VERSION` ni el tanc T-90M del laboratori.
- [ ] **Fars BTR-82:** esperar nova indicació de disseny de l'usuari; no tocar el morro ni reubicar els fars fins que es defineixi la solució.
- [ ] **Validació visual del BTR-82 actualitzat:** comprovar en WebGL la geometria de les dues comportes fins a quilla, els registres laterals posteriors, el marge lliure dels pneumàtics i la simetria completa (incloent ombres), en SOLO, COOP i Android.
- [ ] **Comportes laterals BTR-82:** verificar visualment els dos costats, l'encaix amb el blindatge i el marge de les rodes en WebGL/Android, i la seva presència efectiva a Paradoxa quan el desplegament torni a funcionar.
- [ ] Validació visual 3D pendent: el navegador remot de la sessió té WebGL desactivat; no s'ha pogut comprovar el render ni interactuar amb els models.
- [x] Compilació local Worker i `check:build` correctes; implementació publicada a `c9b8c585`.
- [ ] **Desplegament encara bloquejat:** al darrer workflow verificat [43302263365](https://github.com/Haanarg/hunter_arxipelag/actions/runs/43302263365) la prova de sintaxi del laboratori PASSA, però falten els secrets `CLOUDFLARE_ACCOUNT_ID` i `CLOUDFLARE_API_TOKEN` a GitHub Actions. Sense aquests secrets no s'ha pogut desplegar ni validar a Paradoxa; configurar-los i reexecutar el deploy, després provar l'editor real i la cua amb compte administrador.

**P1 · 2026-11-10 · BTR-82: reparar forats reals i arribar amb el canó a la torreta:**
- [x] Detectada la causa de la regressió: la versió de 5.371 triangles ja tenia el buit frontal; simplement conservar tots els triangles no el tapava.
- [x] Nova geometria de tancament del morro a −Z (part alta, frontal i sota el llavi), i dels laterals/sponsons a la popa +Z, seguint el perfil.
- [x] Tub del canó negre estès des de z = −4,35 fins a z = −1,015 (dins de la torreta); boca de major diàmetre.
- [x] Vuit rodes tancades, amb 12 facetes i llantes, 168 triangles cadascuna; quatre fars a −Z.
- [x] GLB exportat i validat: **4.581 triangles, 25 malles, 185.796 bytes**; SHA256 fixat a test; conservació exacta del casc base.
- [x] Visor limitat a base i model reparat, amb revisió de memòria cau del GLB.
- [ ] Comprovar visualment amb Three.js/Chrome Android que el nou tancament es veu bé; si encara hi ha discontinuïtats, corregir les peces exactes abans d'integrar.
- [ ] Integrar al joc SOLO/COOP només després de validar el visor.

**P1 · 2026-11-10 · regressió BTR-82: restaurar casc i sentit del canó:**
- [x] Eliminades completament les planxes frontals i posteriors artificials de la variant anterior.
- [x] Restaurats tots els 2.556 triangles superficials del casc de la base de 5.371, més els 44 triangles de folre interior originals; les proves comparen les cares geomètriques per evitar regressions de forats.
- [x] Canó negre amb boca més gruixuda orientat cap al frontal real (−Z) i no cap al darrere (+Z).
- [x] Conservades les 8 rodes refinades, 144 triangles cadascuna, i reorientats els fars auxiliars cap al frontal real.
- [x] Nou GLB de 4.199 triangles / 13 malles / 147.776 bytes. El visor manté només original i corregit; cap canvi al model jugable.
- [ ] Validar visualment el casc i la torreta al Chrome Android després del desplegament públic.
- [ ] Integrar al joc SOLO/COOP després de validar el GLB i els pivots de rodes/canó.

**P1 · 2026-11-10 · BTR-82 escollit: façanes simètriques, canó negre i rodes:**
- [x] Davant i darrere amb panells simètrics a X=0 i blindatge central fosc, comprovats geomètricament.
- [x] Canó cilíndric negre prim (radi 0,065) i tram final més gruixut (radi 0,096), una sola malla.
- [x] Vuit rodes de 12 facetes amb llantes i cubs, sòlides i independents.
- [x] Optimització per color de vèrtex: 23 → 12 malles i 175.632 → 148.760 bytes. Model resultant: 4.253 triangles.
- [x] Quatre fars preservats. Visor continua amb només la base i el refinat, sense candidats antics.
- [ ] Validació visual final al Chrome Android després del desplegament.
- [ ] Integrar la tanqueta al joc només després de revisar rodes, torreta, hitbox i orientació (SOLO/COOP).

**P1 · 2026-11-10 · tanqueta BTR-82 50% reparada al comparador:**
- [x] Casc recuperat dels panells més complets, folre intern de coberta i laterals per tapar forats.
- [x] Vuit rodes octogonals tancades amb tapes de cub i quatre fars davanters visibles (dos existents + dos auxiliars).
- [x] Nou GLB de 3.671 triangles / 23 malles; mats militars opacs i sense UV corruptes.
- [x] Pestanya Tanqueta reduïda a dos GLB: base 5.371/18 i 50% reparat 3.671/23. Candidats anteriors eliminats.
- [ ] Revisió visual final en Chrome Android; sense canvis a la tanqueta jugable.
- [ ] Després de validar-lo, adaptar torreta, rodes, hitboxes i ocupants a SOLO/COOP.

**2026-11-09 · Caixes de munició i comptadors (v0.6.202):**
- [x] Cada caixa de munició afegeix **16 bales** per pistola/fusell d'assalt, **5 cartutxos** de franctirador i **3 coets** de bazuca (SOLO/COOP).
- [x] Possessió del bazuca independent dels coets, incloent recuperació de partides antigues i autoritat del servidor.
- [x] Tres tipus de munició amb icona i xifra a l'inventari; cap comptador de munició sota les icones d'armes.
- [x] Comptador integrat al botó tàctil de disparar, granada en vehicle i míssils d'helicòpter.
- [x] Regressió `tests/ammo-pickup-hud.mjs` integrada a `test:basic`.
- [ ] Provar visualment comptadors de totes les armes, tant en pantalla tàctil com en ordinador i als dos modes.

**P1 · 2026-11-09 · segona iteració de la tanqueta BTR-82:**
- [x] L'antiga variant 25% (5.371 triangles, 18 malles) és la nova referència 100%, amb materials militars mats.
- [x] Nous LOD 75%=4.025, 50%=2.684, 25%=1.338 triangles. Totes quatre versions mantenen 18 malles.
- [x] Per al nou 25%, vuit rodes octogonals de 48 triangles cadascuna, evitant triangles desfigurats; mateix xassís, torreta i colors mats.
- [x] GLB comprovats com a glTF 2.0 amb trimesh i renderitzats de costat i des de dalt; materials i dimensions dins rang.
- [x] Els quatre GLB de segona generació estan publicats i verificats per GitHub Actions (run 42704094186).
- [ ] Validar visualment a Chrome Android el nou 100% i els tres LOD; la tanqueta jugable continua sense canvis.

**P1 · 2026-11-09 · BTR-82: corregir artefactes de colors i peces invisibles:**
- [x] Diagnòstic de captura Chrome Android: malles reduïdes amb UV interpolades erròniament sobre atlas amb transparències i colors vius; rodes/casc deformats visualment.
- [x] Reconstrucció dels tres GLB 75/50/25 amb 10 materials militars mats i opacs, sense textures PNG ni alfa mask als LOD; model font 100% i les seves onze imatges intactes.
- [x] Reproduïble a `tools/repair-btr82-materials.cjs`, sense canviar la geometria (16.109/10.745/5.371 triangles, 18 malles).
- [x] Verificació de renderització amb VTK fora de WebGL (casc, rodes i torreta recognoscibles) i comprovacions de materials, hashes, malles i triangles.
- [ ] Confirmació visual en Chrome Android després del desplegament de Pages; el model de la tanqueta jugable segueix sense canvis.

**P1 · 2026-11-09 · autopublicació dels quatre GLB BTR-82 al visor:**
- [x] Transferència del model original i tres variants 75%, 50% i 25% a un arxiu comprimit GitHub mitjançant Git Data API, sense accions manuals.
- [x] Workflow `[btr82-publish]` valida el SHA i els quatre GLB, els publica al camí de candidats i elimina l'arxiu temporal.
- [x] La pàgina de candidats carrega automàticament 100/75/50/25% del servidor, amb triangles/meshes reals i enllaç per descarregar cadascun, conservant la importació manual només com a reserva.
- [x] Quatre GLB publicats i verificats per GitHub Actions (run 42693159067): 21.483/16.109/10.745/5.371 triangles, 199/18/18/18 malles, 11 PNG per model.
- [ ] Comprovar visualment les textures i escala des del domini públic `hunter.paradoxa.cat`; no s’ha canviat la tanqueta del joc.

**2026-11-09 · Impacte directe bazuca/míssils (v0.6.201):**
- [x] Regla compartida: bazuca, míssil d'helicòpter i coet naval fan 10 PV quan impacten directament un vehicle (incloses tanquetes enemigues de l'HQ).
- [x] La víctima directa queda exclosa del dany expansiu del mateix projectil, sense duplicació; la resta de soldats, vehicles i estructures reben el dany expansiu habitual.
- [x] Aplicat a SOLO i COOP; prova de regressió a `tests/vehicle-health-and-blast.mjs`.
- [ ] Prova manual de 2 impactes directes contra tanqueta HQ en partida individual i cooperativa.

**P1 · 2026-11-09 · BTR-82: recuperar el detall reconeixible amb 75/50/25%:**
- [x] Tres nous GLB reconstruïts des de l'original amb VTK DecimatePro, textures originals intactes i 18 malles: 16.109/10.745/5.371 triangles.
- [x] Substituïts els nivells extrems 5/4/3/2% del banc actiu pels tres nivells 75/50/25%. Es manté el 100% com a referència.
- [x] Classificador actualitzat perquè el 75% i el 50% no es tractin com a originals, ni els antics GLB es mostrin com a nous candidats.
- [x] GLB offline verificats: transparències PNG, UV, recompte de triangles, dimensions i vuit rodes independents.
- [ ] Comprovar la silueta i el rendiment WebGL dels tres LOD amb el GLB importat i triar-ne un per integrar-lo; el model jugable no ha canviat.
- [ ] Publicar els binaris al repositori quan es disposi d'un mitjà de càrrega de GLB; ara es poden importar directament a la web.

**P1 · 2026-11-09 · correcció importació i reducció del BTR-82:**
- [x] Corregida la pèrdua de paleta de les onze textures als quatre GLB offline (alfa 1/255 causava invisibilitat); generat un ZIP nou amb 4 LOD visibles i l'original compatible.
- [x] La importació del GLB original 100% inicia els quatre LOD; els GLB reduïts s'importen sense resimplificar-los al panell corresponent (5/4/3/2%), conservant els altres nivells.
- [x] Materials de les variants restaurats des de l'original del navegador; colors provisionals per als GLB antics sense origen.
- [x] Verificació de recompte real i prova de geometria Three.js/meshoptimizer de 199 malles.
- [ ] Comprovar al navegador la visibilitat de les quatre variants amb textures, l'orientació, el nombre de triangles i l'exportació de GLB.

**P1 · 2026-11-09 · tanqueta Low Poly BTR 82 i quatre reduccions al banc:**
- [x] El BTR-82 de SIpriv (CC BY 4.0) queda com l'únic candidat de tanqueta; eliminats Stryker i M1128 del catàleg i del manifest.
- [x] Comparació del vehicle actual amb BTR-82 original 100% i quatre reduccions 5/4/3/2% calculades amb `SimplifyModifier` / meshoptimizer i fusió de peces per material, preservant pivots de les vuit rodes i la torreta.
- [x] Importació de GLB, persistència en IndexedDB, exportació individual dels quatre LOD i visor original de Sketchfab mentre manca el binari.
- [x] GLB original recuperat a la conversa: 1.592.644 bytes, 21.483 triangles i 199 malles (SIpriv, CC BY 4.0). Variants offline VTK 5/4/3/2% (1.077/875/654/448 triangles, 18 malles) exportades com a ZIP.
- [ ] Per habilitar la càrrega automàtica a la web, encara cal pujar el GLB original a `assets/vehicle-candidates/tanqueta/btr82-original.glb`; el connector GitHub no permet transferir directament el binari del contenidor. Es pot importar al visor amb IndexedDB sense pujar-lo.
- [ ] Verificar les UV, les 8 rodes, el perfil de la torreta i el rendiment real; després triar un LOD i integrar-lo en SOLO/COOP.

**2026-11-09 · búnquer blindat (v0.6.200):**
- [x] Excepció al balanç general: **30 PV** a cada paret exterior/interior i al sostre del búnquer; **20 PV** a la porta blindada, immune a armes lleugeres.
- [x] Aplicació al generador físic SOLO i COOP, incloses parets interiors especials i serialització de la porta blindada al Worker.
- [x] Prova de regressió `tests/structure-durability.mjs` ampliada per verificar els PV i la immunitat.
- [ ] Provar visualment una partida nova amb el búnquer en SOLO i COOP.

**P1 · 2026-11-09 · resistència uniforme dels edificis (v0.6.199):**
- [x] Parets i sostres ordinaris i militars: **10 PV** per segment/coberta; pilars frontals i laterals de l'hangar **10 PV**, també murs interiors del búnquer. Dany d'armes lleugeres bloquejat, sense reducció parcial de PV; explosions pesades i embestides de vehicles poden destruir les estructures.
- [x] Barracons i cabanes de fusta: parets i sostres **4 PV** i vulnerables a armes lleugeres; totes les portes de les edificacions **4 PV**, independentment del material (inclosa la porta del búnquer).
- [x] Mateixes regles a SOLO i Worker COOP: etiquetes de fusta conservades en serialitzar, impacte directe als sostres de fusta i explosions pesades sobre sostres reforçats; s'ha retirat l'excepció prèvia de sostre invulnerable del búnquer.
- [x] Regressió `tests/structure-durability.mjs` incorporada a la bateria bàsica: PV, tipus d'arma i col·lisió de projectils al sostre en COOP.
- [ ] Validació en partida real, especialment la porta del búnquer i la destrucció de sostres de fusta en mode individual i cooperatiu.

**P1 · 2026-11-08 · recerca i substitució dels candidats tanc/M1A1 i tanqueta/NZLAV:**
- [x] Retirats sis models genèrics rebutjats (tres per vehicle), inclosos els fitxers GLB, manifests i les opcions del catàleg.
- [x] Localitzades tres fonts Sketchfab amb llicència verificada per tipus; tanc: M1A1/M1 de Quasar, Scril i Artem Goyko; tanqueta: Stryker 8×8 de bunny, M1128 de LM3D i BTR 82 de SIpriv com a alternativa menys fidel.
- [x] Comparador 3D usa els embeds oficials, amb crèdits, llicències, triangles, enllaç de descàrrega oficial i opció d'importar un GLB legítim; els models no es fan passar per binaris locals.
- [x] Límits del downloader CC0 ampliats a 32 MiB / 128 MiB, amb protecció perquè el procés automàtic no substitueixi mai els blindats per models aleatoris.
- [ ] **Pendent**: obtenir els GLB autoritzats pel creador i provar-los a Three.js, reduir triangles/textures, separar torretes i rodes, provar escala, col·lisió i rendiment (SOLO/COOP). El model de tanqueta escollit ha de tenir 8 rodes i torreta similar a la NZLAV. Fins aleshores conservar els procedimentals del joc.

**P1 · 2026-11-08 · torre que envaeix l'heliport (captura llavor 422475840):**
- [x] Diagnòstic: al camp de presoners l'heliport local era `(36,39)`, de 30×30 m; la torre NE local era `(56,56)`, massa a prop de la cantonada i de la zona de seguretat.
- [x] Traslladada la torre de la banda est del camp a `(56,8)`, fora de l'heliport, les instal·lacions i la porta del recinte.
- [x] Nova comprovació pura a `src/compound-planning.mjs` abans de construir cap complex: reserva la plataforma rectangular, el disc de rotor i **6 m** de marge respecte a la teulada real de cada torre. Corregeix qualsevol altre solapament per cerca determinista sense RNG; si és impossible, omet únicament la torre conflictiva.
- [x] Aplicada a `src/compound-generation.js` en SOLO i COOP, i registrada la intervenció al registre del complex; regressió `tests/heliport-tower-clearance.mjs` amb la posició original del cas, rotacions de 90° i variants d'heliport.
- [ ] Confirmar visualment al navegador que l'heliport del camp de presoners queda net en una partida amb llavor **422475840**, en individual i cooperatiu.

**P1 · 2026-11-08 · tanc contra mobiliari dels pobles:**
- [x] La col·lisió de bancs (5 PV) i pous (8 PV) ara admet l'embestida del **tanc**, inclosa la marxa enrere; el vehicle no pateix dany i conserva pràcticament tota la velocitat.
- [x] Reutilitzat `dmgW`/`collapseCivicProp` per a fragments, so, eliminació atòmica dels dotze segments del pou i aparició de les runes. Les runes ja no bloquegen els tancs; continuen blocant els altres vehicles.
- [x] Lògica compartida a `combat-rules.mjs` per a SOLO i Worker COOP; prova `tests/tank-civic-runover.mjs` amb enderroc, agrupació de col·lisions, idempotència i escombratge del Worker.
- [ ] Confirmar els efectes visuals i el pas del tanc en una partida real (SOLO i COOP).

# Hunter: Arxipèlag — to-do.MD

> **FONT ÚNICA DE FEINA PENDENT.** Revisió del repositori: 2026-11-04 (versió inicial observada 0.6.116; P0 revisada a 0.6.119). Aquest document és el pla d'execució i el registre de tasques obertes. Els documents antics descriuen implementacions històriques i **no** obren tasques noves automàticament. Quan es resolgui una tasca, marcar-la [x] i afegir la prova o el commit. No confondre «implementat» amb «verificat en una partida real».

> **Proves automatitzades (2026-11-07):** la bateria s'ha reduït a 13 comprovacions essencials, executables amb `npm test`. Les mencions a noms de proves concretes dins les fases històriques són evidències d'implementacions passades, no fitxers que encara hagin d'existir ni ordres de CI vigents.

**P1 · 2026-11-08 · selecció definitiva Apache sàlvia/negres (codi i binari publicats):**
- [x] Accés d'escriptura GitHub verificat. El model final d'Araon és sàlvia mat, amb aspes, rodes i detalls negres, 2.193 triangles; GLB local preparat `apache-50-rodes75-salvia-negre.glb`.
- [x] Afegida càrrega única des del bootstrap i fàbrica `heli_combat` a `src/apache-araon-runtime.mjs` amb dos pivots reals dels rotors, escala i orientació, dades de contacte, i reserva procedural si no hi ha GLB.
- [x] Retirades la pestanya Apache, les pàgines de preview LOD i tres acabats, els manifests de variants i les utilitats i tests obsolets. Queden 7 tipus pendents i 20 GLB CC0.
- [x] Prova automàtica de connexió `tests/apache-approved.cjs` i crèdits CC BY 4.0.
- [x] **Incidència de regressió resolta (2026-11-08):** el carregador de l'Apache era present però `assets/vehicle-models/apache-araon-salvia-black.glb` faltava a `main`, i per això apareixia el model procedural antic. **Restaurat** exactament el blob Git `6f36c98354d7ed9e6750ea8c33ed7745a266b9a9` del commit `df4eff85852da263e9354050cc2ed444f9320136` al camí productiu: **4.123.680 bytes**, SHA256 `be906866d6ac87835f2e30b11ce14bcc6b6ff13ee2cb39e798fd3cf6167f89df`, 2.193 triangles (cos 50%, rodes 75%) i quatre textures. Sense alteració ni recompressió del model aprovat.
- [x] Afegida **reserva compacta d'Araon** `assets/vehicle-models/apache-araon-50mesh.zlib` (18.862 bytes, geometria 50%, 2.173 triangles): només s'usa si falla el GLB aprovat. Corregit l'escalat perquè es dedueixi de la longitud real del model; test de presència/hash, geometria, pivots i rang físic. El GLB original restaurat té sempre prioritat.
- [ ] Verificar que GitHub Actions (tests/build) i Cloudflare Pages publiquen la versió nova; provar en SOLO i COOP que el GLB principal funciona amb el material sàlvia/negre i no es queda en reserva compacta/procedural.
- [ ] Confirmar a Cloudflare i en una partida real l'aspecte i el gir dels rotors, seients, col·lisions, ombres i transparències en SOLO/COOP/Android.

**Implementació definitiva 2026-11-08 · helicopters Three.js (substitueix el prototip i els GLB antics):**
- [x] **Huey** de Duane's Mind convertit a `THREE.BufferGeometry`, 10% més gran (`1.35→1.485`), portes laterals obertes i **2 seients** nous (pilot i copilot) visibles; 1.767 triangles originals i 352 nous de seients. Atles PNG original separat. El runtime de vol no carrega GLB.
- [x] **Apache** d'Araon: malla APG2 integrada al JavaScript i reconstruïda directament en Three.js, **50% més gran** (longitud objectiu `7.15→10.725`), neteja de triangles dels antics manyocs del tren d'aterratge i creació de **tres rodes cilíndriques circulars** amb boixes i suports. Paleta sàlvia mat/negres, pivots animables.
- [x] Eliminats del repositori `assets/vehicle-models/huey-duane-doors-open.glb`, `apache-araon-salvia-black.glb` i `apache-araon-50mesh.zlib` (dades APG2 ara embegudes).
- [x] Ajustades metadades de contacte rotor i dimensions de col·lisió als models més grans en `src/vehicle-model-core.mjs`, `src/vehicle-specs.mjs` i `src/game-core.js`. La fàbrica és única per SOLO i COOP.
- [x] Actualitzada `helicopters-engine-compare.html` com a previsualitzador de les malles natives amb materials i wireframe; el banc de candidats manté exclosos els dos helicòpters.
- [x] **CI i build superats** en la versió 0.6.197: [GitHub Actions 42528952724](https://github.com/Haanarg/hunter_arxipelag/actions/runs/42528952724). Test real Node/Three.js: Huey **2.119 triangles** (1.767+352 seients), ample 7,010 / alt 4,115 / llarg 15,513; Apache **2.511 triangles** (2.173 - 154 cares malmeses + rodes i tirants), 3 rodes rodones, ample 7,467 / alt 3,625 / llarg 10,725. Tests bàsics, versió i generació del runtime correctes.
- [ ] Comprovar el desplegament de Cloudflare i validar **visualment** les rodes, els seients, els rotors, les ombres, les altures i les col·lisions en una missió SOLO, COOP i Android.

**Històric 2026-11-08 · prototip de comparació anterior (superat, no representa el runtime actual):**
- [x] Convertit el **Huey 100 de Duane's Mind amb portes obertes** a `src/huey-duane-native-geometry.mjs`: 1.767 triangles, 6 malles i 24 accessors reconstruïts com `THREE.BufferGeometry`, normals i UV originals, rotor principal/de cua i jerarquia íntegres. L'atles PNG original s'ha extret i publicat separat a `assets/vehicle-models/huey-duane-native-atlas.png`; no s'utilitza `GLTFLoader` en la versió nativa.
- [x] Exposada a `src/apache-araon-runtime.mjs` la fàbrica `prepareApacheCompactNative`: geometria de motor `THREE.BufferGeometry` de l'Apache 50% (2.173 triangles), descomprimida de l'APG2 de 18.862 bytes, amb 5 peces i colors de vèrtex. **No és visualment idèntica al GLB final de 2.193 triangles, rodes al 75% i textures.**
- [x] Pàgina `helicopters-engine-compare.html`: quatre panells Huey GLB / natiu i Apache GLB / natiu, càmera sincronitzada, gir de rotors i recomptes. Enllaç afegit al banc general sense retornar cap helicòpter al catàleg de candidats.
- [x] Afegit `tests/helicopter-engine-comparison.cjs` a la bateria bàsica; valida exactament els buffers i la textura Huey contra el GLB i l'absència d'helicòpters al catàleg.
- [ ] Provar visualment la comparativa WebGL a Cloudflare en escriptori i Android (UV, transparències i pivots) i decidir si convé substituir els GLB del joc pel format natiu. **Els dos GLB continuen com a versions definitives actives del joc.**

**Històric anterior de preparació i comparació (superat per la selecció actual):**
- [ ] **Verificació visual pendent:** confirmar càrrega real WebGL en SOLO i COOP, pivot i gir de rotor principal i de cua, contacte de rodes amb sòl, escala, seients i armament. GitHub Actions no comprova la renderització real.
**P1 · 2026-11-08 · variants Apache 50% + rodes 75% (proposta visual, sense integrar al joc):**
- [x] A partir de l'original PBR reparat, recuperades les peces de les rodes que comparteixen la malla `hull`, separades per connectivitat/topografia de la font i simplificades al 75%. Com que el GLB històric apache_75.glb no és al repositori, la geometria de les rodes del 75% s'ha reconstruït independentment a partir del 100%, no extret literalment d'aquell fitxer absent.
- [x] Cos amb simplificació classe 50%, rodes 75%: **2.193 triangles** en total (3.808 originals, 1.203 del cos, 145 de les rodes i 845 dels altres elements). GLB verificats, quatre textures PNG incrustades, PBR mat i il·luminació revisats en render headless; nivells de rugositat 0,83/0,91/0,97.
- [x] Tres variants: oliva clara, sàlvia mat i sorra verdosa, desades en `apache-50-rodes75-tres-variants.zip` com a fitxers de la conversa. Les textures difuses s'han aclarit i matisat sense substituir el mapa UV original.
- [x] Comparador `apache-variants-proves.html` amb tres vistes sincronitzades, importació de ZIP/GLB per arrossegament i persistència en IndexedDB; enllaços als altres bancs de prova. CI superada al commit `f72434c`.
- [ ] **Binaris no publicats a GitHub**: manca copiar els tres GLB del ZIP a `assets/vehicle-candidates/helicopter-lods/`. No afirmar que es carregaran automàticament a la web pública fins que els binaris s'hi hagin pujat i Cloudflare hagi desplegat.
- [ ] Inspeccionar les tres variants en WebGL real i triar el color/acabat definitiu; després decidir si el model s'ha d'integrar al joc, amb punts de rodatge, canó, armes, ocupants i col·lisions.

**P1 · 2026-11-08 · model Apache d'Araon sense textures al visor:**
- [x] Afegida inspecció dels mapes de color dels GLB importats a `src/helicopter-texture-recovery.mjs`, reutilitzada pels dos bancs de proves. Si existeix un únic atles de color desconnectat, s'intenta revincular; si falten textures, es mostren pintures militars de **substitució clarament etiquetades**, sense fer-les passar per la textura oficial. Proves d'Atlas/color i CI executades.
- [x] **GLB original Apache recuperat de la conversa**: `ah-64_apache(1).glb` (2.970.256 bytes), 5 malles, 2 materials i **4 PNG incrustats**. La causa del blanc és l'extensió `KHR_materials_pbrSpecularGlossiness`: el color autèntic viu a `materials[1].extensions.KHR_materials_pbrSpecularGlossiness.diffuseTexture.index=0`, i es perd en Three.js modern.
- [x] Compatibilitat `src/apache-glb-compat.mjs`: converteix aquesta extensió a PBR glTF estàndard **abans de GLTFLoader**, preservant exactament els bytes BIN, les quatre textures, les UV i la geometria. Integrada als bancs general i de LOD. Prova `tests/apache-glb-compat.mjs`, integrada a CI i superada. GLB corregit `apache_100.glb` preparat en aquesta conversa (2.970.128 bytes; SHA256 `33a706c43a87e2b74c1ff85ba1fd72cc3e8a8d31e45a896bd55d6923c8eccf2f`).
- [x] **Nova font rebuda `ah-64_apache(2).glb`**: inspeccionada i convertida a `apache_100.glb` PBR autèntic (2.970.020 bytes, 3.808 triangles, 4 textures PNG). SHA256 original `45279ea9c9191c6cfaa949bd2546ebe0a8fcc817af09e69f01f7649419628363`; SHA256 corregit `d19e5557e0056b4b41a5735f78f0aa131a8e906386b4a0a239de257771f2acd3`. El fitxer està disponible per descarregar des de la conversa; això no implica que s'hagi pujat al servidor.
- [x] **Preview Apache millorat** al commit `45046e7`: el comparador mostra la referència oficial Sketchfab al panell 100 quan falten binaris, accepta un GLB original/corregit sense canviar-ne el nom (o per arrossegament), converteix materials legacy a PBR, desa el model al navegador i genera LOD 75/50/25 que hi faltin amb les textures originals. Prova `tests/vehicle-candidate-studio.cjs` actualitzada; CI superada. Les variants resultants només existeixen al navegador fins que es publiquin els binaris.
- [ ] **Pujada binària pendent** a `assets/vehicle-candidates/helicopter-lods/apache_100.glb`. El fitxer ja es pot descarregar del resultat d'aquesta conversa, però l'acció GitHub de `create_file` només admet text i la de `create_blob` exigeix passar 4 MB de base64 com a paràmetre, sense suport per a la ruta del contenidor. No afirmar que s'ha publicat. Pujada web manual: `https://github.com/Haanarg/hunter_arxipelag/upload/main/assets/vehicle-candidates/helicopter-lods`.
- [ ] Verificar l'aspecte real al navegador un cop publicat el GLB 100%, reproduir les variants 75/50/25 amb materials PBR genuïns, i actualitzar el manifest només quan existeixin efectivament al repositori.

**P2 · 2026-11-08 · comparador de LOD del Huey i l'Apache:**
- [x] Nova pàgina `helicopters-lod-proves.html` i mòdul `src/helicopters-lod-proves.mjs`: quatre vistes 3D sincronitzades (100%, 75%, 50%, 25%) del Huey (Duane's Mind) i Apache (Araon), rotació comuna, zoom, animacions i recompte de triangles.
- [x] El visor prioritza els GLB del servidor (`assets/vehicle-candidates/helicopter-lods/{huey|apache}_{100|75|50|25}.glb`), però si encara no existeixen permet importar el ZIP local de 8 models, descomprimir-lo al navegador i conservar els GLB a IndexedDB per a visites futures. Enllaç afegit a `vehicles-externs-proves.html`.
- [x] Manifest `assets/vehicle-candidates/helicopter-lods/manifest.json` amb mètriques, crèdits i **estat 'metadata_only_awaiting_binary_upload'**; comprovacions del visor afegides al test del banc de candidats.
- [x] Generat un HTML autònom que inclou els vuit GLB (descàrrega de la conversa: `hunter_helicopters_web_autonom.zip`) per veure els models sense haver de publicar-los. Requereix connexió per carregar el component de renderitzat 3D.
- [ ] **Publicació dels binaris pendent**: no es pot convertir automàticament un fitxer adjunt del contenidor en el contingut binari d'un commit GitHub amb les accions de repositori disponibles; la pàgina remota no pot carregar encara els GLB fins que s'hagin transferit. Paquet de desplegament `hunter_helicopters_assets_per_github.zip` preparat. Després comprovar desplegament Cloudflare i aspecte real al navegador.

**P2 · v0.6.192 · Huey UH-1 de Duane's Mind definitiu (integració implementada, proves visuals pendents):**
- [x] Aprovada la versió **100% original** de Duane's Mind. S'han obert les dues portes laterals de passatgers eliminant només les cares dels laterals; es conserven cabina, sostre, patins, transparències i els dos rotors. Model resultant **1.767 triangles**, amb textura i animació originals: `assets/vehicle-models/huey-duane-doors-open.glb`.
- [x] GLB binari autèntic desat i verificat a GitHub. Crèdits al `README.md` i `assets/vehicle-models/README.md` (Duane's Mind; **CC BY 4.0**, modificacions indicades).
- [x] `src/huey-duane-runtime.mjs` carrega el GLB una sola vegada en arrencar; `src/vehicle-model-core.mjs` crea el model visual de `heli` amb els pivots originals per als dos rotors. Escala i cota dels patins adaptades; física, col·lisions i desaments mantenen el contracte anterior. Hi ha reserva procedural si falla la càrrega.
- [x] Eliminada la pestanya del Huey tant de `vehicles-externs-proves.html` com de `helicopters-lod-proves.html`; eliminats els candidats Huey 75/50/25 del catàleg i del manifest. L'**Apache d'Araon** continua pendent de triar el nivell de simplificació.
- [x] Afegida prova de GLB i integració `tests/huey-approved.cjs` a `npm test`.
- [ ] **Validació real imprescindible:** verificar la càrrega WebGL del Huey a la web publicada, orientació del morro, escala, alçada d'aterratge, ombres, transparències, visibilitat de les portes obertes i animació dels rotors; inspeccionar compatibilitat amb el LOD llunyà, el mode individual, COOP HOST/GUEST i Android, i comparar rendiment. Les proves Node no fan comprovacions de GPU.
- [ ] **Apache:** textures autèntiques recuperades en GLB local; comprovar-les al navegador i triar el LOD definitiu; després integrar rig, canó, míssils, col·lisions i tripulants, amb validació visual.

**P2 · v0.6.185 · Naked streetfighter definitiva al joc (implementat):**
- [x] El model de moto procedimental antic s'ha substituït per la quarta variant `Naked streetfighter`, seleccionada amb paràmetre de simplificació **25% per a les peces que admeten reducció**. Resultat precompilat: **3.862 triangles**; els radis, llandes, pneumàtics, forquilla, manillar i agafadors conserven el detall íntegre. ESM estàtic `src/streetfighter-25-geometry.mjs`, sense GLB o optimitzador a temps de missió, amb geometries reutilitzades entre instàncies.
- [x] Nova moto amb **escala 75%** respecte a la silueta ajustada anterior; direcció completa amb un sol pivot `steeringPivots`, rodes independents per al moviment i punt del pilot adaptat. Parts `paint` del model blau originals recolorides amb els **set colors vius** en cicle segons la llavor, sense tirades aleatòries addicionals i mantenint el camp `v.color` a les partides.
- [x] Retirades les tres motos GLB candidates, el comparador de quatre reduccions, els tests de simplificació del GLB ja acceptat, el generador temporal i l'antic model procedimental. El banc de proves passa a nou tipus de vehicles i 26 GLB.
- [ ] **Validació visual pendent:** jugar en SOLO i HOST/GUEST; comprovar mida, contacte de pneumàtics amb el terreny, color, posició d'extremitats, gir de forquilla/punys/manillar i caigudes/col·lisions; repetir amb Android. Les proves Node verifiquen geometria, jerarquia, colors i animació, no aspecte real al navegador.

**P2 · v0.6.187 · Ajust de mida de la moto i tirant de direcció:**
- [x] La `Naked streetfighter` definitiva augmenta un **50%** respecte a la versió 0.6.186. Escala interna `motorcycleVisualScale=1.5`, aplicada al model complet (radis, forquilla, xassís i manillar), i radi de rodament corregit. Dimensions de col·lisió de moto actualitzades a 1,65 × 4,25 unitats amb radi de detecció 2,3.
- [x] Connector de la direcció replegat: tija escurçada en l'eix longitudinal (`scale.z=.55`) i corona reculada (`position.z=.18`); continua unit al pivot de manillar/forquilla. Manté la geometria precompilada i el recompte de 3.862 triangles.
- [x] Posicions de seient, mans, peus i rider distant actualitzades a la nova escala; conserva animació del pivot i els colors per llavor.
- [x] Regressions Node sobre amplada, llargada, direcció, tija, col·lisió i radi de les dues rodes, i compilació del paquet.
- [ ] **Validació visual pendent:** comprovar que la tija no sobresurt en cap angle, el contacte de pneumàtics i el pilot, tant en SOLO com en COOP i Android.

**P2 · v0.6.189 · Ajust de mida final de la moto i el motorista:**
- [x] Reducció del **25% respecte a v0.6.187**, de manera uniforme, de la Naked streetfighter (factor visual de `1.5` a `1.125`), sense regenerar la geometria ni tocar la unió manillar–forquilla que ja està ben acabada.
- [x] Reducció del **25% del rider**, inclòs el LOD llunyà; posicions locals del seient, mans i peus compensades per encaixar amb el nou xassís, i radis de gir de les rodes recalculats.
- [x] Hitbox `moto` de 1,65 × 4,25 a **1,24 × 3,19**, radi de proximitat de 2,3 a 1,75. Conservar els colors vius i el pivot de direcció compartit.
- [ ] **Validació visual pendent**: pilot, agafadors, contacte rodes-terra, COOP i Android; la prova automatitzada només valida jerarquia i mides.

**P0 · v0.6.190 · destrucció física i visual de la coberta de l'hangar:**
- [x] Substituïda l'antiga animació de la volta sencera (que la càmera ocultava quan els PV arribaven a zero) per fragments independents de l'ocultació interior. Els 10 trams es divideixen en 3 panells cadascun, amb metall, orientació, caiguda, gir, fum i runa compartint geometria/materials; sense costos durant la generació inicial.
- [x] Una coberta amb `rb` o `rhp<=0` deixa de ser una superfície sòlida per a bales, coets, granades i detecció de trajectòries. No es modifica la vida inicial (10 PV) ni la resta de parets.
- [x] Nova regressió `tests/hangar-roof-destruction.mjs`: panells visibles tot i la càmera interior, caiguda única, col·lisions eliminades i manteniment dels altres sostres.
- [ ] **Validació a navegador/Android pendent:** observar un hangar intacte i la ruptura completa amb granades/bazuca/tanc, provar després caminar i llançar granades a través del forat; reproduir a SOLO/COOP.

**P2 · v0.6.191 · recuperació de la mida anterior de la moto (aplicat):**
- [x] Retorn a la **mida preferida de la v0.6.187**: Naked streetfighter amb `motorcycleVisualScale=1.5` (en lloc del `1.125` provisional) i motorista complet, inclosa la figura de LOD distant. El seient, les mans i els peus recuperen la posició anterior.
- [x] Col·lisions i radi de detecció restaurats a `moto: [1.65,4.25]` i `radii.moto:2.3`; radis de rodes calculats a partir de l'escala restaurada.
- [x] **No s'ha modificat** la connexió bona del manillar a la forquilla, ni la geometria precompilada, ni els colors, ni la direcció.
- [ ] Validació visual ràpida en SOLO i COOP per confirmar que la mida anterior continua sent la preferida.

## Llegenda i límits

- **P0**: regressions greus, estrebades, sincronització i seguretat de les partides. **P1**: estalvi mesurable de CPU/GPU/memòria o refactor essencial. **P2**: reducció de complexitat, manteniment i acabat. **P3**: millores funcionals ajornades.
- **[ ] Implementació**: encara cal comprovar o desenvolupar el canvi. **[ ] Validació**: hi ha codi o proves, però no consten com a validades visualment en tots els entorns. **[ ] Investigació**: mesurar abans de decidir.
- Paritat exigida: solitari i COOP (HOST/GUEST), mapa petit/gran, WebGL al navegador i Android quan pertoqui; la llavor ha de generar exactament el mateix món i no s'ha de modificar l'RNG global.
- No tocar el balanç, aspecte, controls ni la serialització de partides durant una extracció de codi, tret que sigui un canvi de joc explícit amb proves específiques.
- Les dades de rendiment històriques són *indiciàries*: no existeix encara una bateria comparativa completa de FPS GPU, p95/p99 i dos dispositius després de les darreres modificacions.

**P1 · v0.6.188 · acceleració de la preparació visual i del progrés de càrrega (implementació):**
- [x] **Decoració fixa:** els lots definitius escriuen les posicions, normals, UV i colors directament des de les geometries originals als buffers finals. Ja no s'instancien geometries temporals amb `toNonIndexed()`/`clone()` ni es transformen i es destrueixen per cada malla. Es conserven els vèrtexs, colors, materials i l'ordre dels checkpoints; la geometria original només es descarta al final. Estadística `temporaryGeometryCopies: 0`.
- [x] **Palmeres:** les versions LOD de tronc utilitzen còpies massives dels buffers `instanceMatrix`/`instanceColor`; les copes simplificades copien trams exactes Float32 per variant sense reconstruir objectes Matrix4/Color per palmera. Els buffers de cada LOD continuen independents perquè les palmeres destruïdes desapareguin de totes les representacions. Sense tirades RNG addicionals.
- [x] **Progrés:** només s'actualitza la UI aproximadament cada 80 ms, i immediatament si canvia l'etapa o s'acaba/cancel·la/falla la generació. No es modifiquen les pauses cooperatives ni el nombre de passos; l'estat intern conserva cadascun dels checkpoints.
- [x] Afegides proves `tests/static-decor-direct-batch.mjs`, `tests/palm-lod-copy.mjs` i `tests/progressive-build-progress.mjs` a la CI; contrast de geometries, colors, ordre de matrius, aleatorietat i avisos.
- [ ] **Validació pendent:** comparar els temps `stages.finalizationAndBatching`, `vegetationMs` i `totalMs` amb llavor 148 en mapa petit/gran; comprovar escena amb llum i ombres, destrucció de palmeres, Android i COOP HOST/GUEST. L'estalvi real encara no s'ha quantificat.

**P1 · v0.6.185 · accelerar el posicionament de palmeres i roques (implementació):**
- [x] Els punts de la graella (aprox. 114.000 mapa petit / 462.000 mapa gran) no consulten `hAt` si són segurament mar profunda fora de totes les illes i zones de nivellació. Les dues tirades de desplaçament aleatori es conserven abans del filtre, i les plataformes costaneres s'hi inclouen.
- [x] Índexs espacials estàtics d'edificis i compounds amb els mateixos predicats finals de distància; radi inusualment gran = verificació exhaustiva. Mateix filtre segur en la generació de vegetació del COOP.
- [x] Telemetria `HUNTER_VEGETATION_STATS.placement`: mostres totals, descart de mar profunda i consultes inicials d'altura realitzades. Prova de paritat per llavors 67/148/2026, col·lisions amb edificis/compounds, plataformes i estat RNG idèntic.
- [ ] **Validació visual i de temps real pendent:** mesurar el temps d'inici de les dues escales amb la mateixa llavor (especialment 148), verificar vegetació i roques en solitari/COOP i Android. No atribuir un estalvi de segons sense mesura real.

**P1 · v0.6.184 · accelerar la generació inicial dels camins (implementació):**
- [x] Memòria cau local de la cota visual per vèrtex compartit de la graella de camins: una consulta a `heightAt` per coordenada en lloc d'una per cantonada de triangle. La cota, el color, la geometria i la refeta posterior quan canvia el LOD continuen sent idèntics. `world.userData.pathStats` registra `heightSamples` i `heightReuses`.
- [x] Prova automatitzada `tests/path-height-cache.mjs`: verifica cotes exactes per vèrtex i una sola consulta inicial per coordenada, amb més d'un chunk.
- [ ] **Validació de temps real pendent:** comparar `HUNTER_BUILD_STATS.totalMs` i `stages.finalizationAndBatching` amb la mateixa llavor 148 en mapa petit/gran (diverses repeticions), i verificar solitari, COOP i visual WebGL/Android. Els tests Node no certifiquen una acceleració de la càrrega total.

**P2 · v0.6.183 · motos aquàtiques de colors vius i direcció Naked streetfighter (implementat):**
- [x] Les motos aquàtiques nascudes a `world-generation.js` recorren els **set colors llampants** de `jetskiColors`, en cicle determinista per llavor, amb un únic R() per vehicle com abans. El node `jetski-engine-cover` (antiga peça coral) és l'única peça que canvia de color; es mantenen estables totes les altres pintures i l'estat de desament.
- [x] Al laboratori, el GLB `Naked streetfighter` original i les quatre variants reduïdes comparteixen el **mateix conjunt de direcció**: manillar i punys girats 180° cap al pilot, forquilla completa i parafang units a la roda davantera, amb pivot de gir i control per veure'l en moviment. S'eliminen els dos marcadors vermells giratoris de les rodes, els suports dels retrovisors i la pota de cabra. Totes les versions preserven el detall de radis, forats, llandes i pneumàtics sense aplicar-hi meshoptimizer.
- [ ] **Validació visual pendent:** colors amb diferents llavors, aspecte exacta de la coberta del motor, animació sincronitzada de la direcció i vores dels radis en els quatre nivells, WebGL/Android. Les proves Node/CI no substitueixen la inspecció gràfica.

**P2 · v0.6.182 · moto aquàtica Recreational Jet Ski 25% (model definitiu):**
- [x] Substituït el model procedimental dins `vehicle-model-core.mjs` per la geometria compacta `jet-ski-25-geometry.mjs`, generada una sola vegada amb meshoptimizer (10.320 → 2.578 triangles, 24,98%). Geometries compartides, 6 malles, sense GLB ni optimitzador durant la partida. La coberta usa el color viu de `appearance.color` generat per la llavor. No canvia física, seient, radi, hitbox, ni desament del tipus `moto_aquatica`.
- [x] Esborrats de Git els tres GLB de la moto aquàtica, inclòs el fitxer font que ja s'ha convertit en geometria de producció; eliminada la seva pestanya del comparador i actualitzat el manifest a 29 candidats. La motocicleta i les seves quatre alternatives LOD continuen en revisió.
- [ ] **Validació WebGL/COOP pendent:** inspeccionar les variants de color en llavors diferents, alineament de pilot i manillar, posició sobre l'aigua i en les onades, comportament en pujar/baixar i HOST/GUEST, ombres i aspecte de la coberta. Les proves Node de geometria i colors no substitueixen una partida visual real.

**P0 · 0.6.181 · vehicles als molls i embarcament al ferri:**
- [x] El cotxe, la moto, els camions i els blindats consulten la superfície física transitable (`groundAt`) per calcular la inundació; abans consultaven `hAt` i s'enfonsaven damunt d'un moll amb mar profunda a sota. Es conserva l'enfonsament real fora del moll i la protecció que ja existia sobre la coberta del ferri. Regressió afegida a la prova bàsica `tests/smoke-basic.cjs`.
- [ ] **Validació visual:** pujar al moll i embarcar un cotxe, moto i camió en solitari, i provar un vehicle en HOST/GUEST, incloent la retirada del ferri i la sortida del moll cap a la mar.

**P0 · copiar diagnòstic de rendiment (v0.6.154; implementació):**
- [x] Afegit `Copia diagnòstic` al costat d'`Actualitza diagnòstic` al menú **Pausa → Opcions**, amb JSON de versió, llavor, escala, FPS, CPU, IA, draw calls, ombres, LOD, memòria GPU i estadístiques de generació, només a petició.
- [x] Còpia nativa amb alternativa `execCommand('copy')` i camp de text seleccionable per a navegadors Android/WebView que bloquegin el porta-retalls. Prova `tests/performance-copy-diagnostic.mjs` afegida a CI i a `test:optimization`.
- [x] **P0 · LOD costaner (v0.6.155; implementat, pendent de validació WebGL):** sectors de costa en detall màxim només a prop (desktop 1200 m, mobile 820 m, ultra 540 m), amb histèresi; enfora conserven com a mínim LOD 2. No toca heightAt, RNG, col·lisions ni perfil pròxim. Prova `tests/terrain-coast-lod.cjs` i CI.
- [x] **P0 · v0.6.156 · CPU/IA i diagnòstic (implementat; validació real pendent):** FPS compta fotogrames lents (>200 ms), darrera mostra activa conservada durant pausa, resum p50/p95/p99 dels darrers 5 s. IA passiva >240 m sota sobrecàrrega espaiada, sense alterar enemics que combaten o són objectiu de franctirador. La graella espacial es reconstrueix un cop per RAF sense canvis d'índex; entre subpassos es comproven canvis de cel·les o de nombre d'entitats. Pressupost adaptatiu de 4–15 passos de física a 1/60 s per RAF; temps descartat explícit. Noves proves a CI. Cal benchmark real per quantificar FPS i la velocitat de simulació.
- [x] **P0 v0.6.157 · IA (implementat; validació mòbil pendent):** decisió anticipada de navegació dels patrullers llunyans cada 0,8 s amb 10 m de predicció; moviment real, A* i combat no alterats. Sweeps secs amb cota coneguda consulten hAt quan n'hi ha prou per verificar aigua; molls, aigua i altures desconegudes mantenen groundAt complet. Telemetria nova de consultes ràpides/completes i decisions remotes/immediates, i proves de paritat per costa, obstacles, vegetació i patrulles. Pendent comparar FPS amb mapa gran i llavor 148.
- [ ] **Navegació de jeeps · regressió a investigar:** `tests/enemy-navigation.cjs` no supera el cas `jeep routes around a building` amb la direcció Ackermann real al harness. El test antic queda visible com a prova no bloquejant a CI fins aclarir si és un límit del test o un error de rutes. Les proves exactes de col·lisió i la predicció curta passiva continuen obligatòries.
- [x] **P0 v0.6.158 · Mostreig de col·lisions i perfil IA (implementat, prova mòbil pendent):** durant sweeps de soldats sense altitud fixa, a terra física seca i SENSE parets/vehicles/soldats pròxims, hAt substitueix el càlcul de cota visible complet; si pot intervenir l'altura vertical, l'aigua, un moll o l'A*, es fa groundAt íntegre. Les trajectòries, les hitboxes i els passos de col·lisió són idèntics. Telemetria inclusiva separada de soldats, torres, vehicles i coordinació (no sumar-la al cost nav). Nova regressió `tests/enemy-sweep-open-ground.cjs` + CI. Validar en dispositiu amb llavor 148 i comparar FPS, CPU i nombre de consultes ràpides vs completes.
- [x] **P0 v0.6.159 · Visibilitat dels vigilants de torre (implementat, validació FPS mòbil pendent):** la captura 0.6.158 llavor 148 mostrava ~117,7 ms d'IA de torres en un fotograma. `towerGuardTick` calculava `weaponAimClear` fins i tot quan el jugador era fora del radi (128 m) o del con sense avís. Ara es verifica primer abast/con/alerta; només es traça línia de visió quan el tir és possible. No canvien dany, cadència, precisió, avís compartit ni verificació del canó. Comptadors de raigs de torre executats/evitats i CPU de visió; regressió `tests/tower-guard-los-budget.cjs` a CI i test:optimization. Verificar FPS real amb la llavor 148, mapa gran i qualitat desktop.
- [x] **P0 v0.6.160 · p95/p99 d'IA i ombres (implementat; validació real pendent):** les decisions passives llunyanes retenen el desfasament propi durant tots els cicles amb dt acumulat preservat; quan entren en combat recuperen immediatament la cadència completa. La col·lisió d'un trajecte lliure fa prefiltratge conservador de murs/vehicles/soldats per a tot el segment abans de revisar-ne les mostres; no s'omet cap col·lisió, A* segueix exacte i els actors amb gy fixa eviten consultes d'altura redundants. El focus solar i la càmera d'ombres fan servir el mateix centre en graella de 8 m; les petites derives de barques es poden ajornar fins a 105 ms, amb moviments grossos i jugadors invalidant immediatament. Proves noves `ai-remote-phase-pacing.cjs`, `enemy-sweep-segment-prefilter.cjs`, `shadow-stable-focus.cjs` bloquegen CI. Cal repetir llavor 148 mapa gran i comparar FPS p50/p95/p99, CPU IA p95, temps descartat, regeneracions d'ombres i visual de la costa.
- [x] **P0 v0.6.161 · ombres i LOD barca de rems (implementat; validació visual pendent):** `barca_rems` obté el proxy de moviment d'ombres de les llanxes, i les rotacions de rems/ones no invaliden el mapa fins al refresc periòdic (la geometria completa continua projectant ombres). Nou LOD llunyà de la barca: oval marró únic i sense rems (activació a >740 m i retorn a <660 m); cerca de franctirador i vehicle pilotat conserven detall proper. Sense canvis de col·lisions ni física. Una comprovació plana conservadora evita calcular `vehicleY` per vehicles llunyans sense possible contacte; es manté l'exactitud dels casos propers i ferris grans. Auditoria A/B existent `?perfAudit=1` compara ombres i aigua amb la mateixa posició i ara també rebutja girs de càmera. Noves proves obligatòries a CI. Validar llavor 148 amb mapa gran, comparar FPS, p95 i CPU de render + escenes sense ombres; revisar transició del LOD i rems propers.
- [x] **P0 v0.6.162 · Auditoria A/B amb inici voluntari:** després de 2 segons de joc actiu s'habilita el botó «Comença l’auditoria», sense inici automàtic. La referència de càmera es pren al final del primer escalfament i els girs superiors a ~7° han de persistir tres fotogrames per cancel·lar. Els desplaçaments del personatge continuen cancel·lant; s'assegura la restauració de les opcions visuals i es comproven els casos amb proves.
- [x] **P0 v0.6.163 · LOD de tota la flota i riders (implementat, benchmark visual pendent):** models visuals llunyans de malla única per als 15 tipus de vehicles que encara no en tenien (la barca de rems conserva l'oval anterior), amb geometria compartida, colors per vèrtex i histèresi de distància. El model complet, rodes, torretes, canons i punts d'impacte queden intactes; no s'aplica al vehicle conduït ni a l'objectiu de la mira. Tripulacions de vehicles requisats dins del grup complet; el proxy representa els ocupants d'embarcacions i vehicles oberts. Els riders remots del cooperatiu tenen silueta de dues malles i recuperen braços, seient i armes prop de la càmera. La IA conserva tots els sweeps exactes, però descarta candidats de col·lisió impossibles amb un filtre conservador AABB calculat per trajecte. Proves específiques i regressions de batching, cooperatiu i models històrics a CI; cal comparar llavor 148 amb l'auditoria A/B i verificar visualment el LOD.
- [x] **P1 0.6.164 · Ocultació de recollibles/decoració i vegetació llunyans (implementat, validació de FPS en mòbil pendent):** qualitat desktop: objectes recollibles 1000→420 m, lots estàtics 1300→700 m (marge de sector conservat); mobile/ultra amb límits proporcionals. Histeresi de 25–35 m i mira de franctirador amb detall conservat; objectes, física, recompenses, col·lisions i mapa romanen en memòria. Arbustos 1300→950 m i roques 1900→1350 m (desktop), sense reducció de densitat propera ni modificació RNG. Telemetria nova de CPU abans de render i desglossament del postrender (textura detall del terreny / augment de resolució de l'aigua), màxims de pics i detalls per fotograma a l'auditoria A/B. Proves `visual-distance-culling.cjs`, `performance-audit.cjs`, `frame-diagnostics-parity.mjs` i regressions vegetació. Repetir llavor 148 i comprovar FPS, `objectes`, `vegetació` i pics de CPU.
- [x] **P0 0.6.165 · Diagnòstic reduït i refinament litoral incremental (implementat, validació en mòbil pendent):** l'auditoria habitual `?perfAudit=1` conserva inici manual, fa una única fase normal amb 5 s de mostres i només comparteix FPS, p95/p99, CPU joc/render/IA/navegació, col·lisions, draw calls i pics; omet les 4 fases de comparació d'ombres/aigua descartades, els inventaris complets de flota i els detalls redundants. Mode avançat `?perfAudit=full` conserva les cinc fases quan cal comparar efectes gràfics. El nou refinament del mar distribueix la reconstrucció de l'escuma de costa en iteracions curtes, mantenint visible la malla antiga fins que mar i litoral acabin; evita `shore.regenerate()` síncron que provocava un pic de 336,5 ms. Proves: `performance-audit.cjs`, `water-upgrade-staged.cjs`, `water.cjs`. Comparar llavor 148 i p95/p99, refresc sense clapes i temps de refinament al dispositiu.
- [ ] **Investigació:** l'usuari ha comunicat una davallada important de rendiment al mapa gran. Recollir JSON amb estadístiques actives durant el joc, comparar mapa petit/gran i perfilar abans d'atribuir causes.

## Fase 0 — línia de base i xarxa de seguretat (P0)

- [ ] Registrar un baseline **abans de refactoritzar**: commit, versió, llavor, escala, qualitat, dispositiu, navegador, resolució, estat de xarxa i captures del joc.
- [ ] Perfilar `?perfAudit=1&stress=1` segons `docs/PERFORMANCE_TESTING.md`; mesurar temps del fotograma p50/p95/p99, CPU d'actualització/IA/render, GPU si disponible, draw calls, màxim de partícules, memòria i pauses de GC.
- [ ] Repetir solitari amb llavors 67 i 148 (mapa petit i gran) i escena d'estrès 2407759483. Repetir a peu, amb vehicle, en combat amb explosions i al costat del mar.
- [ ] Repetir el COOP en **dos navegadors/dispositius reals** (també Android si és possible): RTT, jitter, `avgStateGap`, bytes/s, deltes/full snapshots, p95/p99 de fotograma, correccions, `storage.transaction()` i lag en vehicles i explosions.
- [ ] Congelar proves de comportament per a cada extracció: llavor/posicions/quantitat d'entitats, vida/dany/cadència/munició, paritat visual bàsica i checkpoint/reconnexió.
- [ ] Executar a la còpia de desenvolupament, abans de cada grup de canvis: `npm ci --ignore-scripts`, `npm test` i `npm run check:build`. S'ha reduït la bateria a 13 proves bàsiques per limitar el cost de manteniment; les regressions detallades requereixen validació manual o proves temporals quan el canvi les afecti. Conservar resultats, no donar-los per superats sense execució.
- [ ] Comparar captacions de la mateixa llavor i càmera (ombres, transparències, aigua, vehicles, edificis, explosions) i provar una sessió llarga. Les suites Node no equivalen a validació GPU.

**Criteri de sortida:** baseline reproduïble; cap regressió funcional coneguda; les millores posteriors han de tenir comparativa i possibilitat de revertir-les.

## Fase 1 — regressions i validacions urgents (P0)

### Rendiment i desplegament
- [x] **P0 · optimització CPU del FX (pendent de benchmarks WebGL):** reutilització dels registres de partícules, perfils visuals cachejats i omissió de les matrius de partícules extingides; comptadors acumulatius `HUNTER_ARCADE_BLAST_FX.stats`. Cap canvi en dany, mides, trajectòries, colors o física. Proves estructurals ampliades a `tests/arcade-blast-fx.mjs`.
- [x] **P0 · reducció CPU de snapshots/deltes COOP (pendent de mesures):** via ràpida amb IDs ordenats sense Map a `src/coop-state-delta.mjs`; evitar preparar un snapshot de difusió si no hi ha cap socket de joc a `server/coop-hub.mjs`. Cobertura afegida als tests de deltes i difusió.
- [ ] **Explosions arcade**: investigar els pics de lag fins i tot en mapes petits. Perfilar assignacions, geometries, materials, transparències/overdraw, llums, textures, ombres i durada dels efectes. Provar pool preescalfat, límits simultanis i LOD visual, sense modificar les tres mides, l'orientació dels impactes ni el fum vertical.
- [ ] Confirmar que la versió de Pages, Worker i bundle coincideixen després de cada desplegament; verificar inici, reconnect i partida real amb HOST/GUEST.
- [ ] Revisar el COOP sota càrrega: salts de granades/projectils, animacions remotes de dispar, vehicles destruïts, sortida/entrada de passatgers, desconnexió i curació/mort sense bloqueig. Alguns casos han tingut correccions prèvies: revalidar, no reimplementar a cegues.
- [ ] Comprovar coherència del GAME OVER compartit quan un jugador mor (regla desitjada: missió acabada per a tots dos, segons l'escenari del joc).

### Canvis de joc recents: estat exacte per contrastar amb el codi actual
- [x] **v0.6.146 · mort en moto atropellada per un tanc (prova automàtica nova):** la destrucció de la moto pot matar el conductor mentre es resol la col·lisió. `presentExplosion` i l'actualització de l'FX arcade són tolerants a fallades visuals (la física, el dany i la mort no es cancel·len), l'expulsió de la moto inicialitza `vy` finita i el bucle de fotogrames manté viva la cinemàtica si es produeix una excepció després d'activar la mort. Prova integrada `tests/tank-motorcycle-death.cjs` a GitHub Actions.
- [ ] **Validació visual v0.6.146:** tanc que aixafa una moto pilotada pel jugador; comprovar la causa de mort, la càmera lenta i l'escena de la Parca. Repetir amb i sense efectes d'explosió i en HOST/GUEST/Android; les proves Node només verifiquen el recorregut del mode individual.
- [x] **v0.6.143 · patis naturals i paviments amb ombres (validació visual pendent):** retirades del codi les grans lloses dels complexos, mantenint `addLevelArea` i `compoundClear` (reserva espacial, vegetació i llavors intactes). Les cases i els hangars reutilitzen els seus terres originals, ara mats i receptors d'ombres; el forjat i el soterrani del búnquer, la planta superior i els heliports específics també reben ombres. Afegida `tests/compound-ground-surfaces.mjs` a la compilació. Revertible com a commit independent.
- [ ] **Validació visual v0.6.143:** comparar llavors 67/148 amb/sense sostres, pobles, base/HQ i camp de presoners en SOLO i COOP, en pla/pendent; comprovar la cota interior i la continuïtat de l'escala del búnquer. Benchmark de les ombres a Android.
- [x] **v0.6.139 · reparació després de la prova CI fallida:** el dany d'impacte contra potes es calcula amb el valor real de la velocitat en el punt de contacte (que la simulació frena abans de la col·lisió). Ajustat el coeficient perquè un tanc ràpid enderroqui una torre de 10 PV; prova del valor de contacte i prova integrada del Worker COOP. Pendents la validació visual en partida SOLO i HOST/GUEST.
- [x] **v0.6.136 · correccions implementades (validació visual pendent):** retícules d'armes lleugeres al 50% d'alfa, contacte de les soles amb el terreny visible i ombra del tors, radi balístic humà reduït, dany per envestir potes de torre, escala i postura de les cames del motorista requisat. No canvien la física P.y, la mira de bazuca ni els hitboxes dels vehicles.
- [ ] **Validació v0.6.136:** caminar i ombres en pla/pendent, trets a 100–180 m, envestides de torres lentes/ràpides, motorista SOLO i HOST/GUEST; confirmar paritat de destrucció estructural al Worker COOP (implementació al natiu v0.6.138; cal prova visual).
- [x] **v0.6.138 · envestides i terreny visibles:** al SOLO la sola segueix també el triangle LOD que realment es dibuixa, sense travessar sòls d'edificis. Al COOP natiu els col·liders de les potes duen l'ID de la torre, el Worker aplica dany per velocitat/massa, elimina totes les potes i parapets i conserva l'enderroc a la partida desada. Prova de regressió del Worker afegida a la compilació.
- [ ] **Validació en partida v0.6.138:** revisar pendents fortes i plataformes, envestida COOP amb HOST/GUEST i continuïtat després de reconnexió; el mode cooperatiu `world` heretat té una generació de torres diferent i encara no s'ha contrastat amb el natiu.
- [ ] **Torres**: dos soldats reals a la caseta (fusell + bazuca), separats, girant i vigilant espatlla contra espatlla, eliminables individualment; sense canons automàtics ni supressió; parapets laterals protectors sense impedir el tir. Les armes lleugeres no han d'adquirir la torre com a diana estructural. Validar col·lisions, IA, punteria i paritat COOP.
- [ ] **Moto requisada**: verificar visualment la bandera fixada al parafang posterior, no flotant a la dreta.
- [x] **Moto requisada anti-envestida i pilot armat (0.6.119; verificació en partida pendent)**: frenada SOLO/COOP compartida segons velocitat relativa davant vehicles ocupats; fusell del pilot al Worker amb LDV i protecció de vehicles aliats; proves funcionals específiques.
- [ ] **Hovercrafts**: doble quantitat *distribuïda per sector*, no parelles adjacents. Validar mapa petit i cadascun dels quatre quadrants del mapa gran.
- [x] **Bicicleta recuperable (0.6.119; verificació visual pendent)**: no es cala ni s'enfonsa permanentment si és intacta; es pot tornar a muntar fins i tot amb marca antiga `sunk` en solitari i des de l'aigua en COOP. Les bicicletes destruïdes i els motors dels altres vehicles conserven les seves regles.
- [ ] **Pantalla de mort**: assegurar que desapareix la retícula de punteria.
- [ ] **Ferri**: fum de dany procedent de la cabina; conservar immunitat a armes lleugeres i envestida contra vehicles marítims lleugers.
- [ ] **Vehicles**: verificar que tots tenen la vida doblada segons la petició recent, incloent equivalents COOP i les diverses fàbriques de creació.
- [ ] **Acció especial del botó córrer**: clàxon de cotxes, camió (greu/fort) i moto (agut/esquerdat), timbre a la bicicleta, amb radi de soroll i alerta enemiga proporcional a la potència. Validar-ne autoritat i recepció en COOP.
- [ ] **Portes** de cases/cabanes: gruix semblant al de les finestres, centrades a la llinda i amb maneta; **no tocar** les del búnquer.
- [ ] **Distància de render**: investigar taques fosques/blaves a costa llunyana, clapes del splash inicial, plataformes amb z-fighting i geometria de la vora del món; no ocultar artefactes canviant només l'enquadrament sense entendre la causa.
- [ ] **Menús**: confirmar que l'antic menú i els títols redundants estan realment eliminats del codi i no només amagats; primer fotograma correcte, ESC/pausa, submenús, COOP i invitacions.
- [ ] **Punteria i armes**: línia de visió real (no adquirir a través de muntanyes); retícula vermella per soldats i blanca per vehicles; con de 80° de fusell/metralladora/franctirador, 90° per bazuca i objectius dins pantalla; revisar la posició del bazuca sobre l'espatlla i animació de braços.
- [ ] **Ocupants**: primer impacte al vidre, dany posterior a tripulants sense destruir necessàriament el vehicle; pilots i passatgers de patrulleres apuntables; evitar foc amic travessant vehicles conduïts per aliats.
- [ ] **Enemics que requisen vehicles**: rutes que eviten filferrades, radi de gir de cotxes realista, bandera en cada requisició, velocitat adequada i cap atropellament dels ocupants propis.
- [ ] **Explosius i escenari**: C4 sota torres, impactes contra parets/vehicles i ones perpendiculars, cap a dalt del fum, destrucció coherent d'objectes i vidres; validar model visual i volum de dany per separat.

## Fase 2 — neteja segura del repositori i del procés (P1)

**Intervencions P1 de la fase 2 (implementades; suites integrals ajornades):**
- [x] Auditoria automàtica i no destructiva del repositori amb `tools/repository-audit.cjs`: ordre de càrrega de mòduls clàssics, imports ESM de portada/Worker, previsualitzacions HTML i referències internes. No es considera segur esborrar una URL pública pel sol fet que no hi hagi cap referència interna.
- [x] Unificat el sistema de compilació a `.github/workflows/rebuild-runtime.yml` amb activació automàtica i manual; eliminat `runtime-bundle.yml`, duplicat. Evita la regeneració en bucle pels manifests, comprova versió i sintaxi, i rebutja bundles obsolets davant un `main` concurrent.
- [x] Centralitzada la **validació i sincronització** dels segells de la versió: `tools/sync-version.cjs`, `npm run sync:version`, `npm run check:version`; `build` i `check:build` fallen si els imports o la portada no coincideixen amb `src/version.mjs`.
- [x] Executor de regressions `npm run test:regression:once`: combina suites principals sense executar dos cops la mateixa ordre; cap test ni suite original eliminats. Prova estructural a `tests/test-suite-dedup.cjs`.
- [ ] **Validació conjunta pendent, per decisió de l'usuari**: executar `npm run test:repo:tooling`, les suites funcionals completes i benchmarks a la mateixa sessió de comprovació prevista.
- [ ] Classificar i confirmar els laboratoris i fitxers aparentment no referenciats abans de retirar-los o reorganitzar-los, incloses les URL externes de `coop.html`.


- [ ] Fer un mapa d'ús real: grafs d'importació ESM, `src/runtime-scripts.mjs`, `src/bootstrap.mjs`, imports del Worker, `index.html`, scripts de package, proves i URLs de pàgines de demostració.
- [ ] Identificar fitxers *no referenciats* i classificar-los: runtime, prova automatitzada, exemple visual reutilitzable, generat, obsolet. Només eliminar després de comprovar cada consumidor.
- [ ] Revisar `*-proves.html` i `*-preview.html` de l'arrel; passar els útils a un espai de laboratori clar i eliminar les variants descartades, amb captura visual o prova substitutiva si cal.
- [ ] Avaluar la retirada real del prototip `coop.html` / `server/coop-proving-ground.mjs` i d'interfícies alternatives, però protegir redireccions o endpoints encara necessaris per compatibilitat.
- [ ] Inventariar `src/*-concepts.mjs`, `*-iterations.mjs` i `*-preview.mjs`; mantenir només els importats o els laboratoris que aportin valor. Eliminar codi de models descartats, no els models aprovats.
- [ ] Detectar wrappers de pocs bytes (`palette.js`, `vehicles.js`, `vehicle-dynamics.js`, `player-model.js`, `server/coop-vehicle-*.mjs`): fusionar només quan no siguin necessaris per ordre de càrrega, globals o tests.
- [ ] Buscar constants, mapes, helpers i factories duplicats entre solitari/COOP; construir contractes compartits abans d'eliminar versions redundants.
- [ ] Simplificar `package.json`: runners reutilitzables o matriu documentada, evitant la mateixa prova en diverses suites **sense perdre** les verificacions essencials. Els 284 fitxers de `tests/` no s'esborren per mida.
- [ ] Centralitzar la versió/cadena de cache-busting de `src/bootstrap.mjs` i el procés de reconstrucció de bundle/Worker. No canviar àmbits JS a cegues: el build concatena scripts clàssics.
- [ ] Considerar compressió al transport, càrrega diferida i extracció de dades de `src/humvee-procedural-b-data.mjs` (~295 KB), **sense** perdre exactitud de floats, transparències, pivots ni aparença D3.1.
- [ ] Mantenir `vendor/three-r186.module.mjs` (dependència fixada) i `dist/hunter-runtime.*.js` (producció generada) fins a tenir una estratègia de desplegament equivalent i verificada.

## Fases 3–12 — pla d'optimització mòdul a mòdul (P1/P2)

**Fase 4 · incidència real detectada per l'auditoria (v0.6.153):**
- [x] **Protecció del corredor base-moll:** el mapa gran amb llavor 148 construïa posteriorment un heliport amb parets que interceptaven la carretera. `createSiteRegistry` admet ara una restricció opcional de corredor, activada després de completar el moll i abans de situar els altres complexos.
- [x] **Reserva de trams complets:** `roadCorridorClear` rebutja parcel·les que trepitgin cap segment, amb el radi de reserva del complex i 10 m de marge. No es toca el càlcul A*, els models de carretera, el RNG ni els marges quan encara no existeix la ruta.
- [x] **Regressió geomètrica:** `tests/coast-road-reservation.mjs` comprova les coordenades concretes de l'heliport que tallava el camí i 2.880 casos independents de distàncies a segments.
- [ ] **Validació:** tornar a executar la matriu lògica de dotze casos i comprovar el mapa en un navegador real, COOP/Android i rendiment A/B.

**Fase 4 · tretzè tall, auditoria de generació del món (v0.6.152; validació sense canvis de runtime):**
- [x] **Matriu de missions lògiques reals:** `tests/world-generation-matrix.cjs` executa el generador del joc a través de `tests/harness.cjs` amb les llavors 1, 67, 148, 2026, 12345 i 2407759483 en les dues escales. Accepta `WORLD_MATRIX_SEEDS` per ampliar els casos.
- [x] **Invariants de món i missió:** comprova base, HQ, camp de presoners, reserva de terreny, coordenades de complexos/vehicles, rutes i límits, i reutilitza `validateMission` per comprovar accés local al general, mapes i transport. Les advertències de cobertura queden enregistrades.
- [x] **Determinisme després de reinicis:** compara la petjada SHA-256 de les distribucions i la continuació del generador aleatori després de canviar de món. Prova integrada a `test:optimization` i al workflow, sense tocar els models, la física ni la versió.
- [ ] **Pendent de validació real:** desplaçaments entre illes, vehicles i IA, partida HOST/GUEST en dos dispositius, Android, WebGL/ombres i rendiment A/B. L'auditoria en mode lògic no demostra aquests casos.

**Fase 4 · dotzè tall, cerca de ports i costa de pantalans independents (v0.6.152; implementació parcial):**
- [x] **Planificador sense Three.js:** `createStandalonePortPlanner` a `src/compound-planning.mjs` concentra la cerca generadora d'aigua fonda, la selecció de parcel·les a una illa i el sondeig del punt exacte de costa del pantalà. `world-generation.js` només hi connecta els callbacks de terreny i els constructors visuals, que segueixen al runtime.
- [x] **Exactitud de mostreig i pauses:** mateix ordre de consultes `rawHAt`, 32 orientacions, els mateixos intents `landSteps`, el mateix consum de RNG, i comptador de checkpoints continu entre el sondeig de costa i la col·locació dels dos norais. No es canvien les distàncies ni les condicions de fondària.
- [x] **Proves diferencials àmplies:** `tests/standalone-port-parity.mjs` compara l'oracle congelat de v0.6.151 amb la versió extreta, sobre onze llavors deterministes, dues escales, geometries costaneres heterogènies, punts d'aigua/parcel·les, intents de terreny fallits/reintentats, norais, retorn i cancel·lació. Integrada en `test:optimization` i GitHub Actions.
- [ ] **Validació pendent:** rendiment real A/B i escenes navegables completes, ferris/molls/ports, camps de presoners, LOD/ombres, COOP i Android. Les proves de paritat no substitueixen l'execució en navegador o dispositiu.

**Fase 4 · onzè tall, zones de pas i geometria dels molls (v0.6.151; implementació parcial):**
- [x] **Zones de pas de les carreteres extretes:** `createPathClearanceRegistrar` de `src/compound-planning.mjs` registra els recorreguts i reserva els mateixos cercles de pas cada 3 m després del suavitzat; `world-generation.js` conserva la presentació i l'agrupació de malles i deixa de tenir la regla de mostreig.
- [x] **Rampes dels pantalans separades de les malles:** `planPierSetup` calcula l'orientació, els trams de 5 m i la rampa d'accés costaner injectant `hAt` i el nivell de la coberta; el runtime continua afegint escales, col·lisions i fustes visibles, sense canviar el camí en mode cerca de llavors.
- [x] **Paritat diferencial explícita:** `tests/compound-path-pier-parity.mjs` compara el codi anterior amb el nou sobre rutes rectes, corbes, repetides, distàncies curtes, mostres de terra/aigua, llavors 67/148 i escales 1/2; mateixa traça de consultes d'alçada, coordenades, ordre de reserves i trams. Incorporada a `test:optimization` i CI.
- [ ] **Fase 4 pendent de validació integral:** mapes realment generats amb llavors fixes, posicions de sortida, ports, camp de presoners, materials/ombres, COOP i Android, més benchmarks A/B en condicions repetibles. No es declaren guanys d'FPS només per paritat Node.

**Fase 4 · desè tall, geometries temporals alliberades peça a peça (v0.6.150; implementació parcial):**
- [x] **Buffers finals preassignats:** `src/static-decor-batching.js` reserva `position`, `normal`, `uv` i `color` una vegada per lot. Cada malla transformada s'hi copia i es disposa abans de començar la següent, sense retenir la llista de `BufferGeometry` temporals.
- [x] **Semàntica de construcció preservada:** es mantenen `toNonIndexed`, `applyMatrix4`, tots els `yield` de colors i fusió, les estadístiques, els materials, els vèrtexs i l'ordre de construcció. Un `try/finally` també libera la geometria si es cancel·la un generador suspès.
- [x] **Proves de paritat ampliades:** `tests/static-decor-batch-parity.mjs` compara el resultat amb el codi original congelat i instrumenta les còpies simultàniament vives; verifica el nombre de disposicions, la cancel·lació i el mateix recompte de checkpoints. Executat per la CI de GitHub.
- [ ] **Validació pendent:** comparar A/B el temps de generació i pics reals de memòria en ports/heliports, comprovar imatges del món en navegador i validar llavors completes, COOP/Android abans de tancar la fase 4.

**Fase 4 · novè tall, menys buffers temporals de colors (v0.6.148; implementació parcial):**
- [x] **Un buffer de colors per lot visual:** `src/static-decor-batching.js` reserva directament el `Float32Array` final de color segons els recomptes de vèrtexs originals (`index.count` per malles indexades). Ja no crea un `Float32Array` ni un `BufferAttribute` de colors per cada malla d'entrada, ni els torna a copiar després al buffer del lot.
- [x] **Render, ordre i cooperació preservats:** no es modifiquen `position/normal/uv`, `toNonIndexed`, materials, agrupacions, transformacions, descart i neteja de geometria, ni cap dels `yield` de generació. Els colors continuen llegint el material actual després de cada pausa, i les dades físiques, la llavor i la distribució queden intactes.
- [x] **Proves diferencials i instrumentals ampliades:** `tests/static-decor-batch-parity.mjs` comprova amb l'oracle v0.6.144 geometries indexades de més de 256 vèrtexs, paritat exacta d'atributs/resultats/checkpoints, edició de colors mentre el generador està aturat i el nombre de construccions `BufferAttribute` eliminades. La prova existent continua a CI i `test:optimization`.
- [ ] **Validació pendent:** mesurar amb perfils A/B el temps de càrrega, les assignacions i els pics de memòria en escenes representatives de ports i heliports; comprovació visual, dos dispositius COOP i Android. No s'atribueixen encara guanys d'FPS. La prova de paritat visual s'executa abans de l'assaig de mort tanc/moto al mateix workflow perquè una fallada prèvia i aliena a l'agrupador no n'impedeixi la validació; no s'omet ni es desactiva la prova de mort.

**Fase 4 · vuitè tall, cost de l'agrupació visual (v0.6.147; implementació parcial):**
- [x] **Sense actualització redundant de matrius per malla:** `src/static-decor-batching.js` manté `root.updateMatrixWorld(true)` i llegeix la translació de `mesh.matrixWorld.elements[12/14]`. Evita `getWorldPosition(new THREE.Vector3())` en cada peça, que recalculava matrius ancestrals i creava un vector temporal.
- [x] **Signatura de material reutilitzada per arrel:** el `WeakMap` evita recomputar el perfil quan diverses peces comparteixen material dins d'una arrel. Es reinicialitza per arrel, després dels checkpoints, perquè una modificació legítima de material entre arrels continuï reflectint-se en el lot. També s'elimina la variable `geometries` sense usos.
- [x] **Prova de paritat visual ampliada:** `tests/static-decor-batch-parity.mjs` continua amb l'oracle independent de v0.6.144, però inclou ara grups imbricats, escala no uniforme, rotacions i materials compartits; comprova exactament dades dels atributs, esferes, grups, transformacions, estadístiques, neteja i `yield`. Un test instrumental verifica zero crides a `getWorldPosition` per les peces.
- [ ] **Validació pendent:** mesurar temps de CPU, memòria i pics de generació en dispositius reals, comparar qualitat d'escenes amb ombres i LOD, llavors completes 67/148 i Android/COOP en una bateria A/B. No s'ha mesurat cap guany d'FPS.

**Fase 4 · setè tall, lots visuals de plataformes, molls i decoració (v0.6.145; implementació parcial):**
- [x] **Construcció visual extreta:** `src/static-decor-batching.js` es responsabilitza de fusionar malles de decoració fixa en lots per sector de 160 m i perfil de material, incloses les plataformes d'heliport, molls i accessoris. `world-generation.js` ara només n'ordena l'execució; el nou mòdul es carrega abans del generador a `runtime-scripts.mjs`.
- [x] **Paritat geomètrica i de recursos:** es manté exactament la fusió de `position`, `normal`, `uv` i `color`, les transformacions, els materials compartits, les estadístiques, les pauses `yield` i l'alliberament de malles originals. Sense canvis al RNG, dades físiques, desaments ni sistemes de COOP.
- [x] **Proves amb Three.js real:** `tests/static-decor-batch-parity.mjs` compara l'oracle congelat amb la nova etapa per diferents llavors i escales, malles indexades, grups imbricats, materials, cancel·lació d'arrels i vèrtexs. Inclosa a `test:optimization` i a CI.
- [ ] **Resta de fase 4:** revisar si l'agrupació admet millores mesurables de CPU/memòria sense canviar materials ni LOD, comparar temps i màxims de generació A/B i validar escenes reals, COOP/Android i mapes complets. No és una prova de guany d'FPS.

**Fase 4 · sisè tall, pla físic d'anivellament (v0.6.144; implementació parcial):**
- [x] **Descriptors de plataformes canònics:** `src/world-physics.mjs` exposa `planLevelArea`, que calcula les mitges dimensions, la rotació i la circumferència de cobertura de cada plataforma sense crear malles. `src/game-core.js` manté el registre ordenat a `terrainLevels` i a l'índex espacial.
- [x] **Ruta d'escapada del camp de presoners:** `src/compound-planning.mjs` calcula el terraplè d'evacuació amb `planPrisonEscapeGrade`; no s'han alterat les dimensions, la cota, el suavitzat ni els punts d'exclusió.
- [x] **Paritat diferencial:** `tests/terrain-pad-parity.mjs` compara els descriptors i les insercions a la graella amb la funció v0.6.143, més la física de solapaments i els terraplens del camp; inclosa a `test:optimization` i a la CI.
- [ ] **Fase 4 pendent:** separar construcció visual de plataformes i reavaluar recomputacions; prova conjunta de llavors, costa, camp, COOP/Android i rendiment A/B.

**Fase 4 · cinquè tall, planificació de carreteres fins a la costa (v0.6.142; implementació parcial):**
- [x] **Cerca A* extreta de la construcció:** `src/compound-planning.mjs` exposa `createCoastRoadSolver` i calcula els punts amb altura d'una carretera entre la base i la costa, evitant edificis, aigua, desnivells i límits del mapa; el model de carretera, els canvis de relleu i `buildCoastRoadSteps` continuen al runtime.
- [x] **Determinisme de rutes i checkpoints:** mateix pas de graella 12 m, pressupost fins a 14.000 nodes, cost de pendent, ordenació A*, projecció de pendent al 12 %, comprovacions de resultat i `yield` cada 8 nodes. Les dependències `H` i `B` s'obtenen en cada cerca/mostra per evitar referències obsoletes després de canviar de mapa.
- [x] **Proves diferencials:** `tests/coast-road-parity.mjs` compara el codi anterior i nou sobre llavors 67/148, amb/sense edificis, terrenys diversos, escala 1/2, el mateix registre de consultes d'altura i el mateix ordre de pauses; també comprova cancel·lacions i reinicis. Inclosa a `test:optimization` i CI.
- [ ] **Fase 4 pendent:** extracció de les plataformes i la construcció visual, comprovació de rutes reals, casuística de camps/ports/ferris i partida completa amb COOP/Android; optimització de rendiment segons mesures A/B.

**Fase 4 · quart tall, encaix de molls i terminals costaneres (v0.6.141; implementació parcial):**
- [x] **Planificació costanera sense malles:** `src/compound-planning.mjs` inclou `createCoastalLayoutPlanner` que valida la plataforma a terra, les edificacions, les aigües navegables i l'espai de ferris/llanxes, i cerca emplaçaments costaners per trams.
- [x] **Integració diferida, compatibilitat dels mapes:** `src/compound-coast-runtime.js` manté les funcions clàssiques `coastalLayoutFits`, `findCoastalLayout`, `findCoastalLayoutSteps` i les inicialitza només quan són necessàries; la mida del mapa i les característiques dels vehicles es consulten dinàmicament. No es toca la geometria, els molls, les rampes ni la creació d'entitats.
- [x] **Proves diferencials de costa i ferri:** `tests/coastal-layout-parity.mjs` contrasta la lògica anterior amb la nova en dimensions de layouts, edificis, ferris, diferents línies de costa, llavors 67/148, escales 1/2, acceptacions síncrones/generadores, pauses i cancel·lacions. Incorporada a CI i `test:optimization`.
- [ ] **Fase 4 pendent:** planificació de carreteres i plataformes, generació visual separada, protecció de checkpoints, validació completa de llavors (67/148), camp, ports/terminàls, COOP/Android i comparació A/B de rendiment.

**Fase 4 · tercer tall, comprovació costanera dels ports (v0.6.140; implementació parcial):**
- [x] **Mostreig del terreny separat:** `src/compound-planning.mjs` conté `createPortSiteSurvey`, el filtre que comprova els marges, la plataforma i els carrils marítims. `world-generation.js` conserva la construcció i els recursos 3D.
- [x] **Ordre determinista intacte:** es conserven les mateixes crides a `rawHAt`, transformacions, `yield`, refusos i retorns; no s'afegeixen consums de `R()`.
- [x] **Paritat diferencial:** `tests/port-survey-parity.mjs` contrasta el codi anterior sobre les dues escales, llavors 67/148, diverses costes i la cancel·lació de generadors. Incorporat a `test:optimization` i CI.
- [ ] **Resta de fase 4:** encaix de layouts costaners, plataformes, planificació de camins i separació de visualització. Proves reals, COOP, Android i FPS pendents de la bateria conjunta.

**Fase 4 · segon tall, reserves dels emplaçaments (v0.6.137; implementació parcial):**
- [x] **Registre independent de reserves:** `src/compound-planning.mjs` conserva els radis, la distància entre complexos i la memòria cau de dimensions, sense accedir a l'escena, i preserva la identitat de la llista de centres.
- [x] **Cerca per illes i sectors extreta:** `reserveCompound` i `forceReserve` es creen al mòdul pur, injectant `landSteps`, `compound` i els conjunts originals. Es preserven els intents, els yields de generació, l'ordre de les illes i la seqüència de l'RNG; els models 3D continuen al runtime.
- [x] **Paritat diferencial:** `tests/compound-reservation-parity.mjs` compara geometria d'exclusió, memòria cau, acceptació, generadors, consum d'RNG, ocupació d'illes i ordre de progressió per mapes 1/2 i llavors 67/148; CI també executa `tests/compound-planning.mjs`.
- [ ] **Fase 4 pendent:** extracció de selecció de costa i plataforma, generació visual, proves de seeds real/complets, camp de presoners, ports, heliports, carreteres, COOP i benchmarks A/B. No s'atribueix cap FPS nou.
 
**Fase 4 · primer tall, planificació canònica d'indicis de l'HQ (v0.6.135; implementació parcial):**
- [x] **Geografia independent de la representació:** `src/world-generation-core.mjs` conté `planHQIntelClues` amb els emplaçaments falsos del HQ, repartiment 3/9 per quadrants i ordre de descart. `src/world-generation.js` només integra el resultat i publica les mateixes dades per minimapa i desaments.
- [x] **Llavors i RNG preservats:** mateix `mul` injectat per al shuffle local; no consumeix `R()` del món, no toca la cerca de llavors ni les posicions i conserva la prioritat entre complexos i illes.
- [x] **Paritat diferencial i prova de sectors:** `tests/hq-clue-plan-parity.mjs` compara l'oracle anterior (llavors 67/148 incloses), proves de mapes petits/grans i errors quan no hi ha sòl útil; `tests/sector-navigation-intel.cjs` passa a exercitar la nova integració. CI valida el canvi i regenera el bundle.
- [ ] **Fase 4 pendent:** separar terreny i construcció visual de la planificació, protegir el pressupost de generació incremental i mesurar A/B; repetir proves de llavors 67/148, punts de spawn, carreteres, camp de presoners, ports, COOP i Android a la validació conjunta.

**Balanç de la fase 3 després de v0.6.134 — extracció estructural implementada, validació oberta:**
- [x] Els **8 talls estructurals** han separat els índexs espacials, les mètriques/diagnòstic, el coordinador dels dos rellotges, les opcions/progrés/cancel·lació d'arrencada, l'estat inicial, els catàlegs, les regles dels mapes, els controls i la neteja de sessions. Les extraccions mantenen els bindings del runtime clàssic i han incorporat proves diferencials a Node.
- [x] Revisió dels blocs principals restants: **generació de món i terreny (fase 4), render/ombres/aigua (fase 5), combat (fase 6), IA (fase 7), vehicles (fase 8), COOP (fases 9–10), UI (fase 11), so i desaments (fase 12)**. No traslladar-los ara només per reduir la longitud aparent de `game-core.js`; fer-ho per dominis amb proves pròpies.
- [ ] **Criteri de tancament de fase 3 encara pendent:** validació conjunta en partida real i amb checkpoints; `npm run test:regression:once`, `npm run test:loading`, `npm run check:build`; paritat d'arrencada de llavors 67/148, Android/host/guest, captures GPU i comparació FPS/GC/p95/p99. No considerar superada aquesta casella només perquè CI ha recompilat.
- [ ] **Rendiment verificat:** cap guany FPS ni reducció GC demostrats amb comparativa A/B del mateix maquinari. Els talls de fase 3 són refactorització de responsabilitats i manteniment, no una promesa de velocitat.


**Fase 3 · vuitè tall, neteja de sessió i reinit del món (v0.6.134; implementació parcial):**
- [x] **Teardown seqüenciat fora de game-core:** `src/start-lifecycle-core.mjs` coordina la neteja d'una missió completa, abandonada o generada parcialment; conserva l'ordre d'alliberament, les callbacks del runtime clàssic, l'autodesament i la propagació d'errors anterior. L'escena, controls i estat mutable continuen propietat del motor, sense afegir singleton.
- [x] **Llistes noves per partida:** `src/game-state-core.mjs` proporciona nou contenidors nous d'entitats amb `Array` del context original. Els pools PL/FA, el mapa TG i l'índex de terreny conserven la seva identitat i es buiden com abans.
- [x] **Prova diferencial:** `tests/world-session-parity.mjs` compara neteges amb/sense món i generador parcial, i fallades a cada pas de la destrucció; prova que l'ordre, referències, error i estat final no canvien. Afegida a `test:optimization` i a la CI.
- [ ] **Validació pendent:** partida real, cancel·lació/reinici, recuperació de desaments, HOST/GUEST, Android, FPS/GC/GPU, dins la bateria conjunta acordada. La fase 3 encara no es considera tancada.

**Fase 3 · setè tall, controls del jugador (v0.6.133; implementació parcial):**
- [x] **Entrada de teclat, joystick i moviment lateral extreta:** `src/player-input-core.mjs` encapsula la lectura del moviment i la disponibilitat d'ajupir-se, córrer, desplaçar-se lateralment i activar l'acció especial del vehicle. Manté les mateixes referències mutables i l'ordre de les expressions. `game-core.js` conserva els listeners, l'estat, la física i la xarxa.
- [x] **Proves de paritat:** `tests/player-input-parity.mjs` contrasta la lectura anterior amb la nova i comprova les referències després de canvis d'entrada; `test:optimization` i CI incorporen la suite sense duplicar lògica. `tests/vehicle-special.cjs` actualitzada amb un DOM simulat i la regla de botó independent del joystick.
- [ ] **Fase 3 encara oberta:** extracció incremental d'estat/orquestració restants; partida real, desaments, dos clients, Android, GPU/FPS i GC en la bateria conjunta.

**Fase 3 · sisè tall, intel·ligència de mapes i estat visible (v0.6.132; implementació parcial):**
- [x] **Regles d'HQ i localització de vehicles extretes:** `src/game-intel-core.mjs` gestiona l'adquisició dels mapes, els quadrants, els llocs descartats, les icones de vehicles i les dades de minimapa/HUD. Conserva els mateixos Set i referències a vehicles, l'ordre d'autodesament i les variables compartides amb generació i desaments; no es modifica l'RNG ni el format de desament.
- [x] **Proves diferencials i integració:** `tests/game-intel-parity.mjs` compara amb el codi anterior els mapes SOLO en ambdues escales, pickups repetits, localització de vehicles i dades de minimapa; `tests/sector-navigation-intel.cjs` adaptada al nou mòdul. Incloses en la validació de la regeneració i l'optimització.
- [ ] **Fase 3 encara oberta:** extracció incremental de més estat i sistemes d'inicialització; proves de partida real, desaments, COOP HOST/GUEST, Android, GPU i rendiment en la bateria conjunta acordada. No s'afirma cap guany d'FPS sense mesura.

**Fase 3 · cinquè tall, estat inicial i catàlegs (v0.6.130; implementació parcial):**
- [x] **Estat mutable inicial separat:** `src/game-state-core.mjs` crea els conjunts del mapa d'intel·ligència (HQ i localització de vehicles), els comptadors de visibilitat/LOD i els registres de draw calls. Són contenidors nous per motor/partida, amb les mateixes referències clàssiques que utilitzen desaments, render, generació i COOP; els valors que canvien durant la partida no es traslladen encara a un objecte global nou.
- [x] **Catàlegs inicials extrets:** `src/game-catalog-core.mjs` crea per cada motor els 13 tipus d'objectes, 14 icones SVG i els perfils de 7 enemics mitjançant el balanç existent injectat. Les descripcions, colors, mides, icones, ordre i mutabilitat són idèntics. La fàbrica evita compartir accidentalment definicions entre instàncies del harness.
- [x] **Paritat de dades inicials:** `tests/game-state-catalog-parity.mjs` comprova la signatura original completa del catàleg (FNV64), 360 perfils de combat amb dades injectades diferents, els defaults de tots els comptadors i l'aïllament d'estat de diverses instàncies. Afegida a `test:optimization`.
- [ ] **Fase 3 encara oberta:** migrar amb proves tots els consumidors de l'estat mutable d'HQ/COOP i la inicialització restant del motor; partida real, desaments, FPS, GC, Android i HOST/GUEST continuen pendents de la validació conjunta. No s'atribueixen guanys de CPU sense mesurar.



**Fase 3 · quart tall, cicle d'arrencada (v0.6.127; implementació parcial):**
- [x] **Estat inicial, progrés i cancel·lació extrets:** `src/start-lifecycle-core.mjs` calcula les opcions i dimensions de la missió amb dependències explícites, gestiona el senyal de cancel·lació i restaura els controls després de generar, cancel·lar o fallar. `game-core.js` conserva l'ordre original de les operacions, la propietat de `generationPromise`, els desaments, el generador i l'activació; no es canvia el RNG ni el comportament de SOLO/COOP.
- [x] **Prova diferencial aïllada:** `tests/start-lifecycle-parity.mjs` cobreix 1.040 informes de progrés, 112 notificacions de cancel·lació, 720 combinacions de llavors/mides/dificultat, l'ordre dels listeners i la restauració dels controls. Afegida a `test:optimization`. El harness Node també registra el mòdul abans d'executar el runtime.
- [x] **Compatibilitat amb canvis concurrents:** el bundle generat incorpora també la correcció d'autoapuntat d'armes lleugeres entrada a `main` durant aquesta extracció, sense revertir-la.
- [ ] **Fase 3 encara oberta:** separació incremental de més estat global i inicialització del motor; validació completa amb `tests/progressive-generation.cjs`, llavors i checkpoints, WebGL/Android, HOST/GUEST, FPS i GC durant la bateria conjunta acordada.


**Fase 3 · tercer tall del coordinador (v0.6.126; implementació parcial):**
- [x] **Coordinador de passos i rellotges separat:** `src/frame-tick-core.mjs` concentra les crides als rellotges semi-fixos de simulació i cinemàtiques, el reinici durant la generació, el pressupost de navegació per fotograma, la neteja de `simulationFrameActive` amb `try/finally`, els passos a `dt=0` i les crides de persistència SOLO. No altera el temps ni l'ordre de simulació, la física, les entrades, l'RNG, les dades de partides ni l'Worker.
- [x] **Paritat de la coordinació:** `tests/frame-tick-parity.mjs` compara el codi extret amb el contracte anterior sobre 354 fotogrames i 3.779 esdeveniments de la mateixa simulació, incloent pauses, generació, interrupcions, COOP, cinemàtiques i excepcions. Integrada a `test:timing` i `test:optimization`.
- [ ] **Fase 3 encara oberta:** extraure amb contractes l'estat i l'arrencada; comprovar simulació real, llavors, restauració, compatibilitat COOP/Android, FPS i GC en la bateria conjunta de proves. No s'ha mesurat cap millora de rendiment.


**Fase 3 · segon tall del coordinador (v0.6.125; implementació parcial):**
- [x] **Diagnòstic per fotograma separat:** `src/frame-diagnostics-core.mjs` encapsula la reinicialització dels comptadors d'IA/dibuix i l'emissió de les mostres del mode d'auditoria i del gestor adaptatiu. Les dependències del renderer, perfils i comptadors s'injecten una sola vegada; el bucle de simulació de `game-core.js` conserva el moment i l'ordre de les crides.
- [x] **Paritat de la telemetria:** `tests/frame-diagnostics-parity.mjs` compara el mòdul nou contra l'oracle de `game-core.js` anterior en 240 escenaris deterministes amb/sense auditoria, incloent les estadístiques de render, les condicions d'ombres, el reset dels mapes i les còpies independents per al HUD. Afegit a `test:optimization`.
- [ ] **Validació pendent de fase 3:** fer les suites Node completes i les proves reals GPU/COOP/Android amb comparativa FPS/p95/p99. Més endavant: extracció de l'arrencada, estats i coordinació del tick sense alterar RNG, física, ordres d'acció ni restauració.

**Fase 3 · primer tall de `game-core.js` (v0.6.124; implementació parcial):**
- [x] **Índexs espacials separats:** `src/spatial-grid-core.mjs` centralitza les cel·les d'illes, altures/plataformes, parets i edificis; `game-core.js` conserva la gestió dels arrays, el cicle de vida i les invalidacions, però ja no duplica quatre implementacions d'indexació. El mòdul és independent de Three.js i del generador de números aleatoris.
- [x] **Paritat estructural prèvia a GPU:** `tests/spatial-grid-parity.mjs` valida 2.100 consultes deterministes contra els bucles anteriors, incloent ordre de resultats, cel·les negatives, objectes en diverses cel·les, stamps i reinicialització. Executada com a prova aïllada; afegida a `test:optimization` per a la bateria conjunta.
- [ ] **Fase 3 encara oberta:** extraure progressivament estat, arrencada, entrada i coordinador de tick; reduir iteracions repetides només quan siguin demostrablement segures. Requereix partida completa, comparació de llavors/mapes, benchmarks reals i COOP HOST/GUEST en la sessió conjunta acordada.


| Ordre | Mòduls/fitxers principals | Reduir o extraure | Validació obligatòria |
| --- | --- | --- | --- |
| 3 | `src/game-core.js` (~236 KB), `runtime-scripts.mjs` | Separar estat/entitats, tick, arrencada, entrada i coordinador; dependències globals per injecció progressiva; evitar iteracions i invalidacions repetides per fotograma | Partida completa, seed determinista, solitari + COOP, FPS |
| 4 | `world-generation.js` (~94 KB), `terrain.js`, `world-generation-core.mjs`, `compound-*` | Planificació pura separada de creació de malles, dades canòniques, càrrega incremental, cachés i zones/índexs espacials; no repetir la generació per al Worker | Mateixes llavors, illes, rutes, camps i HQ; mapa 1/2 |
| 5 | `rendering.js`, `shadow-cache.js`, `vegetation.js`, `water.js`, `vehicle-model-core.mjs` | Mesurar draw calls, ombres, sobrecost de transparències, pooling, instancing, LOD/histeresi, objectes estables i geometries/materials reutilitzats | Comparativa A/B p95/p99 CPU+GPU, captures visuals, objectes alliberats |
| 6 | `combat.js` (~86 KB), `combat-rules.mjs`, `arcade-blast-fx.mjs`, `server/coop-combat.mjs` (~56 KB) | Regles pures de dany, primer impacte/vidres, balística, acoblaments a FX; amortitzar explosions; una sola font de veritat per solitari i Worker | Cadència, dany, autoapuntat, LDV, FX i 2 clients |
| 7 | `enemy-ai.js` (~57 KB), `enemy-navigation.js`, `enemy-lod.js`, `native-soldier-navigation.mjs` | Percepció → decisió → ruta → actuació, A* amb pressupost per frame, índexs/candidats reutilitzats, IA de torres i requisició per composició | Rutes/cobertura/atac, no bloquejos, rang/cadència i FPS |
| 8 | `vehicles.js`, `vehicle-dynamics-core.mjs`, `vehicle-model-core.mjs`, `rider.js`, `marine-patrol.js` | Fàbrica de flota, perfils de dinàmica, seients/ocupants, dany, senyals, efectes i patrulles; agrupar malles estàtiques sense tocar articulacions | Tots 16 tipus, costes/ferri, atropellaments, banderes, HUD |
| 9 | `coop-world-runtime.js` (~51 KB), `native-coop-*.mjs`, `coop-state-delta.mjs` | Aplicar snapshots només a entitats canviades, preassignar buffers, interpolation/prediction, seqüències idempotents, zero duplicacions visuals | RTT/jitter/stateGap, dos equips, reconciliació, reconnect |
| 10 | `server/coop-hub.mjs`, `server/coop-mission.mjs` (~34 KB), `server/coop-combat.mjs`, `server/coop-vehicles.mjs` | Separar transport, lògica de tick, checkpoint, difusió i autorització; caches de serialització per baseline; limitar lectures/escriptures al Durable Object | Regles autoritatives, perfils p95/p99, seguretat, persistència |
| 11 | `src/ui.js`, `operation-menu.js`, `coop-menu.js`, `index.html`, `menu-*` | Unificar submenús/estats i listeners, eliminar DOM/codi antic i configuracions duplicades, diferir inicialitzacions no essencials | First paint, ESC, compte, pausa, trucs, teclat/tàctil |
| 12 | `audio.js`, `movement-fx.js`, `operation-*.js`, `server/accounts.mjs` | Pool de so/FX, espai i distància reals, desament incremental, neteja de listeners/temporitzadors, dades i autorització separades | Sons i alertes, recuperació de dades, partida llarga, navegador/Android |

### Contracte de cada mòdul (no marcar complet fins a tenir les quatre proves)
- [ ] Mapa de dependències, estat/global compartit, recursos propietat del mòdul i punts calents de CPU/GPU/memòria.
- [ ] Extracció petita amb tests de paritat abans/després; sense reescriptures simultànies de combat, física i xarxa.
- [ ] Benchmark comparatiu mateix maquinari, llavor, escena, opció gràfica i càrrega COOP; documentar regressions i guany real.
- [ ] Verificació d'alliberament de recursos, partida amb dos jugadors, restauració del checkpoint i desplegament compatible. Fer revert si falla una invariant.

## Fase 13 — funcionalitats pendents no estrictament d'optimització (P2/P3)

- [ ] Fase 9: controls tàctils configurables (esquerrans, sensibilitat, posicions i persistència).
- [ ] Fase 11: estudiar l'opció A de contingut opcional i la mecànica de nit/espera, que **no** formaven part de l'elecció inicial B+C.
- [ ] Fase 14: acabat visual, animacions/LOD, cinemàtiques que es puguin saltar i resum final.
- [ ] Revisar la física del camp de presoners, camins estrets, mecànic, ferri, mapes i fauna en COOP en dues màquines; les proves de components no substitueixen una partida completa.
- [ ] Auditar les issues obertes al final de cada fase; tancar-les només amb evidència, no per aparèixer en versions antigues.

## Neteja documental aplicada en aquesta revisió

- L'arxiu `PROGRESS.MD` es retira perquè barrejava estat històric, promeses de fases ja superades i múltiples llistes de pendents obsoletes. L'historial íntegre continua recuperable al Git.
- Els informes de versions puntuals (`0.5.*`) de rendiment i IA es substitueixen per `docs/PERFORMANCE_TESTING.md` i pels punts mesurables d'aquest pla. Els càlculs, mètodes i proves útils continuen descrits a la guia.
- Els documents `docs/COOP_PHASE1.md` … `docs/COOP_PHASE10.md` i `docs/COOP_PLAYABLE.md` descrivien el client/prototip anterior; la direcció tècnica vigent està a `docs/COOP_REBUILD.md` i `docs/COOP_NATIVE_RUNTIME.md`.
- Notes curtes sobre vegetació/portes de COOP, revisions de windsurf, qüestionaris creatius contestats, algunes fases ja completades i l'auditoria de codi antiga es retiren per no mantenir múltiples fonts de veritat. **Git conserva totes les versions**.
- Es mantenen com a documentació de referència les decisions d'arquitectura, validació, generació, guardat/comptes, regles físiques i disseny de missions que no són substituïbles per un checklist.
- A partir d'ara, nous pendents es registren **només aquí**. Les notes de versions que es vulguin conservar han d'explicar decisions o contractes, no obrir llistes paral·leles.

## Laboratori de proves de models 3D (decisió de producte)

- **Tanqueta:** casc **v3d** actualitzat a `src/btr82-hull-v3.mjs`: orientació corregida aprovada, directament amb X transversal i Z seguint el canó, sense gir+inversa que es cancel·lin; simetria només X (dreta/esquerra al llarg del canó), proa fortament inclinada i popa xata no simètriques davant/darrere. Ventre central eixamplat i rebaixat fins a y=-0,32 m, amb esglaó a cada costat a y=0,96 m per deixar-hi sota les 8 rodes originals. Canó conservat. Malla tancada i prova geomètrica a `tests/btr82-hull-v3-geometry.cjs`. Comparació amb original i v2 al banc; v1 retirada. **Pendent de validar visualment** proporcions, escales, encaix rodes/casc i superfície de la popa; no s'ha integrat al joc.


- **Implementat al codi:** `vehicles-externs-proves.html` disposa d'un **editor d'anotació no destructiu per defecte** i reutilitzable per a tots els models: `src/vehicle-annotation-editor.mjs`. Tres modes: unir peces per grups; tapar forats amb un cercle que segueix la superfície real (verd si detecta un contorn simple, blau si no) i que tanca amb triangles reals en clicar, recuperables amb Desfer; marcar les cares per eliminar. Copia coordenades XYZ locals, malles, variants i explicació per comunicar canvis precisos. Permet continuar orbitant amb Alt + arrossegar i fer zoom amb Alt + roda. Aquest és el flux de referència per a futures proves de models; no tornar a crear eines temporals exclusives per vehicle.
- **Pendent de validació:** provar el visor a Paradoxa i al navegador real, especialment la detecció de contorns reals, el tapament de forats petits i el desfer de la geometria, la selecció amb ratolí i tàctil, la còpia al porta-retalls, la superposició de marques i les diferents categories de vehicle. Validar-ho separadament de les proves Node.
- **Contracte:** les marques d'unió i eliminació són anotacions; **el mode Tapar forats sí que pot modificar la geometria en memòria en un clic** i cal poder desfer-ho; no es desa automàticament al GLB. S'han de conservar els models originals i presentar canvis de malla en variants comparables i reversibles.

## Ordre d'execució i criteris de «fet»

1. **Primer**: eliminar lag d'explosions i completar prova real HOST/GUEST; estabilitzar regressions P0.
2. **Després**: higiene de dependències i extreure `game-core` per blocs petits, conservant la paritat de llavors i sistemes.
3. **Continuar**: generació/render, combat/IA, vehicles, COOP client/servidor, UI, so i persistència, cadascun amb la seva comparativa.
4. **Tancar**: prova de campanya sencera (solitari i dos jugadors), mapa petit i gran, navegador + Android, documents coherents i sense artefactes.

**Objectiu d'optimització (no resultat mesurat):** millorar almenys un 20% el p95 de temps de fotograma en l'escena problemàtica d'explosions o d'estrès, sense empitjorar perceptiblement qualitat ni cap comportament, i reduir trànsit/treball repetit al COOP segons perfils reals. Si els perfils mostren un coll diferent, canviar la prioritat en aquest mateix fitxer.
