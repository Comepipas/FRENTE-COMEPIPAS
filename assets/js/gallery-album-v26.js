document.addEventListener('DOMContentLoaded',async()=>{
  const slug=new URLSearchParams(location.search).get('album'),grid=document.querySelector('#albumPhotos');
  if(!slug||!grid)return;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  try{
    const album=await GalleryV26.album(slug),photos=album.photos||[];
    document.querySelector('#albumTitle').textContent=album.titulo;
    document.querySelector('#albumDescription').textContent=album.descripcion||'';
    grid.innerHTML=photos.map((photo,index)=>`<button class="album-photo" data-i="${index}" aria-label="Abrir fotografía ${index+1} de ${photos.length}"><img src="${esc(photo.imagen_url)}" alt="${esc(photo.titulo||album.titulo)}" loading="lazy"></button>`).join('');
    const viewer=document.querySelector('#galleryViewer'),image=document.querySelector('#viewerImage'),counter=document.querySelector('#galleryCounter'),previous=document.querySelector('#galleryPrevious'),next=document.querySelector('#galleryNext');
    let current=0,touchStart=0;
    const show=index=>{if(!photos.length)return;current=(index+photos.length)%photos.length;const photo=photos[current];image.src=photo.imagen_url;image.alt=photo.titulo||`${album.titulo}, fotografía ${current+1}`;counter.textContent=`${current+1} de ${photos.length}`;viewer.classList.add('open');document.documentElement.classList.add('gallery-viewer-open');previous.hidden=next.hidden=photos.length<2;document.querySelector('#galleryClose').focus()};
    const close=()=>{viewer.classList.remove('open');document.documentElement.classList.remove('gallery-viewer-open');image.removeAttribute('src')};
    grid.querySelectorAll('[data-i]').forEach(button=>button.onclick=()=>show(Number(button.dataset.i)));
    previous.onclick=event=>{event.stopPropagation();show(current-1)};
    next.onclick=event=>{event.stopPropagation();show(current+1)};
    document.querySelector('#galleryClose').onclick=close;
    viewer.onclick=event=>{if(event.target===viewer)close()};
    viewer.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0].clientX},{passive:true});
    viewer.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-touchStart;if(Math.abs(distance)>45)show(current+(distance<0?1:-1))},{passive:true});
    document.addEventListener('keydown',event=>{if(!viewer.classList.contains('open'))return;if(event.key==='Escape')close();if(event.key==='ArrowLeft')show(current-1);if(event.key==='ArrowRight')show(current+1)});
  }catch(error){grid.innerHTML=`<p>${esc(error.message)}</p>`}
});
