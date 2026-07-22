window.FrenteNotify=(()=>{
 "use strict";
 function root(){let x=document.getElementById("fcNotifyRoot");if(!x){x=document.createElement("div");x.id="fcNotifyRoot";x.className="fc-notify-root";document.body.appendChild(x)}return x}
 function show(message,type="info",timeout=3800){const box=document.createElement("div");box.className=`fc-notify ${type}`;box.innerHTML=`<strong>${type==="success"?"Correcto":type==="error"?"Error":type==="warning"?"Aviso":"Información"}</strong><span></span>`;box.querySelector("span").textContent=message;root().appendChild(box);requestAnimationFrame(()=>box.classList.add("visible"));setTimeout(()=>{box.classList.remove("visible");setTimeout(()=>box.remove(),250)},timeout)}
 return {success:m=>show(m,"success"),error:m=>show(m,"error",6000),warning:m=>show(m,"warning"),info:m=>show(m,"info")};
})();