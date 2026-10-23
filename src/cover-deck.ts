export type Cover={id:number;name:string;src:string;coverKey:string};
export function coverIdentity(cover:Cover){try{return new URL(cover.coverKey).pathname;}catch{return cover.coverKey;}}
/** A shuffled full-playlist deck, with simultaneous and recent-repeat protection. */
export class CoverDeck {
 private remaining:Cover[]=[];
 private recent:string[]=[];
 private songs:Cover[];
 private random:()=>number;
 constructor(songs:Cover[],random=()=>Math.random()){this.songs=songs;this.random=random;}
 update(songs:Cover[]){this.songs=songs;this.remaining=[];}
 private refill(){this.remaining=[...this.songs];for(let i=this.remaining.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.remaining[i],this.remaining[j]]=[this.remaining[j],this.remaining[i]];}}
 take(blocked:Set<string>):Cover|undefined {
  if(!this.remaining.length)this.refill();
  let index=this.remaining.findIndex(s=>!blocked.has(coverIdentity(s))&&!this.recent.includes(coverIdentity(s)));
  if(index<0)index=this.remaining.findIndex(s=>!blocked.has(coverIdentity(s)));
  // Defer blocked cards, preserving every song across the cycle.
  if(index<0){
   const deferred=this.remaining,ids=new Set(deferred.map(s=>s.id));this.refill();
   this.remaining=[...deferred,...this.remaining.filter(s=>!ids.has(s.id))];
   index=this.remaining.findIndex(s=>!blocked.has(coverIdentity(s))&&!this.recent.includes(coverIdentity(s)));
   if(index<0)index=this.remaining.findIndex(s=>!blocked.has(coverIdentity(s)));
   if(index<0)return;
  }
  const [song]=this.remaining.splice(index,1);this.recent.push(coverIdentity(song));if(this.recent.length>32)this.recent.shift();return song;
 }
 peek(count:number){return this.remaining.slice(0,count);}
 get uniqueCount(){return new Set(this.songs.map(coverIdentity)).size;}
}
