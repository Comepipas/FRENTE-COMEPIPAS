
const SITE_SETTINGS_KEY = "frente_site_settings_v1";

function getSiteSettings(){
  try{
    return JSON.parse(localStorage.getItem(SITE_SETTINGS_KEY)) || window.FRENTE_SITE_SETTINGS || {};
  }catch{
    return window.FRENTE_SITE_SETTINGS || {};
  }
}

function saveSiteSettings(settings){
  localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(settings));
}

function applySiteSettings(){
  const S = getSiteSettings();

  const map = {
    nombre: '[data-config="nombre"]',
    subtitulo: '[data-config="subtitulo"]',
    lema: '[data-config="lema"]',
    temporada: '[data-config="temporada"]',
    fundacion: '[data-config="fundacion"]',
    email: '[data-config="email"]',
    telefono: '[data-config="telefono"]',
    direccion: '[data-config="direccion"]',
    ciudad: '[data-config="ciudad"]'
  };

  Object.entries(map).forEach(([key,selector])=>{
    document.querySelectorAll(selector).forEach(el=>{
      el.textContent = S[key] ?? "";
      if(el.tagName==="A"){
        if(key==="email" && S.email) el.href=`mailto:${S.email}`;
        if(key==="telefono" && S.telefono) el.href=`tel:${S.telefono}`;
      }
    });
  });

  const imageSrc=(value,folder)=>!value?"":(/^(data:|https?:|blob:)/.test(value)?value:`assets/images/${folder}/${value}`);
  const hero=document.querySelector(".hero");
  if(hero&&S.heroImage){
    hero.style.backgroundImage=`linear-gradient(90deg,rgba(0,18,43,.93),rgba(0,24,55,.55)), url("${imageSrc(S.heroImage,"hero")}")`;
    hero.style.backgroundPosition=S.heroPosition||"center center";
  }
  document.querySelectorAll('img[src*="escudo-transparente.png"],[data-site-image="escudo"]').forEach(img=>img.src=imageSrc(S.escudo||"escudo-transparente.png","brand"));
  document.querySelectorAll('img[src*="don-comepipas-transparente.png"],[data-site-image="logo"]').forEach(img=>img.src=imageSrc(S.logo||"don-comepipas-transparente.png","brand"));
  if(S.favicon){
    let icon=document.querySelector('link[rel="icon"]');
    if(!icon){icon=document.createElement("link");icon.rel="icon";document.head.appendChild(icon)}
    icon.href=imageSrc(S.favicon,"brand");
  }

  document.documentElement.style.setProperty("--azul", S.colorPrimario || "#0057B8");
  document.documentElement.style.setProperty("--azul-oscuro", S.colorSecundario || "#002B5C");
  document.documentElement.style.setProperty("--dorado", S.colorAcento || "#FFD447");

  if(S.nombre){
    document.title = document.title.replace(/Frente Comepipas/g,S.nombre);
  }
}

document.addEventListener("DOMContentLoaded",applySiteSettings);
