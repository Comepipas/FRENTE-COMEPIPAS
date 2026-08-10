
const ADMIN_SESSION_KEY = "frente_admin_session_v1";
const ADMIN_PRODUCTS_KEY = "frente_admin_products_v1";
const ADMIN_TRIPS_KEY = "frente_admin_trips_v1";
const ADMIN_NEWS_KEY = "frente_admin_news_v1";

function getJSON(key, fallback){
  try{
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  }catch{
    return fallback;
  }
}

function setJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

function adminLogged(){
  return localStorage.getItem(ADMIN_SESSION_KEY) === "yes";
}

function renderAdminAccess(){
  const login = document.getElementById("adminLogin");
  const panel = document.getElementById("adminPanel");
  if(!login || !panel) return;

  login.hidden = adminLogged();
  panel.hidden = !adminLogged();

  if(adminLogged()){
    renderAdminDashboard();
  }
}

function renderAdminDashboard(){
  const products = getJSON(ADMIN_PRODUCTS_KEY, window.FRENTE_PRODUCTS || []);
  const trips = getJSON(ADMIN_TRIPS_KEY, window.FRENTE_TRIPS || []);
  const news = getJSON(ADMIN_NEWS_KEY, window.FRENTE_NEWS || []);

  document.getElementById("statProducts").textContent = products.length;
  document.getElementById("statTrips").textContent = trips.length;
  document.getElementById("statNews").textContent = news.length;

  renderAdminProducts(products);
  renderAdminTrips(trips);
  renderAdminNews(news);
}

function renderAdminProducts(products){
  const target = document.getElementById("adminProductsList");
  if(!target) return;

  target.innerHTML = products.map(item => `
    <div class="admin-list-row">
      <div>
        <strong>${item.nombre}</strong>
        <span>${item.categoria} · ${Number(item.precio).toFixed(2)} €</span>
      </div>
      <button data-delete-product="${item.id}">Eliminar</button>
    </div>
  `).join("") || '<p class="admin-empty">No hay productos.</p>';

  target.querySelectorAll("[data-delete-product]").forEach(btn=>{
    btn.onclick = ()=>{
      const filtered = products.filter(item => item.id !== btn.dataset.deleteProduct);
      setJSON(ADMIN_PRODUCTS_KEY, filtered);
      renderAdminDashboard();
    };
  });
}

function renderAdminTrips(trips){
  const target = document.getElementById("adminTripsList");
  if(!target) return;

  target.innerHTML = trips.map(item => `
    <div class="admin-list-row">
      <div>
        <strong>${item.destino}</strong>
        <span>${item.fecha} · ${item.disponibles} plazas</span>
      </div>
      <button data-delete-trip="${item.id}">Eliminar</button>
    </div>
  `).join("") || '<p class="admin-empty">No hay viajes.</p>';

  target.querySelectorAll("[data-delete-trip]").forEach(btn=>{
    btn.onclick = ()=>{
      const filtered = trips.filter(item => item.id !== btn.dataset.deleteTrip);
      setJSON(ADMIN_TRIPS_KEY, filtered);
      renderAdminDashboard();
    };
  });
}

function renderAdminNews(news){
  const target = document.getElementById("adminNewsList");
  if(!target) return;

  target.innerHTML = news.map(item => `
    <div class="admin-list-row">
      <div>
        <strong>${item.titulo}</strong>
        <span>${item.categoria} · ${item.fecha}</span>
      </div>
      <button data-delete-news="${item.id}">Eliminar</button>
    </div>
  `).join("") || '<p class="admin-empty">No hay noticias.</p>';

  target.querySelectorAll("[data-delete-news]").forEach(btn=>{
    btn.onclick = ()=>{
      const filtered = news.filter(item => item.id !== btn.dataset.deleteNews);
      setJSON(ADMIN_NEWS_KEY, filtered);
      renderAdminDashboard();
    };
  });
}

function slugify(text){
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

document.addEventListener("DOMContentLoaded", ()=>{
  renderAdminAccess();

  document.getElementById("adminLoginForm")?.addEventListener("submit", event=>{
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const user = String(data.get("user") || "").trim();
    const password = String(data.get("password") || "");

    if(user === "admin" && password === "2007"){
      localStorage.setItem(ADMIN_SESSION_KEY, "yes");
      renderAdminAccess();
    }else{
      document.getElementById("adminLoginError").textContent = "Usuario o contraseña incorrectos.";
    }
  });

  document.getElementById("adminLogout")?.addEventListener("click", ()=>{
    localStorage.removeItem(ADMIN_SESSION_KEY);
    renderAdminAccess();
  });

  document.getElementById("productForm")?.addEventListener("submit", event=>{
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const products = getJSON(ADMIN_PRODUCTS_KEY, window.FRENTE_PRODUCTS || []);
    const nombre = String(data.get("nombre") || "").trim();

    products.push({
      id: slugify(nombre) + "-" + Date.now(),
      nombre,
      categoria: String(data.get("categoria") || "General"),
      precio: Number(data.get("precio") || 0),
      imagen: String(data.get("imagen") || "bufanda.jpg"),
      descripcion: String(data.get("descripcion") || "")
    });

    setJSON(ADMIN_PRODUCTS_KEY, products);
    event.currentTarget.reset();
    renderAdminDashboard();
  });

  document.getElementById("tripForm")?.addEventListener("submit", event=>{
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const trips = getJSON(ADMIN_TRIPS_KEY, window.FRENTE_TRIPS || []);
    const destino = String(data.get("destino") || "").trim();

    trips.push({
      id: slugify(destino) + "-" + Date.now(),
      destino,
      fecha: String(data.get("fecha") || ""),
      salida: String(data.get("salida") || ""),
      precio: Number(data.get("precio") || 0),
      plazas: Number(data.get("plazas") || 0),
      disponibles: Number(data.get("plazas") || 0),
      imagen: "viajes.jpg",
      descripcion: String(data.get("descripcion") || "")
    });

    setJSON(ADMIN_TRIPS_KEY, trips);
    event.currentTarget.reset();
    renderAdminDashboard();
  });

  document.getElementById("newsForm")?.addEventListener("submit", event=>{
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const news = getJSON(ADMIN_NEWS_KEY, window.FRENTE_NEWS || []);
    const titulo = String(data.get("titulo") || "").trim();

    news.push({
      id: slugify(titulo) + "-" + Date.now(),
      titulo,
      categoria: String(data.get("categoria") || "Peña"),
      fecha: String(data.get("fecha") || ""),
      imagen: String(data.get("imagen") || "temporada.jpg"),
      destacada: false,
      resumen: String(data.get("resumen") || ""),
      contenido: [String(data.get("contenido") || "")]
    });

    setJSON(ADMIN_NEWS_KEY, news);
    event.currentTarget.reset();
    renderAdminDashboard();
  });

  document.getElementById("resetAdminData")?.addEventListener("click", ()=>{
    if(confirm("¿Restaurar los datos originales de productos, viajes y noticias?")){
      localStorage.removeItem(ADMIN_PRODUCTS_KEY);
      localStorage.removeItem(ADMIN_TRIPS_KEY);
      localStorage.removeItem(ADMIN_NEWS_KEY);
      renderAdminDashboard();
    }
  });
});
