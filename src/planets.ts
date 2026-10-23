import * as THREE from 'three';
import { floatingCoversReady, onFloatingCovers, coverDiagnostics } from './assets';
import type { ParticleFrame } from './scene';
import { createFootball, footballEditions, footballPlayOrder } from './football';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadStickers, pickStickerCategory, stickerCount, type StickerPools } from './stickers';
import { portraitOrbit, orbitApproach, PORTRAIT_LAYER } from './portrait-orbit';
import { FootballTransition, createFootballParticles, prepareDissolve, prepareFootballSurface } from './football-transition';
import { FluidGlass } from './fluid-glass';

export const planetNames=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune','Moon','Sun'];
const maps=['mercury','venus_surface','earth_daymap','mars','jupiter','saturn','uranus','neptune','moon','sun'];
type Mode='planet'|'football';
type Burst={sprite:THREE.Sprite;origin:THREE.Vector3;offset:THREE.Vector3;size:THREE.Vector3;age:number;life:number;spin:number;lift:number};
const smooth=(x:number)=>x*x*(3-2*x);

export class Planets {
  private renderer?:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(-2.25,2.25,2.25,-2.25,.1,30);
  private material=new THREE.MeshPhongMaterial({shininess:10,specular:0x18212b});
  private body=new THREE.Mesh(new THREE.SphereGeometry(1,80,56),this.material);
  private group=new THREE.Group();
  private glass=new FluidGlass();
  private rings=new THREE.Group();
  private orbitSprites:THREE.Sprite[]=[];
  private naturalMaps:THREE.Texture[]=[];
  private pendingCovers=new Map<number,THREE.Texture>();
  private coverSwapAges:number[]=Array(20).fill(1);
  private charmMaps:StickerPools={planet:[],stranger:[],football:[]};
  private ambient=new THREE.HemisphereLight(0xdde6ef,0x29292f,1.15);
  private light=new THREE.DirectionalLight(0xfff3e1,2.5);
  private atmosphere:THREE.Mesh;
  private clouds=new THREE.Mesh(new THREE.SphereGeometry(1.006,64,40),new THREE.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.38,depthWrite:false,shininess:0}));
  private textures:(THREE.Texture|undefined)[]=Array(maps.length);
  private night?:THREE.Texture;
  private normal?:THREE.Texture;
  private specular?:THREE.Texture;
  private ringMap?:THREE.Texture;
  private index=2;
  private planetCache=new Map<number,{material:THREE.MeshPhongMaterial;rings:THREE.Object3D[]}>();
  private warmedPlanets=new Set<number>();
  private rotation=0;
  private orbitAngle=.55;
  private lost=false;
  private viewport='';
  private mode:Mode='planet';
  private keepsake?:THREE.Group;
  private footballIndex=footballPlayOrder[0];
  private footballCursor=-1;
  private footballTransition?:FootballTransition;
  private footballPoints=createFootballParticles();
  private footballCache=new Map<number,THREE.Group>();
  private footballWarming=new Map<number,Promise<THREE.Group>>();
  private particlesWarmed=false;
  private quietUntil=0;
  private warmTimer:ReturnType<typeof setTimeout>|undefined;
  private retired=new Set<THREE.Group>();
  private maintenance={builds:0,disposals:0,workDuringTransition:0};
  private pendingFootball=false;
  private footballRequest=0;
  private lastFootballClickMs=0;
  private targetFootballIndex=0;
  private queuedFootball=false;
  private surfaceMix=0;
  private earthUniform={value:1};
  private bursts:Burst[]=[];
  private lastBurst: {count:number;categories:string[];distances:number[]}|null=null;
  private orbitMix=0;
  private raycaster=new THREE.Raycaster();
  private orbitalPosition=new THREE.Vector3();
  private naturalPosition=new THREE.Vector3();
  readonly canvas=document.createElement('canvas');
  readonly ready:Promise<unknown>;

  constructor(){
    this.canvas.id='planet-scene';this.canvas.setAttribute('aria-hidden','true');
    document.querySelector('#scene')!.after(this.canvas);
    this.camera.layers.enable(PORTRAIT_LAYER);this.raycaster.layers.enable(PORTRAIT_LAYER);
    this.camera.position.z=10;this.light.position.set(-3.2,2.1,4.5);
    const rim=new THREE.DirectionalLight(0xb8d7ff,.8);rim.position.set(3,1,-2);
    this.group.rotation.z=.12;this.group.add(this.body,this.rings);
    this.scene.add(this.group,this.ambient,this.light,rim,this.glass.mesh);
    this.atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.015,48,32),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{opacity:{value:1}},
      vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
      fragmentShader:`uniform float opacity;varying vec3 n;varying vec3 v;void main(){float rim=pow(1.-max(dot(normalize(n),normalize(v)),0.),4.);gl_FragColor=vec4(.22,.46,.8,rim*.18*opacity);}`
    }));this.group.add(this.atmosphere,this.clouds);
    this.material.onBeforeCompile=shader=>{
      shader.uniforms.isEarth=this.earthUniform;
      shader.fragmentShader='uniform float isEarth;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
        float sunlight=dot(normalize(normal),normalize(vec3(-3.2,2.1,4.5)));
        totalEmissiveRadiance*=mix(1.,1.-smoothstep(-.2,.4,sunlight),isEarth);`);
    };
    try{this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;}catch{this.canvas.hidden=true;}
    // Preserve the current football's studio reflections; Phong planets keep their original lighting.
    if(this.renderer){const environment=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(this.renderer);this.scene.environment=pmrem.fromScene(environment,.05).texture;this.scene.environmentIntensity=.65;environment.dispose();pmrem.dispose();}
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.canvas.hidden=true;});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.canvas.hidden=false;});
    const loader=new THREE.TextureLoader();
    const load=async(path:string,color=true)=>{const t=await loader.loadAsync(path);if(color)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(this.renderer?.capabilities.getMaxAnisotropy()??1,4);return t;};
    this.ready=Promise.allSettled([
      ...maps.map(async(name,index)=>{this.textures[index]=await load(`/planets/${name}.jpg`);}),
      load('/planets/earth_nightmap.jpg').then(t=>this.night=t),load('/planets/earth-normal.jpg',false).then(t=>this.normal=t),load('/planets/earth-specular.jpg',false).then(t=>this.specular=t),
      load('/planets/earth_clouds.jpg',false).then(t=>{this.clouds.material.alphaMap=t;this.clouds.material.needsUpdate=true;}),load('/planets/saturn-ring.png').then(t=>this.ringMap=t),
      floatingCoversReady.then(({images})=>images.forEach((image,i)=>{
        const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;this.naturalMaps[i]=texture;
        const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,alphaTest:.04,toneMapped:false}));sprite.layers.set(PORTRAIT_LAYER);sprite.renderOrder=2;sprite.userData.particle=i;sprite.visible=false;this.scene.add(sprite);this.orbitSprites[i]=sprite;
      })),
      loadStickers().then(textures=>{this.charmMaps=textures;})
    ]).then(async()=>{
      this.select(this.index);
      // Upload the surfaces and compile before the opening finishes, not on the first tap.
      for(const t of this.textures)if(t)this.renderer?.initTexture(t);
      prepareDissolve(this.group);
      for(let index=0;index<this.textures.length;index++)if(this.textures[index]){
        this.select(index);prepareDissolve(this.group);
        prepareFootballSurface(this.body,this.textures[index]!);
        await this.warmPlanet();
      }
      this.select(2);
      await this.warmFootball(footballPlayOrder[0]);
      await this.warmFootball(footballPlayOrder[1]);
      await this.warmFootball(footballPlayOrder[2]);
    });this.select(2);
    onFloatingCovers(({images})=>{
      images.forEach((image,i)=>{
        if(this.naturalMaps[i]?.image===image||this.pendingCovers.get(i)?.image===image)return;
        this.pendingCovers.get(i)?.dispose();
        const texture=new THREE.Texture(image);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
        this.renderer?.initTexture(texture);this.pendingCovers.set(i,texture);this.coverSwapAges[i]=0;
      });
    });
  }
  private updateSurface(){
    const earth=this.index===2,sun=this.index===9;this.material.map=this.textures[this.index]??null;this.material.color.set(0xffffff);
    this.material.normalMap=earth?this.normal??null:null;this.material.normalScale.set(.32,.32);this.material.specularMap=earth?this.specular??null:null;this.material.specular.set(earth?0x506070:0x101010);this.material.shininess=earth?18:4;
    this.material.emissiveMap=earth?this.night??null:sun?this.textures[9]??null:null;this.material.emissive.set(earth||sun?0xffffff:0x000000);this.earthUniform.value=earth?1:0;this.material.emissiveIntensity=sun?1:earth?.7:0;this.material.needsUpdate=true;
  }
  private disposeObject(object:THREE.Group){
    this.maintenance.disposals++;if(this.footballTransition)this.maintenance.workDuringTransition++;
    const disposed=new Set<unknown>();
    object.traverse(o=>{if(o instanceof THREE.Mesh){if(!disposed.has(o.geometry)){o.geometry.dispose();disposed.add(o.geometry);}for(const m of Array.isArray(o.material)?o.material:[o.material]){if(disposed.has(m))continue;disposed.add(m);Object.values(m).forEach(v=>{if(v instanceof THREE.Texture&&!disposed.has(v)){v.dispose();disposed.add(v);}});m.dispose();}}});object.removeFromParent();
  }
  private retire(object:THREE.Group){
    object.removeFromParent();this.retired.add(object);this.quietUntil=Math.max(this.quietUntil,performance.now()+1000);
    const drain=()=>{if(this.footballTransition||this.pendingFootball||performance.now()<this.quietUntil){setTimeout(drain,120);return;}if(this.retired.delete(object))this.disposeObject(object);};
    setTimeout(drain,1100);
  }
  private clearKeepsake(){if(this.keepsake)this.retire(this.keepsake);this.keepsake=undefined;}
  cancelFootball(){
    this.footballRequest++;this.pendingFootball=false;this.queuedFootball=false;
    if(!this.footballTransition)return;
    const target=this.footballTransition.target;this.footballTransition.dispose();this.footballTransition=undefined;this.retire(target);
  }
  private setMode(mode:Mode,prepared?:THREE.Group){
    this.cancelFootball();this.clearKeepsake();this.mode=mode;this.body.visible=mode==='planet';this.rings.visible=mode==='planet';this.atmosphere.visible=mode==='planet'&&[2,6,7].includes(this.index);this.clouds.visible=mode==='planet'&&this.index===2&&!!this.clouds.material.alphaMap;this.group.rotation.z=mode==='planet'?.12:.08;
    if(mode==='football')this.keepsake=prepared??createFootball(this.footballIndex);if(this.keepsake){prepareDissolve(this.keepsake);this.group.add(this.keepsake);}
  }
  select(index:number){
    if(this.index===index&&this.mode==='planet'&&this.planetCache.has(index))return;
    this.index=index;this.setMode('planet');this.earthUniform.value=index===2?1:0;
    this.rings.clear();
    const cached=this.planetCache.get(index);
    if(cached){
      this.material=cached.material;this.body.material=this.material;if(cached.rings.length)this.rings.add(...cached.rings);
    }else{
      // Keep each surface and its ring geometry alive: a hidden selection only
      // swaps prepared references, never edits a material already on screen.
      const previous=this.material;this.material=previous.clone();this.material.onBeforeCompile=previous.onBeforeCompile;
      this.body.material=this.material;this.updateSurface();
      if(index===5||index===6){const geometry=new THREE.RingGeometry(1.2,index===5?1.95:1.65,128);const uv=geometry.attributes.uv,position=geometry.attributes.position;for(let i=0;i<uv.count;i++){const r=Math.hypot(position.getX(i),position.getY(i));uv.setXY(i,(r-1.2)/(index===5?.75:.45),.5);}const ring=new THREE.Mesh(geometry,new THREE.MeshPhongMaterial({map:index===5?this.ringMap??null:null,color:index===5?0xe3d5b9:0x95c1c8,side:THREE.DoubleSide,transparent:true,opacity:index===5?.85:.22,depthWrite:false}));ring.rotation.set(1.13,0,.2);this.rings.add(ring);}
      if(this.textures[index])this.planetCache.set(index,{material:this.material,rings:[...this.rings.children]});
      if(![...this.planetCache.values()].some(p=>p.material===previous))previous.dispose();
    }
    this.body.rotation.set(0,this.rotation+(index===2?2.4:0),0);
  }
  private async warmPlanet(){
    const renderer=this.renderer;if(!renderer)return;
    const camera=new THREE.OrthographicCamera(-2.6,2.6,2.6,-2.6,.1,30);camera.position.z=10;
    const previous=renderer.getRenderTarget();
    renderer.setRenderTarget(null);const screen=renderer.compileAsync(this.scene,camera);renderer.setRenderTarget(previous);await screen;
    const buffer=new THREE.WebGLRenderTarget(16,16,{type:THREE.HalfFloatType,samples:4});
    renderer.setRenderTarget(buffer);const capture=renderer.compileAsync(this.scene,camera);renderer.setRenderTarget(previous);await capture;
    try{renderer.setRenderTarget(buffer);renderer.render(this.scene,camera);}
    finally{renderer.setRenderTarget(previous);buffer.dispose();}
    this.warmedPlanets.add(this.index);
  }
  private async warmFootball(index:number):Promise<THREE.Group>{
    const cached=this.footballCache.get(index);if(cached)return cached;
    const pending=this.footballWarming.get(index);if(pending)return pending;
    const breathe=()=>new Promise<void>(resolve=>{
      // An idle callback alone can still run in the middle of the closing morph.
      const attempt=()=>{
        if(this.footballTransition||performance.now()<this.quietUntil){setTimeout(attempt,100);return;}
        if('requestIdleCallback' in window)window.requestIdleCallback(()=>{
          if(this.footballTransition||performance.now()<this.quietUntil){setTimeout(attempt,100);return;}resolve();
        },{timeout:500});else setTimeout(()=>{if(this.footballTransition)attempt();else resolve();},16);
      };attempt();
    });
    const task=(async()=>{
      await breathe();this.maintenance.builds++;if(this.footballTransition)this.maintenance.workDuringTransition++;const target=createFootball(index);prepareDissolve(target);
      await breathe();prepareFootballSurface(target);
      if(this.renderer){
        const warmScene=new THREE.Scene();warmScene.environment=this.scene.environment;warmScene.environmentIntensity=this.scene.environmentIntensity;
        this.scene.children.filter(o=>o instanceof THREE.Light).forEach(o=>warmScene.add(o.clone()));warmScene.add(target);
        const warmParticles=!this.particlesWarmed;
        if(warmParticles){
          warmScene.add(this.footballPoints);
          // Avatars enter the glass capture during the first morph too.
          // Warm their linear-color sprite shader and upload every portrait texture.
          this.orbitSprites.forEach(sprite=>{const copy=sprite.clone();copy.visible=true;warmScene.add(copy);});
        }
        const camera=new THREE.OrthographicCamera(-2.6,2.6,2.6,-2.6,.1,30);camera.position.z=10;camera.layers.enable(PORTRAIT_LAYER);
        const renderer=this.renderer,previous=renderer.getRenderTarget();
        // Compile both the screen and the half-float glass capture variants.
        renderer.setRenderTarget(null);
        const screenReady=renderer.compileAsync(warmScene,camera);
        renderer.setRenderTarget(previous);await screenReady;
        const buffer=new THREE.WebGLRenderTarget(16,16,{type:THREE.HalfFloatType,samples:4});
        renderer.setRenderTarget(buffer);
        const captureReady=renderer.compileAsync(warmScene,camera);
        renderer.setRenderTarget(previous);await captureReady;
        await breathe();
        renderer.setRenderTarget(buffer);renderer.render(warmScene,camera);
        // Issue actual screen draw calls as well, without altering any screen pixels.
        // This uploads buffers / VAOs before the first user-triggered particle frame.
        const states=new Map<THREE.Material,{colorWrite:boolean;depthWrite:boolean}>();
        warmScene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points){
          for(const m of Array.isArray(o.material)?o.material:[o.material])if(!states.has(m)){
            states.set(m,{colorWrite:m.colorWrite,depthWrite:m.depthWrite});m.colorWrite=false;m.depthWrite=false;
          }
        }});
        const autoClear=renderer.autoClear;renderer.autoClear=false;
        try{renderer.setRenderTarget(null);renderer.render(warmScene,camera);}
        finally{states.forEach((state,m)=>Object.assign(m,state));renderer.autoClear=autoClear;renderer.setRenderTarget(previous);buffer.dispose();}
        target.removeFromParent();if(warmParticles){this.footballPoints.removeFromParent();this.particlesWarmed=true;}
      }
      this.footballCache.set(index,target);this.footballWarming.delete(index);
      while(this.footballCache.size>3){const oldest=this.footballCache.keys().next().value!;this.retire(this.footballCache.get(oldest)!);this.footballCache.delete(oldest);}
      return target;
    })();this.footballWarming.set(index,task);return task;
  }
  private warmAhead(){
    clearTimeout(this.warmTimer);this.quietUntil=Math.max(this.quietUntil,performance.now()+1000);
    this.warmTimer=setTimeout(()=>{
      const next=footballPlayOrder[(this.footballCursor+1)%footballPlayOrder.length],after=footballPlayOrder[(this.footballCursor+2)%footballPlayOrder.length];
      void this.warmFootball(next).then(()=>this.warmFootball(after));
    },1050);
  }
  nextFootball(reduced=false){
    const started=performance.now();clearTimeout(this.warmTimer);
    if(this.footballTransition||this.pendingFootball){this.queuedFootball=true;return;}
    const index=footballPlayOrder[(this.footballCursor+1)%footballPlayOrder.length];
    if(reduced||!this.available){this.footballIndex=index;this.footballCursor=footballPlayOrder.indexOf(index);const target=this.footballCache.get(index);this.footballCache.delete(index);this.setMode('football',target);return;}
    const request=++this.footballRequest;
    const begin=(target:THREE.Group)=>{
      if(request!==this.footballRequest)return;
      this.pendingFootball=false;this.footballCache.delete(index);this.targetFootballIndex=index;
      this.footballTransition=new FootballTransition(this.group,target,this.footballPoints,this.keepsake??this.body);
    };
    const target=this.footballCache.get(index);
    if(target)begin(target);else{this.pendingFootball=true;void this.warmFootball(index).then(begin);}
    this.lastFootballClickMs=performance.now()-started;
  }
  hitParticle(x:number,y:number){
    if(!this.available)return null;const rect=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),this.camera);
    const objects:THREE.Object3D[]=[...this.orbitSprites.filter(s=>s.visible),...this.group.children.filter(s=>s.visible),...(this.glass.mesh.visible?[this.glass.mesh]:[])];const hit=this.raycaster.intersectObjects(objects,true).find(h=>h.object.visible);
    return hit?.object instanceof THREE.Sprite&&typeof hit.object.userData.particle==='number'?hit.object.userData.particle as number:null;
  }
  celebrate(index:number,reduced:boolean){
    const origin=this.orbitSprites[index];if(!origin||!this.charmMaps.football.length)return;origin.userData.pop=1;
    const count=stickerCount(),categories:string[]=[],distances:number[]=[],endpoints:THREE.Vector3[]=[];
    while(this.bursts.length+count>40)this.removeBurst(this.bursts[0]);
    const used=new Set<THREE.Texture>(),mode=this.footballTransition?.diagnostics.targetVisible?'football':this.mode;
    for(let i=0;i<count;i++){
      const category=pickStickerCategory(mode),pool=this.charmMaps[category].filter(t=>!used.has(t));
      const choices=pool.length?pool:this.charmMaps.football,map=choices[Math.floor(Math.random()*choices.length)];used.add(map);categories.push(category);
      const material=new THREE.SpriteMaterial({map,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,rotation:(Math.random()-.5)*.32});
      const sprite=new THREE.Sprite(material);sprite.layers.set(PORTRAIT_LAYER);sprite.renderOrder=3;
      const from=origin.position.clone();from.z=3;
      const margin=.42,offset=new THREE.Vector3();let best=-Infinity;
      // Rejection sampling avoids off-screen directions and nearly identical paths.
      for(let attempt=0;attempt<48;attempt++){
        const angle=Math.random()*Math.PI*2,distance=1.95+Math.random()*1.85;
        const dx=Math.cos(angle)*distance,dy=Math.sin(angle)*distance;
        const tx=from.x+dx,ty=from.y+dy;
        if(tx<this.camera.left+margin||tx>this.camera.right-margin||ty<this.camera.bottom+margin||ty>this.camera.top-margin-.7)continue;
        const separation=endpoints.length?Math.min(...endpoints.map(p=>Math.hypot(tx-p.x,ty-p.y))):2;
        if(separation>best){best=separation;offset.set(dx,dy,0);}if(separation>.9)break;
      }
      if(best===-Infinity){offset.set(-from.x*.6,1.8,0);}
      endpoints.push(from.clone().add(offset));
      const aspect=map.userData.aspect as number,size=.44+Math.random()*.24;
      const scale=new THREE.Vector3(size*Math.min(1,aspect),size/Math.max(1,aspect),1);
      sprite.position.copy(from);sprite.scale.setScalar(.001);sprite.material.opacity=0;this.scene.add(sprite);distances.push(offset.length());
      this.bursts.push({sprite,origin:from,offset,size:scale,age:reduced?0:-Math.random()*.085,life:reduced?1.5:2.35+Math.random()*.55,spin:reduced?0:(Math.random()-.5)*1.6,lift:.25+Math.random()*.45});
    }
    this.lastBurst={count,categories,distances};
  }
  private removeBurst(b:Burst){this.scene.remove(b.sprite);b.sprite.material.dispose();this.bursts.splice(this.bursts.indexOf(b),1);}
  render(x:number,y:number,radius:number,mix:number,dt:number,reduced:boolean,day:boolean,orbitMix:number,particles:ParticleFrame[],dragging=false){
    const w=this.canvas.parentElement!.clientWidth,h=this.canvas.parentElement!.clientHeight;this.orbitMix=orbitMix;this.surfaceMix=mix;
    if(this.viewport!==`${w}/${h}`){this.viewport=`${w}/${h}`;this.renderer?.setSize(w,h,false);}
    this.camera.left=-w/(2*radius);this.camera.right=w/(2*radius);this.camera.top=h/(2*radius);this.camera.bottom=-h/(2*radius);this.camera.updateProjectionMatrix();this.group.position.set((x-w/2)/radius,(h/2-y)/radius,0);this.group.visible=mix>0;this.group.scale.setScalar(1);this.canvas.style.opacity=String(mix);
    if(!this.available)return;
    const completed=this.footballTransition?.tick(dt,radius,this.renderer!.getPixelRatio(),reduced);
    const landing=this.mode==='football'?1:this.footballTransition?.landingMix??0;
    this.ambient.intensity=THREE.MathUtils.lerp(day?1.15:.72,day?1.4:1.1,landing);
    this.light.intensity=THREE.MathUtils.lerp(day?2.6:2.35,day?3.1:2.8,landing);
    this.group.rotation.z=THREE.MathUtils.lerp(.12,.08,landing);this.scene.environmentIntensity=day?.7:.58;if(this.index===2)this.material.emissiveIntensity=day?.35:.85;
    if(!reduced){this.rotation+=dt*.045;if(!this.footballTransition)this.body.rotation.y+=dt*.045;this.clouds.rotation.y=this.body.rotation.y+this.rotation*.08;this.rings.rotation.y+=dt*.008;this.orbitAngle+=dt*.11;const rotating=this.keepsake?.userData.rotating??this.keepsake;if(rotating&&!this.footballTransition)rotating.rotation.y+=dt*.08;}
    if(!this.footballTransition)this.rings.children.forEach(c=>{(c as THREE.Mesh<THREE.RingGeometry,THREE.MeshPhongMaterial>).material.opacity=(this.index===5?.85:.22)*(1-smooth(Math.min(1,orbitMix*2)));});
    const coverOpacity=this.coverSwapAges.map((age,i)=>{
      age=this.coverSwapAges[i]=Math.min(1,age+dt);
      const pending=this.pendingCovers.get(i);
      if(pending&&age>=.3){const old=this.naturalMaps[i];this.naturalMaps[i]=pending;this.orbitSprites[i].material.map=pending;this.pendingCovers.delete(i);old?.dispose();}
      return age<.3?1-smooth(age/.3):smooth(Math.min(1,(age-.3)/.3));
    });
    const count=this.orbitSprites.length,blend=smooth(orbitMix);
    this.orbitSprites.forEach((sprite,i)=>{const p=particles[i],slot=portraitOrbit(i/count*Math.PI*2+this.orbitAngle);const orbital=this.orbitalPosition.set(slot.x,slot.y,slot.z);const natural=this.naturalPosition.set(((p?.x??x)-w/2)/radius,(h/2-(p?.y??y))/radius,-2).sub(this.group.position);
      // Keep one sprite on a continuous exterior arc for both gathering and release.
      orbitApproach(natural,orbital,blend,sprite.position).add(this.group.position);sprite.visible=i<count&&mix>.5&&((!!p?.visible&&!reduced)||orbitMix>.005);sprite.material.opacity=(coverOpacity[i]??1)*THREE.MathUtils.lerp(p?.opacity??0,1,blend);sprite.userData.pop=Math.max(0,(sprite.userData.pop??0)-dt*1.8);const pop=1+Math.sin((sprite.userData.pop??0)*Math.PI)*.3;const size=THREE.MathUtils.lerp((p?.visible?p.size:0)/radius,slot.size,blend);sprite.scale.setScalar(Math.max(.001,size)*pop);
    });
    for(const b of [...this.bursts]){
      b.age+=dt;if(b.age<0)continue;if(b.age>b.life){this.removeBurst(b);continue;}
      const t=THREE.MathUtils.clamp(b.age/b.life,0,1),travel=reduced?1:(1-Math.exp(-1.4*t))/(1-Math.exp(-1.4)),enter=reduced?1:smooth(Math.min(1,b.age/.12));
      b.sprite.position.copy(b.origin).addScaledVector(b.offset,travel);
      if(!reduced)b.sprite.position.y+=4*b.lift*t*(1-t);
      b.sprite.scale.copy(b.size).multiplyScalar(enter);b.sprite.material.rotation+=dt*b.spin;
      b.sprite.material.opacity=enter*(1-smooth(Math.max(0,(b.age/b.life-.72)/.28)));
    }
    if(completed&&this.footballTransition){
      const transition=this.footballTransition,queued=this.queuedFootball;transition.dispose();this.footballTransition=undefined;this.footballIndex=this.targetFootballIndex;this.footballCursor=footballPlayOrder.indexOf(this.footballIndex);this.setMode('football',transition.target);this.warmAhead();if(queued&&!reduced)this.nextFootball();
    }
    // The glass follows the very same dissolve envelope as the solid surface;
    // no shell remains during the particle-only part of a football change.
    const glassPresence=this.footballTransition?.surfacePresence??1;
    this.glass.update(this.group,x,y,radius,dt,reduced,dragging,day,mix>.001?glassPresence:0);
    this.scene.updateMatrixWorld();if(mix>.001)this.glass.render(this.renderer!,this.scene,this.camera);
  }
  get available(){return !!this.renderer&&!this.lost;}
  get objectName(){const edition=footballEditions[this.footballIndex];return this.mode==='planet'?planetNames[this.index]:`${edition.year} ${edition.name}`;}
  get diagnostics(){const visible=this.orbitSprites.filter(s=>s.visible),depths=visible.map(s=>s.position.z);return {covers:coverDiagnostics(),renderer:this.available?'threejs':'fallback',name:this.objectName,mode:this.mode,index:this.index,rotation:this.rotation,ready:!!this.night,loadedSurfaces:this.textures.filter(Boolean).length,modelStyle:'textured',warmedPlanets:[...this.warmedPlanets],surfaceTexture:(this.material.map?.image as HTMLImageElement|undefined)?.src?.split('/').pop()??null,glass:this.glass.diagnostics,footballYears:footballPlayOrder.map(i=>footballEditions[i].year),orbitAngle:this.orbitAngle,orbitCount:visible.length,orbitDepth:[Math.min(...depths),Math.max(...depths)],depthTest:this.orbitSprites.every(s=>s.material.depthTest),orbitMix:this.orbitMix,footballCount:footballEditions.length,bursts:this.bursts.length,stickersLoaded:Object.values(this.charmMaps).reduce((n,p)=>n+p.length,0),stickerPools:Object.fromEntries(Object.entries(this.charmMaps).map(([k,v])=>[k,v.length])),lastBurst:this.lastBurst,stickerMotion:this.bursts.map(b=>({age:b.age,life:b.life,x:b.sprite.position.x,y:b.sprite.position.y,opacity:b.sprite.material.opacity})),orbitPortraits:visible.map(s=>({x:s.position.x-this.group.position.x,y:s.position.y-this.group.position.y,z:s.position.z,size:s.scale.x})),surfaceMix:this.surfaceMix,surfaceScale:this.group.scale.x,footballTransition:this.footballTransition?.diagnostics??null,pendingFootball:this.pendingFootball,footballCache:this.footballCache.size,lastFootballClickMs:this.lastFootballClickMs,maintenance:{...this.maintenance},renderPose:{targetWorld:(this.footballTransition?.target??this.keepsake)?.matrixWorld.elements.slice()??null,ambient:this.ambient.intensity,light:this.light.intensity,tilt:this.group.rotation.z},shaderPrograms:this.renderer?.info.programs?.length,particlePositions:visible.slice(0,3).map(s=>({x:s.position.x,y:s.position.y,z:s.position.z,opacity:s.material.opacity}))};}
}
