import {rewardsService} from '../server/rewards-production.js';
import {onlineService} from '../server/online-production.js';
import {catalogService} from '../server/catalog-production.js';
import {memberService} from '../server/member-production.js';
import {requireStaff} from '../server/staff-auth.js';
import {bodyOf,fail,json,method} from '../server/http.js';
export default async function handler(req,res){
 try{
  if(req.method==='GET'&&req.query?.admin==='1'){requireStaff(req);return json(res,200,{ok:true,...await rewardsService.apologyStatus(null,await onlineService.apologyOrders())});}
  if(req.method!=='POST')return method(res,'GET, POST');
  const input=bodyOf(req);
  if(input.action==='request'){
   const member=await memberService().identity(req.headers);
   if(!member)return json(res,401,{error:'请先登录'});
   return json(res,200,{ok:true,...await rewardsService.requestApology(member.id,input.orderNo,await onlineService.apologyOrders())});
  }
  requireStaff(req);
  if(input.action!=='grant')return json(res,400,{error:'操作无效'});
  return json(res,200,{ok:true,...await rewardsService.grantApology(input,await catalogService.menu(),await onlineService.apologyOrders())});
 }catch(e){return fail(res,e);}
}
