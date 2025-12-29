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

  g.toast = (msg) => {
    const toastEl = document.getElementById("appToast");
    if (!toastEl || !g.bootstrap) return;
    const whenEl = document.getElementById("toastWhen");
    const msgEl = document.getElementById("toastMsg");
    if (msgEl) msgEl.textContent = msg;
    if (whenEl) whenEl.textContent = "agora";
    g.bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2400 }).show();
  };
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
