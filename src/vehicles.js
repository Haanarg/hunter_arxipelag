// Browser services for the shared original vehicle factory.
window.HUNTER_VEHICLES=Object.freeze({...window.HUNTER_SHARED_VEHICLE_MODELS.vehicleModels,
 createFactory(THREE,options){return window.HUNTER_SHARED_VEHICLE_MODELS.vehicleModels.createFactory(THREE,{...options,resources:window.HUNTER_RESOURCES,civilianCar:window.HUNTER_CIVIL_C1A,humvee:window.HUNTER_HUMVEE_D31,truck:window.HUNTER_TRUCK_CONCEPT,batching:window.HUNTER_PLAYER_BATCH});}
});
