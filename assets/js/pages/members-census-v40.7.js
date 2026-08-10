(()=>{
  'use strict';
  const hideAutomaticFields=()=>{
    ['categoria','tipo_abono','sector','sector_codigo_club','fila','asiento','precio_abono','cuenta_activada','cuota_al_dia'].forEach(name=>{
      const input=document.querySelector(`#memberForm [name="${name}"]`);
      const field=input?.closest('.form-group, .field, label');
      if(field)field.hidden=true;
    });
    const form=document.querySelector('#memberForm');
    if(form&&!document.querySelector('#censusModalNote'))form.insertAdjacentHTML('afterbegin','<div id="censusModalNote" class="census-modal-note"><strong>Ficha maestra</strong><span>La categoría se calcula con la fecha de nacimiento. Abono, zona, sector, precios y descuentos se guardan por temporada desde la ficha completa.</span></div>');
  };
  const improveTable=()=>{
    const table=document.querySelector('.members-table, #membersTable');if(!table)return;
    const headings=table.querySelectorAll('thead th');if(headings[6])headings[6].textContent='Temporadas';
    table.querySelectorAll('tbody tr').forEach(row=>{const cells=row.children;if(cells[6]&&!cells[6].dataset.censusFixed){cells[6].dataset.censusFixed='1';cells[6].innerHTML='<span class="season-data-link">Consultar en ficha</span>'}});
  };
  window.addEventListener('load',()=>{
    const actions=document.querySelector('.members-topbar-actions');
    if(actions&&!document.querySelector('#categoryRulesLink'))actions.insertAdjacentHTML('beforeend','<a id="categoryRulesLink" class="btn btn-dark-outline" href="campanas-admin.html?tab=categories">Categorías y edades</a>');
    document.querySelector('#newMemberButton')?.addEventListener('click',()=>setTimeout(hideAutomaticFields,0));
    document.addEventListener('click',event=>{if(event.target.closest('[data-edit-member], .edit-member, [data-action="edit"]'))setTimeout(hideAutomaticFields,0)});
    const observer=new MutationObserver(()=>{hideAutomaticFields();improveTable()});observer.observe(document.body,{childList:true,subtree:true});
    hideAutomaticFields();improveTable();
  });
})();
