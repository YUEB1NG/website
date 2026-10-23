import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1];cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=35);assert r.returncode==0,r.stdout+r.stderr;return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
checks=[]
for width,height in [(390,844),(1280,800)]:
 run('set','media','light');run('set','viewport',str(width),str(height));run('open','http://127.0.0.1:5173/');run('wait','--fn',"wabi.state==='rest'");run('snapshot')
 frames=js("""new Promise(resolve=>{const frames=[],start=performance.now();document.querySelector('#start').click();function sample(now){const prompt=document.querySelector('#start'),greeting=document.querySelector('#greeting');const a=Number(getComputedStyle(prompt).opacity),root=Number(getComputedStyle(greeting).opacity);const rows=[...greeting.children].map(r=>root*Number(getComputedStyle(r).opacity));frames.push({time:now-start,prompt:a,visible:getComputedStyle(prompt).visibility,rows});if(now-start<1100)requestAnimationFrame(sample);else resolve(frames)}requestAnimationFrame(sample)})""")
 assert all(not(f['prompt']>.01 and max(f['rows'])>.01) for f in frames),frames
 assert all(f['visible']=='hidden' for f in frames if f['time']>230)
 assert max(frames[-1]['rows'])>.99
 checks.append({'width':width,'frames':frames});print('PASS no overlapping entry text',width,flush=True)
run('set','viewport','390','844')
(root/'artifacts/entrance-checks.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
