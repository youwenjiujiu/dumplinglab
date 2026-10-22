import {catalogService} from '../server/catalog-production.js';
import {requireStaff} from '../server/staff-auth.js';
import {bodyOf,fail,json,method} from '../server/http.js';
export default async function handler(req,res){try{
 if(req.method==='GET'){if(req.query?.admin==='1'){requireStaff(req);return json(res,200,{ok:true,...await catalogService.admin()})}return json(res,200,{ok:true,...await catalogService.public()})}
 if(req.method==='POST'){requireStaff(req);const input=bodyOf(req);return json(res,200,{ok:true,...await (input.action==='lunch-set-save'?catalogService.saveLunchSet(input):input.action==='create'?catalogService.create(input):input.action==='table-discount'?catalogService.saveSettings(input):catalogService.save(input))})}
 return method(res,'GET, POST');
}catch(e){return fail(res,e)}}
