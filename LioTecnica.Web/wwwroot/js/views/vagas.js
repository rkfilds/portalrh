// ========= Logo (embutido em Data URI - auto contido)
    // Observação: o arquivo fornecido veio como WebP (mesmo com nome .png).
    const seed = window.__seedData || {};
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
function enumFirstCode(key, fallback){
      const list = getEnumOptions(key);
      return list.length ? list[0].code : fallback;
    }

    const AREA_ALL = enumFirstCode("vagaAreaFilter", "all");
    const AREAS_STORE_KEY = "lt_rh_areas_v1";
    const REQ_CATEGORIAS_STORE_KEY = "lt_rh_req_categorias_v1";
    const DEFAULT_MODALIDADE = enumFirstCode("vagaModalidade", "Presencial");
    const DEFAULT_STATUS = enumFirstCode("vagaStatus", "aberta");
    const DEFAULT_SENIORIDADE = enumFirstCode("vagaSenioridade", "Junior");
    const DEFAULT_DEPARTAMENTO = enumFirstCode("vagaDepartamento", "");
    const DEFAULT_AREA_TIME = enumFirstCode("vagaAreaTime", "");
    const DEFAULT_TIPO_CONTRATACAO = enumFirstCode("vagaTipoContratacao", "");
    const DEFAULT_MOTIVO = enumFirstCode("vagaMotivoAbertura", "");
    const DEFAULT_ORCAMENTO = enumFirstCode("vagaOrcamentoAprovado", "");
    const DEFAULT_PRIORIDADE = enumFirstCode("vagaPrioridade", "");
    const DEFAULT_REGIME = enumFirstCode("vagaRegimeJornada", "");
    const DEFAULT_ESCALA = enumFirstCode("vagaEscalaTrabalho", "");
    const DEFAULT_MOEDA = enumFirstCode("vagaMoeda", "BRL");
    const DEFAULT_REMUN_PERIOD = enumFirstCode("vagaRemuneracaoPeriodicidade", "mensal");
    const DEFAULT_BONUS = enumFirstCode("vagaBonusTipo", "");
    const DEFAULT_BENEFICIO_TIPO = enumFirstCode("vagaBeneficioTipo", "");
    const DEFAULT_BENEFICIO_REC = enumFirstCode("vagaBeneficioRecorrencia", "mensal");
    const DEFAULT_ESCOLARIDADE = enumFirstCode("vagaEscolaridade", "");
    const DEFAULT_FORMACAO = enumFirstCode("vagaFormacaoArea", "");
    const DEFAULT_REQ_NIVEL = enumFirstCode("vagaRequisitoNivel", "");
    const DEFAULT_REQ_AVALIACAO = enumFirstCode("vagaRequisitoAvaliacao", "");
    const DEFAULT_ETAPA_RESP = enumFirstCode("vagaEtapaResponsavel", "");
    const DEFAULT_ETAPA_MODO = enumFirstCode("vagaEtapaModo", "");
    const DEFAULT_QUESTION_TIPO = enumFirstCode("vagaPerguntaTipo", "");
    const DEFAULT_PESO = enumFirstCode("vagaPeso", "1");
    const DEFAULT_PUBLICACAO = enumFirstCode("vagaPublicacaoVisibilidade", "");
    const DEFAULT_GENERO = enumFirstCode("vagaGeneroPreferencia", "");
    const EMPTY_TEXT = "—";
    const BULLET = "•";

    function setText(root, role, value, fallback = EMPTY_TEXT){
      if(!root) return;
      const el = root.querySelector(`[data-role="${role}"]`);
      if(!el) return;
      el.textContent = (value ?? fallback);
    }

    function setValue(id, value){
      const el = $("#"+id);
      if(!el) return;
      el.value = value ?? "";
    }

    function setChecked(id, value){
      const el = $("#"+id);
      if(!el) return;
      el.checked = !!value;
    }

    function getValue(id){
      const el = $("#"+id);
      return el ? (el.value || "").trim() : "";
    }

    function getChecked(id){
      const el = $("#"+id);
      return !!(el && el.checked);
    }

    function splitTags(text){
      return (text || "")
        .split(";")
        .map(x => x.trim())
        .filter(Boolean);
    }

    function joinTags(list){
      return (Array.isArray(list) ? list : []).join("; ");
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

    function listAreas(){
      const list = loadAreas().map(a => a.nome).filter(Boolean);
      const fromVagas = state.vagas.map(v => v.area).filter(Boolean);
      const set = new Set([...list, ...fromVagas]);
      return Array.from(set).sort((a,b)=>a.localeCompare(b,"pt-BR"));
    }

    function fillVagaAreaSelect(selected){
      const select = $("#vagaArea");
      if(!select) return;
      select.replaceChildren();
      select.appendChild(buildOption("", "Selecionar area", !selected));
      const areas = listAreas();
      areas.forEach(a => select.appendChild(buildOption(a, a, a === selected)));
      if(selected && !areas.includes(selected)){
        select.appendChild(buildOption(selected, selected, true));
      }
      if(selected) select.value = selected;
    }

    function loadReqCategorias(){
      try{
        const raw = localStorage.getItem(REQ_CATEGORIAS_STORE_KEY);
        if(!raw) return Array.isArray(seed.requisitoCategorias) ? seed.requisitoCategorias : [];
        const data = JSON.parse(raw);
        if(data && Array.isArray(data.categorias)) return data.categorias;
        return Array.isArray(seed.requisitoCategorias) ? seed.requisitoCategorias : [];
      }catch{
        return Array.isArray(seed.requisitoCategorias) ? seed.requisitoCategorias : [];
      }
    }

    function listReqCategorias(){
      const list = loadReqCategorias().map(c => c.nome).filter(Boolean);
      const fromVagas = state.vagas
        .flatMap(v => (v.requisitos || []).map(r => r.categoria))
        .filter(Boolean);
      const set = new Set([...list, ...fromVagas]);
      return Array.from(set).sort((a,b)=>a.localeCompare(b,"pt-BR"));
    }

    function getDefaultCategoria(){
      const list = listReqCategorias();
      if(list.includes("Competencia")) return "Competencia";
      return list.length ? list[0] : "Competencia";
    }

    function renderReqCategoriaOptions(selected){
      const select = $("#reqCategoria");
      if(!select) return;
      select.replaceChildren();
      select.appendChild(buildOption("", "Selecionar categoria", !selected));
      const list = listReqCategorias();
      list.forEach(c => select.appendChild(buildOption(c, c, c === selected)));
      if(selected && !list.includes(selected)){
        select.appendChild(buildOption(selected, selected, true));
      }
      if(selected) select.value = selected;
    }
function fmtStatus(s){
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
      return map[s] || s;
    }

    function buildStatusBadge(s){
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
      const bs = map[s] || "primary";
      const badge = cloneTemplate("tpl-vaga-status-badge");
      if(!badge) return document.createElement("span");
      badge.classList.add("text-bg-" + bs);
      const text = badge.querySelector('[data-role="text"]');
      if(text) text.textContent = fmtStatus(s);
      return badge;
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

      const vagasSeed = Array.isArray(seed.vagas) ? seed.vagas : [];
      if(!vagasSeed.length) return;

      state.vagas = vagasSeed;
      state.selectedId = seed.selectedVagaId || vagasSeed[0]?.id || null;
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
      return listAreas();
    }

    function renderAreaFilter(){
      const areas = distinctAreas();
      const sel = $("#fArea");
      const cur = sel.value || AREA_ALL;
      sel.replaceChildren();
      getEnumOptions("vagaAreaFilter").forEach(opt => {
        sel.appendChild(buildOption(opt.code, opt.text, opt.code === cur));
      });
      areas.forEach(a => {
        sel.appendChild(buildOption(a, a, a === cur));
      });
      sel.value = areas.includes(cur) ? cur : AREA_ALL;
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
      tbody.replaceChildren();

      const rows = getFilteredVagas();
      if(!rows.length){
        const emptyRow = cloneTemplate("tpl-vaga-empty-row");
        if(emptyRow) tbody.appendChild(emptyRow);
        return;
      }

      rows.forEach(v => {
        const reqTotal = (v.requisitos || []).length;
        const reqObrig = (v.requisitos || []).filter(r => !!r.obrigatorio).length;
        const isSel = v.id === state.selectedId;

        const tr = cloneTemplate("tpl-vaga-row");
        if(!tr) return;
        tr.style.cursor = "default";
        if(isSel) tr.classList.add("table-active");

        setText(tr, "vaga-title", v.titulo);
        setText(tr, "vaga-code", v.codigo);
        setText(tr, "vaga-modalidade", v.modalidade);
        setText(tr, "vaga-area", v.area);
        setText(tr, "req-total", `${reqTotal} total`);
        setText(tr, "req-obrig", `${reqObrig} obrig.`);

        const thrVal = clamp(parseInt(v.threshold ?? 0,10)||0,0,100);
        setText(tr, "vaga-thr", `${thrVal}%`);

        const locParts = [v.cidade, v.uf].filter(Boolean);
        const hasLoc = locParts.length > 0;
        setText(tr, "vaga-location", hasLoc ? locParts.join(" - ") : EMPTY_TEXT);
        toggleRole(tr, "vaga-location", hasLoc);
        toggleRole(tr, "vaga-location-sep", hasLoc);

        const statusHost = tr.querySelector('[data-role="status-host"]');
        if(statusHost) statusHost.replaceChildren(buildStatusBadge(v.status));

        tr.querySelectorAll("button[data-act]").forEach(btn => {
          btn.dataset.id = v.id;
        });

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
    function renderDetail(){
      const host = $("#detailHost");
      host.replaceChildren();

      const v = findVaga(state.selectedId);
      if(!v){
        const empty = cloneTemplate("tpl-vaga-detail-empty");
        if(empty) host.appendChild(empty);
        return;
      }

      const reqTotal = (v.requisitos || []).length;
      const reqObrig = (v.requisitos || []).filter(r => !!r.obrigatorio).length;

      const updated = v.updatedAt ? new Date(v.updatedAt) : null;
      const updatedTxt = updated ? updated.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) : EMPTY_TEXT;

      const weights = v.weights || { competencia:40, experiencia:30, formacao:15, localidade:15 };
      const sumW = (weights.competencia||0) + (weights.experiencia||0) + (weights.formacao||0) + (weights.localidade||0);

      const thrVal = clamp(parseInt(v.threshold ?? 0,10)||0,0,100);

      const root = cloneTemplate("tpl-vaga-detail");
      if(!root) return;

      setText(root, "detail-title", v.titulo);
      setText(root, "detail-code", v.codigo);
      setText(root, "detail-area", v.area);
      setText(root, "detail-modalidade", v.modalidade);

      const statusHost = root.querySelector('[data-role="detail-status-host"]');
      if(statusHost) statusHost.replaceChildren(buildStatusBadge(v.status));

      setText(root, "detail-updated", updatedTxt);
      setText(root, "detail-req-total", `${reqTotal} requisitos`);
      setText(root, "detail-req-obrig", `${reqObrig} obrigatorios`);
      setText(root, "detail-thr", `${thrVal}%`);

      setText(root, "detail-descricao", v.descricao);
      const locParts = [v.cidade, v.uf].filter(Boolean);
      setText(root, "detail-local", locParts.join(" - ") || EMPTY_TEXT);
      setText(root, "detail-senioridade", v.senioridade);

      const thresholdRange = root.querySelector("#thresholdRange");
      const thresholdLabel = root.querySelector("#thresholdLabel");
      if(thresholdRange) thresholdRange.value = thrVal;
      if(thresholdLabel) thresholdLabel.textContent = `${thrVal}%`;

      const weightsSum = root.querySelector("#weightsSum");
      if(weightsSum) weightsSum.textContent = sumW;

      const weightKeys = ["competencia","experiencia","formacao","localidade"];
      weightKeys.forEach(key => {
        const slider = root.querySelector("#w_" + key);
        const val = root.querySelector("#w_" + key + "_val");
        const w = clamp(parseInt(weights[key] ?? 0,10)||0, 0, 100);
        if(slider) slider.value = w;
        if(val) val.textContent = w;
      });

      host.appendChild(root);

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

      tbody.replaceChildren();
      const reqs = (v?.requisitos || []);

      const q = ($("#detailHost #reqSearch")?.value || "").trim().toLowerCase();
      const filtered = !q ? reqs : reqs.filter(r => {
        const blob = [r.categoria, r.termo, (r.sinonimos||[]).join(" "), r.obs].join(" ").toLowerCase();
        return blob.includes(q);
      });

      if(!filtered.length){
        const emptyRow = cloneTemplate("tpl-vaga-req-empty-row");
        if(emptyRow) tbody.appendChild(emptyRow);
        return;
      }

      filtered.forEach(r => {
        const tr = cloneTemplate("tpl-vaga-req-row");
        if(!tr) return;

        const toggleInput = tr.querySelector('[data-role="req-toggle"]');
        if(toggleInput){
          toggleInput.checked = !!r.obrigatorio;
          toggleInput.dataset.rid = r.id;
        }

        setText(tr, "req-categoria", r.categoria);
        setText(tr, "req-termo", r.termo);
        setText(tr, "req-obs", r.obs || EMPTY_TEXT);
        setText(tr, "req-peso", clamp(parseInt(r.peso ?? 0,10)||0,0,10));
        const syn = (r.sinonimos || []).join(", ");
        setText(tr, "req-sinonimos", syn || EMPTY_TEXT);

        tr.querySelectorAll("[data-ract]").forEach(el => {
          el.dataset.rid = r.id;
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

    
    function newBenefit(){
      return {
        tipo: DEFAULT_BENEFICIO_TIPO,
        valor: "",
        recorrencia: DEFAULT_BENEFICIO_REC,
        obrigatorio: true,
        obs: ""
      };
    }

    function newModalReq(){
      return {
        nome: "",
        peso: DEFAULT_PESO,
        obrigatorio: false,
        anos: "",
        nivel: DEFAULT_REQ_NIVEL,
        avaliacao: DEFAULT_REQ_AVALIACAO,
        obs: ""
      };
    }

    function newStage(){
      return {
        nome: "Entrevista RH",
        responsavel: DEFAULT_ETAPA_RESP,
        modo: DEFAULT_ETAPA_MODO,
        slaDias: "3",
        descricao: ""
      };
    }

    function newQuestion(){
      return {
        pergunta: "Tem disponibilidade para presencial 2x por semana?",
        tipo: DEFAULT_QUESTION_TIPO,
        peso: DEFAULT_PESO,
        obrigatoria: true,
        knockout: false,
        opcoes: []
      };
    }

    function bindRemoveRow(row){
      const btn = row.querySelector('[data-act="remove"]');
      if(btn) btn.addEventListener("click", () => row.remove());
    }

    function buildBenefitRow(item){
      const row = cloneTemplate("tpl-vaga-benefit-row");
      if(!row) return null;
      const typeEl = row.querySelector('[data-role="benefit-type"]');
      const valEl = row.querySelector('[data-role="benefit-value"]');
      const recEl = row.querySelector('[data-role="benefit-rec"]');
      const reqEl = row.querySelector('[data-role="benefit-required"]');
      const obsEl = row.querySelector('[data-role="benefit-obs"]');
      const titleEl = row.querySelector('[data-role="benefit-title"]');

      if(typeEl) typeEl.value = item.tipo || DEFAULT_BENEFICIO_TIPO;
      if(recEl) recEl.value = item.recorrencia || DEFAULT_BENEFICIO_REC;
      if(valEl) valEl.value = item.valor || "";
      if(reqEl) reqEl.checked = !!item.obrigatorio;
      if(obsEl) obsEl.value = item.obs || "";
      if(titleEl && typeEl) titleEl.textContent = typeEl.selectedOptions[0]?.textContent || "Beneficio";

      if(typeEl && titleEl){
        typeEl.addEventListener("change", () => {
          titleEl.textContent = typeEl.selectedOptions[0]?.textContent || "Beneficio";
        });
      }

      bindRemoveRow(row);
      return row;
    }

    function renderBenefitList(items){
      const host = $("#vagaBenefitsList");
      if(!host) return;
      host.replaceChildren();
      (items || []).forEach(it => {
        const row = buildBenefitRow(it);
        if(row) host.appendChild(row);
      });
    }

    function collectBenefitList(){
      const host = $("#vagaBenefitsList");
      if(!host) return [];
      return $$(".vaga-benefit-row", host).map(row => ({
        tipo: row.querySelector('[data-role="benefit-type"]')?.value || "",
        valor: row.querySelector('[data-role="benefit-value"]')?.value || "",
        recorrencia: row.querySelector('[data-role="benefit-rec"]')?.value || "",
        obrigatorio: !!row.querySelector('[data-role="benefit-required"]')?.checked,
        obs: row.querySelector('[data-role="benefit-obs"]')?.value || ""
      }));
    }

    function buildModalReqRow(item){
      const row = cloneTemplate("tpl-vaga-modal-req-row");
      if(!row) return null;
      const nameEl = row.querySelector('[data-role="req-name"]');
      const weightEl = row.querySelector('[data-role="req-weight"]');
      const reqEl = row.querySelector('[data-role="req-required"]');
      const yearsEl = row.querySelector('[data-role="req-years"]');
      const levelEl = row.querySelector('[data-role="req-level"]');
      const evalEl = row.querySelector('[data-role="req-eval"]');
      const obsEl = row.querySelector('[data-role="req-obs"]');
      const titleEl = row.querySelector('[data-role="req-title"]');

      if(nameEl) nameEl.value = item.nome || "";
      if(weightEl) weightEl.value = item.peso != null ? String(item.peso) : DEFAULT_PESO;
      if(reqEl) reqEl.checked = !!item.obrigatorio;
      if(yearsEl) yearsEl.value = item.anos || "";
      if(levelEl) levelEl.value = item.nivel || DEFAULT_REQ_NIVEL;
      if(evalEl) evalEl.value = item.avaliacao || DEFAULT_REQ_AVALIACAO;
      if(obsEl) obsEl.value = item.obs || "";
      if(titleEl && nameEl) titleEl.textContent = nameEl.value || "Requisito";

      if(nameEl && titleEl){
        nameEl.addEventListener("input", () => {
          titleEl.textContent = nameEl.value || "Requisito";
        });
      }

      bindRemoveRow(row);
      return row;
    }

    function renderModalReqList(items){
      const host = $("#vagaReqList");
      if(!host) return;
      host.replaceChildren();
      (items || []).forEach(it => {
        const row = buildModalReqRow(it);
        if(row) host.appendChild(row);
      });
    }

    function collectModalReqList(){
      const host = $("#vagaReqList");
      if(!host) return [];
      return $$(".vaga-req-row", host).map(row => ({
        nome: row.querySelector('[data-role="req-name"]')?.value || "",
        peso: parseInt(row.querySelector('[data-role="req-weight"]')?.value || DEFAULT_PESO, 10),
        obrigatorio: !!row.querySelector('[data-role="req-required"]')?.checked,
        anos: row.querySelector('[data-role="req-years"]')?.value || "",
        nivel: row.querySelector('[data-role="req-level"]')?.value || "",
        avaliacao: row.querySelector('[data-role="req-eval"]')?.value || "",
        obs: row.querySelector('[data-role="req-obs"]')?.value || ""
      }));
    }

    function buildStageRow(item){
      const row = cloneTemplate("tpl-vaga-stage-row");
      if(!row) return null;
      const nameEl = row.querySelector('[data-role="stage-name"]');
      const ownerEl = row.querySelector('[data-role="stage-owner"]');
      const modeEl = row.querySelector('[data-role="stage-mode"]');
      const slaEl = row.querySelector('[data-role="stage-sla"]');
      const descEl = row.querySelector('[data-role="stage-desc"]');
      const titleEl = row.querySelector('[data-role="stage-title"]');

      if(nameEl) nameEl.value = item.nome || "";
      if(ownerEl) ownerEl.value = item.responsavel || DEFAULT_ETAPA_RESP;
      if(modeEl) modeEl.value = item.modo || DEFAULT_ETAPA_MODO;
      if(slaEl) slaEl.value = item.slaDias || "";
      if(descEl) descEl.value = item.descricao || "";
      if(titleEl && nameEl) titleEl.textContent = nameEl.value || "Etapa";

      if(nameEl && titleEl){
        nameEl.addEventListener("input", () => {
          titleEl.textContent = nameEl.value || "Etapa";
        });
      }

      bindRemoveRow(row);
      return row;
    }

    function renderStageList(items){
      const host = $("#vagaEtapasList");
      if(!host) return;
      host.replaceChildren();
      (items || []).forEach(it => {
        const row = buildStageRow(it);
        if(row) host.appendChild(row);
      });
    }

    function collectStageList(){
      const host = $("#vagaEtapasList");
      if(!host) return [];
      return $$(".vaga-stage-row", host).map(row => ({
        nome: row.querySelector('[data-role="stage-name"]')?.value || "",
        responsavel: row.querySelector('[data-role="stage-owner"]')?.value || "",
        modo: row.querySelector('[data-role="stage-mode"]')?.value || "",
        slaDias: row.querySelector('[data-role="stage-sla"]')?.value || "",
        descricao: row.querySelector('[data-role="stage-desc"]')?.value || ""
      }));
    }

    function toggleQuestionOptions(row){
      const typeEl = row.querySelector('[data-role="question-type"]');
      const wrap = row.querySelector('[data-role="question-options-wrap"]');
      if(!typeEl || !wrap) return;
      wrap.classList.toggle("d-none", typeEl.value !== "multipla");
    }

    function buildQuestionRow(item){
      const row = cloneTemplate("tpl-vaga-question-row");
      if(!row) return null;
      const textEl = row.querySelector('[data-role="question-text"]');
      const typeEl = row.querySelector('[data-role="question-type"]');
      const weightEl = row.querySelector('[data-role="question-weight"]');
      const reqEl = row.querySelector('[data-role="question-required"]');
      const koEl = row.querySelector('[data-role="question-ko"]');
      const optEl = row.querySelector('[data-role="question-options"]');
      const titleEl = row.querySelector('[data-role="question-title"]');

      if(textEl) textEl.value = item.pergunta || "";
      if(typeEl) typeEl.value = item.tipo || DEFAULT_QUESTION_TIPO;
      if(weightEl) weightEl.value = item.peso != null ? String(item.peso) : DEFAULT_PESO;
      if(reqEl) reqEl.checked = !!item.obrigatoria;
      if(koEl) koEl.checked = !!item.knockout;
      if(optEl) optEl.value = Array.isArray(item.opcoes) ? item.opcoes.join("; ") : (item.opcoes || "");
      if(titleEl && textEl) titleEl.textContent = textEl.value || "Pergunta";

      if(textEl && titleEl){
        textEl.addEventListener("input", () => {
          titleEl.textContent = textEl.value || "Pergunta";
        });
      }
      if(typeEl){
        typeEl.addEventListener("change", () => toggleQuestionOptions(row));
      }
      toggleQuestionOptions(row);

      bindRemoveRow(row);
      return row;
    }

    function renderQuestionList(items){
      const host = $("#vagaPerguntasList");
      if(!host) return;
      host.replaceChildren();
      (items || []).forEach(it => {
        const row = buildQuestionRow(it);
        if(row) host.appendChild(row);
      });
    }

    function collectQuestionList(){
      const host = $("#vagaPerguntasList");
      if(!host) return [];
      return $$(".vaga-question-row", host).map(row => {
        const type = row.querySelector('[data-role="question-type"]')?.value || "";
        const optText = row.querySelector('[data-role="question-options"]')?.value || "";
        return {
          pergunta: row.querySelector('[data-role="question-text"]')?.value || "",
          tipo: type,
          peso: parseInt(row.querySelector('[data-role="question-weight"]')?.value || DEFAULT_PESO, 10),
          obrigatoria: !!row.querySelector('[data-role="question-required"]')?.checked,
          knockout: !!row.querySelector('[data-role="question-ko"]')?.checked,
          opcoes: type === "multipla" ? splitTags(optText) : []
        };
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
        const meta = v.meta || {};
        const jornada = v.jornada || {};
        const local = jornada.local || {};
        const remuneracao = v.remuneracao || {};
        const requisitosExtras = v.requisitosExtras || {};
        const processo = v.processo || {};
        const publicacao = v.publicacao || {};
        const compliance = v.compliance || {};
        const diversidade = compliance.diversidade || {};
        const lgpd = compliance.lgpd || {};
        const docs = compliance.docs || {};

        $("#vagaId").value = v.id;
        $("#vagaCodigo").value = v.codigo || "";
        $("#vagaTitulo").value = v.titulo || "";
        fillVagaAreaSelect(v.area || "");
        $("#vagaArea").value = v.area || "";
        $("#vagaModalidade").value = v.modalidade || DEFAULT_MODALIDADE;
        $("#vagaStatus").value = v.status || DEFAULT_STATUS;
        $("#vagaCidade").value = v.cidade || local.cidade || "";
        $("#vagaUF").value = v.uf || local.uf || "";
        $("#vagaSenioridade").value = v.senioridade || DEFAULT_SENIORIDADE;
        $("#vagaThreshold").value = clamp(parseInt(v.threshold ?? 70,10)||70, 0, 100);
        $("#vagaDescricao").value = v.descricao || "";

        setValue("vagaDepartamento", meta.departamento || DEFAULT_DEPARTAMENTO);
        setValue("vagaAreaTime", meta.areaTime || DEFAULT_AREA_TIME);
        setValue("vagaQuantidade", meta.quantidade ?? 1);
        setValue("vagaTipoContratacao", meta.tipoContratacao || DEFAULT_TIPO_CONTRATACAO);
        setValue("vagaCodigoInterno", meta.codigoInterno || "");
        setValue("vagaCbo", meta.cbo || "");
        setValue("vagaGestor", meta.gestorRequisitante || "");
        setValue("vagaRecrutador", meta.recrutador || "");
        setValue("vagaMotivoAbertura", meta.motivoAbertura || DEFAULT_MOTIVO);
        setValue("vagaOrcamento", meta.orcamentoAprovado || DEFAULT_ORCAMENTO);
        setValue("vagaPrioridade", meta.prioridade || DEFAULT_PRIORIDADE);
        setValue("vagaResumo", meta.resumo || "");
        setValue("vagaTagsResponsabilidades", joinTags(meta.tagsResponsabilidades));
        setValue("vagaTagsKeywords", joinTags(meta.tagsKeywords));
        setChecked("vagaConfidencial", meta.confidencial);
        setChecked("vagaAceitaPcd", meta.aceitaPcd);
        setChecked("vagaUrgente", meta.urgente);
        setValue("vagaProjetoNome", meta.projeto?.nome || "");
        setValue("vagaProjetoCliente", meta.projeto?.cliente || "");
        setValue("vagaProjetoPrazo", meta.projeto?.prazo || "");
        setValue("vagaProjetoDescricao", meta.projeto?.descricao || "");

        setValue("vagaGeneroPreferencia", diversidade.generoPreferencia || DEFAULT_GENERO);
        setChecked("vagaVagaAfirmativa", diversidade.vagaAfirmativa);
        setChecked("vagaLinguagemInclusiva", diversidade.linguagemInclusiva);
        setValue("vagaPublicoAfirmativo", diversidade.publicoAfirmativo || "");
        setValue("vagaPcdObs", meta.pcdObs || "");

        setValue("vagaRegime", jornada.regime || DEFAULT_REGIME);
        setValue("vagaCargaSemanal", jornada.cargaSemanal || "");
        setValue("vagaHoraEntrada", jornada.horaEntrada || "");
        setValue("vagaHoraSaida", jornada.horaSaida || "");
        setValue("vagaIntervalo", jornada.intervalo || "");
        setValue("vagaEscala", jornada.escala || DEFAULT_ESCALA);
        setValue("vagaCep", local.cep || "");
        setValue("vagaLogradouro", local.logradouro || "");
        setValue("vagaNumero", local.numero || "");
        setValue("vagaBairro", local.bairro || "");
        setValue("vagaPoliticaTrabalho", local.politicaTrabalho || "");
        setValue("vagaDeslocamentoObs", local.deslocamentoObs || "");

        setValue("vagaMoeda", remuneracao.moeda || DEFAULT_MOEDA);
        setValue("vagaSalarioMin", remuneracao.salarioMin || "");
        setValue("vagaSalarioMax", remuneracao.salarioMax || "");
        setValue("vagaPeriodicidade", remuneracao.periodicidade || DEFAULT_REMUN_PERIOD);
        setValue("vagaBonusTipo", remuneracao.bonusTipo || DEFAULT_BONUS);
        setValue("vagaBonusPercentual", remuneracao.percentual || "");
        setValue("vagaRemObs", remuneracao.obs || "");

        setValue("vagaEscolaridade", requisitosExtras.escolaridade || DEFAULT_ESCOLARIDADE);
        setValue("vagaFormacaoArea", requisitosExtras.formacaoArea || DEFAULT_FORMACAO);
        setValue("vagaExpMinAnos", requisitosExtras.expMinAnos || "");
        setValue("vagaTagsStack", joinTags(requisitosExtras.tagsStack));
        setValue("vagaTagsIdiomas", joinTags(requisitosExtras.tagsIdiomas));
        setValue("vagaDiferenciais", requisitosExtras.diferenciais || "");

        setValue("vagaObsProcesso", processo.obsInternas || "");

        setValue("vagaVisibilidade", publicacao.visibilidade || DEFAULT_PUBLICACAO);
        setValue("vagaDataInicio", publicacao.dataInicio || "");
        setValue("vagaDataFim", publicacao.dataFim || "");
        setChecked("vagaCanalLinkedin", publicacao.canais?.linkedin);
        setChecked("vagaCanalSite", publicacao.canais?.site);
        setChecked("vagaCanalIndicacao", publicacao.canais?.indicacao);
        setChecked("vagaCanalPortal", publicacao.canais?.portalEmprego);
        setValue("vagaDescricaoPublica", publicacao.descricaoPublica || "");

        setChecked("vagaLgpdConsentimento", lgpd.consentimentoBase);
        setChecked("vagaLgpdCompartilhamento", lgpd.compartilhamento);
        setChecked("vagaLgpdRetencao", lgpd.retencao);
        setValue("vagaLgpdRetencaoMeses", lgpd.retencaoMeses || "");
        setChecked("vagaDocCnh", docs.cnh);
        setChecked("vagaDocViagens", docs.disponibilidadeViagens);
        setChecked("vagaDocAntecedentes", docs.antecedentes);

        renderBenefitList(Array.isArray(remuneracao.beneficios) ? remuneracao.beneficios : []);
        renderModalReqList(Array.isArray(requisitosExtras.requisitosDetalhados) ? requisitosExtras.requisitosDetalhados : []);
        renderStageList(Array.isArray(processo.etapas) ? processo.etapas : []);
        renderQuestionList(Array.isArray(processo.perguntas) ? processo.perguntas : []);
      }else{
        $("#vagaId").value = "";
        $("#vagaCodigo").value = "";
        $("#vagaTitulo").value = "";
        fillVagaAreaSelect("");
        $("#vagaArea").value = "";
        $("#vagaModalidade").value = DEFAULT_MODALIDADE;
        $("#vagaStatus").value = DEFAULT_STATUS;
        $("#vagaCidade").value = "";
        $("#vagaUF").value = "SP";
        $("#vagaSenioridade").value = DEFAULT_SENIORIDADE;
        $("#vagaThreshold").value = 70;
        $("#vagaDescricao").value = "";

        setValue("vagaDepartamento", DEFAULT_DEPARTAMENTO);
        setValue("vagaAreaTime", DEFAULT_AREA_TIME);
        setValue("vagaQuantidade", 1);
        setValue("vagaTipoContratacao", DEFAULT_TIPO_CONTRATACAO);
        setValue("vagaCodigoInterno", "");
        setValue("vagaCbo", "");
        setValue("vagaGestor", "");
        setValue("vagaRecrutador", "");
        setValue("vagaMotivoAbertura", DEFAULT_MOTIVO);
        setValue("vagaOrcamento", DEFAULT_ORCAMENTO);
        setValue("vagaPrioridade", DEFAULT_PRIORIDADE);
        setValue("vagaResumo", "");
        setValue("vagaTagsResponsabilidades", "");
        setValue("vagaTagsKeywords", "");
        setChecked("vagaConfidencial", false);
        setChecked("vagaAceitaPcd", false);
        setChecked("vagaUrgente", false);
        setValue("vagaProjetoNome", "");
        setValue("vagaProjetoCliente", "");
        setValue("vagaProjetoPrazo", "");
        setValue("vagaProjetoDescricao", "");

        setValue("vagaGeneroPreferencia", DEFAULT_GENERO);
        setChecked("vagaVagaAfirmativa", false);
        setChecked("vagaLinguagemInclusiva", false);
        setValue("vagaPublicoAfirmativo", "");
        setValue("vagaPcdObs", "");

        setValue("vagaRegime", DEFAULT_REGIME);
        setValue("vagaCargaSemanal", "");
        setValue("vagaHoraEntrada", "");
        setValue("vagaHoraSaida", "");
        setValue("vagaIntervalo", "");
        setValue("vagaEscala", DEFAULT_ESCALA);
        setValue("vagaCep", "");
        setValue("vagaLogradouro", "");
        setValue("vagaNumero", "");
        setValue("vagaBairro", "");
        setValue("vagaPoliticaTrabalho", "");
        setValue("vagaDeslocamentoObs", "");

        setValue("vagaMoeda", DEFAULT_MOEDA);
        setValue("vagaSalarioMin", "");
        setValue("vagaSalarioMax", "");
        setValue("vagaPeriodicidade", DEFAULT_REMUN_PERIOD);
        setValue("vagaBonusTipo", DEFAULT_BONUS);
        setValue("vagaBonusPercentual", "");
        setValue("vagaRemObs", "");

        setValue("vagaEscolaridade", DEFAULT_ESCOLARIDADE);
        setValue("vagaFormacaoArea", DEFAULT_FORMACAO);
        setValue("vagaExpMinAnos", "");
        setValue("vagaTagsStack", "");
        setValue("vagaTagsIdiomas", "");
        setValue("vagaDiferenciais", "");

        setValue("vagaObsProcesso", "");

        setValue("vagaVisibilidade", DEFAULT_PUBLICACAO);
        setValue("vagaDataInicio", "");
        setValue("vagaDataFim", "");
        setChecked("vagaCanalLinkedin", false);
        setChecked("vagaCanalSite", false);
        setChecked("vagaCanalIndicacao", false);
        setChecked("vagaCanalPortal", false);
        setValue("vagaDescricaoPublica", "");

        setChecked("vagaLgpdConsentimento", false);
        setChecked("vagaLgpdCompartilhamento", false);
        setChecked("vagaLgpdRetencao", false);
        setValue("vagaLgpdRetencaoMeses", "");
        setChecked("vagaDocCnh", false);
        setChecked("vagaDocViagens", false);
        setChecked("vagaDocAntecedentes", false);

        renderBenefitList([newBenefit()]);
        renderModalReqList([newModalReq()]);
        renderStageList([newStage()]);
        renderQuestionList([newQuestion()]);
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
      const meta = {
        departamento: getValue("vagaDepartamento"),
        areaTime: getValue("vagaAreaTime"),
        quantidade: parseInt(getValue("vagaQuantidade") || "1", 10) || 1,
        tipoContratacao: getValue("vagaTipoContratacao"),
        codigoInterno: getValue("vagaCodigoInterno"),
        cbo: getValue("vagaCbo"),
        gestorRequisitante: getValue("vagaGestor"),
        recrutador: getValue("vagaRecrutador"),
        motivoAbertura: getValue("vagaMotivoAbertura"),
        orcamentoAprovado: getValue("vagaOrcamento"),
        prioridade: getValue("vagaPrioridade"),
        resumo: getValue("vagaResumo"),
        tagsResponsabilidades: splitTags(getValue("vagaTagsResponsabilidades")),
        tagsKeywords: splitTags(getValue("vagaTagsKeywords")),
        confidencial: getChecked("vagaConfidencial"),
        aceitaPcd: getChecked("vagaAceitaPcd"),
        urgente: getChecked("vagaUrgente"),
        projeto: {
          nome: getValue("vagaProjetoNome"),
          cliente: getValue("vagaProjetoCliente"),
          prazo: getValue("vagaProjetoPrazo"),
          descricao: getValue("vagaProjetoDescricao")
        },
        pcdObs: getValue("vagaPcdObs")
      };
      const diversidade = {
        generoPreferencia: getValue("vagaGeneroPreferencia"),
        vagaAfirmativa: getChecked("vagaVagaAfirmativa"),
        linguagemInclusiva: getChecked("vagaLinguagemInclusiva"),
        publicoAfirmativo: getValue("vagaPublicoAfirmativo")
      };
      const jornada = {
        regime: getValue("vagaRegime"),
        cargaSemanal: getValue("vagaCargaSemanal"),
        horaEntrada: getValue("vagaHoraEntrada"),
        horaSaida: getValue("vagaHoraSaida"),
        intervalo: getValue("vagaIntervalo"),
        escala: getValue("vagaEscala"),
        local: {
          cep: getValue("vagaCep"),
          logradouro: getValue("vagaLogradouro"),
          numero: getValue("vagaNumero"),
          bairro: getValue("vagaBairro"),
          cidade,
          uf,
          politicaTrabalho: getValue("vagaPoliticaTrabalho"),
          deslocamentoObs: getValue("vagaDeslocamentoObs")
        }
      };
      const remuneracao = {
        moeda: getValue("vagaMoeda"),
        salarioMin: getValue("vagaSalarioMin"),
        salarioMax: getValue("vagaSalarioMax"),
        periodicidade: getValue("vagaPeriodicidade"),
        bonusTipo: getValue("vagaBonusTipo"),
        percentual: getValue("vagaBonusPercentual"),
        obs: getValue("vagaRemObs"),
        beneficios: collectBenefitList()
      };
      const requisitosExtras = {
        escolaridade: getValue("vagaEscolaridade"),
        formacaoArea: getValue("vagaFormacaoArea"),
        expMinAnos: getValue("vagaExpMinAnos"),
        tagsStack: splitTags(getValue("vagaTagsStack")),
        tagsIdiomas: splitTags(getValue("vagaTagsIdiomas")),
        diferenciais: getValue("vagaDiferenciais"),
        requisitosDetalhados: collectModalReqList().filter(r => (r.nome || "").trim())
      };
      const processo = {
        etapas: collectStageList().filter(e => (e.nome || "").trim()),
        perguntas: collectQuestionList().filter(p => (p.pergunta || "").trim()),
        obsInternas: getValue("vagaObsProcesso")
      };
      const publicacao = {
        visibilidade: getValue("vagaVisibilidade"),
        dataInicio: getValue("vagaDataInicio"),
        dataFim: getValue("vagaDataFim"),
        canais: {
          linkedin: getChecked("vagaCanalLinkedin"),
          site: getChecked("vagaCanalSite"),
          indicacao: getChecked("vagaCanalIndicacao"),
          portalEmprego: getChecked("vagaCanalPortal")
        },
        descricaoPublica: getValue("vagaDescricaoPublica")
      };
      const compliance = {
        diversidade,
        lgpd: {
          consentimentoBase: getChecked("vagaLgpdConsentimento"),
          compartilhamento: getChecked("vagaLgpdCompartilhamento"),
          retencao: getChecked("vagaLgpdRetencao"),
          retencaoMeses: getValue("vagaLgpdRetencaoMeses")
        },
        docs: {
          cnh: getChecked("vagaDocCnh"),
          disponibilidadeViagens: getChecked("vagaDocViagens"),
          antecedentes: getChecked("vagaDocAntecedentes")
        }
      };

      // validação mínima
      if(!titulo){
        toast("Informe o tÃ­tulo da vaga.");
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
        v.meta = meta;
        v.jornada = jornada;
        v.remuneracao = remuneracao;
        v.requisitosExtras = requisitosExtras;
        v.processo = processo;
        v.publicacao = publicacao;
        v.compliance = compliance;
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
          requisitos: [],
          meta,
          jornada,
          remuneracao,
          requisitosExtras,
          processo,
          publicacao,
          compliance
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

      const ok = confirm(`Excluir a vaga "${v.titulo}"?\n\nIsso remove tambÃ©m os requisitos.`);
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
      toast("Vaga excluÃ­da.");
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
        const selected = r.categoria || getDefaultCategoria();
        renderReqCategoriaOptions(selected);
        $("#reqCategoria").value = selected;
        $("#reqPeso").value = clamp(parseInt(r.peso ?? 0,10)||0, 0, 10);
        $("#reqObrigatorio").checked = !!r.obrigatorio;
        $("#reqTermo").value = r.termo || "";
        $("#reqSinonimos").value = (r.sinonimos || []).join(", ");
        $("#reqObs").value = r.obs || "";
      }else{
        const selected = getDefaultCategoria();
        renderReqCategoriaOptions(selected);
        $("#reqCategoria").value = selected;
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
      const categoria = ($("#reqCategoria").value || "").trim() || getDefaultCategoria();
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
      toast("Pesos e match mí­nimo salvos.");
    }

    // ========= Simulador (keyword match)
function simulateMatch(vagaId, fromMobile=false){
      const v = findVaga(vagaId);
      if(!v) return;

      const root = fromMobile ? $("#mobileDetailBody") : $("#detailHost");
      const area = root.querySelector("#simResult");
      if(!area) return;
      area.replaceChildren();

      const text = normalizeText(root.querySelector("#simText")?.value || "");
      const reqs = v.requisitos || [];

      if(!text){
        const warn = cloneTemplate("tpl-vaga-sim-alert-warning");
        if(warn) area.appendChild(warn);
        return;
      }
      if(!reqs.length){
        const info = cloneTemplate("tpl-vaga-sim-alert-info");
        if(info) area.appendChild(info);
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
      if(missMandatory.length){
        score = Math.max(0, score - Math.min(40, missMandatory.length * 15));
      }

      const thr = clamp(parseInt(v.threshold||0,10)||0,0,100);
      const pass = score >= thr;

      const card = cloneTemplate("tpl-vaga-sim-result");
      if(!card) return;

      const badge = card.querySelector('[data-role="sim-badge"]');
      if(badge){
        badge.classList.add(pass ? "text-bg-success" : "text-bg-danger");
      }
      setText(card, "sim-badge-text", pass ? "Dentro" : "Fora");

      const progress = card.querySelector('[data-role="sim-progress"]');
      if(progress) progress.style.width = `${score}%`;
      setText(card, "sim-score", `${score}%`);
      setText(card, "sim-thr", `${thr}%`);
      setText(card, "sim-hits", hits.length);
      setText(card, "sim-miss", missMandatory.length);

      const missBlock = card.querySelector('[data-role="sim-miss-block"]');
      if(missBlock) missBlock.classList.toggle("d-none", !missMandatory.length);
      setText(card, "sim-miss-list", missMandatory.map(r => r.termo).join(", "));
      setText(card, "sim-hit-list", hits.length ? hits.map(r => r.termo).join(", ") : EMPTY_TEXT);

      area.appendChild(card);
    }

    function clearSimulation(fromMobile=false){
      const root = fromMobile ? $("#mobileDetailBody") : $("#detailHost");
      const ta = root.querySelector("#simText");
      const res = root.querySelector("#simResult");
      if(ta) ta.value = "";
      if(res) res.replaceChildren();
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
            state.vagas = data.vagas.map(v => {
              const meta = v.meta || {};
              const jornada = v.jornada || {};
              const local = jornada.local || {};
              const remuneracao = v.remuneracao || {};
              const requisitosExtras = v.requisitosExtras || {};
              const processo = v.processo || {};
              const publicacao = v.publicacao || {};
              const compliance = v.compliance || {};
              const diversidade = compliance.diversidade || {};
              const lgpd = compliance.lgpd || {};
              const docs = compliance.docs || {};
              const cidade = (v.cidade || local.cidade || "").trim();
              const uf = (v.uf || local.uf || "").trim().toUpperCase().slice(0,2);

              return {
                id: v.id || uid(),
                codigo: v.codigo || "",
                titulo: v.titulo || "",
                area: v.area || "",
                modalidade: v.modalidade || DEFAULT_MODALIDADE,
                status: v.status || DEFAULT_STATUS,
                cidade,
                uf,
                senioridade: v.senioridade || DEFAULT_SENIORIDADE,
                threshold: clamp(parseInt(v.threshold ?? 70,10)||70,0,100),
                descricao: v.descricao || "",
                createdAt: v.createdAt || new Date().toISOString(),
                updatedAt: v.updatedAt || new Date().toISOString(),
                weights: v.weights || { competencia:40, experiencia:30, formacao:15, localidade:15 },
                requisitos: Array.isArray(v.requisitos) ? v.requisitos.map(r => ({
                  id: r.id || uid(),
                  categoria: r.categoria || getDefaultCategoria(),
                  termo: r.termo || "",
                  peso: clamp(parseInt(r.peso ?? 0,10)||0,0,10),
                  obrigatorio: !!r.obrigatorio,
                  sinonimos: Array.isArray(r.sinonimos) ? r.sinonimos : [],
                  obs: r.obs || ""
                })) : [],
                meta: {
                  departamento: meta.departamento || DEFAULT_DEPARTAMENTO,
                  areaTime: meta.areaTime || DEFAULT_AREA_TIME,
                  quantidade: parseInt(meta.quantidade ?? 1, 10) || 1,
                  tipoContratacao: meta.tipoContratacao || DEFAULT_TIPO_CONTRATACAO,
                  codigoInterno: meta.codigoInterno || "",
                  cbo: meta.cbo || "",
                  gestorRequisitante: meta.gestorRequisitante || "",
                  recrutador: meta.recrutador || "",
                  motivoAbertura: meta.motivoAbertura || DEFAULT_MOTIVO,
                  orcamentoAprovado: meta.orcamentoAprovado || DEFAULT_ORCAMENTO,
                  prioridade: meta.prioridade || DEFAULT_PRIORIDADE,
                  resumo: meta.resumo || "",
                  tagsResponsabilidades: Array.isArray(meta.tagsResponsabilidades) ? meta.tagsResponsabilidades : [],
                  tagsKeywords: Array.isArray(meta.tagsKeywords) ? meta.tagsKeywords : [],
                  confidencial: !!meta.confidencial,
                  aceitaPcd: !!meta.aceitaPcd,
                  urgente: !!meta.urgente,
                  projeto: {
                    nome: meta.projeto?.nome || "",
                    cliente: meta.projeto?.cliente || "",
                    prazo: meta.projeto?.prazo || "",
                    descricao: meta.projeto?.descricao || ""
                  },
                  pcdObs: meta.pcdObs || ""
                },
                jornada: {
                  regime: jornada.regime || DEFAULT_REGIME,
                  cargaSemanal: jornada.cargaSemanal || "",
                  horaEntrada: jornada.horaEntrada || "",
                  horaSaida: jornada.horaSaida || "",
                  intervalo: jornada.intervalo || "",
                  escala: jornada.escala || DEFAULT_ESCALA,
                  local: {
                    cep: local.cep || "",
                    logradouro: local.logradouro || "",
                    numero: local.numero || "",
                    bairro: local.bairro || "",
                    cidade,
                    uf,
                    politicaTrabalho: local.politicaTrabalho || "",
                    deslocamentoObs: local.deslocamentoObs || ""
                  }
                },
                remuneracao: {
                  moeda: remuneracao.moeda || DEFAULT_MOEDA,
                  salarioMin: remuneracao.salarioMin || "",
                  salarioMax: remuneracao.salarioMax || "",
                  periodicidade: remuneracao.periodicidade || DEFAULT_REMUN_PERIOD,
                  bonusTipo: remuneracao.bonusTipo || DEFAULT_BONUS,
                  percentual: remuneracao.percentual || "",
                  obs: remuneracao.obs || "",
                  beneficios: Array.isArray(remuneracao.beneficios) ? remuneracao.beneficios.map(b => ({
                    tipo: b.tipo || DEFAULT_BENEFICIO_TIPO,
                    valor: b.valor || "",
                    recorrencia: b.recorrencia || DEFAULT_BENEFICIO_REC,
                    obrigatorio: !!b.obrigatorio,
                    obs: b.obs || ""
                  })) : []
                },
                requisitosExtras: {
                  escolaridade: requisitosExtras.escolaridade || DEFAULT_ESCOLARIDADE,
                  formacaoArea: requisitosExtras.formacaoArea || DEFAULT_FORMACAO,
                  expMinAnos: requisitosExtras.expMinAnos || "",
                  tagsStack: Array.isArray(requisitosExtras.tagsStack) ? requisitosExtras.tagsStack : [],
                  tagsIdiomas: Array.isArray(requisitosExtras.tagsIdiomas) ? requisitosExtras.tagsIdiomas : [],
                  diferenciais: requisitosExtras.diferenciais || "",
                  requisitosDetalhados: Array.isArray(requisitosExtras.requisitosDetalhados) ? requisitosExtras.requisitosDetalhados.map(r => ({
                    nome: r.nome || "",
                    peso: parseInt(r.peso ?? DEFAULT_PESO, 10) || parseInt(DEFAULT_PESO, 10),
                    obrigatorio: !!r.obrigatorio,
                    anos: r.anos || "",
                    nivel: r.nivel || DEFAULT_REQ_NIVEL,
                    avaliacao: r.avaliacao || DEFAULT_REQ_AVALIACAO,
                    obs: r.obs || ""
                  })) : []
                },
                processo: {
                  etapas: Array.isArray(processo.etapas) ? processo.etapas.map(e => ({
                    nome: e.nome || "",
                    responsavel: e.responsavel || DEFAULT_ETAPA_RESP,
                    modo: e.modo || DEFAULT_ETAPA_MODO,
                    slaDias: e.slaDias || "",
                    descricao: e.descricao || ""
                  })) : [],
                  perguntas: Array.isArray(processo.perguntas) ? processo.perguntas.map(p => ({
                    pergunta: p.pergunta || "",
                    tipo: p.tipo || DEFAULT_QUESTION_TIPO,
                    peso: parseInt(p.peso ?? DEFAULT_PESO, 10) || parseInt(DEFAULT_PESO, 10),
                    obrigatoria: !!p.obrigatoria,
                    knockout: !!p.knockout,
                    opcoes: Array.isArray(p.opcoes) ? p.opcoes : []
                  })) : [],
                  obsInternas: processo.obsInternas || ""
                },
                publicacao: {
                  visibilidade: publicacao.visibilidade || DEFAULT_PUBLICACAO,
                  dataInicio: publicacao.dataInicio || "",
                  dataFim: publicacao.dataFim || "",
                  canais: {
                    linkedin: !!publicacao.canais?.linkedin,
                    site: !!publicacao.canais?.site,
                    indicacao: !!publicacao.canais?.indicacao,
                    portalEmprego: !!publicacao.canais?.portalEmprego
                  },
                  descricaoPublica: publicacao.descricaoPublica || ""
                },
                compliance: {
                  diversidade: {
                    generoPreferencia: diversidade.generoPreferencia || DEFAULT_GENERO,
                    vagaAfirmativa: !!diversidade.vagaAfirmativa,
                    linguagemInclusiva: !!diversidade.linguagemInclusiva,
                    publicoAfirmativo: diversidade.publicoAfirmativo || ""
                  },
                  lgpd: {
                    consentimentoBase: !!lgpd.consentimentoBase,
                    compartilhamento: !!lgpd.compartilhamento,
                    retencao: !!lgpd.retencao,
                    retencaoMeses: lgpd.retencaoMeses || ""
                  },
                  docs: {
                    cnh: !!docs.cnh,
                    disponibilidadeViagens: !!docs.disponibilidadeViagens,
                    antecedentes: !!docs.antecedentes
                  }
                }
              };
            });

            state.selectedId = state.vagas[0]?.id || null;
            saveState();
            renderAreaFilter();
            updateKpis();
            renderList();
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

    // ========= Init + bindings
    function wireClock(){
      const label = $("#nowLabel");
      if(!label) return;
      const tick = () => {
        const d = new Date();
        label.textContent = d.toLocaleString("pt-BR", {
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
      $("#btnAddBenefit").addEventListener("click", () => {
        const host = $("#vagaBenefitsList");
        const row = buildBenefitRow(newBenefit());
        if(host && row) host.appendChild(row);
      });
      $("#btnAddVagaReq").addEventListener("click", () => {
        const host = $("#vagaReqList");
        const row = buildModalReqRow(newModalReq());
        if(host && row) host.appendChild(row);
      });
      $("#btnAddVagaEtapa").addEventListener("click", () => {
        const host = $("#vagaEtapasList");
        const row = buildStageRow(newStage());
        if(host && row) host.appendChild(row);
      });
      $("#btnAddVagaPergunta").addEventListener("click", () => {
        const host = $("#vagaPerguntasList");
        const row = buildQuestionRow(newQuestion());
        if(host && row) host.appendChild(row);
      });

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

    function openDetailFromQuery(){
      const params = new URLSearchParams(window.location.search);
      const vagaId = params.get("vagaId");
      const open = params.get("open");
      if(!vagaId) return;
      let v = findVaga(vagaId);
      if(!v){
        const seedVaga = Array.isArray(seed.vagas) ? seed.vagas.find(x => x.id === vagaId) : null;
        if(seedVaga){
          state.vagas.unshift(seedVaga);
          saveState();
          renderAreaFilter();
          updateKpis();
          renderList();
          renderDetail();
          v = seedVaga;
        }
      }
      if(!v) return;
      if(open === "detail"){
        openDetailModal(vagaId);
      }else{
        selectVaga(vagaId);
      }
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
      openDetailFromQuery();

      // garantir que haja seleção
      if(!state.selectedId && state.vagas.length){
        state.selectedId = state.vagas[0].id;
        saveState();
        renderList();
        renderDetail();
      }
    })();




