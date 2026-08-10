
document.addEventListener("DOMContentLoaded",()=>{
  const h=document.querySelector(".v10-header"),t=document.querySelector(".v10-menu-toggle"),
  n=document.querySelector(".v10-nav"),b=document.querySelector(".v10-nav-backdrop");
  const sync=()=>h?.classList.toggle("is-scrolled",scrollY>24);
  const close=()=>{n?.classList.remove("is-open");b?.classList.remove("is-open");document.body.classList.remove("nav-open");t?.setAttribute("aria-expanded","false")};
  sync();addEventListener("scroll",sync,{passive:true});
  t?.addEventListener("click",()=>n?.classList.contains("is-open")?close():(n?.classList.add("is-open"),b?.classList.add("is-open"),document.body.classList.add("nav-open"),t?.setAttribute("aria-expanded","true")));
  b?.addEventListener("click",close);n?.querySelectorAll("a").forEach(a=>a.addEventListener("click",close));
  addEventListener("keydown",e=>{if(e.key==="Escape")close()});
});
