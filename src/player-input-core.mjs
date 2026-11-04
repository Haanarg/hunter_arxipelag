// Fàbrica per llegir el teclat i el joystick sense globals de game-core.js.
// Captura les mateixes referències; no registra listeners ni altera física/COOP.
export function createReader(keys,joystick,strafePointers){
 return function readPlayerControls(strafeEnabled,canRun,playerCrouched){
const jf=-joystick.state.y,jtr=-joystick.state.x,
      f=Math.max(-1,Math.min(1,(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)+jf)),
      tr=Math.max(-1,Math.min(1,(keys.KeyA||keys.ArrowLeft?1:0)-(keys.KeyD||keys.ArrowRight?1:0)+jtr)),
      strafe=strafeEnabled?Math.max(-1,Math.min(1,
        (keys.KeyU?1:0)-(keys.KeyY?1:0)+(strafePointers.right!==null?1:0)-(strafePointers.left!==null?1:0))):0,
      ud=(keys.KeyH||keys.Space?1:0)-(keys.KeyJ||keys.ShiftLeft?1:0);
const running=canRun&&!playerCrouched&&f>.1&&(joystick.state.running||keys.ShiftLeft||keys.ShiftRight);
return {f,tr,strafe,ud,running};
};
}
// Mateixa semàntica, inclòs l'ordre d'avaluació i el retorn original.
export function canCrouch(started,paused,over,cv,swimming,scopeActive,playerFall,playerEject){
 return started&&!paused&&!over&&!cv&&!swimming&&!scopeActive&&!playerFall&&!playerEject;
}
export function canStrafe(scopeActive,cv,vehicles,playerEject,playerFall){
 return !scopeActive&&(cv?vehicles.has(cv.t):!playerEject&&(!playerFall||!!playerFall.parachute));
}
export function canRun(started,paused,over,cv,playerFall,playerEject,scopeActive){
 return !!started&&!paused&&!over&&!cv&&!playerFall&&!playerEject&&!scopeActive;
}
export function canSpecial(started,paused,over,hp,cv,playerFall,playerEject,scopeActive){
 return !!started&&!paused&&!over&&hp>0&&!!cv&&!playerFall&&!playerEject&&!scopeActive;
}
