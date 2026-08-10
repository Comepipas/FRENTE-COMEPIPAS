
window.FrenteSync = {
  resources:{
    members:{key:"frente_members_db_v2",table:"members"},
    fees:{key:"frente_fees_db_v1",table:"fees"},
    products:{key:"frente_admin_products_v1",table:"products"},
    orders:{key:"frente_orders_db_v1",table:"orders"},
    trips:{key:"frente_admin_trips_v1",table:"trips"},
    tripBookings:{key:"frente_trip_bookings_v1",table:"trip_bookings"},
    news:{key:"frente_admin_news_v1",table:"news"},
    media:{key:"frente_media_library_v1",table:"media_items"},
    events:{key:"frente_events_db_v1",table:"events"},
    siteSettings:{key:"frente_site_settings_v1",table:"site_settings"},
    audit:{key:"frente_audit_log_v1",table:"audit_log"}
  },

  readLocal(key){
    try{return JSON.parse(localStorage.getItem(key))}
    catch{return null}
  },

  async status(){
    const result = await window.FrenteAPI.init();
    return {
      ...result,
      configured: window.FrenteSupabase.configured(),
      error: window.FrenteSupabase.error
    };
  },

  async pushResource(name){
    if(window.FrenteSupabase.mode !== "online"){
      throw new Error("Supabase no está conectado.");
    }

    const cfg = this.resources[name];
    if(!cfg) throw new Error(`Módulo desconocido: ${name}`);

    const value = this.readLocal(cfg.key);
    if(value === null) return {name,skipped:true,count:0};

    const rows = Array.isArray(value) ? value : [value];
    if(!rows.length) return {name,skipped:true,count:0};

    const client = window.FrenteSupabase.client;

    const {error} = await client
      .from(cfg.table)
      .upsert(rows,{onConflict:"id"});

    if(error) throw error;

    return {name,skipped:false,count:rows.length};
  },

  async pushAll(onProgress=()=>{}){
    const results=[];
    const names=Object.keys(this.resources);

    for(let index=0;index<names.length;index++){
      const name=names[index];
      onProgress({
        name,
        index:index+1,
        total:names.length,
        message:`Migrando ${name}...`
      });

      try{
        results.push(await this.pushResource(name));
      }catch(error){
        results.push({
          name,
          error:error?.message || String(error),
          count:0
        });
      }
    }

    return results;
  },

  async pullResource(name){
    if(window.FrenteSupabase.mode !== "online"){
      throw new Error("Supabase no está conectado.");
    }

    const cfg=this.resources[name];
    const {data,error}=await window.FrenteSupabase.client
      .from(cfg.table)
      .select("*");

    if(error) throw error;

    localStorage.setItem(cfg.key,JSON.stringify(data || []));
    return {name,count:data?.length || 0};
  },

  async pullAll(onProgress=()=>{}){
    const results=[];
    const names=Object.keys(this.resources);

    for(let index=0;index<names.length;index++){
      const name=names[index];
      onProgress({
        name,
        index:index+1,
        total:names.length,
        message:`Descargando ${name}...`
      });

      try{
        results.push(await this.pullResource(name));
      }catch(error){
        results.push({
          name,
          error:error?.message || String(error),
          count:0
        });
      }
    }

    return results;
  }
};
