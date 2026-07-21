let timeline=[];

function escapeAttr(value=''){
  return String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderTimeline(){
  document.getElementById('historyTimelineRows').innerHTML=timeline.map((x,i)=>`<div class="history-row"><input data-i="${i}" data-k="year" value="${escapeAttr(x.year)}" placeholder="Año"><input data-i="${i}" data-k="title" value="${escapeAttr(x.title)}" placeholder="Título"><textarea data-i="${i}" data-k="text" placeholder="Texto">${escapeAttr(x.text)}</textarea><button type="button" data-remove="${i}">Eliminar</button></div>`).join('');
  document.querySelectorAll('[data-i]').forEach(el=>el.oninput=()=>timeline[+el.dataset.i][el.dataset.k]=el.value);
  document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{timeline.splice(+el.dataset.remove,1);renderTimeline()});
}

function showMessage(text,isError=false){
  const el=document.getElementById('historyMessage');
  el.textContent=text;
  el.style.color=isError?'#b42318':'';
}

async function fillForm(){
  const data=await window.getPenaHistory();
  const form=document.getElementById('historyForm');
  ['eyebrow','title','intro','valuesTitle','values','image'].forEach(key=>form.elements[key].value=data[key]||'');
  timeline=JSON.parse(JSON.stringify(data.timeline||[]));
  renderTimeline();
  const preview=document.getElementById('historyPreview');
  if(data.image){preview.src=data.image;preview.hidden=false}else{preview.hidden=true}
}

document.addEventListener('DOMContentLoaded',async()=>{
  const form=document.getElementById('historyForm');
  showMessage('Cargando historia…');
  await fillForm();
  showMessage('');

  document.getElementById('historyImageFile').onchange=async event=>{
    try{
      const value=await FrenteImageTools.read(event.target.files[0],1600,.84);
      form.elements.image.value=value;
      const preview=document.getElementById('historyPreview');
      preview.src=value;
      preview.hidden=false;
    }catch(error){alert(error.message)}
  };

  document.getElementById('addHistoryRow').onclick=()=>{timeline.push({year:'',title:'',text:''});renderTimeline()};

  form.onsubmit=async event=>{
    event.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    button.disabled=true;
    showMessage('Publicando cambios…');
    try{
      const output=Object.fromEntries(new FormData(form).entries());
      output.timeline=timeline;
      await window.savePenaHistory(output);
      showMessage('Historia publicada correctamente. Ya es visible para todos.');
    }catch(error){
      showMessage(error.message||'No se pudo publicar la historia.',true);
    }finally{button.disabled=false}
  };

  document.getElementById('resetHistory').onclick=async()=>{
    if(!confirm('¿Restaurar y publicar la historia inicial?'))return;
    try{
      showMessage('Restaurando contenido…');
      await window.resetPenaHistory();
      await fillForm();
      showMessage('Historia inicial restaurada y publicada.');
    }catch(error){showMessage(error.message||'No se pudo restaurar.',true)}
  };
});
