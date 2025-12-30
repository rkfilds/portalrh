// ========= Logo (Data URI placeholder)
    const seed = window.__seedData || {};
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
// ========= Storage keys (compatível com telas anteriores)
    const VAGAS_KEY = "lt_rh_vagas_v1";
    const CANDS_KEY = "lt_rh_candidatos_v1";
    const INBOX_KEY = "lt_rh_inbox_v1";

    const state = {
      vagas: [],
      candidatos: [],
      inbox: [],
      selectedId: null,
      filters: { q:"", origem:"all", status:"all" }
    };

    function loadJson(key, fallback){
      try{
        const raw = localStorage.getItem(key);
        if(!raw) return fallback;
        return JSON.parse(raw);
      }catch{ return fallback; }
    }
    function saveInbox(){
      localStorage.setItem(INBOX_KEY, JSON.stringify({ inbox: state.inbox, selectedId: state.selectedId, savedAt: new Date().toISOString() }));
    }

    // ========= Seed (se vazio)
    function seedIfEmpty(){
      const vagasSeed = Array.isArray(seed.vagas) ? seed.vagas : [];
      const candsSeed = Array.isArray(seed.candidatos) ? seed.candidatos : [];
      const inboxSeed = Array.isArray(seed.inbox) ? seed.inbox : [];

      const vagasRaw = loadJson(VAGAS_KEY, null);
      if((!vagasRaw || !Array.isArray(vagasRaw.vagas) || !vagasRaw.vagas.length) && vagasSeed.length){
        localStorage.setItem(VAGAS_KEY, JSON.stringify({ vagas: vagasSeed, selectedId: seed.selectedVagaId || null }));
      }

      const candRaw = loadJson(CANDS_KEY, null);
      if((!candRaw || !Array.isArray(candRaw.candidatos) || !candRaw.candidatos.length) && candsSeed.length){
        localStorage.setItem(CANDS_KEY, JSON.stringify({ candidatos: candsSeed, selectedId: seed.selectedCandidatoId || null }));
      }

      const inboxRaw = loadJson(INBOX_KEY, null);
      if((!inboxRaw || !Array.isArray(inboxRaw.inbox) || !inboxRaw.inbox.length) && inboxSeed.length){
        localStorage.setItem(INBOX_KEY, JSON.stringify({ inbox: inboxSeed, selectedId: seed.selectedInboxId || inboxSeed[0]?.id || null, savedAt: new Date().toISOString() }));
      }
    }

function loadAll(){
      state.vagas = (loadJson(VAGAS_KEY, { vagas: [] }).vagas || []);
      const c = loadJson(CANDS_KEY, { candidatos: [], selectedId: null });
      state.candidatos = c.candidatos || [];
      const i = loadJson(INBOX_KEY, { inbox: [], selectedId: null });
      state.inbox = i.inbox || [];
      state.selectedId = i.selectedId || state.inbox[0]?.id || null;
    }

    function findVaga(id){ return state.vagas.find(v => v.id === id) || null; }
    function findInbox(id){ return state.inbox.find(x => x.id === id) || null; }

    function statusTag(st){
      const map = {
        novo:  { cls:"", icon:"dot", label:"Novo" },
        processando:{ cls:"warn", icon:"arrow-repeat", label:"Processando" },
        processado:{ cls:"ok", icon:"check2-circle", label:"Processado" },
        falha:{ cls:"bad", icon:"exclamation-triangle", label:"Falha" },
        descartado:{ cls:"bad", icon:"trash3", label:"Descartado" }
      };
      const it = map[st] || { cls:"", icon:"dot", label: (st||"—") };
      return `<span class="status-tag ${it.cls}"><i class="bi bi-${it.icon}"></i>${it.label}</span>`;
    }
    function origemPill(o){
      const map = {
        email: { icon:"envelope", label:"Email" },
        pasta: { icon:"folder2-open", label:"Pasta" },
        upload: { icon:"cloud-arrow-up", label:"Upload" }
      };
      const it = map[o] || { icon:"question-circle", label:o||"—" };
      return `<span class="pill"><i class="bi bi-${it.icon}"></i>${it.label}</span>`;
    }
    function attachmentPill(a){
      const icon = a.tipo === "pdf" ? "file-earmark-pdf" :
                   (a.tipo === "doc" || a.tipo === "docx" ? "file-earmark-word" : "file-earmark");
      return `<span class="chip"><i class="bi bi-${icon}"></i>${escapeHtml(a.nome)} <span class="mono muted">(${escapeHtml(a.tamanhoKB)}KB)</span></span>`;
    }

    // ========= Filters
    function applyFilters(list){
      const q = (state.filters.q||"").trim().toLowerCase();
      const o = state.filters.origem;
      const s = state.filters.status;

      return list.filter(x => {
        if(o !== "all" && x.origem !== o) return false;
        if(s !== "all" && x.status !== s) return false;
        if(!q) return true;

        const vaga = findVaga(x.vagaId);
        const blob = [
          x.remetente, x.assunto, x.destinatario,
          vaga?.titulo, vaga?.codigo,
          ...(x.anexos||[]).map(a => a.nome)
        ].join(" ").toLowerCase();

        return blob.includes(q);
      });
    }

    // ========= Render
    function renderAll(){
      renderKPIs();
      renderList();
      renderDetail(state.selectedId ? findInbox(state.selectedId) : null);
    }

    function renderKPIs(){
      const today = new Date();
      const isSameDay = (iso) => {
        const d = new Date(iso);
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
      };

      const queue = state.inbox.filter(x => ["novo","processando"].includes(x.status)).length;
      const done = state.inbox.filter(x => x.status === "processado" && isSameDay(x.recebidoEm)).length;
      const fail = state.inbox.filter(x => x.status === "falha").length;

      $("#kpiQueue").textContent = queue;
      $("#kpiDone").textContent = done;
      $("#kpiFail").textContent = fail;
    }

    function renderList(){
      const list = applyFilters(state.inbox)
        .sort((a,b)=> new Date(b.recebidoEm||0) - new Date(a.recebidoEm||0));

      $("#queueHint").textContent = list.length ? "" : "Nenhum item encontrado com os filtros atuais.";
      $("#queueList").innerHTML = list.map(x => renderRow(x)).join("") || `<div class="text-muted small">—</div>`;

      $$(".row-item").forEach(el => {
        if(el.dataset.id === state.selectedId) el.classList.add("active");
        el.addEventListener("click", () => {
          state.selectedId = el.dataset.id;
          saveInbox();
          renderList();
          renderDetail(findInbox(state.selectedId));
        });
      });
    }

    function renderRow(x){
      const vaga = findVaga(x.vagaId);
      const anexo = x.anexos?.[0];
      const icon = x.origem === "email" ? "envelope" : (x.origem === "pasta" ? "folder2-open" : "cloud-arrow-up");

      const pct = clamp(parseInt(x.processamento?.pct||0,10)||0,0,100);
      const bar = (x.status === "processando")
        ? `<div class="progress mt-2"><div class="progress-bar" style="width:${pct}%"></div></div>`
        : ``;

      const sub = vaga ? `${vaga.titulo} (${vaga.codigo||"—"})` : "Vaga: não definida";

      return `
        <div class="row-item" data-id="${x.id}">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <div class="avatar"><i class="bi bi-${icon}"></i></div>
              <div>
                <div class="fw-bold">${escapeHtml(x.assunto || (anexo?.nome || "—"))}</div>
                <div class="text-muted small">${escapeHtml(x.remetente || "—")} • ${escapeHtml(fmtDate(x.recebidoEm))}</div>
              </div>
            </div>
            <div class="text-end">
              ${statusTag(x.status)}
              <div class="text-muted small mt-1">${escapeHtml(sub)}</div>
            </div>
          </div>
          ${bar}
        </div>
      `;
    }

    function renderDetail(x){
      if(!x){
        $("#detailHost").innerHTML = `
          <div class="empty">
            <div class="d-flex align-items-start gap-2">
              <i class="bi bi-info-circle mt-1"></i>
              <div>
                <div class="fw-bold">Selecione um item da fila</div>
                <div class="small mt-1">Você verá metadados, anexos e ações.</div>
              </div>
            </div>
          </div>`;
        return;
      }

      const vaga = findVaga(x.vagaId);
      const pct = clamp(parseInt(x.processamento?.pct||0,10)||0,0,100);

      const attachments = (x.anexos||[]).length
        ? (x.anexos||[]).map(a => attachmentPill(a)).join(" ")
        : `<span class="text-muted small">Sem anexos</span>`;

      const log = (x.processamento?.log||[]);
      const logHtml = log.length
        ? `<ul class="mb-0 small">${log.map(l => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`
        : `<div class="text-muted small">Sem logs ainda.</div>`;

      const errorBox = x.processamento?.ultimoErro
        ? `<div class="alert alert-danger mt-3 mb-0" style="border-radius:14px;">
             <div class="d-flex align-items-start gap-2">
               <i class="bi bi-exclamation-triangle mt-1"></i>
               <div>
                 <div class="fw-semibold">Erro</div>
                 <div class="small">${escapeHtml(x.processamento.ultimoErro)}</div>
               </div>
             </div>
           </div>`
        : "";

      const actions = `
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-brand btn-sm" id="btnProcess">
            <i class="bi bi-cpu me-1"></i>${x.status === "processando" ? "Continuar" : "Processar"}
          </button>
          <button class="btn btn-ghost btn-sm" id="btnReprocess">
            <i class="bi bi-arrow-repeat me-1"></i>Reprocessar
          </button>
          <button class="btn btn-ghost btn-sm" id="btnCreateCandidate">
            <i class="bi bi-person-plus me-1"></i>Criar candidato
          </button>
          <button class="btn btn-ghost btn-sm" id="btnDiscard">
            <i class="bi bi-trash3 me-1"></i>Descartar
          </button>
        </div>
      `;

      $("#detailHost").innerHTML = `
        <div class="card-soft p-3">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
            <div class="d-flex align-items-center gap-2">
              <div class="avatar" style="width:52px;height:52px;border-radius:16px;">
                <i class="bi bi-inbox"></i>
              </div>
              <div>
                <div class="fw-bold" style="font-size:1.05rem;">${escapeHtml(x.assunto || "—")}</div>
                <div class="text-muted small">${escapeHtml(x.remetente || "—")} • ${escapeHtml(fmtDate(x.recebidoEm))}</div>
                <div class="text-muted small">Destino: ${escapeHtml(x.destinatario || "—")}</div>
              </div>
            </div>
            <div class="text-end">
              ${statusTag(x.status)}
              <div class="text-muted small mt-1">Origem: ${origemPill(x.origem)}</div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="pill"><i class="bi bi-briefcase"></i>${escapeHtml(vaga?.titulo || "Vaga não definida")}</span>
            <span class="pill mono">${escapeHtml(vaga?.codigo || "—")}</span>
            <span class="pill"><i class="bi bi-paperclip"></i>Anexos: <strong class="ms-1">${(x.anexos||[]).length}</strong></span>
            <span class="pill"><i class="bi bi-arrow-counterclockwise"></i>Tentativas: <strong class="ms-1">${escapeHtml(x.processamento?.tentativas ?? 0)}</strong></span>
          </div>

          <div class="row g-2">
            <div class="col-12 col-lg-6">
              <div class="fw-bold mb-2">Anexos</div>
              <div>${attachments}</div>

              <div class="mt-3">
                <div class="fw-bold">Preview (texto extraído)</div>
                <div class="text-muted small">No MVP real, vem do parser de PDF/Word.</div>
                <textarea class="form-control mt-2" rows="6" id="previewText" style="border-color:var(--lt-border);" placeholder="(vazio)">${escapeHtml(x.previewText || "")}</textarea>
                <div class="d-flex flex-wrap gap-2 mt-2">
                  <button class="btn btn-ghost btn-sm" id="btnSavePreview">
                    <i class="bi bi-save me-1"></i>Salvar preview
                  </button>
                  <button class="btn btn-ghost btn-sm" id="btnAutoAssign">
                    <i class="bi bi-diagram-3 me-1"></i>Auto-atribuir vaga (demo)
                  </button>
                </div>
              </div>

              ${errorBox}
            </div>

            <div class="col-12 col-lg-6">
              <div class="fw-bold mb-2">Processamento</div>
              <div class="card-soft p-3" style="box-shadow:none;">
                <div class="d-flex align-items-center justify-content-between">
                  <div>
                    <div class="fw-semibold">Etapa</div>
                    <div class="text-muted small" id="stepLabel">${escapeHtml(x.processamento?.etapa || "—")}</div>
                  </div>
                  <div class="fw-bold" style="font-size:1.15rem;color:var(--lt-primary);" id="pctLabel">${pct}%</div>
                </div>
                <div class="progress mt-2">
                  <div class="progress-bar" id="pctBar" style="width:${pct}%"></div>
                </div>

                <hr class="my-3" style="border-color: rgba(16,82,144,.14);">

                <div class="d-flex align-items-start gap-2">
                  <i class="bi bi-list-check mt-1"></i>
                  <div class="flex-grow-1">
                    <div class="fw-semibold">Logs</div>
                    <div class="mt-2" id="logBox">${logHtml}</div>
                  </div>
                </div>

                <hr class="my-3" style="border-color: rgba(16,82,144,.14);">

                ${actions}

                <div class="text-muted small mt-3">
                  <i class="bi bi-info-circle me-1"></i>
                  Produto real: IMAP/Watcher → fila → storage → parser → candidato (triagem).
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      // bind actions
      $("#btnSavePreview").addEventListener("click", () => {
        x.previewText = ($("#previewText").value || "").trim();
        saveInbox();
        toast("Preview salvo.");
      });

      $("#btnAutoAssign").addEventListener("click", () => {
        // demo simples: se preview tiver "sql" ou "power" => vaga 1, senão mantém
        const txt = ($("#previewText").value || "").toLowerCase();
        const v = state.vagas[0];
        if(v){
          x.vagaId = v.id;
          saveInbox();
          toast("Vaga atribuída (demo).");
          renderAll();
        }
      });

      $("#btnProcess").addEventListener("click", () => runProcess(x, false));
      $("#btnReprocess").addEventListener("click", () => runProcess(x, true));

      $("#btnCreateCandidate").addEventListener("click", () => {
        createCandidateFromInbox(x);
      });

      $("#btnDiscard").addEventListener("click", () => {
        if(!confirm("Descartar este item?")) return;
        x.status = "descartado";
        x.processamento.etapa = "Descartado";
        x.processamento.pct = 100;
        x.processamento.log = (x.processamento.log||[]);
        x.processamento.log.push("Item descartado manualmente.");
        saveInbox();
        toast("Item descartado.");
        renderAll();
      });
    }

    // ========= Processing simulation
    let simTimer = null;

    function runProcess(item, force){
      if(!item) return;

      if(force){
        item.status = "novo";
        item.processamento = { pct: 0, etapa: "Aguardando", log: [], tentativas: (item.processamento?.tentativas||0), ultimoErro: null };
      }

      if(item.status === "processado"){
        toast("Já está processado. Use Reprocessar se precisar.");
        return;
      }
      if(item.status === "descartado"){
        toast("Item descartado. Não é possível processar.");
        return;
      }

      item.status = "processando";
      item.processamento = item.processamento || { pct: 0, etapa: "Aguardando", log: [], tentativas: 0, ultimoErro: null };
      item.processamento.tentativas = (item.processamento.tentativas||0) + 1;
      item.processamento.ultimoErro = null;
      item.processamento.log = item.processamento.log || [];
      item.processamento.log.push("Processamento iniciado.");

      saveInbox();
      renderAll();

      // simula etapas
      const steps = [
        { pct: 15, etapa: "Validando anexos", log: "Anexos validados." },
        { pct: 35, etapa: "Armazenando arquivo", log: "Arquivo armazenado (demo)." },
        { pct: 60, etapa: "Extraindo texto", log: "Texto extraído (demo)." },
        { pct: 85, etapa: "Normalizando conteúdo", log: "Normalização concluída." },
        { pct: 100, etapa: "Concluído", log: "Processamento finalizado." }
      ];

      let idx = 0;
      clearInterval(simTimer);
      simTimer = setInterval(() => {
        const s = steps[idx++];
        if(!s){
          clearInterval(simTimer);

          // chance de falha (se tiver "senha" no assunto ou item já falhou)
          const fail = (item.assunto||"").toLowerCase().includes("senha") || (item.remetente||"").includes("carlos");
          if(fail && item.processamento.tentativas < 3){
            item.status = "falha";
            item.processamento.etapa = "Falha";
            item.processamento.pct = 100;
            item.processamento.ultimoErro = "Falha na extração: documento protegido / inválido (demo).";
            item.processamento.log.push("Falha detectada: arquivo protegido/ inválido.");
            saveInbox();
            toast("Falha ao processar (demo).");
            renderAll();
            return;
          }

          item.status = "processado";
          item.processamento.etapa = "Concluído";
          item.processamento.pct = 100;

          // preenche preview se vazio
          if(!item.previewText){
            item.previewText = "Resumo (demo): experiência com excel, dashboards, comunicação e relatórios.";
          }

          saveInbox();
          toast("Processamento concluído.");
          renderAll();
          return;
        }

        item.processamento.etapa = s.etapa;
        item.processamento.pct = s.pct;
        item.processamento.log.push(s.log);
        saveInbox();
        renderAll();
      }, 700);
    }

    // ========= Candidate creation (demo)
    function createCandidateFromInbox(item){
      if(!item) return;

      const candRaw = loadJson(CANDS_KEY, { candidatos: [], selectedId: null });
      const candidatos = candRaw.candidatos || [];

      // tenta inferir nome pelo arquivo
      const firstAtt = item.anexos?.[0]?.nome || "Candidato";
      const base = firstAtt.replace(/\.(pdf|doc|docx|txt)$/i,"").replaceAll("_"," ").replaceAll("-"," ");
      const nome = base.length >= 4 ? base : "Novo Candidato";

      const novo = {
        id: uid(),
        nome,
        email: (item.remetente && item.remetente.includes("@@")) ? item.remetente : "",
        fone: "",
        cidade: "",
        uf: "",
        fonte: item.origem === "email" ? "Email" : (item.origem === "pasta" ? "Pasta" : "Upload"),
        status: "triagem",
        vagaId: item.vagaId || null,
        obs: "Criado a partir da Entrada (demo).",
        cvText: (item.previewText || "").trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMatch: null
      };

      candidatos.unshift(novo);
      localStorage.setItem(CANDS_KEY, JSON.stringify({ ...candRaw, candidatos, selectedId: novo.id }));
      state.candidatos = candidatos;

      // marca item como processado e vinculado
      if(item.status !== "processado"){
        item.status = "processado";
        item.processamento = item.processamento || { pct: 100, etapa: "Concluído", log: [], tentativas: 1, ultimoErro: null };
        item.processamento.pct = 100;
        item.processamento.etapa = "Concluído";
        item.processamento.ultimoErro = null;
      }
      item.processamento.log = item.processamento.log || [];
      item.processamento.log.push("Candidato criado a partir da entrada (demo).");
      saveInbox();

      toast("Candidato criado (demo).");
      renderAll();
    }

    // ========= Upload handlers (demo)
    function addUploads(files){
      if(!files || !files.length) return;

      const vagaId = state.vagas[0]?.id || null;

      for(const f of files){
        const name = f.name || "arquivo";
        const ext = (name.split(".").pop() || "").toLowerCase();
        const tipo = ["pdf","doc","docx","txt"].includes(ext) ? ext : "file";

        state.inbox.unshift({
          id: uid(),
          origem: "upload",
          status: "novo",
          recebidoEm: new Date().toISOString(),
          remetente: "upload@@local",
          assunto: "Upload manual",
          destinatario: "Portal RH",
          vagaId,
          anexos: [{ nome: name, tipo, tamanhoKB: Math.max(1, Math.round((f.size||1024)/1024)), hash: "up-"+Math.random().toString(16).slice(2,10) }],
          processamento: { pct: 0, etapa: "Aguardando", log: ["Arquivo anexado via upload (demo)."], tentativas: 0, ultimoErro: null },
          previewText: ""
        });
      }

      state.selectedId = state.inbox[0]?.id || state.selectedId;
      saveInbox();
      toast(`${files.length} arquivo(s) adicionado(s) na fila.`);
      renderAll();
    }

    // ========= Import/Export (Entrada)
    function exportJson(){
      const payload = { version:1, exportedAt: new Date().toISOString(), inbox: state.inbox };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "entrada_inbox_liotecnica.json";
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
            if(data && Array.isArray(data.inbox)){
              state.inbox = data.inbox;
              state.selectedId = state.inbox[0]?.id || null;
              saveInbox();
              toast("Importação concluída.");
              renderAll();
            }else{
              alert("JSON inválido (esperado: { inbox: [...] }).");
            }
          }catch(e){
            console.error(e);
            alert("Falha ao importar JSON.");
          }
        };
        reader.readAsText(file);
      };
      inp.click();
    }

    // ========= Simular coleta (demo)
    function simulateCollect(){
      const vagaId = state.vagas[0]?.id || null;
      const now = Date.now();
      const newItem = {
        id: uid(),
        origem: Math.random() > .45 ? "email" : "pasta",
        status: "novo",
        recebidoEm: new Date(now).toISOString(),
        remetente: Math.random() > .45 ? "novo.candidato@@email.com" : "watcher@@server",
        assunto: Math.random() > .45 ? "Currículo • Vaga aberta" : "Novo arquivo em pasta monitorada",
        destinatario: Math.random() > .45 ? "rh@@liotecnica.com.br" : "FS: \\\\RH\\Curriculos\\Entrada",
        vagaId,
        anexos: [
          { nome: Math.random() > .5 ? "Novo_Candidato_CV.pdf" : "Curriculo_Atualizado.docx", tipo: Math.random() > .5 ? "pdf" : "docx", tamanhoKB: 220 + Math.round(Math.random()*600), hash: "sim-"+Math.random().toString(16).slice(2,10) }
        ],
        processamento: { pct: 0, etapa: "Aguardando", log: ["Item coletado (demo)."], tentativas: 0, ultimoErro: null },
        previewText: ""
      };
      state.inbox.unshift(newItem);
      state.selectedId = newItem.id;
      saveInbox();
      toast("Novo item coletado (demo).");
      renderAll();
    }

    // ========= Wire
    function initLogo(){
      $("#logoDesktop").src = LOGO_DATA_URI;
      $("#logoMobile").src = LOGO_DATA_URI;
    }
    function wireClock(){
      const label = $("#nowLabel");
      if(!label) return;
      const tick = () => {
        const d = new Date();
        label.textContent = d.toLocaleString("pt-BR", { weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
      };
      tick();
      setInterval(tick, 1000*15);
    }
    function wireFilters(){
      const apply = () => {
        state.filters.q = ($("#fSearch").value || "").trim();
        state.filters.origem = $("#fOrigem").value || "all";
        state.filters.status = $("#fStatus").value || "all";
        renderAll();
      };
      $("#fSearch").addEventListener("input", apply);
      $("#fOrigem").addEventListener("change", apply);
      $("#fStatus").addEventListener("change", apply);
    }
    function wireUpload(){
      const dz = $("#dropzone");
      const picker = $("#filePicker");

      $("#btnAddUpload").addEventListener("click", () => picker.click());
      picker.addEventListener("change", () => addUploads(picker.files));

      dz.addEventListener("dragover", (e) => {
        e.preventDefault();
        dz.classList.add("dragover");
      });
      dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
      dz.addEventListener("drop", (e) => {
        e.preventDefault();
        dz.classList.remove("dragover");
        const files = e.dataTransfer?.files;
        addUploads(files);
      });
    }
    function wireTopButtons(){
      $("#btnExport").addEventListener("click", exportJson);
      $("#btnImport").addEventListener("click", importJson);
      $("#btnRunSim").addEventListener("click", simulateCollect);

      $("#btnSeedReset").addEventListener("click", () => {
        const ok = confirm("Restaurar demo? Isso substituirá Inbox (Entrada) e resetará as seeds.");
        if(!ok) return;

        localStorage.removeItem(INBOX_KEY);
        localStorage.removeItem(VAGAS_KEY);
        localStorage.removeItem(CANDS_KEY);

        seedIfEmpty();
        loadAll();
        renderAll();
        toast("Demo restaurada.");
      });
    }

    // ========= Init
    (function init(){
      initLogo();
      wireClock();

      seedIfEmpty();
      loadAll();

      wireFilters();
      wireUpload();
      wireTopButtons();

      // select first visible item if none
      if(!state.selectedId && state.inbox[0]) state.selectedId = state.inbox[0].id;
      saveInbox();

      renderAll();
    })();
