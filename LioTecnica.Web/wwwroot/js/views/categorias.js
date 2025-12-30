const seed = window.__seedData || {};
const STORE_KEY = "lt_rh_req_categorias_v1";
const VAGAS_STORE_KEY = "lt_rh_vagas_v1";
const EMPTY_TEXT = "-";

const state = {
  categorias: [],
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
    if(!data || !Array.isArray(data.categorias)) return false;
    state.categorias = data.categorias;
    return true;
  }catch{
    return false;
  }
}

function saveState(){
  localStorage.setItem(STORE_KEY, JSON.stringify({
    categorias: state.categorias
  }));
}

function seedIfEmpty(){
  if(state.categorias.length) return;
  const list = Array.isArray(seed.requisitoCategorias) ? seed.requisitoCategorias : [];
  state.categorias = list;
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

function getCategoriaVagas(cat){
  const key = normalizeText(cat?.nome || "");
  const vagas = loadVagas();
  return vagas
    .map(v => {
      const count = (v.requisitos || []).filter(r => normalizeText(r.categoria) === key).length;
      if(!count) return null;
      return { vaga: v, count };
    })
    .filter(Boolean);
}

function getCategoriaReqCount(cat){
  return getCategoriaVagas(cat).reduce((acc, item) => acc + item.count, 0);
}

function updateKpis(){
  const total = state.categorias.length;
  const ativos = state.categorias.filter(c => c.status === "ativo").length;
  const vagas = loadVagas();
  const totalReqs = vagas.reduce((acc, v) => acc + (v.requisitos || []).length, 0);
  const vagasComReq = vagas.filter(v => (v.requisitos || []).length).length;

  $("#kpiCatTotal").textContent = total;
  $("#kpiCatActive").textContent = ativos;
  $("#kpiCatReqTotal").textContent = totalReqs;
  $("#kpiCatVagasTotal").textContent = vagasComReq;
}

function getFiltered(){
  const q = normalizeText(state.filters.q || "");
  const st = state.filters.status;

  return state.categorias.filter(c => {
    if(st !== "all" && (c.status || "") !== st) return false;
    if(!q) return true;
    const blob = normalizeText([c.nome, c.codigo, c.descricao].join(" "));
    return blob.includes(q);
  });
}

function renderTable(){
  const tbody = $("#catTbody");
  if(!tbody) return;
  tbody.replaceChildren();

  const rows = getFiltered();
  $("#catCount").textContent = rows.length;
  $("#catHint").textContent = rows.length ? `${rows.length} categorias encontradas.` : "Nenhuma categoria encontrada.";

  if(!rows.length){
    const empty = cloneTemplate("tpl-cat-empty-row");
    if(empty) tbody.appendChild(empty);
    return;
  }

  rows.forEach(c => {
    const tr = cloneTemplate("tpl-cat-row");
    if(!tr) return;
    setText(tr, "cat-name", c.nome || EMPTY_TEXT);
    setText(tr, "cat-code", c.codigo || EMPTY_TEXT);
    setText(tr, "cat-desc", c.descricao || EMPTY_TEXT);
    const statusHost = tr.querySelector('[data-role="cat-status-host"]');
    if(statusHost) statusHost.replaceChildren(buildStatusBadge(c.status));

    const reqCount = getCategoriaReqCount(c);
    const vagaCount = getCategoriaVagas(c).length;
    setText(tr, "cat-reqs", `${reqCount} reqs / ${vagaCount} vagas`);

    tr.querySelectorAll("button[data-act]").forEach(btn => {
      btn.dataset.id = c.id;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const act = btn.dataset.act;
        if(act === "detail") openCategoriaDetail(c.id);
        if(act === "edit") openCategoriaModal("edit", c.id);
        if(act === "del") deleteCategoria(c.id);
      });
    });

    tbody.appendChild(tr);
  });
}

function findCategoria(id){
  return state.categorias.find(c => c.id === id) || null;
}

function openCategoriaModal(mode, id){
  const modal = bootstrap.Modal.getOrCreateInstance($("#modalCategoria"));
  const isEdit = mode === "edit";
  $("#modalCategoriaTitle").textContent = isEdit ? "Editar categoria" : "Nova categoria";

  if(isEdit){
    const c = findCategoria(id);
    if(!c) return;
    $("#catId").value = c.id || "";
    $("#catCodigo").value = c.codigo || "";
    $("#catNome").value = c.nome || "";
    $("#catStatus").value = c.status || "ativo";
    $("#catDescricao").value = c.descricao || "";
  }else{
    $("#catId").value = "";
    $("#catCodigo").value = "";
    $("#catNome").value = "";
    $("#catStatus").value = "ativo";
    $("#catDescricao").value = "";
  }

  modal.show();
}

function saveCategoriaFromModal(){
  const id = $("#catId").value || null;
  const codigo = ($("#catCodigo").value || "").trim();
  const nome = ($("#catNome").value || "").trim();
  const status = ($("#catStatus").value || "ativo").trim();
  const descricao = ($("#catDescricao").value || "").trim();

  if(!codigo || !nome){
    toast("Informe codigo e nome da categoria.");
    return;
  }

  const now = new Date().toISOString();

  if(id){
    const c = findCategoria(id);
    if(!c) return;
    c.codigo = codigo;
    c.nome = nome;
    c.status = status;
    c.descricao = descricao;
    c.updatedAt = now;
    toast("Categoria atualizada.");
  }else{
    const c = {
      id: uid(),
      codigo,
      nome,
      status,
      descricao,
      createdAt: now,
      updatedAt: now
    };
    state.categorias.unshift(c);
    toast("Categoria criada.");
  }

  saveState();
  updateKpis();
  renderTable();
  bootstrap.Modal.getOrCreateInstance($("#modalCategoria")).hide();
}

function deleteCategoria(id){
  const c = findCategoria(id);
  if(!c) return;
  const ok = confirm(`Excluir a categoria \"${c.nome}\"?`);
  if(!ok) return;
  state.categorias = state.categorias.filter(x => x.id !== id);
  saveState();
  updateKpis();
  renderTable();
  toast("Categoria removida.");
}

function goToVagaDetail(vagaId){
  if(!vagaId) return;
  const url = new URL("/Vagas", window.location.origin);
  url.searchParams.set("vagaId", vagaId);
  url.searchParams.set("open", "detail");
  window.location.href = url.toString();
}

function openCategoriaDetail(id){
  const c = findCategoria(id);
  if(!c) return;
  const root = $("#modalCategoriaDetalhes");
  if(!root) return;
  const modal = bootstrap.Modal.getOrCreateInstance(root);

  setText(root, "cat-name", c.nome || EMPTY_TEXT);
  setText(root, "cat-code", c.codigo || EMPTY_TEXT);
  setText(root, "cat-desc", c.descricao || EMPTY_TEXT);

  const statusHost = root.querySelector('[data-role="cat-status-host"]');
  if(statusHost) statusHost.replaceChildren(buildStatusBadge(c.status));

  const rows = getCategoriaVagas(c);
  $("#catVagasCount").textContent = rows.length;
  $("#catReqCount").textContent = rows.reduce((acc, item) => acc + item.count, 0);

  const tbody = $("#catVagasTbody");
  tbody.replaceChildren();
  if(!rows.length){
    const empty = cloneTemplate("tpl-cat-vaga-empty-row");
    if(empty) tbody.appendChild(empty);
    modal.show();
    return;
  }

  rows
    .slice()
    .sort((a,b)=> (a.vaga.titulo||"").localeCompare(b.vaga.titulo||""))
    .forEach(row => {
      const tr = cloneTemplate("tpl-cat-vaga-row");
      if(!tr) return;
      setText(tr, "vaga-code", row.vaga.codigo || EMPTY_TEXT);
      setText(tr, "vaga-title", row.vaga.titulo || EMPTY_TEXT);
      setText(tr, "vaga-reqs", String(row.count));
      setText(tr, "vaga-modalidade", row.vaga.modalidade || EMPTY_TEXT);
      setText(tr, "vaga-local", formatLocal(row.vaga));
      setText(tr, "vaga-updated", formatDate(row.vaga.updatedAt));
      const statusEl = tr.querySelector('[data-role="vaga-status-host"]');
      if(statusEl) statusEl.replaceChildren(buildVagaStatusBadge(row.vaga.status));
      const btn = tr.querySelector('[data-act="open-vaga"]');
      if(btn) btn.addEventListener("click", () => goToVagaDetail(row.vaga.id));
      tbody.appendChild(tr);
    });

  modal.show();
}

function exportCsv(){
  const headers = ["Codigo", "Categoria", "Status", "Descricao"];
  const rows = state.categorias.map(c => [
    c.codigo, c.nome, c.status, c.descricao
  ]);
  const csv = [
    headers.map(h => `"${String(h).replaceAll('"','""')}"`).join(";"),
    ...rows.map(r => r.map(c => `"${String(c ?? "").replaceAll('"','""')}"`).join(";"))
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "categorias_requisitos_liotecnica.csv";
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

  $("#globalSearchCategoria").addEventListener("input", () => {
    $("#cSearch").value = $("#globalSearchCategoria").value;
    apply();
  });
}

function wireButtons(){
  $("#btnNewCategoria").addEventListener("click", () => openCategoriaModal("new"));
  $("#btnSaveCategoria").addEventListener("click", saveCategoriaFromModal);
  $("#btnSeedReset").addEventListener("click", () => {
    const ok = confirm("Restaurar dados de exemplo? Isso substitui suas categorias atuais.");
    if(!ok) return;
    state.categorias = [];
    saveState();
    seedIfEmpty();
    updateKpis();
    renderTable();
    toast("Demo restaurada.");
  });
  $("#btnExportCategoria").addEventListener("click", exportCsv);
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
