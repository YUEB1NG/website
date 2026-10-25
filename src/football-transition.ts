import * as THREE from 'three';

type Surface={positions:Float32Array;colors:Float32Array};
const count=1500;
type Triangles={areas:Float64Array;total:number};
const triangles=new WeakMap<THREE.BufferGeometry,Triangles>();
const texturePixels=new WeakMap<THREE.Texture,ImageData>();
const preparedSurfaces=new WeakMap<THREE.Object3D|THREE.Texture,Surface>();

/** Cache triangle areas, not thousands of temporary vectors on every click. */
function triangleTable(geometry:THREE.BufferGeometry){
  const existing=triangles.get(geometry);if(existing)return existing;
  const p=geometry.attributes.position,index=geometry.index,areas=new Float64Array((index?.count??p.count)/3);
  let total=0;
  for(let i=0;i<areas.length;i++){
    const a=index?index.getX(i*3):i*3,b=index?index.getX(i*3+1):i*3+1,c=index?index.getX(i*3+2):i*3+2;
    const ux=p.getX(b)-p.getX(a),uy=p.getY(b)-p.getY(a),uz=p.getZ(b)-p.getZ(a),vx=p.getX(c)-p.getX(a),vy=p.getY(c)-p.getY(a),vz=p.getZ(c)-p.getZ(a);
    total+=Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)*.5;areas[i]=total;
  }
  const result={areas,total};triangles.set(geometry,result);return result;
}
function search(areas:Float64Array,value:number){let a=0,b=areas.length-1;while(a<b){const m=(a+b)>>1;if(areas[m]<value)a=m+1;else b=m;}return a;}

function surface(root:THREE.Object3D,space:THREE.Matrix4):Surface {
  root.updateWorldMatrix(true,true);
  const meshes:{geometry:THREE.BufferGeometry;material:THREE.MeshPhongMaterial;matrix:THREE.Matrix4;table:Triangles;end:number}[]=[];
  let total=0;
  root.traverseVisible(object=>{
    if(!(object instanceof THREE.Mesh)||object.userData.transitionIgnore)return;
    const material=object.material as THREE.MeshPhongMaterial;
    if(Array.isArray(material)||material.transparent||material instanceof THREE.ShaderMaterial)return;
    const table=triangleTable(object.geometry);if(!table.total)return;
    const matrix=new THREE.Matrix4().multiplyMatrices(space,object.matrixWorld),e=matrix.elements;
    total+=table.total*(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]);
    meshes.push({geometry:object.geometry,material,matrix,table,end:total});
  });
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3),point=new THREE.Vector3(),color=new THREE.Color(),uvPoint=new THREE.Vector2();
  let seed=8187;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<count;i++){
    const pick=rand()*total,mesh=meshes.find(m=>m.end>=pick);if(!mesh)continue;
    const {geometry,material,matrix,table}=mesh,index=geometry.index,p=geometry.attributes.position,uv=geometry.attributes.uv,vertexColor=geometry.attributes.color;
    const face=search(table.areas,rand()*table.total)*3;
    const ids=[0,1,2].map(k=>index?index.getX(face+k):face+k),s=Math.sqrt(rand()),t=rand(),weights=[1-s,s*(1-t),s*t];
    point.set(0,0,0);uvPoint.set(0,0);let cr=0,cg=0,cb=0;
    for(let k=0;k<3;k++){const n=ids[k],weight=weights[k];point.x+=p.getX(n)*weight;point.y+=p.getY(n)*weight;point.z+=p.getZ(n)*weight;if(uv){uvPoint.x+=uv.getX(n)*weight;uvPoint.y+=uv.getY(n)*weight;}if(vertexColor){cr+=vertexColor.getX(n)*weight;cg+=vertexColor.getY(n)*weight;cb+=vertexColor.getZ(n)*weight;}}
    point.applyMatrix4(matrix).toArray(positions,i*3);color.copy(material.color??new THREE.Color('white'));
    if(vertexColor&&material.vertexColors){color.r*=cr;color.g*=cg;color.b*=cb;}
    const map=material.map;
    if(map?.image){
      let pixels=texturePixels.get(map);
      if(!pixels){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(map.image as CanvasImageSource,0,0,128,128);pixels=ctx.getImageData(0,0,128,128);texturePixels.set(map,pixels);}
      map.transformUv(uvPoint);const x=Math.max(0,Math.min(127,Math.floor(uvPoint.x*128))),y=Math.max(0,Math.min(127,Math.floor(uvPoint.y*128))),n=(y*128+x)*4;
      color.multiply(new THREE.Color().setRGB(pixels.data[n]/255,pixels.data[n+1]/255,pixels.data[n+2]/255,THREE.SRGBColorSpace));
    }
    color.toArray(colors,i*3);
  }
  return {positions,colors};
}

/** Keep the same shader variant before, during and after a dissolve. */
export function prepareDissolve(root:THREE.Object3D){root.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!m.transparent&&!(m instanceof THREE.ShaderMaterial)&&!m.alphaHash){m.alphaHash=true;m.needsUpdate=true;}});}
export function prepareFootballSurface(target:THREE.Object3D,key:THREE.Object3D|THREE.Texture=target){
  target.updateWorldMatrix(true,true);
  preparedSurfaces.set(key,surface(target,target.matrixWorld.clone().invert()));
}
/** Reuse samples in object space; rotation and drag are applied at the instant of the tap. */
function sourceSurface(source:THREE.Object3D,root:THREE.Group):Surface{
  const key=source instanceof THREE.Mesh?(source.material as THREE.MeshPhongMaterial).map??source:source;
  const cached=preparedSurfaces.get(key);
  const matrix=root.matrixWorld.clone().invert().multiply(source.matrixWorld);
  if(!cached)return surface(source,root.matrixWorld.clone().invert());
  return transformSurface(cached,matrix);
}
function transformSurface(cached:Surface,matrix:THREE.Matrix4):Surface{
  const positions=cached.positions.slice(),point=new THREE.Vector3();
  for(let i=0;i<count;i++)point.fromArray(positions,i*3).applyMatrix4(matrix).toArray(positions,i*3);
  return {positions,colors:cached.colors};
}

/** Pair nearby angular regions so particles gather along short paths rather
 * than crisscrossing the whole sphere. No mesh/texture work happens here. */
function pairedDestination(from:Surface,to:Surface,matrix:THREE.Matrix4):Surface{
  const point=new THREE.Vector3();
  const order=(positions:Float32Array,transform?:THREE.Matrix4)=>{
    const keys=new Float64Array(count),indices=Array.from({length:count},(_,i)=>i);
    for(let i=0;i<count;i++){
      point.fromArray(positions,i*3);if(transform)point.applyMatrix4(transform);
      const latitude=point.y/Math.max(.001,point.length());
      keys[i]=Math.min(23,Math.floor((latitude+1)*12))*10+Math.atan2(point.z,point.x)+Math.PI;
    }
    return indices.sort((a,b)=>keys[a]-keys[b]);
  };
  const sourceOrder=order(from.positions),targetOrder=order(to.positions,matrix);
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3);
  for(let i=0;i<count;i++)for(let j=0;j<3;j++){
    positions[sourceOrder[i]*3+j]=to.positions[targetOrder[i]*3+j];
    colors[sourceOrder[i]*3+j]=to.colors[targetOrder[i]*3+j];
  }
  return {positions,colors};
}

export function createFootballParticles(){
    const scatter=new Float32Array(count*3),delay=new Float32Array(count);
    for(let i=0;i<count;i++){
      const a=i*2.399963229728653,y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),spread=1.65+((i*37)%101)/101*.55;
      scatter.set([Math.cos(a)*r*spread,y*1.55,Math.sin(a)*r*spread],i*3);delay[i]=(i%17)/17*.055;
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('destination',new THREE.BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('scatter',new THREE.BufferAttribute(scatter,3));geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('targetColor',new THREE.BufferAttribute(new Float32Array(count*3),3));geometry.setAttribute('delay',new THREE.BufferAttribute(delay,1));
    const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{progress:{value:0},pointSize:{value:3},opacity:{value:0},destinationMatrix:{value:new THREE.Matrix4()}},
      vertexShader:`attribute vec3 destination;attribute vec3 scatter;attribute vec3 targetColor;attribute float delay;uniform float progress;uniform float pointSize;uniform mat4 destinationMatrix;varying vec3 vTint;varying float vCoverage;
        float smoother(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
        void main(){float p=clamp((progress-delay)/(1.-delay),0.,1.);float outT=clamp(p/.32,0.,1.);outT=1.-pow(1.-outT,3.);float inT=smoother(.22,.94,p);
        vec3 cloud=scatter;float swirl=sin(p*3.14159265)*.18;cloud.x+=sin(scatter.z*2.+p*5.)*swirl;cloud.y+=cos(scatter.x*3.+p*4.)*swirl;
        vec3 landing=(destinationMatrix*vec4(destination,1.)).xyz;vec3 pos=mix(mix(position,cloud,outT),landing,inT);vTint=mix(color,targetColor,smoother(.25,.78,p));float settled=smoother(.74,.98,inT);vCoverage=1.-settled;gl_Position=projectionMatrix*modelViewMatrix*vec4(pos,1.);gl_PointSize=pointSize*(.8+.2*sin(delay*70.))*mix(1.,.42,settled);}`,
      fragmentShader:`uniform float opacity;varying vec3 vTint;varying float vCoverage;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vTint,opacity*vCoverage*(1.-smoothstep(.2,.5,d)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
    });
    const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=8;return points;
}

/** One GPU point cloud moves from the outgoing surface to the incoming ball. */
export class FootballTransition {
  readonly points:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
  readonly target:THREE.Group;
  age=0;
  readonly duration=2.35;
  private outgoing=new Map<THREE.Material,{opacity:number}>();
  private incoming=new Map<THREE.Material,{opacity:number}>();
  private sources:THREE.Object3D[];
  private sourceVisibility:boolean[];
  constructor(root:THREE.Group,target:THREE.Group,points:ReturnType<typeof createFootballParticles>,source:THREE.Object3D){
    this.target=target;this.sources=[...root.children];this.sourceVisibility=this.sources.map(o=>o.visible);
    root.updateWorldMatrix(true,true);
    target.updateMatrix();
    const prepared=preparedSurfaces.get(target);
    const from=sourceSurface(source,root),to=pairedDestination(from,prepared??surface(target,target.matrixWorld.clone().invert()),target.matrix);
    const scatter=points.geometry.getAttribute('scatter') as THREE.BufferAttribute,radial=new THREE.Vector3();
    for(let i=0;i<count;i++){
      radial.fromArray(from.positions,i*3).normalize().multiplyScalar(1.65+((i*37)%101)/101*.55);
      scatter.setXYZ(i,radial.x,radial.y,radial.z);
    }
    scatter.needsUpdate=true;
    this.points=points;this.points.material.uniforms.destinationMatrix.value.copy(target.matrix);
    for(const [name,values] of Object.entries({position:from.positions,destination:to.positions,color:from.colors,targetColor:to.colors})){
      const attribute=this.points.geometry.getAttribute(name) as THREE.BufferAttribute;(attribute.array as Float32Array).set(values);attribute.needsUpdate=true;
    }
    this.points.material.uniforms.progress.value=0;this.points.material.uniforms.opacity.value=0;
    const remember=(object:THREE.Object3D,map:typeof this.outgoing)=>object.traverseVisible(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!map.has(m)){map.set(m,{opacity:m.opacity});}});
    remember(root,this.outgoing);remember(target,this.incoming);
    this.incoming.forEach((_,m)=>m.opacity=0);
    target.visible=false;root.add(target,this.points);
  }
  tick(dt:number,radius:number,pixelRatio:number,reduced:boolean){
    this.age=reduced?this.duration:Math.min(this.duration,this.age+dt);const t=this.age/this.duration;
    // The destination and its sampled particle surface share the same moving pose.
    if(!reduced)this.target.rotation.y+=dt*.08;
    this.target.updateMatrix();this.points.material.uniforms.destinationMatrix.value.copy(this.target.matrix);
    this.points.material.uniforms.progress.value=t;this.points.material.uniforms.pointSize.value=Math.min(5,radius*.05)*pixelRatio;
    this.points.material.uniforms.opacity.value=THREE.MathUtils.smootherstep(t,0,.10)*(1-THREE.MathUtils.smootherstep(t,.86,1));
    const old=1-THREE.MathUtils.smootherstep(t,0,.18),next=THREE.MathUtils.smootherstep(t,.60,.97);
    this.outgoing.forEach((base,m)=>{m.opacity=base.opacity*old;if(m instanceof THREE.ShaderMaterial&&m.uniforms.opacity)m.uniforms.opacity.value=m.opacity;});this.incoming.forEach((base,m)=>m.opacity=base.opacity*next);
    this.sources.forEach((o,i)=>o.visible=this.sourceVisibility[i]&&old>0);this.target.visible=next>0;
    return t===1;
  }
  dispose(){
    for(const cache of [this.outgoing,this.incoming])cache.forEach((base,m)=>{Object.assign(m,base);if(m instanceof THREE.ShaderMaterial&&m.uniforms.opacity)m.uniforms.opacity.value=base.opacity;});
    this.sources.forEach((o,i)=>o.visible=this.sourceVisibility[i]);this.points.removeFromParent();this.target.removeFromParent();this.target.visible=true;
  }
  get landingMix(){return THREE.MathUtils.smootherstep(this.age/this.duration,.30,.76);}
  get surfacePresence(){const t=this.age/this.duration;return 1-THREE.MathUtils.smootherstep(t,0,.18)+THREE.MathUtils.smootherstep(t,.60,.97);}
  get diagnostics(){return {surfacePresence:this.surfacePresence,solidOpacity:THREE.MathUtils.smootherstep(this.age/this.duration,.60,.97),landingMix:this.landingMix,targetAngle:this.target.rotation.y,progress:this.age/this.duration,particles:count,sourceCount:this.sources.length,sourceVisible:this.sources.filter(o=>o.visible).length,targetVisible:this.target.visible};}
}
