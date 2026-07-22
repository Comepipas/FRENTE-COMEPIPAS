window.FC_DATA=(function(){
  const localKeys={
    members:"frente_members_db_v2",fees:"frente_fees_db_v1",products:"frente_admin_products_v1",
    orders:"frente_orders_db_v1",trips:"frente_admin_trips_v1",news:"frente_admin_news_v1",
    gallery:"frente_gallery_db_v1",events:"frente_events_db_v1"
  };
  const seed={
    members:()=>window.FRENTE_MEMBERS_DB||[],fees:()=>window.FRENTE_FEES||[],products:()=>window.FRENTE_PRODUCTS||[],
    orders:()=>window.FRENTE_ORDERS||[],trips:()=>window.FRENTE_TRIPS||[],news:()=>window.FRENTE_NEWS||[],
    gallery:()=>window.FRENTE_GALLERY||[],events:()=>window.FRENTE_EVENTS||[]
  };
  const table={members:"members",fees:"fees",products:"products",orders:"orders",trips:"trips",news:"news",gallery:"gallery_items",events:"events"};
  const cfg=()=>window.SUPABASE_CONFIG||{};
  const remote=()=>Boolean(cfg().enabled&&window.FC_SUPABASE?.ready&&window.FC_SUPABASE.client);
  function readLocal(name){try{return JSON.parse(localStorage.getItem(localKeys[name]))||seed[name]?.()||[]}catch{return seed[name]?.()||[]}}
  function writeLocal(name,data){localStorage.setItem(localKeys[name],JSON.stringify(data));return data}
  async function list(name){
    if(!remote()) return readLocal(name);
    const {data,error}=await window.FC_SUPABASE.client.from(table[name]).select('*').order('created_at',{ascending:false});
    if(error){if(cfg().fallbackToLocal)return readLocal(name);throw error} return data||[];
  }
  async function upsert(name,rows){
    const values=Array.isArray(rows)?rows:[rows];
    if(!remote()){const current=readLocal(name);for(const row of values){const i=current.findIndex(x=>x.id===row.id);i>=0?current.splice(i,1,{...current[i],...row}):current.push(row)}return writeLocal(name,current)}
    const {data,error}=await window.FC_SUPABASE.client.from(table[name]).upsert(values).select();if(error)throw error;return data;
  }
  async function remove(name,id){
    if(!remote()) return writeLocal(name,readLocal(name).filter(x=>x.id!==id));
    const {error}=await window.FC_SUPABASE.client.from(table[name]).delete().eq('id',id);if(error)throw error;return true;
  }
  async function test(){
    if(!remote()) return {ok:false,message:window.FC_SUPABASE?.error||'Supabase está desactivado.'};
    const {error}=await window.FC_SUPABASE.client.from('site_settings').select('id').limit(1);
    return error?{ok:false,message:error.message}:{ok:true,message:'Conexión correcta.'};
  }
  async function migrateLocal(){
    if(!remote()) throw new Error('Activa Supabase y añade las credenciales.');
    const results={};
    for(const name of Object.keys(table)){
      const rows=readLocal(name);
      if(!rows.length){results[name]=0;continue}
      const {error}=await window.FC_SUPABASE.client.from(table[name]).upsert(rows);
      if(error)throw new Error(`${name}: ${error.message}`);
      results[name]=rows.length;
    }
    return results;
  }
  return {isRemote:remote,list,upsert,remove,test,migrateLocal,readLocal,writeLocal};
})();
