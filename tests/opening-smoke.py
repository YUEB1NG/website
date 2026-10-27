"""Opening continuity and footer lifecycle against a production-shaped server."""
import base64,json,os,subprocess,sys,threading,time,urllib.request
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
root=Path(__file__).resolve().parents[1]
cli=str(root/'.tools/node_modules/agent-browser/bin/agent-browser-win32-x64.exe')
target=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:49382').rstrip('/')
checks=[]
def run(*args):
 r=subprocess.run([cli,*args],capture_output=True,text=True,encoding='utf-8',timeout=40)
 assert r.returncode==0,r.stderr or r.stdout
 return r.stdout.strip()
def js(code):return json.loads(run('eval','--json','-b',base64.b64encode(code.encode()).decode()))['data']['result']
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS',name,flush=True)
class Slow(BaseHTTPRequestHandler):
 def do_GET(self):
  if self.path.startswith('/assets/main-'):time.sleep(2)
  if self.path.startswith('/music-covers/') or 'sticker' in self.path:time.sleep(10)
  try:
   r=urllib.request.urlopen(target+self.path,timeout=20);data=r.read()
   self.send_response(r.status)
   self.send_header('Content-Type',r.headers.get('Content-Type','application/octet-stream'))
   self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
  except (BrokenPipeError,ConnectionResetError,ConnectionAbortedError):pass
 def log_message(self,*args):pass
proxy=ThreadingHTTPServer(('127.0.0.1',0),Slow)
threading.Thread(target=proxy.serve_forever,daemon=True).start()
try:
 run('set','media','light');run('set','viewport','390','844');run('errors','--clear')
 run('open','http://127.0.0.1:'+str(proxy.server_port)+'/', '--wait-until','domcontentloaded')
 run('wait','--fn',"document.querySelector('#drawing')?.childElementCount>0")
 check('blueprint starts before the delayed 3D module',js("document.querySelector('#drawing').childElementCount>0&&!window.wabi?.planet"))
 js("window.__openingSheet=document.querySelector('.blue-sheet')")
 check('first sheet is the final blueprint blue',js("getComputedStyle(__openingSheet).backgroundColor==='rgb(46, 111, 255)'"))
 run('wait','--fn',"window.wabi?.state==='rest'")
 check('sheet identity stays continuous through loading and wipe',js("__openingSheet===document.querySelector('.blue-sheet')"))
 check('slow music covers do not block entry',js("!wabi.planet.covers"))
 check('registration hidden before entering',js("getComputedStyle(document.querySelector('#registration')).opacity==='0'&&document.querySelector('#registration').inert"))
 frames=js("""new Promise(resolve=>{const start=performance.now(),frames=[];document.querySelector('#start').click();function frame(now){const s=document.querySelector('#social'),r=document.querySelector('#registration');frames.push({t:now-start,s:+s.style.opacity,r:+r.style.opacity});if(now-start<3500)requestAnimationFrame(frame);else resolve(frames)}requestAnimationFrame(frame)})""")
 first=lambda key:next(f['t'] for f in frames if f[key]>.01)
 stagger=first('r')-first('s')
 check('registration follows social by 0.45 seconds',350<stagger<600)
 check('both lines finish visible',frames[-1]['s']>.9 and frames[-1]['r']>.9)
 run('press','Escape');run('wait','--fn',"wabi.position.radius>199.9")
 check('return to ring hides and disables registration',js("document.querySelector('#registration').inert&&document.querySelector('#registration').style.opacity==='0'"))
 run('open',target);run('wait','--fn',"window.wabi?.state==='rest'")
 for width,height,theme in [(390,620,'light'),(390,844,'dark'),(1440,900,'light')]:
  run('set','viewport',str(width),str(height));run('set','media',theme)
  run('wait','--fn',"wabi.position.radius>199.9");run('snapshot','-i');run('click','#start');run('wait','2200')
  bounds=js("(()=>{const r=document.querySelector('#registration'),s=document.querySelector('#social'),a=r.getBoundingClientRect(),b=s.getBoundingClientRect();return {gap:a.top-b.bottom,bottom:a.bottom,height:innerHeight,color:getComputedStyle(r).color,socialColor:getComputedStyle(s).color,overflow:document.documentElement.scrollWidth>innerWidth}})()")
  check(str(width)+'x'+str(height)+' '+theme+' footer fits and shares theme',bounds['gap']>=7 and bounds['bottom']<=bounds['height']-4 and bounds['color']==bounds['socialColor'] and not bounds['overflow'])
  run('press','Escape')
 run('wait','--fn',"wabi.position.radius>199.9");run('click','#back')
 check('replay keeps registration hidden',js("wabi.state==='intro'&&document.querySelector('#registration').inert"))
 run('wait','--fn',"wabi.state==='rest'")
 run('set','media','light','reduced-motion');run('click','#start');run('wait','1500')
 check('reduced motion preserves final registration',js("+document.querySelector('#registration').style.opacity>.99"))
 check('no runtime errors',not run('errors'))
 (root/'artifacts/opening-check.json').write_text(json.dumps({'checks':checks,'staggerMs':stagger},indent=2))
 print(str(len(checks))+' opening checks passed.')
finally:proxy.shutdown()
