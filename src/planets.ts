import * as THREE from 'three';
import { bubbleImages } from './assets';
import type { ParticleFrame } from './scene';
import { createFootball, footballEditions, footballPlayOrder } from './football';
import { createToyPlanet, prepareToyPlanets } from './toy-planets';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadStickers } from './stickers';
import { portraitOrbit } from './portrait-orbit';
import { FootballTransition } from './football-transition';

export const planetNames=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Moon','Sun'];
type Mode='planet'|'football';
type Burst={sprite:THREE.Sprite;velocity:THREE.Vector3;age:number;life:number};
const smooth=(x:number)=>x*x*(3-2*x);

export class Planets {
  private renderer?:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(-2.25,2.25,2.25,-2.25,.1,30);
  private toy=new THREE.Group();
  private modelsReady=false;
  private group=new THREE.Group();
  private orbitSprites:THREE.Sprite[]=[];
  private naturalMaps:THREE.Texture[]=[];
  private charmMaps:THREE.Texture[]=[];
  private ambient=new THREE.HemisphereLight(0xdde6ef,0x29292f,1.15);
  private light=new THREE.DirectionalLight(0xfff3e1,2.5);
  private atmosphere:THREE.Mesh;
  private index=2;
  private rotation=0;
  private orbitAngle=.55;
  private lost=false;
  private viewport='';
  private mode:Mode='planet';
  private keepsake?:THREE.Group;
  private footballIndex=footballPlayOrder[0];
  private footballCursor=-1;
  private footballTransition?:FootballTransition;
  private targetFootballIndex=0;
  private queuedFootball=false;
  private surfaceMix=0;
  private bursts:Burst[]=[];
  private stickerCursor=0;
  private orbitMix=0;
  private raycaster=new THREE.Raycaster();
  readonly canvas=document.createElement('canvas');
  readonly ready:Promise<unknown>;

  constructor(){
    this.canvas.id='planet-scene';this.canvas.setAttribute('aria-hidden','true');
    document.querySelector('#scene')!.after(this.canvas);
    this.camera.position.z=10;this.light.position.set(-3.2,2.1,4.5);
    const rim=new THREE.DirectionalLight(0xb8d7ff,.8);rim.position.set(3,1,-2);
    this.group.rotation.z=.12;this.group.add(this.toy);
    this.scene.add(this.group,this.ambient,this.light,rim);
    this.atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.015,48,32),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:1},tint:{value:new THREE.Color(.22,.46,.8)}},
      vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform float opacity;uniform vec3 tint;varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-max(dot(normalize(n),normalize(v)),0.),4.);gl_FragColor=vec4(tint,rim*.18*opacity);}`
    }));this.group.add(this.atmosphere);
    try{this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;}catch{this.canvas.hidden=true;}
    if(this.renderer){const environment=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(environment,.05).texture;this.scene.environmentIntensity=.65;environment.dispose();pmrem.dispose();}
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.canvas.hidden=true;});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.canvas.hidden=false;});
    const loader=new THREE.TextureLoader();
    const load=async(path:string,color=true)=>{const t=await loader.loadAsync(path);if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(this.renderer?.capabilities.getMaxAnisotropy()??1,4);return t;};
    this.ready=Promise.allSettled([
      prepareToyPlanets().then(()=>{this.modelsReady=true;}),
      ...bubbleImages.slice(0,20).map(async(path,i)=>{const texture=await load(path);this.naturalMaps[i]=texture;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,alphaTest:.04,toneMapped:false}));sprite.userData.particle=i;sprite.visible=false;this.scene.add(sprite);this.orbitSprites[i]=sprite;}),
      loadStickers().then(textures=>{this.charmMaps=textures;})
    ]).then(async()=>{
      this.select(this.index);
      // Upload the surfaces and compile before the opening finishes, not on the first tap.

      if(this.renderer)await this.renderer.compileAsync(this.scene,this.camera);
    });this.select(2);
  }
  private disposeObject(object:THREE.Group){
    const disposed=new Set<unknown>();
    object.traverse(o=>{if(o instanceof THREE.Mesh){if(!disposed.has(o.geometry)){o.geometry.dispose();disposed.add(o.geometry);}for(const m of Array.isArray(o.material)?o.material:[o.material]){if(disposed.has(m))continue;disposed.add(m);Object.values(m).forEach(v=>{if(v instanceof THREE.Texture&&!disposed.has(v)){v.dispose();disposed.add(v);}});m.dispose();}}});object.removeFromParent();
  }
  private clearKeepsake(){if(this.keepsake)this.disposeObject(this.keepsake);this.keepsake=undefined;}
  cancelFootball(){
    this.queuedFootball=false;
    if(!this.footballTransition)return;
    const target=this.footballTransition.target;this.footballTransition.dispose();this.footballTransition=undefined;this.disposeObject(target);
  }
  private setMode(mode:Mode,prepared?:THREE.Group){
    this.cancelFootball();this.clearKeepsake();this.mode=mode;this.toy.visible=mode==='planet';this.atmosphere.visible=mode==='planet'&&[2,6,7,9].includes(this.index);this.group.rotation.z=.08;
    if(mode==='football')this.keepsake=prepared??createFootball(this.footballIndex);if(this.keepsake)this.group.add(this.keepsake);
  }
  select(index:number){
    this.index=index;this.setMode('planet');(this.atmosphere.material as THREE.ShaderMaterial).uniforms.tint.value.setRGB(...(index===9?[1,.55,.12]:[.22,.46,.8]) as [number,number,number]);this.disposeObject(this.toy);this.toy=createToyPlanet(index);this.toy.rotation.y+=this.rotation;this.group.add(this.toy);
  }
  nextFootball(reduced=false){
    if(this.footballTransition){this.queuedFootball=true;return;}
    const index=footballPlayOrder[(this.footballCursor+1)%footballPlayOrder.length];
    if(reduced||!this.available){this.footballIndex=index;this.footballCursor=footballPlayOrder.indexOf(index);this.setMode('football');return;}
    this.targetFootballIndex=index;this.footballTransition=new FootballTransition(this.group,createFootball(index));
  }
  hitParticle(x:number,y:number){
    if(!this.available)return null;const rect=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),this.camera);
    const objects:THREE.Object3D[]=[...this.orbitSprites.filter(s=>s.visible),...this.group.children.filter(s=>s.visible)];const hit=this.raycaster.intersectObjects(objects,true).find(h=>h.object.visible);
    return hit?.object instanceof THREE.Sprite&&typeof hit.object.userData.particle==='number'?hit.object.userData.particle as number:null;
  }
  celebrate(index:number,reduced:boolean){
    const origin=this.orbitSprites[index];if(!origin||!this.charmMaps.length)return;origin.userData.pop=1;
    const count=reduced?1:5;
    while(this.bursts.length+count>40)this.removeBurst(this.bursts[0]);
    for(let i=0;i<count;i++){
      const map=this.charmMaps[this.stickerCursor++%this.charmMaps.length];
      const material=new THREE.SpriteMaterial({map,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,rotation:(i-2)*.08});
      const sprite=new THREE.Sprite(material);sprite.position.copy(origin.position);sprite.position.z=3;
      const aspect=map.userData.aspect as number,size=i===0?.84:.65;
      sprite.scale.set(size*Math.min(1,aspect),size/Math.max(1,aspect),1);
      this.scene.add(sprite);const a=-Math.PI*.8+i/(count-1||1)*Math.PI*.6;
      this.bursts.push({sprite,velocity:new THREE.Vector3(Math.cos(a)*1.05,.95+Math.sin(i/count*Math.PI)*.65,0),age:0,life:reduced?1:2.9});
    }
  }
  private removeBurst(b:Burst){this.scene.remove(b.sprite);b.sprite.material.dispose();this.bursts.splice(this.bursts.indexOf(b),1);}
  render(x:number,y:number,radius:number,mix:number,dt:number,reduced:boolean,day:boolean,orbitMix:number,particles:ParticleFrame[]){
    const w=this.canvas.parentElement!.clientWidth,h=this.canvas.parentElement!.clientHeight;this.orbitMix=orbitMix;this.surfaceMix=mix;
    if(this.viewport!==`${w}/${h}`){this.viewport=`${w}/${h}`;this.renderer?.setSize(w,h,false);}
    this.camera.left=-w/(2*radius);this.camera.right=w/(2*radius);this.camera.top=h/(2*radius);this.camera.bottom=-h/(2*radius);this.camera.updateProjectionMatrix();this.group.position.set((x-w/2)/radius,(h/2-y)/radius,0);this.group.visible=mix>0;this.group.scale.setScalar(1);this.canvas.style.opacity=String(mix);
    if(!this.available)return;this.ambient.intensity=day?1.4:1.1;this.light.intensity=day?3.1:2.8;this.scene.environmentIntensity=day?.7:.58;
    if(!reduced){this.rotation+=dt*.045;if(!this.footballTransition)this.toy.rotation.y+=dt*.045;const clouds=this.toy.userData.clouds as THREE.Group|undefined;if(clouds)clouds.rotation.y+=dt*.006;this.orbitAngle+=dt*.11;if(this.keepsake&&!this.footballTransition)this.keepsake.rotation.y+=dt*.08;}
    const rings=this.toy.userData.rings as THREE.Group|undefined;if(rings)rings.visible=orbitMix<.499;rings?.traverse(c=>{if(c instanceof THREE.Mesh)c.material.opacity=.94*(1-smooth(Math.min(1,orbitMix*2)));});
    const count=this.orbitSprites.length,blend=smooth(orbitMix);
    this.orbitSprites.forEach((sprite,i)=>{const p=particles[i],slot=portraitOrbit(i/count*Math.PI*2+this.orbitAngle);const orbital=new THREE.Vector3(slot.x,slot.y,slot.z).add(this.group.position);const natural=new THREE.Vector3(((p?.x??x)-w/2)/radius,(h/2-(p?.y??y))/radius,-2);
      // One persistent sprite on one continuous path, without fading to a duplicate.
      sprite.position.copy(natural.lerp(orbital,blend));sprite.visible=i<count&&mix>.5&&((!!p?.visible&&!reduced)||orbitMix>.005);sprite.material.opacity=1;sprite.userData.pop=Math.max(0,(sprite.userData.pop??0)-dt*1.8);const pop=1+Math.sin((sprite.userData.pop??0)*Math.PI)*.3;const size=THREE.MathUtils.lerp((p?.visible?p.size:0)/radius,slot.size,blend);sprite.scale.setScalar(Math.max(.001,size)*pop);
    });
    for(const b of [...this.bursts]){b.age+=dt;if(b.age>b.life){this.removeBurst(b);continue;}if(!reduced){b.velocity.y-=dt*.9;b.sprite.position.addScaledVector(b.velocity,dt);b.sprite.material.rotation+=dt*.1;}b.sprite.material.opacity=1-smooth(Math.max(0,(b.age/b.life-.65)/.35));}
    if(this.footballTransition?.tick(dt,radius,this.renderer!.getPixelRatio(),reduced)){
      const transition=this.footballTransition,queued=this.queuedFootball;transition.dispose();this.footballTransition=undefined;this.footballIndex=this.targetFootballIndex;this.footballCursor=footballPlayOrder.indexOf(this.footballIndex);this.setMode('football',transition.target);if(queued&&!reduced)this.nextFootball();
    }
    this.scene.updateMatrixWorld();this.renderer!.render(this.scene,this.camera);
  }
  get available(){return !!this.renderer&&!this.lost;}
  get objectName(){const edition=footballEditions[this.footballIndex];return this.mode==='planet'?planetNames[this.index]:`${edition.year} ${edition.name}`;}
  get diagnostics(){const visible=this.orbitSprites.filter(s=>s.visible),depths=visible.map(s=>s.position.z);return {renderer:this.available?'threejs':'fallback',name:this.objectName,mode:this.mode,index:this.index,rotation:this.rotation,ready:this.modelsReady,loadedSurfaces:this.modelsReady?planetNames.length:0,modelStyle:this.toy.userData.style,modelVertices:this.toy.userData.vertices,drawCalls:this.renderer?.info.render.calls,footballYears:footballPlayOrder.map(i=>footballEditions[i].year),orbitAngle:this.orbitAngle,orbitCount:visible.length,orbitDepth:[Math.min(...depths),Math.max(...depths)],depthTest:this.orbitSprites.every(s=>s.material.depthTest),orbitMix:this.orbitMix,footballCount:footballEditions.length,bursts:this.bursts.length,stickersLoaded:this.charmMaps.length,orbitPortraits:visible.map(s=>({x:s.position.x-this.group.position.x,y:s.position.y-this.group.position.y,z:s.position.z,size:s.scale.x})),surfaceMix:this.surfaceMix,surfaceScale:this.group.scale.x,footballTransition:this.footballTransition?.diagnostics??null,particlePositions:visible.slice(0,3).map(s=>({x:s.position.x,y:s.position.y,z:s.position.z,opacity:s.material.opacity}))};}
}
