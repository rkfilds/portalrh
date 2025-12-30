const seed = window.__seedData || {};
const STORE_KEY = "lt_rh_departamentos_v1";
const VAGAS_STORE_KEY = "lt_rh_vagas_v1";
const AREAS_STORE_KEY = "lt_rh_areas_v1";
const EMPTY_TEXT = "-";

const state = {
  departamentos: [],
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
    if(!data || !Array.isArray(data.departamentos)) return false;
    state.departamentos = data.departamentos;
    return true;
  }catch{
    return false;
  }
}

function saveState(){
  localStorage.setItem(STORE_KEY, JSON.stringify({
    departamentos: state.departamentos
  }));
}

function seedIfEmpty(){
  if(state.departamentos.length) return;
  const list = Array.isArray(seed.departamentos) ? seed.departamentos : [];
  state.departamentos = list;
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

function getAreaOptions(){
  const areas = loadAreas();
  const set = new Set(areas.map(a => a.nome).filter(Boolean));
  return Array.from(set).sort((a,b)=>a.localeCompare(b, "pt-BR"));
}

function buildDeptStatusBadge(status){
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

function getDeptVagas(dept){
  const key = normalizeText(dept?.area || dept?.nome || "");
  const vagas = loadVagas();
  return vagas.filter(v => normalizeText(v.area) === key);
}

function getDeptOpenCount(dept){
  return getDeptVagas(dept).filter(v => v.status === "aberta").length;
}

function updateKpis(){
  const total = state.departamentos.length;
  const ativos = state.departamentos.filter(d => d.status === "ativo").length;
  const headcount = state.departamentos.reduce((acc, d) => acc + (parseInt(d.headcount, 10) || 0), 0);
  const openVagas = loadVagas().filter(v => v.status === "aberta").length;

  $("#kpiDeptTotal").textContent = total;
  $("#kpiDeptActive").textContent = ativos;
  $("#kpiDeptOpenRoles").textContent = openVagas;
  $("#kpiDeptHeadcount").textContent = headcount;
}

function getFiltered(){
  const q = normalizeText(state.filters.q || "");
  const st = state.filters.status;

  return state.departamentos.filter(d => {
    if(st !== "all" && (d.status || "") !== st) return false;
    if(!q) return true;
    const blob = normalizeText([d.nome, d.codigo, d.gestor, d.centroCusto, d.local, d.area].join(" "));
    return blob.includes(q);
  });
}

function renderTable(){
  const tbody = $("#deptTbody");
  if(!tbody) return;
  tbody.replaceChildren();

  const rows = getFiltered();
  $("#deptCount").textContent = rows.length;
  $("#deptHint").textContent = rows.length ? `${rows.length} departamentos encontrados.` : "Nenhum departamento encontrado.";

  if(!rows.length){
    const empty = cloneTemplate("tpl-dept-empty-row");
    if(empty) tbody.appendChild(empty);
    return;
  }

  rows.forEach(d => {
    const tr = cloneTemplate("tpl-dept-row");
    if(!tr) return;
    setText(tr, "dept-name", d.nome || EMPTY_TEXT);
    setText(tr, "dept-code", d.codigo || EMPTY_TEXT);
    setText(tr, "dept-gestor", d.gestor || EMPTY_TEXT);
    setText(tr, "dept-email", d.email || EMPTY_TEXT);
    setText(tr, "dept-cost", d.centroCusto || EMPTY_TEXT);
    setText(tr, "dept-local", d.local || EMPTY_TEXT);
    setText(tr, "dept-headcount", d.headcount != null ? String(d.headcount) : "0");

    const statusHost = tr.querySelector('[data-role="dept-status-host"]');
    if(statusHost) statusHost.replaceChildren(buildDeptStatusBadge(d.status));

    const totalVagas = getDeptVagas(d).length;
    const abertas = getDeptOpenCount(d);
    setText(tr, "dept-vagas", `${abertas}/${totalVagas}`);

    tr.querySelectorAll("button[data-act]").forEach(btn => {
      btn.dataset.id = d.id;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const act = btn.dataset.act;
        if(act === "detail") openDeptDetail(d.id);
        if(act === "edit") openDeptModal("edit", d.id);
        if(act === "del") deleteDept(d.id);
      });
    });

    tbody.appendChild(tr);
  });
}

function findDept(id){
  return state.departamentos.find(d => d.id === id) || null;
}

function fillAreaSelect(selected){
  const select = $("#deptArea");
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

function openDeptModal(mode, id){
  const modal = bootstrap.Modal.getOrCreateInstance($("#modalDept"));
  const isEdit = mode === "edit";
  $("#modalDeptTitle").textContent = isEdit ? "Editar departamento" : "Novo departamento";

  if(isEdit){
    const d = findDept(id);
    if(!d) return;
    $("#deptId").value = d.id || "";
    $("#deptCodigo").value = d.codigo || "";
    $("#deptNome").value = d.nome || "";
    fillAreaSelect(d.area || d.nome || "");
    $("#deptStatus").value = d.status || "ativo";
    $("#deptHeadcount").value = d.headcount != null ? String(d.headcount) : "0";
    $("#deptGestor").value = d.gestor || "";
    $("#deptEmail").value = d.email || "";
    $("#deptTelefone").value = d.telefone || "";
    $("#deptCentroCusto").value = d.centroCusto || "";
    $("#deptLocal").value = d.local || "";
    $("#deptDescricao").value = d.descricao || "";
  }else{
    $("#deptId").value = "";
    $("#deptCodigo").value = "";
    $("#deptNome").value = "";
    fillAreaSelect("");
    $("#deptStatus").value = "ativo";
    $("#deptHeadcount").value = "0";
    $("#deptGestor").value = "";
    $("#deptEmail").value = "";
    $("#deptTelefone").value = "";
    $("#deptCentroCusto").value = "";
    $("#deptLocal").value = "";
    $("#deptDescricao").value = "";
  }

  modal.show();
}

function saveDeptFromModal(){
  const id = $("#deptId").value || null;
  const codigo = ($("#deptCodigo").value || "").trim();
  const nome = ($("#deptNome").value || "").trim();
  const area = ($("#deptArea").value || "").trim() || nome;
  const status = ($("#deptStatus").value || "ativo").trim();
  const headcount = parseInt($("#deptHeadcount").value, 10) || 0;
  const gestor = ($("#deptGestor").value || "").trim();
  const email = ($("#deptEmail").value || "").trim();
  const telefone = ($("#deptTelefone").value || "").trim();
  const centroCusto = ($("#deptCentroCusto").value || "").trim();
  const local = ($("#deptLocal").value || "").trim();
  const descricao = ($("#deptDescricao").value || "").trim();

  if(!codigo || !nome){
    toast("Informe codigo e nome do departamento.");
    return;
  }

  const now = new Date().toISOString();

  if(id){
    const d = findDept(id);
    if(!d) return;
    d.codigo = codigo;
    d.nome = nome;
    d.area = area;
    d.status = status;
    d.headcount = headcount;
    d.gestor = gestor;
    d.email = email;
    d.telefone = telefone;
    d.centroCusto = centroCusto;
    d.local = local;
    d.descricao = descricao;
    d.updatedAt = now;
    toast("Departamento atualizado.");
  }else{
    const d = {
      id: uid(),
      codigo,
      nome,
      area,
      status,
      headcount,
      gestor,
      email,
      telefone,
      centroCusto,
      local,
      descricao,
      createdAt: now,
      updatedAt: now
    };
    state.departamentos.unshift(d);
    toast("Departamento criado.");
  }

  saveState();
  updateKpis();
  renderTable();
  bootstrap.Modal.getOrCreateInstance($("#modalDept")).hide();
}

function deleteDept(id){
  const d = findDept(id);
  if(!d) return;
  const ok = confirm(`Excluir o departamento \"${d.nome}\"?`);
  if(!ok) return;
  state.departamentos = state.departamentos.filter(x => x.id !== id);
  saveState();
  updateKpis();
  renderTable();
  toast("Departamento removido.");
}

function goToVagaDetail(vagaId){
  if(!vagaId) return;
  const url = new URL("/Vagas", window.location.origin);
  url.searchParams.set("vagaId", vagaId);
  url.searchParams.set("open", "detail");
  window.location.href = url.toString();
}

function openDeptDetail(id){
  const d = findDept(id);
  if(!d) return;
  const root = $("#modalDeptDetalhes");
  if(!root) return;
  const modal = bootstrap.Modal.getOrCreateInstance(root);

  setText(root, "dept-name", d.nome || EMPTY_TEXT);
  setText(root, "dept-code", d.codigo || EMPTY_TEXT);
  setText(root, "dept-area", d.area || d.nome || EMPTY_TEXT);
  setText(root, "dept-gestor", d.gestor || EMPTY_TEXT);
  setText(root, "dept-email", d.email || EMPTY_TEXT);
  setText(root, "dept-local", d.local || EMPTY_TEXT);
  setText(root, "dept-desc", d.descricao || EMPTY_TEXT);
  setText(root, "dept-headcount", d.headcount != null ? String(d.headcount) : "0");

  const statusHost = root.querySelector('[data-role="dept-status-host"]');
  if(statusHost) statusHost.replaceChildren(buildDeptStatusBadge(d.status));

  const vagas = getDeptVagas(d);
  $("#deptVagasCount").textContent = vagas.length;

  const tbody = $("#deptVagasTbody");
  tbody.replaceChildren();
  if(!vagas.length){
    const empty = cloneTemplate("tpl-dept-vaga-empty-row");
    if(empty) tbody.appendChild(empty);
    modal.show();
    return;
  }

  vagas
    .slice()
    .sort((a,b)=> (a.titulo||"").localeCompare(b.titulo||""))
    .forEach(v => {
      const tr = cloneTemplate("tpl-dept-vaga-row");
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
  const headers = ["Codigo", "Departamento", "Area", "Gestor", "Email", "Telefone", "CentroCusto", "Local", "Headcount", "Status"];
  const rows = state.departamentos.map(d => [
    d.codigo, d.nome, d.area, d.gestor, d.email, d.telefone, d.centroCusto, d.local, d.headcount, d.status
  ]);
  const csv = [
    headers.map(h => `"${String(h).replaceAll('"','""')}"`).join(";"),
    ...rows.map(r => r.map(c => `"${String(c ?? "").replaceAll('"','""')}"`).join(";"))
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "departamentos_liotecnica.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function wireFilters(){
  const apply = () => {
    state.filters.q = ($("#dSearch").value || "").trim();
    state.filters.status = $("#dStatus").value || "all";
    renderTable();
  };

  $("#dSearch").addEventListener("input", apply);
  $("#dStatus").addEventListener("change", apply);

  $("#globalSearchDept").addEventListener("input", () => {
    $("#dSearch").value = $("#globalSearchDept").value;
    apply();
  });
}

function wireButtons(){
  $("#btnNewDept").addEventListener("click", () => openDeptModal("new"));
  $("#btnSaveDept").addEventListener("click", saveDeptFromModal);
  $("#btnSeedReset").addEventListener("click", () => {
    const ok = confirm("Restaurar dados de exemplo? Isso substitui seus departamentos atuais.");
    if(!ok) return;
    state.departamentos = [];
    saveState();
    seedIfEmpty();
    updateKpis();
    renderTable();
    toast("Demo restaurada.");
  });
  $("#btnExportDept").addEventListener("click", exportCsv);
}

function wireClock(){
  const tick = () => {
    const d = new Date();
    $("#nowLabel").textContent = d.toLocaleString("pt-BR", {
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
