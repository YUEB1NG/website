export const REVEAL_DELAY=1000;
export const REVEAL_INTERVAL=2222;
const fade=300;

/** Absolute deadlines keep the cadence independent of frame rate and fade duration. */
export function revealCycle(elapsed:number,reduced=false,delay=REVEAL_DELAY,interval=REVEAL_INTERVAL){
  const step=elapsed<delay?0:reduced?1:1+Math.floor((elapsed-delay)/interval);
  const changedAt=step===0?0:delay+(step-1)*interval;
  const nextAt=step===0?delay:reduced?Infinity:delay+step*interval;
  const opacity=reduced?1:Math.min(1,step===0?1:Math.max(0,(elapsed-changedAt)/fade),Math.max(0,(nextAt-elapsed)/fade));
  return {step,opacity};
}

/** Draw one deadline per name change, never a new random value on each animation frame. */
export class RandomNameCycle {
  private step=0;
  private changedAt=0;
  private nextAt=Infinity;
  reset(now:number){this.step=0;this.changedAt=now;this.nextAt=now+this.delay();}
  private delay(){return 3000+Math.random()*3000;}
  read(now:number,reduced=false){
    if(now>=this.nextAt){
      this.step++;this.changedAt=now;
      // On resuming a hidden tab, show one change and schedule a full new interval.
      this.nextAt=reduced?Infinity:now+this.delay();
    }
    if(reduced&&this.step>0){this.step=1;this.nextAt=Infinity;}
    const opacity=reduced?1:Math.min(1,this.step===0?1:(now-this.changedAt)/fade,(this.nextAt-now)/fade);
    return {step:this.step,opacity:Math.max(0,opacity)};
  }
}
