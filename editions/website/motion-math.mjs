export const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:0));
export const smooth=value=>{const t=clamp(value);return t*t*(3-2*t)};
export const scrollProgress=(top,height,viewport)=>clamp(-top/Math.max(1,height-viewport));
export function cameraPose(progress,pointerX=0,pointerY=0,narrow=false){
 const t=smooth(progress),x=clamp(pointerX,-1,1),y=clamp(pointerY,-1,1);
 return {x:(narrow?.12:.62)*(1-t)+x*.07,y:-.08-y*.055,z:5.5-.65*t,rx:.03+y*.025,ry:-.18+.26*t+x*.035,rz:.065-.095*t,scale:(narrow?1.03:1)+.15*t};
}
export const shouldPlay=({paused,visible,hidden})=>!paused&&visible&&!hidden;
// Exponential settling uses elapsed time rather than a per-frame fraction,
// keeping the same feel on 60 Hz and 120 Hz displays.
export function settleValue(current,target,elapsed=1000/60){
 const next=current+(target-current)*(1-Math.exp(-13.4*clamp(elapsed,1,64)/1000));
 return Math.abs(target-next)<.0005?target:next;
}
// D45: one food cutout is retained across both spatial chapters.
export function stagePose(progress,width,height,narrow=false,still=false){
 // On phones the food must vacate the copy band before near-view text becomes
 // readable. Desktop has a separate text column and retains its slower camera.
 const p=clamp(progress),t=still?(p>=.35?1:0):smooth(narrow?p/.28:(p-.08)/.58);
 // Narrow screens share the same text band, unlike the desktop's side column.
 // Hand it over after the large title recedes, while the food clears above it.
 const intro=still?1-t:1-smooth(p/(narrow?.22:.27));
 const detail=still?t:smooth(narrow?(p-.16)/.2:(p-.12)/.26);
 return {x:width*(narrow?.1:.19)*t,y:height*(narrow?-.16:.055)*t,
  scale:1+(narrow?-.18:.2)*t,turn:-8+20*t,intro,detail,
  detailY:32*(1-detail),titleY:-height*.13*t,orbit:width*.15*t};
}
export function nextCourseIndex(current,step,enabled){
 if(!enabled.length)return -1;
 const at=enabled.indexOf(current);
 return enabled[(Math.max(0,at)+step%enabled.length+enabled.length)%enabled.length];
}
