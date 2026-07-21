window.FRENTE_SUPABASE_CONFIG = {
  enabled: true,

  // Copia en Supabase: Project Settings → API → Project URL.
  url: "https://rlyxxsxxruenuxhfsnxg.supabase.co",

  // Copia la clave pública anon/publishable. Nunca uses service_role.
  anonKey: "sb_publishable_cxE-yFVwCjIJ7xVgJxGbGQ_koRhPXlC",

  // Los módulos antiguos pueden seguir usando modo local.
  // Socios V13.3.0 exige conexión online y no guarda una copia local.
  fallbackToLocal: false,

  storageBuckets: {
    publicImages: "public-images",
    privateDocuments: "private-documents"
  }
};
