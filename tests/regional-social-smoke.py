"""Region routing, fallback, cache privacy, theme inheritance and existing motion."""
import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,'--cdp','http://127.0.0.1:9223','--init-script',str(root/'tests/fixtures/regional-ip-mock.js'),*args],capture_output=True,text=True,encoding='utf-8',timeout=40);assert r.returncode==0,r.stderr or r.stdout;return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
def wait(code):run('wait','--fn',code)
def route(primary,backup):
 js('sessionStorage.setItem("test-regional-responses",'+json.dumps(json.dumps({'primary':primary,'backup':backup}))+')')
def reload():
 js("sessionStorage.removeItem('yueb1ng-region-v1');localStorage.removeItem('yueb1ng-theme')")
 run('reload');wait("window.wabi?.state==='rest'&&document.querySelector('#social').dataset.regionReady==='true'");run('snapshot','-i')
 js("window.__regionalMockCalls=0;window.dispatchEvent(new Event('online'))");js('new Promise(r=>setTimeout(r,550))')
def state():return js("(()=>{const a=document.querySelector('#social'),svg=a.querySelector('svg'),path=svg.querySelector('path');return {platform:a.dataset.platform,href:a.href,text:a.textContent,fill:getComputedStyle(path).fill,color:getComputedStyle(a).color,icon:path.getAttribute('d'),target:a.target,rel:a.rel,opacity:+getComputedStyle(a).opacity}})()")
run('set','viewport','390','844');run('set','media','light');run('open','http://127.0.0.1:5173/');wait("!!window.wabi")
route({'country':'CN','ip':'192.0.2.1'},None);reload();cn=state()
assert cn['platform']=='douyin' and cn['href']=='https://v.douyin.com/XjA2pCkbk6M' and '@YUEB1NG' in cn['text']
assert cn['fill']==cn['color']=='rgb(39, 50, 66)'
assert cn['target']=='_blank' and 'noopener' in cn['rel']
assert js("(()=>{const c=JSON.parse(sessionStorage.getItem('yueb1ng-region-v1'));return c.country==='CN'&&Object.keys(c).sort().join(',')==='country,time'})()")
run('click','#start');wait("+getComputedStyle(document.querySelector('#social')).opacity>.95")
run('screenshot',str(root/'artifacts/social-douyin-day.png'))
run('set','media','dark');wait("wabi.theme==='night'&&getComputedStyle(document.querySelector('#social')).color==='rgb(255, 255, 255)'");night=state();assert night['fill']==night['color']=='rgb(255, 255, 255)'
run('screenshot',str(root/'artifacts/social-douyin-night.png'))
print('PASS CN uses supplied Douyin link/icon, dark ink by day, white at night, no stored IP',flush=True)
# A warm tab uses only a country code, including when lookups are unavailable.
route(None,None);run('reload');wait("!!window.wabi&&document.querySelector('#social').dataset.regionReady==='true'");assert state()['platform']=='douyin'
print('PASS valid country cache survives unavailable providers',flush=True)
route({'country':'US'},None);reload();us=state();assert us['platform']=='x' and us['href']=='https://x.com/yueb1ng' and us['text']==cn['text'] and us['icon']!=cn['icon'] and us['fill']=='rgb(255, 255, 255)'
run('set','media','light');wait("wabi.theme==='day'&&getComputedStyle(document.querySelector('#social')).color==='rgb(39, 50, 66)'");assert state()['fill']=='rgb(39, 50, 66)'
print('PASS overseas uses supplied X icon and existing account link in both themes',flush=True)
route({'country':'invalid'},{'country_code':'CN'});reload();assert state()['platform']=='douyin'
print('PASS invalid primary response falls back to second IP lookup',flush=True)
route(None,None);reload();assert state()['platform']=='x'
run('click','#start');wait("+getComputedStyle(document.querySelector('#social')).opacity>.95")
print('PASS lookup failure retains usable X link and does not block page entry',flush=True)
# An online refresh changes label, icon, and href together without touching page state.
route({'country':'CN'},None);js("window.dispatchEvent(new Event('online'))");wait("document.querySelector('#social').dataset.platform==='douyin'")
assert state()['href']=='https://v.douyin.com/XjA2pCkbk6M' and js("wabi.state==='revealed'")
print('PASS network refresh switches the complete footer without resetting the page',flush=True)
# Existing downward-drag fade remains active.
p=js('wabi.position');run('mouse','move',str(round(p['x'])),str(round(p['y'])));run('mouse','down');run('mouse','move',str(round(p['x'])),str(round(p['y']+160)))
wait("+getComputedStyle(document.querySelector('#social')).opacity<.15");assert state()['opacity']<.15;run('mouse','up')
print('PASS footer still fades away while the sphere is dragged down',flush=True)
assert not run('errors'),run('errors')
js("sessionStorage.removeItem('yueb1ng-region-v1');sessionStorage.removeItem('test-regional-responses')")
(root/'artifacts/regional-social-checks.json').write_text(json.dumps({'cnDay':cn,'cnNight':night,'overseas':us,'mockedCountries':['CN','US'],'liveMainlandNetworkTested':False},ensure_ascii=False,indent=2),encoding='utf-8')
