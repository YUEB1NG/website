import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1];cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=35);assert r.returncode==0,r.stdout+r.stderr;return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
run('set','media','light');run('open','http://127.0.0.1:5173/');run('wait','--fn',"wabi.state==='rest'");run('snapshot');run('click','#start');run('wait','--fn','wabi.position.radius<50.1')
result=js("""new Promise(resolve=>{const seen=new Set(),start=performance.now();let duplicates=0;function sample(){const c=wabi.planet.covers;c.ids.forEach(id=>seen.add(id));if(new Set(c.visibleCoverKeys).size!==c.visibleCoverKeys.length)duplicates++;if(performance.now()-start<12000)requestAnimationFrame(sample);else resolve({seen:seen.size,duplicates,cache:c.cachedImages,tracks:c.poolCount,unique:c.uniqueCovers})}sample()})""")
assert result['duplicates']==0 and result['seen']>40 and result['cache']<=48,result
print('PASS cover diversity',result,flush=True)
run('press','o');run('wait','--fn','wabi.planet.orbitMix>.99');run('press','o');run('wait','--fn','wabi.planet.orbitMix<.001')
run('mouse','move','195','337');run('mouse','down');run('mouse','move','195','410')
run('wait','--fn','wabi.position.y>370')
before=js('({orb:wabi.position,points:wabi.planet.particlePositions})')
run('mouse','move','195','530');run('wait','--fn','wabi.position.y>490')
after=js('({orb:wabi.position,points:wabi.planet.particlePositions})')
assert before['points'] and after['points']
def ys(frame):return [422-p['y']*frame['orb']['radius'] for p in frame['points']]
shift=sum(ys(after))/len(ys(after))-sum(ys(before))/len(ys(before))
assert shift>30,{'before':before,'after':after,'shift':shift}
run('mouse','up');run('press','Escape');run('wait','--fn','wabi.position.radius>199.9');run('click','#start');run('wait','--fn','wabi.position.radius<50.1')
run('wait','--fn',"document.querySelector('#social').style.opacity>.9")
style=[]
for theme in ['day','night']:
 js("document.documentElement.dataset.theme="+json.dumps(theme))
 point=js("(()=>{const r=document.querySelector('#social').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()")
 run('mouse','move',str(round(point['x'])),str(round(point['y'])));run('mouse','down')
 pressed=js("(()=>{const s=getComputedStyle(document.querySelector('#social'));return {scale:s.scale,background:s.backgroundColor,shadow:s.boxShadow,active:document.querySelector('#social').matches(':active')}})()")
 assert pressed['active'] and pressed['scale']=='1' and pressed['background']=='rgba(0, 0, 0, 0)' and pressed['shadow']=='none',pressed
 run('mouse','move','10','10');run('mouse','up');style.append(pressed)
 print('PASS link feedback',theme,flush=True)
(root/'artifacts/cover-interaction-checks.json').write_text(json.dumps({'covers':result,'dragShift':shift,'link':style},indent=2),encoding='utf-8')
print('PASS moving cover source',shift,flush=True)
