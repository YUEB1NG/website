"""Interaction regression checks using the installed agent-browser CLI."""
import base64,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
checks=[]
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',cwd=root,timeout=40)
 if r.returncode: raise AssertionError(r.stderr or r.stdout)
 return r.stdout.strip()
def js(source):
 r=json.loads(run('eval','--json','-b',base64.b64encode(source.encode()).decode()))
 assert r['success'],r
 return r['data']['result']
def wait(source):run('wait','--fn',source)
def pause(ms):js(f'new Promise(r=>setTimeout(()=>r(true),{ms}))')
def check(name,source):
 result=js(source)
 assert result,f'{name}: {result}'
 checks.append(name);print('PASS',name,flush=True)
def shot(name):run('screenshot',str(root/'artifacts'/f'{name}.png'))
def click(selector):run('click',selector)
run('set','viewport','390','844');run('set','media','light')
run('open',sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5173/')
js("localStorage.setItem('yueb1ng-theme','day')");run('reload')
wait("window.wabi?.state==='rest'")
check('ten real celestial textures',"wabi.planet.loadedSurfaces===10")
check('copy/select/context suppression',"['copy','contextmenu','selectstart','dragstart'].every(t=>!document.body.dispatchEvent(new Event(t,{bubbles:true,cancelable:true})))")
click('#start');wait('wabi.position.radius<50.1');pause(1200)
check('Earth first and day theme',"wabi.planet.name==='Earth'&&wabi.theme==='day'")
check('three text lines geometrically centered',"[...document.querySelector('#greeting').children].every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<1})")
check('footer visible after layout settles',"+document.querySelector('#social').style.opacity>.85")
check('unclicked word stable',"document.querySelector('#flip-word').textContent==='Learn'")
click('[data-reveal=word]');pause(1600)
check('first word changes after one second',"document.querySelector('#flip-word').textContent==='Build'")
check('word has fixed width, no letter transforms',"document.querySelector('#flip-word').children.length===0&&getComputedStyle(document.querySelector('#flip-word')).transitionDuration==='0.3s'")
click('[data-reveal=name]');wait("!document.querySelector('.profile-name').inert")
click('#theme-toggle');check('manual night and browser chrome',"wabi.theme==='night'&&document.querySelector('meta[name=theme-color]').content==='#000000'")
click('#mooncake-toggle');check('normal mooncake mode',"wabi.planet.mode==='mooncake'");shot('revised-mooncake')
pause(2600);check('name returns after mooncake click',"!document.querySelector('.name-line').classList.contains('profile')&&!document.querySelector('.english-name').inert&&document.querySelector('[data-reveal=name]').getAttribute('aria-expanded')==='false'")
click('[data-reveal=name]');wait("!document.querySelector('.profile-name').inert");click('#theme-toggle')
check('day mode still available',"wabi.theme==='day'")
click('#football-toggle');wait('wabi.planet.footballTransition===null');check('football starts with Qatar ball',"wabi.planet.name==='2022 Al Rihla'&&wabi.planet.footballCount===24")
run('set','media','light','reduced-motion');pause(100)
seen=[]
for i in range(24):
 seen.append(js('wabi.planet.name'))
 js("document.querySelector('#football-toggle').click()")
assert len(set(seen))==24 and '1970 Telstar' in seen and '2026 Trionda' in seen
checks.append('all 24 historical ball entries selectable');print('PASS all 24 historical ball entries selectable',flush=True)
shot('revised-football');run('set','media','light');pause(100)
click('#trophy-toggle');check('trophy case mode',"wabi.planet.mode==='trophy'");pause(500);shot('revised-trophy')
click('#everything');check('everything is inert text',"document.querySelector('#everything').tagName==='SPAN'&&!document.querySelector('.flyover')&&wabi.planet.mode==='trophy'")
click('#trophy-toggle');pause(3500)
run('mouse','move','195','338');run('mouse','down');pause(650);run('mouse','up');pause(2100)
check('hold gathers same sprites with full opacity',"wabi.orbit&&wabi.planet.orbitCount===20&&wabi.planet.particlePositions.every(p=>p.opacity===1)")
check('tilted orbit has front and back',"wabi.planet.orbitDepth[0]<-.5&&wabi.planet.orbitDepth[1]>.5")
pos=js('wabi.planet.particlePositions');pause(700)
check('orbit keeps moving',f"JSON.stringify(wabi.planet.particlePositions)!==JSON.stringify({json.dumps(pos)})")
shot('revised-orbit')
js("document.querySelector('#celebrate').click()")
check('charms emitted and bounded',"wabi.planet.bursts>0&&wabi.planet.bursts<=60")
shot('revised-charms');pause(3000);check('charms clean themselves up',"wabi.planet.bursts===0")
# Use keyboard to release orbit, then drag toward the text to check immediate footer dimming.
run('press','o');pause(3500)
run('mouse','move','195','338');run('mouse','down');run('mouse','move','195','430');pause(350)
check('footer fades during drag before overlap',"+document.querySelector('#social').style.opacity<.45")
run('mouse','move','195','700');pause(600);check('footer gone before text reaches it',"+document.querySelector('#social').style.opacity<.01")
run('mouse','up');wait("wabi.state==='rest'")
# Ten celestial bodies cycle through rest/enter without losing the day/night preference.
celestial=[]
for i in range(10):
 js("document.querySelector('#orb').click()")
 celestial.append(js('wabi.planet.name'))
 if celestial[-1] in ['Sun','Moon','Saturn']:
  wait('wabi.position.radius<50.1');shot('revised-'+celestial[-1].lower())
 js("document.querySelector('#orb').click()")
assert set(celestial)==set(['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Moon','Sun']),celestial
checks.append('all ten celestial bodies cycle');print('PASS all ten celestial bodies cycle',flush=True)
run('set','viewport','360','568');run('set','media','light','reduced-motion');pause(500)
js("document.querySelector('#orb').click()")
pause(150)
check('small viewport text and footer do not overlap',"document.querySelector('#greeting').getBoundingClientRect().bottom+8<document.querySelector('#social').getBoundingClientRect().top")
check('no horizontal overflow',"document.documentElement.scrollWidth===innerWidth")
r=js('wabi.planet.rotation');pause(500);check('reduced motion stops decorative rotation',f'wabi.planet.rotation==={r}')
click('#football-toggle');check('reduced motion skips particles but preserves football',"wabi.planet.mode==='football'&&wabi.planet.footballTransition===null")
check('no browser errors',"true")
errors=run('errors');assert not errors,errors
(root/'artifacts/worldcup-checks.json').write_text(json.dumps({'passed':checks,'ballNames':seen,'celestialNames':celestial},indent=2),encoding='utf-8')
print(f'PASS {len(checks)} checks')
