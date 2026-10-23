import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CoverPicker,coverKey} from '../src/cover-picker.ts';
import {readFileSync} from 'node:fs';
const pool=JSON.parse(readFileSync(new URL('../src/cover-fallback.json',import.meta.url)));
const seeded=()=>{let n=42;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);};
test('24 slots sample all unique art without visible duplicates or a recent-55 repeat',()=>{
 const picker=new CoverPicker(pool,[],seeded()),slots=[],seen=new Set();
 for(let i=0;i<24;i++){const c=picker.take(new Set(slots.map(coverKey)));assert.ok(c);slots.push(c);picker.shown(c);}
 const pending=[];
 for(let i=0;i<2000;i++){
  while(pending.length<8){const c=picker.take(new Set([...slots,...pending].map(coverKey)));assert.ok(c);pending.push(c);}
  const next=pending.shift();assert.ok(!picker.history.includes(coverKey(next)));slots[i%24]=next;picker.shown(next);seen.add(coverKey(next));
  assert.equal(new Set(slots.map(coverKey)).size,24);
 }
 assert.equal(seen.size,129);
});
test('recent art is excluded after reload and duplicate image hosts share an identity',()=>{
 const history=pool.slice(0,55).map(coverKey),picker=new CoverPicker(pool,history,seeded());
 const next=picker.take(new Set());assert.ok(!history.includes(coverKey(next)));
 assert.equal(coverKey({...next,coverKey:'https://p1.music.126.net/a.jpg'}),coverKey({...next,coverKey:'https://p2.music.126.net/a.jpg'}));
});
test('small playlists relax history without reusing visible or prepared images',()=>{
 const small=pool.slice(0,3),picker=new CoverPicker(small,small.map(coverKey),seeded());
 assert.equal(coverKey(picker.take(new Set(small.slice(1).map(coverKey)))),coverKey(small[0]));
 assert.equal(picker.take(new Set(small.map(coverKey))),undefined);
});
