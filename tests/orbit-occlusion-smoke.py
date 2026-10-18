"""Read actual WebGL pixels: front portraits must stay crisp, rear ones occluded."""
import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=45)
 assert r.returncode==0,r.stderr or r.stdout
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
run('set','viewport','390','844');run('set','media','light');run('open','http://127.0.0.1:5173/');run('wait','--fn',"window.wabi?.state==='rest'");run('snapshot','-i')
result=js("""(async()=>{
 const {Planets}=await import('/src/planets.ts');const p=new Planets();await p.ready;
 // Deterministic red portraits make incorrect glass refraction / clipping measurable.
 p.orbitSprites.forEach(s=>{s.material.map=null;s.material.color.set('#ff0000');s.material.needsUpdate=true;});
 p.material.map=null;p.material.normalMap=null;p.material.specularMap=null;p.material.emissiveMap=null;p.material.emissive.set(0);p.material.color.set('#0044ff');p.material.needsUpdate=true;
 p.clouds.visible=false;p.atmosphere.visible=false;
 const renderer=p.renderer,gl=renderer.getContext(),ratio=renderer.getPixelRatio(),samples=[];
 for(let i=0;i<12;i++){
  p.orbitAngle=i*Math.PI/6;p.render(195,320,50,1,0,true,true,1,[]);
  for(const side of ['front','rear']){
   const portrait=p.orbitSprites.find(s=>Math.hypot(s.position.x-p.group.position.x,s.position.y-p.group.position.y)<.86&&(side==='front'?s.position.z>1:s.position.z< -1));
   if(!portrait)throw Error('No overlapping '+side+' sample');
   const x=195+(portrait.position.x-p.group.position.x)*50,y=320-(portrait.position.y-p.group.position.y)*50,pixel=new Uint8Array(4);
   gl.readPixels(Math.round(x*ratio),p.canvas.height-1-Math.round(y*ratio),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
   samples.push({phase:i,side,pixel:Array.from(pixel)});
  }
 }
 let minimumClearance=Infinity,maximumStep=0,previous=[];
 const particles=Array.from({length:20},(_,i)=>({x:195+Math.sin(i*2.4)*140,y:320+Math.cos(i*1.7)*180,size:28,visible:true}));
 for(let frame=0;frame<=120;frame++){
  const blend=frame<=60?frame/60:(120-frame)/60;
  p.render(195,320,50,1,0,true,true,blend,particles);
  p.orbitSprites.forEach((s,i)=>{
   minimumClearance=Math.min(minimumClearance,s.position.distanceTo(p.group.position)-s.scale.x*.71);
   if(previous[i])maximumStep=Math.max(maximumStep,s.position.distanceTo(previous[i]));
   previous[i]=s.position.clone();
  });
 }
 const captureLayers=p.glass.camera.layers.mask,portraitLayers=p.orbitSprites.map(s=>s.layers.mask);
 p.canvas.remove();return {samples,captureLayers,portraitLayers,minimumClearance,maximumStep};
})()""")
for sample in result['samples']:
 r,g,b,a=sample['pixel']
 if sample['side']=='front':assert r>245 and g<8 and b<8,("front avatar clipped or refracted",sample)
 else:assert b>r+30,("rear avatar visible through globe",sample)
assert result['minimumClearance']>1.3,('portrait crosses the glass shell',result['minimumClearance'])
assert result['maximumStep']<.35,('discontinuous gathering / release',result['maximumStep'])
print('PASS gathering and release stay outside the sphere without position jumps',flush=True)
assert all(mask & result['captureLayers']==0 for mask in result['portraitLayers'])
print('PASS 24 GPU pixel checks across 12 orbit phases: crisp front portraits, occluded rear portraits',flush=True)
(root/'artifacts/orbit-occlusion-checks.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
run('reload')
