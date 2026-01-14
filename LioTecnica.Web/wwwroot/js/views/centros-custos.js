// =====================
// Centro de Custo (demo/localStorage) — no mesmo padrão do JS de Áreas
// =====================

const seed = window.__seedData || {};
const STORE_KEY = "lt_rh_centros_custos_v1";
const VAGAS_STORE_KEY = "lt_rh_vagas_v1"; // opcional (se quiser cruzar vagas x centro de custo)
const EMPTY_TEXT = "-";

const state = {
    centrosCustos: [],
    filters: { q: "", status: "all" }
};

// Helpers básicos (assumindo que você já tem no seu layout)
// - $ (querySelector)
// - cloneTemplate(id)
// - toast(msg)
// - uid()
// - normalizeText(str)
function setText(root, role, value, fallback = EMPTY_TEXT) {
    if (!root) return;
    const el = root.querySelector(`[data-role="${role}"]`);
    if (!el) return;
    el.textContent = value ?? fallback;
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data || !Array.isArray(data.centrosCustos)) return false;
        state.centrosCustos = data.centrosCustos;
        return true;
    } catch {
        return false;
    }
}

function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify({
        centrosCustos: state.centrosCustos
    }));
}

function seedIfEmpty() {
    if (state.centrosCustos.length) return;

    // tenta seed.centrosCustos, senão seed.centrosCusto, senão seed.centrosCustosDemo
    const list =
        (Array.isArray(seed.centrosCustos) ? seed.centrosCustos : null) ||
        (Array.isArray(seed.centrosCusto) ? seed.centrosCusto : null) ||
        (Array.isArray(seed.centrosCustosDemo) ? seed.centrosCustosDemo : []);

    state.centrosCustos = list.map(x => normalizeCostCenterRow(x));
    saveState();
}

function loadVagas() {
    try {
        const raw = localStorage.getItem(VAGAS_STORE_KEY);
        if (!raw) return Array.isArray(seed.vagas) ? seed.vagas : [];
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.vagas)) return data.vagas;
        return Array.isArray(seed.vagas) ? seed.vagas : [];
    } catch {
        return Array.isArray(seed.vagas) ? seed.vagas : [];
    }
}

function normalizeCostCenterRow(c) {
    c = c || {};
    const pick = (...vals) => {
        for (const v of vals) {
            if (v !== undefined && v !== null && String(v).trim() !== "") return v;
        }
        return "";
    };

    const id = pick(c.id);
    const codigo = pick(c.codigo, c.code);
    const nome = pick(c.nome, c.name);

    const descricao = pick(c.descricao, c.description);
    const grupo = pick(c.grupo, c.group, c.groupName);
    const unidade = pick(c.unidade, c.unit, c.branchOrUnit, c.branch);

    const rawStatus = pick(c.status, c.isActive);
    let status = "ativo";
    if (typeof rawStatus === "boolean") status = rawStatus ? "ativo" : "inativo";
    else {
        const s = String(rawStatus || "").toLowerCase();
        if (s === "inactive" || s === "inativo") status = "inativo";
        if (s === "active" || s === "ativo") status = "ativo";
    }

    const createdAt = pick(c.createdAt, c.createdAtUtc);
    const updatedAt = pick(c.updatedAt, c.updatedAtUtc);

    return {
        id: id || (typeof uid === "function" ? uid() : crypto.randomUUID()),
        codigo: codigo || "",
        nome: nome || "",
        status,
        descricao: descricao || "",
        grupo: grupo || "",
        unidade: unidade || "",
        createdAt: createdAt || null,
        updatedAt: updatedAt || null
    };
}

function buildStatusBadge(status) {
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

function formatDate(iso) {
    if (!iso) return EMPTY_TEXT;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return EMPTY_TEXT;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Se você quiser relacionar vagas por centro de custo (caso exista campo v.costCenter / v.centroCusto):
function getCostCenterVagas(cc) {
    const vagas = loadVagas();
    const key = normalizeText(cc?.codigo || cc?.nome || "");
    return vagas.filter(v => {
        const vv = normalizeText(v?.centroCusto || v?.costCenter || "");
        return vv && vv.includes(key);
    });
}

function getCostCenterOpenCount(cc) {
    return getCostCenterVagas(cc).filter(v => v.status === "aberta").length;
}

function updateKpis() {
    const total = state.centrosCustos.length;
    const ativos = state.centrosCustos.filter(c => c.status === "ativo").length;

    // KPI “vagas abertas” opcional
    const vagas = loadVagas();
    const openVagas = vagas.filter(v => v.status === "aberta").length;

    // ids sugeridos para sua view:
    // kpiCcTotal, kpiCcActive, kpiCcOpenRoles, kpiCcGroups
    const groupsSet = new Set(state.centrosCustos.map(c => (c.grupo || "").trim()).filter(Boolean));

    const elTotal = $("#kpiCcTotal");
    const elActive = $("#kpiCcActive");
    const elOpen = $("#kpiCcOpenRoles");
    const elGroups = $("#kpiCcGroups");

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = ativos;
    if (elOpen) elOpen.textContent = openVagas; // ou soma por CC se preferir
    if (elGroups) elGroups.textContent = groupsSet.size;
}

function getFiltered() {
    const q = normalizeText(state.filters.q || "");
    const st = state.filters.status;

    return state.centrosCustos.filter(c => {
        if (st !== "all" && (c.status || "") !== st) return false;
        if (!q) return true;
        const blob = normalizeText([c.nome, c.codigo, c.descricao, c.grupo, c.unidade].join(" "));
        return blob.includes(q);
    });
}

function renderTable() {
    const tbody = $("#ccTbody");
    if (!tbody) return;
    tbody.replaceChildren();

    const rows = getFiltered();
    const countEl = $("#ccCount");
    const hintEl = $("#ccHint");
    if (countEl) countEl.textContent = rows.length;
    if (hintEl) hintEl.textContent = rows.length ? `${rows.length} centros de custo encontrados.` : "Nenhum centro de custo encontrado.";

    if (!rows.length) {
        const empty = cloneTemplate("tpl-cc-empty-row");
        if (empty) tbody.appendChild(empty);
        return;
    }

    rows.forEach(c0 => {
        const c = normalizeCostCenterRow(c0);
        const tr = cloneTemplate("tpl-cc-row");
        if (!tr) return;

        setText(tr, "cc-name", c.nome || EMPTY_TEXT);
        setText(tr, "cc-code", c.codigo || EMPTY_TEXT);
        setText(tr, "cc-desc", c.descricao || EMPTY_TEXT);
        setText(tr, "cc-group", c.grupo || EMPTY_TEXT);
        setText(tr, "cc-unit", c.unidade || EMPTY_TEXT);

        // opcional: vagas relacionadas
        const totalVagas = getCostCenterVagas(c).length;
        const abertas = getCostCenterOpenCount(c);
        const vagasCell = tr.querySelector('[data-role="cc-vagas"]');
        if (vagasCell) vagasCell.textContent = `${abertas}/${totalVagas}`;

        const statusHost = tr.querySelector('[data-role="cc-status-host"]');
        if (statusHost) statusHost.replaceChildren(buildStatusBadge(c.status));

        tr.querySelectorAll("button[data-act]").forEach(btn => {
            btn.dataset.id = c.id;
            btn.addEventListener("click", (ev) => {
                ev.preventDefault();
                const act = btn.dataset.act;
                if (act === "detail") openCostCenterDetail(c.id);
                if (act === "edit") openCostCenterModal("edit", c.id);
                if (act === "del") deleteCostCenter(c.id);
            });
        });

        tbody.appendChild(tr);
    });
}

function findCostCenter(id) {
    return state.centrosCustos.find(c => c.id === id) || null;
}

// ==============
// MODAL (CRUD)
// ==============

function openCostCenterModal(mode, id) {
    const modal = bootstrap.Modal.getOrCreateInstance($("#modalCostCenter"));
    const isEdit = mode === "edit";
    $("#modalCostCenterTitle").textContent = isEdit ? "Editar centro de custo" : "Novo centro de custo";

    if (isEdit) {
        const c = findCostCenter(id);
        if (!c) return;

        $("#ccId").value = c.id || "";
        $("#ccCodigo").value = c.codigo || "";
        $("#ccNome").value = c.nome || "";
        $("#ccStatus").value = c.status || "ativo";
        $("#ccDescricao").value = c.descricao || "";
        if ($("#ccGrupo")) $("#ccGrupo").value = c.grupo || "";
        if ($("#ccUnidade")) $("#ccUnidade").value = c.unidade || "";
    } else {
        $("#ccId").value = "";
        $("#ccCodigo").value = "";
        $("#ccNome").value = "";
        $("#ccStatus").value = "ativo";
        $("#ccDescricao").value = "";
        if ($("#ccGrupo")) $("#ccGrupo").value = "";
        if ($("#ccUnidade")) $("#ccUnidade").value = "";
    }

    modal.show();
}

function saveCostCenterFromModal() {
    const id = ($("#ccId").value || "").trim() || null;
    const codigo = ($("#ccCodigo").value || "").trim();
    const nome = ($("#ccNome").value || "").trim();
    const status = ($("#ccStatus").value || "ativo").trim();
    const descricao = ($("#ccDescricao").value || "").trim();
    const grupo = ($("#ccGrupo") ? ($("#ccGrupo").value || "").trim() : "");
    const unidade = ($("#ccUnidade") ? ($("#ccUnidade").value || "").trim() : "");

    if (!codigo || !nome) {
        toast("Informe código e nome do centro de custo.");
        return;
    }

    const now = new Date().toISOString();

    if (id) {
        const c = findCostCenter(id);
        if (!c) return;

        c.codigo = codigo;
        c.nome = nome;
        c.status = status;
        c.descricao = descricao;
        c.grupo = grupo;
        c.unidade = unidade;
        c.updatedAt = now;

        toast("Centro de custo atualizado.");
    } else {
        const c = {
            id: (typeof uid === "function" ? uid() : crypto.randomUUID()),
            codigo,
            nome,
            status,
            descricao,
            grupo,
            unidade,
            createdAt: now,
            updatedAt: now
        };
        state.centrosCustos.unshift(c);
        toast("Centro de custo criado.");
    }

    saveState();
    updateKpis();
    renderTable();
    bootstrap.Modal.getOrCreateInstance($("#modalCostCenter")).hide();
}

function deleteCostCenter(id) {
    const c = findCostCenter(id);
    if (!c) return;
    const ok = confirm(`Excluir o centro de custo "${c.nome}"?`);
    if (!ok) return;

    state.centrosCustos = state.centrosCustos.filter(x => x.id !== id);
    saveState();
    updateKpis();
    renderTable();
    toast("Centro de custo removido.");
}

// ==============
// DETALHES (modal)
// ==============
// Você pode reaproveitar seu padrão de modal de detalhes.
// Aqui fica um stub pronto (se você criar o modal #modalCostCenterDetalhes).

function openCostCenterDetail(id) {
    const c = findCostCenter(id);
    if (!c) return;

    const root = $("#modalCostCenterDetalhes");
    if (!root) {
        // se você ainda não criou o modal de detalhes, só abre o modal de edição
        openCostCenterModal("edit", id);
        return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(root);

    setText(root, "cc-name", c.nome || EMPTY_TEXT);
    setText(root, "cc-code", c.codigo || EMPTY_TEXT);
    setText(root, "cc-desc", c.descricao || EMPTY_TEXT);
    setText(root, "cc-group", c.grupo || EMPTY_TEXT);
    setText(root, "cc-unit", c.unidade || EMPTY_TEXT);

    const statusHost = root.querySelector('[data-role="cc-status-host"]');
    if (statusHost) statusHost.replaceChildren(buildStatusBadge(c.status));

    // opcional: vagas relacionadas
    const vagas = getCostCenterVagas(c);
    const countEl = $("#ccVagasCount");
    if (countEl) countEl.textContent = vagas.length;

    modal.show();
}

// ==============
// EXPORT CSV
// ==============

function exportCsv() {
    const headers = ["Codigo", "CentroDeCusto", "Status", "Grupo", "Unidade", "Descricao"];
    const rows = state.centrosCustos.map(c => [
        c.codigo, c.nome, c.status, c.grupo, c.unidade, c.descricao
    ]);

    const csv = [
        headers.map(h => `"${String(h).replaceAll('"', '""')}"`).join(";"),
        ...rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(";"))
    ].join("\r\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "centros_custo_liotecnica.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// ==============
// WIRES
// ==============

function wireFilters() {
    const apply = () => {
        state.filters.q = ($("#ccSearch").value || "").trim();
        state.filters.status = $("#ccStatusFilter").value || "all";
        renderTable();
    };

    $("#ccSearch").addEventListener("input", apply);
    $("#ccStatusFilter").addEventListener("change", apply);

    const global = $("#globalSearchCostCenter");
    if (global) {
        global.addEventListener("input", () => {
            $("#ccSearch").value = global.value;
            apply();
        });
    }
}

function wireButtons() {
    $("#btnNewCostCenter").addEventListener("click", () => openCostCenterModal("new"));
    $("#btnSaveCostCenter").addEventListener("click", saveCostCenterFromModal);

    $("#btnExportCostCenter").addEventListener("click", exportCsv);
}


// ==============
// INIT
// ==============
(function init() {
    const has = loadState();
    if (!has) seedIfEmpty();
    else seedIfEmpty(); // mantém o mesmo comportamento do seu JS de áreas

    updateKpis();
    renderTable();

    wireFilters();
    wireButtons();
})();
