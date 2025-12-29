const seed = window.__seedData || {};
// ========= Top matches (mock)
    const mockRows = Array.isArray(seed.dashboardRows) ? seed.dashboardRows : [];

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
      candidatos: { title: "Candidatos", sub: "Base de currículos e histórico por candidato." },
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
        $("#fVaga").value = "all";
        $("#fDe").value = "";
        $("#fAte").value = "";
        renderTable(0);
      });
    }

    // ========= Quick actions
    function wireQuickActions(){
      $("#btnMockCreateVaga").addEventListener("click", () => {
        // mock feedback
        alert("Vaga salva (mock). No backend: POST /vagas + requisitos.");
      });
    }

    // ========= Clock
    function wireClock(){
      const tick = () => {
        const d = new Date();
        $("#nowLabel").textContent = d.toLocaleString("pt-BR", {
          weekday:"short", day:"2-digit", month:"2-digit",
          hour:"2-digit", minute:"2-digit"
        });
      };
      tick();
      setInterval(tick, 1000 * 15);
    }

    // ========= Init
    (function init(){
      wireMenus();
      wireFilters();
      wireQuickActions();
      wireClock();

      renderTable(0);
      buildChart();

      const saved = localStorage.getItem("rh_active_menu") || "dashboard";
      setActiveMenu(saved);
    })();
