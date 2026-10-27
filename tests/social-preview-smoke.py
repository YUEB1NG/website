"""Fetch share metadata as crawlers do: no browser and no JavaScript."""
import hashlib,json,struct,sys,urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
class Head(HTMLParser):
 def __init__(self):
  super().__init__();self.meta={};self.links={};self.in_head=False;self.title=False;self.title_text=''
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='head':self.in_head=True
  if self.in_head and tag=='title':self.title=True
  if self.in_head and tag=='meta':
   key=a.get('property',a.get('name',''));self.meta.setdefault(key,[]).append(a.get('content',''))
  if self.in_head and tag=='link':self.links[a.get('rel')]=a.get('href')
 def handle_endtag(self,tag):
  if tag=='head':self.in_head=False
  if tag=='title':self.title=False
 def handle_data(self,data):
  if self.title:self.title_text+=data
base=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:49384').rstrip('/')
agents={
 'X':'Twitterbot/1.0',
 'WeChat':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 MicroMessenger/8.0.60',
 'OpenGraph':'facebookexternalhit/1.1',
 'Telegram':'TelegramBot (like TwitterBot)',
}
results=[]
for label,agent in agents.items():
 def get(path,method='GET'):
  req=urllib.request.Request(base+path,headers={'User-Agent':agent},method=method)
  return urllib.request.urlopen(req,timeout=25)
 with get('/') as response:
  assert response.status==200
  assert response.headers.get_content_type()=='text/html'
  html=response.read().decode('utf-8')
 h=Head();h.feed(html)
 assert h.title_text=='YUEB1NG'
 assert h.links['canonical']=='https://yueb1ng.com/'
 for key in ['description','og:title','og:description','og:type','og:url','og:site_name','twitter:card','twitter:title','twitter:description','twitter:image','twitter:image:alt']:
  assert len(h.meta.get(key,[]))==1 and h.meta[key][0],key
 assert h.meta['twitter:card']==['summary_large_image']
 assert h.meta['twitter:site']==['@YUEB1NG']
 assert h.meta['og:image:width']==['1200','480']
 assert h.meta['og:image:height']==['630','480']
 assert h.meta['og:description']==h.meta['description']==h.meta['twitter:description']
 assert len(h.meta['og:image'])==2
 assert h.links['image_src']==h.meta['og:image'][1]
 assert h.meta['twitter:image']==h.meta['og:image'][:1]
 images=[]
 for url,size in zip(h.meta['og:image'],[(1200,630),(480,480)]):
  assert url.startswith('https://yueb1ng.com/social/')
  with get(urlsplit(url).path) as r:
   assert r.status==200 and r.headers.get_content_type()=='image/png'
   data=r.read()
  assert data[:8]==b'\x89PNG\r\n\x1a\n'
  assert struct.unpack('>II',data[16:24])==size
  assert 1000<len(data)<5*1024*1024
  with get(urlsplit(url).path,'HEAD') as r:
   assert r.status==200 and r.headers.get_content_type()=='image/png'
  images.append({'url':url,'width':size[0],'height':size[1],'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 with get('/robots.txt') as r:
  assert r.headers.get_content_type()=='text/plain'
  robots=r.read().decode()
  assert 'Allow: /' in robots and 'Disallow: /' not in robots
 results.append({'crawler':label,'rawHtml':True,'images':images})
 print('PASS',label,'raw metadata, GET/HEAD images, PNG dimensions, robots')
root=Path(__file__).resolve().parents[1]
(root/'artifacts').mkdir(exist_ok=True)
out=root/'artifacts'/('social-preview-'+urlsplit(base).netloc.replace(':','-')+'.json')
out.write_text(json.dumps({'target':base,'checks':results,'platformShareActuallySent':False},indent=2),encoding='utf-8')
print('Evidence',out)
