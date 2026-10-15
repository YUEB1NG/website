"""Visual/interaction checks for the supplied stickers and level orbital layout."""
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
def click(s):run('click',s)
run('set','viewport','390','844');run('set','media','light')
run('open','http://127.0.0.1:5173/');js("localStorage.setItem('yueb1ng-theme','day')");run('reload');wait("wabi?.state==='rest'");run('snapshot','-i')
click('#start');wait('wabi.position.radius<50.1')
check('all 29 transparent stickers loaded','wabi.planet.stickersLoaded===29')
click('#there');check('There is ordinary text and does not change the scene',"document.querySelector('#there').tagName==='SPAN'&&!document.querySelector('#trophy-toggle')&&wabi.planet.name==='Earth'")
click('[data-reveal=name]');wait("!document.querySelector('.profile-name').inert")
click('#theme-toggle');check('night remains available',"wabi.theme==='night'")
click('#profile-label');check('name is inert text',"wabi.planet.mode==='planet'&&!document.querySelector('#mooncake-toggle')")
r=js('wabi.planet.rotation');pause(800)
check('planet keeps rotating slowly',f'wabi.planet.rotation>{r}&&wabi.planet.rotation-{r}<.2')
run('screenshot',str(root/'artifacts/pure-planet.png'))
run('press','o');pause(2600)
check('orbit stays horizontal with real depth',"wabi.orbit&&wabi.planet.orbitPortraits.every(p=>p.y*p.z<=0)&&wabi.planet.orbitDepth[0]<-.5&&wabi.planet.orbitDepth[1]>.5")
check('same 20 portraits remain visible and opaque',"wabi.planet.orbitCount===20&&wabi.planet.particlePositions.every(p=>p.opacity===1)")
run('screenshot',str(root/'artifacts/horizontal-orbit.png'))
js("document.querySelector('#celebrate').click()");pause(450)
check('click emits the supplied stickers','wabi.planet.bursts===5')
run('screenshot',str(root/'artifacts/argentina-sticker-burst.png'))
js("for(let i=0;i<30;i++)document.querySelector('#celebrate').click()")
check('repeated effects stay bounded','wabi.planet.bursts<=40');pause(3300)
check('stickers remove themselves after animation','wabi.planet.bursts===0')
check('revealed avatar remains available for theme switching',"!document.querySelector('.profile-name').inert")
run('set','media','light','reduced-motion');pause(150);js("document.querySelector('#celebrate').click()")
check('reduced motion keeps only one quiet sticker','wabi.planet.bursts===1')
assert not run('errors'),run('errors')
check('no shader errors',json.dumps('[error]' not in run('console')))
(root/'artifacts/sticker-checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print(f'PASS {len(checks)} checks')
