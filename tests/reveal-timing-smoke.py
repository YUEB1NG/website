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
 let t=performance.now(),nameEvents=[],wordEvents=[],previousName=false,previousWord='Learn',overlap=false;
 document.querySelector('[data-reveal=name]').click();document.querySelector('[data-reveal=word]').click();
 function frame(now){const profile=name.classList.contains('profile'),text=word.textContent;
  const a=+getComputedStyle(document.querySelector('.english-name')).opacity,b=+getComputedStyle(document.querySelector('.profile-name')).opacity;
  overlap ||= a>.01&&b>.01;
  if(profile!==previousName){nameEvents.push({ms:now-t,profile});previousName=profile;}
  if(text!==previousWord){wordEvents.push({ms:now-t,text});previousWord=text;}
  if(nameEvents.length<3)requestAnimationFrame(frame);else resolve({nameEvents,wordEvents,overlap});
 }requestAnimationFrame(frame);
})""")
assert not data['overlap'],'English/profile overlap during fades'
previous=0
for e in data['nameEvents']:
    assert 2980<=e['ms']-previous<=6085,data
    previous=e['ms']
intervals=[data['nameEvents'][0]['ms']]+[b['ms']-a['ms'] for a,b in zip(data['nameEvents'],data['nameEvents'][1:])]
assert max(intervals)-min(intervals)>30,('Intervals did not vary',data)
assert [e['profile'] for e in data['nameEvents']]==[True,False,True],data
for i,e in enumerate(data['wordEvents']):
    assert abs(e['ms']-(1000+2222*i))<85,data
    assert e['text']==['Build','Share','Learn'][i%3],data
print('PASS name alternates with fresh 3-6s random intervals; word retains 1000ms delay and 2222ms cadence',flush=True)
print('PASS no overlapping English/Chinese during transitions',flush=True)
# Closing the triggers must cancel future changes and reset the initial labels.
js("document.querySelector('[data-reveal=name]').click();document.querySelector('[data-reveal=word]').click()")
js('new Promise(r=>setTimeout(r,2500))')
assert js("!document.querySelector('.name-line').classList.contains('profile')&&document.querySelector('#flip-word').textContent==='Learn'")
print('PASS closing reveals stops both cycles',flush=True)
run('set','media','light','reduced-motion')
js("document.querySelector('[data-reveal=name]').click();document.querySelector('[data-reveal=word]').click()")
js('new Promise(r=>setTimeout(r,6500))')
assert js("document.querySelector('.name-line').classList.contains('profile')&&document.querySelector('#flip-word').textContent==='Build'")
print('PASS reduced motion reveals once and does not loop',flush=True)
assert not run('errors')
(root/'artifacts/reveal-timing-checks.json').write_text(json.dumps(data,indent=2),encoding='utf-8')
print(json.dumps(data,ensure_ascii=False),flush=True)
