import {RequestError} from './order-core.js';
export const imageType=bytes=>{
 if(!bytes?.length||bytes.length>2*1024*1024)throw new RequestError('图片须小于 2 MB',413);
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {ext:'png',mime:'image/png'};
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {ext:'jpg',mime:'image/jpeg'};
 if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')return {ext:'webp',mime:'image/webp'};
 throw new RequestError('仅支持 JPG、PNG、WebP 图片');
};
export const imageId=id=>{if(typeof id!=='string'||!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(id))throw new RequestError('图片不存在',404);return id};
