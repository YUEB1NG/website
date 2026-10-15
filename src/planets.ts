import * as THREE from 'three';
import { bubbleImages } from './assets';

export const planetNames=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'];
const maps=['mercury','venus_surface','earth_daymap','mars','jupiter','saturn','uranus','neptune'];
const colors=[0xaaa59a,0xc6ae81,0x819db5,0xa96745,0xc4ad92,0xcebd97,0x9bbfc2,0x4972a6];

export class Planets {
  private renderer?:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(-2.25,2.25,2.25,-2.25,.1,20);
  private sphere=new THREE.SphereGeometry(1,80,56);
  private material=new THREE.MeshPhongMaterial({shininess:10,specular:0x18212b});
  private body=new THREE.Mesh(this.sphere,this.material);
  private group=new THREE.Group();
  private rings=new THREE.Group();
  private orbitGroup=new THREE.Group();
  private orbitSprites:THREE.Sprite[]=[];
  private ambient=new THREE.HemisphereLight(0xdde6ef,0x29292f,1.15);
  private sun=new THREE.DirectionalLight(0xfff3e1,2.5);
  private atmosphere:THREE.Mesh;
  private clouds=new THREE.Mesh(new THREE.SphereGeometry(1.006,64,40),new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.38,depthWrite:false,shininess:0}));
  private textures:(THREE.Texture|undefined)[]=Array(8);
  private night?:THREE.Texture;
  private normal?:THREE.Texture;
  private specular?:THREE.Texture;
  private ringMap?:THREE.Texture;
  private index=2;
  private theme='';
  private rotation=0;
  private orbitAngle=.55;
  private lost=false;
  private size=0;
  private mooncake=false;
  private cake=new THREE.Group();
  private cakeMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.54,metalness:0});
  private cakeGeometry=new THREE.SphereGeometry(1,96,64);
  private dayUniform={value:1};
  readonly canvas=document.createElement('canvas');
  readonly ready:Promise<unknown>;

  constructor(){
    this.canvas.id='planet-scene';this.canvas.setAttribute('aria-hidden','true');
    document.querySelector('#scene')!.after(this.canvas);
    this.camera.position.z=6;
    this.sun.position.set(-3.2,2.1,4.5);
    this.group.rotation.z=.16;
    this.group.add(this.body,this.rings,this.cake);
    this.scene.add(this.group,this.ambient,this.sun,this.orbitGroup);
    // A tilted orbital plane with a true Z axis: the depth buffer hides the far side.
    this.orbitGroup.rotation.set(1.28,0,.38,'ZXY');
    this.atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.012,48,32),new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,
      vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
      fragmentShader:`varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-max(dot(normalize(n),normalize(v)),0.),4.);gl_FragColor=vec4(.22,.46,.8,rim*.18);}`
    }));
    this.group.add(this.atmosphere,this.clouds);
    this.clouds.visible=false;
    this.material.onBeforeCompile=shader=>{
      shader.uniforms.localDay=this.dayUniform;
      shader.fragmentShader='uniform float localDay;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        float sunlight=dot(normalize(normal),normalize(vec3(-3.2,2.1,4.5)));
        totalEmissiveRadiance*=1.-smoothstep(-.2,.4,sunlight);`);
    };
    this.makeMooncake();
    try{
      this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'low-power'});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    }catch{this.canvas.hidden=true;}
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.canvas.hidden=true;});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.canvas.hidden=false;});
    const loader=new THREE.TextureLoader();
    const load=async(path:string,color=true)=>{const t=await loader.loadAsync(path);if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(this.renderer?.capabilities.getMaxAnisotropy()??1,4);return t;};
    const surfaces=maps.map(async(name,index)=>{this.textures[index]=await load(`/planets/${name}.jpg`);if(this.index===index&&!this.mooncake)this.updateSurface();});
    this.ready=Promise.allSettled([
      ...surfaces,
      load('/planets/earth_nightmap.jpg').then(t=>this.night=t),
      load('/planets/earth-normal.jpg',false).then(t=>this.normal=t),
      load('/planets/earth-specular.jpg',false).then(t=>this.specular=t),
      load('/planets/earth_clouds.jpg',false).then(t=>{this.clouds.material.alphaMap=t;this.clouds.material.needsUpdate=true;}),
      load('/planets/saturn-ring.png').then(t=>this.ringMap=t),
      ...bubbleImages.slice(0,20).map(async path=>{
        const texture=await load(path);
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,alphaTest:.08,toneMapped:false}));
        sprite.scale.setScalar(.29);this.orbitGroup.add(sprite);this.orbitSprites.push(sprite);
      })
    ]).then(()=>this.select(this.index));
    this.select(2);
  }
  private updateSurface(){
    this.material.map=this.textures[this.index]??null;
    this.material.color.set(this.material.map?0xffffff:colors[this.index]);
    this.material.normalMap=this.index===2?this.normal??null:null;
    this.material.normalScale.set(.32,.32);
    this.material.specularMap=this.index===2?this.specular??null:null;
    this.material.specular.set(this.index===2?0x506070:0x101010);
    this.material.shininess=this.index===2?18:4;
    this.material.emissiveMap=this.index===2?this.night??null:null;
    this.material.emissive.set(this.index===2?0xffffff:0x000000);
    this.material.needsUpdate=true;
  }
  private makeMooncake(){
    // Warm baked crust, shallow flutes and raised rosettes on a spherical pastry.
    const pos=this.cakeGeometry.attributes.position;
    for(let i=0;i<pos.count;i++){
      const v=new THREE.Vector3().fromBufferAttribute(pos,i);
      const theta=Math.atan2(v.z,v.x),belt=Math.pow(1-v.y*v.y,.65);
      v.multiplyScalar(1+.014*Math.cos(theta*16)*belt);pos.setXYZ(i,v.x,v.y,v.z);
    }
    this.cakeGeometry.computeVertexNormals();
    const crust=document.createElement('canvas');crust.width=512;crust.height=256;
    const ctx=crust.getContext('2d')!,image=ctx.createImageData(512,256);
    for(let y=0;y<256;y++)for(let x=0;x<512;x++){
      const grain=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
      const toast=Math.sin(x/512*Math.PI*32)*9+Math.cos(y/256*Math.PI*6)*7+grain*5;
      const i=(y*512+x)*4;image.data[i]=207+toast;image.data[i+1]=142+toast*.75;image.data[i+2]=62+toast*.4;image.data[i+3]=255;
    }
    ctx.putImageData(image,0,0);const texture=new THREE.CanvasTexture(crust);texture.colorSpace=THREE.SRGBColorSpace;
    this.cakeMaterial.map=texture;this.cakeMaterial.bumpMap=texture;this.cakeMaterial.bumpScale=.018;
    this.cake.add(new THREE.Mesh(this.cakeGeometry,this.cakeMaterial));
    const raised=new THREE.MeshStandardMaterial({color:0xd99a4c,roughness:.7});
    const curve=(points:THREE.Vector3[],closed=true)=>{
      const c=new THREE.CatmullRomCurve3(points,closed);
      return new THREE.Mesh(new THREE.TubeGeometry(c,128,.018,6,closed),raised);
    };
    for(const side of [1,-1]){
      const stamp=new THREE.Group();stamp.rotation.y=side===1?0:Math.PI;
      for(const radius of [.64,.72]){
        const points=Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2;const r=radius+.012*Math.cos(a*16);return new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,Math.sqrt(1-r*r)+.012);});
        stamp.add(curve(points));
      }
      const petals=Array.from({length:144},(_,i)=>{const a=i/144*Math.PI*2,r=.39+.13*Math.cos(a*8);return new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,Math.sqrt(1-r*r)+.015);});
      stamp.add(curve(petals));
      const inner=Array.from({length:64},(_,i)=>{const a=i/64*Math.PI*2,r=.16+.025*Math.cos(a*8);return new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,Math.sqrt(1-r*r)+.016);});
      stamp.add(curve(inner));this.cake.add(stamp);
    }
    this.cake.visible=false;
  }
  select(index:number){
    this.index=index;this.mooncake=false;this.cake.visible=false;this.body.visible=true;
    this.atmosphere.visible=index===2||index>=6;
    this.clouds.visible=index===2&&!!this.clouds.material.alphaMap;
    this.updateSurface();this.body.rotation.set(0,index===2?2.4:0,0);
    for(const child of [...this.rings.children]){const m=child as THREE.Mesh<THREE.RingGeometry,THREE.MeshPhongMaterial>;m.geometry.dispose();m.material.dispose();this.rings.remove(child);}
    if(index===5||index===6){
      const geometry=new THREE.RingGeometry(1.2,index===5?1.95:1.65,128);
      const uv=geometry.attributes.uv,position=geometry.attributes.position;
      for(let i=0;i<uv.count;i++){const r=Math.hypot(position.getX(i),position.getY(i));uv.setXY(i,(r-1.2)/(index===5?.75:.45),.5);}
      const ring=new THREE.Mesh(geometry,new THREE.MeshPhongMaterial({map:index===5?this.ringMap??null:null,color:index===5?0xe3d5b9:0x95c1c8,side:THREE.DoubleSide,transparent:true,opacity:index===5?.85:.22,depthWrite:false}));
      ring.rotation.set(1.13,0,.2);this.rings.add(ring);
    }
    this.rings.visible=true;this.theme='';
  }
  toggleMooncake(){this.mooncake=!this.mooncake;this.cake.visible=this.mooncake;this.body.visible=!this.mooncake;this.rings.visible=!this.mooncake;this.atmosphere.visible=!this.mooncake&&(this.index===2||this.index>=6);this.clouds.visible=!this.mooncake&&this.index===2&&!!this.clouds.material.alphaMap;this.cake.rotation.set(.12,.1,0);}
  render(x:number,y:number,radius:number,mix:number,dt:number,reduced:boolean,day:boolean,orbitMix:number){
    const size=Math.round(radius*4.5);
    if(size!==this.size){this.size=size;this.renderer?.setSize(size,size,false);this.canvas.style.width=`${size}px`;this.canvas.style.height=`${size}px`;}
    this.canvas.style.left=`${x}px`;this.canvas.style.top=`${y}px`;this.canvas.style.opacity=String(mix);
    if(!this.available||mix<.001)return;
    const theme=day?'day':'night';
    if(theme!==this.theme){this.theme=theme;this.dayUniform.value=day?1:0;this.ambient.intensity=day?1.15:.72;this.sun.intensity=day?2.6:2.35;this.material.emissiveIntensity=this.index===2?(day?.35:.85):0;}
    if(!reduced){this.rotation+=dt*.035;this.body.rotation.y+=dt*.035;this.clouds.rotation.y=this.body.rotation.y+this.rotation*.08;this.cake.rotation.y+=dt*.035;this.orbitAngle+=dt*.11;}
    this.orbitGroup.visible=orbitMix>.001;
    this.orbitSprites.forEach((sprite,i)=>{
      const a=i/this.orbitSprites.length*Math.PI*2+this.orbitAngle;
      sprite.position.set(Math.cos(a)*1.72,Math.sin(a)*1.72,0);
      sprite.material.opacity=orbitMix;
      sprite.scale.setScalar(.29*(.6+.4*orbitMix));
    });
    this.renderer!.render(this.scene,this.camera);
  }
  get available(){return !!this.renderer&&!this.lost;}
  get diagnostics(){
    const depths=this.orbitSprites.map(s=>s.getWorldPosition(new THREE.Vector3()).z);
    return {renderer:this.available?'threejs':'fallback',name:this.mooncake?'Mooncake':planetNames[this.index],index:this.index,rotation:this.rotation,ready:!!this.night,loadedSurfaces:this.textures.filter(Boolean).length,mooncake:this.mooncake,orbitAngle:this.orbitAngle,orbitCount:this.orbitSprites.length,orbitDepth:[Math.min(...depths),Math.max(...depths)],depthTest:this.orbitSprites.every(s=>s.material.depthTest)};
  }
}
