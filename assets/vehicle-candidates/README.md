# Candidats de vehicles en revisió

Aquesta carpeta guarda **29 models GLB externs CC0** (uns **9,35 MiB**) per al comparador `/vehicles-externs-proves.html`. Aquests GLB són només per a vehicles que encara s'han de seleccionar; cap d'ells substitueix automàticament un vehicle del joc.

## Decisions

- **Camió militar, barca de rems i windsurf:** conservam els models procedimentals originals; els candidats externs descartats ja no hi són.
- **Moto aquàtica: model definitiu integrat al joc.** Model acceptat `Recreational Jet Ski` (opció 3), amb **2.578 triangles = 24,98%** dels 10.320 triangles originals. S'ha incorporat com a geometria precompilada a `src/jet-ski-25-geometry.mjs`, utilitzada per `src/vehicle-model-core.mjs`. Només la coberta del motor (`jetski-engine-cover`, antiga peça `coral`) canvia als **set colors llampants** de `jetskiColors`; l'ordre és cíclic i determinista per llavor, sense introduir cap nova tirada RNG. Física, volum de col·lisió, ones, lloc del pilot i dades de desament continuen lligats al tipus `moto_aquatica`. **S'han eliminat els tres GLB de candidats de moto aquàtica** i l'antic model procedimental; també s'ha retirat la pestanya de la pàgina.
- **Motocicleta:** pendent de triar grau de simplificació de l'opció 2 `Naked streetfighter`. El manillar i **tots dos punys** es giren 180° cap al conductor; **forquilla, parafang, roda i eix davanters** comparteixen un únic pivot de direcció. S'eliminen la pota de cabra, els retrovisors i les dues peces vermelles giratòries de les rodes. Les **quatre reduccions** preserven íntegrament pneumàtics, llandes i radis amb obertures; el comparador mostra els triangles finals, que poden superar els percentatges objectiu per conservar aquest detall. El control Direcció i l'animació permeten comprovar el gir simultani.
- **Llanxa:** encara al catàleg de comparació; l'apartat addicional de la llanxa no s'ha creat perquè la petició va arribar incompleta.

## Inventari i procedència

`manifest.json` relaciona els candidats restants, les mides, els nombres de triangles i els enllaços d'origen. L'origen és https://3dassets.dev/ i les llicències indicades són **CC0 1.0 Universal** (https://creativecommons.org/publicdomain/zero/1.0/).

La moto aquàtica final prové de l'actiu 39428, `Beach Surf and Paddle Kit / Recreational Jet Ski`:
https://3dassets.dev/assets/beach-surf-and-paddle-kit-recreational-jet-ski-a61d9936

La versió de producció és **un mòdul JavaScript de geometria compacta**, no el GLB de prova. Això permet construir-la de forma síncrona, compartir les geometries entre vehicles i respectar els materials i colors per instància sense carregar GLTFLoader ni meshoptimizer durant la partida.

Es poden incorporar altres candidats executant `node tools/fetch-vehicle-candidates.mjs` (Node.js 22). L'eina només consulta el catàleg actual i **no torna a descarregar** els vehicles retirats. Límits: 2 MiB per candidat i 30 MiB en total.
