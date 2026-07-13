
const AUTH_USERS_KEY = "frente_admin_users_v1";
const AUTH_SESSION_KEY = "frente_admin_auth_session_v1";

function getAuthUsers(){
  try{
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || window.FRENTE_ADMIN_USERS || [];
  }catch{
    return window.FRENTE_ADMIN_USERS || [];
  }
}

function saveAuthUsers(users){
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function getAuthSession(){
  try{
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));
  }catch{
    return null;
  }
}

function saveAuthSession(user){
  const safe = {...user};
  delete safe.password;
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(safe));
}

function clearAuthSession(){
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function loginAdmin(email,password){
  const user = getAuthUsers().find(u =>
    u.activo &&
    String(u.email).toLowerCase() === String(email).toLowerCase() &&
    u.password === password
  );
  if(!user) return null;
  saveAuthSession(user);
  return user;
}

function currentRole(){
  const session = getAuthSession();
  return session ? window.FRENTE_ROLES?.[session.rol] : null;
}

function hasPermission(permission){
  const role = currentRole();
  if(!role) return false;
  return role.permisos.includes("*") || role.permisos.includes(permission);
}

function redirectToLogin(){
  const next = encodeURIComponent(location.pathname.split("/").pop() || "admin.html");
  location.href = `login.html?next=${next}`;
}

function protectAdminPage(permission="dashboard"){
  const session = getAuthSession();
  if(!session){
    redirectToLogin();
    return false;
  }
  if(!hasPermission(permission)){
    location.href = "sin-permiso.html";
    return false;
  }
  return true;
}

function applyPermissionUI(){
  document.querySelectorAll("[data-permission]").forEach(el=>{
    const permission = el.dataset.permission;
    if(!hasPermission(permission)) el.remove();
  });

  const session = getAuthSession();
  document.querySelectorAll("[data-auth-name]").forEach(el=>{
    el.textContent = session?.nombre || "";
  });
  document.querySelectorAll("[data-auth-role]").forEach(el=>{
    el.textContent = window.FRENTE_ROLES?.[session?.rol]?.nombre || "";
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  applyPermissionUI();

  document.querySelectorAll("[data-auth-logout]").forEach(button=>{
    button.addEventListener("click",()=>{
      if(window.logAudit) logAudit("Cierre de sesión","Seguridad","Sesión administrativa","El usuario cerró sesión","info");
      clearAuthSession();
      location.href = "login.html";
    });
  });
});
