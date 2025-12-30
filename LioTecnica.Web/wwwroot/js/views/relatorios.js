// ========= Logo (Data URI placeholder)
    const seed = window.__seedData || {};
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
function enumFirstCode(key, fallback){
      const list = getEnumOptions(key);
      return list.length ? list[0].code : fallback;
    }

    const VAGA_ALL = enumFirstCode("vagaFilterSimple", "all");
    const EMPTY_TEXT = "—";
    const BULLET = "•";

    function setText(root, role, value, fallback = EMPTY_TEXT){
      if(!root) return;
      const el = root.querySelector(`[data-role="${role}"]`);
      if(!el) return;
      el.textContent = (value ?? fallback);
    }

    function makeCell(text, className, icon){
      return { text, className, icon };
    }

    function makeTagCell(text, cls, icon){
      const className = ["tag", cls].filter(Boolean).join(" ");
      return { text, className, icon };
    }

    function setIconText(el, iconClass, text){
      if(!el) return;
      el.replaceChildren();
      const icon = document.createElement("i");
      icon.className = "bi " + iconClass + " me-1";
      el.appendChild(icon);
      el.appendChild(document.createTextNode(text ?? ""));
    }
// ========= Storage keys (compatÃ­vel com telas anteriores)
    const VAGAS_KEY = "lt_rh_vagas_v1";
    const CANDS_KEY = "lt_rh_candidatos_v1";
    const INBOX_KEY = "lt_rh_inbox_v1";

    // ========= State
    const state = {
      reportId: "r1",
      filters: { period:"30d", vaga:"all", origem:"all", status:"all", q:"" },
      vagas: [],
      candidatos: [],
      inbox: []
    };

    // ========= Load/save
    function loadJson(key, fallback){
      try{
        const raw = localStorage.getItem(key);
        if(!raw) return fallback;
        return JSON.parse(raw);
      }catch{ return fallback; }
    }

    // ========= Seed (mínimo para não quebrar a tela)
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
      state.candidatos = (loadJson(CANDS_KEY, { candidatos: [] }).candidatos || []);
      state.inbox = (loadJson(INBOX_KEY, { inbox: [] }).inbox || []);
    }

    function findVaga(id){ return state.vagas.find(v => v.id === id) || null; }

    // ========= Relatórios (catálogo)
    const REPORTS = Array.isArray(seed.reports) ? seed.reports : [];

    // ========= Filters / period
    function periodStart(period){
      const now = new Date();
      const d = new Date(now);
      if(period === "7d") d.setDate(now.getDate()-7);
      else if(period === "30d") d.setDate(now.getDate()-30);
      else if(period === "90d") d.setDate(now.getDate()-90);
      else if(period === "ytd"){ d.setMonth(0,1); d.setHours(0,0,0,0); }
      return d;
    }

    function inPeriod(iso){
      if(!iso) return false;
      const d = new Date(iso);
      return d >= periodStart(state.filters.period);
    }

    function applyCommonFiltersToInbox(list){
      const q = (state.filters.q||"").trim().toLowerCase();
      const origem = state.filters.origem;
      const status = state.filters.status;
      const vaga = state.filters.vaga;

      return list.filter(x=>{
        if(!inPeriod(x.recebidoEm)) return false;
        if(origem !== "all" && x.origem !== origem) return false;
        if(status !== "all" && x.status !== status) return false;
        if(vaga !== "all" && x.vagaId !== vaga) return false;

        if(!q) return true;
        const v = findVaga(x.vagaId);
        const blob = [
          x.remetente, x.assunto, x.destinatario,
          v?.titulo, v?.codigo,
          ...(x.anexos||[]).map(a => a.nome)
        ].join(" ").toLowerCase();
        return blob.includes(q);
      });
    }

    // ========= Render catálogo de relatórios
    function renderReportCatalog(){
      const host = $("#reportList");
      host.replaceChildren();

      REPORTS.forEach(r => {
        const tile = cloneTemplate("tpl-report-tile");
        if(!tile) return;

        tile.dataset.id = r.id;
        if(r.id === state.reportId) tile.classList.add("active");

        const icon = tile.querySelector('[data-role="tile-icon"]');
        if(icon) icon.className = "bi bi-" + r.icon;
        setText(tile, "tile-title", r.title);
        setText(tile, "tile-desc", r.desc);
        setText(tile, "tile-scope", r.scope);

        tile.addEventListener("click", () => {
          state.reportId = r.id;
          renderReportCatalog();
          renderReport();
        });

        host.appendChild(tile);
      });
    }

    // ========= Render filtros (vagas)
    function renderVagaOptions(){
      const sel = $("#fVaga");
      const current = sel.value || VAGA_ALL;
      sel.replaceChildren();
      getEnumOptions("vagaFilterSimple").forEach(opt => {
        sel.appendChild(buildOption(opt.code, opt.text, opt.code === current));
      });
      state.vagas
        .slice()
        .sort((a,b)=> (a.titulo||"").localeCompare(b.titulo||""))
        .forEach(v => {
          sel.appendChild(buildOption(v.id, `${v.titulo} (${v.codigo||EMPTY_TEXT})`, v.id === current));
        });
      sel.value = state.filters.vaga || current || VAGA_ALL;
    }

    // ========= KPI
    function renderKPIs(){
      const vagas = state.vagas.length;
      const cands = state.candidatos.length;
      const inbox = state.inbox.filter(x => ["novo","processando"].includes(x.status)).length;

      // conversão simples (processado â†’ candidato) (demo)
      const processed = state.inbox.filter(x => x.status === "processado" && inPeriod(x.recebidoEm)).length;
      const conv = processed ? Math.round((cands / processed) * 100) : 0;

      $("#kpiVagas").textContent = vagas;
      $("#kpiCands").textContent = cands;
      $("#kpiInbox").textContent = inbox;
      $("#kpiConv").textContent = clamp(conv,0,100) + "%";
    }

    // ========= Chart (canvas simples sem libs)
    function drawBarChart(labels, values){
      const canvas = $("#chart");
      const ctx = canvas.getContext("2d");

      // Ajusta para dpi
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.scale(dpr, dpr);

      const W = rect.width, H = rect.height;
      ctx.clearRect(0,0,W,H);

      // eixos
      const padL = 46, padR = 16, padT = 16, padB = 42;
      const chartW = W - padL - padR;
      const chartH = H - padT - padB;

      // fundo
      ctx.fillStyle = "rgba(255,255,255,0.0)";
      ctx.fillRect(0,0,W,H);

      const maxV = Math.max(1, ...values);
      const n = labels.length;
      const gap = 10;
      const barW = n ? (chartW - gap*(n-1)) / n : chartW;

      // grid horizontal (4 linhas)
      ctx.strokeStyle = "rgba(16,82,144,.14)";
      ctx.lineWidth = 1;
      for(let i=0;i<=4;i++){
        const y = padT + (chartH*(i/4));
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL+chartW, y);
        ctx.stroke();
      }

      // barras
      for(let i=0;i<n;i++){
        const v = values[i];
        const h = (v / maxV) * chartH;
        const x = padL + i*(barW+gap);
        const y = padT + (chartH - h);

        // barra (gradiente simples)
        const grd = ctx.createLinearGradient(x, y, x+barW, y);
        grd.addColorStop(0, "rgba(16,82,144,.95)");
        grd.addColorStop(1, "rgba(12,58,100,.95)");
        ctx.fillStyle = grd;
        roundRect(ctx, x, y, barW, h, 10, true, false);

        // valor
        ctx.fillStyle = "rgba(13,27,42,.78)";
        ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial";
        const val = String(v);
        ctx.fillText(val, x + (barW/2) - (ctx.measureText(val).width/2), y - 6);

        // label
        ctx.fillStyle = "rgba(13,27,42,.70)";
        ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial";
        const lab = labels[i];
        const lw = ctx.measureText(lab).width;
        ctx.fillText(lab, x + (barW/2) - (lw/2), padT + chartH + 26);
      }

      // eixo Y labels (0 e max)
      ctx.fillStyle = "rgba(13,27,42,.60)";
      ctx.font = "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial";
      ctx.fillText("0", 18, padT + chartH + 4);
      const m = String(maxV);
      ctx.fillText(m, 18, padT + 12);

      // eixo
      ctx.strokeStyle = "rgba(16,82,144,.22)";
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, padT+chartH);
      ctx.lineTo(padL+chartW, padT+chartH);
      ctx.stroke();
    }

    function roundRect(ctx, x, y, w, h, r, fill, stroke){
      r = Math.min(r, w/2, h/2);
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.arcTo(x+w, y, x+w, y+h, r);
      ctx.arcTo(x+w, y+h, x, y+h, r);
      ctx.arcTo(x, y+h, x, y, r);
      ctx.arcTo(x, y, x+w, y, r);
      ctx.closePath();
      if(fill) ctx.fill();
      if(stroke) ctx.stroke();
    }

    // ========= Result table render
    function renderCell(td, cell){
      if(cell == null){
        td.textContent = "";
        return;
      }
      if(cell instanceof Node){
        td.appendChild(cell);
        return;
      }
      if(typeof cell === "object" && !Array.isArray(cell)){
        const span = document.createElement("span");
        if(cell.className) span.className = cell.className;
        if(cell.icon){
          const icon = document.createElement("i");
          icon.className = "bi " + cell.icon + " me-1";
          span.appendChild(icon);
        }
        span.appendChild(document.createTextNode(cell.text ?? ""));
        td.appendChild(span);
        return;
      }
      td.textContent = cell;
    }

    function setTable(headers, rows){
      const theadRow = $("#theadRow");
      const tbody = $("#tbodyRows");
      if(!theadRow || !tbody) return;

      theadRow.replaceChildren();
      (headers || []).forEach(h => {
        const th = document.createElement("th");
        th.textContent = h ?? "";
        theadRow.appendChild(th);
      });

      tbody.replaceChildren();
      (rows || []).forEach(row => {
        const tr = document.createElement("tr");
        (row || []).forEach(cell => {
          const td = document.createElement("td");
          renderCell(td, cell);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      const countEl = $("#rowCount");
      if(countEl) countEl.textContent = String((rows || []).length);
    }

    

    function buildReportData(){
      const r = REPORTS.find(x => x.id === state.reportId);
      if(!r) return { labels:[], values:[], headers:[], rows:[], title:EMPTY_TEXT, desc:"" };

      if(r.id === "r1"){
        const list = applyCommonFiltersToInbox(state.inbox);
        const count = { email:0, pasta:0, upload:0 };
        list.forEach(x => { count[x.origem] = (count[x.origem]||0) + 1; });

        const labels = ["Email","Pasta","Upload"];
        const values = [count.email||0, count.pasta||0, count.upload||0];

        const headers = ["Recebido em", "Origem", "Remetente", "Assunto", "Vaga", "Status"];
        const rows = list
          .slice()
          .sort((a,b)=> new Date(b.recebidoEm||0)-new Date(a.recebidoEm||0))
          .slice(0, 30)
          .map(x => {
            const v = findVaga(x.vagaId);
            const vagaLabel = v ? `${v.titulo} (${v.codigo||EMPTY_TEXT})` : EMPTY_TEXT;
            const statusCell =
              x.status === "processado" ? makeTagCell("Processado","ok","bi-check2-circle") :
              x.status === "processando" ? makeTagCell("Processando","warn","bi-arrow-repeat") :
              x.status === "falha" ? makeTagCell("Falha","bad","bi-exclamation-triangle") :
              makeTagCell(x.status || EMPTY_TEXT, "", "bi-dot");
            return [
              fmtDate(x.recebidoEm),
              x.origem,
              makeCell(x.remetente || EMPTY_TEXT, "mono"),
              x.assunto || EMPTY_TEXT,
              vagaLabel,
              statusCell
            ];
          });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      if(r.id === "r2"){
        const list = applyCommonFiltersToInbox(state.inbox).filter(x => x.status === "falha");
        const buckets = {};
        list.forEach(x => {
          const e = (x.processamento && x.processamento.ultimoErro) ? x.processamento.ultimoErro : "Outros";
          const key = e.length > 22 ? (e.slice(0,22)+"...") : e;
          buckets[key] = (buckets[key]||0)+1;
        });

        const pairs = Object.entries(buckets).sort((a,b)=> b[1]-a[1]).slice(0, 6);
        const labels = pairs.map(p => p[0]);
        const values = pairs.map(p => p[1]);

        const headers = ["Recebido em", "Origem", "Assunto", "Vaga", "Erro"];
        const rows = list
          .slice()
          .sort((a,b)=> new Date(b.recebidoEm||0)-new Date(a.recebidoEm||0))
          .slice(0, 30)
          .map(x => {
            const v = findVaga(x.vagaId);
            const vagaLabel = v ? `${v.titulo} (${v.codigo||EMPTY_TEXT})` : EMPTY_TEXT;
            return [
              fmtDate(x.recebidoEm),
              x.origem,
              x.assunto || EMPTY_TEXT,
              vagaLabel,
              makeCell(x.processamento?.ultimoErro || EMPTY_TEXT, "text-danger")
            ];
          });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      if(r.id === "r3"){
        const list = state.candidatos.slice();
        const count = {};
        list.forEach(c => { const s = c.status || EMPTY_TEXT; count[s] = (count[s]||0)+1; });

        const pairs = Object.entries(count).sort((a,b)=> b[1]-a[1]).slice(0, 7);
        const labels = pairs.map(p => p[0]);
        const values = pairs.map(p => p[1]);

        const headers = ["Criado em", "Nome", "Email", "Status", "Vaga"];
        const rows = list
          .slice()
          .sort((a,b)=> new Date(b.createdAt||0)-new Date(a.createdAt||0))
          .slice(0, 30)
          .map(c => {
            const v = findVaga(c.vagaId);
            const st = (c.status||"").toLowerCase();
            const badge =
              st.includes("aprov") ? makeTagCell(c.status || EMPTY_TEXT, "ok", "bi-check2-circle") :
              st.includes("reprov") ? makeTagCell(c.status || EMPTY_TEXT, "bad", "bi-x-circle") :
              st.includes("match") ? makeTagCell(c.status || EMPTY_TEXT, "warn", "bi-stars") :
              makeTagCell(c.status || EMPTY_TEXT, "", "bi-dot");

            return [
              fmtDate(c.createdAt),
              c.nome || EMPTY_TEXT,
              c.email ? makeCell(c.email, "mono") : EMPTY_TEXT,
              badge,
              v ? `${v.titulo} (${v.codigo||EMPTY_TEXT})` : EMPTY_TEXT
            ];
          });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      if(r.id === "r4"){
        const byVaga = {};
        const inbox = applyCommonFiltersToInbox(state.inbox);
        inbox.forEach(x => {
          const vid = x.vagaId || "none";
          byVaga[vid] = byVaga[vid] || { recebidos:0, processados:0, falhas:0 };
          byVaga[vid].recebidos++;
          if(x.status === "processado") byVaga[vid].processados++;
          if(x.status === "falha") byVaga[vid].falhas++;
        });

        const pairs = Object.entries(byVaga).map(([k,v]) => [k, v.recebidos]).sort((a,b)=> b[1]-a[1]).slice(0, 5);
        const labels = pairs.map(([vid]) => {
          const v = findVaga(vid);
          return v ? (v.codigo || "Vaga") : "Sem vaga";
        });
        const values = pairs.map(([vid]) => byVaga[vid].recebidos);

        const headers = ["Vaga", "Recebidos", "Processados", "Falhas", "Taxa OK"];
        const rows = pairs.map(([vid]) => {
          const v = findVaga(vid);
          const obj = byVaga[vid];
          const ok = obj.processados;
          const rate = obj.recebidos ? Math.round((ok/obj.recebidos)*100) : 0;
          const badge =
            rate >= 70 ? makeTagCell(`${rate}%`, "ok", "bi-check2-circle") :
            rate >= 40 ? makeTagCell(`${rate}%`, "warn", "bi-exclamation-circle") :
                         makeTagCell(`${rate}%`, "bad", "bi-x-circle");
          return [
            v ? `${v.titulo} (${v.codigo||EMPTY_TEXT})` : "Sem vaga",
            makeCell(obj.recebidos, "fw-semibold"),
            makeCell(obj.processados, "fw-semibold text-success"),
            makeCell(obj.falhas, "fw-semibold text-danger"),
            badge
          ];
        });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      if(r.id === "r5"){
        const list = state.candidatos
          .map(c => {
            const seed = (c.id||"").split("").reduce((a,ch)=> a+ch.charCodeAt(0), 0);
            const score = c.lastMatch?.percent ?? (40 + (seed % 61));
            return { ...c, _score: clamp(score,0,100) };
          })
          .sort((a,b)=> b._score - a._score)
          .slice(0, 12);

        const labels = list.slice(0, 6).map(c => (c.nome||EMPTY_TEXT).split(" ")[0].slice(0,10));
        const values = list.slice(0, 6).map(c => c._score);

        const headers = ["Candidato", "Email", "Vaga", "Match", "Atualizado"];
        const rows = list.map(c => {
          const v = findVaga(c.vagaId);
          const s = c._score;
          const badge =
            s >= 80 ? makeTagCell(`${s}%`, "ok", "bi-stars") :
            s >= 60 ? makeTagCell(`${s}%`, "warn", "bi-stars") :
                      makeTagCell(`${s}%`, "bad", "bi-stars");
          return [
            c.nome || EMPTY_TEXT,
            c.email ? makeCell(c.email, "mono") : EMPTY_TEXT,
            v ? `${v.titulo} (${v.codigo||EMPTY_TEXT})` : EMPTY_TEXT,
            badge,
            fmtDate(c.updatedAt || c.createdAt)
          ];
        });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      return { labels:[], values:[], headers:[], rows:[], title:r.title, desc:r.desc, scope:r.scope };
    }

    
    function renderReport(){
      const r = REPORTS.find(x => x.id === state.reportId);
        $("#reportTitle").textContent = r ? r.title : "•";
      $("#reportDesc").textContent = r ? r.desc : "Selecione um relatório no catálogo.";

      const data = buildReportData();

      setIconText($("#tagScope"), "bi-sliders", data.scope || "escopo");
      setIconText($("#tagFresh"), "bi-clock-history", "atual");

      drawBarChart(data.labels || [], data.values || []);
      setTable(data.headers || [], data.rows || []);

      // hint
      const p = state.filters.period;
      const pl = p==="7d"?"7 dias":p==="30d"?"30 dias":p==="90d"?"90 dias":"YTD";
      $("#resultHint").textContent = `Perí­odo: ${pl} â€¢ Vaga: ${state.filters.vaga==="all"?"todas":"filtrada"} â€¢ Origem/Status: conforme filtros.`;
    }

    // ========= CSV export do relatório atual
    function exportCurrentCsv(){
      const data = buildReportData();
      const headers = data.headers || [];
      const rows = data.rows || [];

      // remove HTML dos cells para CSV básico
      const cellText = (cell) => {
        if(cell == null) return "";
        if(cell instanceof Node) return (cell.textContent || "").trim();
        if(typeof cell === "object" && !Array.isArray(cell)) return String(cell.text ?? "").trim();
        return String(cell).trim();
      };

      const csv = [
        headers.map(h => `"${String(h).replaceAll('"','""')}"`).join(";"),
        ...rows.map(r => r.map(c => `"${cellText(c).replaceAll('"','""')}"`).join(";"))
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio_${state.reportId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    // ========= UI wiring
    function initLogo(){
      $("#logoDesktop").src = LOGO_DATA_URI;
      $("#logoMobile").src = LOGO_DATA_URI;
    }
    function wireClock(){
      const now = new Date();
      const buildEl = $("#buildId");
      if(buildEl){
        buildEl.textContent = "build: demo-" + String(now.getFullYear()).slice(2) + "-" + String(now.getMonth()+1).padStart(2,"0");
      }

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
      $("#fPeriod").value = state.filters.period;
      $("#fOrigem").value = state.filters.origem;
      $("#fStatus").value = state.filters.status;
      $("#fSearch").value = state.filters.q;

      $("#btnApply").addEventListener("click", () => {
        state.filters.period = $("#fPeriod").value;
        state.filters.vaga = $("#fVaga").value;
        state.filters.origem = $("#fOrigem").value;
        state.filters.status = $("#fStatus").value;
        state.filters.q = ($("#fSearch").value||"").trim();
        renderKPIs();
        renderReport();
      });

      $("#btnClear").addEventListener("click", () => {
        state.filters = { period:"30d", vaga:"all", origem:"all", status:"all", q:"" };
        $("#fPeriod").value = state.filters.period;
        $("#fVaga").value = state.filters.vaga;
        $("#fOrigem").value = state.filters.origem;
        $("#fStatus").value = state.filters.status;
        $("#fSearch").value = state.filters.q;
        renderKPIs();
        renderReport();
      });
    }

    function wireTopButtons(){
      $("#btnRun").addEventListener("click", () => {
        renderKPIs();
        renderReport();
      });

      $("#btnExport").addEventListener("click", exportCurrentCsv);

      $("#btnSeedReset").addEventListener("click", () => {
        const ok = confirm("Restaurar demo? Isso recria seeds mÃ­nimas (Vagas/Candidatos/Inbox).");
        if(!ok) return;
        localStorage.removeItem(VAGAS_KEY);
        localStorage.removeItem(CANDS_KEY);
        localStorage.removeItem(INBOX_KEY);
        seedIfEmpty();
        loadAll();
        renderVagaOptions();
        renderKPIs();
        renderReportCatalog();
        renderReport();
      });
    }

    // ========= Init
    (function init(){
      initLogo();
      wireClock();

      seedIfEmpty();
      loadAll();

      renderVagaOptions();
      renderKPIs();
      renderReportCatalog();
      wireFilters();
      wireTopButtons();

      renderReport();
      window.addEventListener("resize", () => renderReport());
    })();


