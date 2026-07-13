
document.addEventListener("DOMContentLoaded",()=>{
  if(getAuthSession()){
    const next = new URLSearchParams(location.search).get("next") || "admin.html";
    location.href = next;
    return;
  }

  document.getElementById("adminLoginForm")?.addEventListener("submit",event=>{
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const user = loginAdmin(data.get("email"), data.get("password"));
    const error = document.getElementById("loginError");

    if(!user){
      error.textContent = "Correo o contraseña incorrectos.";
      return;
    }

    error.textContent = "";
    if(window.logAudit) logAudit("Inicio de sesión","Seguridad","Sesión administrativa","Acceso correcto al panel","info");
    const next = new URLSearchParams(location.search).get("next") || "admin.html";
    location.href = next;
  });
});
