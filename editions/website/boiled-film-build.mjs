// Create gentle camera-motion loops from the generated boiled-dumpling still.
// This is not a recording or an AI-generated cooking/lifting video.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {access} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=process.argv[2];assert(source,'Pass the generated close-up PNG');
const dir=resolve('editions/website/media');
for(const [variant,w,h] of [['wide',1600,1104],['mobile',800,1000]]){
 const target=resolve(dir,`boiled-film-${variant}-v1.mp4`);
 assert(!(await access(target).then(()=>true,()=>false)),'Do not overwrite existing version: '+target);
 // Oscillating 2.2% lens push; start/end match for a smooth loop.
 const vf=`scale=2400:-2,crop=trunc(min(iw\\,ih*${w}/${h})/2)*2:trunc(min(ih\\,iw*${h}/${w})/2)*2,zoompan=z='1.015+0.011*(1-cos(2*PI*on/300))':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=300:s=${w}x${h}:fps=30,format=yuv420p`;
 execFileSync('ffmpeg',['-nostdin','-n','-hide_banner','-loglevel','error','-i',resolve(source),'-vf',vf,'-frames:v','300','-an','-c:v','libx264','-preset','slow','-crf','19','-movflags','+faststart',target]);
 execFileSync('ffmpeg',['-nostdin','-n','-hide_banner','-loglevel','error','-i',target,'-frames:v','1','-quality','92',resolve(dir,`boiled-film-${variant}-v1-poster.webp`)]);
 console.log(target);
}
