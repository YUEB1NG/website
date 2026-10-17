/** Follow the device until the visitor explicitly chooses a theme. */
export type Theme='day'|'night';
const key='yueb1ng-theme';
const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
let manual:Theme|undefined;
try{const saved=localStorage.getItem(key);if(saved==='night'||saved==='day')manual=saved;}catch{}
let selected:Theme=manual??(systemTheme.matches?'night':'day');
export function syncTheme(){
  selected=manual??(systemTheme.matches?'night':'day');
  const color=selected==='day'?'#f4f6fa':'#000000';
  document.documentElement.dataset.theme=selected;
  document.documentElement.style.backgroundColor=color;
  document.body.style.backgroundColor=color;
  document.documentElement.style.colorScheme=selected==='day'?'light':'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);
  const button=document.querySelector('#theme-toggle');
  button?.setAttribute('aria-pressed',String(selected==='night'));
  button?.setAttribute('aria-label',selected==='day'?'切换到星空夜间模式':'切换到日间模式');
  return selected;
}
export function toggleTheme(){manual=selected==='day'?'night':'day';try{localStorage.setItem(key,manual);}catch{}return syncTheme();}
systemTheme.addEventListener('change',syncTheme);
syncTheme();
window.addEventListener('pageshow',syncTheme);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncTheme();});
