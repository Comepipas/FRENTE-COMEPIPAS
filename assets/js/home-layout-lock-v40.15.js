(function(){
  'use strict';
  let applying=false;
  function enforceFinalHomeOrder(){
    if(applying)return;applying=true;
    try{
      const main=document.querySelector('main'),material=document.querySelector('.v115-shop-section'),join=document.querySelector('.v115-join-section');
      if(main&&material&&join){
        const sections=Array.from(main.children).filter(element=>element.tagName==='SECTION');
        const last=sections[sections.length-1],penultimate=sections[sections.length-2];
        if(penultimate!==material||last!==join){main.append(material,join)}
      }
      const actions=document.querySelector('.v10-hero-actions');
      actions?.querySelectorAll('a[href*="alta-socio"]').forEach(link=>link.remove());
      const memberAccess=actions?.querySelector('a[href*="socios.html"]');
      if(memberAccess){memberAccess.textContent='Área de socios';memberAccess.classList.add('v10-btn-primary');memberAccess.classList.remove('v10-btn-ghost')}
    }finally{applying=false}
  }
  document.addEventListener('DOMContentLoaded',()=>{
    enforceFinalHomeOrder();
    [100,500,1500,3000].forEach(delay=>setTimeout(enforceFinalHomeOrder,delay));
    const main=document.querySelector('main');
    if(main)new MutationObserver(enforceFinalHomeOrder).observe(main,{childList:true});
  });
  document.addEventListener('frente:cms-loaded',enforceFinalHomeOrder);
  document.addEventListener('frente:site-settings-loaded',enforceFinalHomeOrder);
})();
