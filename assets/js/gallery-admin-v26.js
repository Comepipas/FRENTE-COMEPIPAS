document.addEventListener('DOMContentLoaded',()=>{
  const grid=document.querySelector('#galleryAdminGrid');
  const form=document.querySelector('#albumForm');
  const modal=document.querySelector('#albumModal');
  const photos=document.querySelector('#albumPhotosAdmin');
  const uploadForm=document.querySelector('#photoUploadForm');
  const filesInput=document.querySelector('#photoFiles');
  let current=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

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
      const a=await GalleryV26.album(b.dataset.edit); current=a;
      Object.keys(a).forEach(k=>{if(form.elements[k]) form.elements[k].type==='checkbox'?form.elements[k].checked=!!a[k]:form.elements[k].value=a[k]??''});
      modal.classList.add('open');
    });
    grid.querySelectorAll('[data-photos]').forEach(b=>b.onclick=()=>managePhotos(b.dataset.photos));
    grid.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('¿Eliminar este álbum y todas sus fotos?')){await GalleryV26.deleteAlbum(b.dataset.del);await load()}});
  }

  async function managePhotos(id){
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
      await GalleryV26.setCover(current.id,photo.imagen_url);
      await managePhotos(current.id); await load();
    });
    photos.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=async()=>{
      const photo=current.photos.find(x=>x.id===b.dataset.pdel);
      if(!confirm('¿Eliminar esta fotografía?'))return;
      await GalleryV26.deletePhoto(b.dataset.pdel);
      if(photo&&current.portada_url===photo.imagen_url){
        const remaining=current.photos.filter(x=>x.id!==photo.id);
        await GalleryV26.setCover(current.id,remaining[0]?.imagen_url||'');
      }
      await managePhotos(id); await load();
    });
    document.querySelector('#photosModal').classList.add('open');
  }

  document.querySelector('#newAlbum').onclick=()=>{current=null;form.reset();form.elements.id.value='';modal.classList.add('open')};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.store-modal').classList.remove('open'));
  form.onsubmit=async e=>{e.preventDefault();const o=Object.fromEntries(new FormData(form));o.publicado=form.elements.publicado.checked;await GalleryV26.saveAlbum(o);modal.classList.remove('open');await load()};
  uploadForm.onsubmit=async e=>{
    e.preventDefault(); const fs=[...filesInput.files]; if(!current||!fs.length)return;
    const button=uploadForm.querySelector('button'); button.disabled=true;
    try{
      for(const f of fs){
        const url=await GalleryV26.upload(current.id,f);
        await GalleryV26.addPhoto({album_id:current.id,imagen_url:url,titulo:f.name,orden:current.photos.length});
        current.photos.push({imagen_url:url});
        if(!current.portada_url){await GalleryV26.setCover(current.id,url);current.portada_url=url;}
      }
      uploadForm.reset(); await managePhotos(current.id); await load();
    }finally{button.disabled=false;}
  };
  load().catch(e=>alert(e.message));
});
