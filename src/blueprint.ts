/** Measured layout → staggered drawing → downward wipe, following imdaryl.com. */
export class Blueprint {
  private started=0;
  private drawing=document.querySelector<HTMLElement>('#drawing')!;
  private overlay=document.querySelector<HTMLElement>('#blueprint')!;
  private duration=2800;
  active=false;
  constructor(private done:()=>void){}
  start(){this.active=true;this.started=performance.now();this.overlay.hidden=false;this.overlay.classList.remove('wiping');this.overlay.style.setProperty('--wipe','0px');this.measure();}
  measure(){
    this.drawing.replaceChildren();
    const w=window.innerWidth,h=window.innerHeight,col=Math.min(w*.85,480),left=(w-col)/2;
    this.overlay.style.setProperty('--origin',`${left}px`);
    const add=(cls:string,styles:Record<string,string>,text?:string)=>{const el=document.createElement('div');el.className=cls;Object.assign(el.style,styles);if(text)el.textContent=text;this.drawing.append(el);return el;};
    add('draft-column',{left:`${left}px`,width:`${col}px`});
    add('draft-ruler',{});
    const dim=add('draft-dim',{left:`${left}px`,top:'28px',width:`${col}px`});dim.append(Object.assign(document.createElement('b'),{textContent:`${Math.round(col)}`}));
    add('draft-cross',{top:`${h*.5}px`});
    add('draft-note',{left:`${left+12}px`,top:'48px'},'01 · setting out');
    if(w>760)add('draft-note',{left:`${left+col+18}px`,top:'48px'},'wabi · 1:1');
    document.querySelectorAll<HTMLElement>('[data-blueprint]').forEach((el,index)=>{
      const r=el.getBoundingClientRect(),kind=el.dataset.blueprint!;
      const rect={left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`};
      const box=add(`draft-box ${kind}`,rect);box.style.setProperty('--i',`${index}`);
      const label=document.createElement('b');label.className='draft-label';label.textContent=kind==='prism'?`prism · ø ${Math.round(r.width)}`:kind==='copy'?'copy 01':'back';box.append(label);
      if(kind==='copy'){
        const ghost=add('draft-text',rect,el.textContent??'');ghost.style.setProperty('--i',`${index}`);
        box.animate([{opacity:1},{opacity:0}],{duration:300,delay:1500+index*70,fill:'forwards'});
        const d=add('draft-dim',{left:`${r.left}px`,top:`${r.bottom+23}px`,width:`${r.width}px`});d.append(Object.assign(document.createElement('b'),{textContent:`${Math.round(r.width)} × ${Math.round(r.height)}`}));
      }
      if(kind==='prism'){add('draft-origin',{left:`${r.left+r.width/2}px`,top:`${r.top+r.height/2}px`});}
    });
  }
  tick(now:number){
    if(!this.active)return;
    const t=now-this.started;
    if(t<this.duration)return;
    this.overlay.classList.add('wiping');
    const p=Math.min(1,(t-this.duration)/1200),ease=p*p*(3-2*p);
    this.overlay.style.setProperty('--wipe',`${ease*(window.innerHeight+3)}px`);
    if(p>=1)this.finish();
  }
  finish(){if(!this.active)return;this.active=false;this.overlay.hidden=true;this.done();}
}
