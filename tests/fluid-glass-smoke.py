"""Browser coverage for shared glass, drag recovery, and particle surface changes."""
import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
checks=[]
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',cwd=root,timeout=40)
 assert r.returncode==0,r.stderr or r.stdout
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
def wait(code):run('wait','--fn',code)
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS',name,flush=True)
def pause(ms):js(f'new Promise(r=>setTimeout(()=>r(true),{ms}))')
def shot(name):run('screenshot',str(root/'artifacts'/f'{name}.png'))
run('set','viewport','390','844');run('set','media','light')
run('open','http://127.0.0.1:5173/');js("localStorage.setItem('yueb1ng-theme','day')");run('reload')
wait("window.wabi?.state==='rest'");run('snapshot','-i')
check('resting transparent ring has no solid glass overlay',js('wabi.planet.glass.presence===0'))
run('click','#start');wait('wabi.position.radius<50.1')
check('Earth uses the shared optical glass',js("wabi.planet.name==='Earth'&&wabi.planet.glass.style==='react-bits-fluid-glass'&&wabi.planet.glass.presence===1"))
shot('fluid-earth-day-final')
light_a=js('wabi.planet.glass');pause(2200);light_b=js('wabi.planet.glass')
key_delta=sum((a-b)**2 for a,b in zip(light_a['keyLight'],light_b['keyLight']))**.5
fill_delta=sum((a-b)**2 for a,b in zip(light_a['fillLight'],light_b['fillLight']))**.5
check('both highlights move at distinct rates',key_delta>.1 and fill_delta>.08 and abs(key_delta-fill_delta)>.015)
check('dispersion is restrained',light_b['dispersion']==.15)
frames=js("""new Promise(resolve=>{
 const samples=[];let last=performance.now();document.querySelector('#football-toggle').click();
 function frame(now){samples.push({dt:now-last,glass:wabi.planet.glass.presence,progress:wabi.planet.footballTransition?.progress??null,source:wabi.planet.footballTransition?.sourceVisible??0});last=now;
 if(samples.length>10&&!wabi.planet.footballTransition&&!wabi.planet.pendingFootball)resolve(samples);else requestAnimationFrame(frame)}requestAnimationFrame(frame)
})""")
middle=[f for f in frames if f['progress'] is not None and .25<f['progress']<.75]
check('no stationary glass shell survives the particle-only phase',len(middle)>8 and all(f['glass']==0 and f['source']==0 for f in middle))
check('reassembled 2026 football regains its glass',js("wabi.planet.name==='2026 Trionda'&&wabi.planet.glass.presence===1"))
check('transition does not stall for 100ms',max(f['dt'] for f in frames[1:])<100)
shot('fluid-football-day-final')
js("window.__glassSamples=[];window.__glassRecording=true;(function record(){if(!window.__glassRecording)return;window.__glassSamples.push(wabi.planet.glass.stretch);requestAnimationFrame(record)})()")
point=js('wabi.position');cx,cy=round(point['x']),round(point['y'])
run('mouse','move',str(cx),str(cy));run('mouse','down')
for dx,dy in [(20,10),(60,20),(100,40),(70,45),(-50,35),(-100,15),(-70,0)]:
 run('mouse','move',str(cx+dx),str(cy+dy))
shot('fluid-drag-held');run('mouse','up');pause(2200)
drag=js('window.__glassRecording=false;window.__glassSamples')
check('drag uses the quieter spring (under 13 percent stretch)',max(drag)>1.01 and max(drag)<1.13 and min(drag)>.95)
check('release settles back into a sphere',js("Math.abs(wabi.planet.glass.stretch-1)<.001&&wabi.state==='revealed'"))
run('click','[data-reveal=name]');wait("!document.querySelector('.profile-name').inert")
run('click','#theme-toggle');run('press','o');wait('wabi.planet.orbitMix>.995')
check('night glass keeps all orbit portraits and proper depth',js("wabi.theme==='night'&&wabi.planet.orbitCount===20&&wabi.planet.depthTest&&wabi.planet.glass.presence===1"))
shot('fluid-football-night-orbit')
run('set','media','light','reduced-motion')
check('reduced motion removes elastic deformation',js('wabi.planet.glass.stretch===1'))
frozen=js('wabi.planet.glass');pause(250)
check('reduced motion also freezes both highlights',js('wabi.planet.glass')['keyLight']==frozen['keyLight'] and js('wabi.planet.glass')['fillLight']==frozen['fillLight'])
balls=[]
for i in range(24):
 balls.append(js('({name:wabi.planet.name,presence:wabi.planet.glass.presence})'))
 js("document.querySelector('#football-toggle').click()");pause(30)
check('all 24 historical balls use glass',len({b['name'] for b in balls})==24 and all(b['presence']==1 for b in balls))
names=[]
for i in range(10):
 run('press','Escape');run('click','#start');pause(30)
 names.append(js('({name:wabi.planet.name,presence:wabi.planet.glass.presence})'))
check('all 10 celestial bodies use glass',len({n['name'] for n in names})==10 and all(n['presence']==1 for n in names))
shot('fluid-earth-night-final')
check('no WebGL or browser errors',not run('errors') and '[error]' not in run('console'))
run('set','media','light')
(root/'artifacts/fluid-glass-checks.json').write_text(json.dumps({'passed':checks,'transitionFrames':frames,'maxFrameMs':max(f['dt'] for f in frames[1:]),'dragStretch':{'min':min(drag),'max':max(drag)},'balls':balls,'planets':names},indent=2),encoding='utf-8')
print(f'PASS {len(checks)} checks; longest transition frame {max(f["dt"] for f in frames[1:]):.1f}ms',flush=True)
