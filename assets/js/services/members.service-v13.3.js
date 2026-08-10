window.FrenteMembersService=(()=>{
 "use strict";
 const cfg=()=>window.FrenteAppConfig.members;
 const db=()=>window.FrenteDatabase.getClient();
 function cleanText(v){const x=String(v??"").trim();return x||null}
 function norm(v){return String(v??"").trim().toLowerCase()}
 function searchNorm(v){return String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9@.+-]+/g," ").trim()}
 function canonicalCategory(v){const x=norm(v);return ["adulto","joven","infantil"].includes(x)?x:(x||null)}
 function ageAt(birth,reference=new Date()){if(!birth)return null;const b=new Date(`${birth}T00:00:00`);if(Number.isNaN(b.getTime()))return null;let age=reference.getFullYear()-b.getFullYear();const m=reference.getMonth()-b.getMonth();if(m<0||(m===0&&reference.getDate()<b.getDate()))age--;return age>=0?age:null}
 function map(row){const pending=!row.numero_socio||norm(row.numero_socio_estado)!=="asignado";const provisional=row.numero_socio_provisional?`P-${String(row.numero_socio_provisional).padStart(4,"0")}`:null;return {...row,emailAcceso:row.email,email:row.email||row.email_contacto||null,numero:pending?(provisional||"Pendiente de validar"):String(row.numero_socio).padStart(4,"0"),numeroProvisional:provisional,numeroSocioPendiente:pending,nombreCompleto:`${row.nombre||""} ${row.apellidos||""}`.trim(),cuenta:row.cuenta_activada?"Activada":"Pendiente de activar",cuota:row.cuota_al_dia?"Al día":"Pendiente",nacimiento:row.fecha_nacimiento,edadActual:ageAt(row.fecha_nacimiento),alta:row.fecha_alta,precioAbono:row.precio_abono==null?null:Number(row.precio_abono),observaciones:row.observaciones_internas}}
 async function list({search="",status="",category="",account="",fee="",page=1,pageSize=cfg().pageSize}={}){
   const term=String(search||"").trim().replace(/[,%()]/g," ");
   const applyFilters=query=>{if(status)query=query.eq("estado",status);if(category)query=query.ilike("categoria",String(category).trim());if(account!=="")query=query.eq("cuenta_activada",account==="true");if(fee!=="")query=query.eq("cuota_al_dia",fee==="true");return query};
   if(term){
    let all=[],batch=0;
    while(true){const query=applyFilters(db().from(cfg().table).select(cfg().select)).order("nombre",{ascending:true}).order("apellidos",{ascending:true}).range(batch*1000,batch*1000+999),{data,error}=await query;if(error)throw error;all.push(...(data||[]));if(!data||data.length<1000)break;batch++}
    const words=searchNorm(term).split(/\s+/).filter(Boolean),filtered=all.filter(row=>{const haystack=searchNorm([row.nombre,row.apellidos,row.dni,row.email,row.email_contacto,row.telefono,row.numero_socio,row.numero_socio_provisional,row.numero_abonado_malaga].join(" "));return words.every(word=>haystack.includes(word))});
    const from=(page-1)*pageSize;return{rows:filtered.slice(from,from+pageSize).map(map),count:filtered.length,page,pageSize};
   }
   let query=applyFilters(db().from(cfg().table).select(cfg().select,{count:"exact"}));
   const from=(page-1)*pageSize,to=from+pageSize-1;
   const {data,error,count}=await query.order("nombre",{ascending:true}).order("apellidos",{ascending:true}).range(from,to);
   if(error)throw error;
   return {rows:(data||[]).map(map),count:count||0,page,pageSize};
 }
 async function get(id){const {data,error}=await db().from(cfg().table).select(cfg().select).eq("id",id).single();if(error)throw error;return map(data)}
 async function nextNumber(){return null}
 function payload(form,editing=false){
   const p={
    numero_socio:cleanText(form.numero_socio)?Number(form.numero_socio):null,nombre:String(form.nombre||"").trim(),apellidos:String(form.apellidos||"").trim(),dni:cleanText(form.dni)?.toUpperCase()||null,
    fecha_nacimiento:cleanText(form.fecha_nacimiento),telefono:cleanText(form.telefono),email:cleanText(form.email)?.toLowerCase()||null,direccion:cleanText(form.direccion),foto_url:cleanText(form.foto_url),
    fecha_alta:cleanText(form.fecha_alta),categoria:canonicalCategory(form.categoria),numero_socio_estado:cleanText(form.numero_socio)?"asignado":"pendiente",sector:cleanText(form.sector),sector_codigo_club:cleanText(form.sector_codigo_club),fila:cleanText(form.fila),asiento:cleanText(form.asiento),
    tipo_abono:cleanText(form.tipo_abono),precio_abono:cleanText(form.precio_abono)==null?null:Number(form.precio_abono),numero_abonado_malaga:cleanText(form.numero_abonado_malaga),gestion_abono_preferida:cleanText(form.gestion_abono_preferida)||"por_confirmar",continuidad_estado:cleanText(form.continuidad_estado)||"por_confirmar",observaciones_internas:cleanText(form.observaciones_internas),es_directivo:Boolean(form.es_directivo),cargo_directiva:Boolean(form.es_directivo)?cleanText(form.cargo_directiva):null
   };
   if(form.menor_sin_dni!==undefined)p.menor_sin_dni=Boolean(form.menor_sin_dni);
   if(form.correo_compartido_familiar!==undefined){p.correo_compartido_familiar=Boolean(form.correo_compartido_familiar);if(p.correo_compartido_familiar){p.email_contacto=p.email;p.email=null}}
   if(form.datos_revision_estado!==undefined)p.datos_revision_estado=cleanText(form.datos_revision_estado)||"pendiente";
   if(form.estado)p.estado=form.estado;
   if(!editing&&p.fecha_alta===null)p.fecha_alta=new Date().toISOString().slice(0,10);
   if(!editing&&!p.numero_socio)p.numero_socio=null;
   return p;
 }
 async function create(form){const p=payload(form,false);const {data,error}=await db().from(cfg().table).insert(p).select(cfg().select).single();if(error)throw error;return map(data)}
 async function update(id,form){const p=payload(form,true);delete p.numero_socio;delete p.numero_socio_estado;const {data,error}=await db().from(cfg().table).update(p).eq("id",id).select(cfg().select).single();if(error)throw error;return map(data)}
 async function softDelete(id,state){const {data,error}=await db().from(cfg().table).update({estado:state}).eq("id",id).select(cfg().select).single();if(error)throw error;return map(data)}
 async function hardDelete(id){const {data,error}=await db().rpc("admin_delete_discharged_member",{p_socio_id:id});if(error)throw error;return data}
 async function history(id){const {data,error}=await db().from(cfg().historyTable).select("id,accion,campo,valor_anterior,valor_nuevo,realizado_por,created_at").eq("socio_id",id).order("created_at",{ascending:false}).limit(100);if(error)throw error;return data||[]}
 async function guardians(id){const {data,error}=await db().from(cfg().guardiansTable).select("id,parentesco,es_principal,activo,tutor_id,menor_id,tutor:socios!member_guardians_tutor_id_fkey(id,numero_socio,nombre,apellidos),menor:socios!member_guardians_menor_id_fkey(id,numero_socio,nombre,apellidos)").or(`tutor_id.eq.${id},menor_id.eq.${id}`).eq("activo",true);if(error)throw error;return data||[]}
 async function distinctOptions(){const {data,error}=await db().from(cfg().table).select("estado,categoria").limit(1000);
  if(error)throw error;
  return {
    states:[...new Set((data||[]).map(x=>norm(x.estado)).filter(Boolean))].sort(),
    categories:[...new Set((data||[]).map(x=>canonicalCategory(x.categoria)).filter(Boolean))].sort()
  };
}
 async function summary(){
  let page=0,rows=[];
  while(true){
   const {data,error}=await db().from(cfg().table).select("estado,categoria,cuenta_activada,cuota_al_dia,es_registro_prueba").range(page*1000,page*1000+999);
   if(error)throw error;
   rows.push(...(data||[]));
   if(!data||data.length<1000)break;
   page++;
  }
  const official=rows.filter(x=>!x.es_registro_prueba);
  return {
   total:official.length,
   active:official.filter(x=>norm(x.estado)==="activo").length,
   activated:official.filter(x=>x.cuenta_activada===true).length,
   notActivated:official.filter(x=>x.cuenta_activada!==true).length,
   pendingFees:official.filter(x=>x.cuota_al_dia!==true).length,
   children:official.filter(x=>canonicalCategory(x.categoria)==="infantil").length,
   young:official.filter(x=>canonicalCategory(x.categoria)==="joven").length,
   adult:official.filter(x=>canonicalCategory(x.categoria)==="adulto").length,
   uncategorized:official.filter(x=>!canonicalCategory(x.categoria)).length
  };
}
 async function allForExport(){let page=0,result=[];while(true){const {data,error}=await db().from(cfg().table).select(cfg().select).order("nombre",{ascending:true}).order("apellidos",{ascending:true}).range(page*1000,page*1000+999);if(error)throw error;result.push(...(data||[]));if(!data||data.length<1000)break;page++}return result.map(map)}
 async function accessSummary(id){const {data,error}=await db().rpc("member_access_summary",{p_socio_id:id});if(error)throw error;return data||{};}
 async function invite(id){const {data,error}=await db().functions.invoke("invite-member",{body:{socio_id:id,redirect_to:new URL("establecer-clave.html",location.href).href}});if(error)throw error;if(data?.error)throw new Error(data.error);return data;}
 async function linkExisting(id){const {data,error}=await db().rpc("admin_link_existing_auth_user",{p_socio_id:id});if(error)throw error;return data;}
 async function sendRecovery(email){const {error}=await db().auth.resetPasswordForEmail(email,{redirectTo:new URL("establecer-clave.html",location.href).href});if(error)throw error;}
 return {list,get,nextNumber,create,update,softDelete,hardDelete,history,guardians,distinctOptions,summary,allForExport,accessSummary,invite,linkExisting,sendRecovery};
})();
