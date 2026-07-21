(()=>{
  'use strict';

  const TABLE='news';
  let news=[];
  let client=null;

  const status=item=>item.estado||'Publicada';
  const slug=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function imageSrc(value){
    const image=String(value||'').trim();
    if(!image)return 'assets/images/news/temporada.jpg';
    if(/^(data:|https?:\/\/|\/)/i.test(image))return image;
    return `assets/images/news/${image}`;
  }

  function messageElement(){
    let element=document.getElementById('newsAdminMessage');
    if(element)return element;
    element=document.createElement('strong');
    element.id='newsAdminMessage';
    element.style.display='block';
    element.style.marginTop='12px';
    const target=document.querySelector('.members-topbar-actions')||document.querySelector('.members-topbar');
    target?.appendChild(element);
    return element;
  }

  function showMessage(text,isError=false){
    const element=messageElement();
    if(!element)return;
    element.textContent=text;
    element.style.color=isError?'#b42318':'';
  }

  function normalize(row={}){
    return {
      id:String(row.id||''),
      titulo:String(row.titulo||''),
      categoria:String(row.categoria||'Peña'),
      fecha:String(row.fecha||new Date().toISOString().slice(0,10)),
      imagen:String(row.imagen||'temporada.jpg'),
      destacada:Boolean(row.destacada),
      resumen:String(row.resumen||''),
      contenido:Array.isArray(row.contenido)?row.contenido.map(String):String(row.contenido||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean),
      estado:String(row.estado||'Borrador'),
      programadaPara:String(row.programada_para||row.programadaPara||''),
      createdAt:row.created_at||'',
      updatedAt:row.updated_at||''
    };
  }

  function toDatabase(item){
    const n=normalize(item);
    return {
      id:n.id,
      titulo:n.titulo,
      categoria:n.categoria,
      fecha:n.fecha,
      imagen:n.imagen,
      destacada:n.destacada,
      resumen:n.resumen,
      contenido:n.contenido,
      estado:n.estado,
      programada_para:n.estado==='Programada'&&n.programadaPara?new Date(n.programadaPara).toISOString():null,
      updated_at:new Date().toISOString()
    };
  }

  async function connectAuthenticatedAdmin(){
    if(!window.FrenteSupabase?.configured?.())throw new Error('Supabase no está configurado en esta versión de la web.');
    const initialized=await window.FrenteSupabase.init();
    client=initialized.client;

    const {data:sessionData,error:sessionError}=await client.auth.getSession();
    if(sessionError)throw sessionError;
    if(!sessionData.session)throw new Error('Tu sesión de Supabase ha caducado. Cierra sesión, vuelve a entrar en Administración e inténtalo otra vez.');

    const {data:userData,error:userError}=await client.auth.getUser();
    if(userError)throw userError;
    if(!userData.user)throw new Error('No se ha podido identificar al administrador conectado.');

    const {data:profile,error:profileError}=await client.from('admin_profiles').select('user_id,rol,activo').eq('user_id',userData.user.id).maybeSingle();
    if(profileError)throw new Error(`No se pudo comprobar el perfil administrador: ${profileError.message}`);
    if(!profile)throw new Error('El usuario conectado no tiene una fila en admin_profiles.');
    if(profile.activo===false)throw new Error('El usuario administrador está desactivado.');
  }

  async function loadNews(){
    await connectAuthenticatedAdmin();
    const {data,error}=await client.from(TABLE).select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false});
    if(error)throw new Error(`No se pudieron cargar las noticias: ${error.message}`);
    news=(data||[]).map(normalize);
    renderAll();
  }

  function filtered(){
    const search=(document.getElementById('newsAdminSearch')?.value||'').toLowerCase();
    const state=document.getElementById('newsAdminStatus')?.value||'Todos';
    const category=document.getElementById('newsAdminCategory')?.value||'Todas';
    return news.filter(item=>`${item.titulo} ${item.resumen} ${item.categoria}`.toLowerCase().includes(search)&&(state==='Todos'||status(item)===state)&&(category==='Todas'||item.categoria===category));
  }

  function renderStats(){
    const ids={newsAdminTotal:news.length,newsAdminPublished:news.filter(x=>status(x)==='Publicada').length,newsAdminDrafts:news.filter(x=>status(x)==='Borrador').length,newsAdminScheduled:news.filter(x=>status(x)==='Programada').length};
    Object.entries(ids).forEach(([id,value])=>{const element=document.getElementById(id);if(element)element.textContent=value;});
  }

  function renderTable(){
    const body=document.getElementById('newsAdminBody');
    if(!body)return;
    const rows=filtered();
    body.innerHTML=rows.length?rows.map(item=>`<tr><td><strong>${esc(item.titulo)}</strong><br><small>${esc(item.resumen)}</small></td><td>${esc(item.categoria)}</td><td>${esc(item.fecha||'-')}</td><td><span class="status-pill ${status(item)==='Publicada'?'fee-ok':'fee-pending'}">${esc(status(item))}</span></td><td>${item.destacada?'Sí':'No'}</td><td>${esc(item.programadaPara?new Date(item.programadaPara).toLocaleString('es-ES'):'-')}</td><td class="members-actions-cell"><button data-prev="${esc(item.id)}">Vista previa</button><button data-edit="${esc(item.id)}">Editar</button><button data-copy="${esc(item.id)}">Duplicar</button><button class="danger" data-del="${esc(item.id)}">Eliminar</button></td></tr>`).join(''):'<tr><td colspan="7" class="members-empty">No hay publicaciones.</td></tr>';
    body.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>openForm(button.dataset.edit));
    body.querySelectorAll('[data-prev]').forEach(button=>button.onclick=()=>preview(button.dataset.prev));
    body.querySelectorAll('[data-copy]').forEach(button=>button.onclick=()=>duplicate(button.dataset.copy));
    body.querySelectorAll('[data-del]').forEach(button=>button.onclick=()=>removeNews(button.dataset.del));
  }

  function renderAll(){renderStats();renderTable();}

  function ensureImageFileInput(){
    const imageInput=document.querySelector('#newsAdminForm [name="imagen"]');
    if(!imageInput||document.getElementById('newsImageFile'))return;
    imageInput.type='hidden';
    const label=document.createElement('label');
    label.className='full';
    label.innerHTML='<span>Foto desde el ordenador</span><input id="newsImageFile" type="file" accept="image/*"><img id="newsImagePreview" hidden alt="Vista previa" style="max-width:100%;margin-top:10px;border-radius:12px">';
    imageInput.closest('label')?.insertAdjacentElement('afterend',label);
    document.getElementById('newsImageFile').addEventListener('change',async event=>{
      try{
        const value=await window.FrenteImageTools.read(event.target.files[0],1600,.82);
        imageInput.value=value;
        const preview=document.getElementById('newsImagePreview');
        preview.src=value;preview.hidden=false;
        showMessage('Imagen preparada. Pulsa Guardar publicación para subirla a Supabase.');
      }catch(error){showMessage(error.message||'No se pudo procesar la imagen.',true);}
    });
  }

  function updateImagePreview(value){
    const preview=document.getElementById('newsImagePreview');
    if(!preview)return;
    if(value){preview.src=imageSrc(value);preview.hidden=false;}else{preview.removeAttribute('src');preview.hidden=true;}
  }

  function openForm(id=''){
    const form=document.getElementById('newsAdminForm');
    if(!form)return;
    form.reset();form.elements.id.value='';
    document.getElementById('newsAdminModalTitle').textContent=id?'Editar publicación':'Nueva publicación';
    if(id){
      const item=news.find(x=>x.id===id);
      Object.entries(item||{}).forEach(([key,value])=>{
        const field=form.elements[key];if(!field)return;
        if(key==='contenido'&&Array.isArray(value))field.value=value.join('\n\n');
        else if(field.type==='checkbox')field.checked=!!value;
        else field.value=value??'';
      });
      form.elements.estado.value=status(item);
      updateImagePreview(item?.imagen);
    }else{
      form.elements.fecha.value=new Date().toISOString().slice(0,10);
      form.elements.estado.value='Borrador';
      form.elements.categoria.value='Peña';
      form.elements.imagen.value='temporada.jpg';
      updateImagePreview('temporada.jpg');
    }
    document.getElementById('newsAdminModal').classList.add('open');
  }

  function preview(id){
    const item=news.find(x=>x.id===id),body=document.getElementById('newsPreviewBody');
    if(!item||!body)return;
    body.innerHTML=`<span class="tag">${esc(item.categoria)}</span><h1>${esc(item.titulo)}</h1><p><strong>${esc(item.fecha)}</strong> · ${esc(status(item))}</p><img src="${esc(imageSrc(item.imagen))}" alt="${esc(item.titulo)}"><p class="news-preview-summary">${esc(item.resumen)}</p><div class="news-preview-content">${item.contenido.map(p=>`<p>${esc(p)}</p>`).join('')}</div>`;
    document.getElementById('newsPreviewModal').classList.add('open');
  }

  async function saveAndVerify(raw){
    await connectAuthenticatedAdmin();
    const item=normalize(raw);
    if(!item.id)item.id=`${slug(item.titulo)||'noticia'}-${Date.now()}`;

    if(item.destacada){
      const {error:clearError}=await client.from(TABLE).update({destacada:false,updated_at:new Date().toISOString()}).neq('id',item.id);
      if(clearError)throw new Error(`No se pudo actualizar la noticia destacada: ${clearError.message}`);
    }

    const payload=toDatabase(item);
    const {data,error}=await client.from(TABLE).upsert(payload,{onConflict:'id'}).select('*').single();
    if(error)throw new Error(`Supabase rechazó el guardado: ${error.message}${error.code?` (código ${error.code})`:''}`);
    if(!data)throw new Error('Supabase no devolvió la noticia guardada. Revisa las políticas RLS.');

    const saved=normalize(data);
    if(saved.titulo!==item.titulo||saved.estado!==item.estado||saved.resumen!==item.resumen)throw new Error('La comprobación posterior no coincide con la noticia enviada.');
    return saved;
  }

  async function removeNews(id){
    if(!confirm('¿Eliminar esta publicación definitivamente de Supabase?'))return;
    try{
      showMessage('Eliminando noticia…');
      await connectAuthenticatedAdmin();
      const {error}=await client.from(TABLE).delete().eq('id',id);
      if(error)throw new Error(`No se pudo eliminar: ${error.message}`);
      await loadNews();
      showMessage('Noticia eliminada de Supabase.');
    }catch(error){console.error(error);showMessage(error.message||'No se pudo eliminar.',true);}
  }

  async function duplicate(id){
    const original=news.find(x=>x.id===id);if(!original)return;
    try{
      showMessage('Duplicando noticia…');
      const copy={...original,id:`${slug(original.titulo)}-copia-${Date.now()}`,titulo:`${original.titulo} (copia)`,estado:'Borrador',destacada:false,programadaPara:''};
      await saveAndVerify(copy);
      await loadNews();
      showMessage('Copia guardada y comprobada en Supabase.');
    }catch(error){console.error(error);showMessage(error.message||'No se pudo duplicar.',true);}
  }

  function exportCSV(){
    const headers=['id','titulo','categoria','fecha','estado','destacada','programadaPara','imagen','resumen'];
    const rows=[headers.join(',')];
    news.forEach(item=>rows.push(headers.map(key=>`"${String(key==='estado'?status(item):(item[key]??'')).replace(/"/g,'""')}"`).join(',')));
    const blob=new Blob(['\ufeff'+rows.join('\n')],{type:'text/csv'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download='noticias-frente-comepipas.csv';anchor.click();URL.revokeObjectURL(url);
  }

  async function restoreDefaults(){
    if(!confirm('¿Restaurar las noticias iniciales en Supabase? Se sustituirán las actuales.'))return;
    try{
      showMessage('Restaurando noticias iniciales…');
      await connectAuthenticatedAdmin();
      const {error:deleteError}=await client.from(TABLE).delete().neq('id','__never__');
      if(deleteError)throw new Error(`No se pudieron borrar las noticias actuales: ${deleteError.message}`);
      const defaults=(window.FRENTE_NEWS||[]).map(item=>toDatabase({...item,estado:'Publicada'}));
      if(defaults.length){
        const {error:insertError}=await client.from(TABLE).insert(defaults);
        if(insertError)throw new Error(`No se pudieron restaurar las noticias: ${insertError.message}`);
      }
      await loadNews();
      showMessage('Noticias iniciales restauradas y comprobadas en Supabase.');
    }catch(error){console.error(error);showMessage(error.message||'No se pudieron restaurar.',true);}
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    ensureImageFileInput();
    const newButton=document.getElementById('newNewsAdminButton');
    if(newButton)newButton.disabled=true;
    showMessage('Conectando con Supabase y cargando noticias…');
    try{await loadNews();showMessage('Noticias cargadas desde Supabase.');}
    catch(error){console.error('Noticias admin:',error);showMessage(error.message||'No se pudieron cargar las noticias.',true);}
    finally{if(newButton)newButton.disabled=false;}

    document.getElementById('newsAdminSearch')?.addEventListener('input',renderTable);
    document.getElementById('newsAdminStatus')?.addEventListener('change',renderTable);
    document.getElementById('newsAdminCategory')?.addEventListener('change',renderTable);
    newButton?.addEventListener('click',()=>openForm());
    document.getElementById('exportNewsAdmin')?.addEventListener('click',exportCSV);
    document.getElementById('resetNewsAdmin')?.addEventListener('click',restoreDefaults);

    document.getElementById('newsAdminForm')?.addEventListener('submit',async event=>{
      event.preventDefault();
      const form=event.currentTarget,button=form.querySelector('button[type="submit"]');
      button.disabled=true;showMessage('Guardando y verificando directamente en Supabase…');
      try{
        const output=Object.fromEntries(new FormData(form).entries());
        output.destacada=form.elements.destacada.checked;
        output.contenido=String(output.contenido||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
        if(output.estado!=='Programada')output.programadaPara='';
        const saved=await saveAndVerify(output);
        document.getElementById('newsAdminModal').classList.remove('open');
        await loadNews();
        showMessage(`Noticia guardada y comprobada en Supabase (${new Date(saved.updatedAt).toLocaleString('es-ES')}).`);
      }catch(error){console.error('Guardado noticia:',error);showMessage(error.message||'No se pudo guardar la noticia.',true);}
      finally{button.disabled=false;}
    });

    document.querySelectorAll('.store-modal-close').forEach(button=>button.onclick=()=>button.closest('.store-modal').classList.remove('open'));
    document.querySelectorAll('.store-modal').forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal)modal.classList.remove('open');}));
  });
})();
