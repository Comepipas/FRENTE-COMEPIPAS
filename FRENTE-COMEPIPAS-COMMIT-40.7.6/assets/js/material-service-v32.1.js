(()=>{
  "use strict";
  let db;
  async function client(){
    if(db) return db;
    db=(await window.FrenteSupabase.init()).client;
    return db;
  }
  const clean=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined));
  const BUCKET="material-images";

  function friendlyStorageError(error){
    const message=String(error?.message||error||"");
    if(/maximum allowed size|exceeded.*size|payload too large|entity too large/i.test(message)){
      return new Error("La fotografía sigue siendo demasiado grande para el almacenamiento. Prueba con otra imagen o reduce su tamaño.");
    }
    if(/bucket.*not found|not found.*bucket/i.test(message)){
      return new Error("No existe el almacén de fotografías 'material-images'. Ejecuta el SQL del Commit 20 en Supabase.");
    }
    if(/row-level security|policy|unauthorized|permission/i.test(message)){
      return new Error("Supabase ha rechazado la subida. Comprueba que has iniciado sesión como administrador y que las políticas de Storage están instaladas.");
    }
    return error instanceof Error ? error : new Error(message||"Error desconocido al subir la fotografía.");
  }

  window.MaterialV20={
    async categories(admin=false){
      let q=(await client()).from("material_categories").select("*").order("orden");
      if(!admin) q=q.eq("activa",true);
      const r=await q;
      if(r.error) throw r.error;
      return r.data||[];
    },
    async items(admin=false){
      let q=(await client()).from(admin?"material_admin_summary":"material_items").select(admin?"*":"*,material_categories(nombre,slug)").order("orden");
      if(!admin) q=q.eq("visible",true);
      const r=await q;
      if(r.error) throw r.error;
      return r.data||[];
    },
    async saveItem(o,file){
      const c=await client();
      const id=o.id;
      delete o.id;
      const oldPath=o.imagen_path||null;
      let uploadedPath=null;

      try{
        if(file){
          const optimized=await window.FrenteImageOptimizer.optimize(file);
          const uploadFile=optimized.file;
          const path=`catalogo/${crypto.randomUUID()}.webp`;
          const up=await c.storage.from(BUCKET).upload(path,uploadFile,{cacheControl:"31536000",contentType:"image/webp",upsert:false});
          if(up.error) throw friendlyStorageError(up.error);
          uploadedPath=path;
          const pub=c.storage.from(BUCKET).getPublicUrl(path);
          o.imagen_path=path;
          o.imagen_url=pub.data.publicUrl;
        }

        ["unidades_orientativas","orden"].forEach(k=>o[k]=Number(o[k]||0));
        o.visible=!!o.visible;
        o.destacado=!!o.destacado;
        const r=id
          ? await c.from("material_items").update(clean(o)).eq("id",id).select().single()
          : await c.from("material_items").insert(clean(o)).select().single();
        if(r.error) throw r.error;

        if(uploadedPath && oldPath && oldPath!==uploadedPath){
          const removal=await c.storage.from(BUCKET).remove([oldPath]);
          if(removal.error) console.warn("No se pudo borrar la fotografía anterior:",removal.error.message);
        }
        return r.data;
      }catch(error){
        if(uploadedPath){
          await c.storage.from(BUCKET).remove([uploadedPath]).catch(()=>{});
        }
        throw friendlyStorageError(error);
      }
    },
    async deleteItem(item){
      const c=await client();
      const r=await c.from("material_items").delete().eq("id",item.id);
      if(r.error) throw r.error;
      if(item.imagen_path){
        const removal=await c.storage.from(BUCKET).remove([item.imagen_path]);
        if(removal.error) console.warn(removal.error.message);
      }
    },
    async requests(){
      const r=await(await client()).from("material_requests").select("*,material_items(nombre,imagen_url,emoji),socios(numero_socio,nombre,apellidos,email,telefono)").order("created_at",{ascending:false});
      if(r.error) throw r.error;
      return r.data||[];
    },
    async submit(o){
      const r=await(await client()).rpc("submit_material_request",{p_material_id:o.material_id,p_nombre:o.nombre,p_telefono:o.telefono,p_email:o.email||null,p_cantidad:Number(o.cantidad||1),p_variante:o.variante||null,p_preferencia_contacto:o.preferencia_contacto||"WhatsApp",p_observaciones:o.observaciones||null});
      if(r.error) throw r.error;
      return Array.isArray(r.data)?r.data[0]:r.data;
    },
    async mine(){
      const r=await(await client()).from("material_requests").select("*,material_items(nombre,imagen_url,emoji)").order("created_at",{ascending:false});
      if(r.error) throw r.error;
      return r.data||[];
    },
    async updateRequest(id,o){
      o=clean(o);
      if(o.estado==="Contactado") o.fecha_contacto=new Date().toISOString();
      if(o.estado==="Reservado") o.fecha_reserva=new Date().toISOString();
      if(o.estado==="Entregado") o.fecha_entrega=new Date().toISOString();
      const r=await(await client()).from("material_requests").update(o).eq("id",id).select().single();
      if(r.error) throw r.error;
      return r.data;
    },
    csv(rows){
      const h=["Referencia","Fecha","Material","Cantidad","Variante","Nombre","Nº socio","Teléfono","Correo","Contacto","Estado","Nota"];
      const a=rows.map(r=>[r.referencia,new Date(r.created_at).toLocaleString("es-ES"),r.material_items?.nombre,r.cantidad,r.variante,r.nombre,r.socios?.numero_socio||"",r.telefono,r.email,r.preferencia_contacto,r.estado,r.nota_respuesta]);
      return [h,...a].map(x=>x.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\n");
    }
  };
})();
