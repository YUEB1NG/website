const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};
/** Prompt exit completes before the first line enters, even on a slow spring. */
export function entranceState(active:boolean,age:number,progress:number,reduced=false){
 if(reduced)return {prompt:active?0:1,rows:[active?1:0,active?1:0,active?1:0]};
 if(active){const prompt=Math.pow(1-clamp(age/.18),3);return {prompt,rows:[.23,.34,.45].map(delay=>smooth((age-delay)/.42))};}
 const prompt=1-smooth(progress/.12),body=smooth((progress-.18)/.55);
 return {prompt,rows:[body,body,body]};
}
