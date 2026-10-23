import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1];cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=35);assert r.returncode==0,r.stdout+r.stderr;return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
run('set','media','light');run('open','http://127.0.0.1:5173/');run('wait','--fn',"wabi.state==='rest'");run('snapshot');run('click','#start');run('wait','--fn','wabi.position.radius<50.1')
result=js("""new Promise(resolve=>{const seen=new Set(),start=performance.now();let duplicates=0,maxVisible=0,maxSize=0,minSpeed=99,maxSpeed=0;const sizes=new Set(),targets=new Set();function sample(){const c=wabi.planet.covers;c.ids.forEach(id=>seen.add(id));if(new Set(c.visibleCoverKeys).size!==c.visibleCoverKeys.length)duplicates++;const particles=wabi.drift.particles;maxVisible=Math.max(maxVisible,particles.length);targets.add(wabi.drift.targetDensity);for(const p of particles){maxSize=Math.max(maxSize,p.size);minSpeed=Math.min(minSpeed,p.speed);maxSpeed=Math.max(maxSpeed,p.speed);sizes.add(Math.round(p.size));}if(performance.now()-start<30000)requestAnimationFrame(sample);else resolve({seen:seen.size,duplicates,maxVisible,maxSize,minSpeed,maxSpeed,sizes:sizes.size,targets:[...targets],cache:c.cachedImages,tracks:c.poolCount,unique:c.uniqueCovers})}sample()})""")
assert result['duplicates']==0 and result['seen']>20 and result['cache']<=48 and result['maxVisible']<=10 and result['maxSize']<=38 and result['minSpeed']>=14.99 and result['maxSpeed']<=23.01 and result['sizes']>=3 and len(result['targets'])>=2,result
print('PASS restrained cover drift',result,flush=True)
run('screenshot',str(root/'artifacts/calm-mobile-day.png'))
run('mouse','move','195','337');run('mouse','down');run('mouse','move','195','410')
run('wait','--fn','wabi.position.y>370')
before=js('({orb:wabi.position,points:wabi.drift.particles,births:wabi.drift.births})')
run('mouse','move','195','530');run('wait','--fn','wabi.position.y>490')
after=js('({orb:wabi.position,points:wabi.drift.particles,births:wabi.drift.births})')
assert before['points'] and after['points']
common=[(a,b) for a in before['points'] for b in after['points'] if a['index']==b['index']]
assert common
shifts=[b['y']-a['y'] for a,b in common]
assert all(-35<delta<=0 for delta in shifts),shifts
assert before['births']==after['births'],(before['births'],after['births'])
shift=sum(shifts)/len(shifts)
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
print('PASS independent flights while orb is dragged',shift,flush=True)
