const CONFIG = window.FRENTE_CONFIG || {};

function applyConfig() {
  const hero = document.querySelector('.hero');
  if (hero && CONFIG.heroImage) {
    const overlay = CONFIG.heroOverlay ||
      'linear-gradient(90deg,rgba(0,18,43,.93) 0%,rgba(0,35,78,.78) 48%,rgba(0,24,55,.55) 100%)';
    hero.style.backgroundImage =
      `${overlay}, url("assets/images/hero/${CONFIG.heroImage}")`;
    hero.style.backgroundPosition = CONFIG.heroPosition || 'center center';
  }

  document.querySelectorAll('[data-config="nombre"]').forEach(el => {
    el.textContent = CONFIG.nombre || 'Frente Comepipas';
  });

  document.querySelectorAll('[data-config="subtitulo"]').forEach(el => {
    el.textContent = CONFIG.subtitulo || 'Peña Malaguista';
  });

  document.querySelectorAll('[data-config="lema"]').forEach(el => {
    el.textContent = CONFIG.lema || 'Levantando copas contigo desde 2007';
  });

  document.querySelectorAll('[data-config="socios"]').forEach(el => {
    el.textContent = CONFIG.socios || '150+';
  });

  document.querySelectorAll('[data-config="viajes"]').forEach(el => {
    el.textContent = CONFIG.viajes || '25+';
  });

  document.querySelectorAll('[data-config="fundacion"]').forEach(el => {
    el.textContent = CONFIG.fundacion || '2007';
  });

  document.querySelectorAll('[data-config="ciudad"]').forEach(el => {
    el.textContent = CONFIG.ciudad || 'Málaga, Andalucía';
  });

  document.querySelectorAll('[data-config="email"]').forEach(el => {
    el.textContent = CONFIG.email || '';
    if (el.tagName === 'A' && CONFIG.email) {
      el.href = `mailto:${CONFIG.email}`;
    }
  });

  document.title = document.title.replace(
    'Frente Comepipas',
    CONFIG.nombre || 'Frente Comepipas'
  );
}

const header = document.querySelector('.site-header');
const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.nav-links');
const toastBox = document.querySelector('.toast');

addEventListener('scroll', () => {
  header?.classList.toggle('scrolled', scrollY > 25);
});

menuBtn?.addEventListener('click', () => {
  nav?.classList.toggle('open');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => nav?.classList.remove('open'));
});

function toast(message) {
  if (!toastBox) return;
  toastBox.textContent = message;
  toastBox.classList.add('show');
  setTimeout(() => toastBox.classList.remove('show'), 2200);
}

document.querySelectorAll('.add').forEach(button => {
  button.addEventListener('click', () => {
    toast(`${button.dataset.product} añadido al carrito de demostración`);
  });
});

document.querySelectorAll('[data-demo]').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    toast(button.dataset.demo || 'Función preparada');
  });
});

document.querySelectorAll('[data-demo-form]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault();
    toast('Formulario enviado en modo demostración');
    form.reset();
  });
});

applyConfig();

function applyFeatureFlags(){
  const F = window.FRENTE_FEATURES || {};
  const map = {
    mostrarNoticias: '[data-feature="noticias"]',
    mostrarTienda: '[data-feature="tienda"]',
    mostrarViajes: '[data-feature="viajes"]',
    mostrarSocios: '[data-feature="socios"]',
    mostrarGaleria: '[data-feature="galeria"]',
    mostrarContacto: '[data-feature="contacto"]',
    mostrarCalendario: '[data-feature="calendario"]',
    mostrarProximoPartido: '[data-feature="proximo-partido"]',
    mostrarAccesosRapidos: '[data-feature="accesos-rapidos"]',
    mostrarEstadisticas: '[data-feature="estadisticas"]',
    mostrarPatrocinadores: '[data-feature="patrocinadores"]',
    mostrarComepipometro: '[data-feature="comepipometro"]',
    mostrarHallOfFame: '[data-feature="hall-of-fame"]'
  };
  Object.entries(map).forEach(([key, selector])=>{
    if(F[key] === false){
      document.querySelectorAll(selector).forEach(el=>el.remove());
    }
  });
  document.documentElement.classList.toggle("no-animations", F.animaciones === false);
}
document.addEventListener("DOMContentLoaded", applyFeatureFlags);
