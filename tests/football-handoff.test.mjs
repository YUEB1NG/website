import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FootballTransition,createFootballParticles,morphTiming} from '../src/football-transition.ts';
function setup(){const root=new THREE.Group(),source=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshPhongMaterial());root.add(source);const target=new THREE.Group();target.add(new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshPhongMaterial()));return {source,transition:new FootballTransition(root,target,createFootballParticles(),source)};}
test('solid and glass remain absent until every GPU particle arrives',()=>{
 const {transition:t}=setup();let crossover=0;
 for(let frame=0;frame<1000;frame++){
  t.tick(t.duration/1000,50,1,false);const d=t.diagnostics;
  const delays=t.points.geometry.getAttribute('delay');
  if(d.solidOpacity>0){
   for(let i=0;i<delays.count;i++){const p=(d.progress-delays.getX(i))/(1-delays.getX(i));assert.ok(p>=morphTiming.gatherEnd,'solid appeared while a particle was still travelling');}
   assert.equal(d.allParticlesLanded,true);
  }
  if(d.progress>.18&&d.progress<morphTiming.revealStart){assert.equal(d.targetVisible,false);assert.equal(d.surfacePresence,0);assert.equal(d.particleOpacity,1);}
  if(d.solidOpacity>0&&d.solidOpacity<1){assert.ok(Math.abs(d.solidOpacity+d.particleOpacity-1)<1e-9);crossover++;}
 }
 assert.ok(crossover>200,'handoff must last enough frames to stay gradual');t.dispose();
});
test('reduced motion and cancellation restore all materials',()=>{
 for(const reduced of [false,true]){const {source,transition:t}=setup();t.tick(.8,50,1,reduced);if(reduced){assert.equal(t.diagnostics.solidOpacity,1);assert.equal(t.diagnostics.particleOpacity,0);}t.dispose();assert.equal(source.material.opacity,1);assert.equal(source.visible,true);assert.equal(t.points.parent,null);assert.equal(t.target.children[0].material.opacity,1);}
});
