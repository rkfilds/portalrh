// ========= Logo (embutido em Data URI - auto contido)
    // Observação: o arquivo fornecido veio como WebP (mesmo com nome .png).
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
function fmtStatus(s){
      const map = { aberta:"Aberta", pausada:"Pausada", fechada:"Fechada" };
      return map[s] || s;
    }

    function badgeStatus(s){
      const map = {
        aberta:  "success",
        pausada: "warning",
        fechada: "secondary"
      };
      const bs = map[s] || "primary";
      return `<span class="badge text-bg-${bs} rounded-pill">${fmtStatus(s)}</span>`;
    }
// ========= Storage
    const STORE_KEY = "lt_rh_vagas_v1";

    const state = {
      vagas: [],
      selectedId: null,
      filters: { q:"", status:"all", area:"all" }
    };

    function loadState(){
      try{
        const raw = localStorage.getItem(STORE_KEY);
        if(!raw) return false;
        const data = JSON.parse(raw);
        if(!data || !Array.isArray(data.vagas)) return false;
        state.vagas = data.vagas;
        state.selectedId = data.selectedId ?? null;
        return true;
      }catch{
        return false;
      }
    }

    function saveState(){
      localStorage.setItem(STORE_KEY, JSON.stringify({
        vagas: state.vagas,
        selectedId: state.selectedId
      }));
    }

    function seedIfEmpty(){
      if(state.vagas.length) return;

      const v1 = {
        id: uid(),
        codigo: "MKT-JR-001",
        titulo: "Analista de Marketing Jr",
        area: "Marketing",
        modalidade: "Híbrido",
        status: "aberta",
        cidade: "Embu das Artes",
        uf: "SP",
        senioridade: "Júnior",
        threshold: 70,
        descricao: "Apoiar campanhas, CRM e análises. Perfil analítico e mão na massa.",
        createdAt: new Date(Date.now() - 1000*60*60*24*4).toISOString(),
        updatedAt: new Date(Date.now() - 1000*60*60*6).toISOString(),
        weights: { competencia: 40, experiencia: 30, formacao: 15, localidade: 15 },
        requisitos: [
          { id: uid(), categoria:"Ferramenta/Tecnologia", termo:"Power BI", peso: 9, obrigatorio: true, sinonimos:["pbi","powerbi"], obs:"Dashboards e KPIs" },
          { id: uid(), categoria:"Competência", termo:"Google Analytics", peso: 7, obrigatorio: false, sinonimos:["ga4","analytics"], obs:"" },
          { id: uid(), categoria:"Experiência", termo:"Campanhas de performance", peso: 8, obrigatorio: true, sinonimos:["mídia paga","ads"], obs:"Meta/Google Ads" },
          { id: uid(), categoria:"Competência", termo:"Excel", peso: 6, obrigatorio: false, sinonimos:["planilhas"], obs:"" }
        ]
      };

      const v2 = {
        id: uid(),
        codigo: "QLD-PL-003",
        titulo: "Supervisor de Qualidade",
        area: "Qualidade",
        modalidade: "Presencial",
        status: "pausada",
        cidade: "Embu das Artes",
        uf: "SP",
        senioridade: "Gestão",
        threshold: 75,
        descricao: "Gestão da qualidade, auditorias e controle de processos.",
        createdAt: new Date(Date.now() - 1000*60*60*24*12).toISOString(),
        updatedAt: new Date(Date.now() - 1000*60*60*24*2).toISOString(),
        weights: { competencia: 35, experiencia: 40, formacao: 20, localidade: 5 },
        requisitos: [
          { id: uid(), categoria:"Certificação", termo:"BPF", peso: 8, obrigatorio: true, sinonimos:["boas práticas de fabricação"], obs:"" },
          { id: uid(), categoria:"Experiência", termo:"Auditoria interna", peso: 8, obrigatorio: true, sinonimos:["auditorias"], obs:"" },
          { id: uid(), categoria:"Formação", termo:"Engenharia de Alimentos", peso: 7, obrigatorio: false, sinonimos:["alimentos"], obs:"" }
        ]
      };

      const v3 = {
        id: uid(),
        codigo: "TI-PL-010",
        titulo: "Analista de Dados (BI)",
        area: "TI",
        modalidade: "Remoto",
        status: "aberta",
        cidade: "",
        uf: "",
        senioridade: "Pleno",
        threshold: 80,
        descricao: "Modelagem e criação de dashboards. Integrações e rotinas de dados.",
        createdAt: new Date(Date.now() - 1000*60*60*24*2).toISOString(),
        updatedAt: new Date(Date.now() - 1000*60*60*24*1).toISOString(),
        weights: { competencia: 45, experiencia: 35, formacao: 10, localidade: 10 },
        requisitos: [
          { id: uid(), categoria:"Ferramenta/Tecnologia", termo:"SQL", peso: 10, obrigatorio: true, sinonimos:["postgres","t-sql"], obs:"" },
          { id: uid(), categoria:"Ferramenta/Tecnologia", termo:"ETL", peso: 7, obrigatorio: false, sinonimos:["pipelines"], obs:"" },
          { id: uid(), categoria:"Competência", termo:"Modelagem dimensional", peso: 8, obrigatorio: true, sinonimos:["star schema"], obs:"" }
        ]
      };

      state.vagas = [v1, v2, v3];
      state.selectedId = v1.id;
      saveState();
    }

    // ========= Rendering
    function updateKpis(){
      const total = state.vagas.length;
      const abertas = state.vagas.filter(v => v.status === "aberta").length;
      const pausadas = state.vagas.filter(v => v.status === "pausada").length;
      const fechadas = state.vagas.filter(v => v.status === "fechada").length;

      $("#kpiTotal").textContent = total;
      $("#kpiAbertas").textContent = abertas;
      $("#kpiPausadas").textContent = pausadas;
      $("#kpiFechadas").textContent = fechadas;
    }

    function distinctAreas(){
      const set = new Set(state.vagas.map(v => v.area).filter(Boolean));
      return Array.from(set).sort((a,b)=>a.localeCompare(b,"pt-BR"));
    }

    function renderAreaFilter(){
      const areas = distinctAreas();
      const sel = $("#fArea");
      const cur = sel.value || "all";
      sel.innerHTML = `<option value="all">Área: todas</option>` + areas.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");
      sel.value = areas.includes(cur) ? cur : "all";
    }

    function getFilteredVagas(){
      const q = (state.filters.q || "").trim().toLowerCase();
      const st = state.filters.status;
      const ar = state.filters.area;

      return state.vagas.filter(v => {
        if(st !== "all" && v.status !== st) return false;
        if(ar !== "all" && (v.area || "") !== ar) return false;

        if(!q) return true;

        const blob = [
          v.codigo, v.titulo, v.area, v.modalidade, v.cidade, v.uf, v.senioridade
        ].join(" ").toLowerCase();

        return blob.includes(q);
      });
    }

    function renderList(){
      const tbody = $("#tblVagas");
      tbody.innerHTML = "";

      const rows = getFilteredVagas();
      if(!rows.length){
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhuma vaga encontrada com os filtros atuais.</td></tr>`;
        return;
      }

      rows.forEach(v => {
        const reqTotal = (v.requisitos || []).length;
        const reqObrig = (v.requisitos || []).filter(r => !!r.obrigatorio).length;
        const isSel = v.id === state.selectedId;

        const tr = document.createElement("tr");
        tr.style.cursor = "default";
        tr.className = isSel ? "table-active" : "";
        tr.innerHTML = `
          <td>
            <div class="fw-bold">${escapeHtml(v.titulo || "—")}</div>
            <div class="text-muted small">
              <span class="mono">${escapeHtml(v.codigo || "—")}</span>
              <span class="mx-2">•</span>
              <span>${escapeHtml(v.modalidade || "—")}</span>
              ${v.cidade || v.uf ? `<span class="mx-2">•</span><span>${escapeHtml([v.cidade, v.uf].filter(Boolean).join(" - "))}</span>` : ""}
            </div>
          </td>
          <td class="nowrap">${badgeStatus(v.status)}</td>
          <td class="nowrap">${escapeHtml(v.area || "—")}</td>
          <td class="nowrap">
            <span class="req-chip">${reqTotal} total</span>
            <span class="req-chip mandatory ms-1">${reqObrig} obrig.</span>
          </td>
          <td class="nowrap">
            <span class="badge-soft"><i class="bi bi-stars me-1"></i>${clamp(parseInt(v.threshold ?? 0,10)||0,0,100)}%</span>
          </td>
          <td class="text-end nowrap">
            <button class="btn btn-ghost btn-sm me-1" data-act="detail" data-id="${v.id}">
              <i class="bi bi-layout-text-window me-1"></i>Detalhes
            </button>
            <button class="btn btn-ghost btn-sm me-1" data-act="edit" data-id="${v.id}">
              <i class="bi bi-pencil me-1"></i>Editar
            </button>
            <button class="btn btn-ghost btn-sm me-1" data-act="dup" data-id="${v.id}" title="Duplicar">
              <i class="bi bi-copy"></i>
            </button>
            <button class="btn btn-ghost btn-sm text-danger" data-act="del" data-id="${v.id}" title="Excluir">
              <i class="bi bi-trash3"></i>
            </button>
          </td>
        `;

        tr.addEventListener("click", (ev) => {
          const btn = ev.target.closest("button[data-act]");
          if(btn){
            ev.preventDefault();
            ev.stopPropagation();
            const act = btn.dataset.act;
            const id = btn.dataset.id;
            if(act === "detail") openDetailModal(id);
            if(act === "edit") openVagaModal("edit", id);
            if(act === "dup") duplicateVaga(id);
            if(act === "del") deleteVaga(id);
            return;
          }
        });

        tbody.appendChild(tr);
      });
    }

    function findVaga(id){
      return state.vagas.find(v => v.id === id) || null;
    }

    function selectVaga(id){
      state.selectedId = id;
      saveState();
      renderList();
      renderDetail();
    }

    function openDetailModal(id){
      selectVaga(id);
      const modal = bootstrap.Modal.getOrCreateInstance($("#modalVagaDetalhes"));
      modal.show();
    }

    // ========= Detail UI
    function buildDetailHtml(v){
      if(!v){
        return `
          <div class="detail-empty">
            <div class="d-flex align-items-start gap-2">
              <i class="bi bi-info-circle mt-1"></i>
              <div>
                <div class="fw-bold">Selecione uma vaga</div>
                <div class="small mt-1">
                  Use o botao Detalhes na lista para editar requisitos (pesos/obrigatorios), definir o match minimo e simular aderencia.
                </div>
              </div>
            </div>
          </div>
        `;
      }

      const reqTotal = (v.requisitos || []).length;
      const reqObrig = (v.requisitos || []).filter(r => !!r.obrigatorio).length;

      const updated = v.updatedAt ? new Date(v.updatedAt) : null;
      const updatedTxt = updated ? updated.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";

      const weights = v.weights || { competencia:40, experiencia:30, formacao:15, localidade:15 };
      const sumW = (weights.competencia||0) + (weights.experiencia||0) + (weights.formacao||0) + (weights.localidade||0);

      return `
        <div class="card-soft p-3">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
            <div>
              <p class="mini-title mb-1">Detalhes</p>
              <div class="fw-bold" style="font-size: 1.05rem;">${escapeHtml(v.titulo || "—")}</div>
              <div class="text-muted small">
                <span class="mono">${escapeHtml(v.codigo || "—")}</span>
                <span class="mx-2">•</span>
                <span>${escapeHtml(v.area || "—")}</span>
                <span class="mx-2">•</span>
                <span>${escapeHtml(v.modalidade || "—")}</span>
              </div>
            </div>

            <div class="text-end">
              <div class="mb-1">${badgeStatus(v.status)}</div>
              <div class="text-muted small">Atualizado: ${escapeHtml(updatedTxt)}</div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="req-chip"><i class="bi bi-list-check me-1"></i>${reqTotal} requisitos</span>
            <span class="req-chip mandatory"><i class="bi bi-exclamation-triangle me-1"></i>${reqObrig} obrigatórios</span>
            <span class="badge-soft"><i class="bi bi-stars me-1"></i>Match mín.: ${clamp(parseInt(v.threshold ?? 0,10)||0,0,100)}%</span>
          </div>

          <ul class="nav nav-pills gap-2 mb-3" id="detailTabs" role="tablist" style="background: rgba(173,200,220,.16); padding: .35rem; border-radius: 999px; border: 1px solid rgba(16,82,144,.14);">
            <li class="nav-item" role="presentation">
              <button class="nav-link active rounded-pill" data-bs-toggle="pill" data-bs-target="#tabResumo" type="button" role="tab">
                <i class="bi bi-card-text me-1"></i>Resumo
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link rounded-pill" data-bs-toggle="pill" data-bs-target="#tabReq" type="button" role="tab">
                <i class="bi bi-list-check me-1"></i>Requisitos
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link rounded-pill" data-bs-toggle="pill" data-bs-target="#tabMatch" type="button" role="tab">
                <i class="bi bi-sliders me-1"></i>Pesos & Match
              </button>
            </li>
          </ul>

          <div class="tab-content">
            <!-- RESUMO -->
            <div class="tab-pane fade show active" id="tabResumo" role="tabpanel">
              <div class="mb-2">
                <div class="fw-semibold">Descrição</div>
                <div class="text-muted small">${escapeHtml(v.descricao || "—")}</div>
              </div>

              <div class="row g-2">
                <div class="col-12 col-md-6">
                  <div class="card-soft p-2" style="box-shadow:none;">
                    <div class="small text-muted">Local</div>
                    <div class="fw-semibold">${escapeHtml([v.cidade, v.uf].filter(Boolean).join(" - ") || "—")}</div>
                  </div>
                </div>
                <div class="col-12 col-md-6">
                  <div class="card-soft p-2" style="box-shadow:none;">
                    <div class="small text-muted">Senioridade</div>
                    <div class="fw-semibold">${escapeHtml(v.senioridade || "—")}</div>
                  </div>
                </div>
              </div>

              <div class="d-flex flex-wrap gap-2 mt-3">
                <button class="btn btn-ghost btn-sm" type="button" data-dact="editvaga">
                  <i class="bi bi-pencil me-1"></i>Editar vaga
                </button>
                <button class="btn btn-ghost btn-sm" type="button" data-dact="duplicate">
                  <i class="bi bi-copy me-1"></i>Duplicar
                </button>
                <button class="btn btn-ghost btn-sm text-danger" type="button" data-dact="delete">
                  <i class="bi bi-trash3 me-1"></i>Excluir
                </button>
              </div>
            </div>

            <!-- REQUISITOS -->
            <div class="tab-pane fade" id="tabReq" role="tabpanel">
              <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
                <div>
                  <div class="fw-semibold">Requisitos</div>
                  <div class="text-muted small">Peso (0–10) + flag de obrigatório.</div>
                </div>
                <button class="btn btn-brand btn-sm" type="button" data-dact="addreq">
                  <i class="bi bi-plus-lg me-1"></i>Novo requisito
                </button>
              </div>

              <div class="input-group mb-2">
                <span class="input-group-text" style="border-color:var(--lt-border); background: rgba(255,255,255,.65);">
                  <i class="bi bi-search"></i>
                </span>
                <input class="form-control" id="reqSearch" placeholder="Filtrar requisitos..." style="border-color:var(--lt-border);">
              </div>

              <div class="table-responsive">
                <table class="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th style="min-width: 110px;">Obrig.</th>
                      <th style="min-width: 150px;">Categoria</th>
                      <th style="min-width: 220px;">Termo</th>
                      <th style="min-width: 110px;">Peso</th>
                      <th style="min-width: 220px;">Sinônimos</th>
                      <th class="text-end" style="min-width: 120px;">Ações</th>
                    </tr>
                  </thead>
                  <tbody id="tblReq"></tbody>
                </table>
              </div>

              <div class="small text-muted mt-2">
                Regras (MVP): score = soma(pesos encontrados) / soma(pesos totais) * 100.
                Itens <strong>obrigatórios</strong> podem aplicar penalidade se ausentes.
              </div>
            </div>

            <!-- PESOS & MATCH -->
            <div class="tab-pane fade" id="tabMatch" role="tabpanel">
              <div class="fw-semibold mb-1">Match mínimo</div>
              <div class="d-flex align-items-center gap-2">
                <input type="range" class="form-range" min="0" max="100" value="${clamp(parseInt(v.threshold ?? 0,10)||0,0,100)}" id="thresholdRange">
                <span class="badge-soft" style="min-width:74px;text-align:center;" id="thresholdLabel">${clamp(parseInt(v.threshold ?? 0,10)||0,0,100)}%</span>
              </div>
              <div class="text-muted small mb-3">Use isso como “corte” para triagem automática.</div>

              <div class="fw-semibold mb-2">Pesos por categoria (soma ideal = 100)</div>

              ${weightRow("Competência", "competencia", weights.competencia ?? 0)}
              ${weightRow("Experiência", "experiencia", weights.experiencia ?? 0)}
              ${weightRow("Formação", "formacao", weights.formacao ?? 0)}
              ${weightRow("Localidade", "localidade", weights.localidade ?? 0)}

              <div class="d-flex align-items-center justify-content-between mt-3">
                <span class="badge-soft">Soma atual: <span id="weightsSum">${sumW}</span></span>
                <button class="btn btn-brand btn-sm" type="button" data-dact="saveWeights">
                  <i class="bi bi-check2 me-1"></i>Salvar
                </button>
              </div>

              <hr class="my-3">

              <div class="fw-semibold mb-1">Simulador rápido (MVP)</div>
              <div class="text-muted small mb-2">Cole um texto (currículo em texto) e veja o match estimado por palavras-chave.</div>
              <textarea class="form-control mb-2" id="simText" rows="5" placeholder="Cole aqui o texto do CV (extraído do PDF/DOCX)..."></textarea>
              <div class="d-flex gap-2">
                <button class="btn btn-ghost btn-sm" type="button" data-dact="simulate">
                  <i class="bi bi-play-circle me-1"></i>Simular
                </button>
                <button class="btn btn-ghost btn-sm" type="button" data-dact="simClear">
                  <i class="bi bi-eraser me-1"></i>Limpar
                </button>
              </div>

              <div class="mt-2" id="simResult"></div>
            </div>
          </div>
        </div>
      `;
    }

    function weightRow(label, key, value){
      value = clamp(parseInt(value,10)||0, 0, 100);
      const id = "w_" + key;
      return `
        <div class="mb-2">
          <div class="d-flex align-items-center justify-content-between">
            <div class="text-muted small">${escapeHtml(label)}</div>
            <div class="mono small"><span id="${id}_val">${value}</span>%</div>
          </div>
          <input type="range" class="form-range" min="0" max="100" value="${value}" id="${id}">
        </div>
      `;
    }

    function renderDetail(){
      const v = findVaga(state.selectedId);
      $("#detailHost").innerHTML = buildDetailHtml(v);

      // bind detail actions + render req table + bind sliders
      bindDetailActions(v);
      renderReqTable(v);
    }

    function bindDetailActions(v){
      if(!v) return;

      // detail buttons
      $$("#detailHost [data-dact]").forEach(btn => {
        btn.addEventListener("click", () => {
          const act = btn.dataset.dact;
          if(act === "editvaga") openVagaModal("edit", v.id);
          if(act === "duplicate") duplicateVaga(v.id);
          if(act === "delete") deleteVaga(v.id);
          if(act === "addreq") openReqModal("new", v.id);
          if(act === "saveWeights") saveWeightsFromDetail(v.id);
          if(act === "simulate") simulateMatch(v.id);
          if(act === "simClear") clearSimulation();
        });
      });

      // threshold
      const r = $("#detailHost #thresholdRange");
      const lbl = $("#detailHost #thresholdLabel");
      if(r && lbl){
        r.addEventListener("input", () => {
          lbl.textContent = clamp(parseInt(r.value,10)||0,0,100) + "%";
        });
      }

      // weights
      ["competencia","experiencia","formacao","localidade"].forEach(k => {
        const slider = $("#detailHost #w_" + k);
        const val = $("#detailHost #w_" + k + "_val");
        if(slider && val){
          slider.addEventListener("input", () => {
            val.textContent = slider.value;
            updateWeightsSumInDetail();
          });
        }
      });

      // req search
      const reqSearch = $("#detailHost #reqSearch");
      if(reqSearch){
        reqSearch.addEventListener("input", () => renderReqTable(v));
      }
    }

    function updateWeightsSumInDetail(){
      const keys = ["competencia","experiencia","formacao","localidade"];
      let sum = 0;
      keys.forEach(k => {
        const slider = $("#detailHost #w_" + k);
        sum += (slider ? parseInt(slider.value,10) : 0) || 0;
      });
      const sumEl = $("#detailHost #weightsSum");
      if(sumEl) sumEl.textContent = sum;
    }

    function renderReqTable(v){
      const tbody = $("#detailHost #tblReq");
      if(!tbody) return;

      tbody.innerHTML = "";
      const reqs = (v?.requisitos || []);

      const q = ($("#detailHost #reqSearch")?.value || "").trim().toLowerCase();
      const filtered = !q ? reqs : reqs.filter(r => {
        const blob = [r.categoria, r.termo, (r.sinonimos||[]).join(" "), r.obs].join(" ").toLowerCase();
        return blob.includes(q);
      });

      if(!filtered.length){
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">Nenhum requisito.</td></tr>`;
        return;
      }

      filtered.forEach(r => {
        const syn = (r.sinonimos || []).join(", ");
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td class="nowrap">
            <div class="form-check form-switch m-0">
              <input class="form-check-input" type="checkbox" ${r.obrigatorio ? "checked" : ""} data-ract="toggle" data-rid="${r.id}">
            </div>
          </td>
          <td>${escapeHtml(r.categoria || "—")}</td>
          <td>
            <div class="fw-semibold">${escapeHtml(r.termo || "—")}</div>
            ${r.obs ? `<div class="text-muted small">${escapeHtml(r.obs)}</div>` : `<div class="text-muted small">—</div>`}
          </td>
          <td class="nowrap">
            <span class="badge-soft">${clamp(parseInt(r.peso ?? 0,10)||0,0,10)}</span>
          </td>
          <td>${escapeHtml(syn || "—")}</td>
          <td class="text-end nowrap">
            <button class="btn btn-ghost btn-sm me-1" data-ract="edit" data-rid="${r.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-ghost btn-sm text-danger" data-ract="del" data-rid="${r.id}">
              <i class="bi bi-trash3"></i>
            </button>
          </td>
        `;

        tr.querySelectorAll("[data-ract]").forEach(el => {
          el.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            const act = el.dataset.ract;
            const rid = el.dataset.rid;
            if(act === "toggle") toggleReqMandatory(v.id, rid);
            if(act === "edit") openReqModal("edit", v.id, rid);
            if(act === "del") deleteReq(v.id, rid);
          });
        });

        tbody.appendChild(tr);
      });
    }

    
    // ========= CRUD: Vagas
    function openVagaModal(mode, id){
      const modal = bootstrap.Modal.getOrCreateInstance($("#modalVaga"));
      const isEdit = mode === "edit";
      $("#modalVagaTitle").textContent = isEdit ? "Editar vaga" : "Nova vaga";

      if(isEdit){
        const v = findVaga(id);
        if(!v) return;
        $("#vagaId").value = v.id;
        $("#vagaCodigo").value = v.codigo || "";
        $("#vagaTitulo").value = v.titulo || "";
        $("#vagaArea").value = v.area || "";
        $("#vagaModalidade").value = v.modalidade || "Presencial";
        $("#vagaStatus").value = v.status || "";
        $("#vagaCidade").value = v.cidade || "";
        $("#vagaUF").value = v.uf || "";
        $("#vagaSenioridade").value = v.senioridade || "Júnior";
        $("#vagaThreshold").value = clamp(parseInt(v.threshold ?? 70,10)||70, 0, 100);
        $("#vagaDescricao").value = v.descricao || "";
      }else{
        $("#vagaId").value = "";
        $("#vagaCodigo").value = "";
        $("#vagaTitulo").value = "";
        $("#vagaArea").value = "";
        $("#vagaModalidade").value = "Presencial";
        $("#vagaStatus").value = "aberta";
        $("#vagaCidade").value = "";
        $("#vagaUF").value = "SP";
        $("#vagaSenioridade").value = "Júnior";
        $("#vagaThreshold").value = 70;
        $("#vagaDescricao").value = "";
      }

      modal.show();
    }

    function upsertVagaFromModal(){
      const id = $("#vagaId").value || null;
      const codigo = ($("#vagaCodigo").value || "").trim();
      const titulo = ($("#vagaTitulo").value || "").trim();
      const area = ($("#vagaArea").value || "").trim();
      const modalidade = ($("#vagaModalidade").value || "").trim();
      const status = ($("#vagaStatus").value || "").trim();
      const cidade = ($("#vagaCidade").value || "").trim();
      const uf = ($("#vagaUF").value || "").trim().toUpperCase().slice(0,2);
      const senioridade = ($("#vagaSenioridade").value || "").trim();
      const threshold = clamp(parseInt($("#vagaThreshold").value,10)||70, 0, 100);
      const descricao = ($("#vagaDescricao").value || "").trim();

      // validação mínima
      if(!titulo){
        toast("Informe o título da vaga.");
        return;
      }
      if(!area){
        toast("Selecione a área da vaga.");
        return;
      }
      if(!status){
        toast("Selecione o status da vaga.");
        return;
      }

      const now = new Date().toISOString();

      if(id){
        const v = findVaga(id);
        if(!v) return;

        v.codigo = codigo;
        v.titulo = titulo;
        v.area = area;
        v.modalidade = modalidade;
        v.status = status;
        v.cidade = cidade;
        v.uf = uf;
        v.senioridade = senioridade;
        v.threshold = threshold;
        v.descricao = descricao;
        v.updatedAt = now;

        toast("Vaga atualizada.");
        state.selectedId = v.id;
      }else{
        const v = {
          id: uid(),
          codigo,
          titulo,
          area,
          modalidade,
          status,
          cidade,
          uf,
          senioridade,
          threshold,
          descricao,
          createdAt: now,
          updatedAt: now,
          weights: { competencia:40, experiencia:30, formacao:15, localidade:15 },
          requisitos: []
        };
        state.vagas.unshift(v);
        state.selectedId = v.id;
        toast("Vaga criada.");
      }

      saveState();
      renderAreaFilter();
      updateKpis();
      renderList();
      renderDetail();

      bootstrap.Modal.getOrCreateInstance($("#modalVaga")).hide();
    }

    function deleteVaga(id){
      const v = findVaga(id);
      if(!v) return;

      const ok = confirm(`Excluir a vaga "${v.titulo}"?\n\nIsso remove também os requisitos.`);
      if(!ok) return;

      state.vagas = state.vagas.filter(x => x.id !== id);
      if(state.selectedId === id){
        state.selectedId = state.vagas[0]?.id || null;
      }
      saveState();
      renderAreaFilter();
      updateKpis();
      renderList();
      renderDetail();
      toast("Vaga excluída.");
    }

    function duplicateVaga(id){
      const v = findVaga(id);
      if(!v) return;

      const now = new Date().toISOString();
      const copy = JSON.parse(JSON.stringify(v));
      copy.id = uid();
      copy.codigo = (v.codigo ? v.codigo + "-COPY" : "");
      copy.titulo = (v.titulo ? v.titulo + " (Cópia)" : "Cópia");
      copy.createdAt = now;
      copy.updatedAt = now;
      // novos ids de requisitos
      (copy.requisitos || []).forEach(r => r.id = uid());

      state.vagas.unshift(copy);
      state.selectedId = copy.id;
      saveState();
      renderAreaFilter();
      updateKpis();
      renderList();
      renderDetail();
      toast("Vaga duplicada.");
    }

    // ========= CRUD: Requisitos
    function openReqModal(mode, vagaId, reqId){
      const v = findVaga(vagaId);
      if(!v) return;

      const modal = bootstrap.Modal.getOrCreateInstance($("#modalReq"));
      const isEdit = mode === "edit";

      $("#modalReqTitle").textContent = isEdit ? "Editar requisito" : "Novo requisito";
      $("#reqId").value = "";

      if(isEdit){
        const r = (v.requisitos || []).find(x => x.id === reqId);
        if(!r) return;

        $("#reqId").value = r.id;
        $("#reqCategoria").value = r.categoria || "Competência";
        $("#reqPeso").value = clamp(parseInt(r.peso ?? 0,10)||0, 0, 10);
        $("#reqObrigatorio").checked = !!r.obrigatorio;
        $("#reqTermo").value = r.termo || "";
        $("#reqSinonimos").value = (r.sinonimos || []).join(", ");
        $("#reqObs").value = r.obs || "";
      }else{
        $("#reqCategoria").value = "Competência";
        $("#reqPeso").value = 7;
        $("#reqObrigatorio").checked = false;
        $("#reqTermo").value = "";
        $("#reqSinonimos").value = "";
        $("#reqObs").value = "";
      }

      // guarda vaga atual no dataset do botão salvar
      $("#btnSaveReq").dataset.vagaId = vagaId;

      modal.show();
    }

    function saveReqFromModal(){
      const vagaId = $("#btnSaveReq").dataset.vagaId;
      const v = findVaga(vagaId);
      if(!v) return;

      const rid = $("#reqId").value || null;
      const categoria = ($("#reqCategoria").value || "").trim();
      const peso = clamp(parseInt($("#reqPeso").value,10)||0, 0, 10);
      const obrigatorio = !!$("#reqObrigatorio").checked;
      const termo = ($("#reqTermo").value || "").trim();
      const sinonimos = ($("#reqSinonimos").value || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
      const obs = ($("#reqObs").value || "").trim();

      if(!termo){
        toast("Informe a palavra-chave/termo do requisito.");
        return;
      }

      if(rid){
        const r = (v.requisitos || []).find(x => x.id === rid);
        if(!r) return;

        r.categoria = categoria;
        r.peso = peso;
        r.obrigatorio = obrigatorio;
        r.termo = termo;
        r.sinonimos = sinonimos;
        r.obs = obs;
        toast("Requisito atualizado.");
      }else{
        v.requisitos = v.requisitos || [];
        v.requisitos.push({
          id: uid(),
          categoria,
          peso,
          obrigatorio,
          termo,
          sinonimos,
          obs
        });
        toast("Requisito adicionado.");
      }

      v.updatedAt = new Date().toISOString();
      saveState();
      renderList();
      renderDetail();
      bootstrap.Modal.getOrCreateInstance($("#modalReq")).hide();
    }

    function deleteReq(vagaId, reqId){
      const v = findVaga(vagaId);
      if(!v) return;

      const r = (v.requisitos || []).find(x => x.id === reqId);
      if(!r) return;

      const ok = confirm(`Excluir requisito "${r.termo}"?`);
      if(!ok) return;

      v.requisitos = (v.requisitos || []).filter(x => x.id !== reqId);
      v.updatedAt = new Date().toISOString();
      saveState();
      renderList();
      renderDetail();
      toast("Requisito removido.");
    }

    function toggleReqMandatory(vagaId, reqId){
      const v = findVaga(vagaId);
      if(!v) return;
      const r = (v.requisitos || []).find(x => x.id === reqId);
      if(!r) return;

      r.obrigatorio = !r.obrigatorio;
      v.updatedAt = new Date().toISOString();
      saveState();
      renderList();
      renderDetail();
      toast(r.obrigatorio ? "Requisito marcado como obrigatório." : "Requisito marcado como não obrigatório.");
    }

    // ========= Pesos/Threshold
    function saveWeightsFromDetail(vagaId, fromMobile=false){
      const v = findVaga(vagaId);
      if(!v) return;

      const root = fromMobile ? $("#mobileDetailBody") : $("#detailHost");
      const threshold = clamp(parseInt(root.querySelector("#thresholdRange")?.value || "0",10) || 0, 0, 100);

      const w = {
        competencia: clamp(parseInt(root.querySelector("#w_competencia")?.value || "0",10) || 0, 0, 100),
        experiencia: clamp(parseInt(root.querySelector("#w_experiencia")?.value || "0",10) || 0, 0, 100),
        formacao: clamp(parseInt(root.querySelector("#w_formacao")?.value || "0",10) || 0, 0, 100),
        localidade: clamp(parseInt(root.querySelector("#w_localidade")?.value || "0",10) || 0, 0, 100)
      };

      v.threshold = threshold;
      v.weights = w;
      v.updatedAt = new Date().toISOString();

      saveState();
      renderList();
      renderDetail();
      toast("Pesos e match mínimo salvos.");
    }

    // ========= Simulador (keyword match)
function simulateMatch(vagaId, fromMobile=false){
      const v = findVaga(vagaId);
      if(!v) return;

      const root = fromMobile ? $("#mobileDetailBody") : $("#detailHost");
      const area = root.querySelector("#simResult");
      const text = normalizeText(root.querySelector("#simText")?.value || "");
      const reqs = v.requisitos || [];

      if(!text){
        area.innerHTML = `<div class="alert alert-warning" style="border-radius:14px;">Cole um texto para simular.</div>`;
        return;
      }
      if(!reqs.length){
        area.innerHTML = `<div class="alert alert-info" style="border-radius:14px;">Cadastre requisitos antes de simular.</div>`;
        return;
      }

      const totalPeso = reqs.reduce((acc, r)=> acc + clamp(parseInt(r.peso||0,10)||0,0,10), 0) || 1;
      let hitPeso = 0;

      const hits = [];
      const missMandatory = [];

      reqs.forEach(r => {
        const termo = normalizeText(r.termo || "");
        const syns = (r.sinonimos || []).map(normalizeText).filter(Boolean);
        const bag = [termo, ...syns].filter(Boolean);

        const found = bag.some(t => t && text.includes(t));
        const p = clamp(parseInt(r.peso||0,10)||0,0,10);

        if(found){
          hitPeso += p;
          hits.push(r);
        }else if(r.obrigatorio){
          missMandatory.push(r);
        }
      });

      let score = Math.round((hitPeso / totalPeso) * 100);
      // penalidade simples por obrigatórios faltando (MVP)
      if(missMandatory.length){
        score = Math.max(0, score - Math.min(40, missMandatory.length * 15));
      }

      const pass = score >= clamp(parseInt(v.threshold||0,10)||0,0,100);

      area.innerHTML = `
        <div class="card-soft p-3" style="box-shadow:none;">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <div class="fw-bold">Resultado da simulação</div>
              <div class="text-muted small">Score por palavras-chave (MVP)</div>
            </div>
            <span class="badge text-bg-${pass ? "success" : "danger"} rounded-pill">
              ${pass ? "Dentro" : "Fora"} do match mínimo
            </span>
          </div>

          <div class="mt-2">
            <div class="d-flex align-items-center gap-2">
              <div class="progress flex-grow-1"><div class="progress-bar" style="width:${score}%"></div></div>
              <div class="fw-bold" style="min-width:54px;text-align:right;">${score}%</div>
            </div>
            <div class="text-muted small mt-1">
              Match mínimo da vaga: <strong>${clamp(parseInt(v.threshold||0,10)||0,0,100)}%</strong>
              • Encontrados: <strong>${hits.length}</strong>
              • Obrigatórios faltando: <strong>${missMandatory.length}</strong>
            </div>
          </div>

          ${missMandatory.length ? `
            <div class="alert alert-danger mt-3 mb-0" style="border-radius:14px;">
              <div class="fw-semibold mb-1"><i class="bi bi-exclamation-triangle me-1"></i>Obrigatórios não encontrados</div>
              <div class="small">${missMandatory.map(r => escapeHtml(r.termo)).join(", ")}</div>
            </div>
          ` : ""}

          <div class="mt-3">
            <div class="fw-semibold mb-1">Encontrados</div>
            <div class="small text-muted">${hits.length ? hits.map(r => escapeHtml(r.termo)).join(", ") : "—"}</div>
          </div>
        </div>
      `;
    }

    function clearSimulation(fromMobile=false){
      const root = fromMobile ? $("#mobileDetailBody") : $("#detailHost");
      const ta = root.querySelector("#simText");
      const res = root.querySelector("#simResult");
      if(ta) ta.value = "";
      if(res) res.innerHTML = "";
    }

    // ========= Import/Export
    function exportJson(){
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        vagas: state.vagas
      };
      const json = JSON.stringify(payload, null, 2);
      // download client-side
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vagas_mvp_liotecnica.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Exportação iniciada.");
    }

    function importJson(){
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "application/json";
      inp.onchange = () => {
        const file = inp.files && inp.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          try{
            const data = JSON.parse(reader.result);
            if(!data || !Array.isArray(data.vagas)) throw new Error("Formato inválido.");
            // validação simples
            state.vagas = data.vagas.map(v => ({
              id: v.id || uid(),
              codigo: v.codigo || "",
              titulo: v.titulo || "",
              area: v.area || "",
              modalidade: v.modalidade || "Presencial",
              status: v.status || "aberta",
              cidade: v.cidade || "",
              uf: v.uf || "",
              senioridade: v.senioridade || "Júnior",
              threshold: clamp(parseInt(v.threshold ?? 70,10)||70,0,100),
              descricao: v.descricao || "",
              createdAt: v.createdAt || new Date().toISOString(),
              updatedAt: v.updatedAt || new Date().toISOString(),
              weights: v.weights || { competencia:40, experiencia:30, formacao:15, localidade:15 },
              requisitos: Array.isArray(v.requisitos) ? v.requisitos.map(r => ({
                id: r.id || uid(),
                categoria: r.categoria || "Competência",
                termo: r.termo || "",
                peso: clamp(parseInt(r.peso ?? 0,10)||0,0,10),
                obrigatorio: !!r.obrigatorio,
                sinonimos: Array.isArray(r.sinonimos) ? r.sinonimos : [],
                obs: r.obs || ""
              })) : []
            }));

            state.selectedId = state.vagas[0]?.id || null;
            saveState();
            renderAreaFilter();
            updateKpis();
            renderList();
            renderDetail();
            toast("Importação concluída.");
          }catch(e){
            console.error(e);
            alert("Falha ao importar JSON. Verifique o arquivo.");
          }
        };
        reader.readAsText(file);
      };
      inp.click();
    }

    // ========= Init + bindings
    function wireClock(){
      const now = new Date();
      $("#year").textContent = now.getFullYear();

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

    function wireFilters(){
      const apply = () => {
        state.filters.q = ($("#fSearch").value || "").trim();
        state.filters.status = $("#fStatus").value || "all";
        state.filters.area = $("#fArea").value || "all";
        renderList();
      };

      $("#fSearch").addEventListener("input", apply);
      $("#fStatus").addEventListener("change", apply);
      $("#fArea").addEventListener("change", apply);

      $("#globalSearch").addEventListener("input", () => {
        $("#fSearch").value = $("#globalSearch").value;
        apply();
      });
    }

    function wireButtons(){
      $("#btnNewVaga").addEventListener("click", () => openVagaModal("new"));
      $("#btnSaveVaga").addEventListener("click", upsertVagaFromModal);
      $("#btnSaveReq").addEventListener("click", saveReqFromModal);

      $("#btnExportJson").addEventListener("click", exportJson);
      $("#btnImportJson").addEventListener("click", importJson);

      $("#btnSeedReset").addEventListener("click", () => {
        const ok = confirm("Restaurar dados de exemplo? Isso substitui suas vagas atuais no MVP.");
        if(!ok) return;
        state.vagas = [];
        state.selectedId = null;
        saveState();
        seedIfEmpty();
        renderAreaFilter();
        updateKpis();
        renderList();
        renderDetail();
        toast("Demo restaurada.");
      });
    }

    function initLogo(){
      $("#logoDesktop").src = LOGO_DATA_URI;
      $("#logoMobile").src = LOGO_DATA_URI;
    }

    (function init(){
      initLogo();
      wireClock();

      const has = loadState();
      if(!has) seedIfEmpty();
      else seedIfEmpty(); // caso tenha vindo vazio por algum motivo

      renderAreaFilter();
      updateKpis();
      renderList();
      renderDetail();

      wireFilters();
      wireButtons();

      // garantir que haja seleção
      if(!state.selectedId && state.vagas.length){
        state.selectedId = state.vagas[0].id;
        saveState();
        renderList();
        renderDetail();
      }
    })();
