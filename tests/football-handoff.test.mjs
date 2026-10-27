import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FootballTransition,createFootballParticles} from '../src/football-transition.ts';
function setup(){const root=new THREE.Group(),source=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshPhongMaterial());root.add(source);const target=new THREE.Group();target.add(new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshPhongMaterial()));return {source,transition:new FootballTransition(root,target,createFootballParticles(),source)};}
test('restored 2.15 second morph has a particle-only stage and a gradual overlapping reveal',()=>{
 const {transition:t}=setup();let crossover=0,particleOnly=0,previous=0;
 assert.equal(t.duration,2.15);
 for(let frame=0;frame<1000;frame++){
  t.tick(t.duration/1000,50,1,false);const d=t.diagnostics;
  if(d.progress>.13&&d.progress<.78){assert.equal(d.targetVisible,false);particleOnly++;}
  const opacity=t.target.children[0].material.opacity;assert.ok(opacity>=previous);previous=opacity;
  if(opacity>0&&opacity<1)crossover++;
 }
 assert.ok(particleOnly>400);assert.ok(crossover>200);assert.equal(previous,1);t.dispose();
});

test('reduced motion and cancellation restore all materials',()=>{
 for(const reduced of [false,true]){const {source,transition:t}=setup();t.tick(.8,50,1,reduced);if(reduced){assert.equal(t.target.children[0].material.opacity,1);assert.equal(t.points.material.uniforms.opacity.value,0);}t.dispose();assert.equal(source.material.opacity,1);assert.equal(source.visible,true);assert.equal(t.points.parent,null);assert.equal(t.target.children[0].material.opacity,1);}
});
