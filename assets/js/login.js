document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("adminLoginForm");
  const error = document.getElementById("loginError");
  const status = document.getElementById("loginStatus");
  const button = form?.querySelector('button[type="submit"]');
  const next = new URLSearchParams(location.search).get("next") || "admin.html";

  function message(text, isError = false) {
    if (error) error.textContent = isError ? text : "";
    if (status) status.textContent = isError ? "" : text;
  }

  try {
    message("Comprobando sesión…");
    const session = await restoreAuthSession();
    if (session) {
      location.replace(next);
      return;
    }
    message("");
  } catch (e) {
    console.error(e);
    message(e.message || "No se pudo comprobar la sesión.", true);
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    const data = new FormData(form);
    button.disabled = true;
    message("Iniciando sesión…");

    try {
      await loginAdmin(data.get("email"), data.get("password"));
      location.replace(next);
    } catch (e) {
      console.error(e);
      const text =
        e.message?.includes("Invalid login credentials")
          ? "Correo o contraseña incorrectos."
          : (e.message || "No se pudo iniciar sesión.");
      message(text, true);
    } finally {
      button.disabled = false;
    }
  });
});