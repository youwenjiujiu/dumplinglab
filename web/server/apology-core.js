import {createHash} from 'node:crypto';
import {RequestError} from './order-core.js';
export const APOLOGY_DAY='2026-10-28';
export const apologyEligible=o=>Number.isFinite(Date.parse(o?.paidAt||o?.at))&&o?.type==='order'&&o.mode==='dinein'&&o.status==='paid'&&Number(o.total)>0&&!o.freeRewardRefunded&&(o.refundedCents||0)<Math.round(o.total*100)&&new Date(Date.parse(o.paidAt||o.at)+8*3600000).toISOString().slice(0,10)===APOLOGY_DAY;
export const apologyId=memberId=>'apology-20261028-'+createHash('sha256').update(memberId).digest('hex').slice(0,40);
export function apologyReward(input,catalog){
 const d=catalog.find(d=>d.id===input.dishId),v=d?.variants?.[input.style];
 if(!d||d.active===false||d.kind!=='dumpling'||!v||v.pieces!==5||v.prep!=='boiled'||v.noodles||v.legacy)throw new RequestError('请选择在售的5颗白煮水饺规格',400);
 return {dishId:d.id,style:input.style,title:'致歉券 · 5颗水饺'};
}
