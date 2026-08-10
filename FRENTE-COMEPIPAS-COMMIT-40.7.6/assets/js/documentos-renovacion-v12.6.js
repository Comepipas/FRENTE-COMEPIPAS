(()=>{
"use strict";
const DOC_KEY="frente_documentos_renovacion_v12_6";
const ADMIN_DOC_KEY="frente_documentos_admin_v12_6";
const BUCKET=window.FRENTE_SUPABASE_CONFIG?.storageBuckets?.privateDocuments||"private-documents";
const DEMO_DOCS=[
  {id:"malaga-2027-v1",title:"Documento de renovación Málaga CF 2027/28",version:"1.0",issuer:"Málaga CF",required:true,fileName:"documento-malaga-demo.pdf"},
  {id:"pena-2027-v1",title:"Consentimiento y normativa Frente Comepipas",version:"1.0",issuer:"Frente Comepipas",required:true,fileName:"documento-pena-demo.pdf"}
];
const $=id=>document.getElementById(id);
let canvas,ctx,drawing=false,hasSignature=false;

function load(){try{return JSON.parse(localStorage.getItem(DOC_KEY)||"{}")}catch{return{}}}
function save(v){localStorage.setItem(DOC_KEY,JSON.stringify(v))}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function ref(){return"DOC-"+new Date().getFullYear()+"-"+Math.random().toString(36).slice(2,9).toUpperCase()}
function isMinor(){return $("renewalMinorDemo")?.checked===true}
function configuredDocs(){try{const docs=JSON.parse(localStorage.getItem(ADMIN_DOC_KEY)||"null");return Array.isArray(docs)?docs.filter(d=>d.active!==false):DEMO_DOCS}catch{return DEMO_DOCS}}
async function openConfiguredPdf(d){try{let url="";if(d.storagePath){const result=await window.FrenteSupabase?.init();if(result?.mode!=="online")throw new Error("Supabase no está conectado.");const {data,error}=await window.FrenteSupabase.client.storage.from(BUCKET).createSignedUrl(d.storagePath,3600);if(error)throw error;url=data?.signedUrl||""}else if(d.fileName){url=`assets/docs/${encodeURIComponent(d.fileName)}`}if(!url)throw new Error("Documento sin PDF asociado.");window.open(url,"_blank","noopener,noreferrer")}catch(err){alert(`No se pudo abrir el PDF: ${err.message||err}`)}}

function renderDocuments(){
  const state=load();
  const accepted=state.accepted||{};
  const docs=configuredDocs();
  $("renewalDocumentsList").innerHTML=docs.map(d=>`
    <article class="renewal-document-card ${accepted[d.id]?"documents-complete":""}">
      <div class="renewal-document-main">
        <div><span class="document-tag">${d.required?"OBLIGATORIO":"OPCIONAL"}</span><h4>${esc(d.title)}</h4><p>${esc(d.issuer)} · Versión ${esc(d.version)}</p></div>
        <button type="button" class="btn btn-secondary btn-small" data-open-renewal-doc="${esc(d.id)}">Abrir PDF</button>
      </div>
      <label class="document-acceptance"><input type="checkbox" data-doc-accept="${esc(d.id)}" ${accepted[d.id]?"checked":""}> He descargado o revisado el documento y acepto expresamente su contenido.</label>
    </article>`).join("");
  updateProgress();
}

function updateProgress(){
  const state=load();
  const accepted=state.accepted||{};
  const docs=configuredDocs();
  const acceptedCount=docs.filter(d=>accepted[d.id]).length;
  const documentsPart=docs.length?(acceptedCount/docs.length)*70:70;
  const consent=(isMinor() ? $("tutorLegalConsent")?.checked : $("adultLegalConsent")?.checked) ? 15 : 0;
  const signature=hasSignature ? 15 : 0;
  const total=Math.round(documentsPart+consent+signature);
  if($("documentsProgress"))$("documentsProgress").value=total;
  if($("documentsProgressText"))$("documentsProgressText").textContent=total===100?"Documentación lista para firmar":`Progreso documental: ${total}%`;
}

function setupCanvas(){
  canvas=$("signatureCanvas");
  if(!canvas)return;
  ctx=canvas.getContext("2d");
  ctx.lineWidth=3;
  ctx.lineCap="round";
  ctx.strokeStyle="#132238";
  function point(e){
    const r=canvas.getBoundingClientRect();
    const src=e.touches?.[0]||e;
    return{x:(src.clientX-r.left)*(canvas.width/r.width),y:(src.clientY-r.top)*(canvas.height/r.height)};
  }
  function start(e){drawing=true;const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);e.preventDefault()}
  function move(e){if(!drawing)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();hasSignature=true;updateProgress();e.preventDefault()}
  function end(){drawing=false}
  canvas.addEventListener("pointerdown",start);
  canvas.addEventListener("pointermove",move);
  window.addEventListener("pointerup",end);
}

function clearSignature(){
  if(!ctx||!canvas)return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  hasSignature=false;
  updateProgress();
}

function toggleSigner(){
  const minor=isMinor();
  $("renewalSignerAdult").hidden=minor;
  $("renewalSignerTutor").hidden=!minor;
  updateProgress();
}

function allAccepted(){
  const accepted=load().accepted||{};
  return configuredDocs().filter(d=>d.required).every(d=>accepted[d.id]);
}
function validSigner(){
  if(isMinor()){
    return $("tutorSignerName").value.trim() && $("tutorSignerId").value.trim() &&
      $("minorMemberName").value.trim() && $("tutorLegalConsent").checked;
  }
  return $("adultSignerName").value.trim() && $("adultSignerId").value.trim() && $("adultLegalConsent").checked;
}

function signDocuments(){
  if(!allAccepted())return alert("Debes aceptar todos los documentos obligatorios.");
  if(!validSigner())return alert("Completa los datos del firmante y marca la declaración legal.");
  if(!hasSignature)return alert("Debes realizar la firma en el recuadro.");

  const previous=load();
  const proof={
    accepted:previous.accepted||{},
    completed:true,
    isMinor:isMinor(),
    signerName:isMinor()?$("tutorSignerName").value.trim():$("adultSignerName").value.trim(),
    signerId:isMinor()?$("tutorSignerId").value.trim():$("adultSignerId").value.trim(),
    relationship:isMinor()?$("tutorRelationship").value:null,
    minorName:isMinor()?$("minorMemberName").value.trim():null,
    reference:ref(),
    signedAt:new Date().toISOString(),
    signatureData:canvas.toDataURL("image/png"),
    documents:configuredDocs().map(d=>({id:d.id,title:d.title,version:d.version,issuer:d.issuer}))
  };
  save(proof);
  document.dispatchEvent(new CustomEvent("renewal-documents-completed",{detail:proof}));
  renderProof(proof);
  $("renewalDocumentsPanel").hidden=true;
  const payment=$("renewalPaymentPanel");
  if(payment)payment.hidden=false;
}

function renderProof(proof){
  let box=$("renewalDocumentProof");
  if(!box){
    box=document.createElement("div");
    box.id="renewalDocumentProof";
    box.className="document-proof";
    $("renewalDocumentsPanel").insertAdjacentElement("afterend",box);
  }
  box.innerHTML=`
    <strong>✓ Documentación firmada correctamente</strong>
    <div class="document-proof-grid">
      <div><span>Firmante</span><strong>${esc(proof.signerName)}</strong></div>
      <div><span>Tipo</span><strong>${proof.isMinor?"Tutor del menor":"Titular adulto"}</strong></div>
      <div><span>Referencia</span><strong>${esc(proof.reference)}</strong></div>
      <div><span>Fecha</span><strong>${new Date(proof.signedAt).toLocaleString("es-ES")}</strong></div>
      <div><span>Documentos</span><strong>${proof.documents.length}</strong></div>
      <div><span>Estado</span><strong>Completa</strong></div>
    </div>`;
}

function openDocuments(){
  const proof=load();
  if(proof.completed){renderProof(proof);return true}
  $("renewalDocumentsPanel").hidden=false;
  $("renewalPaymentPanel").hidden=true;
  renderDocuments();
  return false;
}

document.addEventListener("DOMContentLoaded",()=>{
  renderDocuments();
  setupCanvas();
  toggleSigner();
  const proof=load();
  if(proof.completed)renderProof(proof);

  $("renewalDocumentsList")?.addEventListener("click",e=>{
    const id=e.target.dataset.openRenewalDoc;
    if(!id)return;
    const doc=configuredDocs().find(d=>d.id===id);
    if(doc)openConfiguredPdf(doc);
  });
  $("renewalDocumentsList")?.addEventListener("change",e=>{
    const id=e.target.dataset.docAccept;
    if(!id)return;
    const state=load();
    state.accepted=state.accepted||{};
    state.accepted[id]=e.target.checked;
    save(state);
    renderDocuments();
  });
  $("renewalMinorDemo")?.addEventListener("change",toggleSigner);
  ["adultLegalConsent","tutorLegalConsent"].forEach(id=>$(id)?.addEventListener("change",updateProgress));
  $("clearSignatureBtn")?.addEventListener("click",clearSignature);
  $("cancelDocumentsBtn")?.addEventListener("click",()=>{$("renewalDocumentsPanel").hidden=true});
  $("signDocumentsBtn")?.addEventListener("click",signDocuments);

  document.addEventListener("renewal-confirm-request",e=>{
    const complete=openDocuments();
    e.detail.complete=complete;
  });
});

window.FrenteDocumentosRenovacion={open:openDocuments,isComplete:()=>load().completed===true,reset:()=>{localStorage.removeItem(DOC_KEY);location.reload()}};
})();