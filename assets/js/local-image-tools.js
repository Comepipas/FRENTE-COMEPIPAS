window.FrenteImageTools={
 async load(file){
  if(!file)return null;
  if(!file.type.startsWith('image/'))throw new Error('Selecciona una imagen válida.');
  const raw=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsDataURL(file)});
  const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=raw});
  return {raw,img};
 },
 async read(file,max=1600,quality=.84){
  const loaded=await this.load(file);if(!loaded)return '';
  const {img}=loaded,scale=Math.min(1,max/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return c.toDataURL('image/jpeg',quality);
 },
 async readPreserve(file,max=1000){
  const loaded=await this.load(file);if(!loaded)return '';
  const {img}=loaded,scale=Math.min(1,max/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return c.toDataURL('image/png');
 },
 src(value,folder='gallery'){return !value?'':(/^(data:|https?:|blob:)/.test(value)?value:`assets/images/${folder}/${value}`)}
};
