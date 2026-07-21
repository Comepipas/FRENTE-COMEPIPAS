window.FRENTE_PENA_DEFAULTS={
  eyebrow:'Desde 2007',
  title:'Nuestra historia',
  intro:'Frente Comepipas nació de la amistad, la pasión por el Málaga CF y las ganas de compartir cada partido como una familia.',
  image:'',
  valuesTitle:'Nuestros valores',
  values:'Malaguismo, amistad, respeto, convivencia y apoyo incondicional a nuestros colores.',
  timeline:[
    {year:'2007',title:'Fundación',text:'Nace la peña Frente Comepipas.'},
    {year:'2015',title:'Crecimiento',text:'Aumentan los viajes, encuentros y actividades.'},
    {year:'2026',title:'Nueva etapa digital',text:'La peña renueva su web y sus servicios para socios.'}
  ]
};

(()=>{
  'use strict';

  const TABLE='site_content';
  const CONTENT_ID='pena_history';
  const LOCAL_KEY='frente_pena_history_v1';

  function cloneDefaults(){
    return JSON.parse(JSON.stringify(window.FRENTE_PENA_DEFAULTS));
  }

  function localHistory(){
    try{return JSON.parse(localStorage.getItem(LOCAL_KEY))||cloneDefaults()}
    catch{return cloneDefaults()}
  }

  async function supabaseClient(){
    if(!window.FrenteSupabase?.configured?.())return null;
    try{return (await window.FrenteSupabase.init()).client}
    catch{return null}
  }

  async function getPenaHistory(){
    const client=await supabaseClient();
    if(client){
      const {data,error}=await client.from(TABLE).select('content').eq('id',CONTENT_ID).maybeSingle();
      if(!error&&data?.content)return {...cloneDefaults(),...data.content};
      if(error)console.warn('No se pudo cargar la historia desde Supabase:',error.message);
    }
    return localHistory();
  }

  async function savePenaHistory(content){
    const client=await supabaseClient();
    if(!client)throw new Error('No hay conexión con Supabase. Los cambios no se han publicado.');
    const {error}=await client.from(TABLE).upsert({
      id:CONTENT_ID,
      content,
      updated_at:new Date().toISOString()
    },{onConflict:'id'});
    if(error)throw error;
    localStorage.setItem(LOCAL_KEY,JSON.stringify(content));
    return content;
  }

  async function resetPenaHistory(){
    const client=await supabaseClient();
    if(!client)throw new Error('No hay conexión con Supabase.');
    const content=cloneDefaults();
    const {error}=await client.from(TABLE).upsert({
      id:CONTENT_ID,
      content,
      updated_at:new Date().toISOString()
    },{onConflict:'id'});
    if(error)throw error;
    localStorage.removeItem(LOCAL_KEY);
    return content;
  }

  function text(el,value){if(el)el.textContent=value||''}

  function renderHistory(d){
    text(document.getElementById('penaEyebrow'),d.eyebrow);
    text(document.getElementById('penaTitle'),d.title);
    text(document.getElementById('penaIntro'),d.intro);
    text(document.getElementById('penaValuesTitle'),d.valuesTitle);
    text(document.getElementById('penaValues'),d.values);

    const img=document.getElementById('penaHistoryImage');
    if(img){img.hidden=!d.image;img.src=d.image||''}

    const timeline=document.getElementById('penaTimeline');
    if(timeline){
      timeline.replaceChildren();
      (d.timeline||[]).forEach(item=>{
        const article=document.createElement('article');
        article.className='pena-timeline-item';
        const year=document.createElement('span');
        const box=document.createElement('div');
        const title=document.createElement('h3');
        const paragraph=document.createElement('p');
        year.textContent=item.year||'';
        title.textContent=item.title||'';
        paragraph.textContent=item.text||'';
        box.append(title,paragraph);
        article.append(year,box);
        timeline.append(article);
      });
    }
  }

  window.getPenaHistory=getPenaHistory;
  window.savePenaHistory=savePenaHistory;
  window.resetPenaHistory=resetPenaHistory;

  document.addEventListener('DOMContentLoaded',async()=>{
    if(!document.getElementById('penaTitle'))return;
    renderHistory(await getPenaHistory());
  });
})();
