import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import worker from '../../dist/server/index.js';
import {FileBucket} from './storage.mjs';

const root=resolve(fileURLToPath(new URL('../../dist/client/',import.meta.url)));
const data=resolve(process.env.YUEB1NG_DATA_DIR||fileURLToPath(new URL('../../.tools/aliyun-data/',import.meta.url)));
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff'};
const assets={async fetch(request){
 const url=new URL(request.url);let name;
 try{name=decodeURIComponent(url.pathname);}catch{return new Response('Bad request',{status:400});}
 if(name.includes('\\')||name.includes('\0'))return new Response('Bad request',{status:400});
 const target=resolve(root,'.'+(name==='/'?'/index.html':name));
 if(target!==root&&!target.startsWith(root+sep))return new Response('Not found',{status:404});
 try{
  if(!(await stat(target)).isFile())return new Response('Not found',{status:404});
  let bytes=await readFile(target);
  if(target===resolve(root,'index.html')){
   // This mainland deployment must display its verified ICP registration.
   const footer='<style>@keyframes icp-appear{from{opacity:0}to{opacity:.72}}.icp-link{position:fixed;z-index:8;left:50%;bottom:max(6px,env(safe-area-inset-bottom));transform:translateX(-50%);color:var(--ink);font:11px/1.4 sans-serif;text-decoration:none;white-space:nowrap;opacity:.72;animation:icp-appear .8s 3s both}.icp-link:hover,.icp-link:focus-visible{opacity:1;text-decoration:underline}@media(prefers-reduced-motion:reduce){.icp-link{animation:none}}</style><a class="icp-link" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">辽ICP备2026025063号-1</a>';
   bytes=Buffer.from(bytes.toString('utf8').replace('</body>',footer+'</body>'));
  }
  return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':types[extname(target).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':name.startsWith('/assets/')?'public, max-age=31536000, immutable':'public, max-age=3600'}});
 }catch(e){if(e.code==='ENOENT'||e.code==='EISDIR')return new Response('Not found',{status:404});throw e;}
}};
const env={BUCKET:new FileBucket(data),ASSETS:assets};
const server=createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const request=new Request(new URL(req.url||'/',`http://${host}:${port}`),{method:req.method,headers:req.headers});
  const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));
  if(response.body&&req.method!=='HEAD')Readable.fromWeb(response.body).pipe(res);else res.end();
 }catch(error){console.error('Request failed:',error.message);if(!res.headersSent)res.writeHead(500);res.end('Internal server error');}
});
server.listen(port,host,()=>console.log(`YUEB1NG listening on ${host}:${port}`));
