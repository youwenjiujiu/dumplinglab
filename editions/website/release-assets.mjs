// Explicit delivery assets. Source artwork, old designs and review evidence
// remain in the workspace, never copied into the public website package.
export const websiteFiles=['site.css','site.js','website-catalog.js','motion-math.mjs','stage.css','stage.js','campaign.css'];
export const websiteFonts=['LilitaOne-Regular.woff2','KuaiLe-Campaign-subset-v1.woff2','LilitaOne-OFL.txt','ZCOOLKuaiLe-OFL.txt'];
export const websiteMedia=[
 ...['roll','fill','fold','boil','serve'].flatMap(step=>[`kitchen-${step}-v1.webp`,`kitchen-${step}-v1-800.webp`]),
 ...['dumpling','plate','sauce','chopsticks'].map(name=>`pick-${name}-v1.webp`),
 'pick-chopstick-far-v1.webp','pick-chopstick-near-v1.webp',
 'brand-dumpling.webp','brand-favicon.png','brand-wordmark-480.webp','brand-dinein.svg','brand-takeaway.svg','ingredient-chilli-v1.webp',
 'ingredient-chives-v2.webp','ingredient-noodles-v1.webp','ingredient-prawn-v2.webp','ingredient-chilli-oil-v1.webp',
 'ingredient-pork-v1.webp','ingredient-wrappers-v1.webp','ingredient-century-egg-v1.webp','ingredient-scallions-v1.webp',
'hero-century-egg-noodles-v3.webp','hero-century-egg-noodles-v3-800.webp',
 ...['hero-potstickers-v1','hero-chilli-wontons-v1','hero-wonton-noodles-v2'].flatMap(name=>[name+'.webp',name+'-800.webp']),
 ...['wide','mobile'].flatMap(size=>[`boiled-film-${size}-v1.mp4`,`boiled-film-${size}-v1-poster.webp`]),
 'hero-callout-pops-5-source-v1.wav','hero-callout-pops-6-source-v1.wav','hero-closeup-glide-source-v1.wav','dumpling-cursor-v1.png','pick-dumpling-dipped-v1.webp',
];
