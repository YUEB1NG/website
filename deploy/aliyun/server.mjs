import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import worker from '../../dist/server/index.js';
import {FileBucket} from './storage.mjs';
import {createAssets} from './assets.mjs';

const root=resolve(fileURLToPath(new URL('../../dist/client/',import.meta.url)));
const data=resolve(process.env.YUEB1NG_DATA_DIR||fileURLToPath(new URL('../../.tools/aliyun-data/',import.meta.url)));
const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
const assets=createAssets(root);
const env={BUCKET:new FileBucket(data),ASSETS:assets};
const server=createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
  const request=new Request(new URL(req.url||'/',`http://${host}:${port}`),{method:req.method,headers:req.headers});
  const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));
  if(response.body&&req.method!=='HEAD')Readable.fromWeb(response.body).pipe(res);else res.end();
 }catch(error){console.error('Request failed:',error.message);if(!res.headersSent){const fallback=await assets.errorPage(new Request('http://localhost/',{method:req.method==='HEAD'?'HEAD':'GET',headers:req.headers}),500);res.writeHead(500,Object.fromEntries(fallback.headers));res.end(req.method==='HEAD'?'':await fallback.text());}else res.end();}
});
server.listen(port,host,()=>console.log(`YUEB1NG listening on ${host}:${port}`));
