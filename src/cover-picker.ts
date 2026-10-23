export type Cover={id:number;name:string;src:string;coverKey:string};
export const coverKey=(cover:Cover)=>{try{return new URL(cover.coverKey).pathname;}catch{return cover.coverKey;}};
/** Uniform random picks with artwork-level exclusion and a recent-display cooldown. */
export class CoverPicker {
 private pool:Cover[]=[];
 private recent:string[];
 private random:()=>number;
 constructor(pool:Cover[],recent:string[]=[],random= Math.random){this.random=random;this.recent=recent.slice(-55);this.update(pool);}
 update(pool:Cover[]){this.pool=[...new Map(pool.map(c=>[coverKey(c),c])).values()];}
 take(blocked:Set<string>){
  let history=this.recent;
  let eligible=this.pool.filter(c=>!blocked.has(coverKey(c))&&!history.includes(coverKey(c)));
  // Small playlists relax only the oldest history; visible/reserved art is never reused.
  while(!eligible.length&&history.length){history=history.slice(1);eligible=this.pool.filter(c=>!blocked.has(coverKey(c))&&!history.includes(coverKey(c)));}
  return eligible.length?eligible[Math.floor(this.random()*eligible.length)]:undefined;
 }
 shown(c:Cover){const key=coverKey(c);this.recent=[...this.recent.filter(k=>k!==key),key].slice(-55);}
 get history(){return [...this.recent];}
 get uniqueCount(){return this.pool.length;}
}
