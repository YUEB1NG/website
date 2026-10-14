import './style.css';
import { Scene } from './scene';
import { Blueprint } from './blueprint';

const $=<T extends HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const app=$('#wabi'),start=$<HTMLButtonElement>('#start'),orb=$<HTMLButtonElement>('#orb'),greeting=$('#greeting'),swipe=$('#swipe'),social=$<HTMLAnchorElement>('#social'),status=$('#status');
const media=matchMedia('(prefers-reduced-motion: reduce)');
const scene=new Scene($<HTMLCanvasElement>('#scene'));
let width=innerWidth,height=innerHeight,x=width/2,y=height,targetX=x,targetY=y,vx=0,vy=0,textY=height,textV=0,active=false,dragging=false,reduced=media.matches;
let last=performance.now(),elapsed=0,revealClock=0,secondary=0,downX=0,downY=0,fromY=0,moved=false,tiltX=0,tiltY=0,smoothTiltX=0,smoothTiltY=0,pointer:number|null=null;
let flipIndex=0,flipping=false,lastFlip=0,flipStart=0,pressedOrb=false;
const words=['Learn','Build','Share'];
const flipWord=$('#flip-word');
const blueprint=new Blueprint(()=>{app.dataset.state=active?'revealed':'rest';app.inert=false;status.textContent='Swipe up or press Enter to start.';});
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

function setWord(word:string){
  flipWord.replaceChildren();flipWord.setAttribute('aria-label',word);
  for(const char of word){const span=document.createElement('span');span.className='flip-char';span.setAttribute('aria-hidden','true');const i=document.createElement('i');i.className='outgoing';i.textContent=char;span.append(i);flipWord.append(span);}
}
function beginFlip(now:number){
  flipping=true;flipStart=now;const next=words[(flipIndex+1)%words.length];
  [...flipWord.children].forEach((el,index)=>{const incoming=document.createElement('i');incoming.className='incoming';incoming.textContent=next[index]??' ';el.append(incoming);(el as HTMLElement).style.setProperty('--delay',`${index*.035}s`);el.classList.add('turn');});
}
setWord(words[0]);

function resetReveals(){document.querySelectorAll<HTMLButtonElement>('[data-reveal]').forEach(button=>{button.setAttribute('aria-expanded','false');button.querySelector<HTMLElement>('.reveal-content')!.dataset.state='closed';});}
function setActive(next:boolean){
  const changed=active!==next;active=next;targetY=next?height*.4:height;targetX=width/2;
  app.dataset.state=next?'revealed':'rest';orb.setAttribute('aria-label',next?'Rotating night Earth. Drag down to return':'Drag the prism up to enter');
  $('#back').setAttribute('aria-label',next?'Back to start':'Replay opening animation');
  $('#back').setAttribute('title',next?'Back to start':'Replay opening animation');
  if(changed){revealClock=0;lastFlip=0;flipIndex=0;flipping=false;setWord(words[0]);$('.name-line').classList.remove('profile');$('.english-name').inert=false;$('.profile-name').setAttribute('aria-hidden','true');resetReveals();}
  greeting.inert=!next;social.inert=!next;start.inert=next;
  greeting.style.pointerEvents=next?'auto':'none';social.style.pointerEvents=next?'auto':'none';
  if(!next&&greeting.contains(document.activeElement))start.focus({preventScroll:true});
  status.textContent=next?'Hi There. Click the blurred words to reveal them. Swipe down or press Escape to return.':'Swipe up or press Enter to start.';
  if(reduced){x=targetX;y=targetY;vx=vy=0;textY=next?height*.55:height;textV=0;secondary=next?1:0;}
}
function replay(){
  if(blueprint.active)return;
  setActive(false);x=targetX=width/2;y=targetY=height;vx=vy=textV=0;textY=height;secondary=0;
  updateDOM();
  if(reduced)return;
  app.dataset.state='intro';app.inert=true;blueprint.start();
}

function resize(){
  const oldHeight=height,oldWidth=width;width=app.clientWidth;height=app.clientHeight;
  y=y/oldHeight*height;x=x/oldWidth*width;textY=textY/oldHeight*height;
  targetY=active?height*.4:height;targetX=width/2;
  scene.resize(width,height);updateDOM();if(blueprint.active)blueprint.measure();
}
function updateDOM(){
  const progress=clamp((height-y)/(height*.6),0,1),radius=200-150*progress,opacity=clamp(progress/.3,0,1);
  start.style.opacity=String(1-opacity);start.style.filter=`blur(${opacity*10}px)`;start.style.pointerEvents=opacity>.5?'none':'auto';
  Object.assign(orb.style,{left:`${x}px`,top:`${y}px`,width:`${radius*2}px`,height:`${radius*2}px`});
  greeting.style.top=`${textY}px`;greeting.style.opacity=String(opacity);$('.name-line').style.opacity=String(secondary);$('.likes').style.opacity=String(secondary);
  social.style.opacity=String(secondary*clamp((height*.9-y)/(height*.15),0,1));
  swipe.style.opacity=String(clamp((y+radius-(height-200/2.75-30))/30,0,1)*.8);
  return radius;
}
start.addEventListener('click',()=>{if(!blueprint.active)setActive(true);});
// Pointer taps are handled at release because pointer capture retargets click.
orb.addEventListener('click',e=>{if(e.detail===0&&!blueprint.active)setActive(!active);});
$('#back').addEventListener('click',()=>active?setActive(false):replay());
document.querySelectorAll<HTMLButtonElement>('[data-reveal]').forEach(button=>button.addEventListener('click',()=>{
  const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));button.querySelector<HTMLElement>('.reveal-content')!.dataset.state=open?'open':'closed';
  if(button.dataset.reveal==='name')revealClock=0;
}));
app.addEventListener('pointerdown',e=>{
  if(blueprint.active||e.button!==0||pointer!==null)return;
  const el=e.target as HTMLElement;if(el.closest('a,button')&&el!==orb)return;
  pressedOrb=el===orb;pointer=e.pointerId;dragging=true;moved=false;downX=e.clientX;downY=e.clientY;fromY=y;app.setPointerCapture(pointer);
});
app.addEventListener('pointermove',e=>{
  tiltX=clamp((e.clientX-width/2)/(width/2),-1,1)*.3;tiltY=clamp((e.clientY-height/2)/(height/2),-1,1)*.2;
  if(!dragging||pointer!==e.pointerId)return;
  const dx=e.clientX-downX,dy=e.clientY-downY;if(Math.hypot(dx,dy)>6)moved=true;
  targetY=clamp(fromY+dy,0,height);targetX=clamp(width/2+dx,0,width);
  if(reduced){x=targetX;y=targetY;}
});
function endDrag(e:PointerEvent){
  if(pointer!==e.pointerId)return;
  dragging=false;pointer=null;if(app.hasPointerCapture(e.pointerId))app.releasePointerCapture(e.pointerId);
  if(e.type==='pointercancel'){setActive(active);return;}
  if(moved)setActive(targetY<(height*.4+height)/2);else if(pressedOrb)setActive(!active);else{targetY=active?height*.4:height;targetX=width/2;}
}
app.addEventListener('pointerup',endDrag);app.addEventListener('pointercancel',endDrag);
app.addEventListener('lostpointercapture',()=>{if(dragging){dragging=false;pointer=null;setActive(active);}});
app.addEventListener('wheel',e=>{if(blueprint.active)return;e.preventDefault();if(Math.abs(e.deltaY)>12)setActive(e.deltaY>0);},{passive:false});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(blueprint.active)blueprint.finish();else setActive(false);return;}
  if(blueprint.active||document.activeElement?.matches('button,a'))return;
  if(['ArrowUp','Enter',' '].includes(e.key)){e.preventDefault();setActive(true);}
  if(e.key==='ArrowDown'){e.preventDefault();setActive(false);}
});
window.addEventListener('deviceorientation',e=>{if(e.gamma!==null)tiltX=clamp(e.gamma/35,-1,1);if(e.beta!==null)tiltY=clamp((e.beta-45)/45,-1,1);});
window.addEventListener('resize',resize);
media.addEventListener('change',()=>{reduced=media.matches;if(reduced){blueprint.finish();setActive(active);}});

function tick(now:number){
  const dt=Math.min((now-last)/1000,.032);last=now;elapsed+=dt;
  blueprint.tick(now);
  if(!reduced){
    // Substeps keep the original stiff spring stable across refresh rates.
    const steps=Math.max(1,Math.ceil(dt/.008)),step=dt/steps;
    for(let i=0;i<steps;i++){
      const stiffness=dragging?300:550,damping=dragging?30:140,mass=dragging?3:9;
      vx+=((targetX-x)*stiffness-vx*damping)/mass*step;vy+=((targetY-y)*stiffness-vy*damping)/mass*step;x+=vx*step;y+=vy*step;
      const ty=dragging?clamp(targetY,height*.55,height):active?height*.55:height;
      textV+=((ty-textY)*900-textV*120)/4*step;textY+=textV*step;
    }
    secondary=clamp(secondary+(active?1:-1)*dt/.7,0,1);
  }
  smoothTiltX+=(tiltX-smoothTiltX)*.08;smoothTiltY+=(tiltY-smoothTiltY)*.08;
  if(active&&!blueprint.active){
    revealClock+=dt*1000;lastFlip+=dt*1000;
    const interacting=$('.english-name').matches(':hover,:focus-within');
    if(!reduced&&!interacting){const profile=revealClock%8800>=3700&&revealClock%8800<8100;$('.name-line').classList.toggle('profile',profile);$('.english-name').inert=profile;$('.profile-name').setAttribute('aria-hidden',String(!profile));}
    else{$('.name-line').classList.remove('profile');$('.english-name').inert=false;$('.profile-name').setAttribute('aria-hidden','true');}
    if(!reduced&&lastFlip>=2200&&!flipping)beginFlip(now);
    if(flipping&&now-flipStart>=950){flipIndex=(flipIndex+1)%words.length;setWord(words[flipIndex]);flipping=false;lastFlip=0;}
  }
  const radius=updateDOM();scene.render({x,y,radius,active:active&&!blueprint.active,time:elapsed,dt,reduced,tiltX:smoothTiltX,tiltY:smoothTiltY});
  requestAnimationFrame(tick);
}
// rAF is suspended by the browser in background tabs; reset timestamps on return.
document.addEventListener('visibilitychange',()=>{last=performance.now();});
resize();
await Promise.all([document.fonts.ready,scene.ready]);
resize();
if(!reduced){app.inert=true;blueprint.start();}else{app.dataset.state='rest';$('#blueprint').hidden=true;}
last=performance.now();requestAnimationFrame(tick);
// Read-only diagnostics used by the browser smoke check.
Object.defineProperty(window,'wabi',{value:{get state(){return app.dataset.state},get renderer(){return scene.renderer},get earth(){return scene.earth},get position(){return {x,y,radius:200-150*clamp((height-y)/(height*.6),0,1)}}},writable:false});
