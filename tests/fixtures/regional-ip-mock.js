// Browser-only test fixture; never included in the website build.
const actualFetch=window.fetch.bind(window);
window.fetch=(input,options)=>{
 const url=typeof input==='string'?input:input.url;
 const key=url.startsWith('https://api.country.is/')?'primary':url.startsWith('https://api.ip.sb/')?'backup':null;
 const settings=JSON.parse(sessionStorage.getItem('test-regional-responses')??'null');
 if(!key||!settings)return actualFetch(input,options);
 window.__regionalMockCalls=(window.__regionalMockCalls??0)+1;
 const body=settings[key];
 if(body==='TIMEOUT')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('Timed out','AbortError')),{once:true}));
 if(body===null)return Promise.reject(new TypeError('Mock offline lookup'));
 return Promise.resolve(new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}}));
};
