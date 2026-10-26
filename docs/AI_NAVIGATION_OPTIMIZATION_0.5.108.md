# Optimització de navegació — v0.5.108

Reducció de cost CPU sense modificar renderització ni qualitat gràfica.

- Distàncies quadràtiques per a contactes de palmeres i posicions tàctiques.
- Prefiltre conservador per evitar consultar altura de soldats fora del radi del vehicle; després es manté la col·lisió exacta.
- A* reutilitza l'altura de la ruta i evita la doble prova d'arbre de la infanteria.
- Costos de veïnatge A* precomputats, sense canviar l'ordre dels moviments.

Proves: `node tests/enemy-navigation-hotpaths.cjs`, `node tests/enemy-navigation.cjs`, `node tests/enemy-sweep-elevation-vegetation.cjs`, `node tests/enemy-sweep-candidate-cache.cjs`, `node tests/ai-cpu-optimization.cjs`, `node tools/build-runtime.cjs --check`.

La millora de FPS només es podrà avaluar executant la mateixa auditoria al dispositiu.
