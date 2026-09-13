// Editorial motion film from generated stills, not generated-video footage.
// Keep original PNGs intact. Only encode delivery images and camera-motion video.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const run=promisify(execFile),media=resolve(dirname(fileURLToPath(import.meta.url)),'media');
for(const name of ['campaign-wide-v1','campaign-macro-v1'])await sharp(resolve(media,name+'.png')).webp({quality:90}).toFile(resolve(media,name+'.webp'));
const film=async(width,height,name)=>{
 const w=width*2,h=height*2;
 const shot=(input,frames,zoom,label)=>`[${input}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}:x='(iw-ow)*${width<height?.64:.5}':y='(ih-oh)*0.5',zoompan=z='${zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${frames}:s=${width}x${height}:fps=24,format=yuv420p,setsar=1,settb=AVTB[${label}]`;
 const filter=[shot(0,144,'1+0.08*on/143','a'),shot(1,96,'1.12-0.08*on/95','b'),shot(2,72,'1.08-0.08*on/71','c'),'[a][b]xfade=transition=fade:duration=0.5:offset=5.5[ab]','[ab][c]xfade=transition=fade:duration=0.5:offset=9[out]'].join(';');
 const args=['-hide_banner','-loglevel','error','-y','-i',resolve(media,'campaign-wide-v1.png'),'-i',resolve(media,'campaign-macro-v1.png'),'-i',resolve(media,'campaign-wide-v1.png'),'-filter_complex_threads','1','-filter_complex',filter,'-map','[out]','-an','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart','-t','12',resolve(media,name)];
 await run('ffmpeg',args,{maxBuffer:1024*1024});
 await run('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',resolve(media,name),'-frames:v','1','-quality','90',resolve(media,name.replace('.mp4','-poster.webp'))]);
 console.log(name);
};
await Promise.all([film(1600,900,'dumpling-film-wide-v1.mp4'),film(720,1080,'dumpling-film-mobile-v1.mp4')]);
