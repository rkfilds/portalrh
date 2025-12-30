const seed = window.__seedData || {};
const STORE_KEY = "lt_rh_areas_v1";
const VAGAS_STORE_KEY = "lt_rh_vagas_v1";
const EMPTY_TEXT = "-";

const state = {
  areas: [],
  filters: { q: "", status: "all" }
};

function setText(root, role, value, fallback = EMPTY_TEXT){
  if(!root) return;
  const el = root.querySelector(`[data-role="${role}"]`);
  if(!el) return;
  el.textContent = value ?? fallback;
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    if(!data || !Array.isArray(data.areas)) return false;
    state.areas = data.areas;
    return true;
  }catch{
    return false;
  }
}

function saveState(){
  localStorage.setItem(STORE_KEY, JSON.stringify({
    areas: state.areas
  }));
}

function seedIfEmpty(){
  if(state.areas.length) return;
  const list = Array.isArray(seed.areas) ? seed.areas : [];
  state.areas = list;
  saveState();
}

function loadVagas(){
  try{
    const raw = localStorage.getItem(VAGAS_STORE_KEY);
    if(!raw) return Array.isArray(seed.vagas) ? seed.vagas : [];
    const data = JSON.parse(raw);
    if(data && Array.isArray(data.vagas)) return data.vagas;
    return Array.isArray(seed.vagas) ? seed.vagas : [];
  }catch{
    return Array.isArray(seed.vagas) ? seed.vagas : [];
  }
}

function buildStatusBadge(status){
  const map = {
    ativo: { text: "Ativo", cls: "success" },
    inativo: { text: "Inativo", cls: "secondary" }
  };
  const meta = map[status] || { text: status || "-", cls: "secondary" };
  const span = document.createElement("span");
  span.className = `badge text-bg-${meta.cls} rounded-pill`;
  span.textContent = meta.text;
  return span;
}

function formatVagaStatus(status){
  const map = {
    aberta: "Aberta",
    pausada: "Pausada",
    fechada: "Fechada",
    rascunho: "Rascunho",
    triagem: "Em triagem",
    entrevistas: "Em entrevistas",
    oferta: "Em oferta",
    congelada: "Congelada"
  };
  return map[status] || status || EMPTY_TEXT;
}

function buildVagaStatusBadge(status){
  const map = {
    aberta: "success",
    pausada: "warning",
    fechada: "secondary",
    rascunho: "secondary",
    triagem: "info",
    entrevistas: "info",
    oferta: "success",
    congelada: "warning"
  };
  const span = document.createElement("span");
  span.className = `badge text-bg-${map[status] || "primary"} rounded-pill`;
  span.textContent = formatVagaStatus(status);
  return span;
}

function formatLocal(vaga){
  const parts = [vaga?.cidade, vaga?.uf].filter(Boolean);
  return parts.length ? parts.join(" - ") : EMPTY_TEXT;
}

function formatDate(iso){
  if(!iso) return EMPTY_TEXT;
  const d = new Date(iso);
  if(Number.isNaN(d.getTime())) return EMPTY_TEXT;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getAreaVagas(area){
  const key = normalizeText(area?.nome || "");
  const vagas = loadVagas();
  return vagas.filter(v => normalizeText(v.area) === key);
}

function getAreaOpenCount(area){
  return getAreaVagas(area).filter(v => v.status === "aberta").length;
}

function updateKpis(){
  const total = state.areas.length;
  const ativos = state.areas.filter(a => a.status === "ativo").length;
  const vagas = loadVagas();
  const openVagas = vagas.filter(v => v.status === "aberta").length;

  $("#kpiAreaTotal").textContent = total;
  $("#kpiAreaActive").textContent = ativos;
  $("#kpiAreaOpenRoles").textContent = openVagas;
  $("#kpiAreaTotalRoles").textContent = vagas.length;
}

function getFiltered(){
  const q = normalizeText(state.filters.q || "");
  const st = state.filters.status;

  return state.areas.filter(a => {
    if(st !== "all" && (a.status || "") !== st) return false;
    if(!q) return true;
    const blob = normalizeText([a.nome, a.codigo, a.descricao].join(" "));
    return blob.includes(q);
  });
}

function renderTable(){
  const tbody = $("#areaTbody");
  if(!tbody) return;
  tbody.replaceChildren();

  const rows = getFiltered();
  $("#areaCount").textContent = rows.length;
  $("#areaHint").textContent = rows.length ? `${rows.length} areas encontradas.` : "Nenhuma area encontrada.";

  if(!rows.length){
    const empty = cloneTemplate("tpl-area-empty-row");
    if(empty) tbody.appendChild(empty);
    return;
  }

  rows.forEach(a => {
    const tr = cloneTemplate("tpl-area-row");
    if(!tr) return;
    setText(tr, "area-name", a.nome || EMPTY_TEXT);
    setText(tr, "area-code", a.codigo || EMPTY_TEXT);
    setText(tr, "area-desc", a.descricao || EMPTY_TEXT);
    const statusHost = tr.querySelector('[data-role="area-status-host"]');
    if(statusHost) statusHost.replaceChildren(buildStatusBadge(a.status));

    const totalVagas = getAreaVagas(a).length;
    const abertas = getAreaOpenCount(a);
    setText(tr, "area-vagas", `${abertas}/${totalVagas}`);

    tr.querySelectorAll("button[data-act]").forEach(btn => {
      btn.dataset.id = a.id;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const act = btn.dataset.act;
        if(act === "detail") openAreaDetail(a.id);
        if(act === "edit") openAreaModal("edit", a.id);
        if(act === "del") deleteArea(a.id);
      });
    });

    tbody.appendChild(tr);
  });
}

function findArea(id){
  return state.areas.find(a => a.id === id) || null;
}

function openAreaModal(mode, id){
  const modal = bootstrap.Modal.getOrCreateInstance($("#modalArea"));
  const isEdit = mode === "edit";
  $("#modalAreaTitle").textContent = isEdit ? "Editar area" : "Nova area";

  if(isEdit){
    const a = findArea(id);
    if(!a) return;
    $("#areaId").value = a.id || "";
    $("#areaCodigo").value = a.codigo || "";
    $("#areaNome").value = a.nome || "";
    $("#areaStatus").value = a.status || "ativo";
    $("#areaDescricao").value = a.descricao || "";
  }else{
    $("#areaId").value = "";
    $("#areaCodigo").value = "";
    $("#areaNome").value = "";
    $("#areaStatus").value = "ativo";
    $("#areaDescricao").value = "";
  }

  modal.show();
}

function saveAreaFromModal(){
  const id = $("#areaId").value || null;
  const codigo = ($("#areaCodigo").value || "").trim();
  const nome = ($("#areaNome").value || "").trim();
  const status = ($("#areaStatus").value || "ativo").trim();
  const descricao = ($("#areaDescricao").value || "").trim();

  if(!codigo || !nome){
    toast("Informe codigo e nome da area.");
    return;
  }

  const now = new Date().toISOString();

  if(id){
    const a = findArea(id);
    if(!a) return;
    a.codigo = codigo;
    a.nome = nome;
    a.status = status;
    a.descricao = descricao;
    a.updatedAt = now;
    toast("Area atualizada.");
  }else{
    const a = {
      id: uid(),
      codigo,
      nome,
      status,
      descricao,
      createdAt: now,
      updatedAt: now
    };
    state.areas.unshift(a);
    toast("Area criada.");
  }

  saveState();
  updateKpis();
  renderTable();
  bootstrap.Modal.getOrCreateInstance($("#modalArea")).hide();
}

function deleteArea(id){
  const a = findArea(id);
  if(!a) return;
  const ok = confirm(`Excluir a area \"${a.nome}\"?`);
  if(!ok) return;
  state.areas = state.areas.filter(x => x.id !== id);
  saveState();
  updateKpis();
  renderTable();
  toast("Area removida.");
}

function goToVagaDetail(vagaId){
  if(!vagaId) return;
  const url = new URL("/Vagas", window.location.origin);
  url.searchParams.set("vagaId", vagaId);
  url.searchParams.set("open", "detail");
  window.location.href = url.toString();
}

function openAreaDetail(id){
  const a = findArea(id);
  if(!a) return;
  const root = $("#modalAreaDetalhes");
  if(!root) return;
  const modal = bootstrap.Modal.getOrCreateInstance(root);

  setText(root, "area-name", a.nome || EMPTY_TEXT);
  setText(root, "area-code", a.codigo || EMPTY_TEXT);
  setText(root, "area-desc", a.descricao || EMPTY_TEXT);

  const statusHost = root.querySelector('[data-role="area-status-host"]');
  if(statusHost) statusHost.replaceChildren(buildStatusBadge(a.status));

  const vagas = getAreaVagas(a);
  $("#areaVagasCount").textContent = vagas.length;

  const tbody = $("#areaVagasTbody");
  tbody.replaceChildren();
  if(!vagas.length){
    const empty = cloneTemplate("tpl-area-vaga-empty-row");
    if(empty) tbody.appendChild(empty);
    modal.show();
    return;
  }

  vagas
    .slice()
    .sort((x,y)=> (x.titulo||"").localeCompare(y.titulo||""))
    .forEach(v => {
      const tr = cloneTemplate("tpl-area-vaga-row");
      if(!tr) return;
      setText(tr, "vaga-code", v.codigo || EMPTY_TEXT);
      setText(tr, "vaga-title", v.titulo || EMPTY_TEXT);
      setText(tr, "vaga-modalidade", v.modalidade || EMPTY_TEXT);
      setText(tr, "vaga-local", formatLocal(v));
      setText(tr, "vaga-updated", formatDate(v.updatedAt));
      const statusEl = tr.querySelector('[data-role="vaga-status-host"]');
      if(statusEl) statusEl.replaceChildren(buildVagaStatusBadge(v.status));
      const btn = tr.querySelector('[data-act="open-vaga"]');
      if(btn) btn.addEventListener("click", () => goToVagaDetail(v.id));
      tbody.appendChild(tr);
    });

  modal.show();
}

function exportCsv(){
  const headers = ["Codigo", "Area", "Status", "Descricao"];
  const rows = state.areas.map(a => [
    a.codigo, a.nome, a.status, a.descricao
  ]);
  const csv = [
    headers.map(h => `"${String(h).replaceAll('"','""')}"`).join(";"),
    ...rows.map(r => r.map(c => `"${String(c ?? "").replaceAll('"','""')}"`).join(";"))
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "areas_liotecnica.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function wireFilters(){
  const apply = () => {
    state.filters.q = ($("#aSearch").value || "").trim();
    state.filters.status = $("#aStatus").value || "all";
    renderTable();
  };

  $("#aSearch").addEventListener("input", apply);
  $("#aStatus").addEventListener("change", apply);

  $("#globalSearchArea").addEventListener("input", () => {
    $("#aSearch").value = $("#globalSearchArea").value;
    apply();
  });
}

function wireButtons(){
  $("#btnNewArea").addEventListener("click", () => openAreaModal("new"));
  $("#btnSaveArea").addEventListener("click", saveAreaFromModal);
  $("#btnSeedReset").addEventListener("click", () => {
    const ok = confirm("Restaurar dados de exemplo? Isso substitui suas areas atuais.");
    if(!ok) return;
    state.areas = [];
    saveState();
    seedIfEmpty();
    updateKpis();
    renderTable();
    toast("Demo restaurada.");
  });
  $("#btnExportArea").addEventListener("click", exportCsv);
}

function wireClock(){
  const label = $("#nowLabel");
  if(!label) return;
  const tick = () => {
    const d = new Date();
    label.textContent = d.toLocaleString("pt-BR", {
      weekday: "short", day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  };
  tick();
  setInterval(tick, 1000 * 15);
}

(function init(){
  wireClock();
  const has = loadState();
  if(!has) seedIfEmpty();
  else seedIfEmpty();

  updateKpis();
  renderTable();

  wireFilters();
  wireButtons();
})();
