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
