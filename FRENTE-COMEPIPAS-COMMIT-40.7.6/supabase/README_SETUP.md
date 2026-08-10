# CONFIGURACIÓN DE SUPABASE — FRENTE COMEPIPAS V9.5

## Qué hace esta versión

La web funciona de dos formas:

- **Modo local:** los datos se guardan en el navegador.
- **Modo online:** los datos se guardan en Supabase y se comparten entre dispositivos.

Mientras Supabase no esté configurado, la web seguirá funcionando como hasta ahora.

## Paso 1 — Crear el proyecto

1. Entra en Supabase.
2. Crea una cuenta.
3. Pulsa **New project**.
4. Escribe un nombre para el proyecto.
5. Crea una contraseña segura para la base de datos.
6. Elige una región cercana.
7. Espera a que termine la creación.

## Paso 2 — Crear las tablas

En Supabase:

1. Abre **SQL Editor**.
2. Pulsa **New query**.
3. Copia todo el contenido de `schema.sql`.
4. Pégalo y pulsa **Run**.
5. Repite el proceso con:
   - `policies.sql`
   - `storage.sql`
   - `seed.sql`

Ejecuta los archivos en ese orden.

## Paso 3 — Copiar la URL y la clave pública

En Supabase:

1. Abre **Project Settings**.
2. Entra en **API**.
3. Copia:
   - Project URL
   - anon public key

No uses nunca la clave `service_role` dentro de la web.

## Paso 4 — Pegar los datos

Abre:

`assets/js/supabase-config.js`

Cambia:

```js
enabled: false,
url: "",
anonKey: ""
```

por:

```js
enabled: true,
url: "TU_URL",
anonKey: "TU_CLAVE_PUBLICA"
```

## Paso 5 — Crear el primer administrador

1. En Supabase abre **Authentication**.
2. Crea un usuario con email y contraseña.
3. Copia su UUID.
4. Abre **SQL Editor**.
5. Ejecuta:

```sql
insert into public.admin_profiles (user_id,nombre,rol,activo)
values (
  'UUID_DEL_USUARIO',
  'Administrador principal',
  'superadmin',
  true
);
```

## Paso 6 — Comprobar la conexión

Abre:

`migracion-supabase.html`

Pulsa:

**Comprobar conexión**

Debe aparecer:

**Conectado**

## Paso 7 — Migrar los datos locales

En la misma página pulsa:

**Migrar local → Supabase**

La herramienta enviará los datos guardados en el navegador a las tablas online.

## Importante

Antes de migrar:

1. Abre `backups-admin.html`.
2. Crea una copia de seguridad JSON.
3. Guarda el archivo en un lugar seguro.

## Archivos principales

- `assets/js/supabase-config.js`
- `assets/js/supabase-client.js`
- `assets/js/api.js`
- `assets/js/sync.js`
- `supabase/schema.sql`
- `supabase/policies.sql`
- `supabase/storage.sql`
- `supabase/seed.sql`
