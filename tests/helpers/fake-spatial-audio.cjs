'use strict';
// Web Audio fake per comportament: graf, fonts one-shot, rellotge, ended i promises.
class AudioParam {
 constructor(value=0){this.value=value;this.events=[]}
 setValueAtTime(value,time){this.value=value;this.events.push(['set',value,time])}
 exponentialRampToValueAtTime(value,time){this.events.push(['exponential',value,time])}
 linearRampToValueAtTime(value,time){this.events.push(['linear',value,time])}
 setTargetAtTime(value,time,constant){this.value=value;this.events.push(['target',value,time,constant])}
 cancelScheduledValues(time){this.events=this.events.filter(event=>event[2]<time)}
}
class AudioNode {
 constructor(context,kind){this.context=context;this.kind=kind;this.connections=new Set();this.disconnected=false;context.nodes.push(this)}
 connect(node){if(!node)throw new Error('Missing destination');this.connections.add(node);return node}
 disconnect(){this.connections.clear();this.disconnected=true}
}
class SourceNode extends AudioNode {
 constructor(context,kind){super(context,kind);this.frequency=new AudioParam(440);this.playbackRate=new AudioParam(1);this.started=false;this.ended=false;this.stopCalls=[];this.endAt=Infinity;this.onended=null;this.loop=false}
 start(time=this.context.currentTime){
  if(this.started)throw new Error('Cannot restart a source');
  this.started=true;this.startAt=time;
  if(this.buffer&&!this.loop)this.endAt=time+this.buffer.duration/this.playbackRate.value;
 }
 stop(time=this.context.currentTime){
  if(!this.started)throw new Error('Cannot stop before start');
  this.stopCalls.push(time);this.endAt=Math.min(this.endAt,time);
  if(time<=this.context.currentTime)this.finish();
 }
 finish(){if(this.ended)return;this.ended=true;this.onended?.()}
}
function positionNode(node,legacy=false){
 if(legacy){node.setPosition=(x,y,z)=>{node.position=[x,y,z]}}
 else for(const axis of 'XYZ')node['position'+axis]=new AudioParam();
 return node;
}
function createFakeAudioClass(options={}){
 return class FakeAudioContext {
  static instances=[];
  constructor(){
   this.currentTime=0;this.sampleRate=8000;this.state=options.initialState||'suspended';this.nodes=[];this.buffers=[];
   this.resumeCalls=0;this.suspendCalls=0;this.resumePending=[];this.destination=new AudioNode(this,'destination');
   this.listener=positionNode({},options.legacy);
   if(options.legacy)this.listener.setOrientation=(...values)=>{this.listener.orientation=values};
   else for(const name of ['forward','up'])for(const axis of 'XYZ')this.listener[name+axis]=new AudioParam();
   if(options.noPanner)this.createPanner=undefined;
   this.constructor.instances.push(this);
  }
  createGain(){const node=new AudioNode(this,'gain');node.gain=new AudioParam(1);return node}
  createOscillator(){return new SourceNode(this,'oscillator')}
  createBufferSource(){return new SourceNode(this,'bufferSource')}
  createBiquadFilter(){const node=new AudioNode(this,'filter');node.frequency=new AudioParam(350);return node}
  createPanner(){
   if(options.throwPanner)throw new Error('Panner unavailable');
   const node=positionNode(new AudioNode(this,'panner'),options.legacy);
   Object.assign(node,{panningModel:'equalpower',distanceModel:'inverse',rolloffFactor:1,refDistance:1,maxDistance:10000});return node;
  }
  createBuffer(channels,length,rate){
   const data=Array.from({length:channels},()=>new Float32Array(length)),buffer={length,duration:length/rate,sampleRate:rate,getChannelData:i=>data[i]};
   this.buffers.push(buffer);return buffer;
  }
  resume(){
   this.resumeCalls++;
   if(options.throwResume)throw new Error('resume exception');
   if(options.rejectResume)return Promise.reject(new Error('autoplay blocked'));
   if(options.deferResume)return new Promise((resolve,reject)=>this.resumePending.push({resolve:()=>{this.state='running';resolve()},reject}));
   this.state='running';return Promise.resolve();
  }
  suspend(){
   this.suspendCalls++;
   if(options.rejectSuspend)return Promise.reject(new Error('suspend failed'));
   this.state='suspended';return Promise.resolve();
  }
  advance(seconds){
   if(this.state!=='running')return;
   this.currentTime+=seconds;
   for(const node of this.nodes)if(node instanceof SourceNode&&node.started&&node.endAt<=this.currentTime)node.finish();
  }
  liveSources(){return this.nodes.filter(node=>node instanceof SourceNode&&node.started&&!node.ended)}
 }
}
module.exports={createFakeAudioClass,AudioParam,AudioNode,SourceNode};
