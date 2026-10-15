const tau=Math.PI*2;
const radius=2.15,tilt=1.23,steps=512;
const rise=Math.cos(tilt),depth=Math.sin(tilt);
// Equal projected arc lengths keep portraits apart at the narrow ends of the ellipse.
const lengths=[0];
for(let i=1;i<=steps;i++){
  const a=(i-1)/steps*tau,b=i/steps*tau;
  lengths.push(lengths[i-1]+Math.hypot(Math.cos(b)-Math.cos(a),(Math.sin(b)-Math.sin(a))*rise));
}

export function portraitOrbit(phase:number){
  const distance=((phase/tau)%1+1)%1*lengths[steps];
  let lo=0,hi=steps;
  while(lo+1<hi){const mid=(lo+hi)>>1;if(lengths[mid]<distance)lo=mid;else hi=mid;}
  const a=(lo+(distance-lengths[lo])/(lengths[hi]-lengths[lo]))/steps*tau;
  const sin=Math.sin(a),near=(1-sin)/2;
  return {x:Math.cos(a)*radius,y:sin*radius*rise,z:-sin*radius*depth,size:.29+.14*near};
}
