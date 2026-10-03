// Configuració visual centralitzada.
// Aquest fitxer no conté estat de joc: es pot evolucionar sense tocar simulació ni controls.
window.HUNTER_VISUAL_CONFIG = Object.freeze({
  mobile: Object.freeze({
    pixelRatio: 1.2,
    shadows: false,
    shadowSize: 768,
    exposure: 1.02,
    fog: 0.00019,
    skySegments: Object.freeze([24, 14]),
    waterSegments: 220
  }),
  desktop: Object.freeze({
    pixelRatio: 1.75,
    shadows: true,
    shadowSize: 1536,
    exposure: 1.0,
    fog: 0.000155,
    skySegments: Object.freeze([40, 24]),
    waterSegments: 360
  })
});
