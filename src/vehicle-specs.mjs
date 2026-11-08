export const vehicleSpecs=Object.freeze({
  scales:Object.freeze({llanxa:1.95,llanxa_coets:1.95,moto_aquatica:1.08,barca_rems:.98,windsurf:1.05,hover:1.3,ferry:1,cotxe:1.3,cotxe_civil:1.2,moto:1.2,bici:1.2,camio:1.8125,tanqueta:1.8125,tanc:2.25,heli:1.75,heli_combat:1.82}),
  radii:Object.freeze({llanxa:8.25,llanxa_coets:8.6,moto_aquatica:2.1,barca_rems:3.25,windsurf:2.3,hover:4.8,ferry:35,cotxe:3.8,cotxe_civil:3.35,moto:1.75,bici:1.9,camio:4.8,tanqueta:4.5,tanc:5.6,heli:8,heli_combat:8.4}),
  hitboxes:Object.freeze({
    llanxa:[6.6,15.9],llanxa_coets:[6.8,16.1],moto_aquatica:[1.7,3.8],barca_rems:[2.7,6.1],windsurf:[1.9,4.3],hover:[4.2,7.4],ferry:[32,63],
    cotxe:[4.10,6.45],cotxe_civil:[3.2,5.85],moto:[1.24,3.19],bici:[1.15,2.4],camio:[3.6,7.8],tanqueta:[3.15,5.1],tanc:[4.2,7.1],
    heli:[3.4,11.2],heli_combat:[2.8,11.8]
  }),
  // Capacitat autoritativa: la resta de vehicles admeten pilot i passatger.
  seatCounts:Object.freeze({bici:1,moto:1,moto_aquatica:1,windsurf:1}),
  decks:Object.freeze({ferry:Object.freeze({halfW:14.3,halfL:25.6,rampHalfW:6.7,ramp:5.8,y:2.2,rampY:.45,
    cabin:Object.freeze({x:11.5,z:1.8,halfW:1.9,halfL:4.05})})}),
});

// El mode cooperatiu i els mapes de proves comparteixen les places reals.
export const vehicleSeatCount=type=>vehicleSpecs.seatCounts[type]??2;
