export type CoverPose={x:number;y:number;z:number;size:number;opacity:number;visible:boolean};
const ease=(t:number)=>t*t*(3-2*t);
/** Hold final rendered positions in CSS pixels, independent of the orb and camera zoom. */
export class CoverHold {
  private last:CoverPose[]=[];
  private pins:CoverPose[]=[];
  private held=false;
  private age=0;
  private release=1;
  update(target:CoverPose[],holding:boolean,dt:number,reduced=false){
    if(holding&&!this.held){this.pins=this.last.map(p=>({...p}));this.age=0;this.release=0;}
    if(!holding&&this.held){this.pins=this.last.map(p=>({...p}));this.release=0;}
    this.held=holding;
    if(holding)this.age+=dt;else this.release=Math.min(1,this.release+dt/.65);
    const blend=ease(this.release);
    this.last=target.map((p,i)=>{
      const pin=this.pins[i];if(!pin)return holding?{...p,visible:false}:p;
      if(holding){const phase=i*1.73,t=this.age*.85;return {...pin,
        x:pin.x+(reduced?0:1.1*(Math.sin(phase+t)-Math.sin(phase))),
        y:pin.y+(reduced?0:1.3*(Math.cos(phase+t)-Math.cos(phase)))};}
      if(blend>=1)return p;
      return {x:pin.x+(p.x-pin.x)*blend,y:pin.y+(p.y-pin.y)*blend,z:pin.z+(p.z-pin.z)*blend,
        size:pin.size+(p.size-pin.size)*blend,opacity:(pin.visible?pin.opacity:0)*(1-blend)+(p.visible?p.opacity:0)*blend,
        visible:pin.visible||p.visible};
    });
    return this.last;
  }
  get positions(){return this.last;}
}
