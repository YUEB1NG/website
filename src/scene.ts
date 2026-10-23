import { prismFragment } from './prism';
import { floatingCoversReady, onFloatingCovers, refreshCoverSlot, setFreeCoverSlots } from './assets';


const vertex = `attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.,1.);}`;
// Direct GLSL port of quattro4maggi/common/StarsShader.tsx.
const stars = `precision highp float;
uniform vec2 resolution; uniform float time; uniform float pixelRatio; uniform sampler2D layer; uniform float day;
float hash12(vec2 p){vec3 p3=fract(vec3(p.x,p.y,p.x)*.1031);p3+=dot(p3,vec3(p3.y,p3.z,p3.x)+33.33);return fract((p3.x+p3.y)*p3.z);}
void main(){vec2 p=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);vec2 q=p/pixelRatio;float d=pow(hash12(q),3.);float mult=.55+.45*(sin(.22*time+q.x+q.y)+1.)*.5;d=smoothstep(.99,1.,d)*mult;vec4 image=texture2D(layer,p/resolution);gl_FragColor=vec4(mix(mix(vec3(d),vec3(.957,.965,.98)-vec3(d*.12),day),image.rgb,image.a),1.);}`;

type Particle = { image: HTMLImageElement; progress:number; speed:number;size:number;generation:number; x:number; y:number; endX:number; endY:number };
export interface Frame { x:number; y:number; radius:number; active:boolean; time:number; dt:number; reduced:boolean; tiltX:number; tiltY:number; day:boolean; planetMix:number; orbit:boolean; threeParticles:boolean;dragging:boolean }
export type ParticleFrame={x:number;y:number;size:number;opacity:number;visible:boolean};

export class Scene {
  private gl: WebGLRenderingContext | null;
  private programs: WebGLProgram[] = [];
  private uniforms = new Map<WebGLProgram, Map<string,WebGLUniformLocation|null>>();
  private buffer?: WebGLBuffer;
  private framebuffer?: WebGLFramebuffer;
  private source?: WebGLTexture;
  private layer?: WebGLTexture;
  private uploadedParticleLayer=false;
  private emptyPixel=new Uint8Array(4);
  private paint = document.createElement('canvas');
  private ctx = this.paint.getContext('2d')!;
  private width=1; private height=1; private ratio=1;
  private elapsed=0; private active=false;private nextEmission=1600;private spawnCursor=0;private births=0;private wasOrbit=false;
  private orbitMix=0;
  private particles: Particle[]=[];
  readonly particleFrames:ParticleFrame[]=[];
  private fallback?:HTMLDivElement;
  private lost=false;
  readonly ready:Promise<unknown>;

  constructor(private canvas:HTMLCanvasElement) {
    this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:true});
    this.ready=floatingCoversReady.then(({images})=>{
      images.forEach(image=>{
        this.particles.push({image,progress:1,speed:1/13000,size:30,generation:0,x:0,y:0,endX:0,endY:0});
        this.particleFrames.push({x:0,y:0,size:0,opacity:0,visible:false});
      });
    });
    onFloatingCovers(({images})=>this.particles.forEach((p,i)=>p.image=images[i]));
    try { if(this.gl) this.initialize(); else this.enableFallback(); }
    catch(error){console.error('Wabi WebGL initialization:',error); this.gl=null;this.enableFallback();}
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.enableFallback();});
    canvas.addEventListener('webglcontextrestored',()=>{
      this.lost=false;this.uniforms.clear();this.initialize();this.resize(this.width,this.height);
      this.fallback?.remove();this.fallback=undefined;document.body.classList.remove('webgl-fallback');
    });
  }
  private enableFallback(){
    if(this.fallback)return;
    document.body.classList.add('webgl-fallback');
    this.fallback=document.createElement('div');this.fallback.className='fallback-orb';this.canvas.after(this.fallback);
  }
  private compile(type:number,source:string){const gl=this.gl!;const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)??'Shader compile failed');return shader;}
  private program(fragment:string){
    const gl=this.gl!,program=gl.createProgram()!,vs=this.compile(gl.VERTEX_SHADER,vertex),fs=this.compile(gl.FRAGMENT_SHADER,fragment);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)??'Link failed');
    this.uniforms.set(program,new Map());return program;
  }
  private texture(){const gl=this.gl!,t=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  private initialize(){
    const gl=this.gl!;
    // Framebuffer textures have a bottom-left origin; Skia coordinates are top-left.
    const prism=prismFragment.replaceAll('texture2D(u_source,','sampleSource(').replace('vec2 clampCoord', 'vec4 sampleSource(vec2 uv) { return texture2D(u_source, vec2(uv.x, 1.0-uv.y)); }\nvec2 clampCoord').replace('precision highp float;', 'precision highp float; uniform float u_planetMix;').replace(/void main\(\)[\s\S]*$/,`void main(){vec2 coord=vec2(gl_FragCoord.x,u_resolution.y-gl_FragCoord.y);gl_FragColor=mix(prism(coord),sampleSource(coord/u_resolution),u_planetMix);}`);
    this.programs=[this.program(stars),this.program(prism)];
    this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    this.framebuffer=gl.createFramebuffer()!;this.source=this.texture();this.layer=this.texture();
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,this.emptyPixel);this.uploadedParticleLayer=false;
  }
  private uniform(program:WebGLProgram,name:string){const cache=this.uniforms.get(program)!;if(!cache.has(name))cache.set(name,this.gl!.getUniformLocation(program,name));return cache.get(name)!;}
  private use(program:WebGLProgram){const gl=this.gl!;gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer!);const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);}
  resize(width:number,height:number){
    this.width=width;this.height=height;this.ratio=Math.min(window.devicePixelRatio||1,1.5);
    const w=Math.round(width*this.ratio),h=Math.round(height*this.ratio);
    this.canvas.width=w;this.canvas.height=h;this.paint.width=w;this.paint.height=h;
    const gl=this.gl;
    if(gl&&!this.lost){gl.viewport(0,0,w,h);gl.bindTexture(gl.TEXTURE_2D,this.source!);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer!);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.source!,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Incomplete scene framebuffer');gl.bindFramebuffer(gl.FRAMEBUFFER,null);}

  }
  private spawn(p:Particle,frame:Frame,index:number){
    // Snapshot the release point once. Flight paths never track the orb afterwards.
    const angle=Math.PI*1.15+Math.random()*Math.PI*.7;
    p.x=frame.x+Math.cos(angle)*frame.radius*.9;
    p.y=frame.y+Math.sin(angle)*frame.radius*.8;
    p.endX=(Math.random()-.5)*90;
    p.endY=-Math.min(310,Math.max(210,this.height*.32))*(.9+Math.random()*.2);
    p.speed=1/(11000+Math.random()*3000);p.size=(this.width<600?28:32)+Math.random()*4;p.progress=0;
    if(p.generation++>0)refreshCoverSlot(index);this.births++;
  }
  render(frame:Frame){
    this.orbitMix=frame.reduced?(frame.orbit?1:0):this.orbitMix+((frame.orbit?1:0)-this.orbitMix)*(1-Math.exp(-frame.dt*1.6));
    if(this.fallback){Object.assign(this.fallback.style,{left:`${frame.x-frame.radius}px`,top:`${frame.y-frame.radius}px`,width:`${frame.radius*2}px`,height:`${frame.radius*2}px`});return;}
    const gl=this.gl!;if(this.lost)return;
    if(frame.active&&!this.active){this.elapsed=0;this.nextEmission=1600;this.particles.forEach(p=>p.progress=1);}
    this.active=frame.active;if(frame.active)this.elapsed+=frame.dt*1000;
    const limit=Math.min(this.width<600?6:8,this.particles.length);if(limit)setFreeCoverSlots(limit);
    if(this.wasOrbit&&!frame.orbit){this.particles.forEach(p=>p.progress=1);this.nextEmission=this.elapsed+1600;}
    this.wasOrbit=frame.orbit;
    if(frame.active&&!frame.reduced&&!frame.dragging&&!frame.orbit&&this.orbitMix<.005&&this.elapsed>=this.nextEmission){
      for(let offset=0;offset<limit;offset++){
        const index=(this.spawnCursor+offset)%limit,p=this.particles[index];
        if(p.progress>=1){this.spawn(p,frame,index);this.spawnCursor=(index+1)%limit;break;}
      }
      // No catch-up bursts after dragging, tab suspension or orbit release.
      this.nextEmission=this.elapsed+1900+Math.random()*500;
    }
    const ctx=this.ctx;if(!frame.threeParticles)ctx.clearRect(0,0,this.paint.width,this.paint.height);ctx.save();ctx.scale(this.ratio,this.ratio);
    this.particleFrames.forEach((point,i)=>{
      point.visible=false;
      // Extra orbit-only covers start behind the orb, never at the screen origin.
      if(this.particles[i].generation===0){point.x=frame.x;point.y=frame.y-frame.radius*.25;point.size=0;point.opacity=0;}
    });
    for(const [i,p] of this.particles.entries()){
      if(frame.reduced||p.progress>=1)continue;
      p.progress=Math.min(1,p.progress+p.speed*frame.dt*1000);
      const t=p.progress,enter=Math.min(1,t/.09),exit=Math.max(0,Math.min(1,(1-t)/.22));
      const opacity=.86*enter*enter*(3-2*enter)*exit*exit*(3-2*exit),size=p.size*(.94+.06*enter);
      const x=p.x+p.endX*t,y=p.y+p.endY*t;
      this.particleFrames[i]={x,y,size,opacity,visible:opacity>.001};
      if(!frame.threeParticles&&p.image.complete&&p.image.naturalWidth){ctx.globalAlpha=opacity;ctx.drawImage(p.image,x-size/2,y-size/2,size,size);ctx.globalAlpha=1;}
    }ctx.restore();
    const w=this.canvas.width,h=this.canvas.height,[base,prism]=this.programs;
    this.use(base);gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer!);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.layer!);if(!frame.threeParticles){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.paint);this.uploadedParticleLayer=true;}
    else if(this.uploadedParticleLayer){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,this.emptyPixel);this.uploadedParticleLayer=false;}
    gl.uniform1f(this.uniform(base,'day'),frame.day?1:0);gl.uniform1i(this.uniform(base,'layer'),0);gl.uniform2f(this.uniform(base,'resolution'),w,h);gl.uniform1f(this.uniform(base,'pixelRatio'),this.ratio);gl.uniform1f(this.uniform(base,'time'),frame.reduced?0:frame.time);gl.drawArrays(gl.TRIANGLES,0,6);
    this.use(prism);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,this.source!);gl.uniform1i(this.uniform(prism,'u_source'),0);
    const one=(name:string,value:number)=>gl.uniform1f(this.uniform(prism,name),value),three=(name:string,a:number,b:number,c:number)=>gl.uniform3f(this.uniform(prism,name),a,b,c);
    one('u_planetMix',frame.planetMix);
    gl.uniform2f(this.uniform(prism,'u_resolution'),w,h);gl.uniform2f(this.uniform(prism,'u_center'),frame.x*this.ratio,frame.y*this.ratio);one('u_radius',frame.radius*this.ratio);one('u_refraction',.5);one('u_edgeWidth',.1);one('u_dispersion',.9);one('u_specular',1);one('u_shadowOpacity',.15);one('u_shadowSpread',.2);one('u_transparentBg',0);one('u_bubbleOpacity',0);one('u_shape',0);one('u_cornerRadius',0);three('u_bgColor',frame.day?.957:0,frame.day?.965:0,frame.day?.98:0);three('u_shadowColor',1,1,1);three('u_bubbleColor',0,0,0);
    [[1,0,0],[1,1,0],[0,1,0],[0,1,1],[0,0,1],[1,0,1]].forEach((c,i)=>three(`u_prismColor${i}`,c[0],c[1],c[2]));gl.drawArrays(gl.TRIANGLES,0,6);
  }
  get orbitBlend(){return this.orbitMix;}
  get diagnostics(){return {births:this.births,limit:this.width<600?6:8,particles:this.particleFrames.map((p,index)=>({...p,index})).filter(p=>p.visible)};}
  get renderer(){return this.fallback?'fallback':'webgl';}
}
