// ========= Logo (Data URI placeholder)
    const seed = window.__seedData || {};
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
function enumFirstCode(key, fallback){
      const list = getEnumOptions(key);
      return list.length ? list[0].code : fallback;
    }

    const VAGA_ALL = enumFirstCode("vagaFilter", "all");
    const EMPTY_TEXT = "—";
    const BULLET = "•";

    function setText(root, role, value, fallback = EMPTY_TEXT){
      if(!root) return;
      const el = root.querySelector(`[data-role="${role}"]`);
      if(!el) return;
      el.textContent = (value ?? fallback);
    }

    function buildTag(iconClass, text, cls){
      const tag = cloneTemplate("tpl-tri-tag");
      if(!tag) return document.createElement("span");
      tag.classList.toggle("ok", cls === "ok");
      tag.classList.toggle("warn", cls === "warn");
      tag.classList.toggle("bad", cls === "bad");
      const icon = tag.querySelector('[data-role="icon"]');
      if(icon) icon.className = "bi " + iconClass;
      const label = tag.querySelector('[data-role="text"]');
      if(label) label.textContent = text || "";
      return tag;
    }

    function buildStatusTag(s){
      const map = {
        novo:      { label:"Novo", cls:"" },
        triagem:   { label:"Em triagem", cls:"warn" },
        aprovado:  { label:"Aprovado", cls:"ok" },
        reprovado: { label:"Reprovado", cls:"bad" },
        pendente:  { label:"Pendente", cls:"warn" }
      };
      const it = map[s] || { label: s, cls:"" };
      return buildTag("bi-dot", it.label, it.cls);
    }

    function formatDecisionReason(code){
      if(!code) return "";
      return getEnumText("triagemDecisionReason", code, code);
    }


    // ========= Storage keys (compatÃ­veis com a tela de Candidatos/Vagas)
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

    // ========= Matching (MVP keyword) â€” mesmo padrão da tela de Candidatos
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

    function buildMatchTag(score, thr){
      const s = clamp(parseInt(score||0,10)||0,0,100);
      const t = clamp(parseInt(thr||0,10)||0,0,100);
      const ok = s >= t;
      const cls = ok ? "ok" : (s >= (t*0.8) ? "warn" : "bad");
      const text = ok ? "Dentro" : "Abaixo";
      return buildTag("bi-stars", `${s}% ${BULLET} ${text}`, cls);
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
        .map(v => {
          const title = v.titulo || EMPTY_TEXT;
          const code = v.codigo || EMPTY_TEXT;
          return { id: v.id, label: `${title} (${code})` };
        })
        .sort((a,b)=>a.label.localeCompare(b.label, "pt-BR"));
    }

    function renderVagaFilter(){
      const sel = $("#fVaga");
      if(!sel) return;
      const cur = sel.value || VAGA_ALL;
      sel.replaceChildren();
      getEnumOptions("vagaFilter").forEach(opt => {
        sel.appendChild(buildOption(opt.code, opt.text, opt.code === cur));
      });
      distinctVagas().forEach(v => {
        sel.appendChild(buildOption(v.id, v.label, v.id === cur));
      });
      sel.value = (cur === VAGA_ALL || state.vagas.some(v => v.id === cur)) ? cur : VAGA_ALL;
    }

    function getFilteredCands(){
      const q = (state.filters.q || "").trim().toLowerCase();
      const vid = state.filters.vagaId;
      const sla = state.filters.sla;

      return state.candidatos.filter(c => {
        // só³ pipeline de triagem
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

      renderStageList("#listTriagem", g.triagem);
      renderStageList("#listPendente", g.pendente);
      renderStageList("#listAprovado", g.aprovado);
      renderStageList("#listReprovado", g.reprovado);

      $("#countTriagem").textContent = g.triagem.length;
      $("#countPendente").textContent = g.pendente.length;
      $("#countAprovado").textContent = g.aprovado.length;
      $("#countReprovado").textContent = g.reprovado.length;
    }

    function renderStageList(selector, items){
      const host = $(selector);
      if(!host) return;
      host.replaceChildren();

      if(!items.length){
        const empty = cloneTemplate("tpl-tri-empty");
        if(empty) host.appendChild(empty);
        return;
      }

      items.forEach(c => {
        const card = buildTriItem(c);
        if(card) host.appendChild(card);
      });
    }

    function buildTriItem(c){
      const v = findVaga(c.vagaId);
      const m = calcMatchForCand(c);
      const thr = m.threshold ?? (v ? v.threshold : 0);
      const si = slaInfo(c);

      const card = cloneTemplate("tpl-tri-card");
      if(!card) return null;

      card.dataset.id = c.id;
      card.draggable = true;
      if(c.id === state.selectedId) card.classList.add("active");

      setText(card, "cand-initials", initials(c.nome));
      setText(card, "cand-name", c.nome);
      setText(card, "cand-email", c.email);

      const vagaCode = card.querySelector('[data-role="vaga-code"]');
      if(vagaCode){
        vagaCode.textContent = v ? (v.codigo || EMPTY_TEXT) : "Sem vaga";
        vagaCode.classList.toggle("mono", !!v);
      }
      setText(card, "vaga-title", v ? v.titulo : EMPTY_TEXT);

      const score = clamp(parseInt(m.score||0,10)||0,0,100);
      const thrVal = clamp(parseInt(thr||0,10)||0,0,100);
      const progress = card.querySelector('[data-role="match-progress"]');
      if(progress) progress.style.width = `${score}%`;
      setText(card, "match-score", `${score}%`);
      setText(card, "match-thr", `${thrVal}%`);

      const matchStatus = card.querySelector('[data-role="match-status"]');
      if(matchStatus){
        matchStatus.textContent = m.pass ? "dentro" : "abaixo";
        matchStatus.classList.toggle("text-success", !!m.pass);
        matchStatus.classList.toggle("text-danger", !m.pass);
      }

      const tags = card.querySelector('[data-role="tri-tags"]');
      if(tags){
        tags.replaceChildren();
        if(si.has){
          if(si.late){
            tags.appendChild(buildTag("bi-alarm", "SLA atrasado", "bad"));
          }else{
            tags.appendChild(buildTag("bi-alarm", `${Math.ceil(si.leftH)}h`, "warn"));
          }
        }else{
          tags.appendChild(buildTag("bi-dash-circle", "Sem SLA", ""));
        }

        const missCount = (m.missMandatory || []).length;
        tags.appendChild(buildTag(
          missCount ? "bi-exclamation-triangle" : "bi-check2",
          missCount ? `${missCount} obrig.` : "Obrig. OK",
          missCount ? "bad" : "ok"
        ));
      }

      const btnDetails = card.querySelector('[data-act="details"]');
      if(btnDetails){
        btnDetails.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openDetails(c.id);
        });
      }

      const btnDecision = card.querySelector('[data-act="decision"]');
      if(btnDecision){
        btnDecision.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          openDecision(c.id);
        });
      }

      card.addEventListener("dragstart", onDragStart);
      return card;
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
      toast(`Movido: ${labelStage(prev)} â†’ ${labelStage(newStage)}`);
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
    function renderDetail(){
      const host = $("#triagemDetailBody");
      if(!host) return;
      host.replaceChildren();

      const c = findCand(state.selectedId);
      if(!c){
        const empty = cloneTemplate("tpl-tri-detail-empty");
        if(empty) host.appendChild(empty);
        return;
      }

      const v = findVaga(c.vagaId);
      const m = calcMatchForCand(c);
      const thr = m.threshold ?? (v ? v.threshold : 0);
      const si = slaInfo(c);

      const updated = c.updatedAt ? new Date(c.updatedAt) : null;
      const updatedTxt = updated ? updated.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) : EMPTY_TEXT;

      const miss = (m.missMandatory||[]).map(r=>r.termo).slice(0,12);
      const hit = (m.hits||[]).map(r=>r.termo).slice(0,12);

      const log = state.triageLog.filter(x => x.candId === c.id).slice(0, 10);

      const slaTxt = si.has ? (si.late ? "Atrasado" : `Faltam ~${Math.ceil(si.leftH)}h`) : "Sem SLA";

      const root = cloneTemplate("tpl-tri-detail");
      if(!root) return;

      setText(root, "detail-initials", initials(c.nome));
      setText(root, "detail-name", c.nome);
      setText(root, "detail-email", c.email);
      setText(root, "detail-updated", updatedTxt);

      const statusHost = root.querySelector('[data-role="detail-status-host"]');
      if(statusHost) statusHost.replaceChildren(buildStatusTag(c.status));
      setText(root, "detail-sla", slaTxt);

      const vagaTitle = v ? (v.titulo || EMPTY_TEXT) : "Vaga nao vinculada";
      setText(root, "detail-vaga-title", vagaTitle);
      setText(root, "detail-vaga-code", v?.codigo);
      const thrVal = clamp(parseInt(thr||0,10)||0,0,100);
      setText(root, "detail-vaga-thr", v ? `${thrVal}%` : EMPTY_TEXT);
      toggleRole(root, "detail-vaga-code-wrap", !!v);
      toggleRole(root, "detail-vaga-thr-wrap", !!v);

      const matchHost = root.querySelector('[data-role="detail-match-host"]');
      if(matchHost){
        matchHost.replaceChildren();
        if(v){
          matchHost.appendChild(buildMatchTag(m.score, thr));
        }else{
          matchHost.appendChild(buildTag("bi-dash-circle", EMPTY_TEXT, ""));
        }
      }

      const score = clamp(parseInt(m.score||0,10)||0,0,100);
      const progress = root.querySelector('[data-role="detail-match-progress"]');
      if(progress) progress.style.width = `${score}%`;
      setText(root, "detail-match-score", `${score}%`);
      setText(root, "detail-match-hits", (m.hits||[]).length);
      setText(root, "detail-match-miss", (m.missMandatory||[]).length);

      const missAlert = root.querySelector('[data-role="detail-miss-alert"]');
      const hitAlert = root.querySelector('[data-role="detail-hit-alert"]');
      if(missAlert) missAlert.classList.toggle("d-none", !miss.length);
      if(hitAlert) hitAlert.classList.toggle("d-none", !!miss.length);
      setText(root, "detail-miss-list", miss.join(", "));
      setText(root, "detail-hit-list", hit.length ? hit.join(", ") : EMPTY_TEXT);

      const logHost = root.querySelector('[data-role="tri-log-list"]');
      if(logHost){
        logHost.replaceChildren();
        if(log.length){
          log.forEach(x => {
            const item = cloneTemplate("tpl-tri-log-item");
            if(!item) return;
            const title = `${labelStage(x.from)} -> ${labelStage(x.to)}`;
            const reasonTxt = formatDecisionReason(x.reason) || "-";
            const noteTxt = x.note ? `${BULLET} ${x.note}` : "";
            setText(item, "log-title", title);
            setText(item, "log-note", `${reasonTxt} ${noteTxt}`.trim());
            setText(item, "log-time", new Date(x.at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }));
            logHost.appendChild(item);
          });
        }else{
          const empty = cloneTemplate("tpl-tri-log-empty");
          if(empty) logHost.appendChild(empty);
        }
      }

      host.appendChild(root);
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

      $("#decisionTitle").textContent = `Decisão â€¢ ${c.nome}`;

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
        return { action:"reprovado", reason:"missing_mandatory" };
      }
      if(m.score < thr){
        const gap = thr - m.score;
        if(gap >= 25) return { action:"reprovado", reason:"below_threshold" };
        return { action:"pendente", reason:"needs_validation" };
      }
      return { action:"aprovado", reason:"profile_fit" };
    }

    function applyDecision(){
      const id = $("#decCandId").value;
      const action = $("#decAction").value;
      const reason = ($("#decReason").value || "").trim();
      const reasonLabel = formatDecisionReason(reason);
      const obs = ($("#decObs").value || "").trim();

      const c = findCand(id);
      if(!c) return;

      moveStage(id, action, {
        reason: reason || "Decisao",
        note: obs || ""
      });

      // tambÃ©m grava observação no candidato (append)
      if(reason || obs){
        const lines = [];
        if(reason) lines.push(reasonLabel || reason);
        if(obs) lines.push(obs);
        const note = lines.join(" â€¢ ");
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
        // (mantÃ©m pendente como pendente quando sugerido, mas aqui move para pendente)
        if(sug.action && sug.action !== "triagem"){
          moveStage(c.id, sug.action, { reason: "Auto-triagem", note: formatDecisionReason(sug.reason) || "" });
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
            toast("Importação concluí­da.");
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




