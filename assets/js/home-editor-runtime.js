const HOME_EDITOR_KEY='frente_home_editor_v1';
const HOME_EDITOR_CONTENT_ID='home_editor';
let HOME_EDITOR_CACHE=null;
let HOME_SHARED_PROMISE=null;
function ensureHomeShared(){
  if(window.FrenteSharedContent)return Promise.resolve(window.FrenteSharedContent);
  if(!HOME_SHARED_PROMISE)HOME_SHARED_PROMISE=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='assets/js/shared-site-content-v40.10.js';script.onload=()=>resolve(window.FrenteSharedContent);script.onerror=()=>reject(new Error('No se pudo cargar el servicio de publicación compartida.'));document.head.appendChild(script)});
  return HOME_SHARED_PROMISE;
}

function homeEditorDefaults(){return window.FrenteSharedContent.merge(window.FRENTE_HOME_EDITOR_DEFAULTS||{},{});}
function getHomeEditorSettings(){return HOME_EDITOR_CACHE||homeEditorDefaults();}
async function loadHomeEditorSettings(){
  await ensureHomeShared();
  const result=await window.FrenteSharedContent.load(HOME_EDITOR_CONTENT_ID,homeEditorDefaults(),HOME_EDITOR_KEY);
  HOME_EDITOR_CACHE=result.value;
  return result;
}
async function saveHomeEditorSettings(value){
  await ensureHomeShared();
  const saved=await window.FrenteSharedContent.save(HOME_EDITOR_CONTENT_ID,value,HOME_EDITOR_KEY);
  HOME_EDITOR_CACHE=saved.content;
  return saved;
}
function applyHomeEditor(S=getHomeEditorSettings()){
  const map={hero:'.v10-hero',intro:'.v10-intro, .v115-home-intro',counters:'.v10-stats-section',quickLinks:'.v10-quick-section',featuredTrip:'.v10-trip-section',match:'.v10-match-section, .v115-late-football',news:'.v10-news-section',gallery:'.v10-gallery-section',sponsors:'.v10-sponsors-section',socials:'.v10-social-section',material:'.v115-shop-section',join:'.v115-join-section'};
  const main=document.querySelector('main'),ordered=[];
  Object.entries(map).forEach(([key,selector])=>{
    const element=document.querySelector(selector);if(!element)return;
    const config=S.blocks?.[key]||{};element.hidden=config.enabled===false;
    ordered.push({element,order:+config.order||99});
  });
  ordered.sort((a,b)=>a.order-b.order).forEach(item=>main?.appendChild(item.element));
  const hero=S.hero||{},heroElement=document.querySelector('.v10-hero');
  if(heroElement){
    const image=/^(data:|https?:|blob:)/.test(hero.image||'')?hero.image:`assets/images/hero/${hero.image||'hero.jpg'}`;
    heroElement.style.backgroundImage=`url("${image}")`;heroElement.style.backgroundPosition=hero.imagePosition||'center center';
    const set=(selector,value)=>{const element=document.querySelector(selector);if(element&&value!==undefined)element.textContent=value||''};
    set('.v10-hero-badge',hero.badge);set('.v10-hero h1',hero.title);set('.v10-hero-kicker',hero.subtitle);set('.v10-hero-slogan',hero.slogan);
    const primaryButton=document.querySelector('[data-home-primary]'),secondaryButton=document.querySelector('[data-home-secondary]');
    if(primaryButton&&hero.primaryButtonText!==undefined){primaryButton.textContent=hero.primaryButtonText;primaryButton.href=hero.primaryButtonUrl||'#'}
    if(secondaryButton&&hero.secondaryButtonText!==undefined){secondaryButton.textContent=hero.secondaryButtonText;secondaryButton.href=hero.secondaryButtonUrl||'#'}
  }
  const intro=S.intro||{},introElement=document.querySelector('.v10-intro, .v115-home-intro');
  if(introElement){const set=(selector,value)=>{const element=introElement.querySelector(selector);if(element&&value!==undefined)element.textContent=value||''};set('.v10-eyebrow',intro.eyebrow);set('h2',intro.title);set('p',intro.text)}
  const colors=S.colors||{};document.documentElement.style.setProperty('--azul',colors.primary||'#0057B8');document.documentElement.style.setProperty('--azul-oscuro',colors.secondary||'#002B5C');document.documentElement.style.setProperty('--dorado',colors.accent||'#FFD447');
}
document.addEventListener('DOMContentLoaded',async()=>{const result=await loadHomeEditorSettings();applyHomeEditor(result.value)});
