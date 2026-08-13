(function(){
  'use strict';

  const TABLE='site_content';
  const BUCKET=window.FRENTE_SUPABASE_CONFIG?.storageBuckets?.publicImages||'public-images';

  function copy(value){return JSON.parse(JSON.stringify(value||{}))}
  function merge(base,value){
    const out={...copy(base),...copy(value)};
    Object.keys(out).forEach(key=>{
      if(base?.[key]&&typeof base[key]==='object'&&!Array.isArray(base[key])){
        out[key]={...copy(base[key]),...copy(value?.[key])};
      }
    });
    return out;
  }
  async function client(){
    if(!window.FrenteSupabase?.configured?.())throw new Error('Supabase no está configurado.');
    const initialized=await window.FrenteSupabase.init();
    const instance=initialized?.client||window.FrenteSupabase.client;
    if(!instance)throw new Error('No se pudo iniciar Supabase.');
    return instance;
  }
  async function load(id,defaults,localKey){
    try{
      const instance=await client();
      const {data,error}=await instance.from(TABLE).select('content,updated_at').eq('id',id).maybeSingle();
      if(error)throw error;
      const value=merge(defaults,data?.content||{});
      if(localKey)try{localStorage.setItem(localKey,JSON.stringify(value))}catch{}
      return {value,source:data?'supabase':'defaults',updatedAt:data?.updated_at||null};
    }catch(error){
      console.warn(`Contenido compartido ${id}:`,error?.message||error);
      if(localKey)try{
        const saved=JSON.parse(localStorage.getItem(localKey));
        if(saved)return {value:merge(defaults,saved),source:'local',error};
      }catch{}
      return {value:copy(defaults),source:'defaults',error};
    }
  }
  async function save(id,content,localKey){
    const instance=await client();
    const {data:{user}}=await instance.auth.getUser();
    if(!user)throw new Error('La sesión de Administración ha caducado. Vuelve a iniciar sesión.');
    const row={id,content:copy(content),updated_at:new Date().toISOString()};
    const {data,error}=await instance.from(TABLE).upsert(row,{onConflict:'id'}).select('content,updated_at').single();
    if(error)throw new Error(`Supabase rechazó la publicación: ${error.message}`);
    if(localKey)try{localStorage.setItem(localKey,JSON.stringify(data.content))}catch{}
    return data;
  }
  async function upload(file,folder='portada'){
    if(!file)return '';
    const instance=await client();
    const extension=(file.name?.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
    const path=`web/${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const {error}=await instance.storage.from(BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
    if(error)throw new Error(`No se pudo subir la imagen: ${error.message}`);
    const {data}=instance.storage.from(BUCKET).getPublicUrl(path);
    if(!data?.publicUrl)throw new Error('No se pudo obtener la dirección pública de la imagen.');
    return data.publicUrl;
  }

  window.FrenteSharedContent={load,save,upload,client,merge};
})();
