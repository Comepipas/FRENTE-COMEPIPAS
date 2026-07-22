
document.addEventListener("DOMContentLoaded",async()=>{
  if(!window.FrenteAPI) return;

  try{
    const result=await window.FrenteAPI.init();
    document.documentElement.dataset.dataMode=result.mode;

    document.querySelectorAll("[data-mode-label]").forEach(el=>{
      el.textContent=result.mode==="online" ? "Modo online" : "Modo local";
    });

    document.querySelectorAll("[data-mode-status]").forEach(el=>{
      el.classList.toggle("is-online",result.mode==="online");
      el.classList.toggle("is-local",result.mode!=="online");
    });
  }catch(error){
    console.error("Error al iniciar la capa de datos:",error);
    document.documentElement.dataset.dataMode="local";
  }
});
