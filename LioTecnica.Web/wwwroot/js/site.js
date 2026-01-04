(() => {
  const g = window;

  g.$ = (sel, root = document) => root.querySelector(sel);
  g.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  g.clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  g.uid = () => {
    if (g.crypto && g.crypto.randomUUID) return g.crypto.randomUUID();
    return "id-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
  };

  g.escapeHtml = (str) => {
    return (str ?? "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  const normalizeEnumCode = (code) => (code ?? "").toString().trim().toLowerCase();

  g.getEnumOptions = (key) => {
    const data = g.__enumData || {};
    const list = data[key];
    return Array.isArray(list) ? list : [];
  };

  g.getEnumText = (key, code, fallback = "") => {
    const list = g.getEnumOptions(key);
    const target = normalizeEnumCode(code);
    const opt = list.find(o => normalizeEnumCode(o.code) === target);
    return opt ? opt.text : (fallback || code || "");
  };

  g.buildOption = (code, text, selected = false) => {
    const opt = document.createElement("option");
    opt.value = code ?? "";
    opt.textContent = text ?? "";
    if (selected) opt.selected = true;
    return opt;
  };

  g.fillSelectFromEnum = (select, key, selectedCode) => {
    if (!select) return;
    select.replaceChildren();
    const list = g.getEnumOptions(key);
    const selectedKey = normalizeEnumCode(selectedCode);
    const hasSelected = selectedKey.length > 0;
    list.forEach(opt => {
      const isSelected = hasSelected && normalizeEnumCode(opt.code) === selectedKey;
      select.appendChild(g.buildOption(opt.code, opt.text, isSelected));
    });
  };

  g.applyEnumSelects = (root = document) => {
    g.$$(`select[data-enum]`, root).forEach(select => {
      const key = select.dataset.enum;
      if (!key) return;
      const selected = select.dataset.selected ?? select.value ?? "";
      g.fillSelectFromEnum(select, key, selected);
    });
  };

  g.ensureEnumData = async () => {
    if (g.__enumDataLoaded && g.__enumData) return g.__enumData;
    if (g.__enumDataPromise) return g.__enumDataPromise;
    const url = g.__enumsUrl || "/api/lookup/enums";
    g.__enumDataPromise = fetch(url, { headers: { "Accept": "application/json" } })
      .then(res => {
        if (!res.ok) throw new Error(`Falha ao buscar enums: ${res.status}`);
        return res.json();
      })
      .then(data => {
        g.__enumData = data || {};
        g.__enumDataLoaded = true;
        g.applyEnumSelects();
        return g.__enumData;
      })
      .catch(err => {
        console.error("Falha ao carregar enums da API:", err);
        g.__enumData = g.__enumData || {};
        g.__enumDataLoaded = true;
        return g.__enumData;
      })
      .finally(() => {
        g.__enumDataPromise = null;
      });

    return g.__enumDataPromise;
  };

  g.cloneTemplate = (id) => {
    const tpl = document.getElementById(id);
    if (!tpl) return null;
    return tpl.content.firstElementChild.cloneNode(true);
  };

  g.cloneTemplateContent = (id) => {
    const tpl = document.getElementById(id);
    return tpl ? tpl.content.cloneNode(true) : document.createDocumentFragment();
  };

  g.bindText = (root, key, value, fallback = "") => {
    if (!root) return;
    const text = value ?? fallback;
    root.querySelectorAll(`[data-text="${key}"]`).forEach(el => {
      el.textContent = text;
    });
  };

  g.bindValue = (root, key, value) => {
    if (!root) return;
    root.querySelectorAll(`[data-value="${key}"]`).forEach(el => {
      el.value = value ?? "";
    });
  };

  g.toggleRole = (root, key, show) => {
    if (!root) return;
    root.querySelectorAll(`[data-role="${key}"]`).forEach(el => {
      el.classList.toggle("d-none", !show);
    });
  };

  g.fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  g.initials = (name, fallback = "—") => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return fallback;
    const a = parts[0][0] || "";
    const b = parts.length > 1 ? (parts[parts.length - 1][0] || "") : "";
    return (a + b).toUpperCase();
  };

  g.normalizeText = (s) => {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9#+\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  g.toast = (msg, title = "Portal RH") => {
    const toastEl = document.getElementById("appToast");
    if (!toastEl || !g.bootstrap) return;
    const titleEl = document.getElementById("toastTitle");
    const whenEl = document.getElementById("toastTime") || document.getElementById("toastWhen");
    const msgEl = document.getElementById("toastBody") || document.getElementById("toastMsg");
    if (titleEl) titleEl.textContent = title || "Portal RH";
    if (msgEl) msgEl.textContent = msg ?? "";
    if (whenEl) whenEl.textContent = "agora";
    g.bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2400 }).show();
  };

  g.setYear = () => {
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", g.setYear, { once: true });
  } else {
    g.setYear();
  }
})();

(() => {
  const overlay = document.getElementById("globalLoading");
  if (!overlay) return;

  const MIN_DURATION = 750;
  const NAV_KEY = "lt_nav_start";
  let activeCount = 0;
  let shownAt = 0;
  let hideTimer = null;

  const setActive = (on) => {
    overlay.classList.toggle("active", on);
    overlay.setAttribute("aria-hidden", on ? "false" : "true");
  };

  const begin = (startAt) => {
    if (activeCount === 0) {
      shownAt = typeof startAt === "number" ? startAt : Date.now();
      setActive(true);
    }
    activeCount += 1;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const end = () => {
    if (activeCount === 0) return;
    activeCount -= 1;
    if (activeCount > 0) return;
    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, MIN_DURATION - elapsed);
    hideTimer = setTimeout(() => {
      if (activeCount === 0) setActive(false);
    }, remaining);
  };

  const navStart = Number(sessionStorage.getItem(NAV_KEY));
  if (!Number.isNaN(navStart) && navStart > 0) {
    sessionStorage.removeItem(NAV_KEY);
    begin(navStart);
  } else {
    begin(Date.now());
  }
  window.addEventListener("load", end);

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    if (link.hasAttribute("download")) return;
    if (link.target && link.target !== "_self") return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    sessionStorage.setItem(NAV_KEY, String(Date.now()));
    begin();
  }, true);

  document.addEventListener("submit", (event) => {
    if (!(event.target instanceof HTMLFormElement)) return;
    sessionStorage.setItem(NAV_KEY, String(Date.now()));
    begin();
  }, true);

  if (window.fetch) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      begin();
      return originalFetch(...args).then((res) => {
        end();
        return res;
      }).catch((err) => {
        end();
        throw err;
      });
    };
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(...args) {
    this._ltTrack = true;
    return originalOpen.apply(this, args);
  };
  XMLHttpRequest.prototype.send = function(...args) {
    if (this._ltTrack) {
      begin();
      this.addEventListener("loadend", end, { once: true });
    }
    return originalSend.apply(this, args);
  };

  window.LioTecnicaLoading = { begin, end };
})();
