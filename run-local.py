"""Start/stop this standalone Windows preview, without a desktop-app process."""
import argparse,ctypes,json,pathlib,shutil,socket,subprocess,time,urllib.request
from ctypes import wintypes
ROOT=pathlib.Path(__file__).resolve().parent
STATE=ROOT/'artifacts'/'local-server.json'
parser=argparse.ArgumentParser()
parser.add_argument('--stop',action='store_true')
parser.add_argument('--dev',action='store_true')
args=parser.parse_args()

def process_birth(pid):
    kernel=ctypes.WinDLL('kernel32',use_last_error=True)
    kernel.OpenProcess.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.DWORD]
    kernel.OpenProcess.restype=wintypes.HANDLE
    kernel.GetProcessTimes.argtypes=[wintypes.HANDLE,*([ctypes.POINTER(wintypes.FILETIME)]*4)]
    kernel.CloseHandle.argtypes=[wintypes.HANDLE]
    handle=kernel.OpenProcess(0x1000,False,pid)
    if not handle:return None
    values=[wintypes.FILETIME() for _ in range(4)]
    try:
        if not kernel.GetProcessTimes(handle,*[ctypes.byref(v) for v in values]):return None
        return (values[0].dwHighDateTime<<32)|values[0].dwLowDateTime
    finally:kernel.CloseHandle(handle)

if args.stop:
    if not STATE.exists():raise SystemExit('No managed preview is recorded')
    record=json.loads(STATE.read_text(encoding='utf-8'))
    if record.get('root')!=str(ROOT):raise SystemExit('Project ownership mismatch')
    if process_birth(record['pid'])!=record['birth']:raise SystemExit('Recorded process has exited; no other process was touched')
    subprocess.run(['taskkill','/PID',str(record['pid']),'/T','/F'],check=True,creationflags=subprocess.CREATE_NO_WINDOW)
    print('Stopped this project preview')
    raise SystemExit(0)

with socket.socket() as probe:
    if probe.connect_ex(('127.0.0.1',5173))==0:
        raise SystemExit('Port 5173 is already in use; existing processes were left running')
node=pathlib.Path('D:/nodejs/node.exe')
if not node.exists():node=pathlib.Path(shutil.which('node') or '')
if not node.is_file():raise SystemExit('Install standalone Node.js first')
if not args.dev and not (ROOT/'dist/index.html').exists():raise SystemExit('Build first: npm run build')
STATE.parent.mkdir(exist_ok=True)
command=[str(node),str(ROOT/'node_modules/vite/bin/vite.js')]
if not args.dev:command.append('preview')
command+=['--host','127.0.0.1','--port','5173','--strictPort']
flags=subprocess.DETACHED_PROCESS|subprocess.CREATE_NEW_PROCESS_GROUP|subprocess.CREATE_BREAKAWAY_FROM_JOB
with (STATE.parent/'local-server.log').open('ab') as log:
    process=subprocess.Popen(command,cwd=ROOT,stdin=subprocess.DEVNULL,stdout=log,stderr=log,creationflags=flags)
record={'pid':process.pid,'birth':process_birth(process.pid),'root':str(ROOT),'mode':'dev' if args.dev else 'preview'}
if record['birth'] is None:raise SystemExit('Server process did not start; check artifacts/local-server.log')
STATE.write_text(json.dumps(record,indent=2),encoding='utf-8')
for _ in range(50):
    try:
        with urllib.request.urlopen('http://127.0.0.1:5173/',timeout=1) as response:
            if response.status==200:
                print(f'Standalone preview http://127.0.0.1:5173/ (PID {process.pid})')
                break
    except OSError:time.sleep(.1)
else:raise SystemExit('Server did not become ready; check artifacts/local-server.log')
