import * as THREE from 'three';

/** Alpha hashing keeps both surfaces on a single precompiled shader variant. */
export function prepareDissolve(root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!m.transparent&&!(m instanceof THREE.ShaderMaterial)&&!m.alphaHash){m.alphaHash=true;m.needsUpdate=true;}});}

/** Accelerate the same solid body, change its surface at speed, then coast down. */
export class FootballTransition {
  readonly duration=3.8;
  age=0;
  speed=.045;
  private outgoing=new Map<THREE.Material,number>();
  private incoming=new Map<THREE.Material,number>();
  private sources:THREE.Object3D[];
  private visibility:boolean[];
  constructor(private root:THREE.Group,readonly target:THREE.Group,private source:THREE.Object3D){
    this.sources=[...root.children];this.visibility=this.sources.map(o=>o.visible);
    const remember=(object:THREE.Object3D,cache:Map<THREE.Material,number>)=>object.traverseVisible(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])cache.set(m,m.opacity);});
    remember(root,this.outgoing);remember(target,this.incoming);
    this.incoming.forEach((_,m)=>m.opacity=0);target.visible=false;
    target.rotation.y=source.rotation.y;root.add(target);
  }
  tick(dt:number,_radius:number,_pixelRatio:number,reduced:boolean){
    this.age=reduced?this.duration:Math.min(this.duration,this.age+dt);
    this.speed=this.age<1.05?THREE.MathUtils.lerp(.045,9,THREE.MathUtils.smoothstep(this.age,0,1.05)):THREE.MathUtils.lerp(9,.08,THREE.MathUtils.smoothstep(this.age,1.05,this.duration));
    const turn=reduced?0:this.speed*dt;this.source.rotation.y+=turn;this.target.rotation.y+=turn;
    const next=THREE.MathUtils.smoothstep(this.age,.92,1.34),old=1-next;
    this.outgoing.forEach((opacity,m)=>{m.opacity=opacity*old;if(m instanceof THREE.ShaderMaterial&&m.uniforms.opacity)m.uniforms.opacity.value=m.opacity;});
    this.incoming.forEach((opacity,m)=>m.opacity=opacity*next);
    this.sources.forEach((o,i)=>o.visible=this.visibility[i]&&old>0);this.target.visible=next>0;
    return this.age===this.duration;
  }
  dispose(){
    for(const cache of [this.outgoing,this.incoming])cache.forEach((opacity,m)=>{m.opacity=opacity;if(m instanceof THREE.ShaderMaterial&&m.uniforms.opacity)m.uniforms.opacity.value=opacity;});
    this.sources.forEach((o,i)=>o.visible=this.visibility[i]);this.target.removeFromParent();this.target.visible=true;
  }
  get diagnostics(){return {style:'spin',progress:this.age/this.duration,speed:this.speed,sourceVisible:this.sources.filter(o=>o.visible).length,targetVisible:this.target.visible,angle:this.target.rotation.y};}
}
