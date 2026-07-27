(()=>{
  "use strict";
  const S=MaterialV20,$=s=>document.querySelector(s);
  let items=[],cats=[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function img(i){return i.imagen_url?`<img src="${esc(i.imagen_url)}" alt="${esc(i.nombre)}" loading="lazy">`:`<span aria-hidden="true">${esc(i.emoji||'📦')}</span>`}
  function availabilityClass(value){
    const v=String(value||'').toLowerCase();
    if(v.includes('no disponible')||v.includes('agotado')) return 'is-unavailable';
    if(v.includes('poca')) return 'is-low';
    return 'is-available';
  }
  function render(){
    const q=$('#m20Search').value.toLowerCase().trim(),c=$('#m20Category').value;
    const filtered=items.filter(i=>(!c||i.categoria_id===c)&&(!q||`${i.nombre} ${i.descripcion||''} ${i.variantes||''}`.toLowerCase().includes(q)));
    $('#m20Grid').innerHTML=filtered.length?filtered.map(i=>{
      const disabled=i.disponibilidad==='No disponible';
      return `<article class="m20-card${disabled?' is-disabled':''}" data-product-id="${esc(i.id)}" tabindex="${disabled?'-1':'0'}" role="button" aria-label="${disabled?'Producto no disponible: ':'Solicitar '}${esc(i.nombre)}">
        <div class="m20-card-img">${img(i)}</div>
        <div class="m20-card-body">
          <span class="m20-badge ${availabilityClass(i.disponibilidad)}">${esc(i.disponibilidad||'Consultar disponibilidad')}</span>
          <h3>${esc(i.nombre)}</h3>
          <p>${esc(i.descripcion||'Material de la Peña Frente Comepipas.')}</p>
          <div class="m20-meta">${i.variantes?`<span><b>Tallas o variantes:</b> ${esc(i.variantes)}</span>`:''}</div>
          <div class="m20-actions"><button type="button" class="btn btn-primary" data-interest="${esc(i.id)}" ${disabled?'disabled':''}>${disabled?'No disponible':'Solicitar este material'}</button></div>
        </div>
      </article>`;
    }).join(''):'<div class="m20-empty">No hay material con esos filtros.</div>';
  }
  function openRequest(id){
    const i=items.find(x=>String(x.id)===String(id));
    if(!i||i.disponibilidad==='No disponible')return;
    const f=$('#m20RequestForm');
    f.reset();f.material_id.value=i.id;
    $('#m20Summary').innerHTML=`<div class="m20-request-summary"><div class="m20-request-thumb">${img(i)}</div><div><span class="m20-badge ${availabilityClass(i.disponibilidad)}">${esc(i.disponibilidad||'Consultar disponibilidad')}</span><h3>${esc(i.nombre)}</h3>${i.descripcion?`<p>${esc(i.descripcion)}</p>`:''}${i.variantes?`<p><b>Tallas o variantes:</b> ${esc(i.variantes)}</p>`:''}</div></div>`;
    $('#m20RequestDialog').showModal();
  }
  async function load(){
    try{
      [cats,items]=await Promise.all([S.categories(),S.items()]);
      $('#m20Category').innerHTML='<option value="">Todas</option>'+cats.map(c=>`<option value="${esc(c.id)}">${esc(c.nombre)}</option>`).join('');
      render();
    }catch(e){$('#m20Grid').innerHTML=`<div class="m20-empty">No se pudo cargar el catálogo: ${esc(e.message)}</div>`}
  }
  $('#m20Grid').addEventListener('click',e=>{
    const id=e.target.closest('[data-interest]')?.dataset.interest||e.target.closest('.m20-card')?.dataset.productId;
    if(id)openRequest(id);
  });
  $('#m20Grid').addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('m20-card')){e.preventDefault();openRequest(e.target.dataset.productId)}
  });
  $('#m20RequestForm').onsubmit=async e=>{
    if(e.submitter?.value==='cancel')return;
    e.preventDefault();
    const o=Object.fromEntries(new FormData(e.currentTarget));
    try{
      const r=await S.submit(o);
      $('#m20RequestDialog').close();
      $('#m20Confirm').innerHTML=`<p>Referencia: <b>${esc(r.referencia)}</b></p><p>La directiva comprobará la disponibilidad y se pondrá en contacto contigo por WhatsApp o correo electrónico para confirmar la solicitud.</p>`;
      $('#m20ConfirmDialog').showModal();
    }catch(x){alert(x.message)}
  };
  $('#m20CloseConfirm').onclick=()=>$('#m20ConfirmDialog').close();
  $('#m20Search').oninput=render;$('#m20Category').onchange=render;load();
})();
