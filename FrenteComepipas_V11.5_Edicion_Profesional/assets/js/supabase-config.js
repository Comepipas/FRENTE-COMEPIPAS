window.FRENTE_SUPABASE_CONFIG = {
  enabled: false,

  // Pega aquí los datos de tu proyecto Supabase.
  url: "",
  anonKey: "",

  // Cuando está en true, la aplicación intenta usar Supabase.
  // Si falla la conexión, vuelve automáticamente al modo local.
  fallbackToLocal: true,

  storageBuckets: {
    publicImages: "public-images",
    privateDocuments: "private-documents"
  }
};
