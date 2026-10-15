import * as THREE from 'three';

/**
 * Original, stylised 3D studies, NOT licensed scans or exact official textures.
 * Edition names: FIFA's "A history of World Cup balls". Design references:
 * adidas-group.com/en/magazine/innovation/how-adidas-has-shaped-the-history-of-world-cup-balls-from-1970-to-the-present-day
 * One principal design per tournament, plus both 1930 final balls. No 1942/46 tournaments.
 */
export const footballEditions = [
  {year:1930,name:'Tiento'}, {year:1930,name:'T-model'},
  {year:1934,name:'Federale 102'}, {year:1938,name:'Allen'},
  {year:1950,name:'Superball Duplo T'}, {year:1954,name:'Swiss World Champion'},
  {year:1958,name:'Top Star'}, {year:1962,name:'Mr Crack'},
  {year:1966,name:'Challenge 4-Star'}, {year:1970,name:'Telstar'},
  {year:1974,name:'Telstar Durlast'}, {year:1978,name:'Tango Durlast'},
  {year:1982,name:'Tango España'}, {year:1986,name:'Azteca'},
  {year:1990,name:'Etrusco Unico'}, {year:1994,name:'Questra'},
  {year:1998,name:'Tricolore'}, {year:2002,name:'Fevernova'},
  {year:2006,name:'+Teamgeist'}, {year:2010,name:'Jabulani'},
  {year:2014,name:'Brazuca'}, {year:2018,name:'Telstar 18'},
  {year:2022,name:'Al Rihla'}, {year:2026,name:'Trionda'},
] as const;

type Ctx = CanvasRenderingContext2D;
const V = (x:number,y:number,z:number) => new THREE.Vector3(x,y,z);
const tau=Math.PI*2;

function canvasTexture(draw:(ctx:Ctx)=>void,size=256){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d')!;ctx.scale(size/256,size/256);draw(ctx);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.anisotropy=4;return texture;
}

function grain(ctx:Ctx,light=true){
  // Deterministic fine leather/PU pores; no texture downloads or random shimmer.
  ctx.fillStyle=light?'rgba(35,42,45,.065)':'rgba(255,244,211,.08)';
  for(let i=0;i<1800;i++){
    const x=(i*73.321)%256,y=(i*119.719)%256;
    ctx.beginPath();ctx.ellipse(x,y,.45,.32,0,0,tau);ctx.fill();
  }
}

function star(ctx:Ctx,x:number,y:number,r:number,color:string,points=5){
  ctx.beginPath();for(let i=0;i<points*2;i++){
    const a=i*Math.PI/points-Math.PI/2,rr=i%2?r*.43:r;
    if(i===0)ctx.moveTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);else ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);
  }ctx.closePath();ctx.fillStyle=color;ctx.fill();
}

function triad(ctx:Ctx,color:string,inset=0){
  ctx.save();ctx.translate(128,128);ctx.scale(1-inset,1-inset);
  for(let i=0;i<3;i++){
    ctx.save();ctx.rotate(i*tau/3);ctx.beginPath();ctx.moveTo(0,-133);
    ctx.bezierCurveTo(20,-54,42,-24,116,67);
    ctx.bezierCurveTo(43,31,18,21,0,43);
    ctx.bezierCurveTo(-18,21,-43,31,-116,67);
    ctx.bezierCurveTo(-42,-24,-20,-54,0,-133);
    ctx.fillStyle=color;ctx.fill();ctx.restore();
  }ctx.restore();
}

function panelTexture(year:number,pentagon:boolean){
  return canvasTexture(ctx=>{
    ctx.fillStyle='#f9f7ef';ctx.fillRect(0,0,256,256);
    if(year<=1974&&pentagon){ctx.fillStyle='#161b21';ctx.fillRect(0,0,256,256);}
    if(year>=1978&&year<=1998&&!pentagon){
      triad(ctx,year===1998?'#163d7b':'#182029');
      if(year===1998){triad(ctx,'#e9534e',.16);triad(ctx,'#163d7b',.28);}
      ctx.save();ctx.translate(128,128);
      for(let j=0;j<3;j++){
        ctx.save();ctx.rotate(j*tau/3);
        if(year===1986){
          ctx.strokeStyle='#f4efdf';ctx.lineWidth=4;ctx.beginPath();
          for(let i=0;i<4;i++){const y=-102+i*12;ctx.moveTo(-12,y);ctx.lineTo(12,y);ctx.lineTo(12,y+6);ctx.lineTo(-5,y+6);}ctx.stroke();
        }else if(year===1990){
          ctx.strokeStyle='#e5dcc5';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-82,13,17,0,0,tau);ctx.stroke();
          ctx.beginPath();ctx.moveTo(-7,-87);ctx.lineTo(-4,-81);ctx.lineTo(0,-86);ctx.lineTo(4,-81);ctx.lineTo(7,-87);ctx.stroke();
        }else if(year===1994){
          star(ctx,0,-82,10,'#f7f6ee');star(ctx,-12,-105,4,'#f7f6ee');star(ctx,12,-63,4,'#f7f6ee');
        }else if(year===1998){
          ctx.strokeStyle='#f8f7ed';ctx.lineWidth=2;
          for(let k=0;k<4;k++){ctx.beginPath();ctx.arc(0,-87,6+k*4,.2,Math.PI*1.7);ctx.stroke();}
        }ctx.restore();
      }ctx.restore();
    }
    grain(ctx,!(pentagon&&year<=1974));
  });
}

/** Truncating an icosahedron yields the actual 12 pentagon/20 hexagon topology. */
function classicPanels(){
  const raw=new THREE.IcosahedronGeometry(1,0);const p=raw.getAttribute('position');
  const vertices:THREE.Vector3[]=[],faces:number[][]=[];
  for(let i=0;i<p.count;i+=3){
    const face:number[]=[];
    for(let j=0;j<3;j++){
      const v=V(p.getX(i+j),p.getY(i+j),p.getZ(i+j));
      let n=vertices.findIndex(a=>a.distanceToSquared(v)<1e-8);
      if(n<0){n=vertices.length;vertices.push(v);}face.push(n);
    }faces.push(face);
  }raw.dispose();
  const polygons:{points:THREE.Vector3[],pentagon:boolean}[]=[];
  vertices.forEach((v,index)=>{
    const neighbours=new Set<number>();faces.filter(f=>f.includes(index)).forEach(f=>f.forEach(n=>{if(n!==index)neighbours.add(n);}));
    polygons.push({points:[...neighbours].map(n=>v.clone().lerp(vertices[n],1/3).normalize()),pentagon:true});
  });
  faces.forEach(face=>{
    const points:THREE.Vector3[]=[];
    for(let j=0;j<3;j++){
      const a=vertices[face[j]],b=vertices[face[(j+1)%3]];
      points.push(a.clone().lerp(b,1/3).normalize(),a.clone().lerp(b,2/3).normalize());
    }polygons.push({points,pentagon:false});
  });
  return polygons;
}

function sphericalPanel(points:THREE.Vector3[]){
  const center=points.reduce((a,p)=>a.add(p),V(0,0,0)).normalize();
  const right=points[0].clone().sub(center.clone().multiplyScalar(points[0].dot(center))).normalize();
  const up=center.clone().cross(right).normalize();
  const ordered=points.map(p=>p.clone()).sort((a,b)=>Math.atan2(a.dot(up),a.dot(right))-Math.atan2(b.dot(up),b.dot(right)));
  // Shrink faces very slightly to reveal recessed dark stitching rather than thick outlines.
  ordered.forEach(p=>p.lerp(center,.009).normalize());
  const extent=Math.max(...ordered.map(p=>Math.hypot(p.dot(right),p.dot(up))));
  const positions:number[]=[],uv:number[]=[],normals:number[]=[];
  const point=(a:THREE.Vector3,b:THREE.Vector3,u:number,v:number)=>center.clone().multiplyScalar(1-u-v).addScaledVector(a,u).addScaledVector(b,v);
  const emit=(v:THREE.Vector3)=>{v.normalize();positions.push(v.x,v.y,v.z);normals.push(v.x,v.y,v.z);uv.push(.5+v.dot(right)/extent*.48,.5+v.dot(up)/extent*.48);};
  const n=8;
  for(let edge=0;edge<ordered.length;edge++){
    const a=ordered[edge],b=ordered[(edge+1)%ordered.length];
    for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){
      emit(point(a,b,i/n,j/n));emit(point(a,b,(i+1)/n,j/n));emit(point(a,b,i/n,(j+1)/n));
      if(i+j<n-1){emit(point(a,b,(i+1)/n,j/n));emit(point(a,b,(i+1)/n,(j+1)/n));emit(point(a,b,i/n,(j+1)/n));}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geometry;
}

function modernGraphic(ctx:Ctx,year:number){
  const ink='#172432',gold='#c5a350';ctx.lineJoin='round';ctx.lineCap='round';
  if(year===2002){
    triad(ctx,'#c1a458',.23);triad(ctx,'#35544b',.41);triad(ctx,'#c93b31',.62);
  }else if(year===2006){
    ctx.beginPath();ctx.moveTo(27,28);ctx.bezierCurveTo(80,64,76,100,63,129);ctx.bezierCurveTo(48,165,84,202,128,232);ctx.bezierCurveTo(164,202,208,170,193,129);ctx.bezierCurveTo(180,94,180,65,229,28);
    ctx.bezierCurveTo(178,48,157,75,128,83);ctx.bezierCurveTo(99,75,78,48,27,28);ctx.fillStyle=ink;ctx.fill();ctx.strokeStyle=gold;ctx.lineWidth=5;ctx.stroke();
  }else if(year===2010){
    for(let i=0;i<3;i++){
      ctx.save();ctx.translate(128,128);ctx.rotate(tau*i/3);ctx.beginPath();ctx.moveTo(-28,-15);ctx.bezierCurveTo(-79,-35,-97,-91,-51,-112);ctx.bezierCurveTo(-15,-129,22,-102,43,-64);ctx.bezierCurveTo(3,-92,-38,-74,-28,-15);ctx.fillStyle=ink;ctx.fill();
      ctx.strokeStyle=['#cdac3e','#db3a33','#3f9667'][i];ctx.lineWidth=9;ctx.stroke();ctx.restore();
    }
  }else if(year===2014){
    for(let i=0;i<3;i++){
      ctx.save();ctx.translate(128,128);ctx.rotate(tau*i/3);ctx.beginPath();ctx.moveTo(0,-107);ctx.bezierCurveTo(67,-105,101,-56,81,-8);ctx.bezierCurveTo(62,31,32,18,0,47);ctx.bezierCurveTo(-9,11,-42,-23,-45,-55);ctx.bezierCurveTo(-49,-83,-27,-106,0,-107);ctx.fillStyle=ink;ctx.fill();
      ctx.strokeStyle=['#f29e26','#4aa354','#5fb5da'][i];ctx.lineWidth=12;ctx.stroke();ctx.restore();
    }
  }else if(year===2018){
    for(let y=0;y<14;y++)for(let x=0;x<14;x++){
      const slope=Math.abs(x-6.5)*.6,edge=Math.min(y,13-y);
      if(edge>slope+1&&x>1&&x<12){const fade=(x*7+y*11)%7;ctx.fillStyle=fade<2?'#b9bec2':fade<4?'#6b747e':ink;ctx.fillRect(16+x*16,12+y*16,16,16);}
    }
  }else if(year===2022){
    for(let i=0;i<3;i++){
      ctx.save();ctx.translate(128,128);ctx.rotate(tau*i/3);ctx.beginPath();ctx.moveTo(-14,-117);ctx.lineTo(61,-65);ctx.lineTo(22,53);ctx.lineTo(-5,-6);ctx.closePath();
      const gradient=ctx.createLinearGradient(0,-100,50,50);gradient.addColorStop(0,'#d73778');gradient.addColorStop(.4,'#1ba0d6');gradient.addColorStop(.75,'#f3d23b');gradient.addColorStop(1,'#c63742');ctx.fillStyle=gradient;ctx.fill();ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke();
      ctx.strokeStyle='#fff';ctx.lineWidth=2;for(let k=0;k<6;k++){ctx.beginPath();ctx.moveTo(-8+k*6,-100+k*4);ctx.lineTo(27+k*3,-42);ctx.stroke();}ctx.restore();
    }
  }else if(year===2026){
    for(let i=0;i<3;i++){
      ctx.save();ctx.translate(128,128);ctx.rotate(tau*i/3);ctx.beginPath();ctx.moveTo(-21,13);ctx.bezierCurveTo(-71,-13,-94,-71,-39,-119);ctx.bezierCurveTo(-8,-78,49,-75,40,-35);ctx.bezierCurveTo(36,-15,8,5,-21,13);ctx.fillStyle=['#c93f42','#15967a','#2166bf'][i];ctx.fill();ctx.strokeStyle=gold;ctx.lineWidth=3;ctx.stroke();
      if(i===2)star(ctx,-24,-64,17,'#f7f4df');
      else if(i===0){star(ctx,-24,-64,18,'#f7f4df',7);ctx.fillStyle='#f7f4df';ctx.fillRect(-26,-62,4,26);}
      else{ctx.strokeStyle='#f7f4df';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-44,-77);ctx.quadraticCurveTo(-23,-44,-5,-77);ctx.moveTo(-24,-66);ctx.lineTo(-24,-48);ctx.stroke();}ctx.restore();
    }
  }
}

/** A curved decal, projected onto the sphere instead of a flat billboard. */
function curvedDecal(direction:THREE.Vector3,map:THREE.Texture,span=1.42){
  const geometry=new THREE.PlaneGeometry(span,span,28,28),p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i);const v=V(x,y,1).normalize().multiplyScalar(1.003);
    p.setXYZ(i,v.x,v.y,v.z);
  }geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map,transparent:true,alphaTest:.035,roughness:.58,depthWrite:true,polygonOffset:true,polygonOffsetFactor:-1}));
  mesh.quaternion.setFromUnitVectors(V(0,0,1),direction.clone().normalize());return mesh;
}

function leatherBall(group:THREE.Group,index:number){
  const edition=footballEditions[index];
  const colors=['#8d603a','#986d41','#af8754','#875d39','#ad7846','#cfad70','#eeeadc','#c6a575','#bc572f'];
  const color=colors[index];
  const texture=canvasTexture(ctx=>{
    ctx.fillStyle=color;ctx.fillRect(0,0,256,256);grain(ctx,false);
    ctx.strokeStyle='rgba(42,25,12,.65)';ctx.lineWidth=2.6;
    // The period's long leather strips: different orientations/widths per era.
    const count=index===6?4:3;
    for(let y=0;y<2;y++)for(let x=0;x<3;x++){
      const w=256/3,h=128;ctx.strokeRect(x*w,y*h,w,h);
      for(let strip=1;strip<count;strip++){
        ctx.beginPath();
        if((x+y+index)%2===0){ctx.moveTo(x*w+strip*w/count,y*h);ctx.lineTo(x*w+strip*w/count,(y+1)*h);}
        else{ctx.moveTo(x*w,y*h+strip*h/count);ctx.lineTo((x+1)*w,y*h+strip*h/count);}ctx.stroke();
      }
    }
  },512);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1,80,56),new THREE.MeshStandardMaterial({map:texture,roughness:.82,bumpMap:texture,bumpScale:.008})));
  if(edition.year<=1938){
    // Raised cotton/laced valve closure characteristic of the earliest balls.
    const laceMaterial=new THREE.MeshStandardMaterial({color:index===2?'#d5bf90':'#513923',roughness:.9});
    for(let i=0;i<8;i++){
      const y=(i-3.5)*.052,z=Math.sqrt(1-y*y)+.009;
      const tube=new THREE.Mesh(new THREE.CapsuleGeometry(.011,.12,3,6),laceMaterial);tube.rotation.z=Math.PI/2;tube.position.set(0,y,z);group.add(tube);
    }
  }
}

/** Unit-radius ball centred at origin. Caller owns rotation and resource disposal. */
export function createFootball(index:number):THREE.Group{
  index=((Math.trunc(index)%footballEditions.length)+footballEditions.length)%footballEditions.length;
  const edition=footballEditions[index],group=new THREE.Group();
  group.name=`football-${edition.year}-${edition.name}`;
  group.userData={edition,stylized:true};
  if(edition.year<1970){leatherBall(group,index);return group;}
  if(edition.year<=1998){
    group.add(new THREE.Mesh(new THREE.SphereGeometry(.996,48,32),new THREE.MeshStandardMaterial({color:0x8c8c83,roughness:.8})));
    const textures=[panelTexture(edition.year,true),panelTexture(edition.year,false)];
    const materials=textures.map(map=>new THREE.MeshStandardMaterial({map,roughness:edition.year<1986?.68:.54,metalness:0}));
    for(const panel of classicPanels())group.add(new THREE.Mesh(sphericalPanel(panel.points),materials[panel.pentagon?0:1]));
  }else{
    const baseTexture=canvasTexture(ctx=>{ctx.fillStyle=edition.year===2002?'#f2e7cc':'#f7f7ef';ctx.fillRect(0,0,256,256);grain(ctx);});
    group.add(new THREE.Mesh(new THREE.SphereGeometry(1,80,56),new THREE.MeshStandardMaterial({map:baseTexture,roughness:.53,metalness:.015})));
    const graphic=canvasTexture(ctx=>modernGraphic(ctx,edition.year),512);
    const directions=[V(0,0,1),V(0,0,-1),V(1,0,0),V(-1,0,0),V(0,1,0),V(0,-1,0)];
    for(const direction of directions)group.add(curvedDecal(direction,graphic,edition.year===2014?1.7:1.6));
    // Fine thermal-bond groove curves. Modern panel outlines are artistic studies,
    // not claims of manufacturing-accurate 14/8/6/20/4-panel CAD reconstruction.
    const groove=new THREE.MeshStandardMaterial({color:0xb4b8b6,roughness:.8});
    for(let j=0;j<3;j++){
      const points:THREE.Vector3[]=[];
      for(let k=0;k<=96;k++){
        const a=k/96*tau;points.push(V(Math.cos(a),Math.sin(a),.075*Math.sin(4*a)).normalize().multiplyScalar(1.001));
      }
      const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true),128,.0028,3,true),groove);
      mesh.rotation.set(j===1?Math.PI/2:0,j===2?Math.PI/2:0,0);group.add(mesh);
    }
  }
  group.rotation.set(.12,.3,.1);return group;
}
