window.FRENTE_ROLES = {
  superadmin: {
    nombre: "Superadministrador",
    permisos: ["*"]
  },
  presidente: {
    nombre: "Presidente",
    permisos: ["dashboard","socios","cuotas","tienda","viajes","noticias","multimedia","calendario","usuarios"]
  },
  secretario: {
    nombre: "Secretario",
    permisos: ["dashboard","socios","noticias","multimedia","calendario"]
  },
  tesorero: {
    nombre: "Tesorero",
    permisos: ["dashboard","cuotas","tienda","socios"]
  },
  viajes: {
    nombre: "Responsable de viajes",
    permisos: ["dashboard","viajes","socios"]
  },
  editor: {
    nombre: "Editor",
    permisos: ["dashboard","noticias","multimedia","calendario"]
  }
};
