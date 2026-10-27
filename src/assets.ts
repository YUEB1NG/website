import fallback from './cover-fallback.json';
import { CoverPicker, coverKey, type Cover } from './cover-picker';
export const COVER_SLOTS=20+Math.floor(Math.random()*6);
type CoverSet={images:HTMLImageElement[];songs:Cover[];updatedAt:string;birth?:number};
const listeners=new Set<(set:CoverSet)=>void>();
const local=new Map(fallback.map(s=>[coverKey(s),s.src]));
const preparers=new Set<(image:HTMLImageElement)=>Promise<void>|void>();
let motionBusy=false,historyTimer:ReturnType<typeof setTimeout>|undefined;
export function setCoverMotionBusy(value:boolean){motionBusy=value;}
export function onPreparedCover(prepare:(image:HTMLImageElement)=>Promise<void>|void){preparers.add(prepare);}
async function waitForQuiet(){while(motionBusy)await new Promise(resolve=>setTimeout(resolve,100));}
const cache=new Map<string,Promise<HTMLImageElement>>();
const historyKey='yueb1ng-cover-history';
function readHistory():string[]{try{const a=JSON.parse(localStorage.getItem(historyKey)??'[]');return Array.isArray(a)?a.filter(x=>typeof x==='string').slice(-55):[];}catch{return [];}}
let pool:Cover[]=fallback,current:CoverSet,checking=false,started=false,orbit=false,loading=0,epoch=0;
const picker=new CoverPicker(pool,readHistory()),reserved=new Set<string>();
let ready:{song:Cover;image:HTMLImageElement}[]=[];
function saveHistory(){historyTimer=undefined;if(motionBusy){historyTimer=setTimeout(saveHistory,500);return;}try{localStorage.setItem(historyKey,JSON.stringify(picker.history));}catch{/* Private browsing can disable storage. */}}
function remember(song:Cover){picker.shown(song);if(!historyTimer)historyTimer=setTimeout(saveHistory,250);}
window.addEventListener('pagehide',()=>{motionBusy=false;saveHistory();});
async function coverImage(cover:Cover):Promise<HTMLImageElement>{
 const key=coverKey(cover);
 const hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return hit;}
 const result=(async()=>{
  const image=new Image();image.crossOrigin='anonymous';image.fetchPriority='low';
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Cover timeout')),12000);image.onload=()=>{clearTimeout(timer);resolve()};image.onerror=()=>{clearTimeout(timer);reject(new Error('Cover failed'))};image.src=local.get(key)??cover.src;});
  await waitForQuiet();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const c=canvas.getContext('2d')!;
  c.beginPath();c.arc(80,80,78,0,Math.PI*2);c.clip();const scale=Math.max(160/image.width,160/image.height);c.drawImage(image,(160-image.width*scale)/2,(160-image.height*scale)/2,image.width*scale,image.height*scale);
  const rounded=new Image();rounded.src=canvas.toDataURL('image/png');await rounded.decode();return rounded;
 })();
 cache.set(key,result);while(cache.size>160)cache.delete(cache.keys().next().value!);
 result.catch(()=>cache.delete(key));return result;
}

// Prepare a small decoded queue; keep the original motion and a random 20-25 display slots per visit.
let coversStarted=false;
let resolveCovers:(set:CoverSet)=>void,rejectCovers:(error:unknown)=>void;
export const floatingCoversReady=new Promise<CoverSet>((resolve,reject)=>{resolveCovers=resolve;rejectCovers=reject;});
export function loadFloatingCovers(){
 if(coversStarted)return;coversStarted=true;
 void (async()=>{
 const songs:Cover[]=[],used=new Set<string>(picker.uniqueCount>=picker.history.length+COVER_SLOTS?picker.history:[]);
 for(let i=0;i<Math.min(COVER_SLOTS,picker.uniqueCount);i++){const song=picker.take(used);if(!song)break;songs.push(song);used.add(coverKey(song));remember(song);}
 const images=await Promise.all(songs.map(coverImage));current={images,songs,updatedAt:''};
 fillQueue();return current;
 })().then(resolveCovers,rejectCovers);
}
export function onFloatingCovers(listener:(set:CoverSet)=>void){listeners.add(listener);}
export function setCoverOrbitMode(value:boolean){orbit=value;}
function fillQueue(){
 if(!current||document.hidden||motionBusy)return;
 while(ready.length+loading<16&&loading<3){
  const song=picker.take(new Set([...current.songs.map(coverKey),...reserved]));if(!song)break;
  const key=coverKey(song),generation=epoch;reserved.add(key);loading++;
  void coverImage(song).then(async image=>{await waitForQuiet();for(const prepare of preparers){await waitForQuiet();await prepare(image);}if(generation===epoch)ready.push({song,image});}).catch(()=>{}).finally(()=>{
   loading--;if(generation===epoch&&!ready.some(c=>coverKey(c.song)===key))reserved.delete(key);
   // A network failure must not start an unbounded retry loop.
  });
 }
}
export function refreshCoverSlot(index:number,birth=true){
 if(!current||document.hidden||orbit)return;
 const next=ready.shift();if(!next){fillQueue();return;}
 reserved.delete(coverKey(next.song));
 const images=[...current.images],songs=[...current.songs];images[index]=next.image;songs[index]=next.song;
 remember(next.song);current={...current,images,songs,birth:birth?index:undefined};listeners.forEach(listener=>listener(current));fillQueue();
}
export async function syncFloatingCovers(){
 if(checking)return;checking=true;
 try{
  await floatingCoversReady;const response=await fetch('/api/playlist',{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!response.ok)return;
  const data=await response.json();if(data.playlistId!=='7592316248'||!Array.isArray(data.songs)||!data.songs.length)return;
  const seen=new Set<number>(),songs:Cover[]=[];
  for(const s of data.songs){if(!Number.isSafeInteger(s.id)||s.src!==`/api/covers/${s.id}`||typeof s.coverKey!=='string'||seen.has(s.id))continue;seen.add(s.id);songs.push(s);}
  if(songs.length!==data.total)return;
  const changed=songs.length!==pool.length||songs.some((s,i)=>s.id!==pool[i]?.id||coverKey(s)!==coverKey(pool[i]));
  pool=songs;current.updatedAt=data.updatedAt;
  if(changed){epoch++;ready=[];reserved.clear();picker.update(pool);fillQueue();}
 }catch{/* Keep the complete saved pool when the service is unavailable. */}finally{checking=false;}
}
export function startCoverUpdates(){
 if(started)return;started=true;void syncFloatingCovers();
 setInterval(fillQueue,800);
 setInterval(()=>{if(!document.hidden)void syncFloatingCovers()},60*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){void syncFloatingCovers();fillQueue();}});
}
export function coverDiagnostics(){return current?{source:'netease-playlist',playlistId:'7592316248',updatedAt:current.updatedAt,ids:current.songs.map(s=>s.id),coverKeys:current.songs.map(coverKey),poolIds:pool.map(s=>s.id),poolCount:pool.length,uniqueCovers:picker.uniqueCount,visibleSlots:current.images.length,cachedImages:cache.size,motionBusy,prepared:ready.length,recent:picker.history}:null;}
