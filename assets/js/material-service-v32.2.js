(()=>{
  "use strict";
  let db;
  const BUCKET="material-images";
  async function client(){if(db)return db;db=(await window.FrenteSupabase.init()).client;return db}
  const clean=o=>Object.fromEntries(Object.entries(o).filter(([,v])=>v!==undefined));
  const friendly=e=>{const m=String(e?.message||e||"");if(/maximum allowed size|exceeded.*size|payload too large/i.test(m))return new Error("La fotografía es demasiado grande para el almacenamiento.");if(/row-level security|policy|unauthorized|permission/i.test(m))return new Error("Supabase ha rechazado la operación. Comprueba que has iniciado sesión como administrador y que el SQL 32.2 está instalado.");return e instanceof Error?e:new Error(m||"Error desconocido")};
  async function uploadImage(c,file,itemId,order){const optimized=await window.FrenteImageOptimizer.optimize(file);const path=`catalogo/${itemId}/${crypto.randomUUID()}.webp`;const up=await c.storage.from(BUCKET).upload(path,optimized.file,{cacheControl:"31536000",contentType:"image/webp",upsert:false});if(up.error)throw friendly(up.error);const pub=c.storage.from(BUCKET).getPublicUrl(path);return{imagen_path:path,imagen_url:pub.data.publicUrl,orden:order}}
  window.MaterialV20={
    async categories(admin=false){let q=(await client()).from("material_categories").select("*").order("orden");if(!admin)q=q.eq("activa",true);const r=await q;if(r.error)throw r.error;return r.data||[]},
    async items(admin=false){const c=await client();let q=c.from(admin?"material_admin_summary":"material_items").select(admin?"*":"*,material_categories(nombre,slug)").order("destacado",{ascending:false}).order("orden");if(!admin)q=q.eq("visible",true);const r=await q;if(r.error)throw r.error;const rows=r.data||[];if(!rows.length)return rows;const ids=rows.map(x=>x.id);const ir=await c.from("material_item_images").select("*").in("material_id",ids).order("principal",{ascending:false}).order("orden");if(ir.error)throw ir.error;const by={};(ir.data||[]).forEach(x=>(by[x.material_id]??=[]).push(x));return rows.map(x=>({...x,imagenes:by[x.id]||[]}))},
    async images(itemId){const r=await(await client()).from("material_item_images").select("*").eq("material_id",itemId).order("principal",{ascending:false}).order("orden");if(r.error)throw r.error;return r.data||[]},
    async saveItem(values,files=[]){
      const c=await client(),o={...values},id=o.id||null;
      delete o.id;delete o.fotos;
      ["unidades_orientativas","orden"].forEach(k=>o[k]=Number(o[k]||0));
      o.precio=o.precio===""||o.precio==null?null:Number(o.precio);
      ["visible","destacado","nuevo","mostrar_precio"].forEach(k=>o[k]=!!o[k]);
      const r=id?await c.from("material_items").update(clean(o)).eq("id",id).select().single():await c.from("material_items").insert(clean(o)).select().single();
      if(r.error)throw friendly(r.error);
      const saved=r.data;let completed=0;
      try{
        if(files.length){
          const existing=await this.images(saved.id);
          let order=Math.max(0,...existing.map(image=>Number(image.orden)||0))+10;
          for(const file of files){
            const u=await uploadImage(c,file,saved.id,order);
            // Preserve files after uncertain network responses: the row may already exist.
            const ins=await c.from("material_item_images").insert({...u,material_id:saved.id,principal:existing.length===0&&completed===0}).select().single();
            if(ins.error)throw ins.error;
            completed++;order+=10;
          }
        }
        return saved;
      }catch(e){
        const error=new Error('El artículo se guardó y '+completed+' foto(s) se confirmaron. No se han borrado las fotos anteriores. Recarga el catálogo antes de reintentar. Detalle: '+friendly(e).message);
        error.savedItemId=saved.id;error.completedImages=completed;
        throw error;
      }
    },
    async setPrimary(itemId,imageId){const c=await client();const a=await c.from("material_item_images").update({principal:false}).eq("material_id",itemId);if(a.error)throw a.error;const b=await c.from("material_item_images").update({principal:true}).eq("id",imageId);if(b.error)throw b.error},
    async moveImage(imageId,order){const r=await(await client()).from("material_item_images").update({orden:order}).eq("id",imageId);if(r.error)throw r.error},
    async deleteImage(image){const c=await client();const r=await c.from("material_item_images").delete().eq("id",image.id);if(r.error)throw r.error;if(image.imagen_path)await c.storage.from(BUCKET).remove([image.imagen_path]).catch(()=>{})},
    async deleteItem(item){const c=await client();const imgs=await this.images(item.id);const r=await c.from("material_items").delete().eq("id",item.id);if(r.error)throw r.error;const paths=imgs.map(x=>x.imagen_path).filter(Boolean);if(paths.length)await c.storage.from(BUCKET).remove(paths).catch(()=>{})},
    async requests(){const r=await(await client()).from("material_requests").select("*,material_items(nombre,imagen_url,emoji,precio,mostrar_precio),socios(numero_socio,nombre,apellidos,email,telefono)").order("created_at",{ascending:false});if(r.error)throw r.error;return r.data||[]},
    async submit(o){
      const c=await client();
      const r=await c.rpc("submit_material_request",{p_material_id:o.material_id,p_nombre:o.nombre,p_telefono:o.telefono,p_email:o.email||null,p_cantidad:Number(o.cantidad||1),p_variante:o.variante||null,p_preferencia_contacto:"WhatsApp",p_observaciones:o.observaciones||null});
      if(r.error)throw r.error;
      const result=Array.isArray(r.data)?r.data[0]:r.data;
      const notification=await c.functions.invoke("send-request-notification",{body:{tipo:"material",request_id:result?.id||result?.request_id||null,solicitud:{referencia:result?.referencia||"",material_id:o.material_id,nombre:o.nombre,telefono:o.telefono,email:o.email||null,cantidad:Number(o.cantidad||1),variante:o.variante||null,observaciones:o.observaciones||null,es_socio:o.es_socio!==false}}});
      if(notification.error)console.error("La solicitud se guardó, pero el correo no pudo enviarse",notification.error);
      return {...(result||{}),aviso_correo_enviado:!notification.error};
    },
    async updateRequest(id,o){o=clean(o);if(o.estado==="Contactado")o.fecha_contacto=new Date().toISOString();if(o.estado==="Reservado")o.fecha_reserva=new Date().toISOString();if(o.estado==="Entregado")o.fecha_entrega=new Date().toISOString();const r=await(await client()).from("material_requests").update(o).eq("id",id).select().single();if(r.error)throw r.error;return r.data},
    csv(rows){const h=["Referencia","Fecha","Material","Cantidad","Variante","Nombre","Nº socio","Teléfono","Correo","Estado","Nota"];const a=rows.map(r=>[r.referencia,new Date(r.created_at).toLocaleString("es-ES"),r.material_items?.nombre,r.cantidad,r.variante,r.nombre,r.socios?.numero_socio||"",r.telefono,r.email,r.estado,r.nota_respuesta]);return[h,...a].map(x=>x.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\n")}
  };
})();
