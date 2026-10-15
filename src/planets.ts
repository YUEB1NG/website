import * as THREE from 'three';

export const planetNames=['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'];
const colors=['#aaa9b0','#e9c68e','#6eaad6','#d68c74','#dcc0a4','#e8d5a4','#a4d8da','#7196d9'];

/** A small, independent transparent render surface keeps the original glass intact. */
export class Planets {
  private renderer?:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(-1.9,1.9,1.9,-1.9,.1,20);
  private body=new THREE.Mesh(new THREE.SphereGeometry(1,64,40),new THREE.MeshStandardMaterial({roughness:.85}));
  private group=new THREE.Group();
  private rings=new THREE.Group();
  private eyes:THREE.Mesh[]=[];
  private faceInk=new THREE.MeshBasicMaterial({color:0x152537});
  private ambient=new THREE.HemisphereLight(0xd9ecff,0x243654,2);
  private sun=new THREE.DirectionalLight(0xffedd5,3);
  private textures:THREE.Texture[]=[];
  private night?:THREE.Texture;
  private index=2;
  private theme='';
  private earthTint={value:1};
  private rotation=0;
  private lost=false;
  private size=0;
  readonly canvas=document.createElement('canvas');
  readonly ready:Promise<void>;

  constructor(){
    this.canvas.id='planet-scene';this.canvas.setAttribute('aria-hidden','true');
    document.querySelector('#scene')!.after(this.canvas);
    this.camera.position.z=6;
    // Lift the dark photographic oceans into a soft painted globe, retaining
    // real coastlines and clouds underneath the physical lighting.
    this.body.material.onBeforeCompile=shader=>{
      shader.uniforms.earthTint=this.earthTint;
      shader.fragmentShader='uniform float earthTint;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        if(earthTint>.5) diffuseColor.rgb=mix(diffuseColor.rgb,
          sqrt(max(diffuseColor.rgb,vec3(0.)))*vec3(.7,1.,1.2)+vec3(.035,.07,.11),.72);`);
    };
    this.sun.position.set(-3,3,5);
    this.group.rotation.z=.12;
    this.group.add(this.body,this.rings);this.scene.add(this.group,this.ambient,this.sun);
    const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.018,48,32),new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,
      vertexShader:`varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
      fragmentShader:`varying vec3 n; varying vec3 v; void main(){float rim=pow(1.-max(dot(normalize(n),normalize(v)),0.),3.);gl_FragColor=vec4(.38,.66,.94,rim*.2);}`
    }));
    this.group.add(atmosphere);
    this.addFace();
    this.textures=colors.map((_,index)=>this.makeTexture(index));
    try{
      this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true,powerPreference:'low-power'});
      this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=THREE.SRGBColorSpace;
      this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    }catch{this.canvas.hidden=true;}
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.canvas.hidden=true;});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.canvas.hidden=false;});
    const loader=new THREE.TextureLoader();
    this.ready=Promise.allSettled([loader.loadAsync('/earth-day.jpg'),loader.loadAsync('/earth-night.jpg')]).then(results=>{
      if(results[0].status==='fulfilled'){this.textures[2].dispose();this.textures[2]=results[0].value;this.textures[2].colorSpace=THREE.SRGBColorSpace;}
      if(results[1].status==='fulfilled'){this.night=results[1].value;this.night.colorSpace=THREE.SRGBColorSpace;}
      this.select(2);
    });
    this.select(2);
  }
  private makeTexture(index:number){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=colors[index];ctx.fillRect(0,0,512,256);
    // Deterministic painted bands and craters; no flat emoji or random re-rendering.
    if(index>=4||index===1){
      for(let y=0;y<256;y+=2){
        const wave=Math.sin(y*.19)+Math.sin(y*.073+index)*.7;
        ctx.fillStyle=wave>0?`rgba(255,255,255,${Math.abs(wave)*.12})`:`rgba(83,59,61,${Math.abs(wave)*.11})`;
        ctx.beginPath();ctx.moveTo(0,y);
        for(let x=0;x<=512;x+=8)ctx.lineTo(x,y+Math.sin(x*.035+y*.2)*2);
        ctx.lineTo(512,y+4);ctx.lineTo(0,y+4);ctx.fill();
      }
      if(index===4){ctx.fillStyle='#bb8977';ctx.beginPath();ctx.ellipse(190,157,27,12,.08,0,Math.PI*2);ctx.fill();}
    }else if(index!==2){
      for(let i=0;i<65;i++){
        const x=(i*137.51)%512,y=(i*73.31)%256,r=3+(i*7.1)%13;
        ctx.fillStyle='rgba(55,42,48,.12)';ctx.beginPath();ctx.ellipse(x,y,r,r*.8,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=1;ctx.stroke();
      }
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  private addFace(){
    const ink=this.faceInk;
    for(const x of [-.25,.25]){
      const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,16,12),ink);eye.position.set(x,-.04,.974);eye.scale.y=1.3;
      this.group.add(eye);this.eyes.push(eye);
      const glint=new THREE.Mesh(new THREE.SphereGeometry(.013,10,8),new THREE.MeshBasicMaterial({color:0xffffff}));glint.position.set(x-.01,-.022,1.021);this.group.add(glint);
      const blush=new THREE.Mesh(new THREE.SphereGeometry(.09,16,12),new THREE.MeshBasicMaterial({color:0xe8a3b2,transparent:true,opacity:.68}));blush.position.set(x*1.6,-.18,.91);blush.scale.set(1,.45,.12);this.group.add(blush);
    }
    const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.085,-.17,.988),new THREE.Vector3(0,-.25,1.006),new THREE.Vector3(.085,-.17,.988));
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,16,.013,6,false),ink));
  }
  select(index:number){
    this.index=index;this.body.material.map=this.textures[index];
    this.earthTint.value=index===2?1:0;
    this.body.material.color.set(index===2?0xc4e2ff:0xffffff);
    this.body.material.emissiveMap=index===2?this.night??null:null;
    this.body.material.emissive.set(index===2?0xffffff:0x000000);
    this.body.material.needsUpdate=true;this.body.rotation.set(0,index===2?2.6:0,0);
    for(const child of [...this.rings.children]){const m=child as THREE.Mesh<THREE.RingGeometry,THREE.MeshStandardMaterial>;m.geometry.dispose();m.material.dispose();this.rings.remove(child);}
    if(index===5||index===6){
      const count=index===5?4:1;
      for(let i=0;i<count;i++){
        const ring=new THREE.Mesh(new THREE.RingGeometry(1.24+i*.10,1.31+i*.10,96),new THREE.MeshStandardMaterial({color:index===5?0xd3c1a4:0xb4d9de,side:THREE.DoubleSide,transparent:true,opacity:index===5?.8:.42,roughness:1}));
        ring.rotation.x=1.12;ring.rotation.y=.18;this.rings.add(ring);
      }
    }
    this.theme='';
  }
  render(x:number,y:number,radius:number,mix:number,dt:number,reduced:boolean,day:boolean){
    const size=Math.round(radius*3.8);
    if(size!==this.size){this.size=size;this.renderer?.setSize(size,size,false);this.canvas.style.width=`${size}px`;this.canvas.style.height=`${size}px`;}
    this.canvas.style.left=`${x}px`;this.canvas.style.top=`${y}px`;this.canvas.style.opacity=String(mix);
    if(!this.available||mix<.001)return;
    const theme=day?'day':'night';
    if(theme!==this.theme){this.theme=theme;this.ambient.intensity=day?2.4:1.8;this.sun.intensity=day?3.2:2.5;this.body.material.emissiveIntensity=this.index===2?(day?.03:1.4):0;this.faceInk.color.set(day?0x152537:0xe5edf6);}
    if(!reduced){this.rotation+=dt*.065;this.body.rotation.y+=dt*.065;}
    this.renderer!.render(this.scene,this.camera);
  }
  get available(){return !!this.renderer&&!this.lost;}
  get diagnostics(){return {renderer:this.available?'threejs':'fallback',name:planetNames[this.index],index:this.index,rotation:this.rotation,ready:!!this.night};}
}
