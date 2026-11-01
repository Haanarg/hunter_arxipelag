// Cinemàtica Ackermann simplificada per als cotxes enemics.
// La guinyada depèn únicament de la distància que recorren les rodes;
// ni amb un objectiu a l'esquena ni reculant poden girar sobre el lloc.
export const ENEMY_CAR_MIN_TURN_RADIUS=10.5; // metres, vehicle militar tipus Humvee
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));

/**
 * Orientació 0 = proa -Z, com els models de Hunter. La distància és positiva;
 * reverse canvia el signe del desplaçament sense canviar el front del vehicle.
 * Un pas es calcula amb l'angle al punt mig (arc circular); el caller segueix
 * comprovant les col·lisions amb enemySweep abans d'acceptar el resultat.
 */
export function enemyCarArcStep({x,z,heading,targetHeading,distance,reverse=false,radius=ENEMY_CAR_MIN_TURN_RADIUS}){
 const travel=Number.isFinite(distance)?Math.max(0,distance):0;
 const radiusSafe=Math.max(ENEMY_CAR_MIN_TURN_RADIUS,Number.isFinite(radius)?radius:ENEMY_CAR_MIN_TURN_RADIUS);
 const error=wrap(targetHeading-heading);
 // Una direcció amb topall, sense salt instantani en girar més de 180°.
 const steer=clamp(error*.92,-1,1);
 const signed=reverse?-travel:travel;
 const yaw=signed*steer/radiusSafe;
 const midway=heading+yaw*.5;
 return {
  x:x-Math.sin(midway)*signed,
  z:z-Math.cos(midway)*signed,
  heading:wrap(heading+yaw),
  steer,
  yaw,
  distance:travel,
  radius:radiusSafe
 };
}
