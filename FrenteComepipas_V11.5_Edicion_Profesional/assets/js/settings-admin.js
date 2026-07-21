document.addEventListener("DOMContentLoaded",()=>{
  if(!protectAdminPage("dashboard")) return;

  const form=document.getElementById("siteSettingsForm");
  const settings=getSiteSettings();
  Object.entries(settings).forEach(([key,value])=>{if(form?.elements[key]) form.elements[key].value=value??""});

  const imageFields=[
    {file:"heroImageFile",field:"heroImage",preview:"heroImagePreview",max:1920,quality:.86,folder:"hero"},
    {file:"crestImageFile",field:"escudo",preview:"crestImagePreview",max:900,quality:.9,folder:"brand",preserve:true},
    {file:"logoImageFile",field:"logo",preview:"logoImagePreview",max:1000,quality:.9,folder:"brand",preserve:true},
    {file:"faviconImageFile",field:"favicon",preview:"faviconImagePreview",max:256,quality:.9,folder:"brand",preserve:true}
  ];

  const src=(value,folder)=>window.FrenteImageTools?.src(value,folder)||value||"";
  const refreshImagePreviews=()=>imageFields.forEach(item=>{
    const value=form.elements[item.field]?.value||"";
    const img=document.getElementById(item.preview);
    if(!img)return;
    img.src=src(value,item.folder);
    img.hidden=!value;
  });

  imageFields.forEach(item=>document.getElementById(item.file)?.addEventListener("change",async event=>{
    const file=event.target.files?.[0]; if(!file)return;
    try{
      const value=item.preserve && window.FrenteImageTools.readPreserve
        ? await window.FrenteImageTools.readPreserve(file,item.max)
        : await window.FrenteImageTools.read(file,item.max,item.quality);
      form.elements[item.field].value=value;
      refreshImagePreviews(); updateSettingsPreview();
    }catch(error){alert(error.message||"No se pudo cargar la imagen.")}
  }));

  refreshImagePreviews(); updateSettingsPreview();
  form?.addEventListener("input",updateSettingsPreview);
  form?.addEventListener("submit",event=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(form).entries());
    saveSiteSettings(data); applySiteSettings(); refreshImagePreviews(); updateSettingsPreview();
    const msg=document.getElementById("settingsSaved"); msg.textContent="Configuración e imágenes guardadas correctamente.";
    setTimeout(()=>msg.textContent="",2500);
  });
  document.getElementById("resetSiteSettings")?.addEventListener("click",()=>{
    if(confirm("¿Restaurar la configuración original?")){localStorage.removeItem(SITE_SETTINGS_KEY);location.reload()}
  });
});

function updateSettingsPreview(){
  const form=document.getElementById("siteSettingsForm"); if(!form)return;
  const data=Object.fromEntries(new FormData(form).entries());
  const source=(value,folder)=>window.FrenteImageTools?.src(value,folder)||value||"";
  document.getElementById("previewName").textContent=data.nombre||"Frente Comepipas";
  document.getElementById("previewSlogan").textContent=data.lema||"";
  document.getElementById("previewSeason").textContent=data.temporada||"";
  const hero=source(data.heroImage||"hero.jpg","hero");
  document.getElementById("previewHero").style.backgroundImage=`linear-gradient(rgba(0,27,60,.65),rgba(0,27,60,.78)),url("${hero}")`;
  document.getElementById("previewHero").style.backgroundPosition=data.heroPosition||"center center";
  document.getElementById("previewCrest").src=source(data.escudo||"escudo-transparente.png","brand");
  document.getElementById("previewHero").style.setProperty("--preview-primary",data.colorPrimario||"#0057B8");
  document.getElementById("previewHero").style.setProperty("--preview-accent",data.colorAcento||"#FFD447");
}
