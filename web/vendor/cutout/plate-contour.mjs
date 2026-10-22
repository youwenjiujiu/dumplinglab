// Recover a solid, convex dish silhouette from real rim pixels, including
// tilted plates. Never use an axis-aligned ellipse to replace a photographed rim.
export function convexHull(points) {
  const sorted=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  if(sorted.length<3)return sorted;
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half=ps=>{const h=[];for(const p of ps){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p)}return h};
  return [...half(sorted).slice(0,-1),...half([...sorted].reverse()).slice(0,-1)];
}
export function insideContour(x,y,hull,padding=0) {
  for(let j=0;j<hull.length;j++){
    const a=hull[j],b=hull[(j+1)%hull.length],dx=b[0]-a[0],dy=b[1]-a[1];
    if(dx*(y-a[1])-dy*(x-a[0]) < -padding*Math.hypot(dx,dy))return false;
  }
  return hull.length>=3;
}
export function plateContour(rgba,mask,subject,size) {
  const pixels=size*size,border=[];
  for(let x=0;x<size;x+=8)border.push(x,(size-1)*size+x);
  for(let y=0;y<size;y+=8)border.push(y*size,y*size+size-1);
  const chroma=i=>{const r=rgba[i*4],g=rgba[i*4+1],b=rgba[i*4+2],m=Math.min(r,g,b);return [r-m,g-m,b-m]};
  const bg=[0,1,2].map(ch=>border.map(i=>chroma(i)[ch]).sort((a,b)=>a-b)[Math.floor(border.length/2)]);
  const neutral=i=>{const c=chroma(i);return Math.min(rgba[i*4],rgba[i*4+1],rgba[i*4+2])>=185&&Math.max(...c)<=36&&c.some((v,ch)=>Math.abs(v-bg[ch])>8)};
  const visited=new Uint8Array(pixels),queue=new Int32Array(pixels);let rim=[];
  for(let start=0;start<pixels;start++){
    if(visited[start]||!neutral(start))continue;
    let head=0,tail=1,touchesFrame=false;queue[0]=start;visited[start]=1;
    while(head<tail){const i=queue[head++],x=i%size,y=Math.floor(i/size);if(x<3||y<3||x>size-4||y>size-4)touchesFrame=true;
      for(const n of [x?i-1:-1,x<size-1?i+1:-1,y?i-size:-1,y<size-1?i+size:-1])if(n>=0&&!visited[n]&&neutral(n)){visited[n]=1;queue[tail++]=n}}
    if(!touchesFrame&&tail>rim.length)rim=Array.from(queue.subarray(0,tail));
  }
  if(rim.length<pixels*.015)return null;
  const points=rim.map(i=>[i%size,Math.floor(i/size)]);
  const bounds=indices=>indices.reduce((b,i)=>[Math.min(b[0],i%size),Math.min(b[1],Math.floor(i/size)),Math.max(b[2],i%size),Math.max(b[3],Math.floor(i/size))],[size,size,0,0]);
  const rb=bounds(rim),sb=bounds(subject);
  if((rb[2]-rb[0])*(rb[3]-rb[1]) < (sb[2]-sb[0])*(sb[3]-sb[1])*.55)return null;
  if(points.some(([x,y])=>x<3||y<3||x>size-4||y>size-4))return null;
  // Include confidently detected coloured rims, but exclude backdrop-coloured
  // model halos and shadows. Fill their interior so white china cannot have holes.
  for(const i of subject)if(mask[i]>=160&&chroma(i).some((v,ch)=>Math.abs(v-bg[ch])>7))points.push([i%size,Math.floor(i/size)]);
  const hull=convexHull(points),padding=3;
  if(subject.filter(i=>insideContour(i%size,Math.floor(i/size),hull,padding)).length<subject.length*.94)return null;
  // A decorated rim provides a stronger boundary than pale ceramic. Its outer
  // convex envelope traces the full ellipse even when white rim pixels vanish.
  const decorated=[];
  for(const i of subject){const r=rgba[i*4],g=rgba[i*4+1],b=rgba[i*4+2];if(r>120&&r-g>65&&r-b>35)decorated.push([i%size,Math.floor(i/size)])}
  if(decorated.length>pixels*.008){
    const curve=ellipseContour(convexHull(decorated),4);
    if(curve&&rim.filter(i=>insideContour(i%size,Math.floor(i/size),curve,1)).length>rim.length*.98&&subject.filter(i=>insideContour(i%size,Math.floor(i/size),curve,1)).length>subject.length*.97)return {hull:curve,padding:1,curved:true};
  }
  // For undecorated plates, fit the observed rim and retain every reliable rim
  // point. Reject fits that would require a large expansion of the real shape.
  let curve=ellipseContour(hull,2);
  if(curve){
    const retained=hull.filter(([x,y])=>insideContour(x,y,curve,2)).length/hull.length;
    if(retained>.95)return {hull:curve,padding:2,curved:true};
  }
  return {hull,padding};
}

// Least-squares conic fit in normalized coordinates. Works for a photographed,
// rotated ellipse; missing small rim sections do not become straight chords.
export function ellipseContour(points,margin=0) {
  if(points.length<8)return null;
  const rows=points.map(([x,y])=>{x=(x-160)/160;y=(y-160)/160;return [x*x,x*y,y*y,x,y]});
  const m=Array.from({length:5},(_,i)=>[...Array.from({length:5},(_,j)=>rows.reduce((s,r)=>s+r[i]*r[j],0)),rows.reduce((s,r)=>s+r[i],0)]);
  for(let i=0;i<5;i++){
    let pivot=i;for(let j=i+1;j<5;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;
    [m[i],m[pivot]]=[m[pivot],m[i]];const v=m[i][i];if(Math.abs(v)<1e-9)return null;
    for(let k=i;k<6;k++)m[i][k]/=v;
    for(let j=0;j<5;j++)if(j!==i){const f=m[j][i];for(let k=i;k<6;k++)m[j][k]-=f*m[i][k]}
  }
  const [a,b,c,d,e]=m.map(r=>r[5]),det=4*a*c-b*b;
  if(det<=1e-8)return null;
  const cx=(b*e-2*c*d)/det,cy=(b*d-2*a*e)/det;
  const k=1+a*cx*cx+b*cx*cy+c*cy*cy;
  const discriminant=Math.hypot(a-c,b),l1=(a+c+discriminant)/2,l2=(a+c-discriminant)/2;
  if(k/l1<=0||k/l2<=0)return null;
  const rx=160*Math.sqrt(k/l1)+margin,ry=160*Math.sqrt(k/l2)+margin,angle=Math.atan2(b,a-c)/2;
  if(Math.min(rx,ry)<12||Math.max(rx,ry)>155||Math.max(rx,ry)/Math.min(rx,ry)>3.5)return null;
  return Array.from({length:256},(_,i)=>{const t=i*Math.PI/128,x=rx*Math.cos(t),y=ry*Math.sin(t);return [160+cx*160+x*Math.cos(angle)-y*Math.sin(angle),160+cy*160+x*Math.sin(angle)+y*Math.cos(angle)]});
}
