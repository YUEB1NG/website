import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CoverDeck,coverIdentity} from '../src/cover-deck.ts';
const songs=JSON.parse(fs.readFileSync(new URL('../src/cover-fallback.json',import.meta.url)));
test('full playlist cycling has no simultaneous duplicate artwork or deadlock',()=>{
 let seed=17;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
 const deck=new CoverDeck(songs,random),visible=[],seen=new Set();
 for(let i=0;i<20;i++){const s=deck.take(new Set(visible.map(coverIdentity)));assert.ok(s);visible.push(s);seen.add(s.id);}
 for(let i=0;i<2000;i++){
  const blocked=new Set(visible.map(coverIdentity));const s=deck.take(blocked);assert.ok(s,'deck stalled on a displayed cover');assert.ok(!blocked.has(coverIdentity(s)));visible[i%20]=s;seen.add(s.id);assert.equal(new Set(visible.map(coverIdentity)).size,20);
 }
 assert.equal(seen.size,songs.length);assert.equal(deck.uniqueCount,129);
});
test('pending image reservations cannot pick identical albums',()=>{
 const deck=new CoverDeck(songs),blocked=new Set();
 for(let i=0;i<24;i++){const s=deck.take(blocked);assert.ok(s);assert.ok(!blocked.has(coverIdentity(s)));blocked.add(coverIdentity(s));}
});
