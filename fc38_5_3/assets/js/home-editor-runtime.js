
const HOME_EDITOR_KEY="frente_home_editor_v1";
function getHomeEditorSettings(){try{return JSON.parse(localStorage.getItem(HOME_EDITOR_KEY))||window.FRENTE_HOME_EDITOR_DEFAULTS||{}}catch{return window.FRENTE_HOME_EDITOR_DEFAULTS||{}}}
function saveHomeEditorSettings(v){localStorage.setItem(HOME_EDITOR_KEY,JSON.stringify(v))}
function applyHomeEditor(){
 const S=getHomeEditorSettings(),map={hero:".v10-hero",intro:".v10-intro",counters:".v10-stats-section",quickLinks:".v10-quick-section",featuredTrip:".v10-trip-section",match:".v10-match-section",news:".v10-news-section",gallery:".v10-gallery-section",sponsors:".v10-sponsors-section",socials:".v10-social-section"},main=document.querySelector("main"),arr=[];
 Object.entries(map).forEach(([k,s])=>{const el=document.querySelector(s);if(!el)return;const c=S.blocks?.[k]||{};el.hidden=c.enabled===false;arr.push({el,order:+c.order||99})});
 arr.sort((a,b)=>a.order-b.order).forEach(x=>main?.appendChild(x.el));
 const h=S.hero||{},hero=document.querySelector(".v10-hero");
 if(hero){hero.style.backgroundImage=`url("${/^(data:|https?:|blob:)/.test(h.image||"")?h.image:`assets/images/hero/${h.image||"hero.jpg"}`}")`;hero.style.backgroundPosition=h.imagePosition||"center center";const set=(s,v)=>{const e=document.querySelector(s);if(e)e.textContent=v||""};set(".v10-hero-badge",h.badge);set(".v10-hero h1",h.title);set(".v10-hero-kicker",h.subtitle);set(".v10-hero-slogan",h.slogan);const b=document.querySelectorAll(".v10-hero-actions a");if(b[0]){b[0].textContent=h.primaryButtonText;b[0].href=h.primaryButtonUrl}if(b[1]){b[1].textContent=h.secondaryButtonText;b[1].href=h.secondaryButtonUrl}}
 const i=S.intro||{},intro=document.querySelector(".v10-intro");if(intro){const set=(s,v)=>{const e=intro.querySelector(s);if(e)e.textContent=v||""};set(".v10-eyebrow",i.eyebrow);set("h2",i.title);set("p",i.text)}
 const c=S.colors||{};document.documentElement.style.setProperty("--azul",c.primary||"#0057B8");document.documentElement.style.setProperty("--azul-oscuro",c.secondary||"#002B5C");document.documentElement.style.setProperty("--dorado",c.accent||"#FFD447");
}
document.addEventListener("DOMContentLoaded",applyHomeEditor);
