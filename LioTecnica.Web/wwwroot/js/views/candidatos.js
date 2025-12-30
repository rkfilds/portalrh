// ========= Logo (mesmo Data URI usado antes)
    const seed = window.__seedData || {};
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
    function enumFirstCode(key, fallback){
      const list = getEnumOptions(key);
      return list.length ? list[0].code : fallback;
    }

    const VAGA_ALL = enumFirstCode("vagaFilter", "all");
    const SELECT_PLACEHOLDER = enumFirstCode("selectPlaceholder", "");
    const DEFAULT_CAND_FONTE = enumFirstCode("candidatoFonte", "Email");
    const DEFAULT_CAND_STATUS = enumFirstCode("candidatoStatus", "novo");
    const EMPTY_TEXT = "\u2014";
    const BULLET = "\u2022";

    function setText(root, role, value, fallback = EMPTY_TEXT){
      if(!root) return;
      const el = root.querySelector(`[data-role="${role}"]`);
      if(!el) return;
      el.textContent = (value ?? fallback);
    }

    function buildStatusTag(s){
      const map = {
        novo:      { cls:"" },
        triagem:   { cls:"warn" },
        aprovado:  { cls:"ok" },
        reprovado: { cls:"bad" },
        pendente:  { cls:"warn" }
      };
      const it = map[s] || { cls:"" };
      const labelText = getEnumText("candidatoStatus", s, s);
      const tag = cloneTemplate("tpl-cand-status-tag");
      if(!tag) return document.createElement("span");
      tag.classList.toggle("ok", it.cls === "ok");
      tag.classList.toggle("warn", it.cls === "warn");
      tag.classList.toggle("bad", it.cls === "bad");
      const icon = tag.querySelector('[data-role="icon"]');
      if(icon) icon.className = "bi bi-dot";
      const text = tag.querySelector('[data-role="text"]');
      if(text) text.textContent = labelText || "";
      return tag;
    }

    // ========= Storage keys
    // Vagas: reaproveita o mesmo key do arquivo anterior
    const VAGAS_KEY = "lt_rh_vagas_v1";
    const CANDS_KEY = "lt_rh_candidatos_v1";

    const state = {
      vagas: [],
      candidatos: [],
      selectedId: null,
      filters: { q:"", status:"all", vagaId:"all" }
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

    // ========= Matching (MVP keyword)
    function calcMatchForCand(cand){
      const v = findVaga(cand.vagaId);
      if(!v) return { score: 0, pass: false, hits: [], missMandatory: [], totalPeso: 1, hitPeso: 0 };

      const text = normalizeText(cand.cvText || "");
      const reqs = (v.requisitos || []);
      if(!text || !reqs.length){
        const thr = clamp(parseInt(v.threshold || 0,10)||0,0,100);
        return { score: 0, pass: 0 >= thr, hits: [], missMandatory: [], totalPeso: 1, hitPeso: 0 };
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
      const tag = cloneTemplate("tpl-cand-status-tag");
      if(!tag) return document.createElement("span");
      tag.classList.toggle("ok", cls === "ok");
      tag.classList.toggle("warn", cls === "warn");
      tag.classList.toggle("bad", cls === "bad");
      const icon = tag.querySelector('[data-role="icon"]');
      if(icon) icon.className = "bi bi-stars";
      const label = tag.querySelector('[data-role="text"]');
      if(label) label.textContent = `${s}% ${BULLET} ${text}`;
      return tag;
    }

    // ========= KPIs
    function updateKpis(){
      const total = state.candidatos.length;
      const triagem = state.candidatos.filter(c => c.status === "triagem").length;
      const aprov = state.candidatos.filter(c => c.status === "aprovado").length;
      const repro = state.candidatos.filter(c => c.status === "reprovado").length;

      $("#kpiTotal").textContent = total;
      $("#kpiTriagem").textContent = triagem;
      $("#kpiAprov").textContent = aprov;
      $("#kpiReprov").textContent = repro;
    }

    // ========= Filters
    function distinctVagas(){
      return state.vagas
        .map(v => {
          const title = v.titulo || EMPTY_TEXT;
          const code = v.codigo || EMPTY_TEXT;
          return { id: v.id, label: `${title} (${code})` };
        })
        .sort((a,b)=>a.label.localeCompare(b.label, "pt-BR"));
    }

    function renderVagaFilters(){
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

      const sel2 = $("#candVaga");
      sel2.replaceChildren();
      getEnumOptions("selectPlaceholder").forEach(opt => {
        sel2.appendChild(buildOption(opt.code, opt.text, opt.code === SELECT_PLACEHOLDER));
      });
      distinctVagas().forEach(v => {
        sel2.appendChild(buildOption(v.id, v.label, v.id === (sel2.value || "")));
      });
    }

    function getFilteredCands(){
      const q = (state.filters.q || "").trim().toLowerCase();
      const st = state.filters.status;
      const vid = state.filters.vagaId;

      return state.candidatos.filter(c => {
        if(st !== "all" && c.status !== st) return false;
        if(vid !== "all" && c.vagaId !== vid) return false;

        if(!q) return true;

        const v = findVaga(c.vagaId);
        const blob = [
          c.nome, c.email, c.fone,
          v?.titulo, v?.codigo,
          c.cidade, c.uf, c.fonte, c.status
        ].join(" ").toLowerCase();

        return blob.includes(q);
      });
    }

    // ========= Rendering list
    function renderList(){
      const tbody = $("#tblCands");
      tbody.replaceChildren();

      const rows = getFilteredCands();
      if(!rows.length){
        const emptyRow = cloneTemplate("tpl-cand-empty-row");
        if(emptyRow) tbody.appendChild(emptyRow);
        return;
      }

      rows.forEach(c => {
        const v = findVaga(c.vagaId);
        const isSel = c.id === state.selectedId;

        const m = calcMatchForCand(c);
        const thr = m.threshold ?? (v ? v.threshold : 0);

        const tr = cloneTemplate("tpl-cand-row");
        if(!tr) return;
        tr.style.cursor = "default";
        if(isSel) tr.classList.add("table-active");

        setText(tr, "cand-initials", initials(c.nome));
        setText(tr, "cand-name", c.nome);
        setText(tr, "cand-email", c.email);
        setText(tr, "cand-phone", c.fone);

        const hasPhone = !!c.fone;
        toggleRole(tr, "cand-phone", hasPhone);
        toggleRole(tr, "cand-phone-sep", hasPhone);

        setText(tr, "vaga-title", v?.titulo);
        setText(tr, "vaga-code", v?.codigo);

        const statusHost = tr.querySelector('[data-role="status-host"]');
        if(statusHost){
          statusHost.replaceChildren(buildStatusTag(c.status));
        }

        const matchHost = tr.querySelector('[data-role="match-host"]');
        if(matchHost){
          matchHost.replaceChildren();
          if(v){
            matchHost.appendChild(buildMatchTag(m.score, thr));
          }else{
            const span = document.createElement("span");
            span.className = "text-muted";
            span.textContent = EMPTY_TEXT;
            matchHost.appendChild(span);
          }
        }

        tr.querySelectorAll("button[data-act]").forEach(btn => {
          btn.dataset.id = c.id;
        });

        tr.addEventListener("click", (ev) => {
          const btn = ev.target.closest("button[data-act]");
          if(btn){
            ev.preventDefault();
            ev.stopPropagation();
            const act = btn.dataset.act;
            const id = btn.dataset.id;
            if(act === "detail") openDetailModal(id);
            if(act === "edit") openCandModal("edit", id);
            if(act === "recalc") recalcMatch(id);
            if(act === "del") deleteCand(id);
            return;
          }
        });

        tbody.appendChild(tr);
      });
    }

    function selectCand(id){
      state.selectedId = id;
      saveCands();
      renderList();
      renderDetail();
    }

function openDetailModal(id){
      selectCand(id);
      const modal = bootstrap.Modal.getOrCreateInstance($("#modalCandDetalhes"));
      modal.show();
    }

    // ========= Detail UI
    function fillVagaSelect(select, selectedId, includePlaceholder){
      if(!select) return;
      select.replaceChildren();
      if(includePlaceholder){
        getEnumOptions("selectPlaceholder").forEach(opt => {
          const isSelected = selectedId ? opt.code === selectedId : opt.code === SELECT_PLACEHOLDER;
          select.appendChild(buildOption(opt.code, opt.text, isSelected));
        });
      }
      distinctVagas().forEach(v => {
        select.appendChild(buildOption(v.id, v.label, v.id === selectedId));
      });
    }

    function renderDetail(){
      const host = $("#detailHost");
      host.replaceChildren();

      const c = findCand(state.selectedId);
      if(!c){
        const empty = cloneTemplate("tpl-cand-detail-empty");
        if(empty) host.appendChild(empty);
        return;
      }

      const v = findVaga(c.vagaId);
      const updated = c.updatedAt ? new Date(c.updatedAt) : null;
      const updatedTxt = updated ? updated.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) : EMPTY_TEXT;

      const root = cloneTemplate("tpl-cand-detail");
      if(!root) return;

      setText(root, "detail-initials", initials(c.nome));
      setText(root, "detail-name", c.nome);
      setText(root, "detail-email", c.email);
      setText(root, "detail-phone", c.fone);
      const hasPhone = !!c.fone;
      toggleRole(root, "detail-phone", hasPhone);
      toggleRole(root, "detail-phone-sep", hasPhone);

      const locParts = [c.cidade, c.uf].filter(Boolean);
      const hasLoc = locParts.length > 0;
      setText(root, "detail-location", hasLoc ? locParts.join(" - ") : EMPTY_TEXT);
      toggleRole(root, "detail-location-icon", hasLoc);
      toggleRole(root, "detail-location-sep", hasLoc);
      setText(root, "detail-source", getEnumText("candidatoFonte", c.fonte, c.fonte));

      const statusHost = root.querySelector('[data-role="detail-status-host"]');
      if(statusHost) statusHost.replaceChildren(buildStatusTag(c.status));

      setText(root, "detail-updated", updatedTxt);

      const vagaTitle = v ? (v.titulo || EMPTY_TEXT) : "Vaga nao vinculada";
      setText(root, "detail-vaga-title", vagaTitle);
      setText(root, "detail-vaga-code", v?.codigo);
      const thrVal = clamp(parseInt(v?.threshold ?? 0,10)||0,0,100);
      setText(root, "detail-vaga-thr", v ? `${thrVal}%` : EMPTY_TEXT);
      toggleRole(root, "detail-vaga-code-wrap", !!v);
      toggleRole(root, "detail-vaga-thr-wrap", !!v);

      setText(root, "detail-obs", c.obs);

      const statusSel = root.querySelector("#detailStatus");
      fillSelectFromEnum(statusSel, "candidatoStatus", c.status);

      const vagaSel = root.querySelector("#detailVaga");
      fillVagaSelect(vagaSel, c.vagaId, true);

      const cvText = root.querySelector("#detailCvText");
      if(cvText) cvText.value = c.cvText || "";

      const m = calcMatchForCand(c);
      const thr = m.threshold ?? (v ? v.threshold : 0);
      const pass = !!m.pass;

      toggleRole(root, "match-has-vaga", !!v);
      toggleRole(root, "match-no-vaga", !v);

      if(v){
        const matchStatusHost = root.querySelector('[data-role="match-status-host"]');
        if(matchStatusHost){
          const tag = cloneTemplate("tpl-cand-status-tag");
          if(tag){
            tag.classList.toggle("ok", pass);
            tag.classList.toggle("bad", !pass);
            const icon = tag.querySelector('[data-role="icon"]');
            if(icon) icon.className = pass ? "bi bi-check2-circle" : "bi bi-x-circle";
            const label = tag.querySelector('[data-role="text"]');
            if(label) label.textContent = pass ? "Dentro do minimo" : "Abaixo do minimo";
            matchStatusHost.replaceChildren(tag);
          }
        }

        const score = clamp(parseInt(m.score||0,10)||0,0,100);
        const thrValue = clamp(parseInt(thr||0,10)||0,0,100);
        const progress = root.querySelector('[data-role="match-progress"]');
        if(progress) progress.style.width = `${score}%`;
        setText(root, "match-score", `${score}%`);
        setText(root, "match-thr", `${thrValue}%`);
        setText(root, "match-hits-count", (m.hits||[]).length);
        setText(root, "match-miss-count", (m.missMandatory||[]).length);

        const hits = (m.hits || []).map(r => r.termo).slice(0, 12);
        const misses = (m.missMandatory || []).map(r => r.termo).slice(0, 12);

        const missBlock = root.querySelector('[data-role="match-miss-block"]');
        if(missBlock) missBlock.classList.toggle("d-none", !misses.length);
        setText(root, "match-miss-list", misses.join(", "));
        setText(root, "match-hit-list", hits.length ? hits.join(", ") : EMPTY_TEXT);
      }

      host.appendChild(root);
      bindDetailActions(c);
    }

    function bindDetailActions(c){
      if(!c) return;

      $$("#detailHost [data-dact]").forEach(btn => {
        btn.addEventListener("click", () => {
          const act = btn.dataset.dact;
          if(act === "edit") openCandModal("edit", c.id);
          if(act === "delete") deleteCand(c.id);
          if(act === "saveCv") saveCvText(c.id, false);
          if(act === "recalc") recalcMatch(c.id);
          if(act === "saveMeta") saveMeta(c.id, false);
          if(act === "openVaga") toast("Placeholder: aqui abriria a tela de Vagas filtrada na vaga.");
        });
      });
    }

    
    // ========= CRUD: Candidatos
    function openCandModal(mode, id){
      const modal = bootstrap.Modal.getOrCreateInstance($("#modalCand"));
      const isEdit = mode === "edit";
      $("#modalCandTitle").textContent = isEdit ? "Editar candidato" : "Novo candidato";

      // refresh vagas dropdown
      renderVagaFilters();

      if(isEdit){
        const c = findCand(id);
        if(!c) return;
        $("#candId").value = c.id;
        $("#candNome").value = c.nome || "";
        $("#candEmail").value = c.email || "";
        $("#candFone").value = c.fone || "";
        $("#candCidade").value = c.cidade || "";
        $("#candUF").value = (c.uf || "").toUpperCase().slice(0,2);
        $("#candFonte").value = c.fonte || DEFAULT_CAND_FONTE;
        $("#candStatus").value = c.status || DEFAULT_CAND_STATUS;
        $("#candVaga").value = c.vagaId || "";
        $("#candObs").value = c.obs || "";
      }else{
        $("#candId").value = "";
        $("#candNome").value = "";
        $("#candEmail").value = "";
        $("#candFone").value = "";
        $("#candCidade").value = "";
        $("#candUF").value = "SP";
        $("#candFonte").value = DEFAULT_CAND_FONTE;
        $("#candStatus").value = DEFAULT_CAND_STATUS;
        $("#candVaga").value = state.vagas[0]?.id || "";
        $("#candObs").value = "";
      }

      modal.show();
    }

    function upsertCandFromModal(){
      const id = $("#candId").value || null;
      const nome = ($("#candNome").value || "").trim();
      const email = ($("#candEmail").value || "").trim();
      const fone = ($("#candFone").value || "").trim();
      const cidade = ($("#candCidade").value || "").trim();
      const uf = ($("#candUF").value || "").trim().toUpperCase().slice(0,2);
      const fonte = ($("#candFonte").value || "").trim();
      const status = ($("#candStatus").value || "").trim();
      const vagaId = ($("#candVaga").value || "").trim();
      const obs = ($("#candObs").value || "").trim();

      if(!nome){ toast("Informe o nome do candidato."); return; }
      if(!email){ toast("Informe o email do candidato."); return; }
      if(!vagaId){ toast("Selecione uma vaga."); return; }

      const now = new Date().toISOString();

      if(id){
        const c = findCand(id);
        if(!c) return;

        c.nome = nome;
        c.email = email;
        c.fone = fone;
        c.cidade = cidade;
        c.uf = uf;
        c.fonte = fonte;
        c.status = status;
        c.vagaId = vagaId;
        c.obs = obs;
        c.updatedAt = now;

        toast("Candidato atualizado.");
        state.selectedId = c.id;
      }else{
        const c = {
          id: uid(),
          nome, email, fone, cidade, uf,
          fonte, status, vagaId, obs,
          cvText: "",
          createdAt: now,
          updatedAt: now,
          lastMatch: null
        };
        state.candidatos.unshift(c);
        state.selectedId = c.id;
        toast("Candidato criado.");
      }

      saveCands();
      updateKpis();
      renderVagaFilters();
      renderList();
      renderDetail();
      bootstrap.Modal.getOrCreateInstance($("#modalCand")).hide();
    }

    function deleteCand(id){
      const c = findCand(id);
      if(!c) return;

      const ok = confirm(`Excluir o candidato "${c.nome}"?`);
      if(!ok) return;

      state.candidatos = state.candidatos.filter(x => x.id !== id);
      if(state.selectedId === id){
        state.selectedId = state.candidatos[0]?.id || null;
      }
      saveCands();
      updateKpis();
      renderList();
      renderDetail();
      toast("Candidato excluído.");
    }

    function saveCvText(candId, fromMobile){
      const c = findCand(candId);
      if(!c) return;

      const root = fromMobile ? $("#mobileDetailBody") : $("#detailHost");
      const ta = root.querySelector("#detailCvText");
      c.cvText = (ta?.value || "");
      c.updatedAt = new Date().toISOString();
      saveCands();
      renderList();
      renderDetail();
      toast("Texto do CV salvo.");
    }

    function saveMeta(candId, fromMobile){
      const c = findCand(candId);
      if(!c) return;

      const root = fromMobile ? $("#mobileDetailBody") : $("#detailHost");
      const st = root.querySelector("#detailStatus")?.value || c.status;
      const vid = root.querySelector("#detailVaga")?.value || c.vagaId;

      c.status = st;
      c.vagaId = vid;
      c.updatedAt = new Date().toISOString();
      saveCands();
      updateKpis();
      renderList();
      renderDetail();
      toast("Status/Vaga atualizados.");
    }

    function recalcMatch(candId){
      const c = findCand(candId);
      if(!c) return;

      const m = calcMatchForCand(c);
      c.lastMatch = { score: m.score, pass: m.pass, at: new Date().toISOString() };
      c.updatedAt = new Date().toISOString();

      saveCands();
      renderList();
      renderDetail();
      toast("Match recalculado.");
    }

    // ========= Import/Export
    function exportJson(){
      const payload = { version: 1, exportedAt: new Date().toISOString(), candidatos: state.candidatos };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "candidatos_mvp_liotecnica.json";
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
            if(!data || !Array.isArray(data.candidatos)) throw new Error("Formato inválido.");

            state.candidatos = data.candidatos.map(c => ({
              id: c.id || uid(),
              nome: c.nome || "",
              email: c.email || "",
              fone: c.fone || "",
              cidade: c.cidade || "",
              uf: (c.uf || "").toUpperCase().slice(0,2),
              fonte: c.fonte || DEFAULT_CAND_FONTE,
              status: c.status || DEFAULT_CAND_STATUS,
              vagaId: c.vagaId || "",
              obs: c.obs || "",
              cvText: c.cvText || "",
              createdAt: c.createdAt || new Date().toISOString(),
              updatedAt: c.updatedAt || new Date().toISOString(),
              lastMatch: c.lastMatch || null
            }));

            state.selectedId = state.candidatos[0]?.id || null;
            saveCands();
            updateKpis();
            renderVagaFilters();
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

    // ========= UI wiring
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
      const apply = () => {
        state.filters.q = ($("#fSearch").value || "").trim();
        state.filters.status = $("#fStatus").value || "all";
        state.filters.vagaId = $("#fVaga").value || "all";
        renderList();
      };

      $("#fSearch").addEventListener("input", apply);
      $("#fStatus").addEventListener("change", apply);
      $("#fVaga").addEventListener("change", apply);

      $("#globalSearch").addEventListener("input", () => {
        $("#fSearch").value = $("#globalSearch").value;
        apply();
      });
    }

    function wireButtons(){
      $("#btnNewCand").addEventListener("click", () => openCandModal("new"));
      $("#btnSaveCand").addEventListener("click", upsertCandFromModal);

      $("#btnExportJson").addEventListener("click", exportJson);
      $("#btnImportJson").addEventListener("click", importJson);

      $("#btnSeedReset").addEventListener("click", () => {
        const ok = confirm("Restaurar dados de exemplo? Isso substitui seus candidatos atuais no MVP.");
        if(!ok) return;
        state.candidatos = [];
        state.selectedId = null;
        saveCands();
        seedCandsIfEmpty();
        updateKpis();
        renderVagaFilters();
        renderList();
        renderDetail();
        toast("Demo restaurada.");
      });
    }

    function initLogo(){
      $("#logoDesktop").src = LOGO_DATA_URI;
      $("#logoMobile").src = LOGO_DATA_URI;
    }

    // ========= Init
    (function init(){
      initLogo();
      wireClock();

      state.vagas = loadVagas();
      seedVagasIfEmpty();

      // caso o usuário ainda não tenha aberto a tela de Vagas (sem dados)
      if(!state.vagas.length){
        toast("Nenhuma vaga encontrada no localStorage. Abra a tela de Vagas e crie/seed primeiro.");
      }

      const has = loadCands();
      if(!has) seedCandsIfEmpty();
      else seedCandsIfEmpty();

      renderVagaFilters();
      updateKpis();
      renderList();
      renderDetail();

      wireFilters();
      wireButtons();

      if(!state.selectedId && state.candidatos.length){
        state.selectedId = state.candidatos[0].id;
        saveCands();
        renderList();
        renderDetail();
      }
    })();
