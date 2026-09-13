// Responsive encodes of approved source assets: no compositing or food changes.
// Keep the inspected 1254 px sources; only add 800 px mobile delivery variants.
import sharp from 'sharp';
import {stat} from 'node:fs/promises';
for(const name of ['hero-potstickers-v1','hero-chilli-wontons-v1','hero-wonton-noodles-v2']){
 const source=new URL(`./media/${name}.png`,import.meta.url);
 const target=new URL(`./media/${name}-800.webp`,import.meta.url);
 await sharp(source.pathname).resize({width:800,withoutEnlargement:true}).webp({quality:91,alphaQuality:100,effort:6}).toFile(target.pathname);
 console.log(name,800,(await stat(target)).size);
}
// The original 5259 px wordmark is untouched. This lossless delivery copy is
// sufficient for the header's 140 CSS px maximum, including 3× displays.
const logo=new URL('./media/brand-wordmark-480.webp',import.meta.url);
await sharp(new URL('../../web/brand/dumpling-lab-primary.png',import.meta.url).pathname).resize({width:480}).webp({lossless:true,effort:6}).toFile(logo.pathname);
console.log('brand-wordmark',480,(await stat(logo)).size);
// Small desktop-only ingredient accent; preserve the generated alpha channel.
const chilli=new URL('./media/ingredient-chilli-v1.webp',import.meta.url);
await sharp(new URL('./media/ingredient-chilli-v1.png',import.meta.url).pathname).resize({width:360,withoutEnlargement:true}).webp({quality:90,alphaQuality:100,effort:6}).toFile(chilli.pathname);
console.log('ingredient-chilli',360,(await stat(chilli)).size);
// Reuse the existing packaging symbol without redrawing its artwork.
const favicon=new URL('./media/brand-favicon.png',import.meta.url);
await sharp(new URL('../../web/brand/dumpling.png',import.meta.url).pathname).resize(64,64,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(favicon.pathname);
console.log('brand-favicon',64,(await stat(favicon)).size);
