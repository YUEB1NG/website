export const REVEAL_DELAY=1000;
export const REVEAL_INTERVAL=2222;
const fade=300;

/** Absolute deadlines keep the cadence independent of frame rate and fade duration. */
export function revealCycle(elapsed:number,reduced=false){
  const step=elapsed<REVEAL_DELAY?0:reduced?1:1+Math.floor((elapsed-REVEAL_DELAY)/REVEAL_INTERVAL);
  const changedAt=step===0?0:REVEAL_DELAY+(step-1)*REVEAL_INTERVAL;
  const nextAt=step===0?REVEAL_DELAY:reduced?Infinity:REVEAL_DELAY+step*REVEAL_INTERVAL;
  const opacity=reduced?1:Math.min(1,step===0?1:Math.max(0,(elapsed-changedAt)/fade),Math.max(0,(nextAt-elapsed)/fade));
  return {step,opacity};
}
