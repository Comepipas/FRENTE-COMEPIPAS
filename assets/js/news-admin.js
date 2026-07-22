
const KEY="frente_admin_news_v1";
const getNews=()=>{try{return JSON.parse(localStorage.getItem(KEY))||window.FRENTE_NEWS||[]}catch{return window.FRENTE_NEWS||[]}};
const saveNews=v=>{localStorage.setItem(KEY,JSON.stringify(v));renderAll()};
const status=n=>n.estado||"Publicada";
const slug=s=>String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

function filtered(){
 const s=(document.getElementById("newsAdminSearch")?.value||"").toLowerCase();
 const st=document.getElementById("newsAdminStatus")?.value||"Todos";
 const c=document.getElementById("newsAdminCategory")?.value||"Todas";
 return getNews().filter(n=>`${n.titulo} ${n.resumen} ${n.categoria}`.toLowerCase().includes(s)&&(st==="Todos"||status(n)===st)&&(c==="Todas"||n.categoria===c));
}
function renderStats(){
 const n=getNews();
 document.getElementById("newsAdminTotal").textContent=n.length;
 document.getElementById("newsAdminPublished").textContent=n.filter(x=>status(x)==="Publicada").length;
 document.getElementById("newsAdminDrafts").textContent=n.filter(x=>status(x)==="Borrador").length;
 document.getElementById("newsAdminScheduled").textContent=n.filter(x=>status(x)==="Programada").length;
}
function renderTable(){
 const b=document.getElementById("newsAdminBody"),rows=filtered();
 b.innerHTML=rows.length?rows.map(n=>`<tr><td><strong>${n.titulo}</strong><br><small>${n.resumen||""}</small></td><td>${n.categoria||"Peña"}</td><td>${n.fecha||"-"}</td><td><span class="status-pill ${status(n)==="Publicada"?"fee-ok":"fee-pending"}">${status(n)}</span></td><td>${n.destacada?"Sí":"No"}</td><td>${n.programadaPara||"-"}</td><td class="members-actions-cell"><button data-prev="${n.id}">Vista previa</button><button data-edit="${n.id}">Editar</button><button data-copy="${n.id}">Duplicar</button><button class="danger" data-del="${n.id}">Eliminar</button></td></tr>`).join(""):'<tr><td colspan="7" class="members-empty">No hay publicaciones.</td></tr>';
 b.querySelectorAll("[data-edit]").forEach(x=>x.onclick=()=>openForm(x.dataset.edit));
 b.querySelectorAll("[data-prev]").forEach(x=>x.onclick=()=>preview(x.dataset.prev));
 b.querySelectorAll("[data-copy]").forEach(x=>x.onclick=()=>duplicate(x.dataset.copy));
 b.querySelectorAll("[data-del]").forEach(x=>x.onclick=()=>{if(confirm("¿Eliminar esta publicación?"))saveNews(getNews().filter(n=>n.id!==x.dataset.del))});
}
function renderAll(){renderStats();renderTable()}
function openForm(id=""){
 const f=document.getElementById("newsAdminForm");f.reset();f.elements.id.value="";
 document.getElementById("newsAdminModalTitle").textContent=id?"Editar publicación":"Nueva publicación";
 if(id){
  const n=getNews().find(x=>x.id===id);
  Object.entries(n||{}).forEach(([k,v])=>{if(f.elements[k]){if(k==="contenido"&&Array.isArray(v))f.elements[k].value=v.join("\n\n");else if(f.elements[k].type==="checkbox")f.elements[k].checked=!!v;else f.elements[k].value=v??""}});
  f.elements.estado.value=status(n);
 }else{
  f.elements.fecha.value=new Date().toISOString().slice(0,10);f.elements.estado.value="Borrador";f.elements.categoria.value="Peña";f.elements.imagen.value="temporada.jpg";
 }
 document.getElementById("newsAdminModal").classList.add("open");
}
function preview(id){
 const n=getNews().find(x=>x.id===id),body=document.getElementById("newsPreviewBody");
 const ps=Array.isArray(n.contenido)?n.contenido:[String(n.contenido||"")];
 body.innerHTML=`<span class="tag">${n.categoria||"Peña"}</span><h1>${n.titulo}</h1><p><strong>${n.fecha||""}</strong> · ${status(n)}</p><img src="assets/images/news/${n.imagen||"temporada.jpg"}" alt="${n.titulo}"><p class="news-preview-summary">${n.resumen||""}</p><div class="news-preview-content">${ps.map(p=>`<p>${p}</p>`).join("")}</div>`;
 document.getElementById("newsPreviewModal").classList.add("open");
}
function duplicate(id){
 const n=getNews().find(x=>x.id===id);if(!n)return;
 saveNews([...getNews(),{...n,id:slug(n.titulo)+"-copia-"+Date.now(),titulo:n.titulo+" (copia)",estado:"Borrador",destacada:false}]);
}
function exportCSV(){
 const hs=["id","titulo","categoria","fecha","estado","destacada","programadaPara","imagen","resumen"],rows=[hs.join(",")];
 getNews().forEach(n=>rows.push(hs.map(k=>`"${String(k==="estado"?status(n):(n[k]??"")).replace(/"/g,'""')}"`).join(",")));
 const blob=new Blob(["\ufeff"+rows.join("\n")],{type:"text/csv"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="noticias-frente-comepipas.csv";a.click();URL.revokeObjectURL(u);
}
document.addEventListener("DOMContentLoaded",()=>{
 renderAll();
 document.getElementById("newsAdminSearch")?.addEventListener("input",renderTable);
 document.getElementById("newsAdminStatus")?.addEventListener("change",renderTable);
 document.getElementById("newsAdminCategory")?.addEventListener("change",renderTable);
 document.getElementById("newNewsAdminButton")?.addEventListener("click",()=>openForm());
 document.getElementById("exportNewsAdmin")?.addEventListener("click",exportCSV);
 document.getElementById("newsAdminForm")?.addEventListener("submit",e=>{
  e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f).entries()),news=getNews();
  d.destacada=f.elements.destacada.checked;d.contenido=String(d.contenido||"").split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
  if(d.estado!=="Programada")d.programadaPara="";
  if(d.destacada)news.forEach(n=>n.destacada=false);
  if(d.id)saveNews(news.map(n=>n.id===d.id?{...n,...d}:n));else{d.id=slug(d.titulo)+"-"+Date.now();saveNews([...news,d])}
  document.getElementById("newsAdminModal").classList.remove("open");
 });
 document.getElementById("resetNewsAdmin")?.addEventListener("click",()=>{if(confirm("¿Restaurar publicaciones?")){localStorage.removeItem(KEY);renderAll()}});
 document.querySelectorAll(".store-modal-close").forEach(b=>b.onclick=()=>b.closest(".store-modal").classList.remove("open"));
 document.querySelectorAll(".store-modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("open")}));
});
