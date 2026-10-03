// Paràmetres visuals del mar. Pensats per ser barats també en mòbil.
window.HUNTER_WATER = Object.freeze({
  shallow: Object.freeze([0.018, 0.68, 0.56]),
  deep: Object.freeze([0.006, 0.045, 0.24]),
  horizon: Object.freeze([0.36, 0.43, 0.66]),
  sunGlint: Object.freeze([1.0, 0.64, 0.24]),
  foam: Object.freeze([0.94, 1.0, 0.91]),
  fresnelStrength: 0.52,
  absorptionDepth: 25.0,
  fogDensity: 0.000105
});
