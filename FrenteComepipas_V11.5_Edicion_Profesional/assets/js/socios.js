const MEMBERS = window.FRENTE_MEMBERS || [];
const SESSION_KEY = "frente_comepipas_member_session";

function getSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

function saveSession(member){
  localStorage.setItem(SESSION_KEY, JSON.stringify(member));
}

function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}

function renderMember(){
  const loginView = document.getElementById("memberLoginView");
  const dashboard = document.getElementById("memberDashboard");
  const session = getSession();

  if(!loginView || !dashboard) return;

  if(!session){
    loginView.hidden = false;
    dashboard.hidden = true;
    return;
  }

  loginView.hidden = true;
  dashboard.hidden = false;

  const map = {
    memberName: session.nombre,
    memberNumber: session.numero,
    memberSince: session.alta,
    memberFee: session.cuota,
    memberSeason: session.temporada,
    memberTrips: session.viajes,
    memberOrders: session.compras,
    memberPhone: session.telefono,
    memberCity: session.ciudad
  };

  Object.entries(map).forEach(([id,value])=>{
    const el = document.getElementById(id);
    if(el) el.textContent = value;
  });
}

document.addEventListener("DOMContentLoaded",()=>{
  renderMember();

  document.getElementById("memberLoginForm")?.addEventListener("submit",event=>{
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const member = MEMBERS.find(m => m.email.toLowerCase() === email && m.password === password);

    const error = document.getElementById("memberLoginError");
    if(!member){
      if(error) error.textContent = "Correo o contraseña incorrectos.";
      return;
    }

    if(error) error.textContent = "";
    const safeMember = {...member};
    delete safeMember.password;
    saveSession(safeMember);
    renderMember();
  });

  document.getElementById("memberLogout")?.addEventListener("click",()=>{
    clearSession();
    renderMember();
  });

  document.querySelectorAll("[data-member-demo]").forEach(button=>{
    button.addEventListener("click",()=>{
      alert(button.dataset.memberDemo || "Función preparada para una versión posterior.");
    });
  });
});
