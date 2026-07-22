document.addEventListener("DOMContentLoaded",()=>{
  const exportBtn=document.getElementById("exportMembers");
  if(exportBtn){
    exportBtn.replaceWith(exportBtn.cloneNode(true));
    document.getElementById("exportMembers").addEventListener("click",()=>{
      const members=(()=>{try{return JSON.parse(localStorage.getItem("frente_members_v112")||"null")||window.FRENTE_MEMBERS_DB||[]}catch{return window.FRENTE_MEMBERS_DB||[]}})();
      const rows=members.map(m=>({
        "Número":m.numero,"Nombre":m.nombre,"DNI/NIE":m.dni,"Fecha nacimiento":m.nacimiento,
        "Dirección":m.direccion,"Teléfono":m.telefono,"Email":m.email,"Fecha alta":m.alta,
        "Estado":m.estado,"Cuenta web":m.cuenta,"Categoría":m.categoria,"Cuota":m.cuota,
        "Importe cuota":Number(m.importeCuota||0),"Tipo":m.tipo,"Sector":m.sector,"Fila":m.fila,
        "Asiento":m.asiento,"Precio abono":Number(m.precioAbono||0),"Observaciones":m.observaciones
      }));
      window.FrenteExcel.writeFile("socios-frente-comepipas.xlsx",{"Socios":rows});
    });
  }
  const templateBtn=document.getElementById("downloadTemplate");
  if(templateBtn){
    const replacement=templateBtn.cloneNode(true);templateBtn.replaceWith(replacement);
    replacement.addEventListener("click",()=>{window.location.href="assets/data/plantilla-importacion-socios-v13.1.xlsx"});
  }
});