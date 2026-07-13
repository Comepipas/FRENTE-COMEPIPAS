
document.addEventListener("DOMContentLoaded",()=>{
  if(!protectAdminPage("dashboard")) return;

  const form = document.getElementById("siteSettingsForm");
  const S = getSiteSettings();

  Object.entries(S).forEach(([key,value])=>{
    if(form?.elements[key]) form.elements[key].value = value ?? "";
  });

  updateSettingsPreview();

  form?.addEventListener("input",updateSettingsPreview);

  form?.addEventListener("submit",event=>{
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    saveSiteSettings(data);
    applySiteSettings();
    updateSettingsPreview();
    document.getElementById("settingsSaved").textContent = "Configuración guardada correctamente.";
    setTimeout(()=>document.getElementById("settingsSaved").textContent="",2500);
  });

  document.getElementById("resetSiteSettings")?.addEventListener("click",()=>{
    if(confirm("¿Restaurar la configuración original?")){
      localStorage.removeItem(SITE_SETTINGS_KEY);
      location.reload();
    }
  });
});

function updateSettingsPreview(){
  const form = document.getElementById("siteSettingsForm");
  if(!form) return;

  const data = Object.fromEntries(new FormData(form).entries());

  document.getElementById("previewName").textContent = data.nombre || "Frente Comepipas";
  document.getElementById("previewSlogan").textContent = data.lema || "";
  document.getElementById("previewSeason").textContent = data.temporada || "";
  document.getElementById("previewHero").style.backgroundImage =
    `linear-gradient(rgba(0,27,60,.65),rgba(0,27,60,.78)),url("assets/images/hero/${data.heroImage || "hero.jpg"}")`;
  document.getElementById("previewHero").style.backgroundPosition = data.heroPosition || "center center";
  document.getElementById("previewCrest").src =
    `assets/images/brand/${data.escudo || "escudo-transparente.png"}`;

  document.getElementById("previewHero").style.setProperty("--preview-primary",data.colorPrimario || "#0057B8");
  document.getElementById("previewHero").style.setProperty("--preview-accent",data.colorAcento || "#FFD447");
}
