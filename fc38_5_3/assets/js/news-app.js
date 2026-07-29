(()=>{
  'use strict';

  let NEWS=[];
  const esc=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

  function imageSrc(value){
    const image=String(value||'').trim();
    if(!image)return 'assets/images/news/temporada.jpg';
    if(/^(data:|https?:\/\/|\/)/i.test(image))return image;
    return `assets/images/news/${image}`;
  }

  function normalize(row={}){
    return {
      id:String(row.id||''),titulo:String(row.titulo||''),categoria:String(row.categoria||'Peña'),
      fecha:String(row.fecha||''),imagen:String(row.imagen||'temporada.jpg'),destacada:Boolean(row.destacada),
      resumen:String(row.resumen||''),contenido:Array.isArray(row.contenido)?row.contenido.map(String):[],
      estado:String(row.estado||'Publicada'),programadaPara:row.programada_para||row.programadaPara||''
    };
  }

  function formatNewsDate(value){
    if(!value)return '';
    const date=new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'long',year:'numeric'}).format(date);
  }

  async function loadPublishedNews(){
    try{
      if(!window.FrenteSupabase?.configured?.())throw new Error('Supabase no está configurado.');
      const initialized=await window.FrenteSupabase.init();
      const {data,error}=await initialized.client.from('news').select('*').order('fecha',{ascending:false}).order('created_at',{ascending:false});
      if(error)throw error;
      NEWS=(data||[]).map(normalize);
    }catch(error){
      console.warn('Noticias: se usan datos iniciales porque Supabase no respondió.',error);
      NEWS=(window.FRENTE_NEWS||[]).map(normalize).filter(item=>item.estado==='Publicada');
    }
  }

  function getNewsById(id){return NEWS.find(item=>item.id===id);}

  function renderFeatured(){
    const target=document.getElementById('featuredNews');if(!target)return;
    const item=NEWS.find(news=>news.destacada)||NEWS[0];
    if(!item){target.innerHTML='<div class="news-empty">Todavía no hay noticias publicadas.</div>';return;}
    target.innerHTML=`<article class="featured-news"><img src="${esc(imageSrc(item.imagen))}" alt="${esc(item.titulo)}"><div class="featured-news-content"><span class="tag">${esc(item.categoria)}</span><h2>${esc(item.titulo)}</h2><p>${esc(item.resumen)}</p><div class="news-meta">${esc(formatNewsDate(item.fecha))}</div><a class="btn btn-primary" href="noticia.html?id=${encodeURIComponent(item.id)}">Leer noticia</a></div></article>`;
  }

  function renderNews(){
    const grid=document.getElementById('newsGrid');if(!grid)return;
    const search=(document.getElementById('newsSearch')?.value||'').trim().toLowerCase();
    const category=document.getElementById('newsCategory')?.value||'Todas';
    const filtered=NEWS.filter(item=>category==='Todas'||item.categoria===category).filter(item=>`${item.titulo} ${item.resumen} ${item.categoria}`.toLowerCase().includes(search));
    if(!filtered.length){grid.innerHTML='<div class="news-empty">No se encontraron noticias.</div>';return;}
    grid.innerHTML=filtered.map(item=>`<article class="news-list-card"><img src="${esc(imageSrc(item.imagen))}" alt="${esc(item.titulo)}"><div class="news-list-body"><span class="tag">${esc(item.categoria)}</span><h3>${esc(item.titulo)}</h3><p>${esc(item.resumen)}</p><div class="news-card-footer"><span>${esc(formatNewsDate(item.fecha))}</span><a href="noticia.html?id=${encodeURIComponent(item.id)}">Leer más →</a></div></div></article>`).join('');
  }

  function renderSingleNews(){
    const article=document.getElementById('singleNews');if(!article)return;
    const id=new URLSearchParams(location.search).get('id');
    const item=getNewsById(id);
    if(!item){article.innerHTML='<p>La noticia no existe o todavía no está publicada.</p><a class="btn btn-primary" href="noticias.html">Volver a noticias</a>';return;}
    document.title=`${item.titulo} | Frente Comepipas`;
    article.innerHTML=`<article class="single-news"><a class="news-back" href="noticias.html">← Volver a noticias</a><span class="tag">${esc(item.categoria)}</span><h1>${esc(item.titulo)}</h1><div class="news-meta">${esc(formatNewsDate(item.fecha))}</div><img src="${esc(imageSrc(item.imagen))}" alt="${esc(item.titulo)}"><div class="single-news-content">${item.contenido.map(paragraph=>`<p>${esc(paragraph)}</p>`).join('')}</div></article>`;
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    const grid=document.getElementById('newsGrid');if(grid)grid.innerHTML='<div class="news-empty">Cargando noticias…</div>';
    await loadPublishedNews();
    renderFeatured();renderNews();renderSingleNews();
    document.getElementById('newsSearch')?.addEventListener('input',renderNews);
    document.getElementById('newsCategory')?.addEventListener('change',renderNews);
  });
})();
