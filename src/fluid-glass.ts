import * as THREE from 'three';

// Optical lighting and volume-preserving drag spring adapted from React Bits
// Fluid Glass (2026-10-16 live component). See public/licenses/react-bits.txt.
// Spheres admit an analytic refraction path, so they do not need the reference's
// arbitrary-shape ray marcher or a second React/WebGL runtime.
const vertex = `
varying vec3 vNormal;
varying vec3 vWorld;
void main(){
  vNormal=normalize(normalMatrix*normal);
  vec4 world=modelMatrix*vec4(position,1.);
  vWorld=world.xyz;
  gl_Position=projectionMatrix*viewMatrix*world;
}`;

const fragment = `
uniform sampler2D uContent;
uniform vec2 uCenter;
uniform vec2 uScreenCenter;
uniform float uExtent;
uniform float uRadius;
uniform float uTime;
uniform float uDay;
uniform float uPresence;
uniform vec3 uBackground;
varying vec3 vNormal;
varying vec3 vWorld;

float hash12(vec2 p){vec3 p3=fract(vec3(p.x,p.y,p.x)*.1031);p3+=dot(p3,vec3(p3.y,p3.z,p3.x)+33.33);return fract((p3.x+p3.y)*p3.z);}
vec3 backdrop(vec2 local){
  vec2 pixel=floor(vec2(uScreenCenter.x+local.x*uRadius,uScreenCenter.y-local.y*uRadius));
  float star=pow(hash12(pixel),3.);
  float pulse=.55+.45*(sin(.22*uTime+pixel.x+pixel.y)+1.)*.5;
  star=smoothstep(.99,1.,star)*pulse;
  return mix(vec3(star),uBackground-vec3(star*.12),uDay);
}
vec3 content(vec2 local){
  vec2 uv=local/(uExtent*2.)+.5;
  vec4 c=texture2D(uContent,clamp(uv,vec2(.001),vec2(.999)));
  // Render-target colors are premultiplied by coverage at transparent edges.
  return c.rgb+backdrop(local)*(1.-c.a);
}

// React Bits' two soft studio lights, with the original Fresnel/rim response.
vec3 studio(vec3 d){
  vec2 a=vec2(atan(d.x,d.z),d.y);
  float key=(1.-smoothstep(.22,.42,abs(a.x+.62)))*(1.-smoothstep(.12,.3,abs(a.y-.5)));
  float strip=(1.-smoothstep(.05,.12,abs(a.x-.95)))*(1.-smoothstep(.35,.8,abs(a.y-.05)));
  float dome=smoothstep(0.,1.,d.z)*.04;
  return vec3(18.)*key+vec3(8.)*strip+vec3(dome);
}

void main(){
  vec3 n=normalize(vNormal),rd=vec3(0.,0.,-1.);
  float cosi=clamp(n.z,0.,1.);
  float ior=1.45;
  vec3 inside=refract(rd,n,1./ior);
  // Exit the sphere analytically, then refract back into air. Limit the landing
  // distance to keep historical panel artwork legible at a 100px diameter.
  vec3 p=normalize(vec3(n.xy,n.z));
  vec3 exitPoint=p+inside*(-2.*dot(p,inside));
  vec3 exitDir=refract(inside,-normalize(exitPoint),ior);
  vec2 local=vWorld.xy-uCenter;
  vec2 bend=(inside.xy+exitDir.xy*.22)*.32;
  vec2 landed=local+bend;
  float dispersion=.35*.06;
  vec2 split=n.xy*dispersion*pow(1.-cosi,1.4);
  vec3 transmitted=vec3(content(landed-split).r,content(landed).g,content(landed+split).b);
  // The existing painted surface lives inside the glass. A little transmission
  // opens up the body without losing continents or the different ball designs.
  float clearAmount=.035+.30*pow(1.-cosi,2.);
  transmitted=mix(transmitted,backdrop(local),clearAmount);
  float surfaceCoverage=texture2D(uContent,local/(uExtent*2.)+.5).a;
  transmitted=mix(backdrop(local),transmitted,.12+.88*surfaceCoverage);
  float f0=pow((ior-1.)/(ior+1.),2.);
  float fresnel=f0+(1.-f0)*pow(1.-cosi,5.);
  vec3 reflected=studio(reflect(rd,n));
  float internalBand=(1.-smoothstep(.08,.25,cosi))*smoothstep(.015,.065,cosi);
  vec3 glass=transmitted*(1.-fresnel*.65)*(1.-internalBand*.65)+reflected*(fresnel+.018);
  vec2 facing=normalize(vec2(-.42,.55));
  float rim=pow(1.-cosi,3.)*(.25+.75*abs(dot(normalize(n.xy+1e-5),facing)))*.55;
  rim*=smoothstep(0.,.08,cosi);
  glass=vec3(rim)+glass*(1.-rim);
  gl_FragColor=vec4(glass,uPresence);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class FluidGlass {
  private target=new THREE.WebGLRenderTarget(256,256,{type:THREE.HalfFloatType,depthBuffer:true,samples:4});
  private camera=new THREE.OrthographicCamera(-1.65,1.65,1.65,-1.65,.1,30);
  private uniforms={
    uContent:{value:this.target.texture},uCenter:{value:new THREE.Vector2()},
    uScreenCenter:{value:new THREE.Vector2()},
    uExtent:{value:1.65},uRadius:{value:50},uTime:{value:0},uDay:{value:1},
    uPresence:{value:1},uBackground:{value:new THREE.Color('#f4f6fa')}
  };
  readonly mesh=new THREE.Mesh(new THREE.SphereGeometry(1.045,72,48),new THREE.ShaderMaterial({
    uniforms:this.uniforms,vertexShader:vertex,fragmentShader:fragment,
    transparent:true,depthWrite:true,depthTest:true
  }));
  private stretch=1;
  private velocity=0;
  private direction=new THREE.Vector2(1,0);
  private previous=new THREE.Vector2();
  private initialized=false;
  private deform=new THREE.Matrix4();
  private rotate=new THREE.Matrix4();
  private unrotate=new THREE.Matrix4();
  private scale=new THREE.Matrix4();
  private clock=0;
  private captureSize=256;
  private presence=0;

  constructor(){
    this.mesh.name='React Bits fluid glass';this.mesh.renderOrder=1;
    this.mesh.matrixAutoUpdate=false;this.mesh.userData.transitionIgnore=true;
  }

  update(group:THREE.Group,x:number,y:number,radius:number,dt:number,reduced:boolean,dragging:boolean,day:boolean,presence:number){
    if(!this.initialized){this.previous.set(x,y);this.initialized=true;}
    const dx=x-this.previous.x,dy=-(y-this.previous.y);
    const speed=Math.hypot(dx,dy)/Math.max(dt,1/240);
    this.previous.set(x,y);this.clock+=reduced?0:dt;
    if(dragging&&speed>15)this.direction.lerp(new THREE.Vector2(dx,dy).normalize(),1-Math.exp(-dt*12)).normalize();
    const goal=1+(dragging&&!reduced?Math.min(speed/1800,.30)*.5:0);
    // Same volume-preserving damped spring as the reference, with a calmer
    // damping ratio for small planets. Substeps make release frame-rate safe.
    const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
    for(let i=0;i<steps;i++){
      this.velocity+=(13*13*(goal-this.stretch)-2*.46*13*this.velocity)*h;
      this.stretch+=this.velocity*h;
    }
    if(reduced){this.stretch=1;this.velocity=0;}
    if(Math.abs(this.stretch-1)<.0001&&Math.abs(this.velocity)<.001&&goal===1){this.stretch=1;this.velocity=0;}
    const angle=Math.atan2(this.direction.y,this.direction.x),q=1/Math.sqrt(this.stretch);
    this.rotate.makeRotationZ(angle);this.unrotate.makeRotationZ(-angle);this.scale.makeScale(this.stretch,q,q);
    this.deform.copy(this.rotate).multiply(this.scale).multiply(this.unrotate);
    group.updateMatrix();group.matrix.premultiply(this.deform);group.matrix.setPosition(group.position);group.matrixAutoUpdate=false;group.matrixWorldNeedsUpdate=true;
    this.mesh.matrix.copy(this.deform).setPosition(group.position);this.mesh.matrixWorldNeedsUpdate=true;
    this.presence=presence;this.mesh.visible=presence>.001;
    this.uniforms.uPresence.value=presence;this.uniforms.uCenter.value.set(group.position.x,group.position.y);
    this.uniforms.uScreenCenter.value.set(x,y);this.uniforms.uRadius.value=radius;
    this.uniforms.uTime.value=this.clock;this.uniforms.uDay.value=day?1:0;
    this.camera.position.set(group.position.x,group.position.y,10);this.camera.updateMatrixWorld();
    // Keep a fixed, small capture allocation. No resize/allocation during drag.
  }

  render(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera){
    if(this.mesh.visible){
      this.mesh.visible=false;
      const old=renderer.getRenderTarget();
      renderer.setRenderTarget(this.target);renderer.render(scene,this.camera);renderer.setRenderTarget(old);
      this.mesh.visible=true;
    }
    renderer.render(scene,camera);
  }

  get diagnostics(){return {style:'react-bits-fluid-glass',presence:this.presence,stretch:this.stretch,captureSize:this.captureSize,refraction:1.45,dispersion:.35};}
}
