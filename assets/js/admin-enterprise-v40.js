(function(){
  'use strict';
  function cleanText(el, replacements){
    if(!el) return;
    var text=(el.textContent||'').trim();
    Object.keys(replacements).some(function(pattern){
      if(new RegExp(pattern,'i').test(text)){el.textContent=replacements[pattern];return true;}
      return false;
    });
  }
  function init(){
    document.body.classList.add('admin-v40');
    document.querySelectorAll('.admin-pro-brand span').forEach(function(el){el.textContent='Panel de administración';});
    document.querySelectorAll('.admin-sidebar h2').forEach(function(el){
      el.textContent=el.textContent.replace(/\s+V\d+(?:\.\d+)*/gi,'').replace(/\s+COMMIT\s*\d+(?:\.\d+)*/gi,'').trim();
    });
    document.querySelectorAll('.admin-sidebar p').forEach(function(el){
      var t=el.textContent.toLowerCase();
      if(t.includes('supabase')||t.includes('localstorage')||t.includes('versión')||t.includes('commit')) el.hidden=true;
    });
    document.querySelectorAll('.kicker').forEach(function(el){
      var t=(el.textContent||'').trim();
      t=t.replace(/V\d+(?:\.\d+)*(?:-[\w.]+)?\s*[·|-]?\s*/gi,'').replace(/COMMIT\s*\d+(?:\.\d+)*\s*[·|-]?\s*/gi,'').trim();
      if(!t || /supabase$/i.test(t)) el.hidden=true; else el.textContent=t;
    });
    document.querySelectorAll('.admin-note,.dashboard-warning').forEach(function(el){el.hidden=true;});
    document.querySelectorAll('button,a').forEach(function(el){
      if((el.textContent||'').trim()==='Guardar socio en Supabase') el.textContent='Guardar socio';
      if((el.textContent||'').trim()==='Configurar conexión') el.textContent='Conexión';
    });
    var nav=document.querySelector('.admin-pro-nav');
    if(nav){
      nav.querySelectorAll('a').forEach(function(a){
        if(/dashboard avanzado|dashboard definitivo|supabase y migración/i.test(a.textContent)) a.hidden=true;
      });
    }
    var current=(location.pathname.split('/').pop()||'admin.html').toLowerCase();
    document.querySelectorAll('.admin-pro-nav a').forEach(function(a){
      var href=(a.getAttribute('href')||'').split('?')[0].toLowerCase();
      a.classList.toggle('active',href===current || (current==='dashboard-admin.html'&&href==='admin.html'));
    });
    if(nav&&!nav.querySelector('a[href="familias-admin.html"]')){
      var familyLink=document.createElement('a');familyLink.href='familias-admin.html';familyLink.textContent='Familias y autorizaciones';
      var membersLink=nav.querySelector('a[href="socios-admin.html"]');
      if(membersLink)membersLink.insertAdjacentElement('afterend',familyLink);else nav.appendChild(familyLink);
      familyLink.classList.toggle('active',current==='familias-admin.html');
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
