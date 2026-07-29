(function(){
  'use strict';

  const $=id=>document.getElementById(id);
  const cid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const PUBLIC_BUCKET=window.FRENTE_SUPABASE_CONFIG?.storageBuckets?.publicImages||'public-images';
  const src=value=>cmsImageSrc(value,'assets/images/patrocinadores/');

  function message(id,text,isError=false){
    const el=$(id);if(!el)return;
    el.textContent=text;
    el.classList.toggle('is-error',!!isError);
  }

  async function optimizeImage(file,{maxWidth=1800,maxHeight=1200,quality=.84,contain=false}={}){
    if(!file||!file.type.startsWith('image/'))throw new Error('Selecciona un archivo de imagen válido.');
    if(file.size>20*1024*1024)throw new Error('La imagen es demasiado grande. El máximo permitido es 20 MB.');
    const bitmap=await createImageBitmap(file);
    const ratio=Math.min(1,maxWidth/bitmap.width,maxHeight/bitmap.height);
    const width=Math.max(1,Math.round(bitmap.width*ratio));
    const height=Math.max(1,Math.round(bitmap.height*ratio));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:true});
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    if(contain){ctx.clearRect(0,0,width,height)}
    ctx.drawImage(bitmap,0,0,width,height);bitmap.close?.();
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo optimizar la imagen.')),'image/webp',quality));
    const dataUrl=canvas.toDataURL('image/webp',quality);
    return {blob,dataUrl,width,height};
  }

  async function uploadPublicImage(blob,folder){
    if(!window.FrenteSupabase?.configured?.())throw new Error('Supabase no está configurado.');
    const {client}=await window.FrenteSupabase.init();
    const path=`cms/${folder}/${crypto.randomUUID()}.webp`;
    const up=await client.storage.from(PUBLIC_BUCKET).upload(path,blob,{cacheControl:'31536000',contentType:'image/webp',upsert:false});
    if(up.error)throw up.error;
    const pub=client.storage.from(PUBLIC_BUCKET).getPublicUrl(path);
    if(!pub?.data?.publicUrl)throw new Error('No se pudo obtener la dirección pública de la imagen.');
    return {url:pub.data.publicUrl,path};
  }

  async function persistImage(optimized,folder){
    try{return await uploadPublicImage(optimized.blob,folder)}
    catch(error){
      console.warn('[Commit 38.9.1] Se usa almacenamiento local optimizado:',error);
      return {url:optimized.dataUrl,path:null,local:true};
    }
  }

  function safeSave(data){
    try{saveCmsHomeData(data);return true}
    catch(error){
      console.error('[Commit 38.9.1] No se pudo guardar el CMS:',error);
      throw new Error(error?.name==='QuotaExceededError'?'No hay espacio suficiente en el navegador. Prueba de nuevo con Supabase conectado.':'No se pudieron guardar los cambios.');
    }
  }

  function render(){
    const c=getCmsHomeData();
    const sponsors=[...(c.sponsors||[])].sort((a,b)=>(+a.order||0)-(+b.order||0));
    $('cmsSponsorsCount').textContent=sponsors.filter(s=>s.active).length;
    $('cmsSocialCount').textContent=Object.values(c.socials||{}).filter(v=>String(v||'').trim()).length;
    const mat=c.images?.material||c.images?.quickStore||'';
    $('cmsMaterialStatus').textContent=mat?'Configurada':'Sin configurar';
    const mp=$('cmsMaterialPreview');if(mp){mp.src=cmsImageSrc(mat,'assets/images/home/')||'assets/images/home/tienda.jpg';}
    $('cmsSponsorsBody').innerHTML=sponsors.map(s=>`<tr><td><img class="cms-table-logo" src="${src(s.image)}" alt="${s.name||'Patrocinador'}"></td><td><strong>${s.name||'-'}</strong></td><td>${s.url&&s.url!=='#'?`<a href="${s.url}" target="_blank" rel="noopener">Abrir web</a>`:'-'}</td><td>${s.order||0}</td><td><span class="cms-status ${s.active?'is-active':'is-hidden'}">${s.active?'Visible':'Oculto'}</span></td><td><button type="button" data-es="${s.id}">Editar</button><button type="button" class="danger" data-ds="${s.id}">Eliminar</button></td></tr>`).join('');
    $('cmsSponsorsEmpty').hidden=!!sponsors.length;
    document.querySelectorAll('[data-es]').forEach(b=>b.onclick=()=>openSponsor(b.dataset.es));
    document.querySelectorAll('[data-ds]').forEach(b=>b.onclick=()=>{if(confirm('¿Eliminar este patrocinador?')){const d=getCmsHomeData();d.sponsors=(d.sponsors||[]).filter(x=>x.id!==b.dataset.ds);safeSave(d);render()}});
    const f=$('cmsSettingsForm');Object.entries(c.socials||{}).forEach(([k,v])=>{if(f?.elements[`socials.${k}`])f.elements[`socials.${k}`].value=v||''});
  }

  function openSponsor(id=''){
    const f=$('cmsSponsorForm');f.reset();f.elements.id.value='';f.elements.image.value='';f.dataset.pendingPath='';
    let item=null;if(id)item=(getCmsHomeData().sponsors||[]).find(x=>x.id===id);
    if(item)Object.entries(item).forEach(([k,v])=>{const el=f.elements[k];if(el)el.type==='checkbox'?el.checked=!!v:el.value=v??''});
    else{f.elements.active.checked=true;f.elements.order.value=(getCmsHomeData().sponsors?.length||0)+1}
    const image=f.elements.image.value,preview=$('cmsSponsorPreview');preview.src=src(image);preview.hidden=!image;$('cmsSponsorPreviewText').hidden=!!image;
    message('cmsSponsorMessage','');$('cmsSponsorModal').classList.add('open');
  }

  document.addEventListener('DOMContentLoaded',()=>{
    if(window.protectAdminPage&&!protectAdminPage('dashboard'))return;
    render();
    $('newCmsSponsor').onclick=()=>openSponsor();$('newCmsSponsorSecondary').onclick=()=>openSponsor();

    $('cmsSponsorFile').onchange=async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        message('cmsSponsorMessage','Optimizando logo...');
        const optimized=await optimizeImage(file,{maxWidth:1200,maxHeight:800,quality:.88,contain:true});
        const f=$('cmsSponsorForm');f.dataset.pendingData=optimized.dataUrl;f.dataset.pendingReady='1';
        $('cmsSponsorPreview').src=optimized.dataUrl;$('cmsSponsorPreview').hidden=false;$('cmsSponsorPreviewText').hidden=true;
        message('cmsSponsorMessage','Logo preparado. Pulsa Guardar patrocinador.');
      }catch(err){message('cmsSponsorMessage',err.message,true)}
    };

    $('cmsSponsorForm').onsubmit=async e=>{
      e.preventDefault();const f=e.currentTarget,button=f.querySelector('[type="submit"]');button.disabled=true;
      try{
        message('cmsSponsorMessage','Guardando patrocinador...');
        const d=Object.fromEntries(new FormData(f).entries()),c=getCmsHomeData();
        if(f.dataset.pendingReady==='1'){
          const response=await fetch(f.dataset.pendingData);const blob=await response.blob();
          const stored=await persistImage({blob,dataUrl:f.dataset.pendingData},'sponsors');d.image=stored.url;d.image_path=stored.path||'';
        }
        if(!d.image)throw new Error('Selecciona un logo antes de guardar.');
        d.active=f.elements.active.checked;d.order=+d.order||0;
        if(d.id)c.sponsors=(c.sponsors||[]).map(x=>x.id===d.id?{...x,...d}:x);else{d.id=cid('sponsor');(c.sponsors||(c.sponsors=[])).push(d)}
        safeSave(c);$('cmsSponsorModal').classList.remove('open');render();
      }catch(err){message('cmsSponsorMessage',err.message,true)}finally{button.disabled=false}
    };

    $('cmsMaterialFile').onchange=async e=>{
      const file=e.target.files?.[0];if(!file)return;
      try{
        message('cmsMaterialMessage','Optimizando imagen...');
        const optimized=await optimizeImage(file,{maxWidth:2000,maxHeight:1400,quality:.86});
        const preview=$('cmsMaterialPreview');preview.src=optimized.dataUrl;preview.dataset.pendingData=optimized.dataUrl;preview.dataset.pendingReady='1';
        message('cmsMaterialMessage','Vista previa preparada. Pulsa Guardar imagen de material.');
      }catch(err){message('cmsMaterialMessage',err.message,true)}
    };

    $('cmsMaterialForm').onsubmit=async e=>{
      e.preventDefault();const preview=$('cmsMaterialPreview'),button=e.currentTarget.querySelector('[type="submit"]');
      if(preview.dataset.pendingReady!=='1'){message('cmsMaterialMessage','Selecciona una imagen nueva.',true);return}
      button.disabled=true;
      try{
        message('cmsMaterialMessage','Subiendo y guardando imagen...');
        const response=await fetch(preview.dataset.pendingData);const blob=await response.blob();
        const stored=await persistImage({blob,dataUrl:preview.dataset.pendingData},'material');
        const c=getCmsHomeData();c.images=c.images||{};c.images.material=stored.url;c.images.material_path=stored.path||'';
        safeSave(c);delete preview.dataset.pendingData;delete preview.dataset.pendingReady;
        message('cmsMaterialMessage',stored.local?'Imagen guardada en este navegador.':'Imagen guardada correctamente y lista para la portada.');
        render();
      }catch(err){message('cmsMaterialMessage',err.message,true)}finally{button.disabled=false}
    };

    $('cmsSettingsForm').onsubmit=e=>{e.preventDefault();try{const c=getCmsHomeData(),d=Object.fromEntries(new FormData(e.currentTarget).entries());c.socials=c.socials||{};for(const[k,v]of Object.entries(d)){const n=k.split('.')[1];c.socials[n]=String(v||'').trim()}safeSave(c);message('cmsMessage','Redes sociales guardadas.');render()}catch(err){message('cmsMessage',err.message,true)}};
    document.querySelectorAll('.store-modal-close').forEach(b=>b.onclick=()=>b.closest('.store-modal').classList.remove('open'));
  });
})();
