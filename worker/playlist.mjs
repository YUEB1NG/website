export const PLAYLIST_ID='7592316248';
const HEADERS={'User-Agent':'Mozilla/5.0','Referer':'https://music.163.com/'};
export function safeCover(value){
 const u=new URL(value);if(!/^p[1-9]\.music\.126\.net$/.test(u.hostname)||!['https:','http:'].includes(u.protocol))throw new Error('Invalid cover origin');u.protocol='https:';u.search='?param=160y160';return u.href;
}
async function upstream(url,http){
 const r=await http(url,{headers:HEADERS,signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error(`Music service HTTP ${r.status}`);const d=await r.json();if(d.code!==200)throw new Error(`Music service code ${d.code}`);return d;
}
export async function fetchPlaylist(http=fetch){
 const {playlist:p}=await upstream(`https://music.163.com/api/v6/playlist/detail?id=${PLAYLIST_ID}&n=1000&s=0`,http);
 if(!p||!Array.isArray(p.trackIds)||!p.trackIds.length||p.trackIds.length>3000)throw new Error('Playlist not publicly readable');
 const ids=[...new Set(p.trackIds.map(t=>t.id))],songs=[];
 for(let offset=0;offset<ids.length;offset+=100){
  const c=JSON.stringify(ids.slice(offset,offset+100).map(id=>({id})));
  const d=await upstream(`https://music.163.com/api/v3/song/detail?c=${encodeURIComponent(c)}`,http);
  for(const s of d.songs??[]){if(!ids.includes(s.id)||!s.al?.picUrl)continue;safeCover(s.al.picUrl);songs.push({id:s.id,name:s.name,artist:(s.ar??[]).map(a=>a.name).join(' / '),cover:s.al.picUrl.replace('http:','https:')});}
 }
 const byId=new Map(songs.map(s=>[s.id,s]));if(byId.size!==ids.length)throw new Error('Incomplete song response; keeping last good snapshot');
 return {playlistId:PLAYLIST_ID,name:p.name,total:ids.length,updatedAt:new Date().toISOString(),songs:ids.map(id=>byId.get(id))};
}
export async function refresh(bucket,http=fetch){
 // Publish atomically only after all song details pass validation.
 const snapshot=await fetchPlaylist(http);
 await bucket.put('playlist/current.json',JSON.stringify(snapshot),{httpMetadata:{contentType:'application/json'}});
 return snapshot;
}
export function publicSnapshot(snapshot){
 return {playlistId:snapshot.playlistId,name:snapshot.name,total:snapshot.total,updatedAt:snapshot.updatedAt,
 songs:snapshot.songs.map(({id,name,artist,cover})=>({id,name,artist,coverKey:cover,src:`/api/covers/${id}`}))};
}
