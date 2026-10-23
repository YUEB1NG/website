import fallback from './cover-fallback.json';
export const COVER_SLOTS=24;
type Cover={id:number;name:string;src:string;coverKey:string};
type CoverSet={images:HTMLImageElement[];songs:Cover[];updatedAt:string};
const listeners=new Set<(set:CoverSet)=>void>();
const local=new Map(fallback.map(s=>[s.coverKey,s.src]));
const cache=new Map<string,Promise<HTMLImageElement>>();
let pool:Cover[]=fallback,current:CoverSet,cursor=COVER_SLOTS,slot=0,checking=false,rotating=false,started=false;
async function coverImage(cover:Cover):Promise<HTMLImageElement>{
 const key=cover.coverKey;
 const hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return hit;}
 const result=(async()=>{
  const image=new Image();image.crossOrigin='anonymous';
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Cover timeout')),12000);image.onload=()=>{clearTimeout(timer);resolve()};image.onerror=()=>{clearTimeout(timer);reject(new Error('Cover failed'))};image.src=local.get(key)??cover.src;});
  const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const c=canvas.getContext('2d')!;
  c.beginPath();c.arc(80,80,78,0,Math.PI*2);c.clip();const scale=Math.max(160/image.width,160/image.height);c.drawImage(image,(160-image.width*scale)/2,(160-image.height*scale)/2,image.width*scale,image.height*scale);
  const rounded=new Image();rounded.src=canvas.toDataURL('image/png');await rounded.decode();return rounded;
 })();
 cache.set(key,result);while(cache.size>48)cache.delete(cache.keys().next().value!);
 result.catch(()=>cache.delete(key));return result;
}
// Every song remains in the pool, including songs sharing an album cover.
// A small fixed set of sprites is resident, with bounded image/texture memory.
export const floatingCoversReady=(async()=>{
 const songs=Array.from({length:COVER_SLOTS},(_,i)=>pool[i%pool.length]);
 const images=await Promise.all(songs.map(coverImage));current={images,songs,updatedAt:''};return current;
})();
export function onFloatingCovers(listener:(set:CoverSet)=>void){listeners.add(listener);}
async function rotateCover(){
 if(rotating||document.hidden)return;rotating=true;
 try{
  await floatingCoversReady;const song=pool[cursor%pool.length];cursor=(cursor+1)%pool.length;
  const image=await coverImage(song),i=slot++%current.songs.length;
  const images=[...current.images],songs=[...current.songs];images[i]=image;songs[i]=song;
  current={...current,images,songs};listeners.forEach(listener=>listener(current));
  // Decode upcoming covers before their turn; never upload 130 GPU textures together.
  for(let next=0;next<3;next++)void coverImage(pool[(cursor+next)%pool.length]).catch(()=>{});
 }catch{/* Keep the displayed cover if the replacement failed. */}finally{rotating=false;}
}
export async function syncFloatingCovers(){
 if(checking)return;checking=true;
 try{
  await floatingCoversReady;const response=await fetch('/api/playlist',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!response.ok)return;
  const data=await response.json();if(data.playlistId!=='7592316248'||!Array.isArray(data.songs)||!data.songs.length)return;
  const seen=new Set<number>(),songs:Cover[]=[];
  for(const s of data.songs){if(!Number.isSafeInteger(s.id)||s.src!==`/api/covers/${s.id}`||typeof s.coverKey!=='string'||seen.has(s.id))continue;seen.add(s.id);songs.push(s);}
  if(songs.length!==data.total)return;
  const nextId=pool[cursor%pool.length]?.id;pool=songs;cursor=Math.max(0,pool.findIndex(s=>s.id===nextId));current.updatedAt=data.updatedAt;
 }catch{/* Keep the complete saved pool when the service is unavailable. */}finally{checking=false;}
}
export function startCoverUpdates(){
 if(started)return;started=true;void syncFloatingCovers();
 setInterval(()=>void rotateCover(),2800);
 setInterval(()=>{if(!document.hidden)void syncFloatingCovers()},60*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void syncFloatingCovers()});
}
export function coverDiagnostics(){return current?{source:'netease-playlist',playlistId:'7592316248',updatedAt:current.updatedAt,ids:current.songs.map(s=>s.id),poolIds:pool.map(s=>s.id),poolCount:pool.length,visibleSlots:current.images.length,cachedImages:cache.size}:null;}
