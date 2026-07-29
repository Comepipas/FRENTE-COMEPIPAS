# Frente Comepipas V12.1 — Renovaciones operativas

## Mejoras visibles

- Tarifas por sector creadas y editadas desde la propia web.
- Cuotas de Peña y fechas de nacimiento editables por temporada.
- Registro de descuentos individuales comunicados por el Málaga CF.
- Nueva pestaña de comprobación previa de campaña.
- Control de sectores sin tarifa, categorías sin fechas e incidencias pendientes.
- Formularios integrados para sectores, tarifas, cuotas y descuentos.
- Persistencia real en Supabase cuando está configurado.
- Modo demostración completo cuando Supabase está desactivado.

## Regla de cálculo

`Precio del abono + cuota de Peña - descuento del club + ajuste individual`

## Seguridad

Nunca se usa la clave `service_role` en el navegador. El panel utiliza la clave pública y las políticas RLS de Supabase.
