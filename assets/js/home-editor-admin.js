const labels={hero:'Hero',intro:'Presentación',counters:'Contadores',quickLinks:'Accesos rápidos',featuredTrip:'Próximo viaje',match:'Próximos partidos',news:'Noticias',gallery:'Galería',sponsors:'Patrocinadores',socials:'Redes sociales'};
function homeMessage(text,error=false){const element=document.getElementById('homeEditorMessage');if(element){element.textContent=text;element.style.color=error?'#b42318':''}}
function fillHomeEditor(settings){
  const form=document.getElementById('homeEditorForm');
  ['hero','intro','colors'].forEach(group=>Object.entries(settings[group]||{}).forEach(([key,value])=>{if(form.elements[`${group}.${key}`])form.elements[`${group}.${key}`].value=value??''}));
  const rows=document.getElementById('homeBlocksEditor');
  rows.innerHTML=Object.entries(settings.blocks||{}).sort((a,b)=>a[1].order-b[1].order).map(([key,value])=>`<div class="home-editor-block"><strong>${labels[key]||key}</strong><label><input type="checkbox" data-enabled="${key}" ${value.enabled!==false?'checked':''}> Visible</label><input type="number" value="${value.order}" data-order="${key}"></div>`).join('');
}
function collectHomeEditor(){
  const form=document.getElementById('homeEditorForm'),settings=getHomeEditorSettings(),data=new FormData(form),output=window.FrenteSharedContent.merge(settings,{});
  for(const [key,value] of data.entries()){const [group,name]=key.split('.');if(output[group])output[group][name]=value}
  document.querySelectorAll('[data-enabled]').forEach(element=>output.blocks[element.dataset.enabled]={...(output.blocks[element.dataset.enabled]||{}),enabled:element.checked});
  document.querySelectorAll('[data-order]').forEach(element=>output.blocks[element.dataset.order]={...(output.blocks[element.dataset.order]||{}),order:+element.value||99});
  return output;
}
document.addEventListener('DOMContentLoaded',async()=>{
  if(window.protectAdminPage&&!protectAdminPage('dashboard'))return;
  const form=document.getElementById('homeEditorForm'),submit=form?.querySelector('[type="submit"]');
  if(submit)submit.disabled=true;homeMessage('Cargando la portada compartida desde Supabase…');
  const result=await loadHomeEditorSettings();fillHomeEditor(result.value);
  homeMessage(result.source==='supabase'?'Portada compartida cargada desde Supabase.':'No se pudo leer Supabase; se muestra la copia disponible.',result.source!=='supabase');
  if(submit)submit.disabled=false;
  document.getElementById('heroImageFile')?.addEventListener('change',event=>{if(event.target.files?.[0])homeMessage('Imagen seleccionada. Se subirá a Supabase al publicar.')});
  form?.addEventListener('submit',async event=>{
    event.preventDefault();if(submit)submit.disabled=true;homeMessage('Publicando para todos los dispositivos…');
    try{
      const output=collectHomeEditor(),file=document.getElementById('heroImageFile')?.files?.[0];
      if(file)output.hero.image=await window.FrenteSharedContent.upload(file,'portada');
      const saved=await saveHomeEditorSettings(output);fillHomeEditor(saved.content);applyHomeEditor(saved.content);
      homeMessage(`Publicado en Supabase (${new Date(saved.updated_at).toLocaleString('es-ES')}). Ya es visible en todos los dispositivos.`);
      document.getElementById('homePreviewFrame')?.contentWindow?.location.reload();
    }catch(error){console.error(error);homeMessage(error.message||'No se pudo publicar.',true)}finally{if(submit)submit.disabled=false}
  });
  document.getElementById('resetHomeEditor')?.addEventListener('click',async()=>{
    if(!confirm('¿Restaurar y publicar el diseño original para todos?'))return;
    try{const saved=await saveHomeEditorSettings(homeEditorDefaults());fillHomeEditor(saved.content);homeMessage('Diseño original publicado para todos los dispositivos.')}catch(error){homeMessage(error.message,true)}
  });
});
