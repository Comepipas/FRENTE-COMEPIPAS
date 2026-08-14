(function(){
  'use strict';
  window.FC4082=true;
  if(!document.querySelector('link[href*="commit-40.8.css?v=40.8.2"]')){
    var style=document.createElement('link');style.rel='stylesheet';style.href='assets/css/commit-40.8.css?v=40.8.2';document.head.appendChild(style);
  }
  var page=location.pathname.split('/').pop()||'index.html';
  var q=function(s){return document.querySelector(s)};
  var qa=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
  async function db(){try{return (await window.FrenteSupabase.init()).client}catch(error){console.error(error);return null}}
  function money(value){return Number(value||0).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  async function memberMaterial(){
    if(page!=='area-socio.html')return;
    var card=q('.member-material-card');
    if(!card||!window.MaterialV20)return;
    card.innerHTML='<span class="kicker">Material</span><h2>Material de la Peña</h2><div class="fc408-tabs"><button class="active" data-mat-tab="catalog">Material disponible</button><button data-mat-tab="history">Mis solicitudes</button></div><div data-mat-panel="catalog"><div id="fc408MemberCatalog" class="fc408-material-catalog"><p>Cargando material disponible…</p></div></div><div data-mat-panel="history" hidden><div class="m20-grid" id="m20MemberRequests"></div></div>';
    var box=q('#fc408MemberCatalog');
    try{
      var rows=await window.MaterialV20.items(false);
      box.innerHTML=rows.length?rows.map(function(x){
        var photo=(x.imagenes&&x.imagenes[0]&&x.imagenes[0].imagen_url)||x.imagen_url||'';
        var price=x.mostrar_precio&&x.precio!=null?money(x.precio):'Consultar';
        return '<article class="fc408-product">'+(photo?'<img src="'+esc(photo)+'" alt="'+esc(x.nombre)+'">':'')+'<div class="fc408-product-body"><h3>'+esc(x.nombre)+'</h3><p>'+esc(x.descripcion||'')+'</p><strong>'+price+'</strong><a class="btn btn-primary" href="tienda.html?material='+encodeURIComponent(x.id)+'&origen=socio">Solicitar</a></div></article>';
      }).join(''):'<p>No hay material disponible en este momento.</p>';
    }catch(error){console.error(error);box.innerHTML='<p>No se pudo cargar el material. Inténtalo de nuevo en unos segundos.</p>'}
    qa('[data-mat-tab]').forEach(function(button){button.onclick=function(){qa('[data-mat-tab]').forEach(function(x){x.classList.toggle('active',x===button)});qa('[data-mat-panel]').forEach(function(x){x.hidden=x.dataset.matPanel!==button.dataset.matTab})}});
    var script=document.createElement('script');script.src='assets/js/material-member-v20.js?v=40.8.2';document.body.appendChild(script);
  }

  async function homeMaterial(){
    if(page!=='index.html')return;
    var img=q('#v388MaterialImage'),card=img&&img.closest('.v115-shop-card');
    if(!img||!card)return;
    var holder=card.querySelector('.v115-shop-media');
    if(!holder){holder=document.createElement('div');holder.className='v115-shop-media';img.before(holder);holder.appendChild(img)}
    var c=await db();if(!c)return;
    var itemResult=await c.from('material_items').select('id,nombre,imagen_url,precio,mostrar_precio').eq('visible',true).order('destacado',{ascending:false}).order('orden').limit(12);
    if(itemResult.error||!itemResult.data||!itemResult.data.length)return;
    var ids=itemResult.data.map(function(x){return x.id});
    var imageResult=await c.from('material_item_images').select('material_id,imagen_url,principal,orden').in('material_id',ids).order('principal',{ascending:false}).order('orden');
    var products={};itemResult.data.forEach(function(x){products[x.id]=x});
    var items=(imageResult.data||[]).map(function(photo){
      var product=products[photo.material_id];
      return product&&photo.imagen_url?Object.assign({},product,{photo:photo.imagen_url}):null;
    }).filter(Boolean);
    itemResult.data.forEach(function(product){
      if(product.imagen_url&&!items.some(function(x){return x.id===product.id}))items.push(Object.assign({},product,{photo:product.imagen_url}));
    });
    if(!items.length)return;
    var index=0,timer;
    var caption=document.createElement('a');caption.className='fc408-product-caption';caption.href='tienda.html';holder.appendChild(caption);
    var controls=document.createElement('div');controls.className='fc408-carousel-controls';controls.innerHTML='<button type="button" aria-label="Anterior">‹</button><div class="fc408-carousel-dots"></div><button type="button" aria-label="Siguiente">›</button>';holder.appendChild(controls);
    var dots=controls.querySelector('.fc408-carousel-dots');
    function show(n){index=(n+items.length)%items.length;img.src=items[index].photo;img.alt=items[index].nombre;caption.textContent=items[index].nombre;qa('.fc408-carousel-dots button').forEach(function(dot,i){dot.classList.toggle('active',i===index)})}
    function restart(){clearInterval(timer);if(items.length>1)timer=setInterval(function(){show(index+1)},5500)}
    items.forEach(function(_,i){var dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label','Ver material '+(i+1));dot.onclick=function(){show(i);restart()};dots.appendChild(dot)});
    controls.firstElementChild.onclick=function(){show(index-1);restart()};controls.lastElementChild.onclick=function(){show(index+1);restart()};
    holder.onmouseenter=function(){clearInterval(timer)};holder.onmouseleave=restart;show(0);restart();
  }

  async function shopSession(){
    if(page!=='tienda.html')return;
    var c=await db();if(!c)return;
    var result=await c.auth.getSession();
    if((result.data&&result.data.session)||new URLSearchParams(location.search).get('origen')==='socio'){var side=q('.m322-member-card');if(side)side.remove();var layout=q('.m322-layout');if(layout)layout.classList.add('fc408-catalog-full')}
  }

  function passwordToggles(){
    qa('input[type="password"]').forEach(function(input){
      if(input.parentElement&&input.parentElement.classList.contains('password-field'))return;
      var wrap=document.createElement('div');wrap.className='password-field';input.before(wrap);wrap.appendChild(input);
      var button=document.createElement('button');button.type='button';button.className='password-toggle';button.textContent='Ver';button.setAttribute('aria-label','Mostrar contraseña');
      button.onclick=function(){var visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'Ver':'Ocultar';button.setAttribute('aria-label',visible?'Mostrar contraseña':'Ocultar contraseña')};wrap.appendChild(button);
    });
    qa('[data-toggle-password]').forEach(function(button){button.onclick=function(){var input=q('#'+button.dataset.togglePassword);if(!input)return;var visible=input.type==='text';input.type=visible?'password':'text';button.textContent=visible?'Ver':'Ocultar'}});
  }

  function init(){memberMaterial();homeMaterial();shopSession();passwordToggles()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
