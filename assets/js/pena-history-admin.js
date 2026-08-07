(()=>{
  'use strict';

  const TABLE='site_content';
  const CONTENT_ID='pena_history';
  let timeline=[];
  let client=null;

  function escapeAttr(value=''){
    return String(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function showMessage(text,isError=false){
    const el=document.getElementById('historyMessage');
    if(!el)return;
    el.textContent=text;
    el.style.color=isError?'#b42318':'';
  }

  function renderTimeline(){
    const container=document.getElementById('historyTimelineRows');
    container.innerHTML=timeline.map((item,index)=>`
      <div class="history-row">
        <input data-i="${index}" data-k="year" value="${escapeAttr(item.year)}" placeholder="Año">
        <input data-i="${index}" data-k="title" value="${escapeAttr(item.title)}" placeholder="Título">
        <textarea data-i="${index}" data-k="text" placeholder="Texto">${escapeAttr(item.text)}</textarea>
        <button type="button" data-remove="${index}">Eliminar</button>
      </div>`).join('');

    container.querySelectorAll('[data-i]').forEach(element=>{
      element.addEventListener('input',()=>{
        timeline[Number(element.dataset.i)][element.dataset.k]=element.value;
      });
    });
    container.querySelectorAll('[data-remove]').forEach(button=>{
      button.addEventListener('click',()=>{
        timeline.splice(Number(button.dataset.remove),1);
        renderTimeline();
      });
    });
  }

  async function connectAuthenticatedAdmin(){
    if(!window.FrenteSupabase?.configured?.()){
      throw new Error('Supabase no está configurado en esta versión de la web.');
    }

    const initialized=await window.FrenteSupabase.init();
    client=initialized.client;

    // Recupera y refresca la sesión real de Supabase antes de escribir.
    let {data:sessionData,error:sessionError}=await client.auth.getSession();
    if(sessionError)throw sessionError;

    if(!sessionData.session){
      throw new Error('Tu sesión de Supabase ha caducado. Cierra sesión, vuelve a entrar en Administración e inténtalo otra vez.');
    }

    const {data:userData,error:userError}=await client.auth.getUser();
    if(userError)throw userError;
    if(!userData.user)throw new Error('No se ha podido identificar al administrador conectado.');

    const {data:profile,error:profileError}=await client
      .from('admin_profiles')
      .select('user_id,rol,activo')
      .eq('user_id',userData.user.id)
      .maybeSingle();

    if(profileError)throw new Error(`No se pudo comprobar el perfil administrador: ${profileError.message}`);
    if(!profile)throw new Error('El usuario conectado no tiene una fila en admin_profiles.');
    if(profile.activo===false)throw new Error('El usuario administrador está desactivado.');

    return userData.user;
  }

  function normalize(content){
    return {
      eyebrow:String(content.eyebrow||''),
      title:String(content.title||''),
      intro:String(content.intro||''),
      valuesTitle:String(content.valuesTitle||''),
      values:String(content.values||''),
      image:String(content.image||''),
      timeline:(Array.isArray(content.timeline)?content.timeline:[]).map(item=>({
        year:String(item.year||''),
        title:String(item.title||''),
        text:String(item.text||'')
      }))
    };
  }

  async function loadFromSupabase(){
    await connectAuthenticatedAdmin();
    const {data,error}=await client
      .from(TABLE)
      .select('content,updated_at')
      .eq('id',CONTENT_ID)
      .single();

    if(error)throw new Error(`No se pudo cargar la historia: ${error.message}`);
    return normalize(data.content||{});
  }

  function fillForm(data){
    const form=document.getElementById('historyForm');
    ['eyebrow','title','intro','valuesTitle','values','image'].forEach(key=>{
      form.elements[key].value=data[key]||'';
    });
    timeline=JSON.parse(JSON.stringify(data.timeline||[]));
    renderTimeline();

    const preview=document.getElementById('historyPreview');
    if(data.image){
      preview.src=data.image;
      preview.hidden=false;
    }else{
      preview.removeAttribute('src');
      preview.hidden=true;
    }
  }

  async function saveAndVerify(content){
    await connectAuthenticatedAdmin();
    const normalized=normalize(content);
    const stamp=new Date().toISOString();

    // UPDATE deliberado: la fila ya existe. .select().single() obliga a Supabase
    // a devolver la fila realmente modificada; si RLS la bloquea, habrá error.
    const {data,error}=await client
      .from(TABLE)
      .update({content:normalized,updated_at:stamp})
      .eq('id',CONTENT_ID)
      .select('content,updated_at')
      .single();

    if(error)throw new Error(`Supabase rechazó el guardado: ${error.message}${error.code?` (código ${error.code})`:''}`);
    if(!data)throw new Error('Supabase no devolvió ninguna fila actualizada. Revisa las políticas RLS.');

    const saved=normalize(data.content);
    if(JSON.stringify(saved)!==JSON.stringify(normalized)){
      throw new Error('La comprobación posterior al guardado no coincide con el contenido enviado.');
    }

    return data;
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    const form=document.getElementById('historyForm');
    const submitButton=form.querySelector('button[type="submit"]');

    submitButton.disabled=true;
    showMessage('Conectando con Supabase y cargando la historia…');
    try{
      const data=await loadFromSupabase();
      fillForm(data);
      showMessage('Historia cargada desde Supabase.');
    }catch(error){
      console.error('Historia admin:',error);
      showMessage(error.message||'No se pudo cargar la historia.',true);
    }finally{
      submitButton.disabled=false;
    }

    document.getElementById('historyImageFile').addEventListener('change',async event=>{
      try{
        const value=await FrenteImageTools.read(event.target.files[0],1600,.84);
        form.elements.image.value=value;
        const preview=document.getElementById('historyPreview');
        preview.src=value;
        preview.hidden=false;
      }catch(error){
        showMessage(error.message||'No se pudo procesar la imagen.',true);
      }
    });

    document.getElementById('addHistoryRow').addEventListener('click',()=>{
      timeline.push({year:'',title:'',text:''});
      renderTimeline();
    });

    form.addEventListener('submit',async event=>{
      event.preventDefault();
      submitButton.disabled=true;
      showMessage('Guardando y verificando directamente en Supabase…');
      try{
        const output=Object.fromEntries(new FormData(form).entries());
        output.timeline=timeline;
        const saved=await saveAndVerify(output);
        const time=new Date(saved.updated_at).toLocaleString('es-ES');
        showMessage(`Historia guardada y comprobada en Supabase (${time}).`);
      }catch(error){
        console.error('Guardado historia:',error);
        showMessage(error.message||'No se pudo guardar la historia.',true);
      }finally{
        submitButton.disabled=false;
      }
    });

    document.getElementById('resetHistory').addEventListener('click',async()=>{
      if(!confirm('¿Restaurar y publicar la historia inicial?'))return;
      submitButton.disabled=true;
      try{
        showMessage('Restaurando y verificando…');
        const defaults=window.FRENTE_PENA_DEFAULTS;
        await saveAndVerify(defaults);
        fillForm(defaults);
        showMessage('Historia inicial restaurada y comprobada en Supabase.');
      }catch(error){
        showMessage(error.message||'No se pudo restaurar.',true);
      }finally{
        submitButton.disabled=false;
      }
    });
  });
})();
