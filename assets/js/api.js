
window.FrenteAPI = (() => {
  const tableMap = {
    members: {table:"members", localKey:"frente_members_db_v2"},
    fees: {table:"fees", localKey:"frente_fees_db_v1"},
    products: {table:"products", localKey:"frente_admin_products_v1"},
    orders: {table:"orders", localKey:"frente_orders_db_v1"},
    trips: {table:"trips", localKey:"frente_admin_trips_v1"},
    tripBookings: {table:"trip_bookings", localKey:"frente_trip_bookings_v1"},
    news: {table:"news", localKey:"frente_admin_news_v1"},
    media: {table:"media_items", localKey:"frente_media_library_v1"},
    events: {table:"events", localKey:"frente_events_db_v1"},
    siteSettings: {table:"site_settings", localKey:"frente_site_settings_v1"},
    audit: {table:"audit_log", localKey:"frente_audit_log_v1"}
  };

  function readLocal(key,fallback=[]){
    try{
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    }catch{
      return fallback;
    }
  }

  function writeLocal(key,value){
    localStorage.setItem(key,JSON.stringify(value));
  }

  function idFor(record){
    return record?.id ?? record?.user_id ?? record?.key;
  }

  function resource(name){
    const config = tableMap[name];
    if(!config) throw new Error(`Recurso desconocido: ${name}`);

    return {
      async list(options={}){
        if(window.FrenteSupabase?.mode === "online"){
          let query = window.FrenteSupabase.client.from(config.table).select("*");

          if(options.orderBy){
            query = query.order(options.orderBy,{
              ascending: options.ascending ?? true
            });
          }

          if(options.limit){
            query = query.limit(options.limit);
          }

          const {data,error} = await query;
          if(error) throw error;
          return data || [];
        }

        return readLocal(config.localKey,options.fallback || []);
      },

      async get(id){
        if(window.FrenteSupabase?.mode === "online"){
          const {data,error} = await window.FrenteSupabase.client
            .from(config.table)
            .select("*")
            .eq("id",id)
            .maybeSingle();

          if(error) throw error;
          return data;
        }

        const rows = readLocal(config.localKey,[]);
        return Array.isArray(rows) ? rows.find(row=>String(idFor(row))===String(id)) : rows;
      },

      async create(record){
        if(window.FrenteSupabase?.mode === "online"){
          const {data,error} = await window.FrenteSupabase.client
            .from(config.table)
            .insert(record)
            .select()
            .single();

          if(error) throw error;
          return data;
        }

        const rows = readLocal(config.localKey,[]);
        if(Array.isArray(rows)){
          rows.push(record);
          writeLocal(config.localKey,rows);
        }else{
          writeLocal(config.localKey,record);
        }
        return record;
      },

      async update(id,changes){
        if(window.FrenteSupabase?.mode === "online"){
          const {data,error} = await window.FrenteSupabase.client
            .from(config.table)
            .update(changes)
            .eq("id",id)
            .select()
            .single();

          if(error) throw error;
          return data;
        }

        const rows = readLocal(config.localKey,[]);
        if(Array.isArray(rows)){
          const updated = rows.map(row =>
            String(idFor(row))===String(id) ? {...row,...changes} : row
          );
          writeLocal(config.localKey,updated);
          return updated.find(row=>String(idFor(row))===String(id));
        }

        const value = {...rows,...changes};
        writeLocal(config.localKey,value);
        return value;
      },

      async remove(id){
        if(window.FrenteSupabase?.mode === "online"){
          const {error} = await window.FrenteSupabase.client
            .from(config.table)
            .delete()
            .eq("id",id);

          if(error) throw error;
          return true;
        }

        const rows = readLocal(config.localKey,[]);
        if(Array.isArray(rows)){
          writeLocal(config.localKey,rows.filter(row=>String(idFor(row))!==String(id)));
        }else{
          localStorage.removeItem(config.localKey);
        }
        return true;
      },

      async replaceAll(records){
        if(window.FrenteSupabase?.mode === "online"){
          const client = window.FrenteSupabase.client;
          const {error:deleteError} = await client.from(config.table).delete().neq("id","");
          if(deleteError) throw deleteError;

          if(records?.length){
            const {error:insertError} = await client.from(config.table).insert(records);
            if(insertError) throw insertError;
          }
          return records;
        }

        writeLocal(config.localKey,records);
        return records;
      }
    };
  }

  const api = {
    mode(){
      return window.FrenteSupabase?.mode || "local";
    },

    init: async function(){
      return await window.FrenteSupabase.init();
    },

    auth:{
      async signIn(email,password){
        if(window.FrenteSupabase?.mode !== "online"){
          return {mode:"local",user:null};
        }

        const {data,error} = await window.FrenteSupabase.client.auth.signInWithPassword({
          email,password
        });

        if(error) throw error;
        return data;
      },

      async signOut(){
        if(window.FrenteSupabase?.mode === "online"){
          const {error} = await window.FrenteSupabase.client.auth.signOut();
          if(error) throw error;
        }
        return true;
      },

      async session(){
        if(window.FrenteSupabase?.mode !== "online") return null;
        const {data,error} = await window.FrenteSupabase.client.auth.getSession();
        if(error) throw error;
        return data.session;
      },

      async resetPassword(email){
        if(window.FrenteSupabase?.mode !== "online"){
          throw new Error("Supabase no está configurado.");
        }

        const {error} = await window.FrenteSupabase.client.auth.resetPasswordForEmail(email,{
          redirectTo: location.origin + location.pathname.replace(/[^/]+$/,"") + "cambiar-password.html"
        });

        if(error) throw error;
        return true;
      }
    },

    storage:{
      async upload(bucket,path,file,options={}){
        if(window.FrenteSupabase?.mode !== "online"){
          throw new Error("La subida de archivos necesita Supabase conectado.");
        }

        const {data,error} = await window.FrenteSupabase.client.storage
          .from(bucket)
          .upload(path,file,{
            upsert: options.upsert ?? true,
            contentType: file.type || options.contentType
          });

        if(error) throw error;
        return data;
      },

      publicUrl(bucket,path){
        if(window.FrenteSupabase?.mode !== "online") return "";
        return window.FrenteSupabase.client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
      },

      async signedUrl(bucket,path,expiresIn=3600){
        if(window.FrenteSupabase?.mode !== "online"){
          throw new Error("Supabase no está conectado.");
        }

        const {data,error} = await window.FrenteSupabase.client.storage
          .from(bucket)
          .createSignedUrl(path,expiresIn);

        if(error) throw error;
        return data.signedUrl;
      }
    }
  };

  Object.keys(tableMap).forEach(name=>{
    api[name] = resource(name);
  });

  return api;
})();
