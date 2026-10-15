"""Regression coverage for continuous sphere entry and interruptible particle morphs."""
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
timing=js("(()=>{const t=performance.now();document.querySelector('#football-toggle').click();return {ms:performance.now()-t,transition:wabi.planet.footballTransition}})()")
check('like starts a surface particle transition',timing['transition']['particles']==1500)
wait('wabi.planet.footballTransition?.progress>.25')
run('screenshot',str(root/'artifacts/transition-exploded.png'))
check('outgoing state survives until reassembly',js("wabi.planet.name==='Earth'&&wabi.planet.footballTransition.progress<1"))
wait('wabi.planet.footballTransition===null')
check('reassembly completes as Qatar ball',js("wabi.planet.name==='2022 Al Rihla'"))
run('screenshot',str(root/'artifacts/transition-reassembled.png'))
click('#football-toggle')
js("for(let i=0;i<5;i++)document.querySelector('#football-toggle').click()")
wait("wabi.planet.footballTransition===null")
check('rapid clicks coalesce and complete without piling effects',js("wabi.planet.name==='1930 Tiento'"))
click('#football-toggle');click('#trophy-toggle')
check('trophy interrupts and cleans up particles',js("wabi.planet.mode==='trophy'&&wabi.planet.footballTransition===null"))
click('#football-toggle');run('press','Escape')
check('return to ring cancels unfinished particles',js("wabi.state==='rest'&&wabi.planet.footballTransition===null"))
wait('wabi.position.radius>199.9');click('#start');wait('wabi.position.radius<50.1')
check('enter after cancellation restores a solid planet',js("wabi.planet.mode==='planet'&&wabi.planet.surfaceMix>.99"))
run('set','media','light','reduced-motion');click('#football-toggle')
check('reduced motion uses an immediate complete ball',js("wabi.planet.mode==='football'&&wabi.planet.footballTransition===null"))
run('set','media','light');click('#football-toggle');run('set','media','light','reduced-motion')
wait('wabi.planet.footballTransition===null')
check('enabling reduced motion mid-transition finishes cleanly',js("wabi.planet.mode==='football'"))
check('no browser errors',not run('errors'))
log=run('console')
check('no shader compilation errors','THREE.WebGLProgram' not in log and '[error]' not in log)
(root/'artifacts/transition-checks.json').write_text(json.dumps({'passed':checks,'entryFrames':frames,'clickPreparationMs':timing['ms']},indent=2),encoding='utf-8')
print(f'PASS {len(checks)} checks; click preparation {timing["ms"]:.1f}ms')
