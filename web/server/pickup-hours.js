import {RequestError} from './order-core.js';
export const DEFAULT_PICKUP_HOURS={daily:[['11:30','14:30'],['17:30','21:00']],exceptions:{}};
const minutes=s=>{if(!/^\d{2}:\d{2}$/.test(s))return NaN;const [h,m]=s.split(':').map(Number);return h<24&&m<60?h*60+m:NaN};
const dateValid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function cleanPickupHours(value){
 const windows=rows=>{if(!Array.isArray(rows)||rows.length>4)throw new RequestError('自提时段格式无效');let last=-1;return rows.map(row=>{if(!Array.isArray(row)||row.length!==2)throw new RequestError('自提时段格式无效');const [a,b]=row.map(minutes);if(!Number.isFinite(a)||!Number.isFinite(b)||a>=b||a<=last)throw new RequestError('自提时段不能重叠，结束时间须晚于开始时间');last=b;return [...row]})};
 const daily=windows(value?.daily),exceptions={};if(!value?.exceptions||typeof value.exceptions!=='object'||Array.isArray(value.exceptions)||Object.keys(value.exceptions).length>60)throw new RequestError('特殊日期设置无效');
 for(const [date,rows]of Object.entries(value.exceptions)){if(!dateValid(date))throw new RequestError('请选择有效的日期');exceptions[date]=windows(rows)}
 return {daily,exceptions};
}
export function pickupOptions(settings=DEFAULT_PICKUP_HOURS,now=new Date()){
 const sg=new Date(now.getTime()+8*3600000),today=sg.toISOString().slice(0,10),current=sg.getUTCHours()*60+sg.getUTCMinutes()+sg.getUTCSeconds()/60,days=[];
 for(let i=0;i<7;i++){const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+i);const date=d.toISOString().slice(0,10),slots=[];
 for(const [start,end]of settings.exceptions[date]??settings.daily){for(let n=minutes(start);n<=minutes(end);n+=15){if(i===0&&n<=current)continue;slots.push(String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0'))}}
 if(slots.length)days.push({date,slots});}
 return days;
}
export function checkPickupTime(input,settings,now){
 if(!pickupOptions(settings,now).some(d=>d.date===input.pickupDate&&d.slots.includes(input.pickupTime)))throw new RequestError('请选择有效的自提日期和时间');
 return {date:input.pickupDate,slot:input.pickupTime,timing:'scheduled'};
}
