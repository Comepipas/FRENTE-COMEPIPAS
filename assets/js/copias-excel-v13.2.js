(()=>{
"use strict";
const $=id=>document.getElementById(id);
const KEYS={
 members:"frente_members_v112",
 materialItems:"frente_material_items_v12_9",
 materialRequests:"frente_material_requests_v12_9",
 adminPayments:"frente_admin_pagos_demo_v12_5",
 memberPayment:"frente_renovacion_pago_demo_2027_28",
 documents:"frente_documentos_renovacion_v12_6",
 adminDocuments:"frente_documentos_admin_v12_6",
 renewalDecision:"frente_renovacion_demo_2027_28"
};
const HISTORY_KEY="frente_backup_history_v13_2";
let restoreWorkbook=null,restoreData={};

function toast(t){$("backupToast").textContent=t;$("backupToast").hidden=false;setTimeout(()=>$("backupToast").hidden=true,2400)}
function parse(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||"null");return value??fallback}catch{return fallback}}
function array(value){return Array.isArray(value)?value:[]}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
function isoDate(){return new Date().toISOString().replace(/[:.]/g,"-").slice(0,19)}
function countObject(value){return Object.keys(object(value)).length}
function refreshStats(){
 const members=array(parse(KEYS.members,window.FRENTE_MEMBERS_DB||[]));
 const requests=array(parse(KEYS.materialRequests,[]));
 const items=array(parse(KEYS.materialItems,[]));
 const payments=object(parse(KEYS.adminPayments,{}));
 const docs=object(parse(KEYS.documents,{}));
 $("backupMembersCount").textContent=members.length;
 $("backupRequestsCount").textContent=requests.length;
 $("backupItemsCount").textContent=items.length;
 $("backupPaymentsCount").textContent=countObject(payments)+(localStorage.getItem(KEYS.memberPayment)?1:0);
 $("backupDocumentsCount").textContent=docs.completed?1:0;
}
function rowsFromObject(obj){
 return Object.entries(object(obj)).map(([clave,valor])=>({Clave:clave,Valor:JSON.stringify(valor)}));
}
function objectFromRows(rows){
 const result={};
 rows.forEach(r=>{if(!r.Clave)return;try{result[r.Clave]=JSON.parse(r.Valor)}catch{result[r.Clave]=r.Valor}});
 return result;
}
function metadata(){
 return [{
  "Aplicación":"Frente Comepipas",
  "Versión":"13.2",
  "Fecha de copia":new Date().toISOString(),
  "Navegador":navigator.userAgent,
  "Formato":"Copia de seguridad Excel"
 }];
}
function createBackup(){
 const members=array(parse(KEYS.members,window.FRENTE_MEMBERS_DB||[]));
 const items=array(parse(KEYS.materialItems,[]));
 const requests=array(parse(KEYS.materialRequests,[]));
 const adminPayments=rowsFromObject(parse(KEYS.adminPayments,{}));
 const documents=rowsFromObject(parse(KEYS.documents,{}));
 const adminDocuments=array(parse(KEYS.adminDocuments,[]));
 const settings=[
  {Clave:KEYS.memberPayment,Valor:localStorage.getItem(KEYS.memberPayment)||""},
  {Clave:KEYS.renewalDecision,Valor:localStorage.getItem(KEYS.renewalDecision)||""}
 ];
 window.FrenteExcel.writeFile(`FrenteComepipas_Copia_${isoDate()}.xlsx`,{
  "Información":metadata(),
  "Socios":members,
  "Material":items,
  "Solicitudes":requests,
  "Pagos":adminPayments,
  "Documentación":documents,
  "Docs administración":adminDocuments,
  "Configuración":settings
 });
 const history=array(parse(HISTORY_KEY,[]));
 history.unshift({date:new Date().toISOString(),members:members.length,requests:requests.length,items:items.length});
 localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,20)));
 renderHistory();
 toast("Copia Excel creada correctamente.");
}
async function chooseRestore(file){
 if(!file)return;
 try{
  restoreWorkbook=await window.FrenteExcel.readFile(file);
  restoreData={};
  restoreWorkbook.SheetNames.forEach(name=>{
   const rows=window.XLSX.utils.sheet_to_json(restoreWorkbook.Sheets[name],{defval:"",raw:false});
   restoreData[name]=rows;
  });
  $("restoreFileInfo").hidden=false;
  $("restoreFileInfo").innerHTML=`<strong>${file.name}</strong><br>${restoreWorkbook.SheetNames.length} hojas detectadas`;
  renderPreview();
 }catch(error){console.error(error);toast("No se pudo leer la copia Excel.")}
}
function renderPreview(){
 const cards=[
  ["Socios",array(restoreData["Socios"]).length],
  ["Material",array(restoreData["Material"]).length],
  ["Solicitudes",array(restoreData["Solicitudes"]).length],
  ["Pagos",array(restoreData["Pagos"]).length],
  ["Documentación",array(restoreData["Documentación"]).length],
  ["Docs administración",array(restoreData["Docs administración"]).length]
 ];
 $("restoreSheetCards").innerHTML=cards.map(([name,count])=>`<article class="restore-sheet-card"><span>${name}</span><strong>${count}</strong></article>`).join("");
 $("restorePreviewText").textContent=`La copia contiene ${restoreWorkbook.SheetNames.length} hojas. Selecciona qué módulos deseas recuperar.`;
 $("restorePreviewPanel").hidden=false;
}
function restore(){
 if(!$("restoreConfirm").checked)return;
 if($("restoreMembers").checked){
  localStorage.setItem(KEYS.members,JSON.stringify(array(restoreData["Socios"])));
 }
 if($("restoreMaterial").checked){
  localStorage.setItem(KEYS.materialItems,JSON.stringify(array(restoreData["Material"])));
  localStorage.setItem(KEYS.materialRequests,JSON.stringify(array(restoreData["Solicitudes"])));
 }
 if($("restorePayments").checked){
  localStorage.setItem(KEYS.adminPayments,JSON.stringify(objectFromRows(array(restoreData["Pagos"]))));
  const cfg=array(restoreData["Configuración"]);
  const payment=cfg.find(x=>x.Clave===KEYS.memberPayment);
  if(payment?.Valor)localStorage.setItem(KEYS.memberPayment,payment.Valor);else localStorage.removeItem(KEYS.memberPayment);
  const decision=cfg.find(x=>x.Clave===KEYS.renewalDecision);
  if(decision?.Valor)localStorage.setItem(KEYS.renewalDecision,decision.Valor);else localStorage.removeItem(KEYS.renewalDecision);
 }
 if($("restoreDocuments").checked){
  localStorage.setItem(KEYS.documents,JSON.stringify(objectFromRows(array(restoreData["Documentación"]))));
  localStorage.setItem(KEYS.adminDocuments,JSON.stringify(array(restoreData["Docs administración"])));
 }
 $("restorePreviewPanel").hidden=true;
 $("restoreFileInfo").hidden=true;
 $("restoreFileInput").value="";
 $("restoreConfirm").checked=false;
 $("applyRestoreBtn").disabled=true;
 refreshStats();
 toast("Datos restaurados correctamente.");
}
function cancelRestore(){
 restoreWorkbook=null;restoreData={};
 $("restorePreviewPanel").hidden=true;
 $("restoreFileInfo").hidden=true;
 $("restoreFileInput").value="";
 $("restoreConfirm").checked=false;
 $("applyRestoreBtn").disabled=true;
}
function renderHistory(){
 const history=array(parse(HISTORY_KEY,[]));
 $("backupHistoryList").innerHTML=history.map(h=>`<article class="backup-history-item"><div><strong>Copia Excel</strong><small>${new Date(h.date).toLocaleString("es-ES")}</small></div><span>${h.members} socios</span><span>${h.requests} solicitudes</span></article>`).join("")||"<p>Todavía no se ha creado ninguna copia desde este navegador.</p>";
}
document.addEventListener("DOMContentLoaded",()=>{
 refreshStats();renderHistory();
 $("createBackupBtn").addEventListener("click",createBackup);
 $("downloadBackupBtn").addEventListener("click",createBackup);
 $("chooseRestoreBtn").addEventListener("click",()=>$("restoreFileInput").click());
 $("restoreFileInput").addEventListener("change",e=>chooseRestore(e.target.files[0]));
 $("restoreConfirm").addEventListener("change",e=>$("applyRestoreBtn").disabled=!e.target.checked);
 $("applyRestoreBtn").addEventListener("click",restore);
 $("cancelRestoreBtn").addEventListener("click",cancelRestore);
});
})();