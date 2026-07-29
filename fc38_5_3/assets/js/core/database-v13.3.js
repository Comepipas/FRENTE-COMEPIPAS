window.FrenteDatabase = (() => {
  "use strict";

  let client = null;

  async function init() {
    const result = await window.FrenteSupabase.init();
    client = result.client;
    if (!client) throw new Error("No se pudo inicializar el cliente de Supabase.");
    return { client, mode: "online" };
  }

  function getClient() {
    if (!client) throw new Error("La base de datos todavía no está inicializada.");
    return client;
  }

  return { init, getClient };
})();