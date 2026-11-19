import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../src/account-menu.js',import.meta.url),'utf8');
class El{
 constructor(tag){this.tagName=tag;this.children=[];this.textContent='';this.style={};
  this.value='';this.checked=false;this.disabled=false;}
 appendChild(node){this.children.push(node);return node}
 prepend(node){this.children.unshift(node);return node}
 replaceChildren(...nodes){this.children=[...nodes]}
 setAttribute(key,value){this[key]=value}
 querySelector(q){return q==='[role="status"]'?this.children.find(x=>x.role==='status'):null}
}
let admin=false,usersQueries=0,cloudQueries=0;
const me={id:'p1',name:'pilot'};
const accounts={
 configured:true,
 async verifiedUser(){return admin?me:null},
 status(){return {user:admin?me:null,role:admin?'admin':'user',
  approval:admin?'approved':null,recoveryCodes:2}},
 async users(){usersQueries++;return [
  {id:'p1',name:'pilot',role:'admin',status:'approved'},
  {id:'p2',name:'altre',role:'user',status:'pending'}]}
};
const ctx={window:{HUNTER_ACCOUNT_SERVICE:accounts},document:{
 createElement:tag=>new El(tag),getElementById:()=>null,body:new El('body')
},started:false,ui:{hide(){}},openCoopPanel(){},console,Blob,URL,setTimeout};
runInNewContext(source,ctx);
runInNewContext('accountCloud={list:async()=>{globalThis.cloudQueriesCalled();return []},retry:async()=>{},syncHistory:async()=>{}}',ctx);
ctx.cloudQueriesCalled=()=>cloudQueries++;
const body=new El('div'),text=()=>{
 const walk=node=>[node.textContent,...node.children.flatMap(walk)];
 return JSON.stringify(body.children.flatMap(walk));
};
const click=async label=>{
 const button=body.children.find(x=>x.tagName==='button'&&x.textContent.includes(label));
 assert(button,'Falta el botó '+label+' al submenú '+text());
 await button.onclick();
};
await ctx.renderAccount(body,()=>true);
assert(text().includes('Entrar o crear compte'));
assert(text().includes('Recuperar l’accés'));
assert(!text().includes('Gestió de comptes'));
assert.equal(usersQueries,0);assert.equal(cloudQueries,0);
await click('Recuperar l’accés');
assert(text().includes('Recuperació i contrasenya'));
assert(text().includes('Canviar contrasenya amb el codi'));
await click('Tornar a Compte');
assert(text().includes('Entrar o crear compte'));
admin=true;
await ctx.renderAccount(body,()=>true);
assert(text().includes('Gestió de comptes'));
assert(text().includes('Núvol'));
assert.equal(usersQueries,0,'Llista administradors no carregada des de portada');
assert.equal(cloudQueries,0,'Partides núvol no carregades des de portada');
await click('Gestió de comptes');
assert.equal(usersQueries,1);
assert(text().includes('Aprovar altre'));
await click('Tornar a Compte');
await click('Núvol');
assert.equal(cloudQueries,1,'Núvol només carregat en obrir el submenú');
await click('Tornar a Compte');
await click('Recuperació');
assert(text().includes('Generar 8 codis de recuperació'));
assert(!text().includes('Aprovar altre'));
console.log('PASS COMPTE: recuperació, núvol, gestió admin i sessió en submenús independents');
