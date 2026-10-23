import fallback from './cover-fallback.json';
import { CoverDeck, coverIdentity, type Cover } from './cover-deck';
type CoverSet={images:HTMLImageElement[];songs:Cover[];updatedAt:string};
const listeners=new Set<(set:CoverSet)=>void>();
const local=new Map(fallback.map(s=>[coverIdentity(s),s.src]));
const cache=new Map<string,Promise<HTMLImageElement>>();
let pool:Cover[]=fallback,current:CoverSet,slot=0,checking=false,started=false,coverOrbit=false,freeSlots=20;
const deck=new CoverDeck(pool),reserved=new Set<string>(),pendingSlots=new Set<number>();
let loading=0;
async function coverImage(cover:Cover):Promise<HTMLImageElement>{
 const key=coverIdentity(cover);
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
// All songs remain eligible; identical album artwork cannot occupy two slots at once.
export const floatingCoversReady=(async()=>{
 const songs:Cover[]=[],used=new Set<string>();
 for(let i=0;i<Math.min(20,deck.uniqueCount);i++){const song=deck.take(used);if(!song)break;songs.push(song);used.add(coverIdentity(song));}
 const images=await Promise.all(songs.map(coverImage));current={images,songs,updatedAt:''};return current;
})();
export function onFloatingCovers(listener:(set:CoverSet)=>void){listeners.add(listener);}
export function refreshCoverSlot(index:number){
 queueCover(index);
}
function queueCover(index:number){
 if(!current||pendingSlots.has(index)||document.hidden)return;
 pendingSlots.add(index);void replaceCover(index);
}
async function replaceCover(index:number){
 if(loading>=4){pendingSlots.delete(index);return;}
 const blocked=new Set([...current.songs.filter((_,i)=>coverOrbit||i<freeSlots).map(coverIdentity),...reserved]);
 const song=deck.take(blocked);if(!song){pendingSlots.delete(index);return;}
 const key=coverIdentity(song);reserved.add(key);loading++;
 try{
  const held=current.songs.findIndex(s=>coverIdentity(s)===key);
  const image=held>=0?current.images[held]:await coverImage(song);
  const images=[...current.images],songs=[...current.songs];
  // Reuse a hidden orbit slot by swapping, so it remains eligible for free flight
  // without duplicating artwork when the orbit is opened later.
  const other=songs.findIndex((s,i)=>i!==index&&coverIdentity(s)===key);
  if(other>=0){images[other]=images[index];songs[other]=songs[index];}
  images[index]=image;songs[index]=song;
  current={...current,images,songs};listeners.forEach(listener=>listener(current));
  for(const next of deck.peek(3))void coverImage(next).catch(()=>{});
 }catch{/* Keep the displayed cover if the replacement failed. */}
 finally{reserved.delete(key);pendingSlots.delete(index);loading--;}
}
export async function syncFloatingCovers(){
 if(checking)return;checking=true;
 try{
  await floatingCoversReady;const response=await fetch('/api/playlist',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!response.ok)return;
  const data=await response.json();if(data.playlistId!=='7592316248'||!Array.isArray(data.songs)||!data.songs.length)return;
  const seen=new Set<number>(),songs:Cover[]=[];
  for(const s of data.songs){if(!Number.isSafeInteger(s.id)||s.src!==`/api/covers/${s.id}`||typeof s.coverKey!=='string'||seen.has(s.id))continue;seen.add(s.id);songs.push(s);}
  if(songs.length!==data.total)return;
  const changed=songs.length!==pool.length||songs.some((s,i)=>s.id!==pool[i]?.id||coverIdentity(s)!==coverIdentity(pool[i]));
  pool=songs;if(changed)deck.update(pool);current.updatedAt=data.updatedAt;
 }catch{/* Keep the complete saved pool when the service is unavailable. */}finally{checking=false;}
}
export function setFreeCoverSlots(value:number){if(freeSlots!==value){freeSlots=value;deck.update(pool);}}
export function setCoverOrbitMode(value:boolean){coverOrbit=value;}
export function startCoverUpdates(){
 if(started)return;started=true;void syncFloatingCovers();
 setInterval(()=>{if(current&&coverOrbit)queueCover(slot++%current.songs.length)},4600);
 setInterval(()=>{if(!document.hidden)void syncFloatingCovers()},60*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void syncFloatingCovers()});
}
export function coverDiagnostics(){return current?{source:'netease-playlist',playlistId:'7592316248',updatedAt:current.updatedAt,ids:current.songs.map(s=>s.id),poolIds:pool.map(s=>s.id),poolCount:pool.length,uniqueCovers:deck.uniqueCount,visibleCoverKeys:current.songs.map(coverIdentity),visibleSlots:current.images.length,cachedImages:cache.size}:null;}
