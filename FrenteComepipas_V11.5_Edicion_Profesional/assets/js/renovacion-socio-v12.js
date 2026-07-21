(()=>{
"use strict";
const KEY="frente_renovacion_demo_2027_28";
const PAYMENT_KEY="frente_renovacion_pago_demo_2027_28";
const money=v=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(v||0));
const data={abono:425,descuento:75,cuota:20,sector:"Preferencia Baja",categoria:"Adulto",socio:"Socio nº 001"};
const total=()=>data.abono-data.descuento+data.cuota;
function el(id){return document.getElementById(id)}
function set(id,v){const e=el(id);if(e)e.textContent=v}
function paymentLabel(value){return({transferencia:"Transferencia bancaria",tarjeta:"Tarjeta / TPV",efectivo:"Efectivo"})[value]||value}
function createReference(){return"FC-"+new Date().getFullYear()+"-"+Math.random().toString(36).slice(2,8).toUpperCase()}
function getPayment(){try{return JSON.parse(localStorage.getItem(PAYMENT_KEY)||"null")}catch{return null}}
function setHidden(id,hidden){const e=el(id);if(e)e.hidden=hidden}
function applyStatus(status){
 const badge=el("renewalStatus"),result=el("renewalResult"),yes=el("renewalConfirmBtn"),no=el("renewalNoBtn");
 if(!badge)return;
 const payment=getPayment();
 badge.classList.remove("status-confirmed","status-no","status-paid");
 setHidden("renewalPaymentPanel",true);
 setHidden("renewalReceipt",true);
 if(payment){
   badge.textContent=payment.method==="tarjeta"?"Pagada (demostración)":"Pago registrado";
   badge.classList.add("status-paid");
   result.textContent=payment.method==="tarjeta"
     ?"El pago de demostración se ha completado correctamente."
     :"La forma de pago ha quedado registrada. En la versión real la directiva validará el ingreso.";
   yes.disabled=true; no.disabled=true;
   renderReceipt(payment);
   setHidden("renewalReceipt",false);
 }else if(status==="solicitada"){
   badge.textContent="Renovación solicitada";
   badge.classList.add("status-confirmed");
   result.textContent="Tu decisión ha quedado registrada. Ahora puedes seleccionar la forma de pago.";
   yes.disabled=true; no.disabled=false;
   setHidden("renewalPaymentPanel",false);
 }else if(status==="no_renueva"){
   badge.textContent="No renueva";
   badge.classList.add("status-no");
   result.textContent="Has indicado que no deseas renovar. Puedes cambiar la decisión mientras la campaña permanezca abierta.";
   yes.disabled=false; no.disabled=true;
 }else{
   badge.textContent="Pendiente de decisión";
   result.textContent="";
   yes.disabled=false; no.disabled=false;
 }
}
function renderReceipt(payment){
 set("receiptMember",data.socio);
 set("receiptAmount",money(total()));
 set("receiptMethod",paymentLabel(payment.method));
 set("receiptReference",payment.reference);
 set("receiptDate",new Date(payment.date).toLocaleString("es-ES"));
}
function selectedMethod(){
 return document.querySelector('input[name="renewalPaymentMethod"]:checked')?.value||"transferencia";
}
function simulatePayment(){
 if(window.FrenteDocumentosRenovacion&&!window.FrenteDocumentosRenovacion.isComplete()){
   alert("Debes completar y firmar la documentación antes de pagar.");
   window.FrenteDocumentosRenovacion.open();
   return;
 }
 const method=selectedMethod();
 const payment={method,reference:createReference(),date:new Date().toISOString(),amount:total()};
 localStorage.setItem(PAYMENT_KEY,JSON.stringify(payment));
 applyStatus(localStorage.getItem(KEY));
}
function resetDemo(){
 localStorage.removeItem(KEY);
 localStorage.removeItem(PAYMENT_KEY);
 applyStatus(null);
}
document.addEventListener("DOMContentLoaded",()=>{
 set("renewalSeasonTicket",money(data.abono));
 set("renewalDiscount","−"+money(data.descuento));
 set("renewalFee",money(data.cuota));
 set("renewalTotal",money(total()));
 set("renewalPaymentAmount",money(total()));
 set("renewalSector",data.sector);
 set("renewalCategory",data.categoria);
 applyStatus(localStorage.getItem(KEY));
 const yes=el("renewalConfirmBtn"),no=el("renewalNoBtn");
 if(yes)yes.onclick=()=>{
   const evt=new CustomEvent("renewal-confirm-request",{detail:{complete:false}});
   document.dispatchEvent(evt);
   if(!evt.detail.complete){
     localStorage.setItem(KEY,"solicitada");
     localStorage.removeItem(PAYMENT_KEY);
     applyStatus("solicitada");
     document.getElementById("renewalPaymentPanel").hidden=true;
     return;
   }
   localStorage.setItem(KEY,"solicitada");
   localStorage.removeItem(PAYMENT_KEY);
   applyStatus("solicitada");
};
 if(no)no.onclick=()=>{localStorage.setItem(KEY,"no_renueva");localStorage.removeItem(PAYMENT_KEY);applyStatus("no_renueva")};
 el("renewalPayBtn")?.addEventListener("click",simulatePayment);
 el("renewalCancelPaymentBtn")?.addEventListener("click",()=>setHidden("renewalPaymentPanel",true));
 el("renewalPrintReceiptBtn")?.addEventListener("click",()=>window.print());
 el("renewalResetDemoBtn")?.addEventListener("click",resetDemo);
});
})();