window.FRENTE_PENA_DEFAULTS={
  eyebrow:'Desde 2007',title:'Nuestra historia',
  intro:'Hay formas de vivir el fútbol… y luego está ser del Málaga Club de Fútbol.\n\nSer malaguista no se explica. Se siente.\n\nFrente Comepipas nació para compartir esa pasión: La Rosaleda, los desplazamientos, la amistad y cada momento vivido alrededor de nuestros colores.',
  image:'',valuesTitle:'Nuestros valores',values:'Malaguismo, amistad, respeto, convivencia, compromiso y apoyo incondicional',
  timeline:[
    {year:'2007',title:'Nace Frente Comepipas',text:'Un grupo de malaguistas convierte su amistad y su pasión por el Málaga CF en una peña.'},
    {year:'Primeros años',title:'Kilómetros y amistad',text:'Llegan los primeros desplazamientos, reuniones y recuerdos compartidos siguiendo al equipo.'},
    {year:'Crecimiento',title:'Una familia cada vez mayor',text:'Se incorporan nuevos socios y la peña amplía sus actividades y su presencia malaguista.'},
    {year:'Actualidad',title:'Nueva etapa digital',text:'La peña moderniza sus servicios para acercar la gestión, la información y la participación a todos los socios.'}
  ]
};
(function(){
 'use strict';
 const TABLE='site_content',CONTENT_ID='pena_history',LOCAL_KEY='frente_pena_history_v1';
 function cloneDefaults(){return JSON.parse(JSON.stringify(window.FRENTE_PENA_DEFAULTS))}
 function localHistory(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY))||cloneDefaults()}catch{return cloneDefaults()}}
 async function supabaseClient(){if(!window.FrenteSupabase?.configured?.())return null;try{const result=await window.FrenteSupabase.init();return result?.client||window.FrenteSupabase.client||null}catch(error){console.warn('No se pudo iniciar Supabase para la historia:',error?.message||error);return null}}
 function normalizeHistory(content){const base=cloneDefaults();if(!content||typeof content!=='object')return base;const merged={...base,...content};merged.timeline=Array.isArray(content.timeline)?content.timeline:base.timeline;return merged}
 async function getPenaHistory(){const client=await supabaseClient();if(client){const {data,error}=await client.from(TABLE).select('content,updated_at').eq('id',CONTENT_ID).maybeSingle();if(!error&&data?.content){const content=normalizeHistory(data.content);try{localStorage.setItem(LOCAL_KEY,JSON.stringify(content))}catch{}return content}if(error)console.warn('No se pudo cargar la historia desde Supabase:',error.message)}return localHistory()}
 async function savePenaHistory(content){const client=await supabaseClient();if(!client)throw new Error('No hay conexión con Supabase. Los cambios no se han publicado.');const normalized=normalizeHistory(content);const {error}=await client.from(TABLE).upsert({id:CONTENT_ID,content:normalized,updated_at:new Date().toISOString()},{onConflict:'id'});if(error)throw error;localStorage.setItem(LOCAL_KEY,JSON.stringify(normalized));return normalized}
 async function resetPenaHistory(){const client=await supabaseClient();if(!client)throw new Error('No hay conexión con Supabase.');const content=cloneDefaults();const {error}=await client.from(TABLE).upsert({id:CONTENT_ID,content,updated_at:new Date().toISOString()},{onConflict:'id'});if(error)throw error;localStorage.setItem(LOCAL_KEY,JSON.stringify(content));return content}
 function text(element,value){if(element)element.textContent=value||''}
 function renderHistory(data){
  text(document.getElementById('penaEyebrow'),data.eyebrow);text(document.getElementById('penaTitle'),data.title);text(document.getElementById('penaIntro'),data.intro);text(document.getElementById('penaValuesTitle'),data.valuesTitle);
  const values=document.getElementById('penaValues');if(values){values.replaceChildren();String(data.values||'').split(/[,;\n]+/).map(value=>value.trim()).filter(Boolean).forEach(value=>{const item=document.createElement('span');item.className='pena-value';item.textContent=value;values.appendChild(item)})}
  const image=document.getElementById('penaHistoryImage');if(image){image.hidden=!data.image;image.src=data.image||''}
  const timeline=document.getElementById('penaTimeline');if(timeline){timeline.replaceChildren();(data.timeline||[]).forEach((item,index)=>{const article=document.createElement('article');article.className='pena-timeline-item';article.style.setProperty('--timeline-index',index);const year=document.createElement('span'),box=document.createElement('div'),title=document.createElement('h3'),paragraph=document.createElement('p');year.textContent=item.year||'';title.textContent=item.title||'';paragraph.textContent=item.text||'';box.append(title,paragraph);article.append(year,box);timeline.append(article)})}
 }
 window.getPenaHistory=getPenaHistory;window.savePenaHistory=savePenaHistory;window.resetPenaHistory=resetPenaHistory;
 document.addEventListener('DOMContentLoaded',async()=>{if(!document.getElementById('penaTitle'))return;if(!document.querySelector('link[href*="pena-history-v40.11.css"]')){const style=document.createElement('link');style.rel='stylesheet';style.href='assets/css/pena-history-v40.11.css';document.head.appendChild(style)}document.getElementById('penaValuesTitle')?.closest('.panel')?.classList.add('pena-values-card');renderHistory(await getPenaHistory())});
})();
