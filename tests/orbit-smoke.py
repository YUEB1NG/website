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
    run('set','media','dark');run('set','viewport','390','844')
    run('open',sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5173/')
    wait("window.wabi && window.wabi.state==='rest'")
    run('click','#start');wait('Math.abs(window.wabi.position.radius-50)<.1')
    run('mouse','move','195','338');run('mouse','down');pause(700)
    check('Long press gathers orbit',"window.wabi.orbit")
    run('mouse','up')
    check('Long press release does not trigger short tap',"window.wabi.state==='revealed' && window.wabi.planet.name==='Earth'")
    pause(1600);run('screenshot',str(out/'planet-orbit.png'))
    run('mouse','down');pause(700);run('mouse','up')
    check('Second long press releases orbit',"!window.wabi.orbit && window.wabi.state==='revealed'")
    run('mouse','down');run('mouse','move','195','700','--steps','24','--duration','300');pause(650);run('mouse','up')
    check('Dragging cancels long press',"!window.wabi.orbit && window.wabi.state==='rest'")
    wait('window.wabi.position.radius>199')
    run('mouse','move','195','790');run('mouse','down');run('mouse','up')
    check('Short tap still advances planet',"window.wabi.planet.name==='Mars' && window.wabi.state==='revealed'")
    run('press','o');check('Keyboard O gathers orbit',"window.wabi.orbit")
    run('set','media','dark','reduced-motion');pause(100)
    check('Reduced motion preserves deliberate orbit',"window.wabi.orbit")
    run('press','Escape');check('Returning clears orbit',"!window.wabi.orbit && window.wabi.state==='rest'")
    check('No orbit runtime errors',json.dumps(run('errors'))+"==='' ")
    print(f'{len(checks)} orbit checks passed.',flush=True)
finally:
    (out/'orbit-results.json').write_text(json.dumps(checks,indent=2))
    run('set','media','dark')
