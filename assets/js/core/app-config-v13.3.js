window.FrenteAppConfig = Object.freeze({
  version: "34.2.0",
  dataSource: "supabase",
  members: Object.freeze({
    table: "socios",
    historyTable: "member_history",
    guardiansTable: "member_guardians",
    pageSize: 50,
    select: "id,numero_socio,nombre,apellidos,dni,fecha_nacimiento,telefono,email,direccion,foto_url,fecha_alta,estado,categoria,cuenta_activada,cuota_al_dia,sector,fila,asiento,tipo_abono,precio_abono,observaciones_internas,created_at,updated_at,sector_id,numero_abonado_malaga,auth_user_id,numero_socio_estado,es_registro_prueba,migration_source"
  })
});