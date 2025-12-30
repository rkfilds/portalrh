const seed = window.__seedData || {};
const STORE_KEY = "lt_rh_gestores_v1";
const VAGAS_STORE_KEY = "lt_rh_vagas_v1";
const AREAS_STORE_KEY = "lt_rh_areas_v1";
const UNIDADES_STORE_KEY = "lt_rh_unidades_v1";
const CARGOS_STORE_KEY = "lt_rh_cargos_v1";
const EMPTY_TEXT = "-";

const state = {
  gestores: [],
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
    if(!data || !Array.isArray(data.gestores)) return false;
    state.gestores = data.gestores;
    return true;
  }catch{
    return false;
  }
}

function saveState(){
  localStorage.setItem(STORE_KEY, JSON.stringify({
    gestores: state.gestores
  }));
}

function seedIfEmpty(){
  if(state.gestores.length) return;
  const list = Array.isArray(seed.gestores) ? seed.gestores : [];
  state.gestores = list;
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

function loadAreas(){
  try{
    const raw = localStorage.getItem(AREAS_STORE_KEY);
    if(!raw) return Array.isArray(seed.areas) ? seed.areas : [];
    const data = JSON.parse(raw);
    if(data && Array.isArray(data.areas)) return data.areas;
    return Array.isArray(seed.areas) ? seed.areas : [];
  }catch{
    return Array.isArray(seed.areas) ? seed.areas : [];
  }
}

function loadUnidades(){
  try{
    const raw = localStorage.getItem(UNIDADES_STORE_KEY);
    if(!raw) return Array.isArray(seed.unidades) ? seed.unidades : [];
    const data = JSON.parse(raw);
    if(data && Array.isArray(data.unidades)) return data.unidades;
    return Array.isArray(seed.unidades) ? seed.unidades : [];
  }catch{
    return Array.isArray(seed.unidades) ? seed.unidades : [];
  }
}

function loadCargos(){
  try{
    const raw = localStorage.getItem(CARGOS_STORE_KEY);
    if(!raw) return Array.isArray(seed.cargos) ? seed.cargos : [];
    const data = JSON.parse(raw);
    if(data && Array.isArray(data.cargos)) return data.cargos;
    return Array.isArray(seed.cargos) ? seed.cargos : [];
  }catch{
    return Array.isArray(seed.cargos) ? seed.cargos : [];
  }
}

function getAreaOptions(){
  const areas = loadAreas();
  const set = new Set(areas.map(a => a.nome).filter(Boolean));
  return Array.from(set).sort((a,b)=>a.localeCompare(b, "pt-BR"));
}

function getUnidadeOptions(){
  const unidades = loadUnidades();
  const set = new Set(unidades.map(u => u.nome).filter(Boolean));
  return Array.from(set).sort((a,b)=>a.localeCompare(b, "pt-BR"));
}

function getCargoOptions(){
  const cargos = loadCargos();
  const set = new Set(cargos.map(c => c.nome).filter(Boolean));
  return Array.from(set).sort((a,b)=>a.localeCompare(b, "pt-BR"));
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

function getGestorVagas(gestor){
  const key = normalizeText(gestor?.area || "");
  const vagas = loadVagas();
  return vagas.filter(v => normalizeText(v.area) === key);
}

function getGestorOpenCount(gestor){
  return getGestorVagas(gestor).filter(v => v.status === "aberta").length;
}

function updateKpis(){
  const total = state.gestores.length;
  const ativos = state.gestores.filter(g => g.status === "ativo").length;
  const headcount = state.gestores.reduce((acc, g) => acc + (parseInt(g.headcount, 10) || 0), 0);
  const openVagas = loadVagas().filter(v => v.status === "aberta").length;

  $("#kpiGestorTotal").textContent = total;
  $("#kpiGestorActive").textContent = ativos;
  $("#kpiGestorOpenRoles").textContent = openVagas;
  $("#kpiGestorHeadcount").textContent = headcount;
}

function getFiltered(){
  const q = normalizeText(state.filters.q || "");
  const st = state.filters.status;

  return state.gestores.filter(g => {
    if(st !== "all" && (g.status || "") !== st) return false;
    if(!q) return true;
    const blob = normalizeText([g.nome, g.cargo, g.area, g.email, g.unidade].join(" "));
    return blob.includes(q);
  });
}

function renderTable(){
  const tbody = $("#gestorTbody");
  if(!tbody) return;
  tbody.replaceChildren();

  const rows = getFiltered();
  $("#gestorCount").textContent = rows.length;
  $("#gestorHint").textContent = rows.length ? `${rows.length} gestores encontrados.` : "Nenhum gestor encontrado.";

  if(!rows.length){
    const empty = cloneTemplate("tpl-gestor-empty-row");
    if(empty) tbody.appendChild(empty);
    return;
  }

  rows.forEach(g => {
    const tr = cloneTemplate("tpl-gestor-row");
    if(!tr) return;
    setText(tr, "gestor-nome", g.nome || EMPTY_TEXT);
    setText(tr, "gestor-cargo", g.cargo || EMPTY_TEXT);
    setText(tr, "gestor-area", g.area || EMPTY_TEXT);
    setText(tr, "gestor-email", g.email || EMPTY_TEXT);
    setText(tr, "gestor-unidade", g.unidade || EMPTY_TEXT);
    setText(tr, "gestor-headcount", g.headcount != null ? String(g.headcount) : "0");

    const statusHost = tr.querySelector('[data-role="gestor-status-host"]');
    if(statusHost) statusHost.replaceChildren(buildStatusBadge(g.status));

    const totalVagas = getGestorVagas(g).length;
    const abertas = getGestorOpenCount(g);
    setText(tr, "gestor-vagas", `${abertas}/${totalVagas}`);

    tr.querySelectorAll("button[data-act]").forEach(btn => {
      btn.dataset.id = g.id;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const act = btn.dataset.act;
        if(act === "detail") openGestorDetail(g.id);
        if(act === "edit") openGestorModal("edit", g.id);
        if(act === "del") deleteGestor(g.id);
      });
    });

    tbody.appendChild(tr);
  });
}

function findGestor(id){
  return state.gestores.find(g => g.id === id) || null;
}

function fillAreaSelect(selected){
  const select = $("#gestorArea");
  if(!select) return;
  select.replaceChildren();
  select.appendChild(buildOption("", "Selecionar area"));
  const list = getAreaOptions();
  list.forEach(a => select.appendChild(buildOption(a, a, a === selected)));
  if(selected && !list.includes(selected)){
    select.appendChild(buildOption(selected, selected, true));
  }
  if(selected){
    select.value = selected;
  }
}

function fillUnidadeSelect(selected){
  const select = $("#gestorUnidade");
  if(!select) return;
  select.replaceChildren();
  select.appendChild(buildOption("", "Selecionar unidade"));
  const list = getUnidadeOptions();
  list.forEach(u => select.appendChild(buildOption(u, u, u === selected)));
  if(selected && !list.includes(selected)){
    select.appendChild(buildOption(selected, selected, true));
  }
  if(selected){
    select.value = selected;
  }
}

function fillCargoSelect(selected){
  const select = $("#gestorCargo");
  if(!select) return;
  select.replaceChildren();
  select.appendChild(buildOption("", "Selecionar cargo"));
  const list = getCargoOptions();
  list.forEach(c => select.appendChild(buildOption(c, c, c === selected)));
  if(selected && !list.includes(selected)){
    select.appendChild(buildOption(selected, selected, true));
  }
  if(selected){
    select.value = selected;
  }
}

function openGestorModal(mode, id){
  const modal = bootstrap.Modal.getOrCreateInstance($("#modalGestor"));
  const isEdit = mode === "edit";
  $("#modalGestorTitle").textContent = isEdit ? "Editar gestor" : "Novo gestor";

  if(isEdit){
    const g = findGestor(id);
    if(!g) return;
    $("#gestorId").value = g.id || "";
    $("#gestorNome").value = g.nome || "";
    fillCargoSelect(g.cargo || "");
    fillAreaSelect(g.area || "");
    fillUnidadeSelect(g.unidade || "");
    $("#gestorStatus").value = g.status || "ativo";
    $("#gestorHeadcount").value = g.headcount != null ? String(g.headcount) : "0";
    $("#gestorEmail").value = g.email || "";
    $("#gestorTelefone").value = g.telefone || "";
    $("#gestorObs").value = g.observacao || "";
  }else{
    $("#gestorId").value = "";
    $("#gestorNome").value = "";
    fillCargoSelect("");
    fillAreaSelect("");
    fillUnidadeSelect("");
    $("#gestorStatus").value = "ativo";
    $("#gestorHeadcount").value = "0";
    $("#gestorEmail").value = "";
    $("#gestorTelefone").value = "";
    $("#gestorObs").value = "";
  }

  modal.show();
}

function saveGestorFromModal(){
  const id = $("#gestorId").value || null;
  const nome = ($("#gestorNome").value || "").trim();
  const cargo = ($("#gestorCargo").value || "").trim();
  const area = ($("#gestorArea").value || "").trim();
  const status = ($("#gestorStatus").value || "ativo").trim();
  const headcount = parseInt($("#gestorHeadcount").value, 10) || 0;
  const email = ($("#gestorEmail").value || "").trim();
  const telefone = ($("#gestorTelefone").value || "").trim();
  const unidade = ($("#gestorUnidade").value || "").trim();
  const observacao = ($("#gestorObs").value || "").trim();

  if(!nome || !cargo || !area){
    toast("Informe nome, cargo e area do gestor.");
    return;
  }

  const now = new Date().toISOString();

  if(id){
    const g = findGestor(id);
    if(!g) return;
    g.nome = nome;
    g.cargo = cargo;
    g.area = area;
    g.status = status;
    g.headcount = headcount;
    g.email = email;
    g.telefone = telefone;
    g.unidade = unidade;
    g.observacao = observacao;
    g.updatedAt = now;
    toast("Gestor atualizado.");
  }else{
    const g = {
      id: uid(),
      nome,
      cargo,
      area,
      status,
      headcount,
      email,
      telefone,
      unidade,
      observacao,
      createdAt: now,
      updatedAt: now
    };
    state.gestores.unshift(g);
    toast("Gestor criado.");
  }

  saveState();
  updateKpis();
  renderTable();
  bootstrap.Modal.getOrCreateInstance($("#modalGestor")).hide();
}

function deleteGestor(id){
  const g = findGestor(id);
  if(!g) return;
  const ok = confirm(`Excluir o gestor \"${g.nome}\"?`);
  if(!ok) return;
  state.gestores = state.gestores.filter(x => x.id !== id);
  saveState();
  updateKpis();
  renderTable();
  toast("Gestor removido.");
}

function goToVagaDetail(vagaId){
  if(!vagaId) return;
  const url = new URL("/Vagas", window.location.origin);
  url.searchParams.set("vagaId", vagaId);
  url.searchParams.set("open", "detail");
  window.location.href = url.toString();
}

function openGestorDetail(id){
  const g = findGestor(id);
  if(!g) return;
  const root = $("#modalGestorDetalhes");
  if(!root) return;
  const modal = bootstrap.Modal.getOrCreateInstance(root);

  setText(root, "gestor-nome", g.nome || EMPTY_TEXT);
  setText(root, "gestor-cargo", g.cargo || EMPTY_TEXT);
  setText(root, "gestor-area", g.area || EMPTY_TEXT);
  setText(root, "gestor-email", g.email || EMPTY_TEXT);
  setText(root, "gestor-unidade", g.unidade || EMPTY_TEXT);
  setText(root, "gestor-telefone", g.telefone || EMPTY_TEXT);
  setText(root, "gestor-obs", g.observacao || EMPTY_TEXT);
  setText(root, "gestor-headcount", g.headcount != null ? String(g.headcount) : "0");

  const statusHost = root.querySelector('[data-role="gestor-status-host"]');
  if(statusHost) statusHost.replaceChildren(buildStatusBadge(g.status));

  const vagas = getGestorVagas(g);
  $("#gestorVagasCount").textContent = vagas.length;

  const tbody = $("#gestorVagasTbody");
  tbody.replaceChildren();
  if(!vagas.length){
    const empty = cloneTemplate("tpl-gestor-vaga-empty-row");
    if(empty) tbody.appendChild(empty);
    modal.show();
    return;
  }

  vagas
    .slice()
    .sort((a,b)=> (a.titulo||"").localeCompare(b.titulo||""))
    .forEach(v => {
      const tr = cloneTemplate("tpl-gestor-vaga-row");
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
  const headers = ["Nome", "Cargo", "Area", "Email", "Telefone", "Unidade", "Headcount", "Status"];
  const rows = state.gestores.map(g => [
    g.nome, g.cargo, g.area, g.email, g.telefone, g.unidade, g.headcount, g.status
  ]);
  const csv = [
    headers.map(h => `"${String(h).replaceAll('"','""')}"`).join(";"),
    ...rows.map(r => r.map(c => `"${String(c ?? "").replaceAll('"','""')}"`).join(";"))
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gestores_liotecnica.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function wireFilters(){
  const apply = () => {
    state.filters.q = ($("#gSearch").value || "").trim();
    state.filters.status = $("#gStatus").value || "all";
    renderTable();
  };

  $("#gSearch").addEventListener("input", apply);
  $("#gStatus").addEventListener("change", apply);

  $("#globalSearchGestor").addEventListener("input", () => {
    $("#gSearch").value = $("#globalSearchGestor").value;
    apply();
  });
}

function wireButtons(){
  $("#btnNewGestor").addEventListener("click", () => openGestorModal("new"));
  $("#btnSaveGestor").addEventListener("click", saveGestorFromModal);
  $("#btnSeedReset").addEventListener("click", () => {
    const ok = confirm("Restaurar dados de exemplo? Isso substitui seus gestores atuais.");
    if(!ok) return;
    state.gestores = [];
    saveState();
    seedIfEmpty();
    updateKpis();
    renderTable();
    toast("Demo restaurada.");
  });
  $("#btnExportGestor").addEventListener("click", exportCsv);
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
