const SITE_SETTINGS_KEY='frente_site_settings_v1';
const SITE_SETTINGS_CONTENT_ID='site_settings';
let SITE_SETTINGS_CACHE=null;
let SITE_SHARED_PROMISE=null;
function ensureSiteShared(){if(window.FrenteSharedContent)return Promise.resolve(window.FrenteSharedContent);if(!SITE_SHARED_PROMISE)SITE_SHARED_PROMISE=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/js/shared-site-content-v40.10.js';script.onload=()=>resolve(window.FrenteSharedContent);script.onerror=()=>reject(new Error('No se pudo cargar el servicio de publicación compartida.'));document.head.appendChild(script)});return SITE_SHARED_PROMISE}
function siteSettingsDefaults(){return window.FrenteSharedContent?.merge(window.FRENTE_SITE_SETTINGS||{}, {})||{...(window.FRENTE_SITE_SETTINGS||{})}}
function getSiteSettings(){return SITE_SETTINGS_CACHE||siteSettingsDefaults()}
async function loadSiteSettings(){await ensureSiteShared();const result=await window.FrenteSharedContent.load(SITE_SETTINGS_CONTENT_ID,siteSettingsDefaults(),SITE_SETTINGS_KEY);SITE_SETTINGS_CACHE=result.value;return result}
async function saveSiteSettings(settings){await ensureSiteShared();const saved=await window.FrenteSharedContent.save(SITE_SETTINGS_CONTENT_ID,settings,SITE_SETTINGS_KEY);SITE_SETTINGS_CACHE=saved.content;return saved}
function applySiteSettings(S=getSiteSettings()){
 const map={nombre:'[data-config="nombre"]',subtitulo:'[data-config="subtitulo"]',lema:'[data-config="lema"]',temporada:'[data-config="temporada"]',fundacion:'[data-config="fundacion"]',email:'[data-config="email"]',telefono:'[data-config="telefono"]',direccion:'[data-config="direccion"]',ciudad:'[data-config="ciudad"]'};
 Object.entries(map).forEach(([key,selector])=>document.querySelectorAll(selector).forEach(element=>{element.textContent=S[key]??'';if(element.tagName==='A'){if(key==='email'&&S.email)element.href=`mailto:${S.email}`;if(key==='telefono'&&S.telefono)element.href=`tel:${S.telefono}`}}));
 const imageSrc=(value,folder)=>!value?'':(/^(data:|https?:|blob:)/.test(value)?value:`assets/images/${folder}/${value}`),hero=document.querySelector('.hero');
 if(hero&&S.heroImage){hero.style.backgroundImage=`linear-gradient(90deg,rgba(0,18,43,.93),rgba(0,24,55,.55)), url("${imageSrc(S.heroImage,'hero')}")`;hero.style.backgroundPosition=S.heroPosition||'center center'}
 document.querySelectorAll('img[src*="escudo-transparente.png"],[data-site-image="escudo"]').forEach(img=>img.src=imageSrc(S.escudo||'escudo-transparente.png','brand'));
 document.querySelectorAll('img[src*="don-comepipas-transparente.png"],[data-site-image="logo"]').forEach(img=>img.src=imageSrc(S.logo||'don-comepipas-transparente.png','brand'));
 if(S.favicon){let icon=document.querySelector('link[rel="icon"]');if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.appendChild(icon)}icon.href=imageSrc(S.favicon,'brand')}
 document.documentElement.style.setProperty('--azul',S.colorPrimario||'#0057B8');document.documentElement.style.setProperty('--azul-oscuro',S.colorSecundario||'#002B5C');document.documentElement.style.setProperty('--dorado',S.colorAcento||'#FFD447');
 document.querySelectorAll('[data-social]').forEach(link=>{const key=link.dataset.social,url=normalizeSocialUrl(key,S[key]);if(url){link.href=url;link.hidden=false;link.target='_blank';link.rel='noopener noreferrer'}});
}
function normalizeSocialUrl(key,value){const raw=String(value||'').trim();if(!raw)return '';if(/^https?:\/\//i.test(raw))return raw;if(key==='whatsapp'){const phone=raw.replace(/\D/g,'');return phone?`https://wa.me/${phone}`:''}const clean=raw.replace(/^@/,'').replace(/^\/+|\/+$/g,'');if(key==='instagram')return `https://instagram.com/${clean}`;if(key==='x')return `https://x.com/${clean}`;if(key==='facebook')return `https://facebook.com/${clean}`;if(key==='youtube')return `https://youtube.com/${clean}`;if(key==='tiktok')return `https://tiktok.com/@${clean.replace(/^@/,'')}`;return raw}
document.addEventListener('DOMContentLoaded',async()=>{const result=await loadSiteSettings();applySiteSettings(result.value);document.dispatchEvent(new CustomEvent('frente:site-settings-loaded',{detail:result.value}))});
