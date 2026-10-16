// Configuració visual centralitzada.
// Aquest fitxer no conté estat de joc: es pot evolucionar sense tocar simulació ni controls.
window.HUNTER_VISUAL_CONFIG = Object.freeze({
  // Perfil per a equips molt limitats: cap ombra, mar sense reflexos i
  // dibuix a curta distància. L'horitzó es dissimula amb boira densa.
  ultra: Object.freeze({
    pixelRatio: 0.8,
    minPixelRatio: 0.8,
    shadows: false,
    shadowSize: 512,
    exposure: 1.08,
    fog: 0.00095,
    viewDistance: 2400,
    sunDistance: 900,
    waterReflections: false,
    skySegments: Object.freeze([20, 12]),
    waterSegments: 120
  }),
  mobile: Object.freeze({
    pixelRatio: 1.0,
    minPixelRatio: 1.0,
    shadows: false,
    shadowSize: 768,
    exposure: 1.08,
    fog: 0.00014,
    skySegments: Object.freeze([28, 16]),
    waterSegments: 200
  }),
  desktop: Object.freeze({
    pixelRatio: 1.2,
    minPixelRatio: 1.0,
    shadows: true,
    shadowSize: 1280,
    shadowDistance: 245,
    playerShadows: true,
    terrainDetailTexture: true,
    coastDetail: true,
    exposure: 1.06,
    fog: 0.00010,
    viewDistance: 14000,
    skySegments: Object.freeze([52, 30]),
    waterSegments: 384
  })
});
