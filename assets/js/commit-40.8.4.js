(()=>{
 "use strict";
 const escapeText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const safePhoto=value=>{try{const url=new URL(String(value||''),location.href);return value&&['https:','http:'].includes(url.protocol)?escapeText(url.href):''}catch{return ''}};

 const money=value=>Number(value||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
 async function load(){
  const box=document.querySelector('#fc408MemberCatalog');
  if(!box||!window.FrenteSupabase)return;
  box.innerHTML='<p>Cargando material disponible…</p>';
  try{
   const db=(await window.FrenteSupabase.init()).client;
   const result=await db.from('material_items').select('*').eq('visible',true).order('destacado',{ascending:false}).order('orden');
   if(result.error)throw result.error;
   const rows=result.data||[];
   box.innerHTML=rows.length?rows.map(item=>`<article class="fc408-product">${safePhoto(item.imagen_url)?`<img src="${safePhoto(item.imagen_url)}" alt="${escapeText(item.nombre)}">`:''}<div class="fc408-product-body"><h3>${escapeText(item.nombre)}</h3><p>${escapeText(item.descripcion)}</p>${item.mostrar_precio!==false&&item.precio!=null?`<strong>${money(item.precio)}</strong>`:''}<a class="btn btn-primary" href="tienda.html?material=${encodeURIComponent(item.id)}">Solicitar</a></div></article>`).join(''):'<p>No hay material disponible en este momento.</p>';
  }catch(error){
   console.error('Error cargando material del socio',error);
   box.innerHTML='<p>No se pudo cargar el material.</p>';
  }
 }
 setTimeout(load,100);
 document.addEventListener('click',event=>{if(event.target.closest('[data-mat-tab="catalog"]'))setTimeout(load,0)});
})();
