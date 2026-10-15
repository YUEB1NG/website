"""Browser checks through the agent-browser CLI; connect a disposable browser first."""
import base64,json,pathlib,subprocess,shutil,sys

root=pathlib.Path(__file__).resolve().parents[1]
binary=root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe'
cli=str(binary) if binary.exists() else shutil.which('agent-browser')
if not cli: raise SystemExit('Install agent-browser and connect it to a disposable browser first.')
out=root/'artifacts';out.mkdir(exist_ok=True)
checks=[]

def run(*args):
    result=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',cwd=root,timeout=35)
    if result.returncode: raise AssertionError(result.stderr or result.stdout)
    return result.stdout.strip()

def js(source):
    result=json.loads(run('eval','--json','-b',base64.b64encode(source.encode()).decode()))
    assert result['success'], result
    return result['data']['result']

def check(name,expression):
    value=js(expression)
    assert value, f'{name}: {value}'
    checks.append({'check':name,'passed':True})
    print('PASS',name,flush=True)

def wait(expression): run('wait','--fn',expression)

def pause(ms): js(f'new Promise(resolve=>setTimeout(()=>resolve(true),{ms}))')
try:
    run('set','media','dark');run('set','viewport','390','844')
    run('open',sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5173/')
    js("localStorage.removeItem('yueb1ng-theme')");run('reload')
    wait("window.wabi && window.wabi.state==='rest'")
    check('Title',"document.title==='YUEB1NG'")
    check('Default white theme',"window.wabi.theme==='day'")
    check('Three.js renderer',"window.wabi.planet.renderer==='threejs'")
    check('All eight planet maps loaded',"window.wabi.planet.loadedSurfaces===8")
    check('Copy and callout disabled in CSS',"getComputedStyle(document.body).userSelect==='none'")
    check('Copy/context/selection events cancelled',"['copy','contextmenu','selectstart','dragstart'].every(t=>!document.body.dispatchEvent(new Event(t,{bubbles:true,cancelable:true})))")
    run('click','#start');wait('window.wabi.position.radius<50.1')
    check('Initial Earth',"window.wabi.planet.name==='Earth'")
    rotation=js('window.wabi.planet.rotation');pause(700)
    check('Slow planet rotation',f'window.wabi.planet.rotation>{rotation} && window.wabi.planet.rotation-{rotation}<.055')
    check('Centered three text lines',"[...document.querySelector('#greeting').children].every(e=>{let r=e.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<1})")
    check('No mobile overflow',"document.documentElement.scrollWidth===innerWidth")
    check('Footer has no mask',"getComputedStyle(document.querySelector('#social')).backgroundColor==='rgba(0, 0, 0, 0)'")
    pause(8500)
    check('Words stationary until click',"document.querySelector('#flip-word').textContent==='Learn' && !document.querySelector('.name-line').classList.contains('profile')")
    run('screenshot',str(out/'natural-earth-day.png'))
    run('click','[data-reveal=name]');wait("!document.querySelector('.profile-name').inert")
    check('Profile exposes separate buttons',"document.querySelector('.profile-name').querySelectorAll('button').length===2")
    check('Profile is nudged left',"new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.profile-name')).transform).m41 < -8")
    run('click','#theme-toggle')
    check('Avatar switches to night',"window.wabi.theme==='night' && document.querySelector('#theme-toggle').getAttribute('aria-pressed')==='true'")
    check('Night browser chrome matches',"document.querySelector('meta[name=theme-color]').content==='#000000' && getComputedStyle(document.body).backgroundColor==='rgb(0, 0, 0)'")
    js("window.dispatchEvent(new Event('pageshow'))")
    check('Manual theme survives page restore',"window.wabi.theme==='night'")
    run('mouse','move','195','338');run('mouse','down');pause(700);run('mouse','up');pause(1800)
    check('Long press gathers without short tap',"window.wabi.orbit && window.wabi.state==='revealed'")
    check('Orbit has true front and back depth',"window.wabi.planet.orbitDepth[0]<-.5 && window.wabi.planet.orbitDepth[1]>.5 && window.wabi.planet.depthTest")
    run('screenshot',str(out/'natural-earth-orbit.png'))
    run('click','#mooncake-toggle')
    check('Name toggles spherical mooncake',"window.wabi.planet.mooncake && window.wabi.planet.name==='Mooncake'")
    rotation=js('window.wabi.planet.rotation');pause(700)
    check('Mooncake also rotates slowly',f'window.wabi.planet.rotation>{rotation} && window.wabi.planet.rotation-{rotation}<.055')
    run('screenshot',str(out/'mooncake-night.png'))
    run('click','#theme-toggle');check('Avatar toggles day with mooncake retained',"window.wabi.theme==='day' && window.wabi.planet.mooncake")
    pause(250);run('screenshot',str(out/'mooncake-day.png'))
    run('click','#mooncake-toggle');check('Second name click restores Earth',"window.wabi.planet.name==='Earth' && !window.wabi.planet.mooncake")
    run('click','[data-reveal=word]');pause(3000)
    check('Word cycling remains slow',"document.querySelector('#flip-word').textContent==='Learn'")
    wait("document.querySelector('#flip-word').textContent==='Build'")
    check('Whole-word transition has no letter reflow',"document.querySelector('#flip-word').children.length===0")
    for name in ['Mars','Jupiter','Saturn','Uranus','Neptune','Mercury','Venus','Earth']:
        run('click','#orb');wait("window.wabi.state==='rest' && window.wabi.position.radius>199")
        run('mouse','move','195','790');run('mouse','down');run('mouse','up')
        wait("window.wabi.state==='revealed' && window.wabi.position.radius<50.1")
        check(f'Planet cycle: {name}',f"window.wabi.planet.name==='{name}'")
        if name=='Saturn':run('screenshot',str(out/'natural-saturn.png'))
    run('click','[data-reveal=name]');wait("!document.querySelector('.profile-name').inert")
    run('click','#theme-toggle');run('reload');wait("window.wabi && window.wabi.state==='rest'")
    check('Night choice persists on reload',"window.wabi.theme==='night'")
    run('set','media','dark','reduced-motion');run('reload');wait("window.wabi && window.wabi.state==='rest'")
    run('press','Enter');check('Keyboard starts reduced-motion view',"window.wabi.state==='revealed'")
    run('click','[data-reveal=name]');wait("!document.querySelector('.profile-name').inert")
    check('Both easter eggs accessible in reduced motion',"!document.querySelector('.profile-name').inert")
    run('click','#mooncake-toggle');rotation=js('window.wabi.planet.rotation');pause(400)
    check('Reduced motion stops decorative rotation',f'window.wabi.planet.rotation==={rotation}')
    run('set','viewport','375','568');pause(250)
    check('Small viewport text clears footer',"document.querySelector('#greeting').getBoundingClientRect().bottom+12<document.querySelector('#social').getBoundingClientRect().top")
    check('No runtime errors',json.dumps(run('errors'))+"==='' ")
    print(f'{len(checks)} checks passed.',flush=True)
finally:
    (out/'smoke-results.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    run('set','media','dark')
