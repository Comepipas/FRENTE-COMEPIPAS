(function(){
  const $=id=>document.getElementById(id);
  const cid=p=>`${p}-${Date.now()}`;
  const src=value=>{const v=String(value||'').trim();if(!v)return '';if(/^(data:|blob:|https?:|\/)/i.test(v)||v.includes('/'))return v;return `assets/images/patrocinadores/${v}`};
  const fileToDataUrl=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(new Error('No se pudo leer la imagen.'));r.readAsDataURL(file)});
  function render(){
    const c=getCmsHomeData();
    const sponsors=(c.sponsors||[]).sort((a,b)=>(+a.order||0)-(+b.order||0));
    $('cmsSponsorsCount').textContent=sponsors.filter(s=>s.active).length;
    $('cmsSocialCount').textContent=Object.values(c.socials||{}).filter(v=>String(v||'').trim()).length;
    const mat=c.images?.material||c.images?.quickStore||'';
    $('cmsMaterialStatus').textContent=mat?'Configurada':'Sin configurar';
    const mp=$('cmsMaterialPreview'); if(mp){mp.src=mat||'assets/images/home/tienda.jpg';}
    $('cmsSponsorsBody').innerHTML=sponsors.map(s=>`<tr><td><img class="cms-table-logo" src="${src(s.image)}" alt="${s.name||'Patrocinador'}"></td><td><strong>${s.name||'-'}</strong></td><td>${s.url?`<a href="${s.url}" target="_blank" rel="noopener">Abrir web</a>`:'-'}</td><td>${s.order||0}</td><td><span class="cms-status ${s.active?'is-active':'is-hidden'}">${s.active?'Visible':'Oculto'}</span></td><td><button data-es="${s.id}">Editar</button><button class="danger" data-ds="${s.id}">Eliminar</button></td></tr>`).join('');
    $('cmsSponsorsEmpty').hidden=!!sponsors.length;
    document.querySelectorAll('[data-es]').forEach(b=>b.onclick=()=>openSponsor(b.dataset.es));
    document.querySelectorAll('[data-ds]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este patrocinador?')){const d=getCmsHomeData();d.sponsors=(d.sponsors||[]).filter(x=>x.id!==b.dataset.ds);saveCmsHomeData(d);render()}});
    const f=$('cmsSettingsForm');Object.entries(c.socials||{}).forEach(([k,v])=>{if(f?.elements[`socials.${k}`])f.elements[`socials.${k}`].value=v||''});
  }
  function openSponsor(id=''){
    const f=$('cmsSponsorForm');f.reset();f.elements.id.value='';f.elements.image.value='';
    let item=null;if(id)item=(getCmsHomeData().sponsors||[]).find(x=>x.id===id);
    if(item)Object.entries(item).forEach(([k,v])=>{const el=f.elements[k];if(el)el.type==='checkbox'?el.checked=!!v:el.value=v??''});
    else{f.elements.active.checked=true;f.elements.order.value=(getCmsHomeData().sponsors?.length||0)+1}
    const image=f.elements.image.value;const preview=$('cmsSponsorPreview');preview.src=src(image);preview.hidden=!image;$('cmsSponsorPreviewText').hidden=!!image;
    $('cmsSponsorMessage').textContent='';$('cmsSponsorModal').classList.add('open');
  }
  document.addEventListener('DOMContentLoaded',()=>{
    if(window.protectAdminPage&&!protectAdminPage('dashboard'))return;
    render();
    $('newCmsSponsor').onclick=()=>openSponsor();$('newCmsSponsorSecondary').onclick=()=>openSponsor();
    $('cmsSponsorFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=await fileToDataUrl(file);const f=$('cmsSponsorForm');f.elements.image.value=data;$('cmsSponsorPreview').src=data;$('cmsSponsorPreview').hidden=false;$('cmsSponsorPreviewText').hidden=true}catch(err){$('cmsSponsorMessage').textContent=err.message}};
    $('cmsSponsorForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f).entries()),c=getCmsHomeData();if(!d.image){$('cmsSponsorMessage').textContent='Selecciona un logo antes de guardar.';return}d.active=f.elements.active.checked;d.order=+d.order||0;if(d.id)c.sponsors=(c.sponsors||[]).map(x=>x.id===d.id?{...x,...d}:x);else{d.id=cid('sponsor');(c.sponsors||(c.sponsors=[])).push(d)}saveCmsHomeData(c);$('cmsSponsorModal').classList.remove('open');render()};
    $('cmsMaterialFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=await fileToDataUrl(file);$('cmsMaterialPreview').src=data;$('cmsMaterialPreview').dataset.pending=data;$('cmsMaterialMessage').textContent='Vista previa preparada. Pulsa Guardar.'}catch(err){$('cmsMaterialMessage').textContent=err.message}};
    $('cmsMaterialForm').onsubmit=e=>{e.preventDefault();const data=$('cmsMaterialPreview').dataset.pending;if(!data){$('cmsMaterialMessage').textContent='Selecciona una imagen nueva.';return}const c=getCmsHomeData();c.images=c.images||{};c.images.material=data;saveCmsHomeData(c);delete $('cmsMaterialPreview').dataset.pending;$('cmsMaterialMessage').textContent='Imagen de material guardada.';render()};
    $('cmsSettingsForm').onsubmit=e=>{e.preventDefault();const c=getCmsHomeData(),d=Object.fromEntries(new FormData(e.currentTarget).entries());c.socials=c.socials||{};for(const[k,v]of Object.entries(d)){const n=k.split('.')[1];c.socials[n]=String(v||'').trim()}saveCmsHomeData(c);$('cmsMessage').textContent='Redes sociales guardadas.';render()};
    document.querySelectorAll('.store-modal-close').forEach(b=>b.onclick=()=>b.closest('.store-modal').classList.remove('open'));
  });
})();
