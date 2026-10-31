import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const types={'.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.json':'application/json; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff'};
export function createAssets(directory){
 const root=resolve(directory);
 const headers=(name)=>({'Content-Type':types[extname(name).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':extname(name)==='.html'?'no-cache':name.startsWith('/assets/')?'public, max-age=31536000, immutable':'public, max-age=3600'});
 async function errorPage(request,status){
  const acceptsHtml=(request.headers.get('accept')||'').includes('text/html');
  if(!acceptsHtml)return new Response(request.method==='HEAD'?null:status===404?'Not found':'Internal server error',{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
  try{return new Response(request.method==='HEAD'?null:await readFile(resolve(root,status+'.html')),{status,headers:{...headers(status+'.html'),'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});}
  catch{return new Response(request.method==='HEAD'?null:'Unable to load this page',{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
 }
 return {errorPage,async fetch(request){
  const url=new URL(request.url);let name;
  try{name=decodeURIComponent(url.pathname);}catch{return new Response('Bad request',{status:400});}
  if(name.includes('\\')||name.includes('\0'))return new Response('Bad request',{status:400});
  // /share is a fresh, non-redirecting crawler entry; all visitors get the same HTML.
  if(name==='/'||name==='/share'||name==='/share/')name='/index.html';
  const target=resolve(root,'.'+name);
  if(target!==root&&!target.startsWith(root+sep))return errorPage(request,404);
  try{
   if(!(await stat(target)).isFile())return errorPage(request,404);
   let bytes=await readFile(target);
   if(name==='/index.html'){
    // This mainland deployment must display its verified ICP registration.
    const footer='<a id="registration" class="registration" href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" inert>辽ICP备2026025063号-1</a>';
    bytes=Buffer.from(bytes.toString('utf8').replace('<!-- deployment-registration -->',footer));
   }
   const status=name==='/404.html'?404:name==='/500.html'?500:200;
   return new Response(request.method==='HEAD'?null:bytes,{status,headers:{...headers(name),...(status>=400?{'X-Robots-Tag':'noindex','Cache-Control':'no-store'}:{})}});
  }catch(e){if(e.code==='ENOENT'||e.code==='EISDIR')return errorPage(request,404);throw e;}
 }};
}
