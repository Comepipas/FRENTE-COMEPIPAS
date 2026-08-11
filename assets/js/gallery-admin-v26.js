document.addEventListener('DOMContentLoaded',()=>{
  const grid=document.querySelector('#galleryAdminGrid');
  const form=document.querySelector('#albumForm');
  const modal=document.querySelector('#albumModal');
  const photos=document.querySelector('#albumPhotosAdmin');
  const uploadForm=document.querySelector('#photoUploadForm');
  const filesInput=document.querySelector('#photoFiles');
  const albumFiles=document.querySelector('#albumFiles');
  const albumFilePreview=document.querySelector('#albumFilePreview');
  albumFilePreview?.insertAdjacentHTML('beforebegin','<div id="albumExistingPhotos"></div>');
  const albumExistingPhotos=document.querySelector('#albumExistingPhotos');
  let current=null;
  let pendingFiles=[];
  let pendingCoverIndex=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function showError(error, fallback='No se pudo completar la operación.'){
    console.error(error);
    alert(error?.message||fallback);
  }

  function resetPendingFiles(){
    pendingFiles=[];
    pendingCoverIndex=current?.photos?.length?null:0;
    if(albumFiles) albumFiles.value='';
    if(albumFilePreview) albumFilePreview.innerHTML='';
  }

  function renderExistingPhotos(){
    if(!albumExistingPhotos)return;
    const existing=current?.photos||[];
    albumExistingPhotos.innerHTML=existing.length?`<div class="album-existing-title"><strong>Fotografías guardadas (${existing.length})</strong><small>Se conservarán al añadir otras nuevas</small></div><div class="album-existing-photos">${existing.map(photo=>`<div class="album-existing-photo"><img src="${esc(photo.imagen_url)}" alt="${esc(photo.titulo||'Fotografía guardada')}">${current.portada_url===photo.imagen_url?'<span>Portada</span>':''}</div>`).join('')}</div>`:'';
  }

  function renderPendingFiles(){
    if(!albumFilePreview)return;
    if(!pendingFiles.length){albumFilePreview.innerHTML='';return;}
    albumFilePreview.innerHTML=pendingFiles.map((file,index)=>{
      const selected=index===pendingCoverIndex;
      return `<button type="button" class="album-preview-item ${selected?'is-cover':''}" data-preview-cover="${index}" aria-label="${selected?'Portada seleccionada':'Usar como portada'}">
        <img src="${URL.createObjectURL(file)}" alt="${esc(file.name)}">
        <span>${selected?'Portada':'Elegir portada'}</span>
      </button>`;
    }).join('');
    albumFilePreview.querySelectorAll('[data-preview-cover]').forEach(button=>{
      button.onclick=()=>{pendingCoverIndex=Number(button.dataset.previewCover);renderPendingFiles();};
    });
  }

  async function load(){
    const rows=await GalleryV26.albums(true);
    grid.innerHTML=rows.map(a=>`<article class="gallery-admin-card">
      <img src="${esc(a.portada_url||'assets/images/gallery/celebracion.jpg')}" alt="Portada de ${esc(a.titulo)}">
      <h3>${esc(a.titulo)}</h3>
      <p>${a.publicado?'Publicado':'Borrador'} · ${a.gallery_photos?.[0]?.count||0} fotos</p>
      <div class="gallery-admin-actions">
        <button class="btn btn-primary" data-edit="${a.id}">Editar</button>
        <button class="btn btn-dark-outline" data-photos="${a.id}">Fotos y portada</button>
        <button class="btn btn-outline" data-del="${a.id}">Eliminar</button>
      </div></article>`).join('')||'<p>No hay álbumes creados.</p>';
    grid.querySelectorAll('[data-edit]').forEach(b=>b.onclick=async()=>{
      try{
        const a=await GalleryV26.album(b.dataset.edit); current=a; resetPendingFiles();renderExistingPhotos();
        Object.keys(a).forEach(k=>{if(form.elements[k]) form.elements[k].type==='checkbox'?form.elements[k].checked=!!a[k]:form.elements[k].value=a[k]??''});
        modal.classList.add('open');
      }catch(error){showError(error)}
    });
    grid.querySelectorAll('[data-photos]').forEach(b=>b.onclick=()=>managePhotos(b.dataset.photos));
    grid.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('¿Eliminar este álbum y todas sus fotos?')){try{await GalleryV26.deleteAlbum(b.dataset.del);await load()}catch(error){showError(error)}}});
  }

  async function managePhotos(id){
    try{
      current=await GalleryV26.album(id);
      document.querySelector('#photoAlbumTitle').textContent=`Fotografías · ${current.titulo}`;
      photos.innerHTML=current.photos.length?current.photos.map(x=>{
        const cover=current.portada_url===x.imagen_url;
        return `<div class="photo-admin-item ${cover?'is-cover':''}">
          <div class="photo-admin-image"><img src="${esc(x.imagen_url)}" alt="${esc(x.titulo||'Fotografía')}">${cover?'<span class="photo-cover-badge">Portada</span>':''}</div>
          <div class="photo-admin-actions">
            <button class="btn btn-primary" data-cover="${x.id}" ${cover?'disabled':''}>${cover?'Portada actual':'Usar como portada'}</button>
            <button class="btn btn-outline" data-pdel="${x.id}">Eliminar</button>
          </div>
        </div>`;
      }).join(''):'<p class="cms-note">Todavía no has subido fotografías.</p>';
      photos.querySelectorAll('[data-cover]').forEach(b=>b.onclick=async()=>{
        const photo=current.photos.find(x=>x.id===b.dataset.cover); if(!photo)return;
        b.disabled=true; b.textContent='Guardando…';
        try{await GalleryV26.setCover(current.id,photo.imagen_url);await managePhotos(current.id);await load()}catch(error){showError(error);b.disabled=false;b.textContent='Usar como portada'}
      });
      photos.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=async()=>{
        const photo=current.photos.find(x=>x.id===b.dataset.pdel);
        if(!confirm('¿Eliminar esta fotografía?'))return;
        try{
          await GalleryV26.deletePhoto(b.dataset.pdel);
          if(photo&&current.portada_url===photo.imagen_url){
            const remaining=current.photos.filter(x=>x.id!==photo.id);
            await GalleryV26.setCover(current.id,remaining[0]?.imagen_url||'');
          }
          await managePhotos(id);await load();
        }catch(error){showError(error)}
      });
      document.querySelector('#photosModal').classList.add('open');
    }catch(error){showError(error)}
  }

  document.querySelector('#newAlbum').onclick=()=>{current=null;form.reset();form.elements.id.value='';resetPendingFiles();renderExistingPhotos();modal.classList.add('open')};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.store-modal').classList.remove('open'));
  albumFiles?.addEventListener('change',()=>{
    pendingFiles=[...albumFiles.files];
    pendingCoverIndex=current?.photos?.length?null:0;
    renderPendingFiles();
  });

  form.onsubmit=async e=>{
    e.preventDefault();
    const button=form.querySelector('button[type="submit"],button:not([type])');
    const original=button.textContent;
    button.disabled=true;button.textContent='Guardando…';
    try{
      const o=Object.fromEntries(new FormData(form));
      o.publicado=form.elements.publicado.checked;
      const saved=await GalleryV26.saveAlbum(o);
      const albumId=saved.id;
      const uploaded=[];
      for(let index=0;index<pendingFiles.length;index++){
        button.textContent=`Subiendo ${index+1} de ${pendingFiles.length}…`;
        const file=pendingFiles[index];
        const url=await GalleryV26.upload(albumId,file);
        await GalleryV26.addPhoto({album_id:albumId,imagen_url:url,titulo:file.name,orden:(current?.photos?.length||0)+index});
        uploaded.push(url);
      }
      if(uploaded.length&&(pendingCoverIndex!==null||!current?.portada_url)){
        const coverUrl=uploaded[Math.min(pendingCoverIndex,uploaded.length-1)];
        await GalleryV26.setCover(albumId,coverUrl);
      }
      modal.classList.remove('open');resetPendingFiles();await load();
      if(uploaded.length) await managePhotos(albumId);
    }catch(error){showError(error,'No se pudo guardar el álbum o subir las fotografías.')}
    finally{button.disabled=false;button.textContent=original;}
  };

  uploadForm.onsubmit=async e=>{
    e.preventDefault(); const fs=[...filesInput.files]; if(!current||!fs.length)return;
    const button=uploadForm.querySelector('button'); const original=button.textContent; button.disabled=true;
    try{
      for(let i=0;i<fs.length;i++){
        button.textContent=`Subiendo ${i+1} de ${fs.length}…`;
        const f=fs[i];
        const url=await GalleryV26.upload(current.id,f);
        await GalleryV26.addPhoto({album_id:current.id,imagen_url:url,titulo:f.name,orden:current.photos.length+i});
        if(!current.portada_url){await GalleryV26.setCover(current.id,url);current.portada_url=url;}
      }
      uploadForm.reset();await managePhotos(current.id);await load();
    }catch(error){showError(error,'No se pudieron subir las fotografías.')}
    finally{button.disabled=false;button.textContent=original;}
  };
  load().catch(showError);
});
