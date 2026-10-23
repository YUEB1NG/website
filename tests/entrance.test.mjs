import {test} from 'node:test';
import assert from 'node:assert/strict';
import {entranceState} from '../src/entrance.ts';
test('entry prompt finishes before any greeting line becomes visible',()=>{
 for(let frame=0;frame<240;frame++){
  const age=frame/240,state=entranceState(true,age,Math.min(1,age));
  assert.ok(!(state.prompt>.001&&state.rows.some(x=>x>.001)),'overlapping prompt and greeting');
 }
 assert.equal(entranceState(true,.18,.1).prompt,0);
 assert.ok(entranceState(true,.4,.6).rows[0]>entranceState(true,.4,.6).rows[1]);
});
test('drag and exit never reveal prompt over the greeting',()=>{
 for(let i=0;i<=1000;i++){const state=entranceState(false,0,i/1000);assert.ok(!(state.prompt>.001&&state.rows[0]>.001));}
 assert.deepEqual(entranceState(true,0,0,true),{prompt:0,rows:[1,1,1]});
});
