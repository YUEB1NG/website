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
def hour(h):
    js(f"window.RealDate??=Date;window.Date=class extends window.RealDate{{getHours(){{return {h}}}}};window.dispatchEvent(new Event('pageshow'))")

try:
    run('set','media','dark')
    run('set','viewport','390','844')
    run('open',sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5173/')
    wait("window.wabi && window.wabi.state==='rest'")
    check('Title is YUEB1NG',"document.title==='YUEB1NG'")
    check('Original glass uses WebGL',"window.wabi.renderer==='webgl'")
    check('Planets use Three.js',"window.wabi.planet.renderer==='threejs'")
    check('Earth textures loaded',"window.wabi.planet.ready")
    check('Original particles retained pending X list',"new Set(performance.getEntriesByType('resource').filter(e=>e.name.includes('/bubbles/')).map(e=>e.name)).size===45")
    run('click','#start');wait('Math.abs(window.wabi.position.radius-50)<.1')
    check('First visit is Earth',"window.wabi.planet.name==='Earth'")
    check('No mobile overflow',"document.documentElement.scrollWidth===innerWidth")
    check('Three lines share center',"[...document.querySelector('#greeting').children].every(e=>{const r=e.getBoundingClientRect();return Math.abs(r.x+r.width/2-innerWidth/2)<1})")
    check('Greeting moved down two lines',"document.querySelector('#greeting').getBoundingClientRect().top>innerHeight*.58")
    check('X link lower and clear of bottom',"(()=>{const r=document.querySelector('#social').getBoundingClientRect();return r.top>innerHeight*.86&&r.bottom<innerHeight-12})()")
    check('No black footer mask',"getComputedStyle(document.querySelector('#social')).backgroundColor==='rgba(0, 0, 0, 0)'")
    check('No text shadow',"getComputedStyle(document.querySelector('#greeting')).textShadow==='none'")
    check('Correct X destination',"document.querySelector('#social').href==='https://x.com/yueb1ng'")
    pause(9500)
    check('Words stay still before click',"document.querySelector('#flip-word').textContent==='Learn' && !document.querySelector('.name-line').classList.contains('profile')")
    for h,expected in [(6,'night'),(7,'day'),(18,'day'),(19,'night')]:
        hour(h)
        check(f'Local hour {h} selects {expected}',f"window.wabi.theme==='{expected}'")
        color='#f4f6fa' if expected=='day' else '#000000'
        check(f'Safari theme metadata at {h}',f"document.querySelector('meta[name=theme-color]').content==='{color}'")
    run('screenshot',str(out/'planets-night.png'))
    hour(12);pause(120)
    run('screenshot',str(out/'planets-day.png'))
    run('click','[data-reveal=name]');run('click','[data-reveal=word]');run('mouse','move','10','700')
    wait("getComputedStyle(document.querySelector('#word-content')).filter==='blur(0px)'")
    check('Click reveals',"document.querySelector('[data-reveal=word]').getAttribute('aria-expanded')==='true'")
    bounds=js("(()=>{let r=document.querySelector('.word-trigger').getBoundingClientRect();return {x:r.x,width:r.width}})()")
    pause(3500)
    check('Click does not immediately rotate word',"document.querySelector('#flip-word').textContent==='Learn'")
    wait("document.querySelector('#flip-word').textContent==='Build'")
    check('Word changes with no letter nodes',"document.querySelector('#flip-word').children.length===0")
    check('Word capsule width stays fixed',f"Math.abs(document.querySelector('.word-trigger').getBoundingClientRect().width-{bounds['width']})<.1")
    wait("document.querySelector('.name-line').classList.contains('profile')")
    check('Avatar after deliberate reveal',"document.querySelector('.avatar-ring img').naturalWidth===1280 && document.querySelector('.profile-name').getAttribute('aria-hidden')==='false'")
    run('hover','.profile-name');pause(250)
    check('Profile hover does not flicker',"document.querySelector('.name-line').classList.contains('profile')")
    run('click','.profile-name')
    check('Profile click restores name',"!document.querySelector('.name-line').classList.contains('profile') && document.querySelector('[data-reveal=name]').getAttribute('aria-expanded')==='false'")
    run('click','[data-reveal=word]')
    wait("getComputedStyle(document.querySelector('#word-content')).filter==='blur(4px)'")
    old=js("document.querySelector('#flip-word').textContent")
    pause(9000)
    check('Closing stops word cycle',f"document.querySelector('#flip-word').textContent==={json.dumps(old)}")
    # Use real pointer releases to test the glass/planet toggle path, not direct state changes.
    for name in ['Mars','Jupiter','Saturn','Uranus','Neptune','Mercury','Venus','Earth']:
        run('click','#orb');wait("window.wabi.state==='rest' && window.wabi.position.radius>199")
        run('mouse','move','195','790');run('mouse','down');run('mouse','up')
        wait("window.wabi.state==='revealed' && window.wabi.position.radius<51")
        check(f'Glass cycles to {name}',f"window.wabi.planet.name==='{name}'")
        if name in ['Saturn','Venus']:run('screenshot',str(out/f'planet-{name.lower()}.png'))
    run('set','viewport','1440','960');pause(250)
    run('screenshot',str(out/'planets-desktop.png'))
    run('set','viewport','390','844')
    run('mouse','move','195','338');run('mouse','down');run('mouse','move','195','790','--steps','24','--duration','450');run('mouse','up')
    wait("window.wabi.state==='rest'")
    check('Drag down returns to glass',"window.wabi.state==='rest'")
    wait('Math.abs(window.wabi.position.y-innerHeight)<1')
    run('click','#back');check('Replay locks input',"window.wabi.state==='intro' && document.querySelector('#wabi').inert")
    run('press','Escape');check('Skip restores background',"document.querySelector('#blueprint').hidden && window.wabi.theme==='day'")
    run('set','media','dark','reduced-motion');run('reload')
    wait("window.wabi && window.wabi.state==='rest'")
    check('Reduced motion skips blueprint',"document.querySelector('#blueprint').hidden")
    run('press','Enter');check('Keyboard entry',"window.wabi.state==='revealed'")
    rotation=js('window.wabi.planet.rotation');pause(500)
    check('Reduced motion stops rotation',f'window.wabi.planet.rotation==={rotation}')
    run('set','viewport','375','568');pause(150)
    check('Small screen text and footer do not overlap',"document.querySelector('#greeting').getBoundingClientRect().bottom+12<document.querySelector('#social').getBoundingClientRect().top")
    check('No page runtime errors',json.dumps(run('errors'))+"==='' ")
    print(f'{len(checks)} checks passed.',flush=True)
finally:
    (out/'smoke-results.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    run('set','media','dark')
