// Compatibility extraction: shared state remains in game-core.js.
// Campana fúnebre sintetitzada, amb harmònics metàl·lics i decaïment lent.
// No necessita descarregar fitxers d'àudio ni manté oscil·ladors actius.
function deathBell(volume=1){
 if(!AC||muted)return;
 try{
  const now=AC.currentTime,partials=[1,2.01,2.49,3.98,5.03],
        strengths=[.38,.17,.13,.08,.045];
  for(let i=0;i<partials.length;i++){
   const osc=AC.createOscillator(),gain=AC.createGain(),
         start=Math.min(1,Math.max(0,volume))*strengths[i],length=4.4-i*.43;
   osc.type='sine';osc.frequency.setValueAtTime(174.61*partials[i],now);
   gain.gain.setValueAtTime(.0001,now);
   gain.gain.exponentialRampToValueAtTime(start,now+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,now+length);
   osc.connect(gain);gain.connect(AC.destination);
   osc.start(now);osc.stop(now+length+.03);
  }
 }catch(e){}
}
function initAudio(){try{AC=new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type='sawtooth';o.frequency.value=40;g.gain.value=0;o.connect(g);g.connect(AC.destination);o.start();eng={o,g};const length=AC.sampleRate*8,buf=AC.createBuffer(1,length,AC.sampleRate),samples=buf.getChannelData(0);let smooth=0;for(let i=0;i<length;i++){smooth=.985*smooth+.015*(Math.random()*2-1);const swell=.35+.65*Math.pow(.5+.5*Math.sin(i/length*Math.PI*4),2);samples[i]=smooth*9*swell}const noise=AC.createBufferSource(),filter=AC.createBiquadFilter(),gain=AC.createGain();noise.buffer=buf;noise.loop=true;filter.type='lowpass';filter.frequency.value=850;gain.gain.value=.055;noise.connect(filter);filter.connect(gain);gain.connect(AC.destination);noise.start();seaAudio={noise,filter,gain};AC.resume()}catch(e){}}
function snd(t,v=1){if(!AC||v<=.02)return;const n=AC.currentTime;if(lastS[t]&&n-lastS[t]<.06)return;lastS[t]=n;
if(t=='pick'){const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(660,n);o.frequency.setValueAtTime(990,n+.08);g.gain.setValueAtTime(.15*v,n);g.gain.exponentialRampToValueAtTime(.001,n+.2);o.connect(g);g.connect(AC.destination);o.start(n);o.stop(n+.2);return}
if(t==='step'){
  const len=Math.floor(AC.sampleRate*.085),buf=AC.createBuffer(1,len,AC.sampleRate),
        data=buf.getChannelData(0);
  for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);
  const source=AC.createBufferSource(),filter=AC.createBiquadFilter(),
        gain=AC.createGain();
  source.buffer=buf;filter.type='lowpass';filter.frequency.value=440;
  gain.gain.value=.15*v;
  source.connect(filter);filter.connect(gain);gain.connect(AC.destination);
  source.start(n);return;
}
if(t==='swim'){
  // Cop d'aigua curt i filtrat, amb una petita capa d'esquitx agut.
  const len=Math.floor(AC.sampleRate*.24),buf=AC.createBuffer(1,len,AC.sampleRate),data=buf.getChannelData(0);
  let low=0;
  for(let i=0;i<len;i++){
    const fade=Math.pow(1-i/len,2.4),noise=Math.random()*2-1;
    low=low*.83+noise*.17;
    data[i]=(low*.8+noise*.18)*fade;
  }
  const source=AC.createBufferSource(),filter=AC.createBiquadFilter(),gain=AC.createGain();
  source.buffer=buf;filter.type='lowpass';filter.frequency.value=1100;
  gain.gain.value=.32*v;
  source.connect(filter);filter.connect(gain);gain.connect(AC.destination);
  source.start(n);return;
}
const len=Math.floor(AC.sampleRate*({shot:.12,cannon:.35,boom:.7,hurt:.15}[t]||.2)),buf=AC.createBuffer(1,len,AC.sampleRate),d=buf.getChannelData(0);
for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);
const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=buf;f.type=t=='shot'?'highpass':'lowpass';f.frequency.value=t=='shot'?1200:t=='boom'?300:600;
g.gain.value=.5*v;s.connect(f);f.connect(g);g.connect(AC.destination);s.start(n)}
