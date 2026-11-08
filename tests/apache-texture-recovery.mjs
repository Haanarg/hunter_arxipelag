// Regressions: no ocultar textures reals amb pintura, recuperar un atles
// incrustat desconnectat, i no mostrar l'Apache completament blanc.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three-r186.module.mjs';
import {recoverApacheAppearance,apacheAppearanceDescription} from '../src/helicopter-texture-recovery.mjs';

const mesh=(name,material,uv=true)=>{
 const g=new THREE.BoxGeometry(1,1,1);
 if(!uv)g.deleteAttribute('uv');
 const m=new THREE.Mesh(g,material);m.name=name;return m;
};
const scene=(...children)=>{const s=new THREE.Scene();s.add(...children);return s};
const white=()=>new THREE.MeshStandardMaterial({color:0xffffff});
const colored=()=>new THREE.MeshStandardMaterial({color:0x343a37});

{
 const body=mesh('Apache-Fuselage',white());
 const rotor=mesh('Main-Rotor-Blade',white());
 const canopy=mesh('Front-Canopy-Glass',white());
 const s=scene(body,rotor,canopy);
 const old=body.material;
 const report=await recoverApacheAppearance(THREE,{scene:s,parser:{json:{images:[],textures:[]}}});
 assert.equal(report.status,'fallback');
 assert.equal(report.recolored,3);
 assert.equal(report.embeddedImages,0);
 assert.equal(body.material.color.getHex(),0x626f54);
 assert.equal(rotor.material.color.getHex(),0x252b2a);
 assert.equal(canopy.material.color.getHex(),0x314952);
 assert.equal(old.color.getHex(),0xffffff,'No s’han de mutar els materials de la font');
 assert(apacheAppearanceDescription(report).includes('NO textura original'));
}
{
 const body=mesh('Fuselage',white()),dark=mesh('Landing-Strut',colored());
 const s=scene(body,dark);
 const texture=new THREE.Texture({width:4,height:4});
 const parser={
  json:{images:[{name:'apache_baseColor.png'}],textures:[{source:0}]},
  async getDependency(type,index){assert.equal(type,'texture');assert.equal(index,0);return texture}
 };
 const report=await recoverApacheAppearance(THREE,{scene:s,parser});
 assert.equal(report.status,'relinked');
 assert.equal(report.relinked,1);
 assert.equal(report.recolored,0);
 assert.strictEqual(body.material.map,texture);
 assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
 assert.equal(body.material.color.getHex(),0xffffff);
 assert.equal(dark.material.color.getHex(),0x343a37,'Respectar materials no blancs');
 assert(apacheAppearanceDescription(report).includes('Textura UV recuperada'));
}
{
 // Quan el GLB ja du una textura connectada, no hem de tocar res.
 const texture=new THREE.Texture({width:4,height:4});
 const good=white();good.map=texture;
 const body=mesh('Apache fuselage',good);
 const report=await recoverApacheAppearance(THREE,{scene:scene(body),parser:{json:{images:[{}],textures:[{}]}}});
 assert.equal(report.status,'original');assert.equal(report.recolored,0);
 assert.strictEqual(body.material,good);
}
{
 // No enganxar un mapa normal per error com si fos una textura difusa.
 const body=mesh('Apache',white());
 const tex=new THREE.Texture({width:4,height:4});
 const parser={json:{images:[{name:'body_normal.png'}],textures:[{source:0}]},
  async getDependency(){throw Error('Normal map should not be selected');}};
 const report=await recoverApacheAppearance(THREE,{scene:scene(body),parser});
 assert.equal(report.status,'fallback');assert.equal(report.relinked,0);
 assert.equal(body.material.map,null);
}
console.log('Apache: textures difuses preservades, atles GLB recuperat quan existeix, i materials militars de substitució etiquetats quan no existeix.');
