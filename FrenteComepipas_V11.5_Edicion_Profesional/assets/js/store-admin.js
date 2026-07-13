
const PK="frente_admin_products_v1",OK="frente_orders_db_v1";
const gp=()=>{try{return JSON.parse(localStorage.getItem(PK))||window.FRENTE_PRODUCTS||[]}catch{return window.FRENTE_PRODUCTS||[]}};
const go=()=>{try{return JSON.parse(localStorage.getItem(OK))||window.FRENTE_ORDERS||[]}catch{return window.FRENTE_ORDERS||[]}};
const sp=v=>{localStorage.setItem(PK,JSON.stringify(v));renderAll()};
const so=v=>{localStorage.setItem(OK,JSON.stringify(v));renderAll()};
const money=v=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(Number(v||0));

function renderStats(){
 const p=gp(),o=go(),stock=p.reduce((a,b)=>a+Number(b.stock||0),0),income=o.filter(x=>["Pagado","Enviado","Completado"].includes(x.estado)).reduce((a,b)=>a+Number(b.total||0),0);
 document.getElementById("storeProductsCount").textContent=p.length;
 document.getElementById("storeStockCount").textContent=stock;
 document.getElementById("storeOrdersCount").textContent=o.length;
 document.getElementById("storeIncome").textContent=money(income);
}
function renderProducts(){
 const body=document.getElementById("storeProductsBody"),s=(document.getElementById("storeProductSearch")?.value||"").toLowerCase();
 const rows=gp().filter(p=>`${p.nombre} ${p.categoria}`.toLowerCase().includes(s));
 body.innerHTML=rows.length?rows.map(p=>`<tr><td>${p.nombre}</td><td>${p.categoria}</td><td>${money(p.precio)}<br><small>Socio: ${p.precioSocio!=null?money(p.precioSocio):"—"}</small></td><td>${p.stock??0}</td><td>${(p.tallas||["Única"]).join(", ")}</td><td class="members-actions-cell"><button data-editp="${p.id}">Editar</button><button class="danger" data-delp="${p.id}">Eliminar</button></td></tr>`).join(""):'<tr><td colspan="6" class="members-empty">No hay productos.</td></tr>';
 body.querySelectorAll("[data-editp]").forEach(b=>b.onclick=()=>openProduct(b.dataset.editp));
 body.querySelectorAll("[data-delp]").forEach(b=>b.onclick=()=>{if(confirm("¿Eliminar producto?"))sp(gp().filter(p=>p.id!==b.dataset.delp))});
}
function renderOrders(){
 const body=document.getElementById("storeOrdersBody"),s=(document.getElementById("storeOrderSearch")?.value||"").toLowerCase(),st=document.getElementById("storeOrderStatus")?.value||"Todos";
 const rows=go().filter(o=>`${o.id} ${o.cliente} ${o.email}`.toLowerCase().includes(s)&&(st==="Todos"||o.estado===st));
 body.innerHTML=rows.length?rows.map(o=>`<tr><td>${o.id}</td><td><strong>${o.cliente}</strong><br><small>${o.email}</small></td><td>${o.fecha}</td><td>${money(o.total)}</td><td><span class="status-pill ${["Pagado","Completado"].includes(o.estado)?"fee-ok":"fee-pending"}">${o.estado}</span></td><td>${o.envio}</td><td class="members-actions-cell"><button data-viewo="${o.id}">Ver</button><button data-edito="${o.id}">Estado</button><button class="danger" data-delo="${o.id}">Eliminar</button></td></tr>`).join(""):'<tr><td colspan="7" class="members-empty">No hay pedidos.</td></tr>';
 body.querySelectorAll("[data-viewo]").forEach(b=>b.onclick=()=>viewOrder(b.dataset.viewo));
 body.querySelectorAll("[data-edito]").forEach(b=>b.onclick=()=>openStatus(b.dataset.edito));
 body.querySelectorAll("[data-delo]").forEach(b=>b.onclick=()=>{if(confirm("¿Eliminar pedido?"))so(go().filter(o=>o.id!==b.dataset.delo))});
}
function renderAll(){renderStats();renderProducts();renderOrders()}
function openProduct(id=""){const f=document.getElementById("storeProductForm");f.reset();f.elements.id.value="";document.getElementById("storeProductModalTitle").textContent=id?"Editar producto":"Nuevo producto";if(id){const p=gp().find(x=>x.id===id);Object.entries(p||{}).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=Array.isArray(v)?v.join(","):v??""})}else{f.elements.stock.value=0;f.elements.tallas.value="Única"}document.getElementById("storeProductModal").classList.add("open")}
function viewOrder(id){const o=go().find(x=>x.id===id),b=document.getElementById("orderDetailBody");b.innerHTML=`<div class="order-detail-head"><div><span>Pedido</span><h2>${o.id}</h2></div><div><span>Estado</span><strong>${o.estado}</strong></div></div><div class="order-customer"><p><strong>${o.cliente}</strong></p><p>${o.email}</p><p>${o.telefono}</p><p>${o.envio}</p></div><div class="order-items">${o.items.map(i=>`<div><span>${i.cantidad} × ${i.nombre}${i.talla?` · ${i.talla}`:""}</span><strong>${money(i.cantidad*i.precio)}</strong></div>`).join("")}</div><div class="order-total"><span>Total</span><strong>${money(o.total)}</strong></div>`;document.getElementById("orderDetailModal").classList.add("open")}
function openStatus(id){const f=document.getElementById("orderStatusForm"),o=go().find(x=>x.id===id);f.elements.id.value=id;f.elements.estado.value=o.estado;document.getElementById("orderStatusModal").classList.add("open")}
function exportCSV(){const rows=[["id","fecha","cliente","email","telefono","estado","envio","total"].join(",")];go().forEach(o=>rows.push([o.id,o.fecha,o.cliente,o.email,o.telefono,o.estado,o.envio,o.total].map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")));const blob=new Blob(["\ufeff"+rows.join("\n")],{type:"text/csv"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="pedidos-frente-comepipas.csv";a.click();URL.revokeObjectURL(u)}
document.addEventListener("DOMContentLoaded",()=>{renderAll();document.getElementById("storeProductSearch")?.addEventListener("input",renderProducts);document.getElementById("storeOrderSearch")?.addEventListener("input",renderOrders);document.getElementById("storeOrderStatus")?.addEventListener("change",renderOrders);document.getElementById("newStoreProduct")?.addEventListener("click",()=>openProduct());document.getElementById("exportOrders")?.addEventListener("click",exportCSV);["storeProductModal","orderDetailModal","orderStatusModal"].forEach(id=>document.getElementById(id)?.addEventListener("click",e=>{if(e.target.id===id)e.target.classList.remove("open")}));document.querySelectorAll(".store-modal-close").forEach(b=>b.onclick=()=>b.closest(".store-modal").classList.remove("open"));document.getElementById("storeProductForm")?.addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries()),p=gp();d.precio=Number(d.precio||0);d.precioSocio=d.precioSocio===""?null:Number(d.precioSocio);d.stock=Number(d.stock||0);d.tallas=String(d.tallas||"Única").split(",").map(x=>x.trim()).filter(Boolean);if(d.id)sp(p.map(x=>x.id===d.id?{...x,...d}:x));else{d.id="producto-"+Date.now();sp([...p,d])}document.getElementById("storeProductModal").classList.remove("open")});document.getElementById("orderStatusForm")?.addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());so(go().map(o=>o.id===d.id?{...o,estado:d.estado}:o));document.getElementById("orderStatusModal").classList.remove("open")});document.getElementById("resetStoreAdmin")?.addEventListener("click",()=>{if(confirm("¿Restaurar tienda?")){localStorage.removeItem(PK);localStorage.removeItem(OK);renderAll()}})});
