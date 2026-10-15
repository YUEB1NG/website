import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Point = [number, number];
type Land = {features:{geometry:{type:string;coordinates:number[][][]|number[][][][]}}[]};
let land:Land|undefined;
export async function prepareToyPlanets(){
  const response=await fetch('/models/land-110m.json');
  if(!response.ok)throw new Error('Continent geometry could not load');
  land=await response.json();
}
const rad=Math.PI/180;
const normal=(lon:number,lat:number)=>new THREE.Vector3(Math.sin(lon*rad)*Math.cos(lat*rad),Math.sin(lat*rad),Math.cos(lon*rad)*Math.cos(lat*rad));
const clay=(color:THREE.ColorRepresentation,extra:THREE.MeshPhysicalMaterialParameters={})=>new THREE.MeshPhysicalMaterial({color,roughness:.48,metalness:0,clearcoat:.22,clearcoatRoughness:.4,...extra});
const up=new THREE.Vector3(0,1,0);

/** Bake the little pieces into one draw call per material; no invisible instance matrices. */
class Workshop {
  group=new THREE.Group();
  private batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
  add(geometry:THREE.BufferGeometry,material:THREE.Material,position=new THREE.Vector3(),scale=new THREE.Vector3(1,1,1),quaternion=new THREE.Quaternion()){
    const g=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();
    g.applyMatrix4(new THREE.Matrix4().compose(position,quaternion,scale));
    // All baked parts use the same attribute layout within a material batch.
    g.deleteAttribute('uv');g.deleteAttribute('uv1');
    if(!this.batches.has(material))this.batches.set(material,[]);
    this.batches.get(material)!.push(g);
  }
  ball(material:THREE.Material,position:THREE.Vector3,scale:THREE.Vector3){this.add(new THREE.SphereGeometry(1,16,12),material,position,scale);}
  finish(){for(const [material,parts] of this.batches){const geometry=mergeGeometries(parts);parts.forEach(p=>p.dispose());if(geometry)this.group.add(new THREE.Mesh(geometry,material));}this.batches.clear();return this.group;}
}

function surfacePatch(out:number[],a:Point,b:Point,c:Point,radius:number,depth=0){
  const distance=(p:Point,q:Point)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
  const lengths=[distance(a,b),distance(b,c),distance(c,a)],longest=Math.max(...lengths);
  if(depth<14&&longest>8){
    const vertices=[a,b,c],i=lengths.indexOf(longest),p=vertices[i],q=vertices[(i+1)%3],opposite=vertices[(i+2)%3],mid:Point=[(p[0]+q[0])/2,(p[1]+q[1])/2];
    surfacePatch(out,p,mid,opposite,radius,depth+1);surfacePatch(out,mid,q,opposite,radius,depth+1);return;
  }
  const vertices=[a,b,c].map(p=>normal(...p).multiplyScalar(radius));
  if(new THREE.Vector3().subVectors(vertices[1],vertices[0]).cross(new THREE.Vector3().subVectors(vertices[2],vertices[0])).dot(vertices[0])<0)vertices.reverse();
  vertices.forEach(v=>out.push(v.x,v.y,v.z));
}
function geometryFrom(vertices:number[],radial=true){const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));if(radial){const normals:number[]=[];for(let i=0;i<vertices.length;i+=3){const v=new THREE.Vector3(...vertices.slice(i,i+3) as [number,number,number]).normalize();normals.push(v.x,v.y,v.z);}g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));}else g.computeVertexNormals();return g;}

function continents(work:Workshop){
  if(!land)return;
  const top:number[]=[],edge:number[]=[];
  for(const feature of land.features){
    const polygons=(feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates) as number[][][][];
    for(const polygon of polygons){
      const contour=polygon[0].slice(0,-1) as Point[];
      if(contour.length<4||contour.every(p=>p[1]<-59))continue;
      const points=contour.map(p=>new THREE.Vector2(...p));
      for(const face of THREE.ShapeUtils.triangulateShape(points,[]))surfacePatch(top,contour[face[0]],contour[face[1]],contour[face[2]],1.035);
      for(let i=0;i<contour.length;i++){
        const a=normal(...contour[i]),b=normal(...contour[(i+1)%contour.length]);
        const middle=a.clone().add(b).normalize();
        // Rounded sandy coastline: the bevel steps out just below the green plateau.
        const rows=[[a.clone().multiplyScalar(1.003),b.clone().multiplyScalar(1.003)],[a.clone().multiplyScalar(1.018).addScaledVector(a.clone().sub(middle),.35),b.clone().multiplyScalar(1.018).addScaledVector(b.clone().sub(middle),.35)],[a.clone().multiplyScalar(1.035),b.clone().multiplyScalar(1.035)]];
        for(let k=0;k<2;k++){const [v0,v1]=rows[k],[v2,v3]=rows[k+1];[v0,v1,v2,v2,v1,v3].forEach(v=>edge.push(v.x,v.y,v.z));}
      }
    }
  }
  const topGeometry=geometryFrom(top),colors:number[]=[];
  const grass=new THREE.Color('#65b85f'),desert=new THREE.Color('#ddbc70'),ice=new THREE.Color('#e4f3eb');
  for(let i=0;i<top.length;i+=3){const v=new THREE.Vector3(top[i],top[i+1],top[i+2]).normalize(),lat=Math.asin(v.y)/rad,lon=Math.atan2(v.x,v.z)/rad;
    const sand=(lat>12&&lat<33&&lon>-19&&lon<58)||(lat<-18&&lat>-31&&lon>115&&lon<142);
    const color=lat>68?ice:sand?desert:grass;colors.push(color.r,color.g,color.b);
  }
  topGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  work.add(topGeometry,clay(0xffffff,{vertexColors:true,roughness:.62}));
  work.add(geometryFrom(edge,false),clay('#dfbf7b',{side:THREE.DoubleSide}));
}

function earth(){
  const w=new Workshop();
  w.add(new THREE.SphereGeometry(1,72,48),clay('#12519b',{roughness:.42,clearcoat:.25,clearcoatRoughness:.4}));
  continents(w);
  const bark=clay('#a17c4b'),leaves=[clay('#2a925a'),clay('#7fc65c'),clay('#4aa968')];
  const treeLocations:Point[]=[[-125,49],[-117,54],[-103,52],[-84,43],[-76,47],[-95,29],[-68,-6],[-59,-13],[-51,-7],[-62,-22],[-69,-36],[9,48],[24,52],[38,57],[58,59],[89,58],[118,53],[133,45],[104,26],[114,32],[101,14],[29,-6],[22,-14],[35,-19],[139,-27],[149,-34],[-6,8],[18,5]];
  treeLocations.forEach(([lon,lat],i)=>{
    const n=normal(lon,lat),q=new THREE.Quaternion().setFromUnitVectors(up,n),size=.8+(i%3)*.12;
    w.add(new THREE.CylinderGeometry(.009,.013,.08,8),bark,n.clone().multiplyScalar(1.066),new THREE.Vector3(1,1,1),q);
    const crown=n.clone().multiplyScalar(1.12);w.ball(leaves[i%3],crown,new THREE.Vector3(.047,.057,.047).multiplyScalar(size));
    const offset=new THREE.Vector3(.026,0,0).applyQuaternion(q);w.ball(leaves[(i+1)%3],crown.clone().add(offset).addScaledVector(n,-.014),new THREE.Vector3(.032,.038,.032).multiplyScalar(size));
  });
  const stone=clay('#f3dbad'),roof=clay('#df956f'),glass=clay('#5998aa',{roughness:.3});
  const cities:Point[]=[[-74,41],[-122,37],[-47,-23],[2,49],[31,30],[77,28],[121,31],[139,36],[151,-34]];
  cities.forEach(([lon,lat],i)=>{
    const n=normal(lon,lat),q=new THREE.Quaternion().setFromUnitVectors(up,n),h=.075+(i%3)*.026;
    w.add(new RoundedBoxGeometry(.043,h,.04,2,.007),i%3===0?glass:stone,n.clone().multiplyScalar(1.035+h/2),new THREE.Vector3(1,1,1),q);
    const side=new THREE.Vector3(.045,0,0).applyQuaternion(q);
    w.add(new RoundedBoxGeometry(.035,.045,.04,2,.006),stone,n.clone().multiplyScalar(1.06).add(side),new THREE.Vector3(1,1,1),q);
    w.add(new THREE.ConeGeometry(.034,.028,4),roof,n.clone().multiplyScalar(1.09).add(side),new THREE.Vector3(1,1,1),q);
  });
  const mountain=clay('#b5ba9b'),snow=clay('#fff4df');
  [[83,32],[90,31],[-71,-25],[-116,43],[8,46]].forEach(([lon,lat],i)=>{const n=normal(lon,lat),q=new THREE.Quaternion().setFromUnitVectors(up,n);w.add(new THREE.ConeGeometry(.045,.11,7),mountain,n.clone().multiplyScalar(1.075),new THREE.Vector3(1,1,1),q);w.add(new THREE.ConeGeometry(.022,.051,7),snow,n.clone().multiplyScalar(1.109),new THREE.Vector3(1,1,1),q);});
  // Polar caps have volume and rounded edges, rather than a white decal.
  w.add(new THREE.SphereGeometry(1.012,48,24,0,Math.PI*2,0,.18),snow);
  w.add(new THREE.SphereGeometry(1.012,48,24,0,Math.PI*2,Math.PI-.24,.24),snow);
  const group=w.finish(),clouds=new Workshop(),pink=clay('#f6b7c1',{roughness:.7,clearcoat:.08});
  [[-33,33],[48,9],[-105,5],[163,29],[-151,-24],[67,-36],[13,-47],[-61,65],[108,62]].forEach(([lon,lat],i)=>{
    const n=normal(lon,lat),q=new THREE.Quaternion().setFromUnitVectors(up,n);
    [-1,0,1].forEach((offset,j)=>{const p=new THREE.Vector3(offset*.058,j===1?.024:0,0).applyQuaternion(q).addScaledVector(n,1.12);clouds.add(new THREE.SphereGeometry(1,14,10),pink,p,new THREE.Vector3(.065,j===1?.055:.039,.04),q);});
  });
  const cloudGroup=clouds.finish();group.add(cloudGroup);group.userData.clouds=cloudGroup;
  group.rotation.y=1.1;
  return group;
}

function craterGeometry(radius:number,depth:number){
  // Bowl and soft raised lip in one continuous, concave surface of revolution.
  const points=[new THREE.Vector2(0,-depth),new THREE.Vector2(radius*.28,-depth*.92),new THREE.Vector2(radius*.6,-depth*.55),new THREE.Vector2(radius*.83,depth*.08),new THREE.Vector2(radius*.96,depth*.25),new THREE.Vector2(radius*1.11,depth*.14),new THREE.Vector2(radius*1.28,0)];
  return new THREE.LatheGeometry(points,28);
}
function rocky(index:number){
  const w=new Workshop(),moon=index===8,mars=index===3;
  const base=clay(moon?'#b8c5ce':mars?'#d47751':'#a29b96',{roughness:.69,clearcoat:.1});
  const crater=clay(moon?'#acbac8':mars?'#b96343':'#8d8988',{roughness:.77,side:THREE.DoubleSide});
  // Slightly lower inner sphere lets each bowl actually dip below the outer crust.
  w.add(new THREE.SphereGeometry(.982,64,40),base);
  let seed=index*311+89;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  const holes:{n:THREE.Vector3;r:number}[]=[];
  for(let i=0;i<22;i++){const n=normal(rand()*360-180,Math.asin(rand()*1.7-.85)/rad),r=.065+rand()*.105;if(holes.some(h=>h.n.distanceTo(n)<(h.r+r)*1.5))continue;holes.push({n,r});}
  // The crust is cut around each bowl so it cannot fill in the crater cavity.
  const crust=new THREE.SphereGeometry(1,112,72).toNonIndexed(),p=crust.attributes.position,vertices:number[]=[];
  for(let i=0;i<p.count;i+=3){const center=new THREE.Vector3();for(let j=0;j<3;j++)center.add(new THREE.Vector3().fromBufferAttribute(p,i+j));center.normalize();if(holes.some(h=>center.distanceTo(h.n)<h.r*.95))continue;for(let j=0;j<3;j++)vertices.push(p.getX(i+j),p.getY(i+j),p.getZ(i+j));}
  crust.dispose();w.add(geometryFrom(vertices),base);
  holes.forEach(({n,r})=>w.add(craterGeometry(r,.035),crater,n.clone().multiplyScalar(.998),new THREE.Vector3(1,1,1),new THREE.Quaternion().setFromUnitVectors(up,n)));
  if(mars){const cap=clay('#f5d1a5');w.add(new THREE.SphereGeometry(1.008,48,20,0,Math.PI*2,0,.2),cap);}
  return w.finish();
}

function banded(index:number){
  const w=new Workshop();
  const palettes:Record<number,string[]>={1:['#e7b85f','#f7d687','#d9a259','#f4cf89','#e9ba68'],4:['#c27c58','#edd5b3','#dca77c','#f7e6cb','#d3946b','#dcb98e','#f3d8b4'],5:['#d3b179','#f4dfad','#e5c78c','#f7e6bd','#dcbc82'],6:['#79c5c9','#a3e0d8','#95d2d0','#bee8dd'],7:['#3869cf','#5587e0','#3f76d4','#6c9ce6']};
  const palette=palettes[index];
  const geometry=new THREE.SphereGeometry(1,96,64),p=geometry.attributes.position,colors:number[]=[];
  const shades=palette.map(c=>new THREE.Color(c));
  for(let i=0;i<p.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(p,i),lat=Math.asin(v.y),lon=Math.atan2(v.x,v.z);
    const wave=Math.sin(lon*3+lat*7)*.025+Math.sin(lon*7-lat*3)*.011;
    const stripe=(lat+Math.PI/2+wave)/Math.PI*(index===4?15:index===1?10:9),band=Math.floor(stripe),f=THREE.MathUtils.smoothstep(stripe-band,.65,1);
    const color=shades[((band%shades.length)+shades.length)%shades.length].clone().lerp(shades[(band+1)%shades.length],f);
    color.toArray(colors,i*3);const r=1+Math.sin(stripe*Math.PI*2)*.0028;p.setXYZ(i,v.x*r,v.y*r,v.z*r);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();w.add(geometry,clay(0xffffff,{vertexColors:true,roughness:.46}));
  if(index===4||index===7){const n=normal(10,-19),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),n);const colors=index===4?['#c77c59','#e0a078','#d88e65']:['#315cae','#4977c4','#3c69b5'];
    for(let i=0;i<3;i++)w.add(new THREE.SphereGeometry(1,32,16),clay(colors[i]),n.clone().multiplyScalar(1.005+i*.005),new THREE.Vector3(.21-i*.05,.10-i*.024,.018),q);
  }
  const group=w.finish();
  if(index===5||index===6){
    const rings=new THREE.Group(),material=clay(index===5?'#dbc19b':'#b2e1d7',{side:THREE.DoubleSide,roughness:.58,transparent:true,opacity:.94,depthWrite:false});
    const widths=index===5?[[1.24,1.34],[1.37,1.62],[1.66,1.77]]:[[1.26,1.29],[1.36,1.43]];
    widths.forEach(([inner,outer],i)=>{const g=new THREE.RingGeometry(inner,outer,128,2),m=material.clone();m.color.multiplyScalar(1-i*.065);const mesh=new THREE.Mesh(g,m);rings.add(mesh);});material.dispose();
    rings.rotation.set(index===5?1.08:.5,index===5?.13:.6,index===5?-.18:.7);group.add(rings);group.userData.rings=rings;
  }
  return group;
}

function sun(){
  const w=new Workshop(),gold=clay(0xffffff,{vertexColors:true,emissive:'#e7670c',emissiveIntensity:.3,roughness:.62,clearcoat:.1});
  const geometry=new THREE.SphereGeometry(1,96,64),p=geometry.attributes.position,colors:number[]=[],orange=new THREE.Color('#f8a020'),yellow=new THREE.Color('#ffd15a');
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),flow=Math.sin(x*17+Math.sin(y*12))*Math.sin(y*19+Math.cos(z*13))*Math.cos(z*15+x*6),r=1+flow*.006;p.setXYZ(i,x*r,y*r,z*r);orange.clone().lerp(yellow,flow*.4+.5).toArray(colors,i*3);}
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();w.add(geometry,gold);
  const coral=clay('#ffb64e',{emissive:'#e75d11',emissiveIntensity:.35});
  for(let i=0;i<8;i++){const n=normal(i*45,Math.sin(i*2)*40),q=new THREE.Quaternion().setFromUnitVectors(up,n);w.add(new THREE.TorusGeometry(.075,.012,8,32,Math.PI),coral,n.clone().multiplyScalar(1.005),new THREE.Vector3(1,1,1),q);}
  return w.finish();
}

export function createToyPlanet(index:number){
  const group=index===2?earth():[0,3,8].includes(index)?rocky(index):index===9?sun():banded(index);
  group.name=`toy-planet-${index}`;
  group.userData.style='miniature-clay';
  let vertices=0;group.traverse(o=>{if(o instanceof THREE.Mesh)vertices+=o.geometry.attributes.position.count;});group.userData.vertices=vertices;
  return group;
}
