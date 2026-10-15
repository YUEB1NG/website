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

/** Display order is independent of the stable historical asset indices. */
export const footballPlayOrder=footballEditions.map((_,index)=>index)
  .sort((a,b)=>footballEditions[b].year-footballEditions[a].year||a-b);

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

/** A padded spherical panel with a real rolled rim and recessed side wall. */
function sphericalPanel(points:THREE.Vector3[],warp=0){
  const center=points.reduce((a,p)=>a.add(p),V(0,0,0)).normalize();
  const right=points[0].clone().sub(center.clone().multiplyScalar(points[0].dot(center))).normalize();
  const up=center.clone().cross(right).normalize();
  const ordered=points.map(p=>p.clone()).sort((a,b)=>Math.atan2(a.dot(up),a.dot(right))-Math.atan2(b.dot(up),b.dot(right)));
  ordered.forEach(p=>p.lerp(center,.014).normalize());
  const extent=Math.max(...ordered.map(p=>Math.hypot(p.dot(right),p.dot(up))));
  const outline:THREE.Vector3[]=[];
  for(let i=0;i<ordered.length;i++){
    const previous=ordered[(i+ordered.length-1)%ordered.length],corner=ordered[i],next=ordered[(i+1)%ordered.length];
    const entry=corner.clone().lerp(previous,.065),exit=corner.clone().lerp(next,.065);
    for(let j=0;j<5;j++){
      const t=j/5;outline.push(entry.clone().multiplyScalar((1-t)**2).addScaledVector(corner,2*t*(1-t)).addScaledVector(exit,t*t).normalize());
    }
    const nextEntry=next.clone().lerp(corner,.065);
    for(let j=0;j<9;j++)outline.push(exit.clone().lerp(nextEntry,j/9).normalize());
  }
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  const deform=(v:THREE.Vector3)=>{
    // A smooth shared deformation makes modern boundaries flow across the ball.
    // Applying the same map to every patch preserves neighbouring edges.
    if(warp){const {x,y,z}=v;v.add(V(Math.sin(3*y+z),Math.sin(3*z+x),Math.sin(3*x+y)).multiplyScalar(warp)).normalize();}
    return v;
  };
  const emit=(direction:THREE.Vector3,radius:number)=>{
    uv.push(.5+direction.dot(right)/extent*.48,.5+direction.dot(up)/extent*.48);
    const p=deform(direction.clone()).multiplyScalar(radius);positions.push(p.x,p.y,p.z);
  };
  emit(center,1);
  // Densely sample the rounded rim so specular highlights roll over the edge.
  const rings=[.22,.43,.62,.78,.89,.94,.97,.988,1];
  for(const t of rings)for(const edge of outline){
    const bevel=THREE.MathUtils.smoothstep(t,.91,1);
    emit(center.clone().lerp(edge,t).normalize(),1-.005*t*t-.011*bevel);
  }
  const count=outline.length;
  for(let i=0;i<count;i++)indices.push(0,1+i,1+(i+1)%count);
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<count;i++){
    const a=1+r*count+i,b=1+r*count+(i+1)%count,c=a+count,d=b+count;
    indices.push(a,c,b,b,c,d);
  }
  const last=1+(rings.length-1)*count,side=positions.length/3;
  outline.forEach(p=>emit(p,.971));
  for(let i=0;i<count;i++){
    const next=(i+1)%count;indices.push(last+i,side+i,last+next,last+next,side+i,side+next);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function enamel(map?:THREE.Texture,color:THREE.ColorRepresentation=0xffffff,leather=false){
  return new THREE.MeshPhysicalMaterial({color,map:map??null,roughness:leather?.48:.34,metalness:0,
    clearcoat:leather?.2:.48,clearcoatRoughness:.33,specularIntensity:.7});
}

/** Spherical Voronoi construction: separate panels, never decal planes on a sphere. */
function modernPanels(year:number){
  const axes=[V(1,0,0),V(-1,0,0),V(0,1,0),V(0,-1,0),V(0,0,1),V(0,0,-1)];
  const corners:THREE.Vector3[]=[];
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])corners.push(V(x,y,z).normalize());
  let centers:THREE.Vector3[];
  if(year===2006)centers=[...axes,...corners];
  else if(year===2010)centers=corners;
  else if(year===2022){
    const ico=new THREE.IcosahedronGeometry(1,0),p=ico.getAttribute('position');centers=[];
    for(let i=0;i<p.count;i+=3)centers.push(V(p.getX(i)+p.getX(i+1)+p.getX(i+2),p.getY(i)+p.getY(i+1)+p.getY(i+2),p.getZ(i)+p.getZ(i+1)+p.getZ(i+2)).normalize());
    ico.dispose();
  }else if(year===2026)centers=[V(1,1,1),V(1,-1,-1),V(-1,1,-1),V(-1,-1,1)].map(v=>v.normalize());
  else centers=axes;
  return centers.map(center=>{
    const planes=centers.filter(c=>c!==center).map(c=>center.clone().sub(c).normalize()),points:THREE.Vector3[]=[];
    for(let i=0;i<planes.length;i++)for(let j=i+1;j<planes.length;j++){
      const cross=planes[i].clone().cross(planes[j]);if(cross.lengthSq()<1e-8)continue;cross.normalize();
      for(const sign of [-1,1]){
        const p=cross.clone().multiplyScalar(sign);
        if(planes.every(n=>p.dot(n)>-1e-6)&&!points.some(q=>q.distanceToSquared(p)<1e-8))points.push(p);
      }
    }return points;
  });
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
      else if(i===0){
        // Canada's maple leaf is part of Trionda's graphic, not a decorative star.
        ctx.save();ctx.translate(-24,-67);ctx.beginPath();
        const leaf=[[-2,24],[-2,11],[-17,13],[-13,6],[-24,-3],[-16,-5],[-18,-15],[-8,-10],[-7,-24],[0,-19],[7,-24],[8,-10],[18,-15],[16,-5],[24,-3],[13,6],[17,13],[2,11],[2,24]];
        leaf.forEach(([x,y],j)=>j?ctx.lineTo(x*.7,y*.7):ctx.moveTo(x*.7,y*.7));ctx.closePath();ctx.fillStyle='#f7f4df';ctx.fill();ctx.restore();
      }
      else{ctx.strokeStyle='#f7f4df';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-44,-77);ctx.quadraticCurveTo(-23,-44,-5,-77);ctx.moveTo(-24,-66);ctx.lineTo(-24,-48);ctx.stroke();}ctx.restore();
    }
  }
}

/** Project a cube's long leather strips onto a padded sphere. */
function leatherBall(group:THREE.Group,index:number){
  const edition=footballEditions[index];
  const colors=['#986d45','#a27a50','#b38a59','#976c45','#b78857','#d8b67c','#eee8d8','#ceb28a','#c97549'];
  const color=new THREE.Color(colors[index]);
  const map=canvasTexture(ctx=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);grain(ctx);});
  const materials=[-.035,0,.025].map(offset=>enamel(map,color.clone().offsetHSL(0,0,offset),true));
  const directions=[V(0,0,1),V(0,0,-1),V(1,0,0),V(-1,0,0),V(0,1,0),V(0,-1,0)];
  const stripCounts=index===1?[1,2,2,2,2,2]:index===2||index===3?[3,2,2,2,2,2]:index===6?[4,4,4,4,4,4]:index===8?[5,4,4,4,4,4]:index>=5?[3,3,3,3,3,3]:[2,2,2,2,2,2];
  directions.forEach((direction,face)=>{
    const quaternion=new THREE.Quaternion().setFromUnitVectors(V(0,0,1),direction);
    const strips=stripCounts[face];
    for(let strip=0;strip<strips;strip++){
      const lo=-1+2*strip/strips,hi=-1+2*(strip+1)/strips;
      const points=[V(lo,-1,1),V(hi,-1,1),V(hi,1,1),V(lo,1,1)];
      if(face%2)points.forEach(p=>{const x=p.x;p.x=p.y;p.y=-x;});
      points.forEach(p=>p.applyQuaternion(quaternion).normalize());
      const panel=new THREE.Mesh(sphericalPanel(points),materials[(strip+face)%3]);
      panel.name='padded-leather-panel';group.add(panel);
    }
  });
  if(edition.year<=1938){
    const laceMaterial=enamel(undefined,index===2?'#e3cfab':'#67472d',true);
    for(let i=0;i<8;i++){
      const y=(i-3.5)*.052,z=Math.sqrt(1-y*y)+.003;
      const tube=new THREE.Mesh(new THREE.CapsuleGeometry(.009,.12,3,6),laceMaterial);
      tube.rotation.z=Math.PI/2;tube.position.set(0,y,z);group.add(tube);
    }
  }
  group.userData.panelCount=stripCounts.reduce((a,b)=>a+b,0);
}

/** Unit-radius toy football centred at origin. Caller owns rotation and disposal. */
export function createFootball(index:number):THREE.Group{
  index=Number.isFinite(index)?((Math.trunc(index)%footballEditions.length)+footballEditions.length)%footballEditions.length:footballPlayOrder[0];
  const edition=footballEditions[index],group=new THREE.Group();
  group.name=`football-${edition.year}-${edition.name}`;
  group.userData={edition,stylized:true,construction:'individual-rounded-panels'};
  // This low core is visible only deep in the seams; it is not the ball's skin.
  group.add(new THREE.Mesh(new THREE.SphereGeometry(.973,48,32),new THREE.MeshStandardMaterial({color:edition.year<1970?0x6e4f35:0x8f9390,roughness:.8})));
  if(edition.year<1970){leatherBall(group,index);}
  else if(edition.year<=2002){
    const textures=[panelTexture(edition.year,true),panelTexture(edition.year,false)];
    const materials=textures.map(map=>enamel(map));
    let feverMaterial:THREE.MeshPhysicalMaterial|undefined;
    if(edition.year===2002){
      feverMaterial=enamel(canvasTexture(ctx=>{ctx.fillStyle='#f4ecd7';ctx.fillRect(0,0,256,256);modernGraphic(ctx,2002);grain(ctx);},512));
    }
    const panels=classicPanels();
    panels.forEach((panel,i)=>{
      const material=feverMaterial&&!panel.pentagon&&[12,17,23,28].includes(i)?feverMaterial:materials[panel.pentagon?0:1];
      const mesh=new THREE.Mesh(sphericalPanel(panel.points),material);mesh.name=panel.pentagon?'rounded-pentagon':'rounded-hexagon';group.add(mesh);
    });group.userData.panelCount=32;
  }else{
    const panels=modernPanels(edition.year);
    const graphic=canvasTexture(ctx=>{
      ctx.fillStyle='#f8f7ef';ctx.fillRect(0,0,256,256);modernGraphic(ctx,edition.year);grain(ctx);
    },512);
    const material=enamel(graphic);
    const plainMaterial=edition.year===2006?enamel(canvasTexture(ctx=>{ctx.fillStyle='#f8f7ef';ctx.fillRect(0,0,256,256);grain(ctx);})):material;
    panels.forEach((points,i)=>{
      const warp=edition.year===2006?.045:edition.year===2014?.095:edition.year===2026?.075:.035;
      const mesh=new THREE.Mesh(sphericalPanel(points,warp),edition.year===2006&&i<6?plainMaterial:material);
      mesh.name='rounded-bonded-panel';group.add(mesh);
    });group.userData.panelCount=panels.length;
  }
  group.rotation.set(.12,.3,.1);return group;
}
