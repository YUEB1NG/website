"""Measure rendered name/word cycles against the user's millisecond deadlines."""
import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
    r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=40)
    assert r.returncode==0,r.stderr or r.stdout
    return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
run('set','viewport','390','844');run('set','media','light');run('open','http://127.0.0.1:5173/')
run('wait','--fn',"window.wabi?.state==='rest'");run('snapshot','-i');run('click','#start');run('wait','--fn','wabi.position.radius<50.1')
data=js("""new Promise(resolve=>{
 const name=document.querySelector('.name-line'),word=document.querySelector('#flip-word');
 let t=performance.now(),events=[],previous='false/Learn',overlap=false;
 document.querySelector('[data-reveal=name]').click();document.querySelector('[data-reveal=word]').click();
 function frame(now){const state=name.classList.contains('profile')+'/'+word.textContent;
  const a=+getComputedStyle(document.querySelector('.english-name')).opacity,b=+getComputedStyle(document.querySelector('.profile-name')).opacity;
  overlap ||= a>.01&&b>.01;
  if(state!==previous){events.push({ms:now-t,state});previous=state;}
  if(now-t<9500)requestAnimationFrame(frame);else resolve({events,overlap});
 }requestAnimationFrame(frame);
})""")
assert not data['overlap'],'English/profile overlap during fades'
expected=['false/Build','true/Build','true/Share','true/Learn','false/Learn','false/Build','true/Build']
assert [e['state'] for e in data['events']]==expected,data
for e,deadline in zip(data['events'],[1000,3000,3222,5444,6000,7666,9000]):
    assert abs(e['ms']-deadline)<85,data
print('PASS name changes at 3000/6000/9000ms; word retains 1000ms delay and 2222ms cadence',flush=True)
print('PASS no overlapping English/Chinese during transitions',flush=True)
# Closing the triggers must cancel future changes and reset the initial labels.
js("document.querySelector('[data-reveal=name]').click();document.querySelector('[data-reveal=word]').click()")
js('new Promise(r=>setTimeout(r,2500))')
assert js("!document.querySelector('.name-line').classList.contains('profile')&&document.querySelector('#flip-word').textContent==='Learn'")
print('PASS closing reveals stops both cycles',flush=True)
run('set','media','light','reduced-motion')
js("document.querySelector('[data-reveal=name]').click();document.querySelector('[data-reveal=word]').click()")
js('new Promise(r=>setTimeout(r,3500))')
assert js("document.querySelector('.name-line').classList.contains('profile')&&document.querySelector('#flip-word').textContent==='Build'")
print('PASS reduced motion reveals once and does not loop',flush=True)
assert not run('errors')
(root/'artifacts/reveal-timing-checks.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
print(json.dumps(data,ensure_ascii=False),flush=True)
