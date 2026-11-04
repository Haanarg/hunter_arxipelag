// Coordinació dels dos rellotges del joc original: passos de simulació
// i cinemàtiques. Les dependències s'injecten: no toca l'RNG, el render,
// les regles de joc, el Worker ni les dades de partida.
// Important: preserva l'ordre d'operacions i l'estat capturat al principi
// de cada fotograma, fins i tot si una cinemàtica n'inicia una altra.
export function createFrameTickCoordinator({
  simulationClock,cinematicClock,resetEnemyPathFrameBudget,
  update,getElapsed,shouldContinueGameplay,setSimulationFrameActive,
  syncWeaponPicker,tickPersistence,
  getVictoryCinematic,getDeathCinematic,
  updateVictoryCinematic,updateDeathCinematic,canContinueCinematics
}){
  function suspend(now){
    simulationClock.reset(now);
    cinematicClock.reset(now);
  }
  function advanceGameplay(now,gameplayActive){
    // Una sola quota de navegació per fotograma, mai per subpas.
    resetEnemyPathFrameBudget();
    setSimulationFrameActive(true);
    let simulated;
    try{
      simulated=simulationClock.advance(now,dt=>{
        update(dt,getElapsed()+dt);
        return shouldContinueGameplay();
      },gameplayActive);
    }finally{
      setSimulationFrameActive(false);
    }
    // Controls, HUD i càmera també es refresquen amb dt=0.
    if(!simulated.steps)update(0,getElapsed());
    syncWeaponPicker();
    tickPersistence();
    return simulated;
  }
  function advanceCinematics(now,active,victoryAtStart,deathAtStart){
    return cinematicClock.advance(now,dt=>{
      if(getVictoryCinematic()===victoryAtStart&&
         (victoryAtStart?.active||victoryAtStart?.finished))
        updateVictoryCinematic(dt);
      if(getDeathCinematic()===deathAtStart&&deathAtStart?.active)
        updateDeathCinematic(dt);
      return canContinueCinematics()&&
        (getVictoryCinematic()===victoryAtStart&&
          (victoryAtStart?.active||victoryAtStart?.finished)||
         getDeathCinematic()===deathAtStart&&deathAtStart?.active);
    },active);
  }
  return Object.freeze({suspend,advanceGameplay,advanceCinematics});
}
