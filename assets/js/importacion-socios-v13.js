(()=>{
"use strict";
const STORAGE_KEY="frente_members_v112";
const $=id=>document.getElementById(id);
const TARGETS=[
["numero","Número de socio",["numero","número","num_socio","numero_socio","socio"]],
["nombre","Nombre y apellidos",["nombre","nombre_completo","socio_nombre","apellidos"]],
["dni","DNI/NIE",["dni","nie","documento"]],
["nacimiento","Fecha de nacimiento",["nacimiento","fecha_nacimiento","fecha de nacimiento"]],
["direccion","Dirección",["direccion","dirección","domicilio"]],
["telefono","Teléfono",["telefono","teléfono","movil","móvil"]],
["email","Correo electrónico",["email","correo","correo_electronico"]],
["alta","Fecha de alta",["alta","fecha_alta"]],
["estado","Estado",["estado"]],
["cuenta","Cuenta web",["cuenta","cuenta_web"]],
["categoria","Categoría",["categoria","categoría"]],
["cuota","Estado de cuota",["cuota","estado_cuota"]],
["importeCuota","Importe cuota",["importe_cuota","importeCuota"]],
["tipo","Tipo de socio",["tipo","tipo_socio"]],
["sector","Sector",["sector"]],
["fila","Fila",["fila"]],
["asiento","Asiento",["asiento"]],
["precioAbono","Precio abono",["precio_abono","precioAbono"]],
["observaciones","Observaciones",["observaciones","notas"]]
];
let rawText="",headers=[],rows=[],mapping={},analysis=[],previewFilter="";
function toast(t){$("importToast").textContent=t;$("importToast").hidden=false;setTimeout(()=>$("importToast").hidden=true,2300)}
function normalize(v){return String(v??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function parseCsv(text){
 const first=text.split(/\r?\n/).find(Boolean)||"";
 const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?";":",";
 const result=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
  if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}
  if(c==='"'){quoted=!quoted;continue}
  if(c===delimiter&&!quoted){row.push(cell);cell="";continue}
  if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&n==="\n")i++;row.push(cell);if(row.some(x=>x.trim()!==""))result.push(row);row=[];cell="";continue}
  cell+=c;
 }
 row.push(cell);if(row.some(x=>x.trim()!==""))result.push(row);
 return result;
}
function showStep(n){document.querySelectorAll(".import-panel").forEach(x=>x.classList.remove("active"));$(`step${n}`).classList.add("active");document.querySelectorAll("[data-step-card]").forEach(x=>x.classList.toggle("active",Number(x.dataset.stepCard)===n))}
function readFile(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{rawText=reader.result;const parsed=parseCsv(rawText);if(parsed.length<2)return toast("El archivo debe tener encabezados y al menos una fila.");headers=parsed[0].map(x=>x.trim());rows=parsed.slice(1);$("fileInfo").hidden=false;$("fileInfo").innerHTML=`<strong>${file.name}</strong><br>${rows.length} filas detectadas · ${headers.length} columnas`;$("goStep2Btn").disabled=false;prepareMapping()};reader.readAsText(file,"UTF-8")}
function prepareMapping(){mapping={};TARGETS.forEach(([key,label,aliases])=>{const idx=headers.findIndex(h=>aliases.includes(normalize(h)));mapping[key]=idx>=0?headers[idx]:""});$("mappingGrid").innerHTML=TARGETS.map(([key,label])=>`<label class="mapping-row"><span>${label}</span><select data-map="${key}"><option value="">No importar</option>${headers.map(h=>`<option ${mapping[key]===h?"selected":""}>${escapeHtml(h)}</option>`).join("")}</select></label>`).join("")}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function currentMembers(){try{const local=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");return Array.isArray(local)?local:(window.FRENTE_MEMBERS_DB||[])}catch{return window.FRENTE_MEMBERS_DB||[]}}
function valueAt(row,key){const h=mapping[key];if(!h)return"";return String(row[headers.indexOf(h)]??"").trim()}
function validEmail(v){return !v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function validDate(v){return !v||/^\d{4}-\d{2}-\d{2}$/.test(v)}
function analyze(){
 document.querySelectorAll("[data-map]").forEach(s=>mapping[s.dataset.map]=s.value);
 if(!mapping.numero||!mapping.nombre)return toast("Número de socio y nombre son obligatorios.");
 const members=currentMembers();
 analysis=rows.map((row,index)=>{
  const data={};TARGETS.forEach(([k])=>data[k]=valueAt(row,k));
  const errors=[];
  if(!data.numero)errors.push("Falta número de socio");
  if(!data.nombre)errors.push("Falta nombre");
  if(!validEmail(data.email))errors.push("Email no válido");
  if(!validDate(data.nacimiento))errors.push("Nacimiento debe ser AAAA-MM-DD");
  const duplicate=members.find(m=>normalize(m.numero)===normalize(data.numero)||data.dni&&normalize(m.dni)===normalize(data.dni));
  const duplicateInFile=rows.slice(0,index).some(r=>normalize(valueAt(r,"numero"))===normalize(data.numero)&&data.numero);
  if(duplicateInFile)errors.push("Número repetido dentro del archivo");
  return{line:index+2,data,result:errors.length?"error":duplicate?"actualizar":"nuevo",detail:errors.join("; ")||(duplicate?"Coincide con socio existente":"Alta nueva"),existingId:duplicate?.id||null};
 });
 renderAnalysis();showStep(3)
}
function renderAnalysis(){const filtered=analysis.filter(x=>!previewFilter||x.result===previewFilter);$("summaryRows").textContent=analysis.length;$("summaryNew").textContent=analysis.filter(x=>x.result==="nuevo").length;$("summaryUpdates").textContent=analysis.filter(x=>x.result==="actualizar").length;$("summaryErrors").textContent=analysis.filter(x=>x.result==="error").length;$("downloadErrorsBtn").hidden=!analysis.some(x=>x.result==="error");$("analysisTable").innerHTML=filtered.map(x=>`<tr><td>${x.line}</td><td>${escapeHtml(x.data.numero)}</td><td>${escapeHtml(x.data.nombre)}</td><td>${escapeHtml(x.data.dni)}</td><td>${escapeHtml(x.data.email)}</td><td><span class="result-pill ${x.result}">${x.result}</span></td><td>${escapeHtml(x.detail)}</td></tr>`).join("");$("applyImportBtn").disabled=analysis.every(x=>x.result==="error")}
function applyImport(){const members=currentMembers().map(x=>({...x}));let added=0,updated=0;analysis.filter(x=>x.result!=="error").forEach(x=>{const d=x.data;const value={id:x.existingId||`socio-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,numero:d.numero,nombre:d.nombre,dni:d.dni,nacimiento:d.nacimiento,direccion:d.direccion,telefono:d.telefono,email:d.email,alta:d.alta||new Date().toISOString().slice(0,10),estado:d.estado||"Activo",cuenta:d.cuenta||"Pendiente de activar",categoria:d.categoria||"Adulto",cuota:d.cuota||"Pendiente",importeCuota:d.importeCuota||"0",tipo:d.tipo||"Socio",sector:d.sector,fila:d.fila,asiento:d.asiento,precioAbono:d.precioAbono||"0",observaciones:d.observaciones};const pos=members.findIndex(m=>m.id===x.existingId);if(pos>=0){members[pos]={...members[pos],...value};updated++}else{members.push(value);added++}});localStorage.setItem(STORAGE_KEY,JSON.stringify(members));$("completeText").textContent=`Se han creado ${added} socios y actualizado ${updated}. Las filas con errores no se han importado.`;showStep(4)}
function downloadErrors(){const errors=analysis.filter(x=>x.result==="error"),head=["fila","numero","nombre","dni","email","error"],lines=[head.join(";")].concat(errors.map(x=>[x.line,x.data.numero,x.data.nombre,x.data.dni,x.data.email,x.detail].map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")));download("errores-importacion-socios.csv","\ufeff"+lines.join("\n"))}
function download(name,text){const blob=new Blob([text],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
function reset(){rawText="";headers=[];rows=[];mapping={};analysis=[];$("csvFileInput").value="";$("fileInfo").hidden=true;$("goStep2Btn").disabled=true;showStep(1)}
document.addEventListener("DOMContentLoaded",()=>{$("chooseCsvBtn").onclick=()=>$("csvFileInput").click();$("csvFileInput").onchange=e=>readFile(e.target.files[0]);$("dropZone").ondragover=e=>{e.preventDefault();$("dropZone").classList.add("dragover")};$("dropZone").ondragleave=()=>$("dropZone").classList.remove("dragover");$("dropZone").ondrop=e=>{e.preventDefault();$("dropZone").classList.remove("dragover");readFile(e.dataTransfer.files[0])};$("goStep2Btn").onclick=()=>showStep(2);$("analyzeBtn").onclick=analyze;document.querySelectorAll("[data-back]").forEach(b=>b.onclick=()=>showStep(Number(b.dataset.back)));document.querySelectorAll("[data-preview-filter]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-preview-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");previewFilter=b.dataset.previewFilter;renderAnalysis()});$("applyImportBtn").onclick=applyImport;$("downloadErrorsBtn").onclick=downloadErrors;$("resetImportBtn").onclick=reset;$("newImportBtn").onclick=reset})
})();