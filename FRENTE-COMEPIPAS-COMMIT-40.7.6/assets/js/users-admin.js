
function userSlug(text){
  return String(text).toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

function renderUsers(){
  const body = document.getElementById("usersTableBody");
  if(!body) return;

  const users = getAuthUsers();
  body.innerHTML = users.map(user=>`
    <tr>
      <td><strong>${user.nombre}</strong><br><small>${user.email}</small></td>
      <td>${window.FRENTE_ROLES?.[user.rol]?.nombre || user.rol}</td>
      <td><span class="status-pill ${user.activo ? "fee-ok":"fee-pending"}">${user.activo ? "Activo":"Inactivo"}</span></td>
      <td class="members-actions-cell">
        <button data-edit-user="${user.id}">Editar</button>
        <button data-toggle-user="${user.id}">${user.activo ? "Desactivar":"Activar"}</button>
        <button class="danger" data-delete-user="${user.id}">Eliminar</button>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-edit-user]").forEach(btn=>{
    btn.onclick = ()=>openUserForm(btn.dataset.editUser);
  });

  body.querySelectorAll("[data-toggle-user]").forEach(btn=>{
    btn.onclick = ()=>{
      const users = getAuthUsers().map(user =>
        user.id === btn.dataset.toggleUser ? {...user,activo:!user.activo} : user
      );
      saveAuthUsers(users);
      renderUsers();
    };
  });

  body.querySelectorAll("[data-delete-user]").forEach(btn=>{
    btn.onclick = ()=>{
      const session = getAuthSession();
      if(session?.id === btn.dataset.deleteUser){
        alert("No puedes eliminar tu propio usuario.");
        return;
      }
      if(confirm("¿Eliminar este administrador?")){
        saveAuthUsers(getAuthUsers().filter(user=>user.id!==btn.dataset.deleteUser));
        renderUsers();
      }
    };
  });
}

function openUserForm(id=""){
  const form = document.getElementById("userForm");
  form.reset();
  form.elements.id.value = "";
  document.getElementById("userModalTitle").textContent = id ? "Editar usuario":"Nuevo usuario";

  if(id){
    const user = getAuthUsers().find(u=>u.id===id);
    Object.entries(user||{}).forEach(([key,value])=>{
      if(form.elements[key]){
        if(form.elements[key].type === "checkbox") form.elements[key].checked = Boolean(value);
        else form.elements[key].value = value ?? "";
      }
    });
    form.elements.password.required = false;
  }else{
    form.elements.rol.value = "editor";
    form.elements.activo.checked = true;
    form.elements.password.required = true;
  }

  document.getElementById("userModal").classList.add("open");
}

document.addEventListener("DOMContentLoaded",()=>{
  if(!protectAdminPage("usuarios")) return;
  renderUsers();

  document.getElementById("newUserButton")?.addEventListener("click",()=>openUserForm());

  document.getElementById("userForm")?.addEventListener("submit",event=>{
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const users = getAuthUsers();

    data.activo = form.elements.activo.checked;

    if(data.id){
      const current = users.find(u=>u.id===data.id);
      if(!data.password) data.password = current.password;
      saveAuthUsers(users.map(u=>u.id===data.id ? {...u,...data} : u));
    }else{
      data.id = "admin-" + userSlug(data.nombre) + "-" + Date.now();
      saveAuthUsers([...users,data]);
    }

    document.getElementById("userModal").classList.remove("open");
    renderUsers();
  });

  document.getElementById("resetUsers")?.addEventListener("click",()=>{
    if(confirm("¿Restaurar usuarios de demostración?")){
      localStorage.removeItem(AUTH_USERS_KEY);
      renderUsers();
    }
  });

  document.querySelectorAll(".store-modal-close").forEach(button=>{
    button.onclick = ()=>button.closest(".store-modal").classList.remove("open");
  });
});
