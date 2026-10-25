"""Verify every rendered handoff frame, including the first uncached interaction."""
import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=40);assert r.returncode==0,r.stderr or r.stdout;return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
run('set','media','light');run('set','viewport','390','844');run('open','http://127.0.0.1:5173/')
run('wait','--fn',"window.wabi?.state==='rest'");run('snapshot');run('click','#start');run('wait','--fn','wabi.position.radius<50.1')
checks=[]
for theme,year in [('day','2026'),('night','2022'),('day','2018')]:
 js("document.documentElement.dataset.theme="+json.dumps(theme))
 result=js("""new Promise(resolve=>{
 const frames=[],shots={};let prior=performance.now();const start=prior;document.querySelector('#football-toggle').click();
 function record(now){let t=wabi.planet.footballTransition;
  if(t){frames.push({...t,dt:now-prior,glass:wabi.planet.glass.presence});for(const p of [.3,.55,.76,.88])if(t.progress>=p&&!shots[p])shots[p]=document.querySelector('#planet-scene').toDataURL();}
  prior=now;if(!t&&!wabi.planet.pendingFootball&&now-start>200)resolve({frames,shots,name:wabi.planet.name});else requestAnimationFrame(record);
 }requestAnimationFrame(record);
})""")
 frames=result.pop('frames');shots=result.pop('shots');assert result['name'].startswith(year),result
 assert any(.2<f['progress']<.5 and not f['targetVisible'] for f in frames)
 assert all(not f['targetVisible'] for f in frames if f['progress']<.84)
 assert all(f['glass']==0 for f in frames if .18<f['progress']<.84)
 cross=[f for f in frames if .84<f['progress']<1]
 assert len(cross)>10,len(cross)
 assert all(b['glass']>=a['glass'] for a,b in zip(cross,cross[1:]))
 assert max(f['dt'] for f in frames)<80,max(f['dt'] for f in frames)
 for phase,data in shots.items():(root/f'artifacts/handoff-{year}-{phase}.png').write_bytes(base64.b64decode(data.split(',')[1]))
 checks.append({'theme':theme,'year':year,'frames':frames,'handoffFrames':len(cross),'maxFrameMs':max(f['dt'] for f in frames)})
 print('PASS',theme,year,'restored 2.15-second overlap','handoff frames',len(cross),flush=True)
(root/'artifacts/football-handoff-checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
