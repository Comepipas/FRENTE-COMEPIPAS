window.FrenteMembersService=(()=>{
 "use strict";
 const cfg=()=>window.FrenteAppConfig.members;
 const db=()=>window.FrenteDatabase.getClient();
 function cleanText(v){const x=String(v??"").trim();return x||null}
 function ageAt(birth,reference=new Date()){if(!birth)return null;const b=new Date(`${birth}T00:00:00`);if(Number.isNaN(b.getTime()))return null;let age=reference.getFullYear()-b.getFullYear();const m=reference.getMonth()-b.getMonth();if(m<0||(m===0&&reference.getDate()<b.getDate()))age--;return age>=0?age:null}
 function map(row){return {...row,numero:String(row.numero_socio??"").padStart(4,"0"),nombreCompleto:`${row.nombre||""} ${row.apellidos||""}`.trim(),cuenta:row.cuenta_activada?"Activada":"Pendiente de activar",cuota:row.cuota_al_dia?"Al día":"Pendiente",nacimiento:row.fecha_nacimiento,edadActual:ageAt(row.fecha_nacimiento),alta:row.fecha_alta,fechaAltaPena:row.fecha_alta_pena,precioAbono:Number(row.precio_abono||0),observaciones:row.observaciones_internas}}
 async function list({search="",status="",category="",account="",fee="",page=1,pageSize=cfg().pageSize}={}){
   let query=db().from(cfg().table).select(cfg().select,{count:"exact"});
   const term=String(search||"").trim().replace(/[,%()]/g," ");
   if(term){const numeric=Number(term);const clauses=[`nombre.ilike.%${term}%`,`apellidos.ilike.%${term}%`,`dni.ilike.%${term}%`,`email.ilike.%${term}%`,`telefono.ilike.%${term}%`,`numero_abonado_malaga.ilike.%${term}%`];if(Number.isInteger(numeric))clauses.push(`numero_socio.eq.${numeric}`);query=query.or(clauses.join(","))}
   if(status)query=query.eq("estado",status);
   if(category)query=query.eq("categoria",category);
   if(account!=="")query=query.eq("cuenta_activada",account==="true");
   if(fee!=="")query=query.eq("cuota_al_dia",fee==="true");
   const from=(page-1)*pageSize,to=from+pageSize-1;
   const {data,error,count}=await query.order("numero_socio",{ascending:true}).range(from,to);
   if(error)throw error;
   return {rows:(data||[]).map(map),count:count||0,page,pageSize};
 }
 async function get(id){const {data,error}=await db().from(cfg().table).select(cfg().select).eq("id",id).single();if(error)throw error;return map(data)}
 async function nextNumber(){const {data,error}=await db().from(cfg().table).select("numero_socio").order("numero_socio",{ascending:false}).limit(1).maybeSingle();if(error)throw error;return Number(data?.numero_socio||0)+1}
 function payload(form,editing=false){
   const p={
    numero_socio:Number(form.numero_socio),nombre:String(form.nombre||"").trim(),apellidos:String(form.apellidos||"").trim(),dni:cleanText(form.dni)?.toUpperCase()||null,
    fecha_nacimiento:cleanText(form.fecha_nacimiento),telefono:cleanText(form.telefono),email:cleanText(form.email)?.toLowerCase()||null,direccion:cleanText(form.direccion),foto_url:cleanText(form.foto_url),
    fecha_alta:cleanText(form.fecha_alta),fecha_alta_pena:cleanText(form.fecha_alta_pena),categoria:cleanText(form.categoria),cuenta_activada:Boolean(form.cuenta_activada),cuota_al_dia:Boolean(form.cuota_al_dia),sector:cleanText(form.sector),fila:cleanText(form.fila),asiento:cleanText(form.asiento),
    tipo_abono:cleanText(form.tipo_abono),precio_abono:Number(form.precio_abono||0),numero_abonado_malaga:cleanText(form.numero_abonado_malaga),observaciones_internas:cleanText(form.observaciones_internas)
   };
   if(form.estado)p.estado=form.estado;
   if(!editing&&p.fecha_alta===null)p.fecha_alta=new Date().toISOString().slice(0,10);
   return p;
 }
 async function create(form){const p=payload(form,false);const {data,error}=await db().from(cfg().table).insert(p).select(cfg().select).single();if(error)throw error;return map(data)}
 async function update(id,form){const p=payload(form,true);delete p.numero_socio;const {data,error}=await db().from(cfg().table).update(p).eq("id",id).select(cfg().select).single();if(error)throw error;return map(data)}
 async function softDelete(id,state){const {data,error}=await db().from(cfg().table).update({estado:state}).eq("id",id).select(cfg().select).single();if(error)throw error;return map(data)}
 async function history(id){const {data,error}=await db().from(cfg().historyTable).select("id,accion,campo,valor_anterior,valor_nuevo,realizado_por,created_at").eq("socio_id",id).order("created_at",{ascending:false}).limit(100);if(error)throw error;return data||[]}
 async function guardians(id){const {data,error}=await db().from(cfg().guardiansTable).select("id,parentesco,es_principal,activo,tutor_id,menor_id,tutor:socios!member_guardians_tutor_id_fkey(id,numero_socio,nombre,apellidos),menor:socios!member_guardians_menor_id_fkey(id,numero_socio,nombre,apellidos)").or(`tutor_id.eq.${id},menor_id.eq.${id}`).eq("activo",true);if(error)throw error;return data||[]}
 async function distinctOptions(){const {data,error}=await db()
    .from(cfg().table)
    .select("estado,categoria")
    .limit(1000);

  if(error)throw error;

  return {
    states:[...new Set((data||[]).map(x=>x.estado).filter(Boolean))].sort(),
    categories:[...new Set((data||[]).map(x=>x.categoria).filter(Boolean))].sort()
  };
}
 async function allForExport(){let page=0,result=[];while(true){const {data,error}=await db().from(cfg().table).select(cfg().select).order("numero_socio").range(page*1000,page*1000+999);if(error)throw error;result.push(...(data||[]));if(!data||data.length<1000)break;page++}return result.map(map)}
 async function accessSummary(id){const {data,error}=await db().rpc("member_access_summary",{p_socio_id:id});if(error)throw error;return data||{};}
 async function invite(id){const {data,error}=await db().functions.invoke("invite-member",{body:{socio_id:id,redirect_to:new URL("establecer-clave.html",location.href).href}});if(error)throw error;if(data?.error)throw new Error(data.error);return data;}
 async function linkExisting(id){const {data,error}=await db().rpc("admin_link_existing_auth_user",{p_socio_id:id});if(error)throw error;return data;}
 async function sendRecovery(email){const {error}=await db().auth.resetPasswordForEmail(email,{redirectTo:new URL("establecer-clave.html",location.href).href});if(error)throw error;}
 return {list,get,nextNumber,create,update,softDelete,history,guardians,distinctOptions,allForExport,accessSummary,invite,linkExisting,sendRecovery};
})();