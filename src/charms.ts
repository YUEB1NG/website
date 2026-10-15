import * as THREE from 'three';

// Original vector charms: compact rounded silhouettes, inspired by football Doodles.
const wrap=(body:string)=>`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 128 128"><g stroke="#243c56" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
export const charmSVGs=[
  wrap('<path fill="#edc76b" d="M51 19h26v8H51z"/><ellipse cx="64" cy="16" rx="9" ry="11" fill="none" stroke="#a4b6c6"/><path fill="#e3ac3a" d="M48 78q10-19-8-37l12-10 13 17 12-17 12 10q-21 20-9 37z"/><circle cx="64" cy="38" r="24" fill="#f8d977"/><path d="m49 21 7 11-9 7 10 7 4 12m14-41-4 12 12 9-6 12" fill="none" stroke="#ce9630"/><path fill="#138875" d="M44 78h40v13H44z"/><path fill="#edc76b" d="M38 91h52v16H38z"/><path d="M47 98h34" stroke="#fff0b2"/>'),
  wrap('<ellipse cx="35" cy="16" rx="8" ry="10" fill="none" stroke="#a4b6c6"/><path d="M35 27v85" stroke="#b5a48c" stroke-width="6"/><path d="M38 30q21-10 43-1t27-1v59q-18 8-34-1t-36 1z" fill="#87ceeb"/><path d="M38 49q22-10 43-1t27-1v21q-18 8-34-1t-36 1z" fill="#fff" stroke="none"/><circle cx="73" cy="57" r="6" fill="#efbd49" stroke="#efbd49"/>'),
  wrap('<ellipse cx="64" cy="14" rx="8" ry="10" fill="none" stroke="#a4b6c6"/><circle cx="64" cy="70" r="44" fill="#fffdf6"/><path fill="#283e54" d="m64 48 20 14-8 24H52l-8-24zM29 43l15 4-3 17-20 8m79-29-16 4 3 17 20 8M44 108l8-22m32 21-8-21M64 26v22"/><path d="m41 64 3-2m40 0 3 2M52 86l-25 8m49-8 25 8" fill="none"/>')
];
export const charmURLs=charmSVGs.map(svg=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));
export const teamBadgeURLs=[10,11,23,9,7,24].map(number=>{
  const keeper=number===23;
  const svg=wrap(`<ellipse cx="64" cy="14" rx="8" ry="10" fill="none" stroke="#b4bdc5"/><path d="m42 24 12 8h20l12-8 27 21-15 19-13-10v59H43V54L30 64 15 45Z" fill="${keeper?'#63b984':'#f8fcff'}"/><path d="M50 34v75m28-75v75" stroke="${keeper?'#4ca374':'#86cbeb'}" stroke-width="13"/><path d="m49 27 15 10 15-10" fill="none" stroke="#253d54" stroke-width="5"/><text x="64" y="88" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" font-weight="700" fill="#263c52" stroke="none">${number}</text><path d="m57 47 1-3 1 3 3 1-3 1-1 3-1-3-3-1Zm7-3 1-3 1 3 3 1-3 1-1 3-1-3-3-1Zm7 3 1-3 1 3 3 1-3 1-1 3-1-3-3-1Z" fill="#d9af4d" stroke="none"/>`);
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
});

export function makeConfettiTexture(){
  const canvas=document.createElement('canvas');canvas.width=16;canvas.height=16;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.roundRect(3,1,10,14,3);ctx.fill();
  return new THREE.CanvasTexture(canvas);
}
