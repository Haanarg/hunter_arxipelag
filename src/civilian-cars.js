// Cotxes civils clàssics: quatre siluetes en Three.js i sis colors.
 // La mateixa fàbrica s'empra al joc i a la pàgina de proves.
window.HUNTER_CIVILIAN_CARS=Object.freeze({
  colors:Object.freeze([
    Object.freeze({name:'Vermell',hex:0xd34e3d}),
    Object.freeze({name:'Blanc',hex:0xe7e8dc}),
    Object.freeze({name:'Blau',hex:0x4b9fd1}),
    Object.freeze({name:'Groc',hex:0xe4b83f}),
    Object.freeze({name:'Verd',hex:0x609969}),
    Object.freeze({name:'Marró',hex:0x896244})
  ]),
  variants:Object.freeze([
    Object.freeze({name:'Berlina clàssica',description:'Sedan de tres volums, graella cromada i fars rectangulars, inspirat en la fotografia.',length:5.35,width:2.88,roof:2.67,front:.19,rear:.18,roofRear:.11}),
    Object.freeze({name:'Compacte urbà',description:'Carrosseria més curta, sostre alt, capó breu i finestres quadrades.',length:4.72,width:2.75,roof:2.79,front:.17,rear:.18,roofRear:.12}),
    Object.freeze({name:'Familiar',description:'Cinc portes, sostre llarg, porta posterior gairebé vertical i maleter ampli.',length:5.75,width:2.91,roof:2.75,front:.20,rear:.35,roofRear:.30}),
    Object.freeze({name:'Cupè fastback',description:'Sostre baix, parabrisa inclinat, posterior descendent i frontal allargat.',length:5.30,width:2.86,roof:2.41,front:.21,rear:.25,roofRear:.035})
  ]),
  build(THREE,group,{box,wheel,rod,material,color=0x4b9fd1,variant=0}){
    const v=this.variants[Math.max(0,Math.min(3,variant|0))];
    const l=v.length,w=v.width,mid=w*.42,paint=color;
    const metal=0xbcc3c2,trim=0x273137,glass=0x6b9fb0;
    const B=(width,height,depth,col,x,y,z,profile='paint')=>
      box(group,width,height,depth,col,x,y,z,profile);
    const R=(a,b,r,col,profile='metal')=>rod(group,a,b,r,col,profile);
    // Xarrís, baixos i tres volums; la silueta continua sent visible des de lluny.
    B(w-.10,.34,l-.1,0x333b3b,0,.74,0,'metal');
    B(w,.86,l-.10,paint,0,1.19,0);
    B(w-.12,.17,l-.17,paint,0,1.69,0);
    const frontBase=-l*v.front,rearBase=l*v.rear;
    const frontTop=-l*(v.front-.09),rearTop=l*v.roofRear;
    const topY=v.roof,baseY=1.73;
    // Habitacle trapezoïdal de quatre cares, amb sostre real i vidres laterals.
    const roof=new THREE.Shape();
    roof.moveTo(-rearBase,baseY);
    roof.lineTo(-rearTop,topY);
    roof.lineTo(-frontTop,topY);
    roof.lineTo(-frontBase,baseY);
    roof.closePath();
    const roofGeo=new THREE.ExtrudeGeometry(roof,{depth:w*.84,bevelEnabled:false,curveSegments:1});
    roofGeo.rotateY(Math.PI/2);
    roofGeo.translate(-w*.42,0,0);
    const roofMesh=new THREE.Mesh(roofGeo,material(paint,'paint'));
    group.add(roofMesh);
    const windows=[[-rearBase,-rearTop,-.05],[-.025,-frontTop,-frontBase]];
    for(const side of [-1,1]){
      // Vidres independents delimitats pel muntant central, sense transparències.
      const glassMat=material(glass,'glass');
      glassMat.side=THREE.DoubleSide;
      for(const [uBack,uUpper,uFront] of windows){
        const shape=new THREE.Shape();
        shape.moveTo(uBack,baseY+.085);
        shape.lineTo(uUpper,topY-.105);
        shape.lineTo(uFront,topY-.105);
        shape.lineTo(uFront+.10,baseY+.085);
        shape.closePath();
        const m=new THREE.Mesh(new THREE.ShapeGeometry(shape),glassMat);
        m.rotation.y=Math.PI/2;
        m.position.x=side*(w*.42+.018);
        group.add(m);
      }
      B(.065,topY-baseY+.07,.08,paint,side*(w*.42+.02),(baseY+topY)/2,.02);
      B(.065,.44,.07,trim,side*(w/2+.02),1.42,l*.09,'metal');
      B(.07,.20,.26,metal,side*(w/2+.09),1.86,-l*.14,'metal');
      // Manetes i línies de separació de portes.
      for(const z of [-.60,.91])B(.085,.07,.29,metal,side*(w/2+.025),1.58,z,'metal');
      B(.055,.06,l*.59,trim,side*(w/2+.024),1.07,.08,'metal');
    }
    // Llunes del davant i del darrere, lleument inclinades.
    const windshield=B(w*.72,.70,.08,glass,0,(baseY+topY)/2,-l*(v.front-.045),'glass');
    windshield.rotation.x=-.20;
    const rearWindow=B(w*.71,.58,.07,glass,0,(baseY+topY)/2,l*(v.rear-.045),'glass');
    rearWindow.rotation.x=variant===2?-.06:.18;
    // Capó i maleter amb línies fines visibles.
    B(w-.12,.10,Math.max(.6,l*.5+frontBase),paint,0,1.71,(-l/2+frontBase)/2);
    B(w-.12,.10,Math.max(.45,l/2-rearBase),paint,0,1.71,(l/2+rearBase)/2);
    B(w*.89,.25,.13,0x9aa7a9,0,1.30,-l/2-.06,'metal');
    B(w*.89,.25,.13,0x9aa7a9,0,1.30,l/2+.06,'metal');
    B(w*.57,.42,.09,0x414e54,0,1.48,-l/2-.085,'metal');
    for(const x of [-w*.315,w*.315]){
      const lamp=B(w*.19,.32,.095,0xece9cb,x,1.54,-l/2-.09);
      B(.16,.16,.1,0xf0a43d,x,1.26,-l/2-.09);
      B(w*.18,.21,.09,0xb5362a,x,1.53,l/2+.088);
    }
    for(const x of [-.53,-.28,-.03,.22,.47])B(.045,.29,.10,metal,x,1.48,-l/2-.15,'metal');
    B(.59,.19,.045,0xe2ddc8,0,1.16,l/2+.15);
    // Les quatre rodes passen pels pivots de direcció ja existents.
    for(const z of [-l*.335,l*.335])for(const side of [-1,1]){
      wheel(group,side*(w/2+.035),.69,z,.68,.38,false,z<0);
      B(.14,.15,.57,paint,side*(w/2+.065),1.26,z);
    }
    // Petites particularitats que fan recognoscibles els quatre models.
    if(variant===0){
      for(const x of[-w*.44,w*.44])R([x,1.15,-l*.48],[x,1.15,-l*.52],.068,metal);
    }else if(variant===1){
      B(.72,.08,.45,trim,0,topY+.06,.2,'metal');
    }else if(variant===2){
      for(const x of [-w*.34,w*.34])R([x,topY+.075,-l*.1],[x,topY+.075,l*.27],.045,metal);
      B(w*.72,.19,.14,metal,0,1.35,l/2+.085,'metal');
    }else{
      B(w*.78,.09,.46,paint,0,1.83,l*.37);
      B(w*.62,.10,.11,trim,0,1.63,l/2+.10,'metal');
    }
    group.userData.civilianVariant=variant;
    group.userData.civilianColor=color;
    return group;
  }
});
