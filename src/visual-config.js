// Configuració visual centralitzada.
// Aquest fitxer no conté estat de joc: es pot evolucionar sense tocar simulació ni controls.
window.HUNTER_VISUAL_CONFIG = Object.freeze({
  mobile: Object.freeze({
    pixelRatio: 1.0,
    minPixelRatio: 1.0,
    shadows: false,
    shadowSize: 768,
    exposure: 1.08,
    fog: 0.00018,
    skySegments: Object.freeze([28, 16]),
    waterSegments: 200
  }),
  desktop: Object.freeze({
    pixelRatio: 1.2,
    minPixelRatio: 1.0,
    shadows: true,
    shadowSize: 2048,
    exposure: 1.06,
    fog: 0.000145,
    skySegments: Object.freeze([48, 28]),
    waterSegments: 320
  })
});
