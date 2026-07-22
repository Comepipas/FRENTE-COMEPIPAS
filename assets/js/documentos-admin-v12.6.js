(()=>{
"use strict";
const KEY="frente_documentos_admin_v12_6";
const BUCKET=window.FRENTE_SUPABASE_CONFIG?.storageBuckets?.privateDocuments||"private-documents";
const MAX_BYTES=20*1024*1024;
const $=id=>document.getElementById(id);
const defaults=[
{id:"malaga-2027-v1",title:"Documento de renovación Málaga CF 2027/28",issuer:"Málaga CF",version:"1.0",audience:"todos",fileName:"documento-malaga-demo.pdf",required:true,active:true},
{id:"pena-2027-v1",title:"Consentimiento y normativa Frente Comepipas",issuer:"Frente Comepipas",version:"1.0",audience:"todos",fileName:"documento-pena-demo.pdf",required:true,active:true}
];
let client=null;
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");return Array.isArray(x)?x:defaults}catch{return defaults}}
function save(v){localStorage.setItem(KEY,JSON.stringify(v))}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function slug(v){return String(v||"documento").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70)||"documento"}
function isPdf(file){return file&&((file.type||"").toLowerCase()==="application/pdf"||/\.pdf$/i.test(file.name||""))}
async function initClient(){
 if(client)return client;
 if(!window.FrenteSupabase)throw new Error("No se ha cargado el cliente de Supabase.");
 const result=await window.FrenteSupabase.init();
 if(result?.mode!=="online"||!window.FrenteSupabase.client)throw new Error("La subida de PDFs necesita conexión con Supabase.");
 client=window.FrenteSupabase.client;
 return client;
}
function setCurrentFile(d){
 const box=$("documentCurrentFile");
 if(!box)return;
 if(!d?.fileName){box.hidden=true;box.innerHTML="";return}
 box.hidden=false;
 box.innerHTML=`<span>PDF actual: <strong>${esc(d.fileName)}</strong></span><button type="button" class="btn btn-secondary btn-small" id="viewCurrentDocumentBtn">Abrir PDF</button>`;
 $("viewCurrentDocumentBtn")?.addEventListener("click",()=>openPdf(d));
}
function render(){
 const docs=load();
 $("adminDocsActive").textContent=docs.filter(d=>d.active).length;
 $("adminDocsRequired").textContent=docs.filter(d=>d.required).length;
 $("adminDocsMinors").textContent=docs.filter(d=>["todos","menores","tutores"].includes(d.audience)).length;
 $("adminDocumentsList").innerHTML=docs.map(d=>`
 <article class="document-admin-card">
  <div class="meta"><strong>${esc(d.title)}</strong><small>${esc(d.issuer)} · Versión ${esc(d.version)} · ${esc(d.fileName||"Sin archivo")}</small>
   <div class="document-admin-tags"><span class="document-admin-tag">${esc(d.audience)}</span>${d.required?'<span class="document-admin-tag required">Obligatorio</span>':''}<span class="document-admin-tag">${d.active?"Activo":"Inactivo"}</span></div>
  </div>
  <div class="row-actions">${d.fileName?`<button class="btn btn-secondary btn-small" data-open-doc="${esc(d.id)}">Abrir PDF</button>`:""}<button class="btn btn-secondary btn-small" data-edit-doc="${esc(d.id)}">Editar</button><button class="btn btn-danger btn-small" data-delete-doc="${esc(d.id)}">Eliminar</button></div>
 </article>`).join("");
}
function open(d=null){
 $("documentId").value=d?.id||"";
 $("documentTitle").value=d?.title||"";
 $("documentIssuer").value=d?.issuer||"Málaga CF";
 $("documentVersion").value=d?.version||"1.0";
 $("documentAudience").value=d?.audience||"todos";
 $("documentFileName").value=d?.fileName||"";
 $("documentStoragePath").value=d?.storagePath||"";
 $("documentPdfFile").value="";
 $("documentFileHelp").textContent=d?.fileName?"Selecciona otro PDF solo si quieres reemplazar el actual.":"Selecciona un PDF de tu ordenador (máximo 20 MB).";
 $("documentRequired").checked=d?.required??true;
 $("documentActive").checked=d?.active??true;
 setCurrentFile(d);
 $("documentDialog").showModal();
}
async function uploadPdf(file,id,title){
 if(!isPdf(file))throw new Error("Solo se permiten archivos PDF.");
 if(file.size>MAX_BYTES)throw new Error("El PDF supera el máximo permitido de 20 MB.");
 const db=await initClient();
 const safeName=`${slug(title)}-${Date.now()}.pdf`;
 const path=`renovaciones/${id}/${safeName}`;
 const {error}=await db.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:"application/pdf",cacheControl:"3600"});
 if(error)throw error;
 return{storagePath:path,fileName:file.name};
}
async function removeStored(path){
 if(!path)return;
 try{const db=await initClient();await db.storage.from(BUCKET).remove([path])}catch(err){console.warn("No se pudo eliminar el PDF anterior:",err)}
}
async function openPdf(d){
 try{
  let url="";
  if(d.storagePath){
   const db=await initClient();
   const {data,error}=await db.storage.from(BUCKET).createSignedUrl(d.storagePath,3600);
   if(error)throw error;
   url=data?.signedUrl||"";
  }else if(d.fileName){url=`assets/docs/${encodeURIComponent(d.fileName)}`}
  if(!url)throw new Error("Este documento no tiene un PDF asociado.");
  window.open(url,"_blank","noopener,noreferrer");
 }catch(err){alert(`No se pudo abrir el PDF: ${err.message||err}`)}
}
async function submit(e){
 e.preventDefault();
 const button=$("documentForm").querySelector('button[type="submit"],button[value="default"]');
 const docs=load(),id=$("documentId").value||`doc-${Date.now()}`;
 const old=docs.find(d=>d.id===id)||null;
 const file=$("documentPdfFile").files?.[0]||null;
 if(!old&&!file)return alert("Selecciona el archivo PDF del documento.");
 const originalText=button.textContent;
 button.disabled=true;button.textContent=file?"Subiendo PDF…":"Guardando…";
 try{
  let fileName=$("documentFileName").value.trim();
  let storagePath=$("documentStoragePath").value.trim();
  if(file){
   const uploaded=await uploadPdf(file,id,$("documentTitle").value.trim());
   if(old?.storagePath&&old.storagePath!==uploaded.storagePath)await removeStored(old.storagePath);
   fileName=uploaded.fileName;storagePath=uploaded.storagePath;
  }
  const value={id,title:$("documentTitle").value.trim(),issuer:$("documentIssuer").value,version:$("documentVersion").value.trim(),audience:$("documentAudience").value,fileName,storagePath,required:$("documentRequired").checked,active:$("documentActive").checked};
  const i=docs.findIndex(d=>d.id===id);
  if(i>=0)docs[i]=value;else docs.push(value);
  save(docs);$("documentDialog").close();render();
 }catch(err){alert(`No se pudo guardar el documento: ${err.message||err}`)}
 finally{button.disabled=false;button.textContent=originalText}
}
async function deleteDocument(d){
 if(!confirm(`¿Eliminar el documento "${d.title}"?`))return;
 if(d.storagePath&&confirm("¿Eliminar también el PDF almacenado en Supabase?"))await removeStored(d.storagePath);
 save(load().filter(x=>x.id!==d.id));render();
}
document.addEventListener("DOMContentLoaded",()=>{
 if(!$("adminDocumentsList"))return;
 render();
 $("newDocumentBtn").addEventListener("click",()=>open());
 $("documentForm").addEventListener("submit",submit);
 $("documentPdfFile").addEventListener("change",()=>{
  const file=$("documentPdfFile").files?.[0];
  if(!file)return;
  if(!isPdf(file)){alert("Solo se permiten archivos PDF.");$("documentPdfFile").value="";return}
  if(file.size>MAX_BYTES){alert("El PDF supera el máximo permitido de 20 MB.");$("documentPdfFile").value="";return}
  $("documentFileHelp").textContent=`Seleccionado: ${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`;
 });
 $("adminDocumentsList").addEventListener("click",e=>{
  const docs=load();
  const edit=e.target.dataset.editDoc,del=e.target.dataset.deleteDoc,openId=e.target.dataset.openDoc;
  if(edit)open(docs.find(d=>d.id===edit));
  if(del){const d=docs.find(x=>x.id===del);if(d)deleteDocument(d)}
  if(openId){const d=docs.find(x=>x.id===openId);if(d)openPdf(d)}
 });
});
})();
