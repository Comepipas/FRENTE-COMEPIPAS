(()=>{
"use strict";
const STORAGE_KEY="frente_members_v112";
const $=id=>document.getElementById(id);
const TARGETS=[
["numero","Número de socio",["numero","número","num_socio","numero_socio","socio","numero de abonado","número de abonado","abonado"]],
["nombre","Nombre y apellidos",["nombre","nombre_completo","socio_nombre","apellidos","nombre y apellidos","nombre completo"]],
["dni","DNI/NIE",["dni","nie","documento"]],
["nacimiento","Fecha de nacimiento",["nacimiento","fecha_nacimiento","fecha de nacimiento"]],
["direccion","Dirección",["direccion","dirección","domicilio"]],
["telefono","Teléfono",["telefono","teléfono","movil","móvil"]],
["email","Correo electrónico",["email","correo","correo_electronico","correo electrónico","direccion de correo electronico","dirección de correo electrónico"]],
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
let workbook=null,headers=[],rows=[],mapping={},analysis=[],previewFilter="",currentFile=null;
function toast(t){$("importToast").textContent=t;$("importToast").hidden=false;setTimeout(()=>$("importToast").hidden=true,2300)}
function normalize(v){return String(v??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function showStep(n){document.querySelectorAll(".import-panel").forEach(x=>x.classList.remove("active"));$(`step${n}`).classList.add("active");document.querySelectorAll("[data-step-card]").forEach(x=>x.classList.toggle("active",Number(x.dataset.stepCard)===n))}
function parseCsvText(text){
 const first=text.split(/\r?\n/).find(Boolean)||"";
 const delimiter=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?";":",";
 const result=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
  if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue}
  if(c==='"'){quoted=!quoted;continue}
  if(c===delimiter&&!quoted){row.push(cell);cell="";continue}
  if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&n==="\n")i++;row.push(cell);if(row.some(x=>String(x).trim()!==""))result.push(row);row=[];cell="";continue}
  cell+=c;
 }
 row.push(cell);if(row.some(x=>String(x).trim()!==""))result.push(row);
 return result;
}
async function readFile(file){
 if(!file)return;
 currentFile=file;
 try{
  const ext=file.name.split(".").pop().toLowerCase();
  if(ext==="csv"){
    const text=await file.text();
    workbook={SheetNames:["Datos"],Sheets:{Datos:null},__csv:parseCsvText(text)};
  }else{
    workbook=await window.FrenteExcel.readFile(file);
  }
  $("sheetSelector").innerHTML=workbook.SheetNames.map(n=>`<option>${escapeHtml(n)}</option>`).join("");
  $("sheetSelectorWrap").hidden=workbook.SheetNames.length<=1;
  selectSheet(workbook.SheetNames[0]);
  $("fileInfo").hidden=false;
  $("fileInfo").innerHTML=`<strong>${escapeHtml(file.name)}</strong><br>${rows.length} filas detectadas · ${headers.length} columnas`;
  $("goStep2Btn").disabled=false;
 }catch(error){console.error(error);toast("No se pudo leer el archivo Excel. Comprueba que no esté dañado.")}
}
function selectSheet(name){
 const parsed=workbook.__csv || window.FrenteExcel.sheetRows(workbook,name);
 if(parsed.length<2){headers=[];rows=[];toast("La hoja seleccionada no contiene datos suficientes.");return}
 headers=parsed[0].map(x=>String(x).trim());rows=parsed.slice(1).filter(r=>r.some(x=>String(x).trim()!==""));
 prepareMapping();
 if(currentFile&&!$("fileInfo").hidden)$("fileInfo").innerHTML=`<strong>${escapeHtml(currentFile.name)}</strong><br>Hoja: ${escapeHtml(name)} · ${rows.length} filas · ${headers.length} columnas`;
}
function prepareMapping(){mapping={};TARGETS.forEach(([key,label,aliases])=>{const idx=headers.findIndex(h=>aliases.includes(normalize(h)));mapping[key]=idx>=0?headers[idx]:""});$("mappingGrid").innerHTML=TARGETS.map(([key,label])=>`<label class="mapping-row"><span>${label}</span><select data-map="${key}"><option value="">No importar</option>${headers.map(h=>`<option ${mapping[key]===h?"selected":""}>${escapeHtml(h)}</option>`).join("")}</select></label>`).join("")}
function currentMembers(){try{const local=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");return Array.isArray(local)?local:(window.FRENTE_MEMBERS_DB||[])}catch{return window.FRENTE_MEMBERS_DB||[]}}
function rawValueAt(row,key){const h=mapping[key];if(!h)return"";return row[headers.indexOf(h)]??""}
function valueAt(row,key){const value=rawValueAt(row,key);return value instanceof Date?value:String(value).trim()}
function validEmail(v){return !v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function pad2(v){return String(v).padStart(2,"0")}
function buildIsoDate(year,month,day){
 year=Number(year);month=Number(month);day=Number(day);
 if(!Number.isInteger(year)||!Number.isInteger(month)||!Number.isInteger(day)||year<1900||year>2100||month<1||month>12||day<1||day>31)return"";
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return"";
 return `${year}-${pad2(month)}-${pad2(day)}`;
}
function normalizeExcelDate(value){
 if(value==null||value==="")return"";
 if(value instanceof Date&&!Number.isNaN(value.getTime()))return buildIsoDate(value.getFullYear(),value.getMonth()+1,value.getDate());
 if(typeof value==="number"&&Number.isFinite(value)){
  const parsed=window.XLSX?.SSF?.parse_date_code?.(value);
  return parsed?buildIsoDate(parsed.y,parsed.m,parsed.d):"";
 }
 const text=String(value).trim();
 if(!text)return"";
 let match=text.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})(?:[T\s].*)?$/);
 if(match)return buildIsoDate(match[1],match[2],match[3]);
 match=text.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2}|\d{4})(?:[T\s].*)?$/);
 if(match){let year=Number(match[3]);if(year<100)year+=year>=50?1900:2000;return buildIsoDate(year,match[2],match[1])}
 if(/^\d+(?:[.,]\d+)?$/.test(text)){
  const serial=Number(text.replace(",","."));
  const parsed=window.XLSX?.SSF?.parse_date_code?.(serial);
  if(parsed)return buildIsoDate(parsed.y,parsed.m,parsed.d);
 }
 const parsedDate=new Date(text);
 if(!Number.isNaN(parsedDate.getTime()))return buildIsoDate(parsedDate.getFullYear(),parsedDate.getMonth()+1,parsedDate.getDate());
 return"";
}
function validDate(v){return !v||/^\d{4}-\d{2}-\d{2}$/.test(v)}
function analyze(){
 document.querySelectorAll("[data-map]").forEach(s=>mapping[s.dataset.map]=s.value);
 if(!mapping.numero||!mapping.nombre)return toast("Número de socio y nombre son obligatorios.");
 const members=currentMembers();
 analysis=rows.map((row,index)=>{
  const data={};TARGETS.forEach(([k])=>data[k]=valueAt(row,k));
  const nacimientoOriginal=rawValueAt(row,"nacimiento");
  const altaOriginal=rawValueAt(row,"alta");
  data.nacimiento=normalizeExcelDate(nacimientoOriginal);
  data.alta=normalizeExcelDate(altaOriginal);
  const errors=[];
  if(!data.numero)errors.push("Falta número de socio");
  if(!data.nombre)errors.push("Falta nombre");
  if(!validEmail(data.email))errors.push("Email no válido");
  if(nacimientoOriginal!==""&&!data.nacimiento)errors.push("Fecha de nacimiento no válida");
  if(altaOriginal!==""&&!data.alta)errors.push("Fecha de alta no válida");
  if(!validDate(data.nacimiento))errors.push("Nacimiento debe ser una fecha válida");
  const duplicate=members.find(m=>normalize(m.numero)===normalize(data.numero)||data.dni&&normalize(m.dni)===normalize(data.dni));
  const duplicateInFile=rows.slice(0,index).some(r=>normalize(valueAt(r,"numero"))===normalize(data.numero)&&data.numero);
  if(duplicateInFile)errors.push("Número repetido dentro del archivo");
  return{line:index+2,data,result:errors.length?"error":duplicate?"actualizar":"nuevo",detail:errors.join("; ")||(duplicate?"Coincide con socio existente":"Alta nueva"),existingId:duplicate?.id||null};
 });
 renderAnalysis();showStep(3)
}
function renderAnalysis(){const filtered=analysis.filter(x=>!previewFilter||x.result===previewFilter);$("summaryRows").textContent=analysis.length;$("summaryNew").textContent=analysis.filter(x=>x.result==="nuevo").length;$("summaryUpdates").textContent=analysis.filter(x=>x.result==="actualizar").length;$("summaryErrors").textContent=analysis.filter(x=>x.result==="error").length;$("downloadErrorsBtn").hidden=!analysis.some(x=>x.result==="error");$("analysisTable").innerHTML=filtered.map(x=>`<tr><td>${x.line}</td><td>${escapeHtml(x.data.numero)}</td><td>${escapeHtml(x.data.nombre)}</td><td>${escapeHtml(x.data.dni)}</td><td>${escapeHtml(x.data.email)}</td><td><span class="result-pill ${x.result}">${x.result}</span></td><td>${escapeHtml(x.detail)}</td></tr>`).join("");$("applyImportBtn").disabled=analysis.every(x=>x.result==="error")}
function applyImport(){const members=currentMembers().map(x=>({...x}));let added=0,updated=0;analysis.filter(x=>x.result!=="error").forEach(x=>{const d=x.data;const value={id:x.existingId||`socio-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,numero:d.numero,nombre:d.nombre,dni:d.dni,nacimiento:d.nacimiento,direccion:d.direccion,telefono:d.telefono,email:d.email,alta:d.alta||new Date().toISOString().slice(0,10),estado:d.estado||"Activo",cuenta:d.cuenta||"Pendiente de activar",categoria:d.categoria||"Adulto",cuota:d.cuota||"Pendiente",importeCuota:d.importeCuota||"0",tipo:d.tipo||"Socio",sector:d.sector,fila:d.fila,asiento:d.asiento,precioAbono:d.precioAbono||"0",observaciones:d.observaciones};const pos=members.findIndex(m=>m.id===x.existingId);if(pos>=0){members[pos]={...members[pos],...value};updated++}else{members.push(value);added++}});localStorage.setItem(STORAGE_KEY,JSON.stringify(members));$("completeText").textContent=`Se han creado ${added} socios y actualizado ${updated}. Las filas con errores no se han importado.`;showStep(4)}
function downloadErrors(){
 const errors=analysis.filter(x=>x.result==="error").map(x=>({Fila:x.line,"Número de socio":x.data.numero,Nombre:x.data.nombre,"DNI/NIE":x.data.dni,Email:x.data.email,Error:x.detail}));
 window.FrenteExcel.writeFile("errores-importacion-socios.xlsx",{"Errores":errors});
}
function reset(){workbook=null;headers=[];rows=[];mapping={};analysis=[];currentFile=null;$("csvFileInput").value="";$("fileInfo").hidden=true;$("sheetSelectorWrap").hidden=true;$("goStep2Btn").disabled=true;showStep(1)}
document.addEventListener("DOMContentLoaded",()=>{$("chooseCsvBtn").onclick=()=>$("csvFileInput").click();$("csvFileInput").onchange=e=>readFile(e.target.files[0]);$("sheetSelector").onchange=e=>selectSheet(e.target.value);$("dropZone").ondragover=e=>{e.preventDefault();$("dropZone").classList.add("dragover")};$("dropZone").ondragleave=()=>$("dropZone").classList.remove("dragover");$("dropZone").ondrop=e=>{e.preventDefault();$("dropZone").classList.remove("dragover");readFile(e.dataTransfer.files[0])};$("goStep2Btn").onclick=()=>showStep(2);$("analyzeBtn").onclick=analyze;document.querySelectorAll("[data-back]").forEach(b=>b.onclick=()=>showStep(Number(b.dataset.back)));document.querySelectorAll("[data-preview-filter]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-preview-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");previewFilter=b.dataset.previewFilter;renderAnalysis()});$("applyImportBtn").onclick=applyImport;$("downloadErrorsBtn").onclick=downloadErrors;$("resetImportBtn").onclick=reset;$("newImportBtn").onclick=reset})
})();