import './style.css';
import { opening } from './blueprint';

const app=document.querySelector<HTMLElement>('#wabi')!;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
app.inert=true;
if(!reduced)opening.start();
window.addEventListener('resize',()=>{if(opening.active)opening.measure();});
// The same sheet stays in place while the larger 3D module loads.
void import('./main').catch(error=>{
  console.error('Unable to start the scene',error);
  document.querySelector<HTMLElement>('#status')!.textContent='Unable to load the scene. Please reload.';
});
