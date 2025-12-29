// ========= Logo (Data URI placeholder)
    const seed = window.__seedData || {};
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
function statusTag(s){
      const map = {
        novo:      { label:"Novo", cls:"" },
        triagem:   { label:"Em triagem", cls:"warn" },
        aprovado:  { label:"Aprovado", cls:"ok" },
        reprovado: { label:"Reprovado", cls:"bad" },
        pendente:  { label:"Pendente", cls:"warn" }
      };
      const it = map[s] || { label: s, cls:"" };
      return `<span class="status-tag ${it.cls}"><i class="bi bi-dot"></i>${escapeHtml(it.label)}</span>`;
    }

    // ========= Storage keys (compatíveis com a tela de Candidatos/Vagas)
    const VAGAS_KEY = "lt_rh_vagas_v1";
    const CANDS_KEY = "lt_rh_candidatos_v1";

    // Triagem: histórico de decisões (novo key)
    const TRIAGE_KEY = "lt_rh_triagem_v1";

    const state = {
      vagas: [],
      candidatos: [],
      triageLog: [],
      selectedId: null,
      filters: { q:"", vagaId:"all", sla:"all" }
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
        if(!raw) return false;
        const data = JSON.parse(raw);
        if(!data || !Array.isArray(data.candidatos)) return false;
        state.candidatos = data.candidatos;
        state.selectedId = data.selectedId ?? null;
        return true;
      }catch{ return false; }
    }
    function saveCands(){
      localStorage.setItem(CANDS_KEY, JSON.stringify({
        candidatos: state.candidatos,
        selectedId: state.selectedId
      }));
    }

    function loadTriageLog(){
      try{
        const raw = localStorage.getItem(TRIAGE_KEY);
        if(!raw) return;
        const data = JSON.parse(raw);
        if(!data || !Array.isArray(data.log)) return;
        state.triageLog = data.log;
      }catch{}
    }
    function saveTriageLog(){
      localStorage.setItem(TRIAGE_KEY, JSON.stringify({
        log: state.triageLog
      }));
    }

    function seedVagasIfEmpty(){
      if(state.vagas.length) return;

      const vagasSeed = Array.isArray(seed.vagas) ? seed.vagas : [];
      if(!vagasSeed.length) return;

      localStorage.setItem(VAGAS_KEY, JSON.stringify({ vagas: vagasSeed, selectedId: seed.selectedVagaId || null }));
      state.vagas = vagasSeed;
    }

    function seedCandsIfEmpty(){
      if(state.candidatos.length) return;

      const candsSeed = Array.isArray(seed.candidatos) ? seed.candidatos : [];
      if(!candsSeed.length) return;

      state.candidatos = candsSeed;
      state.selectedId = seed.selectedCandidatoId || candsSeed[0]?.id || null;
      saveCands();
    }

    function findVaga(id){
      return state.vagas.find(v => v.id === id) || null;
    }
    function findCand(id){
      return state.candidatos.find(c => c.id === id) || null;
    }

    // ========= Matching (MVP keyword) — mesmo padrão da tela de Candidatos
    function calcMatchForCand(cand){
      const v = findVaga(cand.vagaId);
      if(!v) return { score: 0, pass: false, hits: [], missMandatory: [], totalPeso: 1, hitPeso: 0, threshold: 0 };

      const text = normalizeText(cand.cvText || "");
      const reqs = (v.requisitos || []);
      if(!text || !reqs.length){
        const thr = clamp(parseInt(v.threshold || 0,10)||0,0,100);
        return { score: 0, pass: 0 >= thr, hits: [], missMandatory: [], totalPeso: 1, hitPeso: 0, threshold: thr };
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
      if(missMandatory.length){
        score = Math.max(0, score - Math.min(40, missMandatory.length * 15));
      }

      const thr = clamp(parseInt(v.threshold || 0,10)||0,0,100);
      const pass = score >= thr;

      return { score, pass, hits, missMandatory, totalPeso, hitPeso, threshold: thr };
    }

    function matchTag(score, thr){
      const s = clamp(parseInt(score||0,10)||0,0,100);
      const t = clamp(parseInt(thr||0,10)||0,0,100);
      const ok = s >= t;
      const cls = ok ? "ok" : (s >= (t*0.8) ? "warn" : "bad");
      const text = ok ? "Dentro" : "Abaixo";
      return `<span class="status-tag ${cls}"><i class="bi bi-stars"></i>${s}% • ${text}</span>`;
    }

    // ========= SLA (MVP)
    // Regra simples:
    // - status "triagem": SLA 48h
    // - status "pendente": SLA 72h
    // - aprovado/reprovado: sem SLA
    function slaInfo(c){
      const now = Date.now();
      const updatedAt = c.updatedAt ? new Date(c.updatedAt).getTime() : now;
      let limitH = null;
      if(c.status === "triagem") limitH = 48;
      if(c.status === "pendente") limitH = 72;
      if(limitH == null) return { has:false, late:false, leftH: null, limitH: null };

      const ageH = (now - updatedAt) / (1000*60*60);
      const leftH = limitH - ageH;
      return { has:true, late: leftH < 0, leftH, limitH };
    }

    // ========= Board data + filters
    function distinctVagas(){
      return state.vagas
        .map(v => ({ id: v.id, label: `${v.titulo || "—"} (${v.codigo || "—"})` }))
        .sort((a,b)=>a.label.localeCompare(b.label, "pt-BR"));
    }

    function renderVagaFilter(){
      const sel = $("#fVaga");
      if(!sel) return;
      const cur = sel.value || "all";
      const opts = distinctVagas().map(v => `<option value="${v.id}">${escapeHtml(v.label)}</option>`).join("");
      sel.innerHTML = `<option value="all">Vaga: todas</option>` + opts;
      sel.value = (cur === "all" || state.vagas.some(v => v.id === cur)) ? cur : "all";
    }

    function getFilteredCands(){
      const q = (state.filters.q || "").trim().toLowerCase();
      const vid = state.filters.vagaId;
      const sla = state.filters.sla;

      return state.candidatos.filter(c => {
        // só pipeline de triagem
        if(!["triagem","pendente","aprovado","reprovado"].includes(c.status)) return false;

        if(vid !== "all" && c.vagaId !== vid) return false;

        if(sla !== "all"){
          const si = slaInfo(c);
          if(!si.has) return false;
          if(sla === "late" && !si.late) return false;
          if(sla === "ok" && si.late) return false;
        }

        if(!q) return true;
        const v = findVaga(c.vagaId);
        const blob = [c.nome, c.email, c.fone, v?.titulo, v?.codigo, c.cidade, c.uf, c.fonte].join(" ").toLowerCase();
        return blob.includes(q);
      });
    }

    function groupByStage(list){
      const g = { triagem: [], pendente: [], aprovado: [], reprovado: [] };
      list.forEach(c => g[c.status]?.push(c));
      return g;
    }

    // ========= Render board
    function renderBoard(){
      const list = getFilteredCands();
      const g = groupByStage(list);

      $("#listTriagem").innerHTML = g.triagem.map(renderTriItem).join("") || `<div class="text-muted small">—</div>`;
      $("#listPendente").innerHTML = g.pendente.map(renderTriItem).join("") || `<div class="text-muted small">—</div>`;
      $("#listAprovado").innerHTML = g.aprovado.map(renderTriItem).join("") || `<div class="text-muted small">—</div>`;
      $("#listReprovado").innerHTML = g.reprovado.map(renderTriItem).join("") || `<div class="text-muted small">—</div>`;

      $("#countTriagem").textContent = g.triagem.length;
      $("#countPendente").textContent = g.pendente.length;
      $("#countAprovado").textContent = g.aprovado.length;
      $("#countReprovado").textContent = g.reprovado.length;

      // bind draggable
      $$(".tri-item").forEach(el => {
        el.addEventListener("dragstart", onDragStart);
      });

      // highlight selected
      $$(".tri-item").forEach(el => {
        if(el.dataset.id === state.selectedId) el.classList.add("active");
      });
    }

    function renderTriItem(c){
      const v = findVaga(c.vagaId);
      const m = calcMatchForCand(c);
      const thr = m.threshold ?? (v ? v.threshold : 0);
      const si = slaInfo(c);

      const slaBadge = si.has
        ? (si.late
          ? `<span class="status-tag bad"><i class="bi bi-alarm"></i>SLA atrasado</span>`
          : `<span class="status-tag warn"><i class="bi bi-alarm"></i>${Math.ceil(si.leftH)}h</span>`)
        : `<span class="status-tag"><i class="bi bi-dash-circle"></i>Sem SLA</span>`;

      const missCount = (m.missMandatory || []).length;
      const missBadge = missCount
        ? `<span class="status-tag bad"><i class="bi bi-exclamation-triangle"></i>${missCount} obrig.</span>`
        : `<span class="status-tag ok"><i class="bi bi-check2"></i>Obrig. OK</span>`;

      return `
        <div class="tri-item cand-card ${c.id===state.selectedId ? "active" : ""}"
             draggable="true"
             data-id="${c.id}"
             >
          <div class="tri-item-head">
            <div class="d-flex align-items-center gap-2">
              <div class="avatar">${escapeHtml(initials(c.nome))}</div>
              <div>
                <div class="name d-flex align-items-center gap-2 flex-wrap">
                  <span>${escapeHtml(c.nome || "—")}</span>
                  <button class="btn btn-ghost btn-sm" type="button" title="Detalhes" aria-label="Detalhes" onclick="event.stopPropagation(); window.__openDetails('${c.id}')">
                    <i class="bi bi-eye"></i>
                  </button>
                </div>
                <div class="smalltxt">${escapeHtml(c.email || "—")}</div>
              </div>
            </div>

            <div class="tri-meta text-end">
              ${v ? `<div class="pill mono">${escapeHtml(v.codigo || "—")}</div>` : `<div class="pill">Sem vaga</div>`}
              <div class="smalltxt mt-1">${v ? escapeHtml(v.titulo || "—") : "—"}</div>
            </div>
          </div>

          <div class="matchline">
            <div class="flex-grow-1">
              <div class="d-flex align-items-center gap-2">
                <div class="progress flex-grow-1">
                  <div class="progress-bar" style="width:${clamp(m.score,0,100)}%"></div>
                </div>
                <div class="fw-bold" style="min-width:44px;text-align:right;">${clamp(m.score,0,100)}%</div>
              </div>
              <div class="smalltxt mt-1">
                mínimo: <span class="mono">${clamp(parseInt(thr||0,10)||0,0,100)}%</span>
                ${m.pass ? `• <span style="color: rgba(25,135,84,.95); font-weight:700;">dentro</span>` : `• <span style="color: rgba(153,19,34,.95); font-weight:700;">abaixo</span>`}
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 mt-2">
            ${slaBadge}
            ${missBadge}
            <button class="btn btn-ghost btn-sm ms-auto" type="button"
                    onclick="event.stopPropagation(); window.__openDecision('${c.id}')">
              <i class="bi bi-clipboard-check me-1"></i>Decisão
            </button>
          </div>
        </div>
      `;
    }

    // ========= Drag & Drop
    let dragId = null;

    function onDragStart(ev){
      dragId = ev.currentTarget.dataset.id;
      ev.dataTransfer.setData("text/plain", dragId);
      ev.dataTransfer.effectAllowed = "move";
    }

    function setupDropZones(){
      const zones = [
        { id:"#dropTriagem", stage:"triagem" },
        { id:"#dropPendente", stage:"pendente" },
        { id:"#dropAprovado", stage:"aprovado" },
        { id:"#dropReprovado", stage:"reprovado" }
      ];

      zones.forEach(z => {
        const el = $(z.id);
        el.addEventListener("dragover", (ev) => {
          ev.preventDefault();
          ev.dataTransfer.dropEffect = "move";
        });
        el.addEventListener("drop", (ev) => {
          ev.preventDefault();
          const id = ev.dataTransfer.getData("text/plain") || dragId;
          if(!id) return;
          moveStage(id, z.stage, { reason:"Drag&Drop", note:"Movido no board." });
        });
      });
    }

    function moveStage(candId, newStage, meta){
      const c = findCand(candId);
      if(!c) return;

      const prev = c.status;
      if(prev === newStage) return;

      c.status = newStage;
      c.updatedAt = new Date().toISOString();

      // log
      state.triageLog.unshift({
        id: uid(),
        candId: c.id,
        from: prev,
        to: newStage,
        at: c.updatedAt,
        reason: meta?.reason || "",
        note: meta?.note || ""
      });

      saveCands();
      saveTriageLog();

      state.selectedId = c.id;
      renderBoard();
      renderDetail();
      toast(`Movido: ${labelStage(prev)} → ${labelStage(newStage)}`);
    }

    function labelStage(s){
      const map = {
        triagem: "Em triagem",
        pendente: "Pendente",
        aprovado: "Aprovado",
        reprovado: "Reprovado",
        novo: "Novo"
      };
      return map[s] || s;
    }

    // ========= Detail panel
    function buildDetailHtml(c){
      if(!c){
        return `
          <div class="detail-empty">
            <div class="d-flex align-items-start gap-2">
              <i class="bi bi-info-circle mt-1"></i>
              <div>
                <div class="fw-bold">Selecione um candidato</div>
                <div class="small mt-1">Clique em um card para ver detalhes, match e histórico de triagem.</div>
              </div>
            </div>
          </div>
        `;
      }

      const v = findVaga(c.vagaId);
      const m = calcMatchForCand(c);
      const thr = m.threshold ?? (v ? v.threshold : 0);
      const si = slaInfo(c);

      const updated = c.updatedAt ? new Date(c.updatedAt) : null;
      const updatedTxt = updated ? updated.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";

      const miss = (m.missMandatory||[]).map(r=>r.termo).slice(0,12);
      const hit = (m.hits||[]).map(r=>r.termo).slice(0,12);

      const log = state.triageLog.filter(x => x.candId === c.id).slice(0, 10);

      const slaTxt = si.has
        ? (si.late ? "Atrasado" : `Faltam ~${Math.ceil(si.leftH)}h`)
        : "Sem SLA";

      return `
        <div class="card-soft p-3">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
            <div class="d-flex align-items-center gap-2">
              <div class="avatar" style="width:52px;height:52px;border-radius:16px;">${escapeHtml(initials(c.nome))}</div>
              <div>
                <div class="fw-bold" style="font-size:1.05rem;">${escapeHtml(c.nome || "—")}</div>
                <div class="text-muted small">${escapeHtml(c.email || "—")}</div>
                <div class="text-muted small">
                  <i class="bi bi-clock-history me-1"></i>Atualizado: ${escapeHtml(updatedTxt)}
                </div>
              </div>
            </div>

            <div class="text-end">
              ${statusTag(c.status)}
              <div class="text-muted small mt-1"><i class="bi bi-alarm me-1"></i>SLA: <span class="fw-semibold">${escapeHtml(slaTxt)}</span></div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="pill"><i class="bi bi-briefcase"></i>${escapeHtml(v ? (v.titulo || "—") : "Vaga não vinculada")}</span>
            ${v ? `<span class="pill mono">${escapeHtml(v.codigo || "—")}</span>` : ""}
            ${v ? `<span class="pill"><i class="bi bi-stars"></i>Mín.: <strong class="ms-1">${clamp(parseInt(thr||0,10)||0,0,100)}%</strong></span>` : ""}
          </div>

          <div class="d-flex align-items-center justify-content-between">
            <div>
              <div class="fw-bold">Match atual</div>
              <div class="text-muted small">MVP por palavras-chave</div>
            </div>
            ${v ? matchTag(m.score, thr) : `<span class="status-tag"><i class="bi bi-dash-circle"></i>—</span>`}
          </div>

          <div class="mt-2">
            <div class="progress">
              <div class="progress-bar" style="width:${clamp(m.score,0,100)}%"></div>
            </div>
            <div class="text-muted small mt-1">
              Encontrados: <strong>${(m.hits||[]).length}</strong> • Obrigatórios faltando: <strong>${(m.missMandatory||[]).length}</strong>
            </div>
          </div>

          ${(m.missMandatory||[]).length ? `
            <div class="alert alert-danger mt-3 mb-0" style="border-radius:14px;">
              <div class="fw-semibold mb-1"><i class="bi bi-exclamation-triangle me-1"></i>Obrigatórios faltando</div>
              <div class="small">${escapeHtml(miss.join(", "))}</div>
            </div>
          ` : `
            <div class="alert alert-success mt-3 mb-0" style="border-radius:14px;">
              <div class="fw-semibold mb-1"><i class="bi bi-check2 me-1"></i>Obrigatórios OK</div>
              <div class="small">${hit.length ? escapeHtml(hit.join(", ")) : "—"}</div>
            </div>
          `}

          <div class="d-flex flex-wrap gap-2 mt-3">
            <button class="btn btn-brand btn-sm" type="button" data-dact="decision">
              <i class="bi bi-clipboard-check me-1"></i>Decisão
            </button>
            <button class="btn btn-ghost btn-sm" type="button" data-dact="recalc">
              <i class="bi bi-arrow-repeat me-1"></i>Recalcular match
            </button>
          </div>

          <hr class="my-3" style="border-color: rgba(16,82,144,.14);">

          <div class="fw-bold mb-1">Histórico de triagem</div>
          <div class="text-muted small mb-2">Últimas movimentações (MVP localStorage).</div>

          ${log.length ? `
            <div class="list-group" style="border-radius: 14px; overflow:hidden;">
              ${log.map(x => `
                <div class="list-group-item">
                  <div class="d-flex align-items-start justify-content-between gap-2">
                    <div>
                      <div class="fw-semibold">
                        ${escapeHtml(labelStage(x.from))} → ${escapeHtml(labelStage(x.to))}
                      </div>
                      <div class="text-muted small">${escapeHtml(x.reason || "—")} ${x.note ? `• ${escapeHtml(x.note)}` : ""}</div>
                    </div>
                    <div class="text-muted small nowrap">${new Date(x.at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</div>
                  </div>
                </div>
              `).join("")}
            </div>
          ` : `
            <div class="detail-empty">
              <div class="small">Sem histórico ainda. Use “Decisão” ou arraste para registrar uma movimentação.</div>
            </div>
          `}
        </div>
      `;
    }

    function renderDetail(){
      const host = $("#triagemDetailBody");
      if(!host) return;
      const c = findCand(state.selectedId);
      host.innerHTML = buildDetailHtml(c);
      bindDetailActions(host, c);
    }

    function bindDetailActions(root, c){
      if(!root || !c) return;
      root.querySelectorAll("[data-dact]").forEach(btn => {
        btn.addEventListener("click", () => {
          const act = btn.dataset.dact;
          if(act === "decision") openDecision(c.id);
          if(act === "recalc") recalcMatch(c.id);
        });
      });
    }

    function openDetails(candId){
      const c = findCand(candId);
      if(!c) return;
      state.selectedId = c.id;
      saveCands();
      renderBoard();
      renderDetail();
      bootstrap.Modal.getOrCreateInstance($("#modalTriagemDetails")).show();
    }

    window.__openDetails = (id) => {
      openDetails(id);
    };

    // ========= Decision modal
    function openDecision(candId){
      const c = findCand(candId);
      if(!c) return;

      $("#decCandId").value = c.id;

      // sugestão automática
      const v = findVaga(c.vagaId);
      const m = calcMatchForCand(c);
      const suggested = suggestDecision(c, v, m);

      $("#decAction").value = suggested.action;
      $("#decReason").value = suggested.reason || "";
      $("#decObs").value = "";

      $("#decisionTitle").textContent = `Decisão • ${c.nome}`;

      bootstrap.Modal.getOrCreateInstance($("#modalDecision")).show();
    }

    window.__openDecision = (id) => openDecision(id);

    function suggestDecision(c, v, m){
      // Regras MVP:
      // - se obrigatórios faltando => reprovar
      // - senão se match < threshold => pendente (ou reprovar se muito baixo)
      // - senão => aprovar
      const thr = m.threshold ?? (v ? v.threshold : 0);
      const miss = (m.missMandatory||[]).length;
      if(miss){
        return { action:"reprovado", reason:"Faltou requisito obrigatório" };
      }
      if(m.score < thr){
        const gap = thr - m.score;
        if(gap >= 25) return { action:"reprovado", reason:"Match abaixo do mínimo" };
        return { action:"pendente", reason:"Necessita validação técnica" };
      }
      return { action:"aprovado", reason:"Perfil aderente" };
    }

    function applyDecision(){
      const id = $("#decCandId").value;
      const action = $("#decAction").value;
      const reason = ($("#decReason").value || "").trim();
      const obs = ($("#decObs").value || "").trim();

      const c = findCand(id);
      if(!c) return;

      moveStage(id, action, {
        reason: reason || "Decisão",
        note: obs || ""
      });

      // também grava observação no candidato (append)
      if(reason || obs){
        const lines = [];
        if(reason) lines.push(reason);
        if(obs) lines.push(obs);
        const note = lines.join(" • ");
        c.obs = (c.obs || "").trim();
        c.obs = c.obs ? (c.obs + "\n" + note) : note;
        c.updatedAt = new Date().toISOString();
        saveCands();
      }

      bootstrap.Modal.getOrCreateInstance($("#modalDecision")).hide();
    }

    // ========= Recalc match
    function recalcMatch(candId){
      const c = findCand(candId);
      if(!c) return;

      const m = calcMatchForCand(c);
      c.lastMatch = { score: m.score, pass: m.pass, at: new Date().toISOString() };
      c.updatedAt = new Date().toISOString();

      saveCands();
      renderBoard();
      renderDetail();
      toast("Match recalculado.");
    }

    // ========= Auto-triage (MVP)
    function autoTriage(){
      const list = getFilteredCands();

      // só auto em triagem
      const tri = list.filter(c => c.status === "triagem");

      if(!tri.length){
        toast("Nenhum candidato em triagem com os filtros atuais.");
        return;
      }

      let moved = 0;

      tri.forEach(c => {
        const v = findVaga(c.vagaId);
        const m = calcMatchForCand(c);
        const sug = suggestDecision(c, v, m);

        // não aprovar automaticamente se for "pendente"
        // (mantém pendente como pendente quando sugerido, mas aqui move para pendente)
        if(sug.action && sug.action !== "triagem"){
          moveStage(c.id, sug.action, { reason: "Auto-triagem", note: sug.reason || "" });
          moved++;
        }
      });

      toast(`Auto-triagem aplicada em ${moved} candidato(s).`);
    }

    // ========= Import/Export
    function exportJson(){
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        triageLog: state.triageLog,
        candidatos: state.candidatos
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "triagem_mvp_liotecnica.json";
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

            if(data && Array.isArray(data.candidatos)){
              state.candidatos = data.candidatos;
              saveCands();
            }
            if(data && Array.isArray(data.triageLog)){
              state.triageLog = data.triageLog;
              saveTriageLog();
            }

            state.selectedId = state.candidatos[0]?.id || null;

            renderVagaFilter();
            renderBoard();
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

    // ========= UI wiring
    function initLogo(){
      $("#logoDesktop").src = LOGO_DATA_URI;
      $("#logoMobile").src = LOGO_DATA_URI;
    }

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

    function wireFilters(){
      const fSearch = $("#fSearch");
      const fVaga = $("#fVaga");
      const fSla = $("#fSla");
      if(!fSearch || !fVaga || !fSla) return;

      const apply = () => {
        state.filters.q = (fSearch.value || "").trim();
        state.filters.vagaId = fVaga.value || "all";
        state.filters.sla = fSla.value || "all";
        renderBoard();

        const visibleIds = new Set(getFilteredCands().map(c => c.id));
        if(state.selectedId && !visibleIds.has(state.selectedId)){
          state.selectedId = null;
          saveCands();
          renderDetail();
        }
      };

      fSearch.addEventListener("input", apply);
      fVaga.addEventListener("change", apply);
      fSla.addEventListener("change", apply);
    }

    function wireButtons(){
      $("#btnApplyDecision").addEventListener("click", applyDecision);
      $("#btnAutoTriage").addEventListener("click", autoTriage);

      $("#btnExportJson").addEventListener("click", exportJson);
      $("#btnImportJson").addEventListener("click", importJson);

      $("#btnSeedReset").addEventListener("click", () => {
        const ok = confirm("Restaurar demo? Isso substitui candidatos e log de triagem do MVP.");
        if(!ok) return;
        localStorage.removeItem(CANDS_KEY);
        localStorage.removeItem(TRIAGE_KEY);

        state.candidatos = [];
        state.triageLog = [];
        state.selectedId = null;

        seedCandsIfEmpty();
        saveTriageLog();

        renderVagaFilter();
        renderBoard();
        renderDetail();
        toast("Demo restaurada.");
      });
    }

    // ========= Init
    (function init(){
      initLogo();
      wireClock();

      state.vagas = loadVagas();
      seedVagasIfEmpty();
      const hasC = loadCands();
      loadTriageLog();

      if(!hasC) seedCandsIfEmpty();
      else seedCandsIfEmpty();

      if(!state.vagas.length){
        toast("Nenhuma vaga encontrada no localStorage. Abra a tela de Vagas e crie/seed primeiro.");
      }

      // se não houver candidato selecionado, tenta um em triagem
      if(!state.selectedId){
        state.selectedId = state.candidatos.find(c => c.status === "triagem")?.id || state.candidatos[0]?.id || null;
        saveCands();
      }

      renderVagaFilter();
      renderBoard();
      renderDetail();

      setupDropZones();
      wireFilters();
      wireButtons();
    })();
