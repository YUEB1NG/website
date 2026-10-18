"""Regression coverage for continuous sphere entry and interruptible spinning transitions."""
import base64,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
checks=[]
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',cwd=root,timeout=40)
 assert r.returncode==0,r.stderr or r.stdout
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS',name,flush=True)
def wait(code):run('wait','--fn',code)
def click(selector):run('click',selector)
run('set','viewport','390','844');run('set','media','light')
run('open',sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5173/')
wait("window.wabi?.state==='rest'");run('snapshot','-i')
frames=js("""new Promise(resolve=>{const samples=[];document.querySelector('#start').click();function sample(){samples.push({r:wabi.position.radius,mix:wabi.planet.surfaceMix,scale:wabi.planet.surfaceScale});if(wabi.position.radius<50.1)resolve(samples);else requestAnimationFrame(sample)}requestAnimationFrame(sample)})""")
partial=[f for f in frames if .05<f['mix']<.95]
check('entry blends through intermediate surfaces',len(partial)>4)
check('sphere radius has no second growth curve',all(f['scale']==1 for f in frames))
check('entry blend increases continuously',all(b['mix']>=a['mix'] for a,b in zip(frames,frames[1:])))
check('first surface is Earth',js("wabi.planet.name==='Earth'"))
click('#everything')
check('everything has no button or scene effect',js("document.querySelector('#everything').tagName==='SPAN'&&!document.querySelector('.flyover')&&wabi.planet.name==='Earth'"))
timing=js("""new Promise(resolve=>{
 const programs=wabi.planet.shaderPrograms,t=performance.now();document.querySelector('#football-toggle').click();
 const ms=performance.now()-t,frames=[];let previous=t;
 function frame(now){const phase=wabi.planet.footballTransition;frames.push({dt:now-previous,programs:wabi.planet.shaderPrograms,phase,glass:wabi.planet.glass.presence});previous=now;
  if(phase)requestAnimationFrame(frame);else resolve({ms,programs,frames});
 }requestAnimationFrame(frame);
})""")
phases=[f['phase'] for f in timing['frames'] if f['phase']]
check('first click starts without blocking',timing['ms']<16)
check('first spin reuses warmed shader programs',all(f['programs']==timing['programs'] for f in timing['frames'][:-1]))
check('spin has no frame stall over 100ms',max(f['dt'] for f in timing['frames'])<100)
check('spin accelerates then gradually coasts',max(p['speed'] for p in phases)>8.8 and phases[0]['speed']<.3 and phases[-1]['speed']<.12)
check('surface stays visible throughout the change',all(p['sourceVisible']>0 or p['targetVisible'] for p in phases))
check('glass stays continuous through the spin',all(f['glass']==1 for f in timing['frames']))
check('rotation keeps a single direction',all(b['angle']>=a['angle'] for a,b in zip(phases,phases[1:])))
check('first ball is newest 2026',js("wabi.planet.name==='2026 Trionda'"))
run('screenshot',str(root/'artifacts/transition-reassembled.png'))
click('#football-toggle')
js("for(let i=0;i<5;i++)document.querySelector('#football-toggle').click()")
wait("wabi.planet.footballTransition===null&&!wabi.planet.pendingFootball")
check('rapid clicks coalesce and complete without piling effects',js("wabi.planet.name==='2018 Telstar 18'"))
click('#football-toggle');run('press','Escape')
check('return to ring cancels unfinished spin',js("wabi.state==='rest'&&wabi.planet.footballTransition===null"))
wait('wabi.position.radius>199.9');click('#start');wait('wabi.position.radius<50.1')
check('enter after cancellation restores a solid planet',js("wabi.planet.mode==='planet'&&wabi.planet.surfaceMix>.99"))
run('set','media','light','reduced-motion');click('#football-toggle')
check('reduced motion uses an immediate complete ball',js("wabi.planet.mode==='football'&&wabi.planet.footballTransition===null"))
run('set','media','light');click('#football-toggle');run('set','media','light','reduced-motion')
wait('wabi.planet.footballTransition===null&&!wabi.planet.pendingFootball')
check('enabling reduced motion mid-transition finishes cleanly',js("wabi.planet.mode==='football'"))
check('no browser errors',not run('errors'))
log=run('console')
check('no shader compilation errors','[error]' not in log and 'VALIDATE_STATUS false' not in log)
(root/'artifacts/transition-checks.json').write_text(json.dumps({'passed':checks,'entryFrames':frames,'clickPreparationMs':timing['ms'],'coldStart':timing},indent=2),encoding='utf-8')
print(f'PASS {len(checks)} checks; click preparation {timing["ms"]:.1f}ms')
