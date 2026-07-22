window.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const $ = id => document.getElementById(id);
  const state = { rows: [], options: { members: [], seasons: [], categories: [] }, payingId: null, editingId: null };
  const money = value => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value || 0));
  const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  const labelState = value => ({ pagada: "Pagada", pendiente: "Pendiente", anulada: "Anulada" }[value] || value || "Pendiente");
  const today = () => new Date().toISOString().slice(0, 10);

  function notify(message, type = "success") {
    if (window.FrenteNotify?.show) return window.FrenteNotify.show(message, type);
    alert(message);
  }

  function setConnection(text, kind = "sync") {
    const el = $("feesConnection");
    if (!el) return;
    el.className = `members-connection ${kind}`;
    el.innerHTML = `<strong>${esc(text)}</strong>`;
  }

  function filteredRows() {
    const term = ($("feesSearch")?.value || "").trim().toLowerCase();
    const status = $("feesStatus")?.value || "";
    const season = $("feesSeason")?.value || "";
    return state.rows.filter(row => {
      const haystack = `${row.numeroSocio} ${row.socioNombre} ${row.socioCategoria} ${row.temporada} ${row.referencia || ""}`.toLowerCase();
      return (!term || haystack.includes(term)) && (!status || row.estado === status) && (!season || row.temporada === season);
    });
  }

  function renderStats() {
    const paid = state.rows.filter(x => x.estado === "pagada");
    $("feesTotal").textContent = state.rows.length;
    $("feesPaid").textContent = paid.length;
    $("feesPending").textContent = state.rows.filter(x => x.estado === "pendiente").length;
    $("feesIncome").textContent = money(paid.reduce((sum, x) => sum + x.importe, 0));
  }

  function renderSeasons() {
    const select = $("feesSeason");
    if (!select) return;
    const current = select.value;
    const seasons = [...new Set(state.rows.map(x => x.temporada).filter(Boolean))].sort().reverse();
    select.innerHTML = '<option value="">Todas las temporadas</option>' + seasons.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");
    if (seasons.includes(current)) select.value = current;
  }

  function renderTable() {
    const body = $("feesTableBody");
    if (!body) return;
    const rows = filteredRows();
    body.innerHTML = rows.length ? rows.map(row => `
      <tr>
        <td>${esc(row.numeroSocio || "-")}</td>
        <td><strong>${esc(row.socioNombre)}</strong><small style="display:block">${esc(row.socioCategoria)}</small></td>
        <td>${esc(row.temporada)}</td>
        <td>${esc(money(row.importe))}</td>
        <td><span class="status-pill ${row.estado === "pagada" ? "fee-ok" : "fee-pending"}">${esc(labelState(row.estado))}</span></td>
        <td>${esc(row.fechaPago || "-")}</td>
        <td>${esc(row.metodoPago || "-")}</td>
        <td class="members-actions-cell">
          ${row.estado === "pendiente" ? `<button data-pay="${esc(row.id)}">Cobrar</button>` : ""}
          <button data-edit="${esc(row.id)}">Editar</button>
          ${row.estado !== "anulada" ? `<button class="danger" data-annul="${esc(row.id)}">Anular</button>` : `<button data-reactivate="${esc(row.id)}">Reactivar</button>`}
        </td>
      </tr>`).join("") : '<tr><td colspan="8" class="members-empty">No hay cuotas visibles en Supabase.</td></tr>';

    body.querySelectorAll("[data-pay]").forEach(x => x.addEventListener("click", () => openPayment(x.dataset.pay)));
    body.querySelectorAll("[data-edit]").forEach(x => x.addEventListener("click", () => openFeeForm(x.dataset.edit)));
    body.querySelectorAll("[data-annul]").forEach(x => x.addEventListener("click", () => annulFee(x.dataset.annul)));
    body.querySelectorAll("[data-reactivate]").forEach(x => x.addEventListener("click", () => reactivateFee(x.dataset.reactivate)));
  }

  function renderAll() { renderStats(); renderSeasons(); renderTable(); }

  function openPayment(id) {
    const row = state.rows.find(x => x.id === id);
    if (!row) return;
    state.payingId = id;
    $("paymentFeeId").value = id;
    $("paymentMember").textContent = `${row.numeroSocio} · ${row.socioNombre}`;
    $("paymentAmount").textContent = money(row.importe);
    $("paymentDate").value = today();
    $("paymentMethod").value = "Efectivo";
    $("paymentReference").value = row.referencia || "";
    $("paymentNotes").value = row.observaciones || "";
    $("paymentModal").classList.add("open");
  }

  function closePayment() {
    state.payingId = null;
    $("paymentForm")?.reset();
    $("paymentModal")?.classList.remove("open");
  }

  async function submitPayment(event) {
    event.preventDefault();
    const id = state.payingId || $("paymentFeeId").value;
    if (!id) return;
    const submit = $("paymentSubmit");
    submit.disabled = true;
    submit.textContent = "Guardando…";
    try {
      await window.FrenteFeesService.markPaid(id, {
        fechaPago: $("paymentDate").value,
        metodoPago: $("paymentMethod").value,
        referencia: $("paymentReference").value.trim(),
        observaciones: $("paymentNotes").value.trim()
      });
      closePayment();
      await load();
      notify("Pago registrado correctamente.");
    } catch (error) {
      console.error(error);
      notify(`No se pudo registrar el pago: ${error?.message || error}`, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Guardar pago";
    }
  }

  function categoryOptionsForSeason(seasonId) {
    return state.options.categories.filter(x => x.temporada_id === seasonId && x.activa !== false);
  }

  function fillFeeFormOptions(selected = {}) {
    $("feeMember").innerHTML = state.options.members.map(m => `<option value="${esc(m.id)}">${esc(String(m.numero_socio).padStart(4, "0"))} · ${esc(`${m.nombre || ""} ${m.apellidos || ""}`.trim())}</option>`).join("");
    $("feeSeason").innerHTML = state.options.seasons.map(s => `<option value="${esc(s.id)}">${esc(s.nombre)}${s.activa ? " · Activa" : ""}</option>`).join("");
    if (selected.socioId) $("feeMember").value = selected.socioId;
    if (selected.temporadaId) $("feeSeason").value = selected.temporadaId;
    if (!selected.temporadaId) {
      const active = state.options.seasons.find(s => s.activa);
      if (active) $("feeSeason").value = active.id;
    }
    refreshCategoryOptions(selected.categoriaCuotaId);
  }

  function refreshCategoryOptions(selectedId = "") {
    const seasonId = $("feeSeason").value;
    const categories = categoryOptionsForSeason(seasonId);
    $("feeCategory").innerHTML = '<option value="">Sin categoría vinculada</option>' + categories.map(c => `<option value="${esc(c.id)}" data-amount="${Number(c.exenta ? 0 : c.importe || 0)}">${esc(c.nombre)} · ${esc(money(c.exenta ? 0 : c.importe))}</option>`).join("");
    if (selectedId && categories.some(c => c.id === selectedId)) $("feeCategory").value = selectedId;
  }

  function openFeeForm(id = "") {
    state.editingId = id || null;
    const row = id ? state.rows.find(x => x.id === id) : null;
    $("feeForm").reset();
    $("feeId").value = id || "";
    $("feeModalTitle").textContent = id ? "Editar cuota" : "Nueva cuota manual";
    fillFeeFormOptions(row ? {
      socioId: row.socio_id,
      temporadaId: row.temporada_id,
      categoriaCuotaId: row.categoria_cuota_id
    } : {});
    if (row) {
      $("feeAmount").value = row.importe;
      $("feeState").value = row.estado;
      $("feeDate").value = row.fechaPago || "";
      $("feeMethod").value = row.metodoPago || "";
      $("feeReference").value = row.referencia || "";
      $("feeNotes").value = row.observaciones || "";
    } else {
      $("feeState").value = "pendiente";
      $("feeAmount").value = "";
    }
    $("feeModal").classList.add("open");
  }

  function closeFeeForm() {
    state.editingId = null;
    $("feeModal")?.classList.remove("open");
    $("feeForm")?.reset();
  }

  async function submitFee(event) {
    event.preventDefault();
    const submit = $("feeSubmit");
    submit.disabled = true;
    submit.textContent = "Guardando…";
    try {
      const wasEditing = Boolean($("feeId").value);
      await window.FrenteFeesService.save({
        id: $("feeId").value || null,
        socioId: $("feeMember").value,
        temporadaId: $("feeSeason").value,
        categoriaCuotaId: $("feeCategory").value || null,
        importe: $("feeAmount").value,
        estado: $("feeState").value,
        fechaPago: $("feeDate").value,
        metodoPago: $("feeMethod").value,
        referencia: $("feeReference").value.trim(),
        observaciones: $("feeNotes").value.trim()
      });
      closeFeeForm();
      await load();
      notify(wasEditing ? "Cuota actualizada." : "Cuota creada.");
    } catch (error) {
      console.error(error);
      const msg = String(error?.message || error);
      notify(msg.includes("duplicate") || msg.includes("unique") ? "Ese socio ya tiene una cuota para esa temporada." : `No se pudo guardar: ${msg}`, "error");
    } finally {
      submit.disabled = false;
      submit.textContent = "Guardar cuota";
    }
  }

  async function annulFee(id) {
    if (!confirm("¿Anular esta cuota? No se eliminará de Supabase.")) return;
    try { await window.FrenteFeesService.annul(id); await load(); notify("Cuota anulada."); }
    catch (error) { notify(`No se pudo anular: ${error?.message || error}`, "error"); }
  }

  async function reactivateFee(id) {
    if (!confirm("¿Reactivar esta cuota como pendiente?")) return;
    try { await window.FrenteFeesService.reactivate(id); await load(); notify("Cuota reactivada."); }
    catch (error) { notify(`No se pudo reactivar: ${error?.message || error}`, "error"); }
  }

  function exportCSV() {
    const rows = [["numero_socio", "socio", "categoria", "temporada", "importe", "estado", "fecha_pago", "metodo", "referencia"]];
    filteredRows().forEach(x => rows.push([x.numeroSocio, x.socioNombre, x.socioCategoria, x.temporada, x.importe, x.estado, x.fechaPago || "", x.metodoPago || "", x.referencia || ""]));
    const csv = rows.map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "cuotas-supabase.csv"; a.click(); URL.revokeObjectURL(url);
  }

  async function load() {
    setConnection("Conectando…", "sync");
    const body = $("feesTableBody");
    if (body) body.innerHTML = '<tr><td colspan="8" class="members-empty">Cargando cuotas…</td></tr>';
    try {
      await window.FrenteDatabase.init();
      [state.rows, state.options] = await Promise.all([window.FrenteFeesService.list(), window.FrenteFeesService.options()]);
      renderAll();
      setConnection(`Conectado a Supabase · ${state.rows.length} cuotas`, "online");
    } catch (error) {
      console.error("Error al leer cuotas desde Supabase:", error);
      state.rows = [];
      renderAll();
      setConnection("Error al leer cuotas", "offline");
      if (body) body.innerHTML = `<tr><td colspan="8" class="members-empty"><strong>No se pudieron leer las cuotas.</strong><br>${esc(error?.message || error)}</td></tr>`;
    }
  }

  ["feesSearch", "feesStatus", "feesSeason"].forEach(id => $(id)?.addEventListener(id === "feesSearch" ? "input" : "change", renderTable));
  $("retryFees")?.addEventListener("click", load);
  $("exportFees")?.addEventListener("click", exportCSV);
  $("newFeeButton")?.addEventListener("click", () => openFeeForm());
  $("resetFees")?.addEventListener("click", () => notify("Este módulo no utiliza datos locales.", "info"));
  $("paymentModalClose")?.addEventListener("click", closePayment);
  $("paymentCancel")?.addEventListener("click", closePayment);
  $("paymentForm")?.addEventListener("submit", submitPayment);
  $("paymentModal")?.addEventListener("click", e => { if (e.target === $("paymentModal")) closePayment(); });
  $("feeModalClose")?.addEventListener("click", closeFeeForm);
  $("feeCancel")?.addEventListener("click", closeFeeForm);
  $("feeForm")?.addEventListener("submit", submitFee);
  $("feeModal")?.addEventListener("click", e => { if (e.target === $("feeModal")) closeFeeForm(); });
  $("feeSeason")?.addEventListener("change", () => refreshCategoryOptions());
  $("feeCategory")?.addEventListener("change", () => {
    const option = $("feeCategory").selectedOptions[0];
    if (option?.dataset.amount !== undefined && option.value) $("feeAmount").value = option.dataset.amount;
  });
  $("feeState")?.addEventListener("change", () => {
    const paid = $("feeState").value === "pagada";
    if (paid && !$("feeDate").value) $("feeDate").value = today();
  });

  await load();
});
