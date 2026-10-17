"""Browser coverage for system defaults, live changes, and explicit overrides."""
import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
checks=[]
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=40)
 assert r.returncode==0,r.stderr or r.stdout
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
def check(label,expected):
 run('wait','--fn',f"document.documentElement.dataset.theme==='{expected}'")
 result=js("({theme:document.documentElement.dataset.theme,chrome:document.querySelector('meta[name=theme-color]').content,scheme:document.documentElement.style.colorScheme})")
 assert result=={'theme':expected,'chrome':'#000000' if expected=='night' else '#f4f6fa','scheme':'dark' if expected=='night' else 'light'},(label,result)
 checks.append(label);print('PASS',label,flush=True)
run('set','viewport','390','844');run('open','http://127.0.0.1:5173/');run('snapshot','-i')
js("localStorage.removeItem('yueb1ng-theme')")
run('set','media','dark');run('reload');run('wait','--fn',"window.wabi?.state==='rest'")
check('new visit uses dark system theme','night')
run('set','media','light');check('system light change updates page and browser chrome','day')
run('set','media','dark');check('system dark change updates page and browser chrome','night')
run('click','#start');run('wait','--fn','wabi.position.radius<50.1');run('click','[data-reveal=name]');run('wait','--fn',"!document.querySelector('.profile-name').inert")
run('click','#theme-toggle');check('avatar manually switches to day','day')
run('set','media','light');run('set','media','dark');check('explicit choice overrides later system changes','day')
run('reload');run('wait','--fn',"window.wabi?.state==='rest'");check('explicit choice survives reload','day')
js("localStorage.removeItem('yueb1ng-theme')");run('set','media','light');run('reload');run('wait','--fn',"window.wabi?.state==='rest'");check('new light-system visit starts in day mode','day')
assert not run('errors')
(root/'artifacts/theme-system-checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
