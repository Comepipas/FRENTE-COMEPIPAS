
const MEDIA_KEY = "frente_media_library_v1";

function getMedia(){
  try{
    return JSON.parse(localStorage.getItem(MEDIA_KEY)) || window.FRENTE_MEDIA_LIBRARY || [];
  }catch{
    return window.FRENTE_MEDIA_LIBRARY || [];
  }
}

function saveMedia(data){
  localStorage.setItem(MEDIA_KEY, JSON.stringify(data));
  renderMediaAdmin();
}

function mediaSlug(text){
  return String(text).toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function filteredMedia(){
  const search=(document.getElementById("mediaSearch")?.value||"").toLowerCase();
  const type=document.getElementById("mediaType")?.value||"Todos";
  const status=document.getElementById("mediaStatus")?.value||"Todos";
  const season=document.getElementById("mediaSeason")?.value||"Todas";

  return getMedia().filter(item=>{
    const hay=`${item.titulo} ${item.album} ${item.descripcion} ${item.tipo}`.toLowerCase();
    return hay.includes(search)
      && (type==="Todos" || item.tipo===type)
      && (status==="Todos" || item.estado===status)
      && (season==="Todas" || item.temporada===season);
  });
}

function renderMediaStats(){
  const media=getMedia();
  document.getElementById("mediaTotal").textContent=media.length;
  document.getElementById("mediaImages").textContent=media.filter(x=>x.tipo==="Imagen").length;
  document.getElementById("mediaVideos").textContent=media.filter(x=>x.tipo==="Vídeo").length;
  document.getElementById("mediaDocuments").textContent=media.filter(x=>x.tipo==="Documento").length;
}

function renderMediaSeasons(){
  const select=document.getElementById("mediaSeason");
  if(!select)return;
  const current=select.value||"Todas";
  const values=[...new Set(getMedia().map(x=>x.temporada).filter(Boolean))];
  select.innerHTML='<option>Todas</option>'+values.map(v=>`<option>${v}</option>`).join("");
  select.value=values.includes(current)?current:"Todas";
}

function renderMediaGrid(){
  const grid=document.getElementById("mediaAdminGrid");
  if(!grid)return;
  const items=filteredMedia();

  grid.innerHTML=items.length?items.map(item=>`
    <article class="media-admin-card">
      <div class="media-admin-thumb">
        ${item.tipo==="Imagen" ? `<img src="assets/images/gallery/${item.archivo}" alt="${item.titulo}">`
        : item.tipo==="Vídeo" ? `<img src="assets/images/gallery/${item.miniatura||"celebracion.jpg"}" alt="${item.titulo}"><span>▶</span>`
        : `<div class="media-doc-icon">DOC</div>`}
      </div>
      <div class="media-admin-body">
        <span class="tag">${item.tipo}</span>
        <h3>${item.titulo}</h3>
        <p>${item.album} · ${item.temporada}</p>
        <p><strong>${item.estado}</strong></p>
        <div class="media-admin-actions">
          <button data-preview-media="${item.id}">Vista previa</button>
          <button data-edit-media="${item.id}">Editar</button>
          <button class="danger" data-delete-media="${item.id}">Eliminar</button>
        </div>
      </div>
    </article>
  `).join(""):'<div class="members-empty">No hay elementos multimedia.</div>';

  grid.querySelectorAll("[data-preview-media]").forEach(b=>b.onclick=()=>previewMedia(b.dataset.previewMedia));
  grid.querySelectorAll("[data-edit-media]").forEach(b=>b.onclick=()=>openMediaForm(b.dataset.editMedia));
  grid.querySelectorAll("[data-delete-media]").forEach(b=>b.onclick=()=>{
    if(confirm("¿Eliminar este elemento?")){
      saveMedia(getMedia().filter(x=>x.id!==b.dataset.deleteMedia));
    }
  });
}

function renderMediaAdmin(){
  renderMediaStats();
  renderMediaSeasons();
  renderMediaGrid();
}

function openMediaForm(id=""){
  const form=document.getElementById("mediaForm");
  form.reset();
  form.elements.id.value="";
  document.getElementById("mediaModalTitle").textContent=id?"Editar elemento":"Nuevo elemento";

  if(id){
    const item=getMedia().find(x=>x.id===id);
    Object.entries(item||{}).forEach(([k,v])=>{
      if(form.elements[k])form.elements[k].value=v??"";
    });
  }else{
    form.elements.tipo.value="Imagen";
    form.elements.estado.value="Borrador";
    form.elements.temporada.value="2026/27";
    form.elements.fecha.value=new Date().toISOString().slice(0,10);
  }

  document.getElementById("mediaModal").classList.add("open");
}

function previewMedia(id){
  const item=getMedia().find(x=>x.id===id);
  const body=document.getElementById("mediaPreviewBody");
  if(!item||!body)return;

  let media="";
  if(item.tipo==="Imagen"){
    media=`<img src="assets/images/gallery/${item.archivo}" alt="${item.titulo}">`;
  }else if(item.tipo==="Vídeo"){
    media=`<iframe src="${item.archivo}" allowfullscreen></iframe>`;
  }else{
    media=`<div class="media-document-preview"><strong>${item.archivo}</strong><p>Documento preparado para descarga o acceso privado.</p></div>`;
  }

  body.innerHTML=`
    <span class="tag">${item.tipo}</span>
    <h2>${item.titulo}</h2>
    <p>${item.album} · ${item.temporada} · ${item.estado}</p>
    <div class="media-preview-content">${media}</div>
    <p>${item.descripcion||""}</p>
  `;
  document.getElementById("mediaPreviewModal").classList.add("open");
}

function exportMediaCSV(){
  const headers=["id","titulo","tipo","album","temporada","estado","archivo","miniatura","descripcion","fecha"];
  const rows=[headers.join(",")];
  getMedia().forEach(item=>{
    rows.push(headers.map(k=>`"${String(item[k]??"").replace(/"/g,'""')}"`).join(","));
  });

  const blob=new Blob(["\ufeff"+rows.join("\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download="multimedia-frente-comepipas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded",()=>{
  renderMediaAdmin();

  document.getElementById("mediaSearch")?.addEventListener("input",renderMediaGrid);
  document.getElementById("mediaType")?.addEventListener("change",renderMediaGrid);
  document.getElementById("mediaStatus")?.addEventListener("change",renderMediaGrid);
  document.getElementById("mediaSeason")?.addEventListener("change",renderMediaGrid);
  document.getElementById("newMediaButton")?.addEventListener("click",()=>openMediaForm());
  document.getElementById("exportMedia")?.addEventListener("click",exportMediaCSV);

  document.getElementById("mediaForm")?.addEventListener("submit",e=>{
    e.preventDefault();
    const data=Object.fromEntries(new FormData(e.currentTarget).entries());
    const media=getMedia();

    if(data.id){
      saveMedia(media.map(x=>x.id===data.id?{...x,...data}:x));
    }else{
      data.id=mediaSlug(data.titulo)+"-"+Date.now();
      saveMedia([...media,data]);
    }

    document.getElementById("mediaModal").classList.remove("open");
  });

  document.getElementById("resetMedia")?.addEventListener("click",()=>{
    if(confirm("¿Restaurar biblioteca multimedia?")){
      localStorage.removeItem(MEDIA_KEY);
      renderMediaAdmin();
    }
  });

  document.querySelectorAll(".store-modal-close").forEach(b=>b.onclick=()=>b.closest(".store-modal").classList.remove("open"));
  document.querySelectorAll(".store-modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open")}));
});
