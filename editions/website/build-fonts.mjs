// Rebuild the committed display webfonts after changing campaign copy.
// Requires the locally installed fontTools + brotli; no network requests.
import {readFile,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=fileURLToPath(new URL('.',import.meta.url));
const copy=(await Promise.all(['index.html','stage.js'].map(f=>readFile(here+f,'utf8')))).join('\n');
for(const [input,output,subset] of [
 ['ZCOOLKuaiLe-Regular.ttf','KuaiLe-Campaign-subset-v1.woff2','--text='+copy],
 ['LilitaOne-Regular.ttf','LilitaOne-Regular.woff2','--glyphs=*']
]){
 execFileSync('python3',['-m','fontTools.subset',here+'fonts/'+input,subset,'--flavor=woff2','--output-file='+here+'fonts/'+output],{stdio:'inherit'});
 console.log(output,(await stat(here+'fonts/'+output)).size,'bytes');
}
