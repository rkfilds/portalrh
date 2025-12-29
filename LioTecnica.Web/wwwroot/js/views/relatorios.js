// ========= Logo (Data URI placeholder)
    const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
// ========= Storage keys (compatível com telas anteriores)
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
      const vagasRaw = loadJson(VAGAS_KEY, null);
      if(!vagasRaw || !Array.isArray(vagasRaw.vagas) || !vagasRaw.vagas.length){
        const vaga = {
          id: uid(),
          codigo: "VAG-001",
          titulo: "Analista de Dados",
          descricao: "Análise de indicadores, dashboards e apoio ao RH/gestão.",
          threshold: 65,
          requisitos: [
            { id: uid(), termo: "excel", peso: 5, obrigatorio: true, sinonimos: ["planilhas","vlookup","tabela dinamica"] },
            { id: uid(), termo: "power bi", peso: 4, obrigatorio: false, sinonimos: ["pbi","powerbi"] },
            { id: uid(), termo: "sql", peso: 4, obrigatorio: false, sinonimos: ["postgres","query"] }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(VAGAS_KEY, JSON.stringify({ vagas: [vaga] }));
      }

      const candRaw = loadJson(CANDS_KEY, null);
      if(!candRaw || !Array.isArray(candRaw.candidatos)){
        localStorage.setItem(CANDS_KEY, JSON.stringify({ candidatos: [], selectedId: null }));
      }

      const inboxRaw = loadJson(INBOX_KEY, null);
      if(!inboxRaw || !Array.isArray(inboxRaw.inbox)){
        localStorage.setItem(INBOX_KEY, JSON.stringify({ inbox: [], selectedId: null, savedAt: new Date().toISOString() }));
      }
    }

    function loadAll(){
      state.vagas = (loadJson(VAGAS_KEY, { vagas: [] }).vagas || []);
      state.candidatos = (loadJson(CANDS_KEY, { candidatos: [] }).candidatos || []);
      state.inbox = (loadJson(INBOX_KEY, { inbox: [] }).inbox || []);
    }

    function findVaga(id){ return state.vagas.find(v => v.id === id) || null; }

    // ========= Relatórios (catálogo)
    const REPORTS = [
      {
        id:"r1",
        icon:"bar-chart",
        title:"Entrada por Origem",
        desc:"Quantidade de itens recebidos por Email/Pasta/Upload no período.",
        scope:"entrada"
      },
      {
        id:"r2",
        icon:"exclamation-triangle",
        title:"Falhas de Processamento",
        desc:"Principais causas de falha (PDF protegido, parser, arquivo vazio).",
        scope:"entrada"
      },
      {
        id:"r3",
        icon:"people",
        title:"Pipeline RH (Status do Candidato)",
        desc:"Distribuição por status: triagem, matching, aprovado, reprovado.",
        scope:"candidatos"
      },
      {
        id:"r4",
        icon:"briefcase",
        title:"Funil por Vaga",
        desc:"Candidatos por vaga: recebidos → triados → match ≥ threshold.",
        scope:"vagas"
      },
      {
        id:"r5",
        icon:"stars",
        title:"Ranking de Matching",
        desc:"Top candidatos por percentual de match (demo).",
        scope:"matching"
      }
    ];

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
      $("#reportList").innerHTML = REPORTS.map(r => `
        <div class="tile ${r.id===state.reportId ? "active":""}" data-id="${r.id}">
          <div class="d-flex align-items-start justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <div class="iconbox"><i class="bi bi-${r.icon}"></i></div>
              <div>
                <div class="fw-bold">${escapeHtml(r.title)}</div>
                <div class="text-muted small">${escapeHtml(r.desc)}</div>
              </div>
            </div>
            <span class="pill"><i class="bi bi-tag"></i>${escapeHtml(r.scope)}</span>
          </div>
        </div>
      `).join("");

      $$(".tile").forEach(el => {
        el.addEventListener("click", () => {
          state.reportId = el.dataset.id;
          renderReportCatalog();
          renderReport();
        });
      });
    }

    // ========= Render filtros (vagas)
    function renderVagaOptions(){
      const sel = $("#fVaga");
      const current = sel.value || "all";
      const opts = state.vagas
        .slice()
        .sort((a,b)=> (a.titulo||"").localeCompare(b.titulo||""))
        .map(v => `<option value="${v.id}">${escapeHtml(v.titulo)} (${escapeHtml(v.codigo||"—")})</option>`)
        .join("");
      sel.innerHTML = `<option value="all">Todas</option>${opts}`;
      sel.value = state.filters.vaga || current || "all";
    }

    // ========= KPI
    function renderKPIs(){
      const vagas = state.vagas.length;
      const cands = state.candidatos.length;
      const inbox = state.inbox.filter(x => ["novo","processando"].includes(x.status)).length;

      // conversão simples (processado → candidato) (demo)
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
    function setTable(headers, rows){
      $("#theadRow").innerHTML = headers.map(h => `<th>${escapeHtml(h)}</th>`).join("");
      $("#tbodyRows").innerHTML = rows.map(r => `
        <tr>
          ${r.map(c => `<td>${c}</td>`).join("")}
        </tr>
      `).join("");
      $("#rowCount").textContent = rows.length;
      $("#resultHint").textContent = rows.length ? "" : "Nenhum resultado com os filtros atuais.";
    }

    function tag(html, cls="tag"){ return `<span class="${cls}">${html}</span>`; }

    // ========= Report builders (mocados, baseados nos dados salvos)
    function buildReportData(){
      const r = REPORTS.find(x => x.id === state.reportId);
      if(!r) return { labels:[], values:[], headers:[], rows:[], title:"—", desc:"" };

      if(r.id === "r1"){ // Entrada por origem
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
            return [
              escapeHtml(fmtDate(x.recebidoEm)),
              escapeHtml(x.origem),
              `<span class="mono">${escapeHtml(x.remetente||"—")}</span>`,
              escapeHtml(x.assunto||"—"),
              escapeHtml(v ? `${v.titulo} (${v.codigo||"—"})` : "—"),
              x.status === "processado" ? tag(`<i class="bi bi-check2-circle"></i>Processado`,"tag ok") :
              x.status === "processando" ? tag(`<i class="bi bi-arrow-repeat"></i>Processando`,"tag warn") :
              x.status === "falha" ? tag(`<i class="bi bi-exclamation-triangle"></i>Falha`,"tag bad") :
              tag(`<i class="bi bi-dot"></i>${escapeHtml(x.status||"—")}`,"tag")
            ];
          });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      if(r.id === "r2"){ // Falhas
        const list = applyCommonFiltersToInbox(state.inbox).filter(x => x.status === "falha");
        const buckets = {};
        list.forEach(x => {
          const e = (x.processamento && x.processamento.ultimoErro) ? x.processamento.ultimoErro : "Outros";
          const key = e.length > 22 ? (e.slice(0,22)+"…") : e;
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
            return [
              escapeHtml(fmtDate(x.recebidoEm)),
              escapeHtml(x.origem),
              escapeHtml(x.assunto||"—"),
              escapeHtml(v ? `${v.titulo} (${v.codigo||"—"})` : "—"),
              `<span class="text-danger">${escapeHtml(x.processamento?.ultimoErro || "—")}</span>`
            ];
          });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      if(r.id === "r3"){ // Pipeline candidatos
        const list = state.candidatos.slice();
        const count = {};
        list.forEach(c => { const s = c.status || "—"; count[s] = (count[s]||0)+1; });

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
              st.includes("aprov") ? tag(`<i class="bi bi-check2-circle"></i>${escapeHtml(c.status)}`,"tag ok") :
              st.includes("reprov") ? tag(`<i class="bi bi-x-circle"></i>${escapeHtml(c.status)}`,"tag bad") :
              st.includes("match") ? tag(`<i class="bi bi-stars"></i>${escapeHtml(c.status)}`,"tag warn") :
              tag(`<i class="bi bi-dot"></i>${escapeHtml(c.status||"—")}`,"tag");

            return [
              escapeHtml(fmtDate(c.createdAt)),
              escapeHtml(c.nome || "—"),
              c.email ? `<span class="mono">${escapeHtml(c.email)}</span>` : "—",
              badge,
              escapeHtml(v ? `${v.titulo} (${v.codigo||"—"})` : "—")
            ];
          });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      if(r.id === "r4"){ // Funil por vaga (mocado)
        const byVaga = {};
        const inbox = applyCommonFiltersToInbox(state.inbox);
        inbox.forEach(x => {
          const vid = x.vagaId || "none";
          byVaga[vid] = byVaga[vid] || { recebidos:0, processados:0, falhas:0 };
          byVaga[vid].recebidos++;
          if(x.status === "processado") byVaga[vid].processados++;
          if(x.status === "falha") byVaga[vid].falhas++;
        });

        // labels: top 5 vagas
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
          return [
            escapeHtml(v ? `${v.titulo} (${v.codigo||"—"})` : "Sem vaga"),
            `<span class="fw-semibold">${obj.recebidos}</span>`,
            `<span class="fw-semibold" style="color:rgba(25,135,84,.95)">${obj.processados}</span>`,
            `<span class="fw-semibold text-danger">${obj.falhas}</span>`,
            rate >= 70 ? tag(`<i class="bi bi-check2-circle"></i>${rate}%`,"tag ok") :
            rate >= 40 ? tag(`<i class="bi bi-exclamation-circle"></i>${rate}%`,"tag warn") :
                         tag(`<i class="bi bi-x-circle"></i>${rate}%`,"tag bad")
          ];
        });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      if(r.id === "r5"){ // Ranking matching (demo)
        const list = state.candidatos
          .map(c => {
            // se não tiver match, gera um número determinístico “demo”
            const seed = (c.id||"").split("").reduce((a,ch)=> a+ch.charCodeAt(0), 0);
            const score = c.lastMatch?.percent ?? (40 + (seed % 61)); // 40..100
            return { ...c, _score: clamp(score,0,100) };
          })
          .sort((a,b)=> b._score - a._score)
          .slice(0, 12);

        const labels = list.slice(0, 6).map(c => (c.nome||"—").split(" ")[0].slice(0,10));
        const values = list.slice(0, 6).map(c => c._score);

        const headers = ["Candidato", "Email", "Vaga", "Match", "Atualizado"];
        const rows = list.map(c => {
          const v = findVaga(c.vagaId);
          const s = c._score;
          const badge =
            s >= 80 ? tag(`<i class="bi bi-stars"></i>${s}%`,"tag ok") :
            s >= 60 ? tag(`<i class="bi bi-stars"></i>${s}%`,"tag warn") :
                      tag(`<i class="bi bi-stars"></i>${s}%`,"tag bad");
          return [
            escapeHtml(c.nome || "—"),
            c.email ? `<span class="mono">${escapeHtml(c.email)}</span>` : "—",
            escapeHtml(v ? `${v.titulo} (${v.codigo||"—"})` : "—"),
            badge,
            escapeHtml(fmtDate(c.updatedAt || c.createdAt))
          ];
        });

        return { labels, values, headers, rows, title:r.title, desc:r.desc, scope:r.scope };
      }

      return { labels:[], values:[], headers:[], rows:[], title:r.title, desc:r.desc, scope:r.scope };
    }

    // ========= Render report
    function renderReport(){
      const r = REPORTS.find(x => x.id === state.reportId);
      $("#reportTitle").textContent = r ? r.title : "—";
      $("#reportDesc").textContent = r ? r.desc : "Selecione um relatório no catálogo.";

      const data = buildReportData();

      $("#tagScope").innerHTML = `<i class="bi bi-sliders"></i>${escapeHtml(data.scope||"escopo")}`;
      $("#tagFresh").innerHTML = `<i class="bi bi-clock-history"></i>atual`;

      drawBarChart(data.labels || [], data.values || []);
      setTable(data.headers || [], data.rows || []);

      // hint
      const p = state.filters.period;
      const pl = p==="7d"?"7 dias":p==="30d"?"30 dias":p==="90d"?"90 dias":"YTD";
      $("#resultHint").textContent = `Período: ${pl} • Vaga: ${state.filters.vaga==="all"?"todas":"filtrada"} • Origem/Status: conforme filtros.`;
    }

    // ========= CSV export do relatório atual
    function exportCurrentCsv(){
      const data = buildReportData();
      const headers = data.headers || [];
      const rows = data.rows || [];

      // remove HTML dos cells para CSV básico
      const strip = (html) => String(html)
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/?[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const csv = [
        headers.map(h => `"${String(h).replaceAll('"','""')}"`).join(";"),
        ...rows.map(r => r.map(c => `"${strip(c).replaceAll('"','""')}"`).join(";"))
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
      $("#year").textContent = now.getFullYear();
      $("#buildId").textContent = "build: demo-" + String(now.getFullYear()).slice(2) + "-" + String(now.getMonth()+1).padStart(2,"0");

      const tick = () => {
        const d = new Date();
        $("#nowLabel").textContent = d.toLocaleString("pt-BR", { weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
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
        const ok = confirm("Restaurar demo? Isso recria seeds mínimas (Vagas/Candidatos/Inbox).");
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
