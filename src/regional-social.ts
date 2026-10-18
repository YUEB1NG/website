import xIcon from './icons/twitter-x-line.svg?raw';
import douyinIcon from './icons/douyin-line.svg?raw';

// IP-to-country lookup: https://github.com/lineofflight/country
// Keep only the country code in this tab, never the response's IP or other fields.
const cacheKey='yueb1ng-region-v1',ttl=5*60*1000;
const providers=[{url:'https://api.country.is/',field:'country'},{url:'https://api.ip.sb/geoip',field:'country_code'}];
const destinations={
  x:{href:'https://x.com/yueb1ng',label:'@YUEB1NG',aria:'Follow YUEB1NG on X',icon:xIcon},
  douyin:{href:'https://v.douyin.com/XjA2pCkbk6M',label:'抖音',aria:'在抖音关注悦饼',icon:douyinIcon},
};
function validCountry(value:unknown):value is string{return typeof value==='string'&&/^[A-Z]{2}$/.test(value)&&!['XX','ZZ'].includes(value);}
function cachedCountry():string|null{
  try{const entry=JSON.parse(sessionStorage.getItem(cacheKey)??'null');if(validCountry(entry?.country)&&typeof entry?.time==='number'&&Date.now()-entry.time>=0&&Date.now()-entry.time<ttl)return entry.country;}catch{}
  return null;
}
async function lookupCountry():Promise<string|null>{
  for(const provider of providers){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1600);
    try{
      const response=await fetch(provider.url,{signal:controller.signal,mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer'});
      if(!response.ok)continue;
      const country=(await response.json())?.[provider.field];
      if(validCountry(country))return country;
    }catch{/* Try the independent fallback; never block page entry on a network failure. */}
    finally{clearTimeout(timer);}
  }
  return null;
}
export function initRegionalSocial(link:HTMLAnchorElement){
  const content=link.querySelector<HTMLElement>('.social-content')!;
  let request=0,lastLookup=0,active:Promise<void>|undefined;
  let animation:Animation|undefined;
  async function refresh(force=false){
    if(active)return active;
    const cached=force?null:cachedCountry();
    if(!force&&!cached&&lastLookup&&Date.now()-lastLookup<30000)return;
    const current=++request;
    active=(async()=>{
      const country=cached??await lookupCountry();lastLookup=Date.now();
      if(current!==request)return;
      if(country&&!cached){try{sessionStorage.setItem(cacheKey,JSON.stringify({country,time:Date.now()}));}catch{}}
      const platform=country==='CN'?'douyin':'x',next=destinations[platform];
      const changing=link.dataset.regionReady==='true'&&link.dataset.platform!==platform;
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(changing&&!reduced){animation?.cancel();animation=content.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(3px)'}],{duration:160,fill:'forwards'});await animation.finished.catch(()=>{});}
      if(current!==request)return;
      link.href=next.href;link.setAttribute('aria-label',next.aria);
      content.querySelector('.social-icon')!.innerHTML=next.icon.replace('<svg ','<svg aria-hidden="true" focusable="false" ');
      content.querySelector('.social-account')!.textContent=next.label;
      link.dataset.platform=platform;link.dataset.regionReady='true';
      animation?.cancel();
      if(changing&&!reduced)animation=content.animate([{opacity:0,transform:'translateY(-3px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)'});
    })();
    try{await active;}finally{active=undefined;}
  }
  void refresh();
  window.addEventListener('online',()=>{void refresh(true);});
  window.addEventListener('pageshow',e=>{if(e.persisted)void refresh();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Date.now()-lastLookup>ttl)void refresh();});
}
