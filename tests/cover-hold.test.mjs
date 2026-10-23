import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CoverHold} from '../src/cover-hold.ts';
const pose=(x=160,y=220)=>({x,y,z:-100,size:32,opacity:.8,visible:true});
test('drag freezes rendered pixels even when orbit targets and camera-derived sizes change',()=>{
 const hold=new CoverHold();hold.update([pose()],false,.016);
 for(let i=0;i<300;i++){
  const [p]=hold.update([{...pose(300+i,500+i),size:100}],true,1/60);
  assert.ok(Math.abs(p.x-160)<=2.2&&Math.abs(p.y-220)<=2.6);assert.equal(p.size,32);assert.equal(p.opacity,.8);
 }
});
test('release and interrupted release stay continuous',()=>{
 const hold=new CoverHold();hold.update([pose()],false,.016);const [a]=hold.update([pose(360,520)],true,.5);
 const [b]=hold.update([pose(360,520)],false,1/60);assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<1);
 const [c]=hold.update([pose(460,620)],true,1/60);assert.ok(Math.hypot(c.x-b.x,c.y-b.y)<.05);
 for(let i=0;i<60;i++)hold.update([pose(360,520)],false,1/60);
 assert.deepEqual(hold.positions,[pose(360,520)]);
});
test('new orbit slots do not appear during dragging; reduced motion has no sway',()=>{
 const hold=new CoverHold();hold.update([pose()],false,.016);
 const p=hold.update([pose(400,500),pose()],true,5,true);
 assert.deepEqual(p[0],pose());assert.equal(p[1].visible,false);
});
