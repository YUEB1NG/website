"""Check actual projected portrait spacing, depth direction, and profile borders."""
import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
checks=[]
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',cwd=root,timeout=40)
 assert r.returncode==0,r.stderr or r.stdout
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
def check(name,code):
 assert js(code),name
 checks.append(name);print('PASS',name,flush=True)
def wait(code):run('wait','--fn',code)
def pause(ms):js(f'new Promise(r=>setTimeout(()=>r(true),{ms}))')
def click(s):
 if s=='#theme-toggle':wait("!document.querySelector('.profile-name').inert&&+getComputedStyle(document.querySelector('.profile-name')).opacity>.95")
 run('click',s)
def shot(name):run('screenshot',str(root/'artifacts'/f'{name}.png'))
run('set','viewport','390','844');run('set','media','light')
run('open','http://127.0.0.1:5173/');js("localStorage.setItem('yueb1ng-theme','day')");run('reload')
wait("wabi?.state==='rest'");run('snapshot','-i');click('#start');wait('wabi.position.radius<50.1')
click('[data-reveal=name]');wait("!document.querySelector('.profile-name').inert")
click('#profile-label');check('name no longer changes to a mooncake',"wabi.planet.name==='Earth'&&document.querySelector('#profile-label').tagName==='SPAN'&&!document.querySelector('#mooncake-toggle')")
geometry="(()=>{const b=document.querySelector('#theme-toggle'),i=b.querySelector('img'),r=b.getBoundingClientRect(),q=i.getBoundingClientRect();return {gap:q.x-r.x,bg:getComputedStyle(b).backgroundColor,page:getComputedStyle(document.body).backgroundColor,size:r.width}})()"
day=js(geometry);assert day['gap']>=3 and day['bg']==day['page'],day
checks.append('day avatar has a page-colored separated ring');shot('profile-ring-day')
click('#theme-toggle');night=js(geometry)
assert night['gap']==day['gap'] and night['size']==day['size'] and night['bg']==night['page'],night
checks.append('night and day avatar rings share identical spacing');shot('profile-ring-night')
run('press','o');wait('wabi.planet.orbitMix>.998')
check('20 portraits still form the orbit','wabi.planet.orbitPortraits.length===20')
for _ in range(6):
 check('foreground crosses lower hemisphere and rear crosses upper',"wabi.planet.orbitPortraits.filter(p=>Math.abs(p.z)>.12).every(p=>p.y*p.z<0)")
 check('no projected portrait overlap',"(()=>{const p=wabi.planet.orbitPortraits;return p.every((a,i)=>p.every((b,j)=>i===j||Math.hypot(a.x-b.x,a.y-b.y)>(a.size+b.size)*.525))})()")
 pause(180)
check('near portraits subtly larger than rear portraits',"(()=>{const p=wabi.planet.orbitPortraits;return Math.min(...p.filter(p=>p.z>.5).map(p=>p.size))>Math.max(...p.filter(p=>p.z<-.5).map(p=>p.size))})()")
shot('refined-orbit-night');click('#theme-toggle');shot('refined-orbit-day')
point=js("(()=>{const p=wabi.planet.orbitPortraits.find(p=>p.z>1&&Math.abs(p.x)<.9),o=wabi.position;return {x:o.x+p.x*o.radius,y:o.y-p.y*o.radius}})()")
run('mouse','move',str(round(point['x'])),str(round(point['y'])));run('mouse','down');run('mouse','up')
check('front portrait receives clicks ahead of the globe',"wabi.planet.bursts===5&&wabi.state==='revealed'")
click('#football-toggle');wait('wabi.planet.footballTransition===null')
check('football particle reconstruction still completes',"wabi.planet.mode==='football'")
run('set','media','light','reduced-motion');pause(150);a=js('wabi.planet.orbitAngle');pause(350)
check('reduced motion still stops orbital motion',f'Math.abs(wabi.planet.orbitAngle-({a}))<1e-10')
assert not run('errors'),run('errors')
assert '[error]' not in run('console'),run('console')
(root/'artifacts/orbit-refinement-checks.json').write_text(json.dumps({'checks':checks,'dayRing':day,'nightRing':night},indent=2),encoding='utf-8')
print(f'PASS {len(checks)} assertions')
