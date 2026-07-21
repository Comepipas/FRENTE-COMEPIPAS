document.addEventListener("DOMContentLoaded", async () => {
  const existing = getAuthSession?.();
  if (!existing) return;

  try {
    const restored = await restoreAuthSession();
    if (!restored) redirectToLogin();
    else applyPermissionUI();
  } catch (error) {
    console.error("No se pudo validar la sesión de Supabase:", error);
    clearAuthSession();
    redirectToLogin();
  }
});