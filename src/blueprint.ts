/** Measured layout → staggered drawing → downward wipe, following imdaryl.com. */
export class Blueprint {
  private started=0;
  private drawing=document.querySelector<HTMLElement>('#drawing')!;
  private overlay=document.querySelector<HTMLElement>('#blueprint')!;
  private duration=2800;
  active=false;
  ready=false;
  private wipeStarted=0;
  private frame=0;
  constructor(private done:()=>void){}
  start(){cancelAnimationFrame(this.frame);this.wipeStarted=0;this.active=true;this.started=performance.now();this.overlay.hidden=false;this.overlay.classList.remove('wiping');this.overlay.style.setProperty('--wipe','0px');this.drawing.replaceChildren();this.measure();const frame=(now:number)=>{this.tick(now);if(this.active)this.frame=requestAnimationFrame(frame);};this.frame=requestAnimationFrame(frame);}
  measure(){
    const existing=new Map(Array.from(this.drawing.children).map(el=>[(el as HTMLElement).dataset.key!,el as HTMLElement]));
    const counts=new Map<string,number>(),used=new Set<HTMLElement>();
    const w=window.innerWidth,h=window.innerHeight,col=Math.min(w*.85,480),left=(w-col)/2;
    this.overlay.style.setProperty('--origin',`${left}px`);
    const add=(cls:string,styles:Record<string,string>,text?:string)=>{const index=counts.get(cls)??0;counts.set(cls,index+1);const key=cls+index;const el=existing.get(key)??document.createElement('div');el.dataset.key=key;el.className=cls;Object.assign(el.style,styles);if(text)el.textContent=text;if(!el.parentElement)this.drawing.append(el);used.add(el);return el;};
    const label=(el:HTMLElement,text:string,cls='')=>{let b=el.querySelector('b');if(!b){b=document.createElement('b');el.append(b);}b.className=cls;b.textContent=text;};
    add('draft-column',{left:`${left}px`,width:`${col}px`});
    add('draft-ruler',{});
    const dim=add('draft-dim',{left:`${left}px`,top:'28px',width:`${col}px`});label(dim,`${Math.round(col)}`);
    add('draft-cross',{top:`${h*.5}px`});
    add('draft-note',{left:`${left+12}px`,top:'48px'},'01 · setting out');
    if(w>760)add('draft-note',{left:`${left+col+18}px`,top:'48px'},'wabi · 1:1');
    document.querySelectorAll<HTMLElement>('[data-blueprint]').forEach((el,index)=>{
      const r=el.getBoundingClientRect(),kind=el.dataset.blueprint!;
      const rect={left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`};
      const box=add(`draft-box ${kind}`,rect);box.style.setProperty('--i',`${index}`);
      label(box,kind==='prism'?`prism · ø ${Math.round(r.width)}`:kind==='copy'?'copy 01':'back','draft-label');
      if(kind==='copy'){
        const ghost=add('draft-text',rect,el.textContent??'');ghost.style.setProperty('--i',`${index}`);
        if(!box.dataset.faded){box.dataset.faded='true';box.animate([{opacity:1},{opacity:0}],{duration:300,delay:1500+index*70,fill:'forwards'});}
        const d=add('draft-dim',{left:`${r.left}px`,top:`${r.bottom+23}px`,width:`${r.width}px`});label(d,`${Math.round(r.width)} × ${Math.round(r.height)}`);
      }
      if(kind==='prism'){add('draft-origin',{left:`${r.left+r.width/2}px`,top:`${r.top+r.height/2}px`});}
    });
    existing.forEach(el=>{if(!used.has(el))el.remove();});
  }
  tick(now:number){
    if(!this.active)return;
    const t=now-this.started;
    if(t<this.duration||!this.ready)return;
    if(!this.wipeStarted)this.wipeStarted=now;
    this.overlay.classList.add('wiping');
    const p=Math.min(1,(now-this.wipeStarted)/1200),ease=p*p*(3-2*p);
    this.overlay.style.setProperty('--wipe',`${ease*(window.innerHeight+3)}px`);
    if(p>=1)this.finish();
  }
  finish(){if(!this.active)return;this.active=false;cancelAnimationFrame(this.frame);this.overlay.hidden=true;this.done();}
}

export const opening=new Blueprint(()=>window.dispatchEvent(new Event('wabi:opening-finished')));
