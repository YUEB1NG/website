/** Local device time, without location permission or a network dependency. */
export const themeForHour=(hour:number)=>hour>=7&&hour<19?'day':'night';
export function syncTheme(){
  const theme=themeForHour(new Date().getHours());
  const color=theme==='day'?'#f4f6fa':'#000000';
  document.documentElement.dataset.theme=theme;
  document.documentElement.style.backgroundColor=color;
  document.body.style.backgroundColor=color;
  document.documentElement.style.colorScheme=theme==='day'?'light':'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);
  return theme;
}
syncTheme();
setInterval(syncTheme,60_000);
window.addEventListener('pageshow',syncTheme);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncTheme();});
