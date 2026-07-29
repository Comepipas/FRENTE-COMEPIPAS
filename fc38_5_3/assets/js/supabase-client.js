window.FrenteSupabase = (() => {
  "use strict";

  let client = null;
  let initPromise = null;
  let mode = "offline";
  let lastError = null;

  function config() {
    return window.FRENTE_SUPABASE_CONFIG || {};
  }

  function configured() {
    const c = config();
    return Boolean(c.enabled === true && c.url && c.anonKey);
  }

  function timeout(promise, milliseconds, message) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), milliseconds);
      })
    ]).finally(() => clearTimeout(timer));
  }

  async function init() {
    if (client && mode === "online") {
      return { ok: true, mode, client };
    }
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const c = config();

      if (!configured()) {
        mode = "offline";
        throw new Error("Supabase no está configurado.");
      }

      if (!window.supabase?.createClient) {
        mode = "offline";
        throw new Error("No se pudo cargar la librería de Supabase.");
      }

      try {
        if (!client) {
          client = window.supabase.createClient(c.url.replace(/\/+$/, ""), c.anonKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
              storageKey: "frente-comepipas-auth-v13-3"
            },
            global: {
              headers: { "x-client-info": "frente-comepipas-v23.3" }
            }
          });
        }

        const probe = await timeout(
          client.from("site_content").select("id", { count: "exact", head: true }),
          12000,
          "Supabase no respondió en 12 segundos."
        );

        if (probe.error) throw probe.error;

        mode = "online";
        lastError = null;
        return { ok: true, mode, client };
      } catch (error) {
        mode = "offline";
        lastError = error?.message || String(error);
        throw error;
      } finally {
        initPromise = null;
      }
    })();

    return initPromise;
  }

  return {
    get client() { return client; },
    get mode() { return mode; },
    get error() { return lastError; },
    configured,
    init
  };
})();