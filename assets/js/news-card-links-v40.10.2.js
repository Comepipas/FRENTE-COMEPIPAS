document.addEventListener('click',event=>{
  const card=event.target.closest('.v27-news-card');
  if(!card||event.target.closest('a'))return;
  const link=card.querySelector('a[href]');
  if(link)window.location.href=link.href;
});
