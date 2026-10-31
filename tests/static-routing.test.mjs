import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createAssets} from '../deploy/aliyun/assets.mjs';
const assets=createAssets(fileURLToPath(new URL('../public/',import.meta.url)));
const request=(path,accept='text/html',method='GET')=>new Request('https://example.test'+path,{method,headers:{accept}});
test('unknown navigation returns a real themed 404, not a successful homepage',async()=>{
 const response=await assets.fetch(request('/missing-page'));
 assert.equal(response.status,404);
 assert.match(response.headers.get('content-type'),/text\/html/);
 assert.equal(response.headers.get('x-robots-tag'),'noindex');
 assert.match(await response.text(),/Lost in a little space/);
});
test('HEAD and missing assets keep HTTP semantics',async()=>{
 const head=await assets.fetch(request('/missing-page','text/html','HEAD'));
 assert.equal(head.status,404);assert.equal(await head.text(),'');
 const js=await assets.fetch(request('/assets/missing.js','*/*'));
 assert.equal(js.status,404);assert.match(js.headers.get('content-type'),/text\/plain/);
 assert.doesNotMatch(await js.text(),/<html/);
});
test('500 and explicit 404 documents cannot be indexed as successful content',async()=>{
 for(const status of [404,500]){
  const response=await assets.fetch(request('/'+status+'.html'));
  assert.equal(response.status,status);assert.equal(response.headers.get('x-robots-tag'),'noindex');
 }
 const response=await assets.errorPage(request('/'),500);
 assert.equal(response.status,500);assert.match(await response.text(),/A small pause in orbit/);
});
test('malformed paths are rejected and recovery links do not echo the URL',async()=>{
 assert.equal((await assets.fetch(request('/%ZZ'))).status,400);
 assert.equal((await assets.fetch(request('/%5Cwindows'))).status,400);
 const response=await assets.fetch(request('/%3Cscript%3Ealert(1)%3C/script%3E'));
 assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/alert\(1\)/);
});
test('share image and sitemap use explicit content types with HEAD support',async()=>{
 for(const [path,type] of [['/social/yueb1ng-card-v2.png','image/png'],['/sitemap.xml','application/xml']]){
  const response=await assets.fetch(request(path,'*/*','HEAD'));
  assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith(type));assert.equal(await response.text(),'');
 }
});

test('fresh share entry returns identical homepage metadata without redirect',async()=>{
 const built=createAssets(fileURLToPath(new URL('../dist/client/',import.meta.url)));
 const home=await built.fetch(request('/'));
 const share=await built.fetch(request('/share'));
 assert.equal(home.status,200);assert.equal(share.status,200);
 assert.equal(await share.text(),await home.text());
 assert.equal(share.headers.get('location'),null);
});
