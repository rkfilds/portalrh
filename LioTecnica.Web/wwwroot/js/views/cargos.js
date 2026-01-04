const seed = window.__seedData || {};
const STORE_KEY = "lt_rh_cargos_v1";
const GESTORES_STORE_KEY = "lt_rh_gestores_v1";
const AREAS_STORE_KEY = "lt_rh_areas_v1";
const EMPTY_TEXT = "-";

const state = {
  cargos: [],
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
    if(!data || !Array.isArray(data.cargos)) return false;
    state.cargos = data.cargos;
    return true;
  }catch{
    return false;
  }
}

function saveState(){
  localStorage.setItem(STORE_KEY, JSON.stringify({
    cargos: state.cargos
  }));
}

function seedIfEmpty(){
  if(state.cargos.length) return;
  const list = Array.isArray(seed.cargos) ? seed.cargos : [];
  state.cargos = list;
  saveState();
}

function loadGestores(){
  try{
    const raw = localStorage.getItem(GESTORES_STORE_KEY);
    if(!raw) return Array.isArray(seed.gestores) ? seed.gestores : [];
    const data = JSON.parse(raw);
    if(data && Array.isArray(data.gestores)) return data.gestores;
    return Array.isArray(seed.gestores) ? seed.gestores : [];
  }catch{
    return Array.isArray(seed.gestores) ? seed.gestores : [];
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

function getAreaOptions(){
  const areas = loadAreas();
  const set = new Set(areas.map(a => a.nome).filter(Boolean));
  return Array.from(set).sort((a,b)=>a.localeCompare(b, "pt-BR"));
}

function getDefaultSenioridade(){
  const list = getEnumOptions("vagaSenioridade");
  const pref = list.find(x => (x.code || "").toString().toLowerCase() === "gerencia" || (x.code || "").toString().toLowerCase() === "gerente");
  return pref ? pref.code : (list[0]?.code || "");
}

function fillAreaSelect(selected){
  const select = $("#cargoArea");
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

function fillSenioridadeSelect(selected){
  const select = $("#cargoSenioridade");
  if(!select) return;
  select.replaceChildren();
  select.appendChild(buildOption("", "Selecionar senioridade"));
  const list = getEnumOptions("vagaSenioridade");
  const selectedKey = (selected || "").toString().toLowerCase();
  list.forEach(opt => {
    const isSelected = selectedKey && (opt.code || "").toString().toLowerCase() === selectedKey;
    select.appendChild(buildOption(opt.code, opt.text, isSelected));
  });
  if(selected && !list.some(x => (x.code || "").toString().toLowerCase() === selectedKey)){
    select.appendChild(buildOption(selected, selected, true));
  }
  if(selected){
    const match = list.find(x => (x.code || "").toString().toLowerCase() === selectedKey);
    select.value = match ? match.code : selected;
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

function getCargoGestores(cargo){
  const key = normalizeText(cargo?.nome || "");
  if(!key) return [];
  return loadGestores().filter(g => normalizeText(g.cargo) === key);
}

function updateKpis(){
  const total = state.cargos.length;
  const ativos = state.cargos.filter(c => c.status === "ativo").length;
  const gestores = loadGestores();
  const gestoresCount = gestores.filter(g => g.cargo).length;
  const headcount = gestores.reduce((acc, g) => acc + (parseInt(g.headcount, 10) || 0), 0);

  $("#kpiCargoTotal").textContent = total;
  $("#kpiCargoActive").textContent = ativos;
  $("#kpiCargoManagers").textContent = gestoresCount;
  $("#kpiCargoHeadcount").textContent = headcount;
}

function getFiltered(){
  const q = normalizeText(state.filters.q || "");
  const st = state.filters.status;

  return state.cargos.filter(c => {
    if(st !== "all" && (c.status || "") !== st) return false;
    if(!q) return true;
    const blob = normalizeText([c.nome, c.codigo, c.area, c.senioridade, c.tipo, c.descricao].join(" "));
    return blob.includes(q);
  });
}

function renderTable(){
  const tbody = $("#cargoTbody");
  if(!tbody) return;
  tbody.replaceChildren();

  const rows = getFiltered();
  $("#cargoCount").textContent = rows.length;
  $("#cargoHint").textContent = rows.length ? `${rows.length} cargos encontrados.` : "Nenhum cargo encontrado.";

  if(!rows.length){
    const empty = cloneTemplate("tpl-cargo-empty-row");
    if(empty) tbody.appendChild(empty);
    return;
  }

  rows.forEach(c => {
    const tr = cloneTemplate("tpl-cargo-row");
    if(!tr) return;
    setText(tr, "cargo-name", c.nome || EMPTY_TEXT);
    setText(tr, "cargo-code", c.codigo || EMPTY_TEXT);
    setText(tr, "cargo-area", c.area || EMPTY_TEXT);
    setText(tr, "cargo-senioridade", getEnumText("vagaSenioridade", c.senioridade, c.senioridade));
    setText(tr, "cargo-gestores", String(getCargoGestores(c).length));

    const statusHost = tr.querySelector('[data-role="cargo-status-host"]');
    if(statusHost) statusHost.replaceChildren(buildStatusBadge(c.status));

    tr.querySelectorAll("button[data-act]").forEach(btn => {
      btn.dataset.id = c.id;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const act = btn.dataset.act;
        if(act === "detail") openCargoDetail(c.id);
        if(act === "edit") openCargoModal("edit", c.id);
        if(act === "del") deleteCargo(c.id);
      });
    });

    tbody.appendChild(tr);
  });
}

function findCargo(id){
  return state.cargos.find(c => c.id === id) || null;
}

function openCargoModal(mode, id){
  const modal = bootstrap.Modal.getOrCreateInstance($("#modalCargo"));
  const isEdit = mode === "edit";
  $("#modalCargoTitle").textContent = isEdit ? "Editar cargo" : "Novo cargo";

  if(isEdit){
    const c = findCargo(id);
    if(!c) return;
    $("#cargoId").value = c.id || "";
    $("#cargoCodigo").value = c.codigo || "";
    $("#cargoNome").value = c.nome || "";
    $("#cargoStatus").value = c.status || "ativo";
    fillAreaSelect(c.area || "");
    fillSenioridadeSelect(c.senioridade || getDefaultSenioridade());
    $("#cargoTipo").value = c.tipo || "";
    $("#cargoDescricao").value = c.descricao || "";
  }else{
    $("#cargoId").value = "";
    $("#cargoCodigo").value = "";
    $("#cargoNome").value = "";
    $("#cargoStatus").value = "ativo";
    fillAreaSelect("");
    fillSenioridadeSelect(getDefaultSenioridade());
    $("#cargoTipo").value = "";
    $("#cargoDescricao").value = "";
  }

  modal.show();
}

function saveCargoFromModal(){
  const id = $("#cargoId").value || null;
  const codigo = ($("#cargoCodigo").value || "").trim();
  const nome = ($("#cargoNome").value || "").trim();
  const status = ($("#cargoStatus").value || "ativo").trim();
  const area = ($("#cargoArea").value || "").trim();
  const senioridade = ($("#cargoSenioridade").value || "").trim();
  const tipo = ($("#cargoTipo").value || "").trim();
  const descricao = ($("#cargoDescricao").value || "").trim();

  if(!codigo || !nome){
    toast("Informe codigo e nome do cargo.");
    return;
  }

  const now = new Date().toISOString();

  if(id){
    const c = findCargo(id);
    if(!c) return;
    c.codigo = codigo;
    c.nome = nome;
    c.status = status;
    c.area = area;
    c.senioridade = senioridade;
    c.tipo = tipo;
    c.descricao = descricao;
    c.updatedAt = now;
    toast("Cargo atualizado.");
  }else{
    const c = {
      id: uid(),
      codigo,
      nome,
      status,
      area,
      senioridade,
      tipo,
      descricao,
      createdAt: now,
      updatedAt: now
    };
    state.cargos.unshift(c);
    toast("Cargo criado.");
  }

  saveState();
  updateKpis();
  renderTable();
  bootstrap.Modal.getOrCreateInstance($("#modalCargo")).hide();
}

function deleteCargo(id){
  const c = findCargo(id);
  if(!c) return;
  const ok = confirm(`Excluir o cargo \"${c.nome}\"?`);
  if(!ok) return;
  state.cargos = state.cargos.filter(x => x.id !== id);
  saveState();
  updateKpis();
  renderTable();
  toast("Cargo removido.");
}

function openCargoDetail(id){
  const c = findCargo(id);
  if(!c) return;
  const root = $("#modalCargoDetalhes");
  if(!root) return;
  const modal = bootstrap.Modal.getOrCreateInstance(root);

  setText(root, "cargo-name", c.nome || EMPTY_TEXT);
  setText(root, "cargo-code", c.codigo || EMPTY_TEXT);
  setText(root, "cargo-area", c.area || EMPTY_TEXT);
  setText(root, "cargo-senioridade", getEnumText("vagaSenioridade", c.senioridade, c.senioridade));
  setText(root, "cargo-tipo", c.tipo || EMPTY_TEXT);
  setText(root, "cargo-desc", c.descricao || EMPTY_TEXT);

  const statusHost = root.querySelector('[data-role="cargo-status-host"]');
  if(statusHost) statusHost.replaceChildren(buildStatusBadge(c.status));

  const gestores = getCargoGestores(c);
  $("#cargoGestoresCount").textContent = gestores.length;
  const tbody = $("#cargoGestoresTbody");
  tbody.replaceChildren();

  if(!gestores.length){
    const empty = cloneTemplate("tpl-cargo-gestor-empty-row");
    if(empty) tbody.appendChild(empty);
    modal.show();
    return;
  }

  gestores
    .slice()
    .sort((a,b)=> (a.nome||"").localeCompare(b.nome||""))
    .forEach(g => {
      const tr = cloneTemplate("tpl-cargo-gestor-row");
      if(!tr) return;
      setText(tr, "gestor-name", g.nome || EMPTY_TEXT);
      setText(tr, "gestor-email", g.email || EMPTY_TEXT);
      setText(tr, "gestor-area", g.area || EMPTY_TEXT);
      setText(tr, "gestor-unidade", g.unidade || EMPTY_TEXT);
      setText(tr, "gestor-headcount", g.headcount != null ? String(g.headcount) : "0");
      const statusEl = tr.querySelector('[data-role="gestor-status-host"]');
      if(statusEl) statusEl.replaceChildren(buildStatusBadge(g.status));
      tbody.appendChild(tr);
    });

  modal.show();
}

function exportCsv(){
  const headers = ["Codigo", "Cargo", "Area", "Senioridade", "Tipo", "Status", "Descricao"];
  const rows = state.cargos.map(c => [
    c.codigo, c.nome, c.area, c.senioridade, c.tipo, c.status, c.descricao
  ]);
  const csv = [
    headers.map(h => `"${String(h).replaceAll('"','""')}"`).join(";"),
    ...rows.map(r => r.map(c => `"${String(c ?? "").replaceAll('"','""')}"`).join(";"))
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cargos_liotecnica.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function wireFilters(){
  const apply = () => {
    state.filters.q = ($("#cSearch").value || "").trim();
    state.filters.status = $("#cStatus").value || "all";
    renderTable();
  };

  $("#cSearch").addEventListener("input", apply);
  $("#cStatus").addEventListener("change", apply);

  $("#globalSearchCargo").addEventListener("input", () => {
    $("#cSearch").value = $("#globalSearchCargo").value;
    apply();
  });
}

function wireButtons(){
  $("#btnNewCargo").addEventListener("click", () => openCargoModal("new"));
  $("#btnSaveCargo").addEventListener("click", saveCargoFromModal);
  $("#btnSeedReset").addEventListener("click", () => {
    const ok = confirm("Restaurar dados de exemplo? Isso substitui seus cargos atuais.");
    if(!ok) return;
    state.cargos = [];
    saveState();
    seedIfEmpty();
    updateKpis();
    renderTable();
    toast("Demo restaurada.");
  });
  $("#btnExportCargo").addEventListener("click", exportCsv);
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

(async function init(){
  wireClock();
  await ensureEnumData();
  applyEnumSelects();
  const has = loadState();
  if(!has) seedIfEmpty();
  else seedIfEmpty();

  updateKpis();
  renderTable();

  wireFilters();
  wireButtons();
})();
