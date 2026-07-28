window.FrenteFeesService = (() => {
  "use strict";

  const db = () => window.FrenteDatabase.getClient();
  const TABLE = "cuotas_socios";

  function normalize(row, members, seasons, categories) {
    const member = members.get(row.socio_id) || {};
    const season = seasons.get(row.temporada_id) || {};
    const category = categories.get(row.categoria_cuota_id) || {};
    return {
      ...row,
      numeroSocio: member.numero_socio ? String(member.numero_socio).padStart(4, "0") : "Pendiente",
      socioNombre: `${member.apellidos || ""}, ${member.nombre || ""}`.replace(/^,\s*/, "").trim() || "Socio no encontrado",
      socioCategoria: String(member.categoria || category.nombre || "Sin categoría").trim().toLowerCase(),
      temporada: season.nombre || "Sin temporada",
      categoriaCuota: category.nombre || member.categoria || "Sin categoría",
      importe: Number(row.importe || 0),
      estado: String(row.estado || "pendiente").toLowerCase(),
      fechaPago: row.fecha_pago || null,
      metodoPago: row.metodo_pago || null,
      referencia: row.referencia || null,
      observaciones: row.observaciones || null,
      socioEstado: member.estado || null,
      esDirectivo: Boolean(member.es_directivo),
      cargoDirectiva: member.cargo_directiva || null
    };
  }

  async function fetchByIds(table, select, ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    if (!unique.length) return [];
    const { data, error } = await db().from(table).select(select).in("id", unique);
    if (error) throw error;
    return data || [];
  }

  async function list() {
    const { data: fees, error } = await db()
      .from(TABLE)
      .select("id,socio_id,temporada_id,categoria_cuota_id,importe,estado,fecha_pago,metodo_pago,referencia,observaciones,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = fees || [];
    const [membersRows, seasonRows, categoryRows] = await Promise.all([
      fetchByIds("socios", "id,numero_socio,nombre,apellidos,categoria,estado,es_directivo,cargo_directiva", rows.map(x => x.socio_id)),
      fetchByIds("temporadas", "id,nombre,activa", rows.map(x => x.temporada_id)),
      fetchByIds("categorias_cuota", "id,nombre,codigo,importe,exenta,temporada_id,activa", rows.map(x => x.categoria_cuota_id))
    ]);

    const members = new Map(membersRows.map(x => [x.id, x]));
    const seasons = new Map(seasonRows.map(x => [x.id, x]));
    const categories = new Map(categoryRows.map(x => [x.id, x]));
    return rows.map(row => normalize(row, members, seasons, categories)).sort((a,b) => a.socioNombre.localeCompare(b.socioNombre, "es", { sensitivity: "base" }));
  }

  async function options() {
    const [membersResult, seasonsResult, categoriesResult] = await Promise.all([
      db().from("socios").select("id,numero_socio,nombre,apellidos,categoria,estado,es_directivo,cargo_directiva").order("apellidos", { ascending: true }).order("nombre", { ascending: true }),
      db().from("temporadas").select("id,nombre,activa").order("nombre", { ascending: false }),
      db().from("categorias_cuota").select("id,temporada_id,nombre,codigo,importe,exenta,activa,orden").eq("activa", true).order("orden")
    ]);
    if (membersResult.error) throw membersResult.error;
    if (seasonsResult.error) throw seasonsResult.error;
    if (categoriesResult.error) throw categoriesResult.error;
    return {
      members: (membersResult.data || []).filter(x => x.estado !== "baja"),
      seasons: seasonsResult.data || [],
      categories: categoriesResult.data || []
    };
  }

  async function markPaid(id, { fechaPago, metodoPago, referencia = null, observaciones = null }) {
    const payload = {
      estado: "pagada",
      fecha_pago: fechaPago,
      metodo_pago: metodoPago,
      referencia: referencia || null,
      observaciones: observaciones || null,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await db().from(TABLE).update(payload).eq("id", id)
      .select("id,estado,fecha_pago,metodo_pago,referencia,observaciones,updated_at").single();
    if (error) throw error;
    return data;
  }

  async function save(input) {
    const payload = {
      socio_id: input.socioId,
      temporada_id: input.temporadaId,
      categoria_cuota_id: input.categoriaCuotaId || null,
      importe: Number(input.importe || 0),
      estado: input.estado || "pendiente",
      fecha_pago: input.estado === "pagada" ? (input.fechaPago || new Date().toISOString().slice(0, 10)) : null,
      metodo_pago: input.estado === "pagada" ? (input.metodoPago || null) : null,
      referencia: input.referencia || null,
      observaciones: input.observaciones || null,
      updated_at: new Date().toISOString()
    };

    if (input.id) {
      const { data, error } = await db().from(TABLE).update(payload).eq("id", input.id)
        .select("id").single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await db().from(TABLE).insert(payload).select("id").single();
    if (error) throw error;
    return data;
  }

  async function annul(id, reason = "Cuota anulada desde administración") {
    const { data, error } = await db().from(TABLE).update({
      estado: "anulada",
      fecha_pago: null,
      metodo_pago: null,
      observaciones: reason || null,
      updated_at: new Date().toISOString()
    }).eq("id", id).select("id,estado").single();
    if (error) throw error;
    return data;
  }

  async function reactivate(id) {
    const { data, error } = await db().from(TABLE).update({
      estado: "pendiente",
      fecha_pago: null,
      metodo_pago: null,
      updated_at: new Date().toISOString()
    }).eq("id", id).select("id,estado").single();
    if (error) throw error;
    return data;
  }

  async function summary() {
    const [membersResult, activeSeasonResult] = await Promise.all([
      db().from("socios").select("id", { count: "exact", head: true }).eq("estado", "activo").or("es_registro_prueba.is.false,es_registro_prueba.is.null"),
      db().from("temporadas").select("id,nombre,activa").eq("activa", true).limit(1).maybeSingle()
    ]);
    if (membersResult.error) throw membersResult.error;
    if (activeSeasonResult.error) throw activeSeasonResult.error;
    return { activeMembers: membersResult.count || 0, activeSeason: activeSeasonResult.data || null };
  }

  async function syncSeason(seasonId = null) {
    const { data, error } = await db().rpc("commit344_sync_cuotas_temporada", { p_temporada_id: seasonId || null });
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  async function markAllPaid(seasonId, method = "Regularización inicial") {
    const { data, error } = await db().rpc("commit344_mark_all_paid", { p_temporada_id: seasonId, p_metodo: method });
    if (error) throw error;
    return Number(data || 0);
  }

  return { list, options, summary, syncSeason, markAllPaid, markPaid, save, annul, reactivate };
})();
