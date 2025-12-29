// ========= Logo (Data URI placeholder)
    const seed = window.__seedData || {};
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
// ========= Storage keys
    const VAGAS_KEY = "lt_rh_vagas_v1";
    const CANDS_KEY = "lt_rh_candidatos_v1";
    const MATCH_KEY = "lt_rh_matching_cache_v1"; // cache simples de score/hits por candidato+vaga (MVP)

    const state = {
      vagas: [],
      candidatos: [],
      matchCache: {}, // { "<candId>|<vagaId>": {score, pass, hits[], missMandatory[], at} }
      selectedId: null,
      filters: { q:"", vagaId:"all", status:"all", sort:"score_desc" }
    };

    function loadVagas(){
      try{
        const raw = localStorage.getItem(VAGAS_KEY);
        if(!raw) return [];
        const data = JSON.parse(raw);
        if(!data || !Array.isArray(data.vagas)) return [];
        return data.vagas;
      }catch{ return []; }
    }
    function loadCands(){
      try{
        const raw = localStorage.getItem(CANDS_KEY);
        if(!raw) return [];
        const data = JSON.parse(raw);
        if(!data || !Array.isArray(data.candidatos)) return [];
        return data.candidatos;
      }catch{ return []; }
    }
    function saveCands(){
      const raw = localStorage.getItem(CANDS_KEY);
      let cur = { candidatos: state.candidatos, selectedId: state.selectedId };
      try{
        // se já existia, respeita o formato e só substitui os candidatos/selected
        if(raw){
          const d = JSON.parse(raw);
          cur = { ...d, candidatos: state.candidatos, selectedId: state.selectedId };
        }
      }catch{}
      localStorage.setItem(CANDS_KEY, JSON.stringify(cur));
    }

    function loadMatchCache(){
      try{
        const raw = localStorage.getItem(MATCH_KEY);
        if(!raw) return {};
        const data = JSON.parse(raw);
        return data && typeof data === "object" ? (data.cache || {}) : {};
      }catch{ return {}; }
    }
    function saveMatchCache(){
      localStorage.setItem(MATCH_KEY, JSON.stringify({ cache: state.matchCache, savedAt: new Date().toISOString() }));
    }

    // ========= Seed (se vazio) - cria 1 vaga + 2-3 candidatos
    function seedIfEmpty(){
      if(state.vagas.length && state.candidatos.length) return;

      const vagasSeed = Array.isArray(seed.vagas) ? seed.vagas : [];
      const candsSeed = Array.isArray(seed.candidatos) ? seed.candidatos : [];

      if(!state.vagas.length && vagasSeed.length){
        localStorage.setItem(VAGAS_KEY, JSON.stringify({ vagas: vagasSeed, selectedId: seed.selectedVagaId || null }));
        state.vagas = vagasSeed;
      }

      if(!state.candidatos.length && candsSeed.length){
        state.candidatos = candsSeed;
        if(!state.selectedId){
          state.selectedId = seed.selectedCandidatoId || candsSeed[0]?.id || null;
        }
        saveCands();
      }
    }

    // ========= Matching engine (MVP)
    function calcMatch(cand, vaga){
      if(!cand || !vaga) return { score: 0, pass:false, hits:[], missMandatory:[], totalPeso:1, hitPeso:0, threshold: 0 };

      const key = `${cand.id}|${vaga.id}`;
      const cached = state.matchCache[key];
      if(cached && cached.score != null && cached.hits && cached.missMandatory){
        return { ...cached, fromCache: true };
      }

      const text = normalizeText(cand.cvText || "");
      const reqs = (vaga.requisitos || []);
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
          hits.push({ ...r });
        }else if(r.obrigatorio){
          missMandatory.push({ ...r });
        }
      });

      let score = Math.round((hitPeso / totalPeso) * 100);
      if(missMandatory.length){
        score = Math.max(0, score - Math.min(40, missMandatory.length * 15));
      }

      const threshold = clamp(parseInt(vaga.threshold||0,10)||0,0,100);
      const pass = score >= threshold;

      const result = { score, pass, hits, missMandatory, totalPeso, hitPeso, threshold, at: new Date().toISOString() };
      state.matchCache[key] = result;
      saveMatchCache();

      // também grava em lastMatch do candidato (sem quebrar outras telas)
      cand.lastMatch = { score, pass, at: result.at, vagaId: vaga.id };
      cand.updatedAt = new Date().toISOString();
      saveCands();

      return { ...result, fromCache: false };
    }

    function matchTag(score, thr){
      const s = clamp(parseInt(score||0,10)||0,0,100);
      const t = clamp(parseInt(thr||0,10)||0,0,100);
      const ok = s >= t;
      const cls = ok ? "ok" : (s >= (t*0.8) ? "warn" : "bad");
      const text = ok ? "Dentro" : "Abaixo";
      return `<span class="status-tag ${cls}"><i class="bi bi-stars"></i>${s}% • ${text}</span>`;
    }

    // ========= Filters
    function getFiltered(){
      const q = (state.filters.q||"").trim().toLowerCase();
      const vid = state.filters.vagaId;
      const st = state.filters.status;

      return state.candidatos.filter(c => {
        if(vid !== "all" && c.vagaId !== vid) return false;
        if(st !== "all" && (c.status || "") !== st) return false;

        if(!q) return true;
        const v = findVaga(c.vagaId);
        const blob = [c.nome,c.email,c.fone,c.cidade,c.uf,c.fonte,c.status,v?.titulo,v?.codigo,c.cvText].join(" ").toLowerCase();
        return blob.includes(q);
      });
    }

    function sortList(list){
      const s = state.filters.sort;
      const vid = state.filters.vagaId;

      if(s.startsWith("score_")){
        // se vaga for "all", usa a vaga do candidato
        const scored = list.map(c => {
          const v = vid === "all" ? findVaga(c.vagaId) : findVaga(vid);
          const m = v ? calcMatch(c, v) : { score: 0, threshold: 0, pass:false, hits:[], missMandatory:[] };
          return { c, m };
        });

        scored.sort((a,b) => {
          const diff = (a.m.score||0) - (b.m.score||0);
          return s === "score_asc" ? diff : -diff;
        });

        return scored.map(x => x.c);
      }

      if(s === "updated_desc"){
        return list.slice().sort((a,b) => (new Date(b.updatedAt||0)) - (new Date(a.updatedAt||0)));
      }
      if(s === "updated_asc"){
        return list.slice().sort((a,b) => (new Date(a.updatedAt||0)) - (new Date(b.updatedAt||0)));
      }
      if(s === "name_asc"){
        return list.slice().sort((a,b) => (a.nome||"").localeCompare((b.nome||""),"pt-BR"));
      }
      return list;
    }

    function renderVagaFilter(){
      const sel = $("#fVaga");
      const cur = sel.value || "all";
      const opts = distinctVagas().map(v => `<option value="${v.id}">${escapeHtml(v.label)}</option>`).join("");
      sel.innerHTML = `<option value="all">Vaga: todas</option>` + opts;
      sel.value = (cur === "all" || state.vagas.some(v => v.id === cur)) ? cur : "all";
    }

    // ========= Render list
    function renderList(){
      const filtered = sortList(getFiltered());
      $("#listCount").textContent = filtered.length;
      $("#kpiTotal").textContent = filtered.length;

      // KPIs
      let inside = 0, mandatoryFail = 0, sum = 0, countScored = 0;
      filtered.forEach(c => {
        const v = state.filters.vagaId === "all" ? findVaga(c.vagaId) : findVaga(state.filters.vagaId);
        if(!v) return;
        const m = calcMatch(c, v);
        countScored++;
        sum += (m.score||0);
        if(m.pass) inside++;
        if((m.missMandatory||[]).length) mandatoryFail++;
      });

      $("#kpiInside").textContent = inside;
      $("#kpiMandatoryFail").textContent = mandatoryFail;
      $("#kpiAvg").textContent = countScored ? (Math.round(sum / countScored) + "%") : "0%";

      // maintain selection
      const visibleIds = new Set(filtered.map(x => x.id));
      if(state.selectedId && !visibleIds.has(state.selectedId)){
        state.selectedId = null;
        saveCands();
        renderDetail(null);
      }
      if(!state.selectedId && filtered[0]){
        state.selectedId = filtered[0].id;
        saveCands();
      }

      const html = filtered.map(c => renderListItem(c)).join("");
      $("#candList").innerHTML = html || `<div class="text-muted small">Nenhum candidato com os filtros atuais.</div>`;

      $$(".item").forEach(el => {
        if(el.dataset.id === state.selectedId) el.classList.add("active");
        el.addEventListener("click", () => {
          state.selectedId = el.dataset.id;
          saveCands();
          renderList();
          renderDetail(findCand(state.selectedId));
          if(window.matchMedia("(max-width: 991.98px)").matches){
            syncMobileDetail();
            bootstrap.Offcanvas.getOrCreateInstance($("#offcanvasDetails")).show();
          }
        });
      });

      renderDetail(state.selectedId ? findCand(state.selectedId) : null);
      syncMobileDetail();
    }

    function renderListItem(c){
      const v = state.filters.vagaId === "all" ? findVaga(c.vagaId) : findVaga(state.filters.vagaId);
      const m = v ? calcMatch(c, v) : { score: 0, threshold: 0, pass:false, hits:[], missMandatory:[] };

      const missCount = (m.missMandatory||[]).length;
      const missBadge = missCount
        ? `<span class="status-tag bad"><i class="bi bi-exclamation-triangle"></i>${missCount} obrig.</span>`
        : `<span class="status-tag ok"><i class="bi bi-check2"></i>Obrig. OK</span>`;

      const st = (c.status || "novo");
      const stTag = ({
        novo: `<span class="status-tag"><i class="bi bi-dot"></i>Novo</span>`,
        triagem: `<span class="status-tag warn"><i class="bi bi-dot"></i>Triagem</span>`,
        pendente: `<span class="status-tag warn"><i class="bi bi-dot"></i>Pendente</span>`,
        aprovado: `<span class="status-tag ok"><i class="bi bi-dot"></i>Aprov.</span>`,
        reprovado: `<span class="status-tag bad"><i class="bi bi-dot"></i>Reprov.</span>`
      })[st] || `<span class="status-tag"><i class="bi bi-dot"></i>${escapeHtml(st)}</span>`;

      return `
        <div class="item" data-id="${c.id}">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <div class="avatar">${escapeHtml(initials(c.nome))}</div>
              <div>
                <div class="fw-bold">${escapeHtml(c.nome||"—")}</div>
                <div class="text-muted small">${escapeHtml(c.email||"—")}</div>
              </div>
            </div>
            <div class="text-end">
              ${v ? `<div class="pill mono">${escapeHtml(v.codigo||"—")}</div>` : `<div class="pill">Sem vaga</div>`}
              <div class="text-muted small mt-1">${v ? escapeHtml(v.titulo||"—") : "—"}</div>
            </div>
          </div>

          <div class="mt-2">
            <div class="d-flex align-items-center gap-2">
              <div class="progress flex-grow-1">
                <div class="progress-bar" style="width:${clamp(m.score,0,100)}%"></div>
              </div>
              <div class="fw-bold" style="min-width:52px;text-align:right;">${clamp(m.score,0,100)}%</div>
            </div>
            <div class="d-flex flex-wrap gap-2 mt-2">
              ${matchTag(m.score, m.threshold)}
              ${missBadge}
              ${stTag}
            </div>
          </div>
        </div>
      `;
    }

    // ========= Detail
    function renderDetail(c){
      if(!c){
        $("#detailHost").innerHTML = `
          <div class="empty">
            <div class="d-flex align-items-start gap-2">
              <i class="bi bi-info-circle mt-1"></i>
              <div>
                <div class="fw-bold">Selecione um candidato</div>
                <div class="small mt-1">A tela exibirá score, requisitos e explicação do cálculo.</div>
              </div>
            </div>
          </div>`;
        return;
      }

      const v = state.filters.vagaId === "all" ? findVaga(c.vagaId) : findVaga(state.filters.vagaId);

      if(!v){
        $("#detailHost").innerHTML = `
          <div class="empty">
            <div class="fw-bold">Sem vaga vinculada</div>
            <div class="small mt-1">Vincule a vaga ao candidato para calcular o matching.</div>
          </div>`;
        return;
      }

      const m = calcMatch(c, v);
      const miss = (m.missMandatory||[]);
      const hits = (m.hits||[]);
      const reqs = (v.requisitos||[]);

      const hitIds = new Set(hits.map(x => x.id));
      const missIds = new Set(miss.map(x => x.id));

      const explain = `
        <div class="text-muted small">
          <div><span class="mono">score = (peso_encontrado / peso_total) * 100</span></div>
          <div class="mt-1">Penalidade (MVP): <span class="mono">-15 pontos</span> por obrigatório faltando (máx. <span class="mono">-40</span>).</div>
          <div class="mt-1">Critério: <span class="mono">score ≥ threshold</span> ⇒ “Dentro”.</div>
        </div>
      `;

      $("#detailHost").innerHTML = `
        <div class="card-soft p-3">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
            <div class="d-flex align-items-center gap-2">
              <div class="avatar" style="width:52px;height:52px;border-radius:16px;">${escapeHtml(initials(c.nome))}</div>
              <div>
                <div class="fw-bold" style="font-size:1.05rem;">${escapeHtml(c.nome||"—")}</div>
                <div class="text-muted small">${escapeHtml(c.email||"—")}</div>
                <div class="text-muted small"><i class="bi bi-clock-history me-1"></i>Atualizado: ${escapeHtml(fmtDate(c.updatedAt))}</div>
              </div>
            </div>

            <div class="text-end">
              ${matchTag(m.score, m.threshold)}
              <div class="text-muted small mt-1">Mínimo: <span class="mono fw-semibold">${clamp(parseInt(m.threshold||0,10)||0,0,100)}%</span></div>
              <div class="text-muted small">${m.fromCache ? `<i class="bi bi-hdd me-1"></i>cache` : `<i class="bi bi-cpu me-1"></i>calculado`}</div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="pill"><i class="bi bi-briefcase"></i>${escapeHtml(v.titulo||"—")}</span>
            <span class="pill mono">${escapeHtml(v.codigo||"—")}</span>
            <span class="pill"><i class="bi bi-collection me-1"></i>Requisitos: <strong class="ms-1">${reqs.length}</strong></span>
            <span class="pill"><i class="bi bi-check2-circle me-1"></i>Encontrados: <strong class="ms-1">${hits.length}</strong></span>
            <span class="pill"><i class="bi bi-exclamation-triangle me-1"></i>Obrig. faltando: <strong class="ms-1">${miss.length}</strong></span>
          </div>

          <div class="mb-2">
            <div class="d-flex align-items-center justify-content-between">
              <div>
                <div class="fw-bold">Score</div>
                <div class="text-muted small">baseado em pesos e palavras-chave</div>
              </div>
              <div class="fw-bold" style="font-size:1.35rem;color:var(--lt-primary);">${clamp(m.score,0,100)}%</div>
            </div>
            <div class="progress mt-2">
              <div class="progress-bar" style="width:${clamp(m.score,0,100)}%"></div>
            </div>
          </div>

          <div class="row g-2 mt-3">
            <div class="col-12 col-lg-6">
              <div class="fw-bold mb-2">Requisitos (detalhado)</div>
              <div class="d-grid gap-2" id="reqList">
                ${reqs.map(r => {
                  const isHit = hitIds.has(r.id);
                  const isMiss = missIds.has(r.id);
                  const cls = isHit ? "hit" : (isMiss ? "miss" : "");
                  const icon = isHit ? "check2-circle" : (isMiss ? "x-circle" : "dash-circle");
                  const tag = isHit ? `<span class="status-tag ok"><i class="bi bi-check2"></i>OK</span>` :
                              (isMiss ? `<span class="status-tag bad"><i class="bi bi-x-lg"></i>Faltando</span>` :
                                        `<span class="status-tag"><i class="bi bi-dash"></i>Não achou</span>`);
                  return `
                    <div class="req-row ${cls}">
                      <div class="d-flex align-items-start justify-content-between gap-2">
                        <div>
                          <div class="fw-semibold"><i class="bi bi-${icon} me-1"></i>${escapeHtml(r.termo||"—")}</div>
                          <div class="text-muted small">
                            Peso: <span class="mono">${clamp(parseInt(r.peso||0,10)||0,0,10)}</span>
                            ${r.obrigatorio ? `• <span class="fw-semibold" style="color:rgba(153,19,34,.95)">obrigatório</span>` : `• desejável`}
                          </div>
                          ${(r.sinonimos && r.sinonimos.length) ? `<div class="text-muted small mt-1">Sinônimos: ${escapeHtml(r.sinonimos.join(", "))}</div>` : ``}
                        </div>
                        <div>${tag}</div>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>

            <div class="col-12 col-lg-6">
              <div class="fw-bold mb-2">Explicação do cálculo</div>
              <div class="card-soft p-3" style="box-shadow:none;">
                <div class="d-flex align-items-start gap-2">
                  <i class="bi bi-info-circle mt-1"></i>
                  <div>${explain}</div>
                </div>

                <hr class="my-3" style="border-color: rgba(16,82,144,.14);">

                <div class="d-flex align-items-center justify-content-between">
                  <div class="text-muted small">Peso encontrado</div>
                  <div class="fw-bold mono">${m.hitPeso}/${m.totalPeso}</div>
                </div>
                <div class="d-flex align-items-center justify-content-between mt-1">
                  <div class="text-muted small">Penalidade (obrigatórios)</div>
                  <div class="fw-bold mono">${miss.length ? ("-" + Math.min(40, miss.length*15)) : "0"}</div>
                </div>

                <div class="alert alert-primary mt-3 mb-0" style="border-radius:14px; border-color: rgba(16,82,144,.25); background: rgba(173,200,220,.22); color: var(--lt-primary);">
                  <div class="d-flex align-items-start gap-2">
                    <i class="bi bi-lightning-charge mt-1"></i>
                    <div>
                      <div class="fw-semibold">Ação rápida</div>
                      <div class="small">Recalcule o match após atualizar o texto do CV ou requisitos da vaga.</div>
                      <div class="d-flex flex-wrap gap-2 mt-2">
                        <button class="btn btn-brand btn-sm" type="button" id="btnRecalcOne">
                          <i class="bi bi-arrow-repeat me-1"></i>Recalcular este candidato
                        </button>
                        <button class="btn btn-ghost btn-sm" type="button" id="btnClearCacheOne">
                          <i class="bi bi-eraser me-1"></i>Limpar cache deste
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-3">
                  <div class="fw-bold">Trecho do CV (texto)</div>
                  <div class="text-muted small">No MVP, o texto vem do parser (PDF/Word) e é usado para matching.</div>
                  <textarea class="form-control mt-2" rows="8" id="cvTextArea" style="border-color:var(--lt-border);">${escapeHtml(c.cvText||"")}</textarea>
                  <div class="d-flex flex-wrap gap-2 mt-2">
                    <button class="btn btn-ghost btn-sm" type="button" id="btnSaveCvText">
                      <i class="bi bi-save me-1"></i>Salvar texto do CV
                    </button>
                    <button class="btn btn-ghost btn-sm" type="button" id="btnClearCacheVaga">
                      <i class="bi bi-trash3 me-1"></i>Limpar cache da vaga
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      `;

      // bind actions
      $("#btnRecalcOne").addEventListener("click", () => {
        clearCacheFor(c.id, v.id);
        calcMatch(c, v);
        toast("Recalculado.");
        renderList();
      });
      $("#btnClearCacheOne").addEventListener("click", () => {
        clearCacheFor(c.id, v.id);
        toast("Cache limpo (candidato/vaga).");
        renderList();
      });
      $("#btnSaveCvText").addEventListener("click", () => {
        const txt = $("#cvTextArea").value || "";
        c.cvText = txt;
        c.updatedAt = new Date().toISOString();
        saveCands();
        clearCacheFor(c.id, v.id);
        toast("Texto do CV salvo. Recalcule para atualizar o score.");
        renderList();
        renderDetail(c);
      });
      $("#btnClearCacheVaga").addEventListener("click", () => {
        clearCacheForVaga(v.id);
        toast("Cache limpo (vaga).");
        renderList();
      });
    }

    function syncMobileDetail(){
      $("#mobileDetailBody").innerHTML = $("#detailHost").innerHTML;
      // rebind minimal actions in mobile detail (delegation)
      const c = findCand(state.selectedId);
      const v = (c && (state.filters.vagaId === "all" ? findVaga(c.vagaId) : findVaga(state.filters.vagaId))) || null;
      if(!c || !v) return;

      const bind = (id, fn) => {
        const el = $("#"+id, $("#mobileDetailBody"));
        if(el) el.addEventListener("click", fn);
      };

      bind("btnRecalcOne", () => { clearCacheFor(c.id, v.id); calcMatch(c, v); toast("Recalculado."); renderList(); });
      bind("btnClearCacheOne", () => { clearCacheFor(c.id, v.id); toast("Cache limpo."); renderList(); });
      bind("btnSaveCvText", () => {
        const ta = $("#cvTextArea", $("#mobileDetailBody"));
        c.cvText = (ta ? ta.value : (c.cvText||""));
        c.updatedAt = new Date().toISOString();
        saveCands();
        clearCacheFor(c.id, v.id);
        toast("Texto do CV salvo. Recalcule para atualizar o score.");
        renderList();
        renderDetail(c);
      });
      bind("btnClearCacheVaga", () => { clearCacheForVaga(v.id); toast("Cache limpo (vaga)."); renderList(); });
    }

    // ========= Cache mgmt
    function clearCacheFor(candId, vagaId){
      const key = `${candId}|${vagaId}`;
      delete state.matchCache[key];
      saveMatchCache();
    }
    function clearCacheForVaga(vagaId){
      Object.keys(state.matchCache).forEach(k => {
        if(k.endsWith("|"+vagaId)) delete state.matchCache[k];
      });
      saveMatchCache();
    }
    function clearCacheAll(){
      state.matchCache = {};
      saveMatchCache();
    }

    // ========= Import/Export
    function exportJson(){
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        vagas: state.vagas,
        candidatos: state.candidatos,
        matchCache: state.matchCache
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "matching_mvp_liotecnica.json";
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
            if(data && Array.isArray(data.vagas)){
              state.vagas = data.vagas;
              localStorage.setItem(VAGAS_KEY, JSON.stringify({ vagas: state.vagas }));
            }
            if(data && Array.isArray(data.candidatos)){
              state.candidatos = data.candidatos;
              saveCands();
            }
            if(data && data.matchCache && typeof data.matchCache === "object"){
              state.matchCache = data.matchCache;
              saveMatchCache();
            }
            state.selectedId = state.candidatos[0]?.id || null;
            renderVagaFilter();
            renderList();
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

    // ========= Wire
    function initLogo(){
      $("#logoDesktop").src = LOGO_DATA_URI;
      $("#logoMobile").src = LOGO_DATA_URI;
    }
    function wireClock(){
      const tick = () => {
        const d = new Date();
        $("#nowLabel").textContent = d.toLocaleString("pt-BR", { weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
      };
      tick();
      setInterval(tick, 1000*15);
    }
    function wireFilters(){
      const apply = () => {
        state.filters.q = ($("#fSearch").value || "").trim();
        state.filters.vagaId = $("#fVaga").value || "all";
        state.filters.status = $("#fStatus").value || "all";
        state.filters.sort = $("#fSort").value || "score_desc";
        renderList();
      };
      $("#fSearch").addEventListener("input", apply);
      $("#fVaga").addEventListener("change", apply);
      $("#fStatus").addEventListener("change", apply);
      $("#fSort").addEventListener("change", apply);
    }
    function wireButtons(){
      $("#btnRecalcAll").addEventListener("click", () => {
        const list = getFiltered();
        let n = 0;
        list.forEach(c => {
          const v = state.filters.vagaId === "all" ? findVaga(c.vagaId) : findVaga(state.filters.vagaId);
          if(!v) return;
          clearCacheFor(c.id, v.id);
          calcMatch(c, v);
          n++;
        });
        toast(`Recalculado: ${n} candidato(s).`);
        renderList();
      });

      $("#btnExport").addEventListener("click", exportJson);
      $("#btnImport").addEventListener("click", importJson);

      $("#btnSeedReset").addEventListener("click", () => {
        const ok = confirm("Restaurar demo? Isso substitui Vagas, Candidatos e cache de matching.");
        if(!ok) return;

        localStorage.removeItem(VAGAS_KEY);
        localStorage.removeItem(CANDS_KEY);
        localStorage.removeItem(MATCH_KEY);

        state.vagas = [];
        state.candidatos = [];
        state.matchCache = {};
        state.selectedId = null;

        // re-seed
        state.vagas = loadVagas();
        state.candidatos = loadCands();
        seedIfEmpty();
        state.matchCache = loadMatchCache();

        renderVagaFilter();
        renderList();
        toast("Demo restaurada.");
      });
    }

    // ========= Init
    (function init(){
      initLogo();
      wireClock();

      state.vagas = loadVagas();
      state.candidatos = loadCands();
      state.matchCache = loadMatchCache();

      seedIfEmpty(); // se algo estiver vazio, seed

      // refresh state after seed
      state.vagas = loadVagas();
      state.candidatos = loadCands();
      state.matchCache = loadMatchCache();

      if(!state.vagas.length){
        toast("Nenhuma vaga encontrada. Crie na tela de Vagas.");
      }

      renderVagaFilter();

      // default selection
      state.selectedId = state.candidatos[0]?.id || null;
      saveCands();

      wireFilters();
      wireButtons();

      renderList();
    })();
