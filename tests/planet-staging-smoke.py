"""Surface identity must stay fixed from the first visible drag frame to release."""
import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=45);assert r.returncode==0,r.stderr or r.stdout;return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
def wait(code):run('wait','--fn',code)
run('set','viewport','390','844');run('set','media','light');run('open','http://127.0.0.1:5173/')
wait("window.wabi?.state==='rest'");run('snapshot','-i')
assert js('wabi.planet.warmedPlanets.length')==10
run('click','#start');wait('wabi.position.radius<50.1')
checks=[]
for expected in ['Mars','Jupiter','Saturn','Uranus','Neptune','Moon','Sun','Mercury','Venus','Earth']:
 run('press','Escape');wait('wabi.position.radius>199.9')
 before=js('({name:wabi.planet.name,mix:wabi.planet.surfaceMix,texture:wabi.planet.surfaceTexture,programs:wabi.planet.shaderPrograms})')
 assert before['name']==expected and before['mix']==0,(expected,before)
 run('mouse','move','195','780');run('mouse','down')
 frames=[]
 for y in [680,580,480,380]:
  run('mouse','move','195',str(y))
  frames.append(js('({name:wabi.planet.name,mix:wabi.planet.surfaceMix,texture:wabi.planet.surfaceTexture,programs:wabi.planet.shaderPrograms})'))
 run('mouse','up');wait('wabi.position.radius<50.1')
 after=js('({name:wabi.planet.name,texture:wabi.planet.surfaceTexture,programs:wabi.planet.shaderPrograms})')
 assert all(f['name']==expected and f['texture']==before['texture'] for f in frames) and after['name']==expected,(expected,frames,after)
 assert max(f['mix'] for f in frames)>0,'drag did not reveal the surface'
 assert after['programs']==before['programs'],'shader compiled during entry'
 checks.append({'expected':expected,'before':before,'frames':frames,'after':after})
 print('PASS staged drag',expected,flush=True)
# A rapid reversal may finish closing, but may never change visible pixels to another planet.
r=js("""new Promise(resolve=>{const frames=[];document.querySelector('#orb').click();setTimeout(()=>document.querySelector('#orb').click(),80);const start=performance.now();function sample(){const p=wabi.planet;frames.push({name:p.name,mix:p.surfaceMix});if(performance.now()-start>2300)resolve(frames);else requestAnimationFrame(sample)}requestAnimationFrame(sample)})""")
changes=[(a,b) for a,b in zip(r,r[1:]) if a['name']!=b['name']]
assert changes and all(a['mix']<.005 and b['mix']<.005 for a,b in changes),changes
assert r[-1]['name']=='Mars' and r[-1]['mix']>.99
(root/'artifacts/planet-staging-checks.json').write_text(json.dumps({'cycles':checks,'rapidReversal':r},indent=2),encoding='utf-8')
print('PASS rapid reversal changes surface only while hidden')
