// Particle lifetime / alpha envelope adapted from spoilerjs (MIT).
// https://github.com/shajidhasan/spoilerjs — public/licenses/spoilerjs.txt
// Uses the existing page clock, Canvas 2D and bounded particles for mobile Safari.
type Dot={x:number;y:number;vx:number;vy:number;age:number;life:number;size:number;alpha:number};
export class SpoilerVeil {
  readonly canvas=document.createElement('canvas');
  private ctx:CanvasRenderingContext2D;
  private dots:Dot[]=[];
  private width=0;private height=0;private ratio=1;
  private progress=0;private accumulator=0;
  private origin={x:.5,y:.5};
  constructor(private element:HTMLElement){
    this.canvas.className='spoiler-dust';this.canvas.setAttribute('aria-hidden','true');
    const span=document.createElement('span');span.className='spoiler-label';
    while(element.firstChild)span.append(element.firstChild);element.append(span);
    element.append(this.canvas);this.ctx=this.canvas.getContext('2d')!;
    new ResizeObserver(()=>this.resize()).observe(element);
    element.closest('button')?.addEventListener('pointerdown',e=>{
      const box=element.getBoundingClientRect();this.origin={x:(e.clientX-box.left)/box.width,y:(e.clientY-box.top)/box.height};
    });
    this.resize();
  }
  private resize(){
    const w=this.element.offsetWidth,h=this.element.offsetHeight,dpr=Math.min(devicePixelRatio,2);
    if(!w||!h||w===this.width&&h===this.height&&dpr===this.ratio)return;
    this.width=w;this.height=h;this.ratio=dpr;this.canvas.width=Math.ceil(w*dpr);this.canvas.height=Math.ceil(h*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);this.dots=Array.from({length:Math.min(600,Math.ceil(w*h*.32))},()=>this.dot(true));
  }
  private dot(stagger=false):Dot{
    const angle=Math.random()*Math.PI*2,speed=.65+Math.random()*2,life=1.8+Math.random()*2.4;
    return {x:Math.random()*this.width,y:Math.random()*this.height,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:stagger?Math.random()*life:0,life,size:.5+Math.random()*.65,alpha:.3+Math.random()*.65};
  }
  tick(dt:number,reduced:boolean,visible:boolean){
    if(!visible||document.hidden)return;
    const open=this.element.dataset.state==='open',target=open?1:0;
    this.progress=reduced?target:Math.max(0,Math.min(1,this.progress+(open?1:-1)*dt/.75));
    this.accumulator+=dt;if(this.accumulator<1/30&&this.progress!==target)return;
    if(this.accumulator<1/30)return;const step=this.accumulator;this.accumulator=0;
    const ctx=this.ctx;ctx.clearRect(0,0,this.width,this.height);
    if(this.progress===1)return;
    ctx.fillStyle=getComputedStyle(this.element).color;
    const reach=Math.hypot(this.width,this.height)*1.3,ox=this.origin.x*this.width,oy=this.origin.y*this.height;
    for(let i=0;i<this.dots.length;i++){
      let dot=this.dots[i];
      if(!reduced){dot.age+=step;dot.x=(dot.x+dot.vx*step+this.width)%this.width;dot.y=(dot.y+dot.vy*step+this.height)%this.height;if(dot.age>=dot.life)dot=this.dots[i]=this.dot();}
      const phase=dot.age/dot.life,fade=reduced?.65:Math.min(1,phase/.2,(1-phase)/.2);
      const distance=Math.hypot(dot.x-ox,dot.y-oy),edge=this.progress*reach;
      const mask=this.progress===0?1:Math.max(0,Math.min(1,(distance-edge)/9));
      ctx.globalAlpha=dot.alpha*fade*mask;ctx.fillRect(dot.x,dot.y,dot.size,dot.size);
    }
    ctx.globalAlpha=1;
  }
}
