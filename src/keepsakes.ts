import * as THREE from 'three';

// Original small-scale sculptures, informed by the FIFA trophy and AFA crest.
// They use Phong highlights so the gold remains legible without an HDR environment.
const gold = () => new THREE.MeshPhongMaterial({ color: 0xd6a842, specular: 0xffedba, shininess: 74 });
const warmGold = () => new THREE.MeshPhongMaterial({ color: 0xbc8526, specular: 0xffdc85, shininess: 42 });
const v = (x:number,y:number,z:number) => new THREE.Vector3(x,y,z);

function mesh(geometry:THREE.BufferGeometry, material:THREE.Material, parent:THREE.Object3D, x=0,y=0,z=0) {
  const object = new THREE.Mesh(geometry, material); object.position.set(x,y,z); parent.add(object); return object;
}
function tube(points:THREE.Vector3[], radius:number, material:THREE.Material, parent:THREE.Object3D, closed=false) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed),Math.max(32,points.length*5),radius,8,closed),material,parent);
}
function canvasTexture(width:number,height:number,draw:(ctx:CanvasRenderingContext2D)=>void) {
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  draw(canvas.getContext('2d')!); const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function textPlane(text:string,width:number,height:number,color:string,parent:THREE.Object3D,x:number,y:number,z:number,font='600 66px Georgia') {
  const map=canvasTexture(1024,192,ctx=>{ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,512,96);});
  return mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}),parent,x,y,z);
}
function shieldShape(scale=1) {
  const s=new THREE.Shape();s.moveTo(-.57*scale,.65*scale);s.lineTo(.57*scale,.65*scale);s.lineTo(.54*scale,-.15*scale);
  s.bezierCurveTo(.5*scale,-.48*scale,.23*scale,-.66*scale,0,-.79*scale);
  s.bezierCurveTo(-.23*scale,-.66*scale,-.5*scale,-.48*scale,-.54*scale,-.15*scale);s.closePath();return s;
}
function starShape(radius:number) {
  const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?radius*.43:radius;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();return shape;
}

/** Three-star enamel shield with front and reverse faces; centered, about 2 units high. */
export function createArgentinaCrest():THREE.Group {
  const crest=new THREE.Group();crest.name='Argentina three-star crest';
  const metal=gold();
  const rim=mesh(new THREE.ExtrudeGeometry(shieldShape(),{depth:.12,bevelEnabled:true,bevelSize:.035,bevelThickness:.025,bevelSegments:3,steps:1}),metal,crest,0,0,-.07);
  rim.name='gilded shield rim';
  const faceMap=canvasTexture(768,1024,ctx=>{
    ctx.fillStyle='#f4f3e8';ctx.fillRect(0,0,768,1024);
    ctx.fillStyle='#85cae9';for(let i=0;i<5;i++)ctx.fillRect(i*192-96,395,96,650);
    ctx.fillStyle='#ead89f';ctx.fillRect(0,0,768,415);ctx.strokeStyle='#a87e30';ctx.lineWidth=12;ctx.strokeRect(44,35,680,340);
    ctx.fillStyle='#233d48';ctx.font='bold 245px Georgia, serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('AFA',384,210);
    ctx.strokeStyle='#ae873d';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,404);ctx.lineTo(768,404);ctx.stroke();
  });
  const geometry=new THREE.ShapeGeometry(shieldShape(.91),32);
  // ShapeGeometry's default UV is world space; remap over this shield's bounds.
  const position=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,(position.getX(i)+.57)/1.14,(position.getY(i)+.79)/1.44);
  const enamel=new THREE.MeshPhongMaterial({map:faceMap,color:0xffffff,shininess:55,specular:0xdde8ed,side:THREE.DoubleSide});
  mesh(geometry,enamel,crest,0,0,.087);
  const reverse=mesh(geometry.clone(),enamel,crest,0,0,-.101);reverse.rotation.y=Math.PI;
  [-.39,0,.39].forEach((x,i)=>{mesh(new THREE.ExtrudeGeometry(starShape(.145),{depth:.085,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:2}),metal,crest,x,i===1?1.01:.89,-.04);});
  for(const side of [-1,1]){
    tube([v(side*.17,-.8,.04),v(side*.52,-.66,.04),v(side*.71,-.34,.04),v(side*.74,.08,.04),v(side*.67,.43,.04)],.018,metal,crest);
    for(let i=0;i<8;i++){
      const t=i/7,a=-1.28+t*1.58,x=side*(.19+.55*Math.sin(t*1.5)),y=-.74+t*1.02;
      const leaf=mesh(new THREE.SphereGeometry(1,12,8),metal,crest,x+side*.065,y,.04);
      leaf.scale.set(.057,.12,.024);leaf.rotation.z=side*(a-.3);
    }
  }
  crest.userData.rotating=crest;return crest;
}

function trophyGlobe(material:THREE.Material) {
  const globe=new THREE.Group();mesh(new THREE.SphereGeometry(.33,48,32),material,globe);
  // Raised coastlines read as the embossed continents of the sculpted gold globe.
  const continents:number[][][]=[
    [[-168,67],[-130,72],[-108,58],[-77,56],[-54,47],[-79,24],[-102,16],[-118,32],[-145,55]],
    [[-82,12],[-61,9],[-40,-6],[-48,-22],[-66,-55],[-75,-38],[-79,-10]],
    [[-19,35],[10,37],[32,30],[48,10],[36,-18],[20,-35],[8,-20],[-1,4],[-16,13]],
    [[-10,37],[3,59],[30,70],[70,62],[106,70],[160,60],[168,46],[139,35],[116,20],[103,2],[78,8],[56,27],[30,34]],
    [[112,-12],[137,-11],[154,-25],[145,-39],[119,-33]],
  ];
  const land=new THREE.MeshPhongMaterial({color:0xe2b85a,specular:0xffedba,shininess:52});
  for(const outline of continents){
    const vectors=outline.map(([lon,lat])=>{const a=lon*Math.PI/180,b=lat*Math.PI/180;return v(Math.cos(b)*Math.sin(a)*.335,Math.sin(b)*.335,Math.cos(b)*Math.cos(a)*.335);});
    const center=v(0,0,0);vectors.forEach(p=>center.add(p));center.normalize().multiplyScalar(.338);
    const vertices:number[]=[];
    const point=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,u:number,w:number)=>a.clone().multiplyScalar(1-u-w).addScaledVector(b,u).addScaledVector(c,w).normalize().multiplyScalar(.337);
    // Subdivide onto the globe: a single large flat triangle would disappear inside it.
    for(let i=0;i<vectors.length;i++){
      const a=center,b=vectors[i],c=vectors[(i+1)%vectors.length],n=8;
      for(let row=0;row<n;row++)for(let col=0;col<n-row;col++){
        vertices.push(...point(a,b,c,row/n,col/n).toArray(),...point(a,b,c,(row+1)/n,col/n).toArray(),...point(a,b,c,row/n,(col+1)/n).toArray());
        if(col<n-row-1)vertices.push(...point(a,b,c,(row+1)/n,col/n).toArray(),...point(a,b,c,(row+1)/n,(col+1)/n).toArray(),...point(a,b,c,row/n,(col+1)/n).toArray());
      }
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
    const patch=mesh(geo,land,globe);(patch.material as THREE.MeshPhongMaterial).side=THREE.DoubleSide;
    tube(vectors,.004,land,globe,true);
  }
  globe.rotation.y=.4;return globe;
}

/** Stationary glass display, with only userData.rotating (the trophy) animated. */
export function createTrophyCase():THREE.Group {
  const display=new THREE.Group();display.name='World Cup trophy cabinet';const trophy=new THREE.Group();
  const gilded=gold(),darkGold=warmGold();
  const baseMaterial=new THREE.MeshPhongMaterial({color:0x183e39,shininess:55,specular:0x8ba18d});
  const malachite=canvasTexture(256,128,ctx=>{
    ctx.fillStyle='#194d3d';ctx.fillRect(0,0,256,128);
    for(let j=0;j<34;j++){ctx.beginPath();for(let x=0;x<257;x+=2){const y=j*4+Math.sin(x*.036+j*.6)*3+Math.sin(x*.1+j)*1.5;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.strokeStyle=j%3?'#357c59':'#93ae70';ctx.lineWidth=j%3?1:2;ctx.stroke();}
  });
  baseMaterial.map=malachite;
  mesh(new THREE.CylinderGeometry(.265,.28,.10,64),gilded,trophy,0,-.76,0);
  mesh(new THREE.CylinderGeometry(.263,.267,.055,64),baseMaterial,trophy,0,-.695,0);
  mesh(new THREE.CylinderGeometry(.258,.263,.035,64),gilded,trophy,0,-.648,0);
  mesh(new THREE.CylinderGeometry(.251,.257,.055,64),baseMaterial,trophy,0,-.605,0);
  mesh(new THREE.CylinderGeometry(.235,.251,.06,64),gilded,trophy,0,-.55,0);
  // Rising torsos fuse at the foot, then open into the two athletes' shoulders and arms.
  for(const side of [-1,1]){
    const figure=new THREE.Group();figure.rotation.y=side<0?Math.PI:0;
    const torsoPath=new THREE.CatmullRomCurve3([v(.02,-.52,.015),v(.10,-.36,.03),v(.13,-.13,.025),v(.17,.07,.015),v(.2,.18,.02)]);
    const frames=torsoPath.computeFrenetFrames(48,false),positions:number[]=[],indices:number[]=[];
    for(let i=0;i<=48;i++){
      const t=i/48,p=torsoPath.getPointAt(t),r=.095+Math.sin(t*Math.PI)*.04;
      for(let j=0;j<20;j++){const a=j/20*Math.PI*2,point=p.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r*.72);positions.push(...point.toArray());if(i<48){const n=i*20+j,m=i*20+(j+1)%20;indices.push(n,m,n+20,m,m+20,n+20);}}
    }
    const torso=new THREE.BufferGeometry();torso.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));torso.setIndex(indices);torso.computeVertexNormals();mesh(torso,gilded,figure);
    const head=mesh(new THREE.SphereGeometry(.086,24,18),gilded,figure,.198,.238,.012);head.scale.set(.8,1.15,.95);head.rotation.z=-.35;
    tube([v(.17,.13,.055),v(.32,.23,.07),v(.35,.37,.065),v(.27,.52,.05)],.038,gilded,figure);
    tube([v(.12,.12,-.055),v(.04,.31,-.16),v(-.07,.43,-.17),v(-.17,.50,-.10)],.035,gilded,figure);
    // Flowing relief ribbons break up the smooth stems into the original sculpture's texture.
    for(let j=0;j<7;j++)tube([v(-.08+j*.026,-.5,.083),v(-.015+j*.027,-.29,.10),v(.06+j*.026,-.05,.095),v(.14+j*.012,.15,.075)],.006,j%2?darkGold:gilded,figure);
    trophy.add(figure);
  }
  const globe=trophyGlobe(gilded);globe.position.set(0,.52,0);trophy.add(globe);
  textPlane('FIFA WORLD CUP',.42,.07,'#f7d888',trophy,0,-.755,.272,'600 60px Georgia');
  display.add(trophy);

  const plinthMaterial=new THREE.MeshPhongMaterial({color:0x182b36,specular:0x658995,shininess:60});
  mesh(new THREE.BoxGeometry(1.77,.18,1.13),plinthMaterial,display,0,-1.0,0);
  mesh(new THREE.BoxGeometry(1.84,.035,1.18),darkGold,display,0,-.895,0);
  mesh(new THREE.BoxGeometry(1.82,.035,1.16),darkGold,display,0,-1.105,0);
  const crest=createArgentinaCrest();crest.scale.setScalar(.19);crest.position.set(0,-1.02,.605);display.add(crest);
  const backdrop=new THREE.MeshPhongMaterial({color:0x152c3c,shininess:28});
  mesh(new THREE.PlaneGeometry(1.66,2.52),backdrop,display,0,.37,-.51);
  textPlane('Argentina',1.55,.29,'#b4dcf0',display,0,1.40,-.495,'500 185px Georgia');
  textPlane('MESSI',1.25,.25,'#d3b86a',display,0,1.10,-.493,'600 160px Arial');
  // Glass is a light reflection, not an opaque box or a refracting screen over the trophy.
  const glass=new THREE.MeshPhongMaterial({color:0xbde8ff,transparent:true,opacity:.055,shininess:120,specular:0xffffff,side:THREE.DoubleSide,depthWrite:false});
  for(const x of [-.86,.86]){const pane=mesh(new THREE.PlaneGeometry(1.06,2.54),glass,display,x,.38,0);pane.rotation.y=Math.PI/2;}
  const front=mesh(new THREE.PlaneGeometry(1.72,2.54),glass,display,0,.38,.54);front.renderOrder=5;
  const top=mesh(new THREE.PlaneGeometry(1.72,1.08),glass,display,0,1.65,0);top.rotation.x=-Math.PI/2;
  const frame=new THREE.MeshPhongMaterial({color:0x9db6bd,specular:0xffffff,shininess:110});
  for(const x of [-.86,.86])for(const z of [-.54,.54])mesh(new THREE.CylinderGeometry(.009,.009,2.54,8),frame,display,x,.38,z);
  for(const y of [-.89,1.65]){
    for(const z of [-.54,.54])mesh(new THREE.BoxGeometry(1.74,.016,.016),frame,display,0,y,z);
    for(const x of [-.86,.86])mesh(new THREE.BoxGeometry(.016,.016,1.08),frame,display,x,y,0);
  }
  const gleam=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.15,depthWrite:false});
  const strip=mesh(new THREE.PlaneGeometry(.035,1.93),gleam,display,-.65,.17,.548);strip.rotation.z=-.16;
  const strip2=mesh(new THREE.PlaneGeometry(.008,1.68),gleam,display,.69,.2,.549);strip2.rotation.z=-.16;
  display.scale.setScalar(1.18);display.userData.rotating=trophy;display.userData.kind='trophy';return display;
}

/** A traditional short, scalloped pastry with a baked crust and raised floral stamp. */
export function createMooncake():THREE.Group {
  const root=new THREE.Group();root.name='scalloped mooncake';const cake=new THREE.Group();cake.rotation.x=.76;root.add(cake);
  const crust=canvasTexture(512,512,ctx=>{
    ctx.fillStyle='#bf7a2b';ctx.fillRect(0,0,512,512);
    const shade=ctx.createRadialGradient(256,220,30,256,256,330);shade.addColorStop(0,'#e6ad55');shade.addColorStop(.7,'#c78b37');shade.addColorStop(1,'#97531c');ctx.fillStyle=shade;ctx.fillRect(0,0,512,512);
    let seed=893;for(let i=0;i<12000;i++){seed=(seed*16807)%2147483647;const x=seed%512;seed=(seed*16807)%2147483647;const y=seed%512;ctx.fillStyle=i%2?'rgba(91,42,10,.075)':'rgba(255,225,160,.10)';ctx.fillRect(x,y,1.4,1.4);}
  });
  const dough=new THREE.MeshPhongMaterial({map:crust,color:0xffe0a4,shininess:20,specular:0x9f6e32});
  const embossed=new THREE.MeshPhongMaterial({color:0xe5ac51,shininess:25,specular:0xffd391});
  const geometry=new THREE.CylinderGeometry(.91,.93,.43,160,8,false),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z);if(r<.1)continue;
    const a=Math.atan2(z,x),wave=1+.044*Math.cos(a*16),edge=1-.025*Math.pow(Math.abs(p.getY(i))/.215,6);
    p.setXYZ(i,x*wave*edge,p.getY(i),z*wave*edge);
  }geometry.computeVertexNormals();mesh(geometry,dough,cake);
  const ring=(radius:number,height:number,wave:number,count:number,thickness:number)=>{
    const points=Array.from({length:129},(_,i)=>{const a=i/128*Math.PI*2,r=radius+wave*Math.cos(a*count);return v(Math.cos(a)*r,height,Math.sin(a)*r);});tube(points,thickness,embossed,cake,true);
  };
  ring(.84,.225,.033,16,.025);ring(.77,.226,0,1,.014);ring(.67,.229,.044,8,.023);ring(.35,.23,0,1,.022);ring(.9,-.145,.038,16,.014);
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2,points:THREE.Vector3[]=[];
    for(let j=0;j<=48;j++){const t=j/48*Math.PI*2,along=.45+.145*Math.cos(t),across=.085*Math.sin(t);points.push(v(Math.cos(a)*along-Math.sin(a)*across,.236,Math.sin(a)*along+Math.cos(a)*across));}tube(points,.019,embossed,cake,true);
  }
  for(let i=0;i<32;i++){
    const a=i/32*Math.PI*2,r=.926*(1+.044*Math.cos(a*16));tube([v(Math.cos(a)*r,-.12,Math.sin(a)*r),v(Math.cos(a)*r,.11,Math.sin(a)*r)],.009,embossed,cake);
  }
  const stamp=canvasTexture(256,256,ctx=>{ctx.fillStyle='#a56a26';ctx.font='bold 158px "Microsoft YaHei", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('悦',128,133);});
  const face=mesh(new THREE.PlaneGeometry(.44,.44),new THREE.MeshPhongMaterial({map:stamp,transparent:true,depthWrite:false,color:0xf4ce83,shininess:15}),cake,0,.237,0);face.rotation.x=-Math.PI/2;
  root.userData.kind='mooncake';root.userData.rotating=root;return root;
}
