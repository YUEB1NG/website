"""Regression checks for gesture ownership, locked orbit art and continuous exit."""
import base64,json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
checks=[]
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=40)
 assert r.returncode==0,r.stderr or r.stdout
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS',name,flush=True)
def wait(code):run('wait','--fn',code)
run('set','media','dark');run('set','viewport','390','844');run('errors','--clear')
run('open',sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:49382/')
wait("window.wabi?.state==='rest'");run('click','#start')
wait('wabi.position.radius<50.1&&wabi.planet.covers?.prepared>0&&wabi.planet.stickersLoaded>0')
run('press','o');wait('wabi.planet.orbitMix>.98')
before=js("wabi.planet.covers.coverKeys")
run('wait','6200')
check('orbit keeps the same covers beyond former replacement interval',before==js("wabi.planet.covers.coverKeys"))
# Edge-origin touches on the scene are left to the browser rather than captured.
x=js("wabi.position.x")
js("""(()=>{const a=document.querySelector('#wabi');for(const [type,x] of [['pointerdown',2],['pointermove',140],['pointerup',140]])a.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'touch',pointerId:999,isPrimary:true,button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:200}));return true})()""")
run('wait','100')
check('edge-origin navigation does not move the globe',abs(js("wabi.position.x")-x)<1)
# A real orb drag remains owned even while crossing the edge.
run('mouse','move','195','338');run('mouse','down')
run('mouse','move','5','338','--steps','24','--duration','400');run('wait','250')
check('a drag begun on the orb continues at the side',js("wabi.position.x<100"))
run('mouse','move','195','620','--steps','30','--duration','600');run('wait','300')
check('orbit covers remain present below former abrupt cutoff',js("wabi.planet.surfaceMix>0&&wabi.planet.surfaceMix<.5&&wabi.planet.orbitCount>0"))
check('orb and covers share gradual canvas opacity',js("Math.abs(+document.querySelector('#planet-scene').style.opacity-wabi.planet.surfaceMix)<.0001"))
run('mouse','move','195','800','--steps','30','--duration','600');run('mouse','up')
wait("wabi.state==='rest'&&wabi.position.radius>199.9")
run('click','#start');wait("wabi.position.radius<50.1");run('wait','350')
run('snapshot','-i');run('dblclick','#orb');run('wait','350')
check('double tap emits stickers without closing the planet',js("wabi.state==='revealed'&&wabi.planet.bursts>=3"))
run('mouse','move','195','338');run('mouse','down');run('wait','650');run('mouse','up')
check('long press still gathers covers',js("wabi.orbit&&wabi.state==='revealed'"))
blocked=js("""['contextmenu','copy','selectstart','dblclick','gesturestart','gesturechange'].map(type=>{const target=type==='dblclick'?document.querySelector('#orb'):document;const e=new Event(type,{bubbles:true,cancelable:true});target.dispatchEvent(e);return e.defaultPrevented})""")
check('copy, context menu, double-click zoom and gesture zoom are suppressed',all(blocked))
run('press','Escape');wait('wabi.position.radius>199.9')
check('no gesture runtime errors',not run('errors'))
(root/'artifacts/gesture-check.json').write_text(json.dumps(checks,indent=2))
print(str(len(checks))+' gesture checks passed.')
