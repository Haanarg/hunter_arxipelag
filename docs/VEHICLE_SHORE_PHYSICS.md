# Transicions de vehicles a la costa · 0.5.87

Aquesta implementació elimina els dos bloquejos binaris previs a `stepV`:
`raw < -1.2` per a les embarcacions i `h > -1.2` per als terrestres.

## Terrestres

El motor calcula la profunditat de l'aigua amb les ones visibles (`wy`) i el terreny físic (`hAt`). La configuració `HUNTER_VEHICLE_DYNAMICS.shore.land` defineix la fondària de vadeig i la d'aturada del motor per a cada tipus. Els vehicles van perdent tracció de manera gradual, fan esquitxos, conserven la inèrcia, i si se supera el llindar profund el motor s'atura definitivament. L'enfonsament és visual, progressiu, continua fins al fons després d'abandonar el vehicle i no consumeix els punts de vida ni fa explotar el vehicle. El jugador pot sortir abans o és expulsat a l'aigua automàticament quan el vehicle deixa de ser pilotable. Els vehicles inutilitzats no es poden reembarcar ni reparar amb el mecànic.

**Excepció:** els vehicles transportats sobre la coberta d'un ferri no s'inunden.

## Aquàtics

El marge de fondària es calcula sota cinc mostres del casc (centre, proa, popa i ambdós costats), segons les dimensions reals del vehicle. La resistència comença a augmentar abans del contacte, i una cerca binària sobre el trajecte evita travessar la costa encara que un fotograma duri massa. Quan la quilla toca el llindar del fons, perd velocitat i pot fer marxa enrere cap a més profunditat. Els xocs a poca velocitat no fan mal; els forts poden malmetre el casc. El windsurf i la moto aquàtica admeten més contacte amb la sorra, les llanxes necessiten més aigua i el ferri té més calat. Es cancel·len els salts sobre ones si una moto aquàtica o windsurf ha embarrancat.

L'hovercraft conserva el moviment amfibi i els controls originals. La sortida dels altres vehicles i els desembarcaments del ferri segueixen funcionant.

## Proves

`node tests/vehicle-shore.cjs` comprova la funció física real sense GPU: entrada d'un cotxe a l'aigua, enfonsament, alliberament del jugador, frenada i recul de la llanxa, diferents calats, hovercraft i vehicles sobre coberta. Cal validar visualment els efectes, les rampes i les platges a navegador i Android.
