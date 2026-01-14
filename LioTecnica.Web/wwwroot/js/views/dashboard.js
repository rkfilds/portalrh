const seed = window.__seedData || {};
const EMPTY_TEXT = "-";
const AREAS_STORE_KEY = "lt_rh_areas_v1";

    function setText(root, role, value){
      if(!root) return;
      const el = root.querySelector(`[data-role="${role}"]`);
      if(!el) return;
      el.textContent = (value ?? EMPTY_TEXT);
    }

    function formatLocal(vaga){
      const parts = [vaga?.cidade, vaga?.uf].filter(Boolean);
      return parts.length ? parts.join(" - ") : EMPTY_TEXT;
    }

    function formatDate(iso){
      if(!iso) return EMPTY_TEXT;
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? EMPTY_TEXT : d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric" });
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

    function renderQuickAreaOptions(){
      const sel = $("#quickArea");
      if(!sel) return;
      sel.replaceChildren();
      sel.appendChild(buildOption("", "Selecionar area"));
      getAreaOptions().forEach(a => sel.appendChild(buildOption(a, a)));
    }

// ========= Top matches
    const mockRows = Array.isArray(seed.dashboardRows) ? seed.dashboardRows : [];

    function enumFirstCode(key, fallback){
      const list = getEnumOptions(key);
      return list.length ? list[0].code : fallback;
    }

    let VAGA_ALL = enumFirstCode("vagaFilterSimple", "all");

    function badgeEtapa(etapa){
      const map = {
        "Recebido": "secondary",
        "Triagem": "primary",
        "Em análise": "info",
        "Entrevista": "warning",
        "Aprovado": "success",
        "Reprovado": "danger"
      };
      const bs = map[etapa] ?? "primary";
      return `<span class="badge text-bg-${bs} rounded-pill">${etapa}</span>`;
    }

    function renderVagaFilterOptions(){
      const sel = $("#fVaga");
      if(!sel) return;
      const vagas = Array.isArray(seed.vagas) ? seed.vagas : [];
      const current = sel.value || VAGA_ALL;

      sel.replaceChildren();
      getEnumOptions("vagaFilterSimple").forEach(opt => {
        sel.appendChild(buildOption(opt.code, opt.text, opt.code === current));
      });
      vagas
        .slice()
        .sort((a,b)=> (a.titulo||"").localeCompare(b.titulo||""))
        .forEach(v => {
          sel.appendChild(buildOption(v.id, `${v.titulo || "-"} (${v.codigo || "-"})`, v.id === current));
        });

      sel.value = (current === VAGA_ALL || vagas.some(v => v.id === current)) ? current : VAGA_ALL;
    }

    function refreshEnumDefaults(){
      VAGA_ALL = enumFirstCode("vagaFilterSimple", "all");
    }

    function renderTable(minMatch=0){
      const body = $("#tblBody");
      body.innerHTML = "";

      mockRows
        .filter(x => x.match >= minMatch)
        .forEach(x => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>
              <div class="fw-semibold">${x.vaga}</div>
              <div class="text-muted small">Requisitos: palavras-chave + pesos</div>
            </td>
            <td>
              <div class="fw-semibold">${x.cand}</div>
              <div class="text-muted small">CV: PDF • 2 páginas</div>
            </td>
            <td>
              <span class="badge-soft"><i class="bi ${x.origem === "Email" ? "bi-envelope" : "bi-folder2"} me-1"></i>${x.origem}</span>
            </td>
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="progress flex-grow-1"><div class="progress-bar" style="width:${x.match}%"></div></div>
                <div class="fw-bold" style="min-width:44px;text-align:right;">${x.match}%</div>
              </div>
              <div class="text-muted small mt-1">Encontrou: 9 termos • Faltou: 1 obrigatório</div>
            </td>
            <td>${badgeEtapa(x.etapa)}</td>
            <td class="text-end">
              <button class="btn btn-ghost btn-sm" type="button"><i class="bi bi-eye me-1"></i>Ver</button>
              <button class="btn btn-brand btn-sm" type="button"><i class="bi bi-check2 me-1"></i>Triar</button>
            </td>
          `;
          body.appendChild(tr);
        });

      if(!body.children.length){
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="6" class="text-center text-muted py-4">Nenhum registro atende o filtro atual.</td>`;
        body.appendChild(tr);
      }
    }



    function getOpenVagas(){
      const vagas = Array.isArray(seed.vagas) ? seed.vagas : [];
      return vagas.filter(v => String(v.status || "").toLowerCase() === "aberta");
    }

    function goToVagaDetail(vagaId){
      if(!vagaId) return;
      const url = new URL("/Vagas", window.location.origin);
      url.searchParams.set("vagaId", vagaId);
      url.searchParams.set("open", "detail");
      window.location.href = url.toString();
    }

    function renderOpenVagasModal(){
      const tbody = $("#tblVagasAbertas");
      const count = $("#openVagaCount");
      if(!tbody) return;
      tbody.replaceChildren();
      const rows = getOpenVagas();
      if(count) count.textContent = rows.length;

      if(!rows.length){
        const empty = cloneTemplate("tpl-vaga-aberta-empty-row");
        if(empty) tbody.appendChild(empty);
        return;
      }

      rows
        .slice()
        .sort((a,b)=> (a.titulo||"").localeCompare(b.titulo||""))
        .forEach(v => {
          const tr = cloneTemplate("tpl-vaga-aberta-row");
          if(!tr) return;
          setText(tr, "vaga-code", v.codigo || EMPTY_TEXT);
          setText(tr, "vaga-title", v.titulo || EMPTY_TEXT);
          setText(tr, "vaga-desc", v.senioridade || EMPTY_TEXT);
          setText(tr, "vaga-area", v.area || EMPTY_TEXT);
          setText(tr, "vaga-modalidade", v.modalidade || EMPTY_TEXT);
          setText(tr, "vaga-local", formatLocal(v));
          setText(tr, "vaga-updated", formatDate(v.updatedAt));
          const btn = tr.querySelector('[data-act="open-vaga"]');
          if(btn) btn.addEventListener("click", () => goToVagaDetail(v.id));
          tbody.appendChild(tr);
        });
    }


    function updateDashboardKpis(){
      const openCount = getOpenVagas().length;
      const el = $("#kpiVagas");
      if(el) el.textContent = openCount;
    }

    function wireOpenVagasModal(){
      const modal = $("#modalVagasAbertas");
      if(!modal) return;
      modal.addEventListener("show.bs.modal", renderOpenVagasModal);
    }

    function wireKpiAccessibility(){
      document.addEventListener("keydown", (ev) => {
        if(ev.key !== "Enter" && ev.key !== " ") return;
        const card = ev.target.closest("[data-modal-target]");
        if(!card) return;
        const target = card.dataset.modalTarget;
        if(!target) return;
        ev.preventDefault();
        const modal = document.querySelector(target);
        if(modal) bootstrap.Modal.getOrCreateInstance(modal).show();
      });
    }

    // ========= Chart
    function buildChart(){
      const ctx = $("#chartRecebidos");
      const labels = Array.from({length: 14}, (_,i)=> {
        const d = new Date(); d.setDate(d.getDate() - (13-i));
        return d.toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" });
      });

      const data = Array.isArray(seed.dashboardSeries) && seed.dashboardSeries.length ? seed.dashboardSeries : [8,12,10,14,18,20,16,22,25,19,21,28,24,30];

      new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [{
            label: "CVs recebidos",
            data,
            tension: 0.35,
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: true }
          },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: "rgba(16,82,144,.10)" }, ticks: { precision: 0 } }
          }
        }
      });
    }

    // ========= Menu behavior (mock navigation)
    const menuMeta = {
      dashboard: { title: "Dashboard", sub: "Visão geral do dia: vagas, recebimentos e triagem." },
      vagas: { title: "Vagas", sub: "Criação, requisitos, pesos e controle total do funil." },
      candidatos: { title: "Candidatos", sub: "Base de currí­culos e histórico por candidato." },
      triagem: { title: "Triagem", sub: "Aprovar/reprovar e mover etapas com auditoria." },
      matching: { title: "Matching", sub: "Ajustes de palavras-chave, pesos e critérios obrigatórios." },
      entrada: { title: "Entrada (Email/Pasta)", sub: "Monitoramento de anexos e ingestão automática." },
      rm: { title: "RM Labore", sub: "Integração (fase 2): sincronizar vagas e requisitos." },
      relatorios: { title: "Relatórios", sub: "KPIs, produtividade do RH e exportações." },
      usuarios: { title: "Usuários & Perfis", sub: "Perfis (Admin/RH/Gestor) e permissões." },
      config: { title: "Configurações", sub: "Parâmetros do sistema, retention LGPD e integrações." }
    };

    function setActiveMenu(key){
      const meta = menuMeta[key] ?? menuMeta.dashboard;
      $("#pageH4").textContent = meta.title;
      $("#pageSub").textContent = meta.sub;

      $$(".sidebar .nav-link").forEach(a => a.classList.toggle("active", a.dataset.menu === key));
      // mobile list
      $$("#offcanvasSidebar [data-menu]").forEach(a => {
        a.classList.toggle("fw-semibold", a.dataset.menu === key);
      });

      localStorage.setItem("rh_active_menu", key);
    }

    function wireMenus(){
      const handler = (ev) => {
        const a = ev.target.closest("[data-menu]");
        if(!a) return;
        ev.preventDefault();
        setActiveMenu(a.dataset.menu);

        // auto-close mobile sidebar
        const off = bootstrap.Offcanvas.getInstance($("#offcanvasSidebar"));
        if(off) off.hide();
      };

      document.addEventListener("click", handler);
    }

    // ========= Filters drawer
    function wireFilters(){
      const range = $("#fMatchMin");
      const label = $("#matchMinLabel");
      label.textContent = range.value + "%";

      range.addEventListener("input", () => {
        label.textContent = range.value + "%";
      });

      $("#btnApplyFilters").addEventListener("click", () => {
        const min = parseInt(range.value, 10) || 0;
        renderTable(min);
        bootstrap.Offcanvas.getOrCreateInstance($("#drawerFilters")).hide();
      });

      $("#btnResetFilters").addEventListener("click", () => {
        range.value = 70;
        label.textContent = "70%";
        $("#fVaga").value = VAGA_ALL;
        $("#fDe").value = "";
        $("#fAte").value = "";
        renderTable(0);
      });
    }

    // ========= Quick actions
    function wireQuickActions(){
      $("#btnMockCreateVaga").addEventListener("click", () => {
        // mock feedback
        alert("Vaga salva. No backend: POST /vagas + requisitos.");
      });
      const drawer = $("#drawerQuick");
      if(drawer) drawer.addEventListener("show.bs.offcanvas", renderQuickAreaOptions);
    }

    // ========= Init
    (async function init(){
      await ensureEnumData();
      refreshEnumDefaults();
      applyEnumSelects();

      renderVagaFilterOptions();
      renderQuickAreaOptions();
      wireMenus();
      wireFilters();
      wireQuickActions();
      wireOpenVagasModal();
      wireKpiAccessibility();
      updateDashboardKpis();

      renderTable(0);
      buildChart();

      const saved = localStorage.getItem("rh_active_menu") || "dashboard";
      setActiveMenu(saved);
    })();

