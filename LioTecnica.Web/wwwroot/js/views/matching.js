// ========= Logo (Data URI placeholder)
    const seed = window.__seedData || {};
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
function enumFirstCode(key, fallback){
      const list = getEnumOptions(key);
      return list.length ? list[0].code : fallback;
    }

    const VAGA_ALL = enumFirstCode("vagaFilter", "all");
    const STATUS_ALL = enumFirstCode("candidatoStatusFilter", "all");
    const SORT_DEFAULT = enumFirstCode("matchingSort", "score_desc");
    const EMPTY_TEXT = "—";
    const BULLET = "-";
    function setText(root, role, value, fallback = EMPTY_TEXT){
      if(!root) return;
      const el = root.querySelector(`[data-role="${role}"]`);
      if(!el) return;
      el.textContent = (value ?? fallback);
    }

    function buildTag(iconClass, text, cls){
      const tag = cloneTemplate("tpl-matching-tag");
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

    function buildStatusTag(status){
      const map = {
        novo: { label: "Novo", cls: "" },
        triagem: { label: "Triagem", cls: "warn" },
        pendente: { label: "Pendente", cls: "warn" },
        aprovado: { label: "Aprov.", cls: "ok" },
        reprovado: { label: "Reprov.", cls: "bad" }
      };
      const it = map[status] || { label: status, cls: "" };
      return buildTag("bi-dot", it.label, it.cls);
    }

    function buildMatchTag(score, thr){
      const s = clamp(parseInt(score||0,10)||0,0,100);
      const t = clamp(parseInt(thr||0,10)||0,0,100);
      const ok = s >= t;
      const cls = ok ? "ok" : (s >= (t*0.8) ? "warn" : "bad");
      const text = ok ? "Dentro" : "Abaixo";
      return buildTag("bi-stars", `${s}% ${BULLET} ${text}`, cls);
    }
// ========= Storage keys
    const VAGAS_KEY = "lt_rh_vagas_v1";
    const CANDS_KEY = "lt_rh_candidatos_v1";
    const MATCH_KEY = "lt_rh_matching_cache_v1"; // cache simples de score/hits por candidato+vaga (MVP)

    const state = {
      vagas: [],
      candidatos: [],
      matchCache: {}, // { "<candId>|<vagaId>": {score, pass, hits[], missMandatory[], at} }
      selectedId: null,
      filters: { q:"", vagaId:VAGA_ALL, status:STATUS_ALL, sort:SORT_DEFAULT }
    };

    function findVaga(id){
      return state.vagas.find(v => v.id === id) || null;
    }

    function findCand(id){
      return state.candidatos.find(c => c.id === id) || null;
    }

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
        // se jÃ¡ existia, respeita o formato e sÃ³ substitui os candidatos/selected
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

      // tambÃ©m grava em lastMatch do candidato (sem quebrar outras telas)
      cand.lastMatch = { score, pass, at: result.at, vagaId: vaga.id };
      cand.updatedAt = new Date().toISOString();
      saveCands();

      return { ...result, fromCache: false };
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

    // ========= Render list
    function renderList(){
      const filtered = sortList(getFiltered());
      $("#listCount").textContent = filtered.length;
      $("#kpiTotal").textContent = filtered.length;

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

      const visibleIds = new Set(filtered.map(x => x.id));
      if(state.selectedId && !visibleIds.has(state.selectedId)){
        state.selectedId = null;
        saveCands();
      }
      if(!state.selectedId && filtered[0]){
        state.selectedId = filtered[0].id;
        saveCands();
      }

      const host = $("#candList");
      host.replaceChildren();
      if(!filtered.length){
        const empty = cloneTemplate("tpl-matching-empty");
        if(empty) host.appendChild(empty);
      }else{
        filtered.forEach(c => {
          const item = buildListItem(c);
          if(item) host.appendChild(item);
        });
      }

    }

    function buildListItem(c){
      const v = state.filters.vagaId === "all" ? findVaga(c.vagaId) : findVaga(state.filters.vagaId);
      const m = v ? calcMatch(c, v) : { score: 0, threshold: 0, pass:false, hits:[], missMandatory:[] };

      const item = cloneTemplate("tpl-matching-item");
      if(!item) return null;
      item.dataset.id = c.id;
      if(c.id === state.selectedId) item.classList.add("active");

      setText(item, "item-initials", initials(c.nome));
      setText(item, "item-name", c.nome);
      setText(item, "item-email", c.email);

      const vagaCode = item.querySelector('[data-role="item-vaga-code"]');
      if(vagaCode){
        vagaCode.textContent = v ? (v.codigo || EMPTY_TEXT) : "Sem vaga";
        vagaCode.classList.toggle("mono", !!v);
      }
      setText(item, "item-vaga-title", v ? v.titulo : EMPTY_TEXT);

      const score = clamp(parseInt(m.score||0,10)||0,0,100);
      const progress = item.querySelector('[data-role="item-progress"]');
      if(progress) progress.style.width = `${score}%`;
      setText(item, "item-score", `${score}%`);

      const tagsHost = item.querySelector('[data-role="item-tags"]');
      if(tagsHost){
        tagsHost.replaceChildren();
        tagsHost.appendChild(buildMatchTag(m.score, m.threshold));

        const missCount = (m.missMandatory||[]).length;
        tagsHost.appendChild(buildTag(
          missCount ? "bi-exclamation-triangle" : "bi-check2",
          missCount ? `${missCount} obrig.` : "Obrig. OK",
          missCount ? "bad" : "ok"
        ));

        tagsHost.appendChild(buildStatusTag(c.status || "novo"));
      }

      item.addEventListener("click", () => {
        state.selectedId = item.dataset.id;
        saveCands();
        renderList();
        const selected = findCand(state.selectedId);
        openDetailModal(selected);
      });

      return item;
    }

    function buildReqRow(r, hitIds, missIds){
      const isHit = hitIds.has(r.id);
      const isMiss = missIds.has(r.id);
      const row = cloneTemplate("tpl-matching-req-row");
      if(!row) return null;

      if(isHit) row.classList.add("hit");
      if(isMiss) row.classList.add("miss");

      const icon = row.querySelector('[data-role="req-icon"]');
      if(icon) icon.className = "bi bi-" + (isHit ? "check2-circle" : (isMiss ? "x-circle" : "dash-circle"));

      setText(row, "req-term", r.termo);
      setText(row, "req-weight", clamp(parseInt(r.peso||0,10)||0,0,10));

      const obrigEl = row.querySelector('[data-role="req-obrig"]');
      if(obrigEl){
        obrigEl.textContent = r.obrigatorio ? "obrigatorio" : "desejavel";
        obrigEl.classList.toggle("text-danger", !!r.obrigatorio);
        obrigEl.classList.toggle("fw-semibold", !!r.obrigatorio);
      }

      const syn = (r.sinonimos || []).join(", ");
      setText(row, "req-syn", syn);
      toggleRole(row, "req-syn-wrap", !!syn);

      const tagHost = row.querySelector('[data-role="req-tag-host"]');
      if(tagHost){
        const tag = isHit ? buildTag("bi-check2", "OK", "ok") :
                    (isMiss ? buildTag("bi-x-lg", "Faltando", "bad") : buildTag("bi-dash", "Nao achou", ""));
        tagHost.replaceChildren(tag);
      }

      return row;
    }

    // ========= Detail
    function renderDetail(c, host){
      if(!host) return;
      host.replaceChildren();

      if(!c){
        const empty = cloneTemplate("tpl-matching-detail-empty");
        if(empty) host.appendChild(empty);
        return;
      }

      const v = state.filters.vagaId === "all" ? findVaga(c.vagaId) : findVaga(state.filters.vagaId);
      if(!v){
        const empty = cloneTemplate("tpl-matching-detail-novaga");
        if(empty) host.appendChild(empty);
        return;
      }

      const m = calcMatch(c, v);
      const miss = (m.missMandatory||[]);
      const hits = (m.hits||[]);
      const reqs = (v.requisitos||[]);

      const hitIds = new Set(hits.map(x => x.id));
      const missIds = new Set(miss.map(x => x.id));

      const root = cloneTemplate("tpl-matching-detail");
      if(!root) return;

      setText(root, "detail-initials", initials(c.nome));
      setText(root, "detail-name", c.nome);
      setText(root, "detail-email", c.email);
      setText(root, "detail-updated", fmtDate(c.updatedAt));

      const matchTagHost = root.querySelector('[data-role="detail-match-tag"]');
      if(matchTagHost) matchTagHost.replaceChildren(buildMatchTag(m.score, m.threshold));

      const thrVal = clamp(parseInt(m.threshold||0,10)||0,0,100);
      setText(root, "detail-thr", `${thrVal}%`);

      const cacheIcon = root.querySelector('[data-role="detail-cache-icon"]');
      if(cacheIcon) cacheIcon.className = m.fromCache ? "bi bi-hdd me-1" : "bi bi-cpu me-1";
      setText(root, "detail-cache-text", m.fromCache ? "cache" : "calculado");

      setText(root, "detail-vaga-title", v.titulo);
      setText(root, "detail-vaga-code", v.codigo);
      setText(root, "detail-req-count", reqs.length);
      setText(root, "detail-hit-count", hits.length);
      setText(root, "detail-miss-count", miss.length);

      const score = clamp(parseInt(m.score||0,10)||0,0,100);
      setText(root, "detail-score", `${score}%`);
      const scoreBar = root.querySelector('[data-role="detail-score-bar"]');
      if(scoreBar) scoreBar.style.width = `${score}%`;

      const reqHost = root.querySelector("#reqList");
      if(reqHost){
        reqHost.replaceChildren();
        reqs.forEach(r => {
          const row = buildReqRow(r, hitIds, missIds);
          if(row) reqHost.appendChild(row);
        });
      }

      setText(root, "detail-hitPeso", m.hitPeso);
      setText(root, "detail-totalPeso", m.totalPeso);
      const penalty = miss.length ? ("-" + Math.min(40, miss.length*15)) : "0";
      setText(root, "detail-penalty", penalty);

      const cv = root.querySelector("#cvTextArea");
      if(cv) cv.value = c.cvText || "";

      host.appendChild(root);

      const bind = (id, fn) => {
        const el = root.querySelector("#" + id);
        if(el) el.addEventListener("click", fn);
      };

      const get = (id) => root.querySelector("#" + id);

      bind("btnRecalcOne", () => {
        clearCacheFor(c.id, v.id);
        calcMatch(c, v);
        toast("Recalculado.");
        renderList();
        renderDetail(c, host);
      });
      bind("btnClearCacheOne", () => {
        clearCacheFor(c.id, v.id);
        toast("Cache limpo (candidato/vaga).");
        renderList();
        renderDetail(c, host);
      });
      bind("btnSaveCvText", () => {
        const txt = (get("cvTextArea")?.value || "");
        c.cvText = txt;
        c.updatedAt = new Date().toISOString();
        saveCands();
        clearCacheFor(c.id, v.id);
        toast("Texto do CV salvo. Recalcule para atualizar o score.");
        renderList();
        renderDetail(c, host);
      });
      bind("btnClearCacheVaga", () => {
        clearCacheForVaga(v.id);
        toast("Cache limpo (vaga).");
        renderList();
        renderDetail(c, host);
      });
    }

    function openDetailModal(c){
      const host = $("#detailModalBody");
      if(!host) return;
      renderDetail(c, host);
      const modalEl = $("#modalMatchingDetail");
      if(modalEl && window.bootstrap){
        bootstrap.Modal.getOrCreateInstance(modalEl).show();
      }
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
      toast("ExportaÃ§Ã£o iniciada.");
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
            toast("ImportaÃ§Ã£o concluÃ­da.");
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
    function resetFiltersUI(){
      state.filters = { q:"", vagaId: VAGA_ALL, status: STATUS_ALL, sort: SORT_DEFAULT };
      const search = $("#fSearch");
      if(search) search.value = "";
      const fVaga = $("#fVaga");
      if(fVaga) fVaga.value = VAGA_ALL;
      const fStatus = $("#fStatus");
      if(fStatus) fStatus.value = STATUS_ALL;
      const fSort = $("#fSort");
      if(fSort) fSort.value = SORT_DEFAULT;
    }
    function wireFilters(){
      const apply = () => {
        state.filters.q = ($("#fSearch").value || "").trim();
        state.filters.vagaId = $("#fVaga").value || VAGA_ALL;
        state.filters.status = $("#fStatus").value || STATUS_ALL;
        state.filters.sort = $("#fSort").value || SORT_DEFAULT;
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
      resetFiltersUI();

      // default selection
      state.selectedId = state.candidatos[0]?.id || null;
      saveCands();

      wireFilters();
      wireButtons();

      renderList();
    })();

