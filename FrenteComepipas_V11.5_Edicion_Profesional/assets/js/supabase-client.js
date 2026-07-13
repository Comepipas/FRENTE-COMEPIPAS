
window.FrenteSupabase = {
  client: null,
  mode: "local",
  error: null,

  configured(){
    const c = window.FRENTE_SUPABASE_CONFIG || {};
    return Boolean(c.enabled && c.url && c.anonKey);
  },

  async init(){
    const c = window.FRENTE_SUPABASE_CONFIG || {};

    if(!this.configured()){
      this.mode = "local";
      return {ok:true,mode:"local",reason:"Supabase no configurado"};
    }

    if(!window.supabase?.createClient){
      this.mode = "local";
      this.error = "No se cargó la librería de Supabase.";
      return {ok:false,mode:"local",error:this.error};
    }

    try{
      this.client = window.supabase.createClient(c.url,c.anonKey,{
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:true
        }
      });

      const {error} = await this.client.from("site_settings").select("id").limit(1);

      if(error) throw error;

      this.mode = "online";
      this.error = null;
      return {ok:true,mode:"online"};
    }catch(error){
      this.error = error?.message || String(error);

      if(c.fallbackToLocal){
        this.mode = "local";
        return {ok:false,mode:"local",error:this.error};
      }

      throw error;
    }
  }
};
