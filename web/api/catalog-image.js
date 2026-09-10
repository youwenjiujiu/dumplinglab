import {get,put} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import {requireStaff} from '../server/staff-auth.js';
import {imageId,imageType} from '../server/catalog-image-core.js';
const prefix='dumplinglab-menu-images/v1/';
export default {async fetch(req){try{
 if(req.method==='POST'){
  requireStaff({headers:{authorization:req.headers.get('authorization')}});
  const chunks=[];let size=0;for await(const c of req.body||[]){size+=c.length;if(size>2*1024*1024)return Response.json({error:'图片须小于 2 MB'},{status:413});chunks.push(Buffer.from(c))}
  const bytes=Buffer.concat(chunks),type=imageType(bytes),id=randomUUID()+'.'+type.ext;
  await put(prefix+id,bytes,{access:'private',addRandomSuffix:false,contentType:type.mime});
  return Response.json({ok:true,url:'/api/catalog-image?id='+id},{headers:{'cache-control':'no-store'}});
 }
 if(req.method==='GET'){
  const id=imageId(new URL(req.url).searchParams.get('id')),image=await get(prefix+id,{access:'private'});
  if(!image?.stream)return new Response('Not found',{status:404});
  return new Response(image.stream,{headers:{'content-type':({'jpg':'image/jpeg','png':'image/png','webp':'image/webp'})[id.split('.').pop()],'cache-control':'public, max-age=86400','x-content-type-options':'nosniff'}});
 }
 return new Response(null,{status:405,headers:{allow:'GET, POST'}});
}catch(e){return Response.json({error:e.status?e.message:'图片服务暂不可用'},{status:e.status||500,headers:{'cache-control':'no-store'}})}}};
