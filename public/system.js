// Recovery pages work without JavaScript; enhance only theme and navigation.
document.querySelectorAll('[data-home]').forEach(link=>link.addEventListener('click',event=>{
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 event.preventDefault();
 document.querySelector('.system-shell')?.classList.add('is-leaving');
 setTimeout(()=>location.assign(link.href),220);
}));
document.querySelector('[data-retry]')?.addEventListener('click',()=>location.reload());
