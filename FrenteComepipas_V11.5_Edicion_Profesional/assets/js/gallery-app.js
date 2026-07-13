const GALLERY = window.FRENTE_GALLERY || [];
let currentItems = [];
let currentIndex = 0;

function uniqueValues(key){
  return [...new Set(GALLERY.map(item => item[key]).filter(Boolean))];
}

function setupGalleryFilters(){
  const category = document.getElementById("galleryCategory");
  const season = document.getElementById("gallerySeason");

  uniqueValues("categoria").forEach(value=>{
    category?.insertAdjacentHTML("beforeend", `<option>${value}</option>`);
  });

  uniqueValues("temporada").forEach(value=>{
    season?.insertAdjacentHTML("beforeend", `<option>${value}</option>`);
  });
}

function filteredGallery(){
  const category = document.getElementById("galleryCategory")?.value || "Todas";
  const season = document.getElementById("gallerySeason")?.value || "Todas";

  return GALLERY.filter(item =>
    (category === "Todas" || item.categoria === category) &&
    (season === "Todas" || item.temporada === season)
  );
}

function renderGallery(){
  const grid = document.getElementById("galleryGrid");
  if(!grid) return;

  currentItems = filteredGallery();

  if(!currentItems.length){
    grid.innerHTML = '<div class="gallery-empty">No hay contenido para este filtro.</div>';
    return;
  }

  grid.innerHTML = currentItems.map((item,index)=>`
    <button class="gallery-card" data-index="${index}">
      <img src="assets/images/gallery/${item.miniatura || item.archivo}" alt="${item.titulo}">
      <span class="gallery-type">${item.tipo === "video" ? "▶ Vídeo" : "Foto"}</span>
      <span class="gallery-card-overlay">
        <small>${item.categoria} · ${item.temporada}</small>
        <strong>${item.titulo}</strong>
      </span>
    </button>
  `).join("");

  grid.querySelectorAll(".gallery-card").forEach(card=>{
    card.addEventListener("click",()=>openViewer(Number(card.dataset.index)));
  });
}

function openViewer(index){
  currentIndex = index;
  updateViewer();
  document.getElementById("galleryViewer")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeViewer(){
  document.getElementById("galleryViewer")?.classList.remove("open");
  document.body.style.overflow = "";
  const media = document.getElementById("viewerMedia");
  if(media) media.innerHTML = "";
}

function updateViewer(){
  const item = currentItems[currentIndex];
  if(!item) return;

  const media = document.getElementById("viewerMedia");
  const title = document.getElementById("viewerTitle");
  const description = document.getElementById("viewerDescription");
  const meta = document.getElementById("viewerMeta");

  if(item.tipo === "video"){
    media.innerHTML = `<iframe src="${item.archivo}" title="${item.titulo}" allowfullscreen></iframe>`;
  }else{
    media.innerHTML = `<img src="assets/images/gallery/${item.archivo}" alt="${item.titulo}">`;
  }

  title.textContent = item.titulo;
  description.textContent = item.descripcion || "";
  meta.textContent = `${item.categoria} · ${item.temporada}`;
}

function changeViewer(step){
  if(!currentItems.length) return;
  currentIndex = (currentIndex + step + currentItems.length) % currentItems.length;
  updateViewer();
}

document.addEventListener("DOMContentLoaded",()=>{
  setupGalleryFilters();
  renderGallery();

  document.getElementById("galleryCategory")?.addEventListener("change",renderGallery);
  document.getElementById("gallerySeason")?.addEventListener("change",renderGallery);
  document.getElementById("galleryClose")?.addEventListener("click",closeViewer);
  document.getElementById("galleryPrev")?.addEventListener("click",()=>changeViewer(-1));
  document.getElementById("galleryNext")?.addEventListener("click",()=>changeViewer(1));
  document.getElementById("galleryViewer")?.addEventListener("click",event=>{
    if(event.target.id === "galleryViewer") closeViewer();
  });

  document.addEventListener("keydown",event=>{
    if(event.key === "Escape") closeViewer();
    if(event.key === "ArrowLeft") changeViewer(-1);
    if(event.key === "ArrowRight") changeViewer(1);
  });
});
