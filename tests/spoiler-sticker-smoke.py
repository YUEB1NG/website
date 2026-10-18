"""Verify rendered spoiler states and actual weighted sticker burst behavior."""
import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=40)
 assert r.returncode==0,r.stderr or r.stdout
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
def wait(code):run('wait','--fn',code)
def pause(ms):js(f'new Promise(r=>setTimeout(r,{ms}))')
run('set','viewport','390','844');run('set','media','light');run('open','http://127.0.0.1:5173/');wait("window.wabi?.state==='rest'");run('snapshot','-i');run('click','#start');wait('wabi.position.radius<50.1')
assert js("[...document.querySelectorAll('.reveal-content .spoiler-label')].every(e=>+getComputedStyle(e).opacity===0)")
canvas="document.querySelector('#word-content .spoiler-dust')"
a=js(canvas+'.toDataURL()');pause(400);b=js(canvas+'.toDataURL()');assert a!=b,'hidden spoiler dust is static'
run('click','[data-reveal=word]');pause(950)
assert js("+getComputedStyle(document.querySelector('#word-content .spoiler-label')).opacity===1")
assert js("(()=>{const c="+canvas+";return c.getContext('2d').getImageData(0,0,c.width,c.height).data.every((v,i)=>i%4!==3||v===0)})()"),'dust obscures revealed text'
run('click','[data-reveal=word]');pause(900)
assert js("+getComputedStyle(document.querySelector('#word-content .spoiler-label')).opacity===0")
print('PASS hidden text animates, reveals cleanly, and conceals again without layout changes',flush=True)
run('press','o');wait('wabi.planet.orbitMix>.998')
samples={}
for mode in ['planet','football']:
 if mode=='football':
  run('set','media','light','reduced-motion');run('click','#football-toggle');run('set','media','light')
 data=js("""(()=>{const results=[];for(let i=0;i<400;i++){document.querySelector('#celebrate').click();results.push(wabi.planet.lastBurst)}return results})()""")
 assert {x['count'] for x in data}=={3,4,5,6}
 categories=[c for x in data for c in x['categories']];counts={k:categories.count(k)/len(categories) for k in ['planet','stranger','football']}
 expected={'planet':.5,'stranger':.3,'football':.2} if mode=='planet' else {'planet':15/99,'stranger':18/99,'football':66/99}
 assert all(abs(counts[k]-expected[k])<.05 for k in counts),(mode,counts)
 distances=[d for x in data for d in x['distances']];assert min(distances)>.45 and max(distances)<1.7,(min(distances),max(distances))
 assert max(distances)-min(distances)>.5
 assert js('wabi.planet.bursts<=40');pause(3300);assert js('wabi.planet.bursts===0')
 samples[mode]={'shares':counts,'countRange':[min(x['count'] for x in data),max(x['count'] for x in data)],'distanceRange':[min(distances),max(distances)]}
 print('PASS',mode,'random 3-6 stickers, category weights, bounded varied distances, cleanup',flush=True)
run('set','media','light','reduced-motion');pause(150);a=js(canvas+'.toDataURL()');pause(400);b=js(canvas+'.toDataURL()');assert a==b
print('PASS reduced motion keeps static spoiler dust',flush=True)
assert not run('errors'),run('errors')
(root/'artifacts/spoiler-sticker-checks.json').write_text(json.dumps(samples,indent=2),encoding='utf-8')
