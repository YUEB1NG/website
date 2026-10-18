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
assert js("[...document.querySelectorAll('.reveal-content')].every(e=>getComputedStyle(e).filter==='blur(5px)')")
assert js("document.querySelectorAll('.spoiler-dust').length===0")
run('click','[data-reveal=word]');pause(1100)
assert js("getComputedStyle(document.querySelector('#word-content')).filter==='blur(0px)'")
run('click','[data-reveal=word]');pause(1100)
assert js("getComputedStyle(document.querySelector('#word-content')).filter==='blur(5px)'")
print('PASS original blur restored at 5px and click reveal/close works',flush=True)
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
 distances=[d for x in data for d in x['distances']];assert min(distances)>1.9 and max(distances)<3.85,(min(distances),max(distances))
 assert max(distances)-min(distances)>.5
 assert js('wabi.planet.bursts<=40');pause(3300);assert js('wabi.planet.bursts===0')
 samples[mode]={'shares':counts,'countRange':[min(x['count'] for x in data),max(x['count'] for x in data)],'distanceRange':[min(distances),max(distances)]}
 print('PASS',mode,'random 3-6 stickers, category weights, bounded varied distances, cleanup',flush=True)
motion=js("""new Promise(resolve=>{document.querySelector('#celebrate').click();const snapshots=[],times=[1.3,1.8,2.2];function sample(){const items=wabi.planet.stickerMotion;if(items.length&&items[0].age>=times[snapshots.length])snapshots.push(items);if(snapshots.length===3)resolve(snapshots);else requestAnimationFrame(sample)}requestAnimationFrame(sample)})""")
a,b,c=motion
assert len(a)==len(b)==len(c) and len(a)>=3
assert all(((y['x']-x['x'])**2+(y['y']-x['y'])**2)**.5>.04 for x,y in zip(a,b)), 'stickers freeze near the end'
assert all(y['opacity']<x['opacity'] for x,y in zip(a,c)), 'stickers do not fade while moving'
assert all(((y['x']-x['x'])**2+(y['y']-x['y'])**2)**.5>.015 for x,y in zip(b,c)), 'final fade freezes'
pause(900);assert js('wabi.planet.bursts===0')
print('PASS stickers keep moving during the final fade and are removed',flush=True)
assert not run('errors'),run('errors')
(root/'artifacts/spoiler-sticker-checks.json').write_text(json.dumps(samples,indent=2),encoding='utf-8')
