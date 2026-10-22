import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPlaylist, refresh, safeCover, publicSnapshot } from '../worker/playlist.mjs';
const ids=Array.from({length:130},(_,i)=>i+1);
function source(incomplete=false){return async url=>{
 if(url.includes('/playlist/detail'))return Response.json({code:200,playlist:{name:'Test',trackIds:ids.map(id=>({id}))}});
 const batch=JSON.parse(new URL(url).searchParams.get('c'));
 return Response.json({code:200,songs:batch.filter(s=>!incomplete||s.id!==130).reverse().map(({id})=>({id,name:'Song '+id,al:{picUrl:'https://p1.music.126.net/test'+id+'.jpg'},ar:[{name:'Artist'}]}))});
};}
test('all 130 tracks survive batching and order normalization',async()=>{
 const data=await fetchPlaylist(source());assert.equal(data.total,130);assert.deepEqual(data.songs.map(s=>s.id),ids);
 const view=publicSnapshot(data);assert.equal(view.songs.length,130);assert.equal(view.songs[129].src,'/api/covers/130');
});
test('incomplete upstream cannot overwrite the previous snapshot',async()=>{
 let writes=0;await assert.rejects(refresh({put:async()=>writes++},source(true)),/Incomplete/);assert.equal(writes,0);
});
test('successful refresh commits the whole snapshot once',async()=>{
 const writes=[];await refresh({put:async(...args)=>writes.push(args)},source());assert.equal(writes.length,1);assert.equal(JSON.parse(writes[0][1]).songs.length,130);
});
test('cover proxy accepts only NetEase image origins',()=>{
 assert.match(safeCover('http://p2.music.126.net/cover.jpg'),/^https:.*param=160y160$/);
 for(const url of ['https://example.com/a','http://127.0.0.1/a','https://p1.music.126.net.evil/a','file:///tmp/a'])assert.throws(()=>safeCover(url));
});
