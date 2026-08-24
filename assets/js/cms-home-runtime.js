(function(){
  'use strict';
  const LOCAL_KEY='frente_cms_home_v1';
  const REMOTE_KEY='portada_cms';
  const PLACEHOLDERS=/^patrocinador-[1-4]\.png$/i;
  const cloneDefaults=()=>JSON.parse(JSON.stringify(window.FRENTE_CMS_DEFAULTS||{}));
  function getCmsHomeData(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY))||cloneDefaults()}catch{return cloneDefaults()}}
  function saveCmsHomeData(value){localStorage.setItem(LOCAL_KEY,JSON.stringify(value));return true}
  function cmsImageSrc(value,folder=''){const v=String(value||'').trim();if(!v)return '';if(/^(data:|blob:|https?:|\/)/i.test(v)||v.includes('/'))return v;return `${folder}${v}`}
  function realSponsors(data){return (Array.isArray(data?.sponsors)?data.sponsors:[]).filter(x=>x&&x.active&&x.image&&!PLACEHOLDERS.test(String(x.image).trim())).sort((a,b)=>(+a.order||0)-(+b.order||0))}
  async function dbClient(){if(!window.FrenteSupabase?.configured?.())return null;const result=await window.FrenteSupabase.init();return result?.client||null}
  async function loadCmsHomeDataRemote(){const db=await dbClient();if(!db)return null;const {data,error}=await db.from('fc_app_settings').select('valor').eq('clave',REMOTE_KEY).maybeSingle();if(error)throw error;return data?.valor||null}
  async function saveCmsHomeDataRemote(value){const db=await dbClient();if(!db)throw new Error('Supabase no está disponible.');const {error}=await db.from('fc_app_settings').upsert({clave:REMOTE_KEY,valor:value,updated_at:new Date().toISOString()},{onConflict:'clave'});if(error)throw error;saveCmsHomeData(value);return true}
  function applyCmsHome(data=getCmsHomeData()){
    if(data.images){const hero=document.querySelector('.v10-hero');if(hero&&data.images.hero)hero.style.backgroundImage=`url("${cmsImageSrc(data.images.hero,'assets/images/hero/')}")`;document.querySelectorAll('img[src*="escudo-transparente.png"]').forEach(img=>{if(data.images.crest)img.src=cmsImageSrc(data.images.crest,'assets/images/brand/')});const material=document.getElementById('v388MaterialImage');const materialSrc=data.images.material||data.images.quickStore;if(material&&materialSrc){material.src=cmsImageSrc(materialSrc,'assets/images/home/');material.style.objectFit='contain';material.style.objectPosition='center';material.loading='eager'}}
    const track=document.getElementById('v10SponsorsTrack');
    if(track){const sponsors=realSponsors(data);const section=track.closest('.v10-sponsors-section');section.hidden=!sponsors.length;if(sponsors.length){let sequence=[...sponsors];while(sequence.length<5)sequence=[...sequence,...sponsors];track.innerHTML=[...sequence,...sequence].map(item=>{const tag=item.url&&item.url!=='#'?'a':'div';const attrs=tag==='a'?` href="${item.url}" target="_blank" rel="noopener"`:'';return `<${tag} class="v10-sponsor-logo"${attrs}><img src="${cmsImageSrc(item.image,'assets/images/patrocinadores/')}" alt="${item.name||'Patrocinador'}" loading="lazy"></${tag}>`}).join('');track.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>img.closest('.v10-sponsor-logo')?.remove(),{once:true}))}else track.innerHTML=''}
    document.querySelectorAll('[data-social]').forEach(link=>{const url=String(data.socials?.[link.dataset.social]||'').trim();link.hidden=!url;if(url){link.href=url;link.target='_blank';link.rel='noopener noreferrer'}else link.removeAttribute('href')})
  }
  async function initialize(){const local=getCmsHomeData();let selected=local;try{const remote=await loadCmsHomeDataRemote();const isAdmin=location.pathname.endsWith('/cms-admin.html');if(remote&&realSponsors(remote).length){selected=remote;saveCmsHomeData(remote)}else if(isAdmin&&realSponsors(local).length){selected=local;await saveCmsHomeDataRemote(local)}else if(remote){selected=remote;saveCmsHomeData(remote)}}catch(error){console.warn('No se pudo sincronizar el contenido de portada.',error)}applyCmsHome(selected);document.dispatchEvent(new CustomEvent('cms-home-ready',{detail:selected}))}
  Object.assign(window,{getCmsHomeData,saveCmsHomeData,cmsImageSrc,applyCmsHome,loadCmsHomeDataRemote,saveCmsHomeDataRemote});
  document.addEventListener('DOMContentLoaded',initialize);
})();
