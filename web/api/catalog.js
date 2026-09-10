import {catalogService} from '../server/catalog-production.js';
import {requireStaff} from '../server/staff-auth.js';
import {bodyOf,fail,json,method} from '../server/http.js';
export default async function handler(req,res){try{
 if(req.method==='GET'){if(req.query?.admin==='1'){requireStaff(req);return json(res,200,{ok:true,...await catalogService.admin()})}return json(res,200,{ok:true,...await catalogService.public()})}
 if(req.method==='POST'){requireStaff(req);return json(res,200,{ok:true,...await catalogService.save(bodyOf(req))})}
 return method(res,'GET, POST');
}catch(e){return fail(res,e)}}
