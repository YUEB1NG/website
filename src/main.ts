import { startCoverUpdates, setCoverOrbitMode, loadFloatingCovers } from './assets';
import { entranceState } from './entrance';
import { Scene } from './scene';
import { opening as blueprint } from './blueprint';
import { Planets, planetNames } from './planets';
import { syncTheme, toggleTheme } from './theme';
import { revealCycle, RandomNameCycle } from './reveal-cycle';
import { initRegionalSocial } from './regional-social';

const $=<T extends HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const app=$('#wabi'),start=$<HTMLButtonElement>('#start'),orb=$<HTMLButtonElement>('#orb'),greeting=$('#greeting'),swipe=$('#swipe'),social=$<HTMLAnchorElement>('#social'),status=$('#status');
initRegionalSocial(social);
const media=matchMedia('(prefers-reduced-motion: reduce)');
const scene=new Scene($<HTMLCanvasElement>('#scene'));
const planets=new Planets();
const registration=document.querySelector<HTMLAnchorElement>('#registration');
let entryAge=0,socialAlpha=0,registrationAlpha=0,socialAge=0,pressedParticle:number|null=null,lastObjectName='';
const caption=$('#object-caption');
let planetIndex=2,hasEntered=false,queuedEntry=false,nameUnlocked=false,wordUnlocked=false;
let orbit=false,holdTimer:ReturnType<typeof setTimeout>|undefined,held=false;
function clearHold(){if(holdTimer!==undefined)clearTimeout(holdTimer);holdTimer=undefined;}
function toggleOrbit(){orbit=!orbit;setCoverOrbitMode(orbit);orb.setAttribute('aria-pressed',String(orbit));status.textContent=orbit?'Song covers gathered into an orbit. Long press again to release.':'Song covers released.';}
let textOffset=67.2;
const textTarget=()=>Math.min(height*.55+textOffset,height-180);
const nameCycle=new RandomNameCycle();
function resetName(){nameUnlocked=false;$('.english-name').style.opacity='1';$('.profile-name').style.opacity='0';$('.name-line').classList.remove('profile');$('.english-name').inert=false;$('.profile-name').setAttribute('aria-hidden','true');$('.profile-name').inert=true;const b=$('[data-reveal=name]');b.setAttribute('aria-expanded','false');$('#name-content').dataset.state='closed';}
let width=innerWidth,height=innerHeight,x=width/2,y=height,targetX=x,targetY=y,vx=0,vy=0,textY=height,textV=0,active=false,dragging=false,reduced=media.matches;
let last=performance.now(),elapsed=0,wordStarted=0,downX=0,downY=0,fromY=0,moved=false,tiltX=0,tiltY=0,smoothTiltX=0,smoothTiltY=0,pointer:number|null=null;
let flipIndex=0,pressedOrb=false;
const words=['Learn','Build','Share'];
const flipWord=$('#flip-word');
window.addEventListener('wabi:opening-finished',()=>{app.dataset.state=active?'revealed':'rest';app.inert=false;syncTheme();status.textContent='Swipe up or press Enter to start.';});
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));

function setWord(word:string){
  flipWord.textContent=word;flipWord.setAttribute('aria-label',word);flipWord.style.opacity='1';
}
setWord(words[0]);

function resetReveals(){document.querySelectorAll<HTMLButtonElement>('[data-reveal]').forEach(button=>{button.setAttribute('aria-expanded','false');button.querySelector<HTMLElement>('.reveal-content')!.dataset.state='closed';});}
function setActive(next:boolean){
  const changed=active!==next;
  const incoming=hasEntered?(planetIndex+1)%planetNames.length:2;
  // A fast second tap must not replace a still-visible outgoing surface.
  // Finish closing to the ring, stage the next body, then honor that tap.
  if(changed&&next&&planets.diagnostics.index!==incoming&&planets.diagnostics.surfaceMix>.0001&&!reduced){queuedEntry=true;targetY=height;targetX=width/2;return;}
  queuedEntry=false;
  if(changed&&next){planetIndex=incoming;hasEntered=true;planets.select(planetIndex);syncObject();}
  active=next;targetY=next?height*.4:height;targetX=width/2;
  app.dataset.state=next?'revealed':'rest';orb.setAttribute('aria-label',next?`${planetNames[planetIndex]}. Click to return to the transparent ring`:`Transparent ring. Click to discover ${planetNames[hasEntered?(planetIndex+1)%planetNames.length:2]}`);
  orb.title=next?'Click: transparent ring · Long press or O: gather into orbit':'Click to discover the next planet';
  if(!next){orbit=false;setCoverOrbitMode(false);orb.setAttribute('aria-pressed','false');clearHold();planets.cancelFootball();}
  $('#back').setAttribute('aria-label',next?'Back to start':'Replay opening animation');
  $('#back').setAttribute('title',next?'Back to start':'Replay opening animation');
  if(changed){entryAge=0;socialAlpha=0;registrationAlpha=0;socialAge=0;wordStarted=0;flipIndex=0;setWord(words[0]);resetName();wordUnlocked=false;resetReveals();}
  greeting.inert=!next;social.inert=!next;start.inert=next;
  $('#celebrate').inert=!next;
  greeting.style.pointerEvents=next?'auto':'none';social.style.pointerEvents=next?'auto':'none';
  if(!next&&greeting.contains(document.activeElement))start.focus({preventScroll:true});
  status.textContent=next?'Hi There. Click the blurred words to reveal them. Swipe down or press Escape to return.':'Swipe up or press Enter to start.';
  if(reduced){x=targetX;y=targetY;vx=vy=0;textY=next?textTarget():height;textV=0;}
}
function replay(){
  if(blueprint.active)return;
  setActive(false);x=targetX=width/2;y=targetY=height;vx=vy=textV=0;textY=height;
  updateDOM();
  if(reduced)return;
  app.dataset.state='intro';app.inert=true;blueprint.start();
}

function resize(){
  textOffset=parseFloat(getComputedStyle(greeting).fontSize)*2.4;
  const oldHeight=height,oldWidth=width;width=app.clientWidth;height=app.clientHeight;
  y=y/oldHeight*height;x=x/oldWidth*width;textY=textY/oldHeight*height;
  targetY=active?height*.4:height;targetX=width/2;
  if(reduced){x=targetX;y=targetY;textY=active?textTarget():height;vx=vy=textV=0;}
  scene.resize(width,height);updateDOM();if(blueprint.active)blueprint.measure();
}
function updateDOM(){
  const progress=clamp((height-y)/(height*.6),0,1),radius=200-150*progress,opacity=clamp(progress/.3,0,1);
  const entrance=entranceState(active,entryAge,progress,reduced);
  start.style.opacity=String(entrance.prompt);start.style.visibility=entrance.prompt<=.001?'hidden':'visible';start.style.filter=`blur(${(1-entrance.prompt)*3}px)`;start.style.translate=`0 ${-(1-entrance.prompt)*5}px`;start.style.pointerEvents=active||entrance.prompt<.8?'none':'auto';
  Object.assign(orb.style,{left:`${x}px`,top:`${y}px`,width:`${radius*2}px`,height:`${radius*2}px`});
  greeting.style.top=`${textY}px`;greeting.style.opacity=String(opacity);
  const lines=[greeting.querySelector<HTMLElement>('h1')!,$('.name-line'),$('.likes')];
  lines.forEach((line,i)=>{line.style.opacity=String(entrance.rows[i]);line.style.translate=`0 ${(1-entrance.rows[i])*7}px`;});
  const pull=clamp((Math.max(y,dragging?targetY:y)-height*.4)/(height*.18),0,1);
  const clearance=clamp((social.getBoundingClientRect().top-greeting.getBoundingClientRect().bottom-12)/28,0,1);
  const socialOpacity=socialAlpha*(1-pull)*clearance;
  social.style.opacity=String(socialOpacity);social.inert=!active||socialOpacity<.05;social.style.pointerEvents=active&&socialOpacity>.2?'auto':'none';
  if(registration){
    const a=registrationAlpha*(1-pull)*clearance;
    registration.style.opacity=String(a);registration.inert=!active||a<.05;
    registration.style.pointerEvents=active&&a>.2?'auto':'none';
    registration.style.top=String(social.offsetTop+social.offsetHeight+8)+'px';
  }
  caption.style.left=`${x}px`;caption.style.top=`${y+radius+21}px`;caption.style.opacity=String(active?opacity*(1-pull):0);
  swipe.style.opacity=String(clamp((y+radius-(height-200/2.75-30))/30,0,1)*.8);
  return radius;
}
start.addEventListener('click',()=>{if(!blueprint.active)setActive(true);});
// Pointer taps are handled at release because pointer capture retargets click.
orb.addEventListener('click',e=>{if(e.detail===0&&!blueprint.active)setActive(!active);});
$('#back').addEventListener('click',()=>active?setActive(false):replay());
document.querySelectorAll<HTMLButtonElement>('[data-reveal]').forEach(button=>button.addEventListener('click',()=>{
  const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));button.querySelector<HTMLElement>('.reveal-content')!.dataset.state=open?'open':'closed';
  if(button.dataset.reveal==='name'){nameUnlocked=open;if(open)nameCycle.reset(performance.now());if(!open)resetName();}
  if(button.dataset.reveal==='word'){wordUnlocked=open;wordStarted=performance.now();flipIndex=0;setWord(words[0]);}
}));
$('#theme-toggle').addEventListener('click',()=>{toggleTheme();});
function syncObject(){const p=planets.diagnostics;lastObjectName=p.name;if(active)orb.setAttribute('aria-label',`${p.name}. Click to return to the transparent ring`);caption.textContent=p.mode==='football'?p.name:'';status.textContent=p.name;}
$('#football-toggle').addEventListener('click',()=>{planets.nextFootball(reduced);syncObject();});
$('#celebrate').addEventListener('click',()=>planets.celebrate(0,reduced));
for(const event of ['contextmenu','selectstart','dragstart','copy'])document.addEventListener(event,e=>e.preventDefault());
app.addEventListener('pointerdown',e=>{
  if(blueprint.active||e.button!==0||pointer!==null)return;
  const el=e.target as HTMLElement;if(el.closest('a,button')&&el!==orb)return;
  pressedParticle=active?planets.hitParticle(e.clientX,e.clientY):null;
  pressedOrb=el===orb&&pressedParticle===null;held=false;pointer=e.pointerId;dragging=true;moved=false;downX=e.clientX;downY=e.clientY;fromY=y;app.setPointerCapture(pointer);
  if(pressedOrb&&active)holdTimer=setTimeout(()=>{if(!moved&&dragging){held=true;toggleOrbit();}},550);
});
app.addEventListener('pointermove',e=>{
  tiltX=clamp((e.clientX-width/2)/(width/2),-1,1)*.3;tiltY=clamp((e.clientY-height/2)/(height/2),-1,1)*.2;
  if(!dragging||pointer!==e.pointerId)return;
  const dx=e.clientX-downX,dy=e.clientY-downY;if(Math.hypot(dx,dy)>6){moved=true;clearHold();}
  targetY=clamp(fromY+dy,0,height);targetX=clamp(width/2+dx,0,width);
  if(reduced){x=targetX;y=targetY;}
});
function endDrag(e:PointerEvent){
  if(pointer!==e.pointerId)return;
  clearHold();
  dragging=false;pointer=null;if(app.hasPointerCapture(e.pointerId))app.releasePointerCapture(e.pointerId);
  if(e.type==='pointercancel'){setActive(active);return;}
  if(moved)setActive(targetY<(height*.4+height)/2);else if(pressedParticle!==null){planets.celebrate(pressedParticle,reduced);targetY=active?height*.4:height;targetX=width/2;}else if(pressedOrb&&!held)setActive(!active);else{targetY=active?height*.4:height;targetX=width/2;}
}
orb.addEventListener('contextmenu',e=>e.preventDefault());
app.addEventListener('pointerup',endDrag);app.addEventListener('pointercancel',endDrag);
app.addEventListener('lostpointercapture',()=>{if(dragging){dragging=false;pointer=null;setActive(active);}});
app.addEventListener('wheel',e=>{if(blueprint.active)return;e.preventDefault();if(Math.abs(e.deltaY)>12)setActive(e.deltaY>0);},{passive:false});
window.addEventListener('keydown',e=>{
  if(e.key.toLowerCase()==='o'&&active&&!blueprint.active){e.preventDefault();toggleOrbit();return;}
  if(e.key==='Escape'){if(blueprint.active)blueprint.finish();else setActive(false);return;}
  if(blueprint.active||document.activeElement?.matches('button,a'))return;
  if(['ArrowUp','Enter',' '].includes(e.key)){e.preventDefault();setActive(true);}
  if(e.key==='ArrowDown'){e.preventDefault();setActive(false);}
});
window.addEventListener('deviceorientation',e=>{if(e.gamma!==null)tiltX=clamp(e.gamma/35,-1,1);if(e.beta!==null)tiltY=clamp((e.beta-45)/45,-1,1);});
window.addEventListener('resize',resize);
// Safari's dynamic viewport may settle after the window resize event.
new ResizeObserver(()=>{if(app.clientWidth!==width||app.clientHeight!==height)resize();}).observe(app);
media.addEventListener('change',()=>{reduced=media.matches;if(reduced){blueprint.finish();setActive(active);}});

function tick(now:number){
  const dt=Math.min((now-last)/1000,.032);last=now;elapsed+=dt;
  if(active)entryAge+=dt;
  const socialTarget=active&&entryAge>1.1&&social.dataset.regionReady==='true'?1:0;
  socialAge=socialTarget?socialAge+dt:0;
  const settle=1-Math.exp(-dt*1.8);
  socialAlpha=reduced?socialTarget:socialAlpha+(socialTarget-socialAlpha)*settle;
  const registrationTarget=socialTarget&&(reduced||socialAge>.45)?1:0;
  registrationAlpha=reduced?registrationTarget:registrationAlpha+(registrationTarget-registrationAlpha)*settle;
  if(!reduced){
    // Substeps keep the original stiff spring stable across refresh rates.
    const steps=Math.max(1,Math.ceil(dt/.008)),step=dt/steps;
    for(let i=0;i<steps;i++){
      const stiffness=dragging?300:550,damping=dragging?30:140,mass=dragging?3:9;
      vx+=((targetX-x)*stiffness-vx*damping)/mass*step;vy+=((targetY-y)*stiffness-vy*damping)/mass*step;x+=vx*step;y+=vy*step;
      const ty=dragging?clamp(targetY,textTarget(),height):active?textTarget():height;
      textV+=((ty-textY)*900-textV*120)/4*step;textY+=textV*step;
    }
  }
  smoothTiltX+=(tiltX-smoothTiltX)*.08;smoothTiltY+=(tiltY-smoothTiltY)*.08;
  if(active&&!blueprint.active){
    const namePhase=nameUnlocked?nameCycle.read(now,reduced):{step:0,opacity:1},profile=nameUnlocked&&namePhase.step%2===1;
    const wasProfile=$('.name-line').classList.contains('profile');
    const transferToProfile=profile&&!wasProfile&&$('.english-name button').matches(':focus-visible');
    const transferToEnglish=!profile&&wasProfile&&$('#theme-toggle').matches(':focus-visible');
    $('.name-line').classList.toggle('profile',profile);$('.english-name').inert=profile;$('.profile-name').setAttribute('aria-hidden',String(!profile));$('.profile-name').inert=!profile;
    $('.english-name').style.opacity=String(profile?0:nameUnlocked?namePhase.opacity:1);
    $('.profile-name').style.opacity=String(profile?namePhase.opacity:0);
    if(transferToProfile)$('#theme-toggle').focus({preventScroll:true});
    if(transferToEnglish)$('[data-reveal=name]').focus({preventScroll:true});
    if(wordUnlocked){const phase=revealCycle(now-wordStarted,reduced),index=phase.step%words.length;if(index!==flipIndex){flipIndex=index;setWord(words[index]);}flipWord.style.opacity=String(phase.opacity);}

  }

  const radius=updateDOM();const day=document.documentElement.dataset.theme==='day';
  const morph=clamp((160-radius)/110,0,1),planetMix=planets.available?morph*morph*(3-2*morph):0;
  // Select while fully transparent, before a tap or drag can reveal any pixels.
  if(!active&&planetMix===0){
    const incoming=hasEntered?(planetIndex+1)%planetNames.length:2;
    planets.select(incoming);
    if(queuedEntry)setActive(true);
  }
  scene.render({x,y,radius,active:active&&!blueprint.active,time:elapsed,dt,reduced,tiltX:smoothTiltX,tiltY:smoothTiltY,day,planetMix,orbit,threeParticles:planets.available});
  planets.render(x,y,radius,planetMix,dt,reduced,day,scene.orbitBlend,scene.particleFrames,dragging);
  if(lastObjectName!==planets.objectName)syncObject();
  requestAnimationFrame(tick);
}
// rAF is suspended by the browser in background tabs; reset timestamps on return.
document.addEventListener('visibilitychange',()=>{last=performance.now();});
resize();
await planets.ready;
loadFloatingCovers();
resize();
blueprint.ready=true;
if(reduced){app.dataset.state='rest';$('#blueprint').hidden=true;app.inert=false;}
last=performance.now();requestAnimationFrame(tick);startCoverUpdates();
// Read-only diagnostics used by the browser smoke check.
Object.defineProperty(window,'wabi',{value:{get state(){return app.dataset.state},get orbit(){return orbit},get renderer(){return scene.renderer},get earth(){return planets.diagnostics},get planet(){return planets.diagnostics},get theme(){return document.documentElement.dataset.theme},get position(){return {x,y,radius:200-150*clamp((height-y)/(height*.6),0,1)}}},writable:false});
