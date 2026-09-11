import {memberService} from '../server/member-production.js';
import {bodyOf,fail,json} from '../server/http.js';
export default async function handler(req,res) {
 try {const result=await memberService().handle({method:req.method,headers:req.headers,query:req.query||{},body:req.method==='POST'?bodyOf(req):{}});if(result.cookies||result.cookie)res.setHeader('set-cookie',result.cookies||result.cookie);if(result.redirect){res.statusCode=302;res.setHeader('location',result.redirect);return res.end();}return json(res,200,result.body);}catch(error){return fail(res,error);}
}
