import {createMemberService} from '../server/member-core.js';
import {bodyOf,fail,json} from '../server/http.js';
export default async function handler(req,res) {
  try {
    const service=createMemberService({origin:process.env.DL_MEMBER_ORIGIN,authUrl:process.env.CANCAN_APP_SUPABASE_URL,anonKey:process.env.CANCAN_APP_SUPABASE_ANON});
    const result=await service.handle({method:req.method,headers:req.headers,body:req.method==='POST'?bodyOf(req):{}});
    if(result.cookie)res.setHeader('set-cookie',result.cookie);
    return json(res,200,result.body);
  } catch(error) {return fail(res,error);}
}
