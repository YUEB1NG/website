"""Measure the full morph, including the solid-ball handoff and following frames."""
import base64,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=40);assert r.returncode==0,r.stderr;return r.stdout.strip()
def js(s):return json.loads(run('eval','--json','-b',base64.b64encode(s.encode()).decode()))['data']['result']
run('set','viewport','390','844');run('set','media','light');run('open','http://127.0.0.1:5173/');run('wait','--fn',"window.wabi?.state==='rest'");run('snapshot','-i');run('click','#start');run('wait','--fn','wabi.position.radius<50.1')
records=[]
for i in range(3):
 r=js("""new Promise(resolve=>{const frames=[],tasks=[];const obs=new PerformanceObserver(list=>{for(const e of list.getEntries())tasks.push({start:e.startTime,duration:e.duration})});obs.observe({entryTypes:['longtask']});const start=performance.now();let last=start,done=0;document.querySelector('#football-toggle').click();function frame(now){const p=wabi.planet;frames.push({time:now-start,dt:now-last,phase:p.footballTransition?.progress??null,programs:p.shaderPrograms,glass:p.glass.presence,mode:p.mode,targetAngle:p.footballTransition?.targetAngle??null,pose:p.renderPose??null,maintenance:p.maintenance??null});last=now;if(!p.footballTransition&&!p.pendingFootball){if(!done)done=now;if(now-done>1700){obs.disconnect();resolve({frames,tasks:tasks.map(t=>({start:t.start-start,duration:t.duration})),name:p.name});return}}requestAnimationFrame(frame)}requestAnimationFrame(frame)})""")
 records.append(r);frames=r['frames'];late=[f for f in frames if f['phase'] is None or f['phase']>.75];print(json.dumps({'ball':r['name'],'maxFrameMs':max(f['dt'] for f in frames),'lateMaxMs':max(f['dt'] for f in late),'longTasks':r['tasks'],'newPrograms':max(f['programs'] for f in frames)-frames[0]['programs']}),flush=True)
 if '--baseline' not in sys.argv:
  assert max(f['dt'] for f in late)<65, 'late reassembly hitch'
  handoff=next(j for j in range(1,len(frames)) if frames[j]['phase'] is None and frames[j-1]['phase'] is not None)
  before,after=frames[handoff-1],frames[handoff]
  assert before['pose'] and after['pose']
  moving=[f for f in frames if f['targetAngle'] is not None]
  assert all(b['targetAngle']>a['targetAngle'] for a,b in zip(moving,moving[1:])), 'incoming ball stops during morph'
  assert max(abs(a-b) for a,b in zip(before['pose']['targetWorld'],after['pose']['targetWorld']))<.012, 'ball jumps on handoff'
  assert max(abs(before['pose'][k]-after['pose'][k]) for k in ['ambient','light','tilt'])<.015, 'lighting or tilt snaps on handoff'
  assert before['maintenance']['builds']==after['maintenance']['builds'] and before['maintenance']['disposals']==after['maintenance']['disposals'], 'handoff rebuilds or disposes GPU resources'
  assert all(f['maintenance']['workDuringTransition']==0 for f in frames), 'background heavy work overlaps morph'
(root/'artifacts'/('reassembly-before.json' if '--baseline' in sys.argv else 'reassembly-after.json')).write_text(json.dumps(records,indent=2),encoding='utf-8')
assert not run('errors'),run('errors')
