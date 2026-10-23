import base64,json,pathlib,subprocess,math
root=pathlib.Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=35)
 assert r.returncode==0,r.stdout+r.stderr
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
reports=[]
for width,height,mode,theme in [(390,844,'free','light'),(390,844,'orbit','dark'),(1280,800,'orbit','light')]:
 run('set','viewport',str(width),str(height));run('set','media',theme)
 run('open','http://127.0.0.1:5173/');run('wait','--fn',"wabi.state==='rest'");run('click','#start')
 run('wait','--fn','wabi.position.radius<50.1')
 if mode=='free':run('wait','--fn','wabi.planet.coverScreen.length>=5')
 orb=js('wabi.position');x,y=round(orb['x']),round(orb['y'])
 run('mouse','move',str(x),str(y));run('mouse','down')
 if mode=='orbit':
  run('wait','--fn','wabi.orbit===true');run('wait','2500')
 before=js('({points:wabi.planet.coverScreen,orb:wabi.position,births:wabi.drift.births})')
 run('mouse','move',str(x+65),str(y+145));run('wait','1800')
 first=js('({points:wabi.planet.coverScreen,orb:wabi.position,births:wabi.drift.births})')
 run('mouse','move',str(x-65),str(y+90));run('wait','1500')
 second=js('({points:wabi.planet.coverScreen,orb:wabi.position,births:wabi.drift.births})')
 assert abs(first['orb']['y']-before['orb']['y'])>100
 shifts=[]
 for state in [first,second]:
  assert len(state['points'])==len(before['points']),(mode,len(state['points']),len(before['points']))
  for a,b in zip(before['points'],state['points']):
   assert a['index']==b['index'];delta=math.hypot(b['x']-a['x'],b['y']-a['y']);shifts.append(delta)
   assert delta<5,(mode,a,b,delta)
   assert abs(a['size']-b['size'])<.5,(a,b)
  assert state['births']==before['births']
 run('screenshot',str(root/f'artifacts/pinned-{width}-{mode}.png'))
 run('mouse','up');run('wait','4500');run('wait','--fn','wabi.position.radius<50.1')
 report={'width':width,'mode':mode,'covers':len(before['points']),'orbTravel':first['orb']['y']-before['orb']['y'],'maxCoverTravel':max(shifts)}
 print('PASS',json.dumps(report),flush=True);reports.append(report)
(root/'artifacts/cover-drag-checks.json').write_text(json.dumps(reports,indent=2),encoding='utf-8')
