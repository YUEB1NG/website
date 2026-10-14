import { prismFragment } from './prism';
import { bubbleImages } from './assets';
import { earthUniforms, earthComposite } from './earth';

const vertex = `attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.,1.);}`;
// Direct GLSL port of quattro4maggi/common/StarsShader.tsx.
const stars = `precision highp float;
uniform vec2 resolution; uniform float time; uniform float pixelRatio; uniform sampler2D layer;
float hash12(vec2 p){vec3 p3=fract(vec3(p.x,p.y,p.x)*.1031);p3+=dot(p3,vec3(p3.y,p3.z,p3.x)+33.33);return fract((p3.x+p3.y)*p3.z);}
void main(){vec2 p=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);vec2 q=p/pixelRatio;float d=pow(hash12(q),3.);float mult=(sin(1.2*time+q.x+q.y)+1.)*.5;d=smoothstep(.99,1.,d)*mult;vec4 image=texture2D(layer,p/resolution);gl_FragColor=vec4(mix(vec3(d),image.rgb,image.a),1.);}`;

type Particle = { image: HTMLImageElement; progress:number; delay:number; speed:number; x:number; y:number; endX:number; endY:number };
export interface Frame { x:number; y:number; radius:number; active:boolean; time:number; dt:number; reduced:boolean; tiltX:number; tiltY:number }

export class Scene {
  private gl: WebGLRenderingContext | null;
  private programs: WebGLProgram[] = [];
  private uniforms = new Map<WebGLProgram, Map<string,WebGLUniformLocation|null>>();
  private buffer?: WebGLBuffer;
  private framebuffer?: WebGLFramebuffer;
  private source?: WebGLTexture;
  private layer?: WebGLTexture;
  private earthTexture?: WebGLTexture;
  private earthImage = new Image();
  private rotation = 0;
  private paint = document.createElement('canvas');
  private ctx = this.paint.getContext('2d')!;
  private width=1; private height=1; private ratio=1;
  private elapsed=0; private active=false;
  private particles: Particle[]=[];
  private fallback?:HTMLDivElement;
  private lost=false;
  readonly ready:Promise<unknown>;

  constructor(private canvas:HTMLCanvasElement) {
    this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power',preserveDrawingBuffer:true});
    const earthReady=new Promise<void>(resolve=>{
      this.earthImage.onload=()=>{if(this.gl&&!this.lost)this.uploadEarth();resolve();};
      this.earthImage.onerror=()=>{console.error('Night Earth texture could not be loaded.');resolve();};
      this.earthImage.src='/earth-night.jpg';
    });
    this.ready=Promise.all([earthReady,...bubbleImages.map((src,index)=>new Promise<void>(resolve=>{
      const image=new Image(); image.onload=()=>resolve(); image.onerror=()=>resolve(); image.src=src;
      this.particles.push({image,progress:0,delay:index*200,speed:.00028*(.5+Math.random()*1.3),x:0,y:0,endX:0,endY:0});
    }))]);
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
    const prism=prismFragment.replaceAll('texture2D(u_source,','sampleSource(').replace('vec2 clampCoord', 'vec4 sampleSource(vec2 uv) { return texture2D(u_source, vec2(uv.x, 1.0-uv.y)); }\nvec2 clampCoord').replace('precision highp float;', 'precision highp float;'+earthUniforms).replace(/void main\(\)[\s\S]*$/,earthComposite);
    this.programs=[this.program(stars),this.program(prism)];
    this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    this.framebuffer=gl.createFramebuffer()!;this.source=this.texture();this.layer=this.texture();
    this.earthTexture=this.texture();
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([1,3,7,255]));
    if(this.earthImage.complete&&this.earthImage.naturalWidth)this.uploadEarth();
  }
  private uploadEarth(){const gl=this.gl!;gl.bindTexture(gl.TEXTURE_2D,this.earthTexture!);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.earthImage);}
  private uniform(program:WebGLProgram,name:string){const cache=this.uniforms.get(program)!;if(!cache.has(name))cache.set(name,this.gl!.getUniformLocation(program,name));return cache.get(name)!;}
  private use(program:WebGLProgram){const gl=this.gl!;gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer!);const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);}
  resize(width:number,height:number){
    this.width=width;this.height=height;this.ratio=Math.min(window.devicePixelRatio||1,1.5);
    const w=Math.round(width*this.ratio),h=Math.round(height*this.ratio);
    this.canvas.width=w;this.canvas.height=h;this.paint.width=w;this.paint.height=h;
    const gl=this.gl;
    if(gl&&!this.lost){gl.viewport(0,0,w,h);gl.bindTexture(gl.TEXTURE_2D,this.source!);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer!);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.source!,0);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Incomplete scene framebuffer');gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
    this.particles.forEach(p=>this.reset(p));
  }
  private reset(p:Particle){
    const height=this.height*.4+10,t=Math.random()**2,spread=height*t*Math.tan(Math.PI/8);
    p.x=this.width/2-35+(Math.random()*2-1)*spread;p.y=height*(1-t);
    const dx=p.x+35-this.width/2,jitter=(Math.random()*2-1)*15;
    const angle=(Math.abs(dx)<=this.width*.08?90+jitter:dx>0?45+jitter*.5:135+jitter*.5)*Math.PI/180;
    const length=(p.y+80)/Math.sin(angle);p.endX=p.x+length*Math.cos(angle);p.endY=p.y-length*Math.sin(angle);p.progress=0;
  }
  render(frame:Frame){
    if(frame.active&&!frame.reduced)this.rotation=(this.rotation+frame.dt*0.09)%(Math.PI*2);
    if(this.fallback){this.fallback.classList.toggle('night-earth',frame.active);Object.assign(this.fallback.style,{left:`${frame.x-frame.radius}px`,top:`${frame.y-frame.radius}px`,width:`${frame.radius*2}px`,height:`${frame.radius*2}px`,backgroundPosition:`${this.rotation/(Math.PI*2)*100}% center`});return;}
    const gl=this.gl!;if(this.lost)return;
    if(frame.active&&!this.active){this.elapsed=0;this.particles.forEach(p=>this.reset(p));}
    this.active=frame.active;if(frame.active)this.elapsed+=frame.dt*1000;
    const ctx=this.ctx;ctx.clearRect(0,0,this.paint.width,this.paint.height);ctx.save();ctx.scale(this.ratio,this.ratio);
    if(!frame.reduced&&this.elapsed>=600){for(const p of this.particles){
      if(this.elapsed<600+p.delay||(!frame.active&&p.progress===0))continue;
      p.progress+=p.speed*frame.dt*1000;
      if(p.progress>=1){if(frame.active)this.reset(p);else continue;}
      const t=p.progress,scale=Math.min(1,t/.15),size=70*scale,x=p.x+(p.endX-p.x)*t+35-size/2+frame.tiltX*frame.radius,y=p.y+(p.endY-p.y)*t+35-size/2+Math.min(frame.tiltY*frame.radius,0);
      if(p.image.complete&&p.image.naturalWidth)ctx.drawImage(p.image,x,y,size,size);
    }}ctx.restore();
    const w=this.canvas.width,h=this.canvas.height,[base,prism]=this.programs;
    this.use(base);gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer!);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.layer!);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.paint);
    gl.uniform1i(this.uniform(base,'layer'),0);gl.uniform2f(this.uniform(base,'resolution'),w,h);gl.uniform1f(this.uniform(base,'pixelRatio'),this.ratio);gl.uniform1f(this.uniform(base,'time'),frame.reduced?0:frame.time);gl.drawArrays(gl.TRIANGLES,0,6);
    this.use(prism);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.bindTexture(gl.TEXTURE_2D,this.source!);gl.uniform1i(this.uniform(prism,'u_source'),0);
    const one=(name:string,value:number)=>gl.uniform1f(this.uniform(prism,name),value),three=(name:string,a:number,b:number,c:number)=>gl.uniform3f(this.uniform(prism,name),a,b,c);
    const morph=Math.max(0,Math.min(1,(200-frame.radius-95)/55));
    one('u_earthMix',this.earthImage.naturalWidth?morph*morph*(3-2*morph):0);one('u_rotation',this.rotation);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.earthTexture!);gl.uniform1i(this.uniform(prism,'u_night'),1);gl.activeTexture(gl.TEXTURE0);
    gl.uniform2f(this.uniform(prism,'u_resolution'),w,h);gl.uniform2f(this.uniform(prism,'u_center'),frame.x*this.ratio,frame.y*this.ratio);one('u_radius',frame.radius*this.ratio);one('u_refraction',.5);one('u_edgeWidth',.1);one('u_dispersion',.9);one('u_specular',1);one('u_shadowOpacity',.15);one('u_shadowSpread',.2);one('u_transparentBg',0);one('u_bubbleOpacity',0);one('u_shape',0);one('u_cornerRadius',0);three('u_bgColor',0,0,0);three('u_shadowColor',1,1,1);three('u_bubbleColor',0,0,0);
    [[1,0,0],[1,1,0],[0,1,0],[0,1,1],[0,0,1],[1,0,1]].forEach((c,i)=>three(`u_prismColor${i}`,c[0],c[1],c[2]));gl.drawArrays(gl.TRIANGLES,0,6);
  }
  get renderer(){return this.fallback?'fallback':'webgl';}
  get earth(){return {ready:this.earthImage.complete&&this.earthImage.naturalWidth>0,rotation:this.rotation};}
}
