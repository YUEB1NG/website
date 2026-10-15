/** Three little aircraft tow one Argentine flag up through the page. */
export class Flyover {
  private layer=document.createElement('div');
  private animation?:Animation;
  private timer?:ReturnType<typeof setTimeout>;
  constructor(){
    this.layer.className='flyover';this.layer.setAttribute('aria-hidden','true');this.layer.hidden=true;
    const jet=(x:number,y:number,angle:number)=>`<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M0-40q6 9 6 25v10l29 23v7L6 13v20l11 10v5L0 42l-17 6v-5l11-10V13l-29 12v-7L-6-5v-10q0-16 6-25Z" fill="#f3f9ff" stroke="#39799d" stroke-width="2"/><path d="M0-24v50" stroke="#91c9e9" stroke-width="3"/><path d="M-3-21q3-8 6 0v9h-6Z" fill="#37556f"/></g>`;
    this.layer.innerHTML=`<svg viewBox="0 0 460 390" role="presentation"><g stroke="#9bb3c7" stroke-width="1.6" fill="none"><path d="M105 103 80 220M230 68 230 220M355 103 380 220"/></g>${jet(105,60,-12)}${jet(230,25,0)}${jet(355,60,12)}<g class="flying-banner"><path d="M65 209q83 15 165 0t165 0v108q-83-15-165 0t-165 0Z" fill="#81c8ed" stroke="#fff" stroke-width="2"/><path d="M65 245q83 15 165 0t165 0v36q-83-15-165 0t-165 0Z" fill="#fff"/><g transform="translate(230 263)" fill="#edba4c" stroke="#d59b38"><circle r="10"/><path d="M0-19v6M0 13v6M-19 0h6M13 0h6M-13-13l4 4M9 9l4 4M-13 13l4-4M9-9l4-4" stroke-width="2"/></g></g></svg>`;
    document.querySelector('#wabi')!.append(this.layer);
  }
  play(reduced:boolean,reveal:()=>void){
    this.cancel();if(reduced){reveal();return;}
    this.layer.hidden=false;
    this.animation=this.layer.animate([{transform:'translate(-50%, 115dvh)'},{transform:'translate(-50%, -480px)'}],{duration:6500,easing:'cubic-bezier(.32,.05,.4,.98)',fill:'forwards'});
    this.timer=setTimeout(reveal,2700);this.animation.onfinish=()=>{this.layer.hidden=true;};
  }
  cancel(){this.animation?.cancel();clearTimeout(this.timer);this.layer.hidden=true;}
  get active(){return !this.layer.hidden;}
}
