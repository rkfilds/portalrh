const seed = window.__seedData || {};
const STORE_KEY = "lt_rh_unidades_v1";
const VAGAS_STORE_KEY = "lt_rh_vagas_v1";
const GESTORES_STORE_KEY = "lt_rh_gestores_v1";
const EMPTY_TEXT = "-";

const state = {
  unidades: [],
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
    if(!data || !Array.isArray(data.unidades)) return false;
    state.unidades = data.unidades;
    return true;
  }catch{
    return false;
  }
}

function saveState(){
  localStorage.setItem(STORE_KEY, JSON.stringify({
    unidades: state.unidades
  }));
}

function seedIfEmpty(){
  if(state.unidades.length) return;
  const list = Array.isArray(seed.unidades) ? seed.unidades : [];
  state.unidades = list;
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

function unidadeKey(unidade){
  const text = unidade?.nome || `${unidade?.cidade || ""} - ${unidade?.uf || ""}`.trim();
  return normalizeText(text);
}

function vagaLocalKey(vaga){
  const parts = [vaga?.cidade, vaga?.uf].filter(Boolean);
  return parts.length ? normalizeText(parts.join(" - ")) : "";
}

function getUnidadeVagas(unidade){
  const key = unidadeKey(unidade);
  if(!key) return [];
  return loadVagas().filter(v => vagaLocalKey(v) === key);
}

function getUnidadeGestores(unidade){
  const key = unidadeKey(unidade);
  if(!key) return [];
  return loadGestores().filter(g => normalizeText(g.unidade) === key);
}

function updateKpis(){
  const total = state.unidades.length;
  const ativos = state.unidades.filter(u => u.status === "ativo").length;
  const headcount = state.unidades.reduce((acc, u) => acc + (parseInt(u.headcount, 10) || 0), 0);
  const openVagas = loadVagas().filter(v => v.status === "aberta" && vagaLocalKey(v)).length;

  $("#kpiUnTotal").textContent = total;
  $("#kpiUnActive").textContent = ativos;
  $("#kpiUnHeadcount").textContent = headcount;
  $("#kpiUnOpenRoles").textContent = openVagas;
}

function getFiltered(){
  const q = normalizeText(state.filters.q || "");
  const st = state.filters.status;

  return state.unidades.filter(u => {
    if(st !== "all" && (u.status || "") !== st) return false;
    if(!q) return true;
    const blob = normalizeText([
      u.nome, u.codigo, u.cidade, u.uf, u.endereco, u.bairro, u.email, u.telefone, u.responsavel, u.tipo
    ].join(" "));
    return blob.includes(q);
  });
}

function renderTable(){
  const tbody = $("#unTbody");
  if(!tbody) return;
  tbody.replaceChildren();

  const rows = getFiltered();
  $("#unCount").textContent = rows.length;
  $("#unHint").textContent = rows.length ? `${rows.length} unidades encontradas.` : "Nenhuma unidade encontrada.";

  if(!rows.length){
    const empty = cloneTemplate("tpl-un-empty-row");
    if(empty) tbody.appendChild(empty);
    return;
  }

  rows.forEach(u => {
    const tr = cloneTemplate("tpl-un-row");
    if(!tr) return;
    setText(tr, "un-name", u.nome || EMPTY_TEXT);
    setText(tr, "un-code", u.codigo || EMPTY_TEXT);
    setText(tr, "un-headcount", u.headcount != null ? String(u.headcount) : "0");
    setText(tr, "un-email", u.email || EMPTY_TEXT);
    setText(tr, "un-phone", u.telefone || EMPTY_TEXT);
    setText(tr, "un-type", u.tipo || EMPTY_TEXT);

    const statusHost = tr.querySelector('[data-role="un-status-host"]');
    if(statusHost) statusHost.replaceChildren(buildStatusBadge(u.status));

    tr.querySelectorAll("button[data-act]").forEach(btn => {
      btn.dataset.id = u.id;
      btn.addEventListener("click", (ev) => {
        ev.preventDefault();
        const act = btn.dataset.act;
        if(act === "detail") openUnidadeDetail(u.id);
        if(act === "edit") openUnidadeModal("edit", u.id);
        if(act === "del") deleteUnidade(u.id);
      });
    });

    tbody.appendChild(tr);
  });
}

function findUnidade(id){
  return state.unidades.find(u => u.id === id) || null;
}

function openUnidadeModal(mode, id){
  const modal = bootstrap.Modal.getOrCreateInstance($("#modalUnidade"));
  const isEdit = mode === "edit";
  $("#modalUnidadeTitle").textContent = isEdit ? "Editar unidade" : "Nova unidade";

  if(isEdit){
    const u = findUnidade(id);
    if(!u) return;
    $("#unId").value = u.id || "";
    $("#unCodigo").value = u.codigo || "";
    $("#unNome").value = u.nome || "";
    $("#unStatus").value = u.status || "ativo";
    $("#unCidade").value = u.cidade || "";
    $("#unUf").value = u.uf || "";
    $("#unEndereco").value = u.endereco || "";
    $("#unBairro").value = u.bairro || "";
    $("#unCep").value = u.cep || "";
    $("#unEmail").value = u.email || "";
    $("#unTelefone").value = u.telefone || "";
    $("#unResponsavel").value = u.responsavel || "";
    $("#unTipo").value = u.tipo || "";
    $("#unHeadcount").value = u.headcount != null ? String(u.headcount) : "0";
    $("#unObs").value = u.observacao || "";
  }else{
    $("#unId").value = "";
    $("#unCodigo").value = "";
    $("#unNome").value = "";
    $("#unStatus").value = "ativo";
    $("#unCidade").value = "";
    $("#unUf").value = "";
    $("#unEndereco").value = "";
    $("#unBairro").value = "";
    $("#unCep").value = "";
    $("#unEmail").value = "";
    $("#unTelefone").value = "";
    $("#unResponsavel").value = "";
    $("#unTipo").value = "";
    $("#unHeadcount").value = "0";
    $("#unObs").value = "";
  }

  modal.show();
}

function saveUnidadeFromModal(){
  const id = $("#unId").value || null;
  const codigo = ($("#unCodigo").value || "").trim();
  const nome = ($("#unNome").value || "").trim();
  const status = ($("#unStatus").value || "ativo").trim();
  const cidade = ($("#unCidade").value || "").trim();
  const uf = ($("#unUf").value || "").trim().toUpperCase().slice(0,2);
  const endereco = ($("#unEndereco").value || "").trim();
  const bairro = ($("#unBairro").value || "").trim();
  const cep = ($("#unCep").value || "").trim();
  const email = ($("#unEmail").value || "").trim();
  const telefone = ($("#unTelefone").value || "").trim();
  const responsavel = ($("#unResponsavel").value || "").trim();
  const tipo = ($("#unTipo").value || "").trim();
  const headcount = parseInt($("#unHeadcount").value, 10) || 0;
  const observacao = ($("#unObs").value || "").trim();

  if(!codigo || !nome){
    toast("Informe codigo e nome da unidade.");
    return;
  }

  const now = new Date().toISOString();

  if(id){
    const u = findUnidade(id);
    if(!u) return;
    u.codigo = codigo;
    u.nome = nome;
    u.status = status;
    u.cidade = cidade;
    u.uf = uf;
    u.endereco = endereco;
    u.bairro = bairro;
    u.cep = cep;
    u.email = email;
    u.telefone = telefone;
    u.responsavel = responsavel;
    u.tipo = tipo;
    u.headcount = headcount;
    u.observacao = observacao;
    u.updatedAt = now;
    toast("Unidade atualizada.");
  }else{
    const u = {
      id: uid(),
      codigo,
      nome,
      status,
      cidade,
      uf,
      endereco,
      bairro,
      cep,
      email,
      telefone,
      responsavel,
      tipo,
      headcount,
      observacao,
      createdAt: now,
      updatedAt: now
    };
    state.unidades.unshift(u);
    toast("Unidade criada.");
  }

  saveState();
  updateKpis();
  renderTable();
  bootstrap.Modal.getOrCreateInstance($("#modalUnidade")).hide();
}

function deleteUnidade(id){
  const u = findUnidade(id);
  if(!u) return;
  const ok = confirm(`Excluir a unidade \"${u.nome}\"?`);
  if(!ok) return;
  state.unidades = state.unidades.filter(x => x.id !== id);
  saveState();
  updateKpis();
  renderTable();
  toast("Unidade removida.");
}

function goToVagaDetail(vagaId){
  if(!vagaId) return;
  const url = new URL("/Vagas", window.location.origin);
  url.searchParams.set("vagaId", vagaId);
  url.searchParams.set("open", "detail");
  window.location.href = url.toString();
}

async function renderGestoresFromApi(unitId) {
    const gestoresBody = $("#unGestoresTbody");
    if (!gestoresBody) return;

    // estado "carregando..."
    gestoresBody.replaceChildren();
    const trLoading = document.createElement("tr");
    trLoading.innerHTML = `<td colspan="5" class="text-muted py-3">Carregando gestores...</td>`;
    gestoresBody.appendChild(trLoading);

    // contador provisório
    $("#unGestoresCount").textContent = "…";

    try {
        // endpoint do WEB (proxy) sugerido: /Unidades/{id}/gestores
        const resp = await fetch(`/Unidades/${unitId}/gestores`, {
            headers: { "accept": "application/json" }
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();
        const gestores = Array.isArray(data?.items) ? data.items : [];

        $("#unGestoresCount").textContent = gestores.length;

        gestoresBody.replaceChildren();

        if (!gestores.length) {
            const empty = cloneTemplate("tpl-un-gestor-empty-row");
            if (empty) gestoresBody.appendChild(empty);
            return;
        }

        gestores
            .slice()
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
            .forEach(g => {
                const tr = cloneTemplate("tpl-un-gestor-row");
                if (!tr) return;

                setText(tr, "gestor-name", g.nome || EMPTY_TEXT);
                setText(tr, "gestor-email", g.email || EMPTY_TEXT);
                setText(tr, "gestor-cargo", g.cargo || EMPTY_TEXT);
                setText(tr, "gestor-area", g.area || EMPTY_TEXT);
                setText(tr, "gestor-headcount", g.headcount != null ? String(g.headcount) : "0");

                const statusEl = tr.querySelector('[data-role="gestor-status-host"]');
                if (statusEl) statusEl.replaceChildren(buildStatusBadge(g.status)); // espera "ativo/inativo"

                gestoresBody.appendChild(tr);
            });
    } catch (err) {
        $("#unGestoresCount").textContent = "0";
        gestoresBody.replaceChildren();
        const empty = cloneTemplate("tpl-un-gestor-empty-row");
        if (empty) gestoresBody.appendChild(empty);
        toast("Não foi possível carregar gestores desta unidade.");
    }
}

async function openUnidadeDetail(id) {
    const u = findUnidade(id);
    if (!u) return;
    const root = $("#modalUnidadeDetalhes");
    if (!root) return;
    const modal = bootstrap.Modal.getOrCreateInstance(root);

    setText(root, "un-name", u.nome || EMPTY_TEXT);
    setText(root, "un-code", u.codigo || EMPTY_TEXT);
    const addressParts = [u.endereco, u.bairro, u.cidade, u.uf].filter(Boolean);
    setText(root, "un-address", addressParts.join(" - ") || EMPTY_TEXT);
    setText(root, "un-email", u.email || EMPTY_TEXT);
    setText(root, "un-phone", u.telefone || EMPTY_TEXT);
    setText(root, "un-owner", u.responsavel || EMPTY_TEXT);
    setText(root, "un-type", u.tipo || EMPTY_TEXT);

    const statusHost = root.querySelector('[data-role="un-status-host"]');
    if (statusHost) statusHost.replaceChildren(buildStatusBadge(u.status));

    // ✅ Gestores agora vêm da API (on-demand)
    renderGestoresFromApi(u.id);

    // ✅ Vagas continuam como estava (localStorage/seed)
    const vagas = getUnidadeVagas(u);
    $("#unVagasCount").textContent = vagas.length;
    const vagasBody = $("#unVagasTbody");
    vagasBody.replaceChildren();

    if (!vagas.length) {
        const empty = cloneTemplate("tpl-un-vaga-empty-row");
        if (empty) vagasBody.appendChild(empty);
    } else {
        vagas
            .slice()
            .sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""))
            .forEach(v => {
                const tr = cloneTemplate("tpl-un-vaga-row");
                if (!tr) return;

                setText(tr, "vaga-code", v.codigo || EMPTY_TEXT);
                setText(tr, "vaga-title", v.titulo || EMPTY_TEXT);
                setText(tr, "vaga-modalidade", v.modalidade || EMPTY_TEXT);
                setText(tr, "vaga-local", formatLocal(v));
                setText(tr, "vaga-updated", formatDate(v.updatedAt));

                const statusEl = tr.querySelector('[data-role="vaga-status-host"]');
                if (statusEl) statusEl.replaceChildren(buildVagaStatusBadge(v.status));

                const btn = tr.querySelector('[data-act="open-vaga"]');
                if (btn) btn.addEventListener("click", () => goToVagaDetail(v.id));

                vagasBody.appendChild(tr);
            });
    }

    modal.show();
}


function exportCsv(){
  const headers = ["Codigo", "Unidade", "Status", "Cidade", "UF", "Endereco", "Bairro", "CEP", "Email", "Telefone", "Responsavel", "Tipo", "Headcount"];
  const rows = state.unidades.map(u => [
    u.codigo, u.nome, u.status, u.cidade, u.uf, u.endereco, u.bairro, u.cep, u.email, u.telefone, u.responsavel, u.tipo, u.headcount
  ]);
  const csv = [
    headers.map(h => `"${String(h).replaceAll('"','""')}"`).join(";"),
    ...rows.map(r => r.map(c => `"${String(c ?? "").replaceAll('"','""')}"`).join(";"))
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "unidades_liotecnica.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function wireFilters(){
  const apply = () => {
    state.filters.q = ($("#uSearch").value || "").trim();
    state.filters.status = $("#uStatus").value || "all";
    renderTable();
  };

  $("#uSearch").addEventListener("input", apply);
  $("#uStatus").addEventListener("change", apply);

  $("#globalSearchUnidade").addEventListener("input", () => {
    $("#uSearch").value = $("#globalSearchUnidade").value;
    apply();
  });
}

function wireButtons(){
  $("#btnNewUnidade").addEventListener("click", () => openUnidadeModal("new"));
  $("#btnSaveUnidade").addEventListener("click", saveUnidadeFromModal);
  $("#btnSeedReset").addEventListener("click", () => {
    const ok = confirm("Restaurar dados de exemplo? Isso substitui suas unidades atuais.");
    if(!ok) return;
    state.unidades = [];
    saveState();
    seedIfEmpty();
    updateKpis();
    renderTable();
    toast("Demo restaurada.");
  });
  $("#btnExportUnidade").addEventListener("click", exportCsv);
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
