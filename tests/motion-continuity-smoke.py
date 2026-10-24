"""Whole-animation timing and interruptible cover-orbit browser regression."""
import base64,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,'--cdp','9223',*args],capture_output=True,text=True,encoding='utf-8',timeout=40)
 assert r.returncode==0,r.stdout+r.stderr
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
run('set','viewport','390','844');run('set','media','light');run('errors','--clear')
run('open',sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5173/')
run('wait','--fn',"window.wabi?.state==='rest'");run('click','#start');run('wait','--fn','wabi.position.radius<50.1')
results=[]
for repeat in range(3):
 data=js("""new Promise(resolve=>{
 const before=wabi.planet.maintenance,frames=[],start=performance.now();let prev=start;
 document.querySelector('#football-toggle').click();
 function sample(now){const d=wabi.planet;frames.push({dt:now-prev,p:d.footballTransition?.progress??1,uploads:d.maintenance.coverUploadsDuringMorph,programs:d.shaderPrograms});prev=now;
 if(now-start<3300)requestAnimationFrame(sample);else resolve({before,after:d.maintenance,frames,name:d.name});}requestAnimationFrame(sample);
 })""")
 assert data['after']['coverUploadsDuringMorph']==0,data
 frames=data.pop('frames');dt=sorted(f['dt'] for f in frames[1:]);data.update(maxMs=max(dt),p95Ms=dt[int(len(dt)*.95)],frames=len(frames))
 assert data['maxMs']<80,data
 assert len(set(f['programs'] for f in frames if f['p']<1))==1
 results.append(data);print('PASS whole morph',repeat,data,flush=True)
 run('wait','1200')
# Record every visible orbit pose through gathering, early release and re-entry.
js("""(()=>{window.orbitRecord=[];window.orbitRecording=true;let prev=performance.now();function sample(now){const d=wabi.planet;orbitRecord.push({dt:now-prev,mix:d.orbitMix,portraits:d.orbitPortraits});prev=now;if(orbitRecording)requestAnimationFrame(sample);}requestAnimationFrame(sample);return true;})()""")
for wait in ['650','450','4500','650','450','4500']:
 run('press','o');run('wait',wait)
js('orbitRecording=false');records=js('orbitRecord')
max_step=0
for a,b in zip(records,records[1:]):
 if len(a['portraits'])!=len(b['portraits']) or not(.02<b['mix']<.98):continue
 for p,q in zip(a['portraits'],b['portraits']):
  distance=sum((p[k]-q[k])**2 for k in ['x','y','z'])**.5
  max_step=max(max_step,distance)
assert max_step<1.2,('orbit discontinuity',max_step)
run('press','o');run('wait','4500');d=js('wabi.planet')
assert 20<=d['orbitCount']<=25
assert d['orbitDepth'][0]<-1 and d['orbitDepth'][1]>1
assert all((p['y']<.01 if p['z']>0 else p['y']>-.01) for p in d['orbitPortraits'])
run('screenshot',str(root/'artifacts/orbit-after.png'));run('press','o')
assert not run('errors')
result={'morphs':results,'maxOrbitFrameStep':max_step,'orbitCount':d['orbitCount'],'depth':d['orbitDepth']}
(root/'artifacts/motion-continuity-checks.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print('PASS motion continuity',result,flush=True)
