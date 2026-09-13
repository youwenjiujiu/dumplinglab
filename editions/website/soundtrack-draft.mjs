// Original deterministic procedural sound-design sketch, not recorded kitchen Foley.
// No downloaded music, source-video audio, voice, or external generation API.
// Usage: node editions/website/soundtrack-draft.mjs <recording-directory>
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const dir=resolve(process.argv[2]||''); assert(process.argv[2], 'Pass recording directory');
const report=JSON.parse(await readFile(resolve(dir,'desktop-recording.json'),'utf8'));
const duration=Number(report.encoded.duration), sr=48000, length=Math.ceil(duration*sr);
const music=[new Float64Array(length),new Float64Array(length)];
const fx=[new Float64Array(length),new Float64Array(length)];
const cues=[]; let seed=718394;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const noise=()=>random()*2-1;
const hz=m=>440*2**((m-69)/12), tau=Math.PI*2;
function voice(stem,start,seconds,amp,pan,sample){
 const begin=Math.round(start*sr), n=Math.ceil(seconds*sr);
 const l=Math.cos((pan+1)*Math.PI/4),r=Math.sin((pan+1)*Math.PI/4);
 for(let i=0;i<n;i++){
  const at=begin+i;if(at<0||at>=length)continue;
  const t=i/sr, fade=Math.min(1,(seconds-t)/.024);
  const v=sample(t,i)*amp*Math.max(0,fade);
  stem[0][at]+=v*l;stem[1][at]+=v*r;
 }
}
function key(t,m,amp=.06,pan=0){
 const f=hz(m);
 voice(music,t,2.6,amp,pan,x=>{
  const attack=1-Math.exp(-x*180),env=Math.exp(-x*2.25);
  return attack*env*(Math.sin(tau*f*x+.24*Math.exp(-x*5)*Math.sin(tau*f*3*x))+.12*Math.sin(tau*f*2*x)*Math.exp(-x*3));
 });
}
function bass(t,m){
 const f=hz(m);voice(music,t,.48,.19,0,x=>(1-Math.exp(-x*200))*Math.exp(-x*6)*(Math.sin(tau*f*x)+.18*Math.sin(tau*f*2*x)));
}
function kick(t,amp=.23){voice(music,t,.27,amp,0,x=>Math.sin(tau*(49*x+1.25*(1-Math.exp(-x*35))))*(1-Math.exp(-x*1100))*Math.exp(-x*20))}
function rim(t,amp=.057,pan=.1){
 voice(music,t,.085,amp,pan,x=>(Math.sin(tau*510*x)+.48*Math.sin(tau*827*x))*Math.exp(-x*80)*(1-Math.exp(-x*1500)));
}
function shaker(t,amp,pan){let lp=0;voice(music,t,.065,amp,pan,(x)=>{const n=noise();lp+=.22*(n-lp);return(n-lp)*Math.exp(-x*65)*(1-Math.exp(-x*2000))})}
const heroes=report.chapters.filter(c=>c.view==='hero');
const beat=(heroes[1].seconds-heroes[0].seconds)/16;
// Restrained D minor 9 / Bb maj 9 / G minor 9 / A minor 7 palette.
const chords=[[53,57,60,64],[53,57,60,62],[53,57,58,62],[52,55,57,60]];
const roots=[38,34,43,33];
for(let b=0;b*beat<duration-1.2;b++){
 const t=.06+b*beat,bar=Math.floor(b/4), pos=b%4;
 const inCloseup=report.chapters.some(c=>c.view==='closeup'&&t>=c.seconds&&t<c.seconds+2.4);
 if(pos===0||pos===2)kick(t,inCloseup?.10:.17);
 if(pos===1||pos===3)rim(t,inCloseup?.027:.045);
 shaker(t+beat*.55,inCloseup?.016:.025,(b%2?.28:-.28));
 if(pos===0||pos===2)bass(t,roots[Math.floor(b/8)%4]+(pos===2?12:0));
 if(pos===0){
  const chord=chords[Math.floor(b/8)%4];
  chord.forEach((m,j)=>key(t+j*.012,m,.043,j%2?.22:-.22));
 }
 // Sparse upper answers, leaving silence for the visual cues.
 if(bar%2===1 && pos===3)key(t+beat*.52,[69,67,65,64][Math.floor(bar/2)%4],.041,.32);
}
function pop(t,index,pan){
 voice(fx,t,.15,.082,pan,x=>Math.sin(tau*((420+index*60)*x+7*(1-Math.exp(-x*22))))*Math.exp(-x*34)*(1-Math.exp(-x*950)));
}
function air(t,seconds,amp,pan){
 let lp=0;voice(fx,t,seconds,amp,pan,x=>{
  lp+=.07*(noise()-lp);return lp*Math.sin(Math.PI*x/seconds)**2;
 });
}
function ceramic(t,amp=.065){
 voice(fx,t,.48,amp,.26,x=>(1-Math.exp(-x*1800))*(Math.sin(tau*1217*x)*Math.exp(-x*19)+.38*Math.sin(tau*2119*x)*Math.exp(-x*26)));
}
for(const [index,c] of heroes.entries()){
 // Browser chapter is recorded immediately after theme state changes.
 // Existing callouts enter at 400 ms, then stagger by 85 ms.
 if(index){air(c.seconds-.20,.57,.20,index%2?.4:-.4);cues.push({seconds:c.seconds-.20,event:'soft scene-change air'});}
 for(let i=0;i<(c.course==='fried'?5:6);i++){
  const t=c.seconds+.40+i*.085;pop(t,i,i<3?-.3:.3);
  cues.push({seconds:t,event:'callout pop',course:c.course});
 }
 const close=report.chapters.find(v=>v.course===c.course&&v.view==='closeup');
 // Close-up markers are after the one-second scroll, so place glide before arrival.
 air(close.seconds-.85,.85,.16,.05);
 cues.push({seconds:close.seconds-.85,event:'close-up glide',course:c.course});
 if(c.course==='fried'){
  // Abstract, low-level dry crackle texture: NOT authentic frying Foley.
  for(let j=0;j<65;j++){
   const t=close.seconds+.08+random()*1.7;
   voice(fx,t,.022+random()*.045,.008+random()*.025,random()*.7-.35,x=>noise()*Math.exp(-x*140)*(1-Math.exp(-x*2500)));
  }
  cues.push({seconds:close.seconds,event:'synthetic crisp texture'});
 }else if(c.course==='chilli'){
  for(let j=0;j<3;j++)voice(fx,close.seconds+.15+j*.19,.23,.039,-.15,x=>Math.sin(tau*(205*x+2*(1-Math.exp(-x*17))))*Math.exp(-x*24)*(1-Math.exp(-x*500)));
  cues.push({seconds:close.seconds+.15,event:'synthetic soft liquid-like accents'});
 }else{
  ceramic(close.seconds+.12);ceramic(close.seconds+.32,.032);
  air(close.seconds+.46,.9,.08,.2);
  cues.push({seconds:close.seconds+.12,event:'synthetic bowl/chopstick accent'});
 }
 // Return scroll then tag reveal, as in the compact capture script.
 air(close.seconds+2.65,.5,.085,-.15);
}
// Resolve gently without a new beat at the end.
[50,57,60,64].forEach((m,j)=>key(duration-1.2+j*.012,m,.046,j%2?.2:-.2));
// Small stereo early reflections, not a huge reverberant room.
for(const stem of [music,fx]){
 for(const [delay,gain] of [[.073,.075],[.137,.045]]){
  const n=Math.round(delay*sr);
  for(let i=length-1;i>=n;i--){stem[0][i]+=stem[1][i-n]*gain;stem[1][i]+=stem[0][i-n]*gain;}
 }
}
const mix=[new Float64Array(length),new Float64Array(length)];
let peak=0;
for(let i=0;i<length;i++){
 const time=i/sr, fade=Math.min(1,time/.12,Math.max(0,(duration-time)/.85));
 for(let c=0;c<2;c++){music[c][i]*=fade;fx[c][i]*=fade;mix[c][i]=music[c][i]+fx[c][i];peak=Math.max(peak,Math.abs(mix[c][i]));}
}
const gain=Math.min(2.5,.78/peak);
async function wav(name,stem){
 const buf=Buffer.alloc(44+length*4);buf.write('RIFF');buf.writeUInt32LE(buf.length-8,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(2,22);buf.writeUInt32LE(sr,24);buf.writeUInt32LE(sr*4,28);buf.writeUInt16LE(4,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(length*4,40);
 for(let i=0;i<length;i++)for(let c=0;c<2;c++)buf.writeInt16LE(Math.round(Math.max(-1,Math.min(1,stem[c][i]*gain))*32767),44+i*4+c*2);
 await writeFile(resolve(dir,name),buf,{flag:'wx'});
}
await wav('custom-soundtrack-v2.wav',mix);await wav('music-stem-v2.wav',music);await wav('motion-fx-stem-v2.wav',fx);
const info={method:'Original procedural synthesis; no AI audio model, real kitchen recordings, or borrowed soundtrack.',duration,sampleRate:sr,bpm:60/beat,peakDbFS:20*Math.log10(peak*gain),cues};
await writeFile(resolve(dir,'sound-design-v2.json'),JSON.stringify(info,null,2),{flag:'wx'});
console.log(JSON.stringify(info,null,2));
