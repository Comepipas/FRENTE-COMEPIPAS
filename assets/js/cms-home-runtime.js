const CMS_HOME_KEY='frente_cms_home_v1';
const CMS_HOME_CONTENT_ID='home_cms';
let CMS_HOME_CACHE=null,CMS_SHARED_PROMISE=null;
function ensureCmsShared(){if(window.FrenteSharedContent)return Promise.resolve(window.FrenteSharedContent);if(!CMS_SHARED_PROMISE)CMS_SHARED_PROMISE=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/js/shared-site-content-v40.10.js';script.onload=()=>resolve(window.FrenteSharedContent);script.onerror=()=>reject(new Error('No se pudo cargar el servicio de publicación compartida.'));document.head.appendChild(script)});return CMS_SHARED_PROMISE}
function cmsDefaults(){return window.FrenteSharedContent?.merge(window.FRENTE_CMS_DEFAULTS||{}, {})||JSON.parse(JSON.stringify(window.FRENTE_CMS_DEFAULTS||{}))}
function getCmsHomeData(){return CMS_HOME_CACHE||cmsDefaults()}
async function loadCmsHomeData(){await ensureCmsShared();const result=await FrenteSharedContent.load(CMS_HOME_CONTENT_ID,cmsDefaults(),CMS_HOME_KEY);CMS_HOME_CACHE=result.value;document.dispatchEvent(new CustomEvent('frente:cms-loaded',{detail:result}));if(typeof window.render==='function')window.render();return result}
async function saveCmsHomeData(value){await ensureCmsShared();CMS_HOME_CACHE=value;try{return await FrenteSharedContent.save(CMS_HOME_CONTENT_ID,value,CMS_HOME_KEY)}catch(error){console.error('No se pudo publicar el CMS:',error);alert(error.message||'No se pudo publicar en Supabase.');throw error}}
function cmsImage(value,folder){return !value?'':(/^(data:|https?:|blob:)/.test(value)?value:`assets/images/${folder}/${value}`)}
function applyCmsHome(c=getCmsHomeData()){
 if(c.images){const hero=document.querySelector('.v10-hero');if(hero&&c.images.hero)hero.style.backgroundImage=`url("${cmsImage(c.images.hero,'hero')}")`;document.querySelectorAll('img[src*="escudo-transparente.png"]').forEach(image=>{if(c.images.crest)image.src=cmsImage(c.images.crest,'brand')})}
 const sponsors=document.getElementById('v10SponsorsTrack');if(sponsors&&Array.isArray(c.sponsors)){const active=c.sponsors.filter(item=>item.active).sort((a,b)=>(+a.order||0)-(+b.order||0));sponsors.innerHTML=[...active,...active].map(item=>`<a class="v10-sponsor-logo" href="${item.url||'#'}" target="_blank" rel="noopener"><img src="${cmsImage(item.image,'patrocinadores')}" alt="${item.name||'Patrocinador'}"></a>`).join('')}
 const general=typeof getSiteSettings==='function'?getSiteSettings():{};document.querySelectorAll('[data-social]').forEach(link=>{const key=link.dataset.social,raw=c.socials?.[key]||general?.[key]||'',url=typeof normalizeSocialUrl==='function'?normalizeSocialUrl(key,raw):raw;link.hidden=!url;if(url){link.href=url;link.target='_blank';link.rel='noopener noreferrer'}});
}
document.addEventListener('DOMContentLoaded',async()=>{if(document.querySelector('.cms-admin')){const script=document.createElement('script');script.src='assets/js/cms-enterprise-v40.15.js';document.head.appendChild(script)}const result=await loadCmsHomeData();applyCmsHome(result.value)});
document.addEventListener('frente:site-settings-loaded',()=>applyCmsHome());
