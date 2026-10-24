import base64,json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1];cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=35);assert r.returncode==0,r.stdout+r.stderr;return r.stdout

def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
run('set','media','light');run('open','http://127.0.0.1:5173/');run('wait','--fn',"wabi.state==='rest'");run('click','#start');run('wait','--fn','wabi.position.radius<50.1')
js("""(()=>{let last=[...wabi.planet.covers.coverKeys],recent=[...wabi.planet.covers.recent],duplicates=0,repeats=0,changes=0,maxCache=0;const seen=new Set(last),start=performance.now();window.randomCoverCheck=null;function sample(){const c=wabi.planet.covers;if(new Set(c.coverKeys).size!==c.visibleSlots)duplicates++;c.coverKeys.forEach((key,i)=>{if(key!==last[i]){if(recent.includes(key))repeats++;recent=[...recent.filter(k=>k!==key),key].slice(-55);changes++;seen.add(key);}});last=[...c.coverKeys];maxCache=Math.max(maxCache,c.cachedImages);if(performance.now()-start<20000)requestAnimationFrame(sample);else window.randomCoverCheck={duplicates,repeats,changes,unique:seen.size,maxCache,slots:c.visibleSlots,pool:c.poolCount,artworks:c.uniqueCovers}}sample();return true})()""")
run('wait','12000');run('wait','10000');result=js('window.randomCoverCheck')
assert result['duplicates']==0 and result['repeats']==0 and result['unique']>=55 and 20<=result['slots']<=25 and result['maxCache']<=160,result
run('press','Escape')
history=js("JSON.parse(localStorage.getItem('yueb1ng-cover-history'))")
run('reload');run('wait','--fn',"wabi.state==='rest'");keys=js('wabi.planet.covers.coverKeys');assert not set(history)&set(keys),(history,keys)
run('click','#start');run('wait','--fn','wabi.position.radius<50.1');run('press','o');run('wait','2500');orbit_count=js('wabi.planet.orbitCount');assert 20<=orbit_count<=25
run('screenshot',str(root/'artifacts/random-covers-mobile.png'));errors=run('errors');assert not errors.strip(),errors
(root/'artifacts/random-covers-checks.json').write_text(json.dumps({'sampling':result,'reloadAvoidedRecent':True,'orbitCount':orbit_count},indent=2),encoding='utf-8');print('PASS',result,flush=True)
