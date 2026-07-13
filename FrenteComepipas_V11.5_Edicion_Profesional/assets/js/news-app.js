const NEWS = (()=>{try{return JSON.parse(localStorage.getItem("frente_admin_news_v1")) || window.FRENTE_NEWS || [];}catch{return window.FRENTE_NEWS || [];}})();

function formatNewsDate(value){
  const date = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

function getNewsById(id){
  return NEWS.find(item => item.id === id);
}

function renderFeatured(){
  const target = document.getElementById("featuredNews");
  if(!target) return;

  const item = NEWS.find(news => news.destacada) || NEWS[0];
  if(!item) return;

  target.innerHTML = `
    <article class="featured-news">
      <img src="assets/images/news/${item.imagen}" alt="${item.titulo}">
      <div class="featured-news-content">
        <span class="tag">${item.categoria}</span>
        <h2>${item.titulo}</h2>
        <p>${item.resumen}</p>
        <div class="news-meta">${formatNewsDate(item.fecha)}</div>
        <a class="btn btn-primary" href="noticia.html?id=${item.id}">Leer noticia</a>
      </div>
    </article>
  `;
}

function renderNews(){
  const grid = document.getElementById("newsGrid");
  if(!grid) return;

  const search = document.getElementById("newsSearch")?.value.trim().toLowerCase() || "";
  const category = document.getElementById("newsCategory")?.value || "Todas";

  const filtered = NEWS
    .filter(item => category === "Todas" || item.categoria === category)
    .filter(item => {
      const text = `${item.titulo} ${item.resumen} ${item.categoria}`.toLowerCase();
      return text.includes(search);
    })
    .sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

  if(!filtered.length){
    grid.innerHTML = '<div class="news-empty">No se encontraron noticias.</div>';
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <article class="news-list-card">
      <img src="assets/images/news/${item.imagen}" alt="${item.titulo}">
      <div class="news-list-body">
        <span class="tag">${item.categoria}</span>
        <h3>${item.titulo}</h3>
        <p>${item.resumen}</p>
        <div class="news-card-footer">
          <span>${formatNewsDate(item.fecha)}</span>
          <a href="noticia.html?id=${item.id}">Leer más →</a>
        </div>
      </div>
    </article>
  `).join("");
}

function renderSingleNews(){
  const article = document.getElementById("singleNews");
  if(!article) return;

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const item = getNewsById(id) || NEWS[0];

  if(!item){
    article.innerHTML = "<p>No hay noticias disponibles.</p>";
    return;
  }

  document.title = `${item.titulo} | Frente Comepipas`;

  article.innerHTML = `
    <article class="single-news">
      <a class="news-back" href="noticias.html">← Volver a noticias</a>
      <span class="tag">${item.categoria}</span>
      <h1>${item.titulo}</h1>
      <div class="news-meta">${formatNewsDate(item.fecha)}</div>
      <img src="assets/images/news/${item.imagen}" alt="${item.titulo}">
      <div class="single-news-content">
        ${item.contenido.map(paragraph => `<p>${paragraph}</p>`).join("")}
      </div>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderFeatured();
  renderNews();
  renderSingleNews();

  document.getElementById("newsSearch")?.addEventListener("input", renderNews);
  document.getElementById("newsCategory")?.addEventListener("change", renderNews);
});
