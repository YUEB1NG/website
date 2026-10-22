import seed from './playlist-seed.json';
import { refresh, publicSnapshot, safeCover } from './playlist.mjs';
type Env={ASSETS:Fetcher;BUCKET:R2Bucket;PLAYLIST_UPDATER_TOKEN?:string};
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function snapshot(env:Env){const saved=await env.BUCKET.get('playlist/current.json');return saved?await saved.json<typeof seed>():seed;}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const u=new URL(request.url);
  if(u.pathname==='/api/playlist/refresh'){
   if(request.method!=='POST')return json({error:'Method not allowed'},405);
   if(!env.PLAYLIST_UPDATER_TOKEN||request.headers.get('X-Playlist-Update-Token')!==env.PLAYLIST_UPDATER_TOKEN)return json({error:'Unauthorized'},401);
   try{const data=await refresh(env.BUCKET);return json({ok:true,playlistId:data.playlistId,total:data.total,updatedAt:data.updatedAt});}
   catch(error){console.error('Playlist refresh failed',String(error));return json({error:'Upstream unavailable; previous snapshot retained'},502);}
  }
  if(u.pathname==='/api/playlist'){
   if(request.method!=='GET')return json({error:'Method not allowed'},405);
   return json(publicSnapshot(await snapshot(env)));
  }
  const match=u.pathname.match(/^\/api\/covers\/(\d+)$/);
  if(match){
   if(request.method!=='GET')return new Response(null,{status:405});
   const data=await snapshot(env),song=data.songs.find(s=>String(s.id)===match[1]);if(!song)return new Response(null,{status:404});
   const url=safeCover(song.cover);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url))),b=>b.toString(16).padStart(2,'0')).join('');
   const key=`covers/${hash}`,cached=await env.BUCKET.get(key);
   if(cached)return new Response(cached.body,{headers:{'Content-Type':cached.httpMetadata?.contentType??'image/jpeg','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
   try{
    const response=await fetch(url,{headers:{Referer:'https://music.163.com/'},signal:AbortSignal.timeout(12000)});
    const type=response.headers.get('content-type')??'';if(!response.ok||!/^image\/(jpeg|jpg|png|webp)/.test(type))throw new Error('Invalid cover');
    const bytes=await response.arrayBuffer();if(bytes.byteLength>2000000)throw new Error('Cover too large');
    await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:type}});
    return new Response(bytes,{headers:{'Content-Type':type,'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
   }catch{return new Response(null,{status:502});}
  }
  if(u.pathname.startsWith('/api/'))return json({error:'Not found'},404);
  return env.ASSETS.fetch(request);
 }
};
