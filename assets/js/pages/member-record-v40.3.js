(()=>{
  "use strict";
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const memberId=new URLSearchParams(location.search).get("id")||new URLSearchParams(location.search).get("incidencia");
  const text=v=>v==null||String(v).trim()===""?"Sin informar":String(v);

  async function enhance(){
    if(!memberId)return;
    const db=window.FrenteDatabase.getClient();
    const {data:m,error}=await db.from("socios").select("numero_socio,numero_socio_provisional,numero_socio_estado,antiguedad_declarada_tipo,antiguedad_declarada_temporada,antiguedad_declarada_anio,antiguedad_declarada_observaciones,antiguedad_estado,precio_abono,sector").eq("id",memberId).single();
    if(error)return;
    const numberInput=$('[name="numero_socio"]');
    if(numberInput){
      const definitive=m.numero_socio&&String(m.numero_socio_estado).toLowerCase()==="asignado";
      numberInput.value=definitive?String(m.numero_socio).padStart(4,"0"):(m.numero_socio_provisional?`P-${String(m.numero_socio_provisional).padStart(4,"0")}`:"Pendiente de declarar o validar");
      const label=numberInput.closest(".record-field")?.querySelector("label");if(label)label.textContent=definitive?"Número de socio definitivo":"Número provisional interno";
    }
    const pena=$('[data-panel="pena"] .record-grid');
    if(pena&&!$("#antiquityStatus")){
      const declared=m.antiguedad_declarada_temporada||m.antiguedad_declarada_anio||m.antiguedad_declarada_tipo;
      pena.insertAdjacentHTML("beforeend",`<div id="antiquityStatus" class="record-field full"><label>Antigüedad declarada por el socio</label><div class="record-history-item"><strong>${esc(declared||"No declarada")}</strong><span>Estado: ${esc(text(m.antiguedad_estado))}</span>${m.antiguedad_declarada_observaciones?`<small>${esc(m.antiguedad_declarada_observaciones)}</small>`:""}</div></div>`);
    }
    const price=$('[name="precio_abono"]');
    if(price&&m.precio_abono==null){price.placeholder="Importe sin informar";price.value=""}
    const sector=$('[name="sector"]');if(sector&&!m.sector)sector.placeholder="Sector pendiente";
    const fee=$('[name="cuota_al_dia"]');if(fee){fee.disabled=true;fee.closest("label")?.append(" (calculado desde Cuotas y pagos)")}
    await addPaymentButton(db);
  }

  async function addPaymentButton(db){
    const box=$("#feesBox");if(!box)return;
    const {data:season}=await db.from("temporadas").select("id,nombre").eq("activa",true).limit(1).maybeSingle();
    if(!season)return;
    const {data:fee}=await db.from("cuotas_socios").select("id,estado,importe").eq("socio_id",memberId).eq("temporada_id",season.id).maybeSingle();
    if(!fee||String(fee.estado).toLowerCase()==="pagada"||$("#recordMarkPaid"))return;
    box.insertAdjacentHTML("afterend",`<div style="margin-top:14px"><button id="recordMarkPaid" type="button" class="btn btn-primary">Registrar pago de ${Number(fee.importe||0).toLocaleString("es-ES",{style:"currency",currency:"EUR"})}</button><small style="display:block;margin-top:8px">Temporada ${esc(season.nombre)}. Esta acción actualiza el registro económico real.</small></div>`);
    $("#recordMarkPaid").onclick=async()=>{
      if(!confirm(`¿Confirmas que se ha cobrado la cuota de ${season.nombre}?`))return;
      const method=prompt("Método de pago (transferencia, efectivo, tarjeta…)","Transferencia")||"Registro manual";
      const reference=prompt("Referencia o concepto del ingreso (opcional)","")||null;
      const {error}=await db.from("cuotas_socios").update({estado:"pagada",fecha_pago:new Date().toISOString().slice(0,10),metodo_pago:method,referencia:reference,observaciones:"Pago registrado desde la ficha del socio",updated_at:new Date().toISOString()}).eq("id",fee.id);
      if(error)return window.FrenteNotify.error(error.message);
      window.FrenteNotify.success("Pago registrado correctamente en la cuota de la temporada activa.");
      setTimeout(()=>location.reload(),500);
    };
  }
  window.addEventListener("load",()=>setTimeout(()=>enhance().catch(console.error),250));
})();
