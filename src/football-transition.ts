import * as THREE from 'three';

type Face={a:THREE.Vector3;b:THREE.Vector3;c:THREE.Vector3;uv:THREE.Vector2[];material:THREE.Material;end:number};
type Surface={positions:Float32Array;colors:Float32Array};
const count=1500;

/** Sample the actual visible sculpture, including its texture colours. */
function surface(root:THREE.Object3D,space:THREE.Matrix4):Surface {
  root.updateWorldMatrix(true,true);
  const faces:Face[]=[];let total=0;
  root.traverseVisible(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const geometry:THREE.BufferGeometry=object.geometry;
    const position=geometry.attributes.position,uv=geometry.attributes.uv,index=geometry.index;
    if(!position)return;
    const matrix=new THREE.Matrix4().multiplyMatrices(space,object.matrixWorld);
    for(let i=0;i<(index?.count??position.count);i+=3){
      const group=geometry.groups.find(g=>i>=g.start&&i<g.start+g.count);
      const material=Array.isArray(object.material)?object.material[group?.materialIndex??0]:object.material;
      if(!material||material.transparent||material instanceof THREE.ShaderMaterial)continue;
      const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);
      const [a,b,c]=ids.map(n=>new THREE.Vector3().fromBufferAttribute(position,n).applyMatrix4(matrix));
      const area=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).length()*.5;
      if(area<1e-9)continue;total+=area;
      faces.push({a,b,c,material,end:total,uv:ids.map(n=>uv?new THREE.Vector2(uv.getX(n),uv.getY(n)):new THREE.Vector2())});
    }
  });
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3);
  const pixels=new Map<THREE.Texture,ImageData>();
  let seed=8187;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<count;i++){
    let low=0,high=faces.length-1;const pick=rand()*total;
    while(low<high){const mid=(low+high)>>1;if(faces[mid].end<pick)low=mid+1;else high=mid;}
    const face=faces[low];if(!face)continue;
    const s=Math.sqrt(rand()),t=rand(),weights=[1-s,s*(1-t),s*t];
    const point=face.a.clone().multiplyScalar(weights[0]).addScaledVector(face.b,weights[1]).addScaledVector(face.c,weights[2]);point.toArray(positions,i*3);
    const material=face.material as THREE.MeshPhongMaterial;
    const color=material.color?.clone()??new THREE.Color('white'),map=material.map;
    if(map?.image){
      if(!pixels.has(map)){
        const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;
        ctx.drawImage(map.image as CanvasImageSource,0,0,128,128);pixels.set(map,ctx.getImageData(0,0,128,128));
      }
      const texUV=face.uv[0].clone().multiplyScalar(weights[0]).addScaledVector(face.uv[1],weights[1]).addScaledVector(face.uv[2],weights[2]);
      map.transformUv(texUV);const x=Math.max(0,Math.min(127,Math.floor(texUV.x*128))),y=Math.max(0,Math.min(127,Math.floor(texUV.y*128))),data=pixels.get(map)!.data,n=(y*128+x)*4;
      color.multiply(new THREE.Color().setRGB(data[n]/255,data[n+1]/255,data[n+2]/255,THREE.SRGBColorSpace));
    }
    color.toArray(colors,i*3);
  }
  return {positions,colors};
}

/** One GPU point cloud moves from the outgoing surface to the incoming ball. */
export class FootballTransition {
  readonly points:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
  readonly target:THREE.Group;
  age=0;
  readonly duration=2.15;
  private outgoing=new Map<THREE.Material,{opacity:number;transparent:boolean;depthWrite:boolean}>();
  private incoming=new Map<THREE.Material,{opacity:number;transparent:boolean;depthWrite:boolean}>();
  private sources:THREE.Object3D[];
  constructor(root:THREE.Group,target:THREE.Group){
    this.target=target;this.sources=[...root.children];
    root.updateWorldMatrix(true,true);
    const from=surface(root,root.matrixWorld.clone().invert()),to=surface(target,new THREE.Matrix4());
    const scatter=new Float32Array(count*3),delay=new Float32Array(count);
    for(let i=0;i<count;i++){
      const a=i*2.399963229728653,y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),spread=1.7+((i*37)%101)/101*.7;
      scatter.set([Math.cos(a)*r*spread,y*1.55,Math.sin(a)*r*spread],i*3);delay[i]=(i%17)/17*.055;
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(from.positions,3));geometry.setAttribute('destination',new THREE.BufferAttribute(to.positions,3));geometry.setAttribute('scatter',new THREE.BufferAttribute(scatter,3));geometry.setAttribute('color',new THREE.BufferAttribute(from.colors,3));geometry.setAttribute('targetColor',new THREE.BufferAttribute(to.colors,3));geometry.setAttribute('delay',new THREE.BufferAttribute(delay,1));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{progress:{value:0},pointSize:{value:3},opacity:{value:0}},
      vertexShader:`attribute vec3 destination;attribute vec3 scatter;attribute vec3 targetColor;attribute float delay;uniform float progress;uniform float pointSize;varying vec3 vTint;
        void main(){float p=clamp((progress-delay)/(1.-delay),0.,1.);float outT=clamp(p/.38,0.,1.);outT=1.-pow(1.-outT,3.);float inT=smoothstep(.40,1.,p);
        vec3 cloud=scatter;float swirl=sin(p*3.14159265)*.18;cloud.x+=sin(scatter.z*2.+p*5.)*swirl;cloud.y+=cos(scatter.x*3.+p*4.)*swirl;
        vec3 pos=mix(mix(position,cloud,outT),destination,inT);vTint=mix(color,targetColor,smoothstep(.32,.88,p));gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);gl_PointSize=pointSize*(.8+.2*sin(delay*70.));}`,
      fragmentShader:`uniform float opacity;varying vec3 vTint;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vTint,opacity*(1.-smoothstep(.28,.5,d)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
    });
    this.points=new THREE.Points(geometry,material);this.points.frustumCulled=false;this.points.renderOrder=8;
    const remember=(object:THREE.Object3D,map:typeof this.outgoing)=>object.traverseVisible(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!map.has(m)){map.set(m,{opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});m.transparent=true;m.depthWrite=false;m.needsUpdate=true;}});
    remember(root,this.outgoing);remember(target,this.incoming);
    this.incoming.forEach((_,m)=>m.opacity=0);
    root.add(target,this.points);
  }
  tick(dt:number,radius:number,pixelRatio:number,reduced:boolean){
    this.age=reduced?this.duration:Math.min(this.duration,this.age+dt);const t=this.age/this.duration;
    this.points.material.uniforms.progress.value=t;this.points.material.uniforms.pointSize.value=Math.min(5,radius*.05)*pixelRatio;
    this.points.material.uniforms.opacity.value=THREE.MathUtils.smoothstep(t,0,.09)*(1-THREE.MathUtils.smoothstep(t,.88,1));
    const old=1-THREE.MathUtils.smoothstep(t,0,.13),next=THREE.MathUtils.smoothstep(t,.84,1);
    this.outgoing.forEach((base,m)=>{m.opacity=base.opacity*old;if(m instanceof THREE.ShaderMaterial&&m.uniforms.opacity)m.uniforms.opacity.value=m.opacity;});this.incoming.forEach((base,m)=>m.opacity=base.opacity*next);
    return t===1;
  }
  dispose(){
    for(const cache of [this.outgoing,this.incoming])cache.forEach((base,m)=>{Object.assign(m,base);if(m instanceof THREE.ShaderMaterial&&m.uniforms.opacity)m.uniforms.opacity.value=base.opacity;m.needsUpdate=true;});
    this.points.removeFromParent();this.points.geometry.dispose();this.points.material.dispose();this.target.removeFromParent();
  }
  get diagnostics(){return {progress:this.age/this.duration,particles:count,sourceCount:this.sources.length};}
}
