(()=>{"use strict";
async function init(){
 try{
  const {client:db}=await window.FrenteSupabase.init();
  const {data:{user}}=await db.auth.getUser();
  if(!user?.id)return;
  const columns='id,nombre,apellidos,antiguedad_declarada_tipo,antiguedad_declarada_temporada,antiguedad_declarada_anio,antiguedad_declarada_observaciones,antiguedad_estado,numero_socio,numero_socio_provisional,numero_socio_estado';
  let result=await db.from('socios').select(columns).eq('auth_user_id',user.id).maybeSingle();
  if((result.error||!result.data)&&user.email)result=await db.from('socios').select(columns).ilike('email',user.email).limit(1).maybeSingle();
  const socio=result.data;
  if(result.error||!socio)return;
  if(socio.antiguedad_declarada_tipo&&socio.antiguedad_declarada_tipo!=='pendiente')return;
  const dialog=document.createElement('dialog');
  dialog.id='antiguedadDialog4061';
  dialog.innerHTML=`<form method="dialog" style="max-width:620px;padding:26px;font-family:Montserrat,sans-serif"><span style="font-weight:800;color:#0b5cab">DATO PENDIENTE</span><h2 style="font-size:34px;margin:8px 0">Cuéntanos tu antigüedad en la Peña</h2><p>La directiva comprobará este dato antes de asignarte el número de socio definitivo.</p><label style="display:block;margin:14px 0">¿Qué recuerdas?<select id="a4061tipo" style="width:100%;padding:12px;margin-top:6px"><option value="temporada">Conozco la temporada</option><option value="anio">Solo recuerdo el año aproximado</option><option value="no_recuerda">No lo recuerdo</option></select></label><label id="a4061tempWrap" style="display:block;margin:14px 0">Temporada aproximada<input id="a4061temporada" placeholder="Ej.: 2012/13" style="width:100%;padding:12px;margin-top:6px"></label><label id="a4061anioWrap" style="display:none;margin:14px 0">Año aproximado<input id="a4061anio" type="number" min="2007" max="2099" style="width:100%;padding:12px;margin-top:6px"></label><label style="display:block;margin:14px 0">Observaciones<textarea id="a4061obs" rows="3" placeholder="Cualquier dato que ayude a comprobarlo" style="width:100%;padding:12px;margin-top:6px"></textarea></label><p id="a4061msg"></p><button id="a4061save" type="button" class="btn btn-primary">Guardar antigüedad declarada</button></form>`;
  document.body.appendChild(dialog);
  const type=dialog.querySelector('#a4061tipo');
  type.onchange=()=>{dialog.querySelector('#a4061tempWrap').style.display=type.value==='temporada'?'block':'none';dialog.querySelector('#a4061anioWrap').style.display=type.value==='anio'?'block':'none'};
  dialog.querySelector('#a4061save').onclick=async()=>{
   const payload={antiguedad_declarada_tipo:type.value,antiguedad_declarada_temporada:type.value==='temporada'?(dialog.querySelector('#a4061temporada').value.trim()||null):null,antiguedad_declarada_anio:type.value==='anio'?(Number(dialog.querySelector('#a4061anio').value)||null):null,antiguedad_declarada_observaciones:dialog.querySelector('#a4061obs').value.trim()||null,antiguedad_estado:'declarada',numero_socio_estado:socio.numero_socio?'asignado':'pendiente'};
   if(type.value==='temporada'&&!payload.antiguedad_declarada_temporada){dialog.querySelector('#a4061msg').textContent='Indica la temporada aproximada.';return}
   if(type.value==='anio'&&!payload.antiguedad_declarada_anio){dialog.querySelector('#a4061msg').textContent='Indica el año aproximado.';return}
   const {error}=await db.from('socios').update(payload).eq('id',socio.id);
   if(error){dialog.querySelector('#a4061msg').textContent='No se pudo guardar: '+error.message;return}
   dialog.close();dialog.remove();alert('Antigüedad guardada. La directiva la revisará antes de asignar el número definitivo.');
  };
  dialog.showModal();
 }catch(error){console.warn('Antigüedad 40.6.1:',error)}
}
document.addEventListener('DOMContentLoaded',init);
})();
