// ========= Logo (data URI real do arquivo recebido)
// Obs: apesar do nome do arquivo ser .png, o conteÃºdo Ã© WebP (ok).
const seed = window.__seedData || {};
const LOGO_DATA_URI = "data:image/webp;base64,UklGRngUAABXRUJQVlA4IGwUAAAQYwCdASpbAVsBPlEokUajoqGhIpNoyHAK7AQYJjYQmG9Dtu/6p6QZ4lQd6lPde+Jk3i3kG2EoP+QW0c0h8Oe3jW2C5zE0o9jzZ1x2fX9cZlX0d7rW8r0vQ9p3d2nJ1bqzQfQZxVwTt7mJvU8j1GqF4oJc8Qb+gq+oQyHcQyYc2b9u2fYf0Rj9x9hRZp2Y2xK0yVQ8Hj4p6w8B1K2cKk2mY9m2r8kz3a4m7xG4xg9m5VjzP3E4RjQH8fYkC4mB8g0vR3c5h1D0yE8Qzv7t7gQj0Z9yKk3cWZgVnq3l1kq6rE8oWc4z6oZk8k0b1o9m8p2m+QJ3nJm6GgA=";
function enumFirstCode(key, fallback) {
    const list = getEnumOptions(key);
    return list.length ? list[0].code : fallback;
}

const ROLE_ALL = enumFirstCode("roleFilter", "all");
// ========= Storage keys (compatÃ­vel com outras telas)
const USERS_KEY = "lt_rh_users_v1";
const ROLES_KEY = "lt_rh_roles_v1";

// ========= Modules/permissions
const MODULES = [
    { key: "dashboard", label: "Dashboard" },
    { key: "vagas", label: "Vagas" },
    { key: "candidatos", label: "Candidatos" },
    { key: "triagem", label: "Triagem" },
    { key: "matching", label: "Matching" },
    { key: "entrada", label: "Entrada (Email/Pasta)" },
    { key: "relatorios", label: "Relatórios" },
    { key: "config", label: "Configurações" },
    { key: "usuarios", label: "Usuários & Perfis" },
];
const ACTIONS = [
    { key: "view", label: "Visualizar" },
    { key: "create", label: "Criar" },
    { key: "edit", label: "Editar" },
    { key: "delete", label: "Excluir" },
    { key: "export", label: "Exportar" },
    { key: "admin", label: "Admin" },
];

// ========= State
const state = {
    users: [],
    roles: [],
    selectedRoleId: null,
    selectedUserId: null,
    filters: { q: "", status: "all", role: "all" }
};

// ========= Load/save
function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
    } catch { return fallback; }
}
function saveUsers() { localStorage.setItem(USERS_KEY, JSON.stringify({ users: state.users })); }
function saveRoles() { localStorage.setItem(ROLES_KEY, JSON.stringify({ roles: state.roles })); }

// ========= Seed
function emptyPerms() {
    const p = {};
    for (const m of MODULES) {
        p[m.key] = { view: false, create: false, edit: false, delete: false, export: false, admin: false };
    }
    return p;
}
function seedIfEmpty() {
    const rolesSeed = Array.isArray(seed.roles) ? seed.roles : [];
    const usersSeed = Array.isArray(seed.users) ? seed.users : [];

    const rolesRaw = loadJson(ROLES_KEY, null);
    if ((!rolesRaw || !Array.isArray(rolesRaw.roles) || !rolesRaw.roles.length) && rolesSeed.length) {
        localStorage.setItem(ROLES_KEY, JSON.stringify({ roles: rolesSeed }));
    }

    const usersRaw = loadJson(USERS_KEY, null);
    if ((!usersRaw || !Array.isArray(usersRaw.users) || !usersRaw.users.length) && usersSeed.length) {
        localStorage.setItem(USERS_KEY, JSON.stringify({ users: usersSeed }));
    }
}

function loadAll() {
    state.roles = (loadJson(ROLES_KEY, { roles: [] }).roles || []);
    state.users = (loadJson(USERS_KEY, { users: [] }).users || []);
    if (!state.selectedRoleId) state.selectedRoleId = state.roles[0]?.id || null;
}

// ========= Toast
function showToast(title, body) {
    if (typeof window.toast !== "function") return;
    window.toast(body || "-", title || "Notificação");
}

// ========= Role helpers
function roleById(id) { return state.roles.find(r => r.id === id) || null; }
function roleName(id) { return roleById(id)?.name || "•"; }
function userById(id) { return state.users.find(u => u.id === id) || null; }

// ========= KPIs
function renderKPIs() {
    const total = state.users.length;
    const active = state.users.filter(u => u.status === "active").length;
    const invited = state.users.filter(u => u.status === "invited").length;
    const roles = state.roles.length;

    $("#kpiUsers").textContent = total;
    $("#kpiActive").textContent = active;
    $("#kpiInvites").textContent = invited;
    $("#kpiRoles").textContent = roles;
}

// ========= Filters (users)
function renderRoleFilterOptions() {
    const sel = $("#uRole");
    const current = sel.value || ROLE_ALL;
    const selected = state.filters.role || current || ROLE_ALL;
    sel.replaceChildren();

    const enumOptions = getEnumOptions("roleFilter");
    enumOptions.forEach(opt => {
        sel.appendChild(buildOption(opt.code, opt.text, opt.code === selected));
    });

    state.roles
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .forEach(r => {
            sel.appendChild(buildOption(r.id, r.name, r.id === selected));
        });

    sel.value = selected;
}

function applyUserFilters(users) {
    const q = (state.filters.q || "").trim().toLowerCase();
    const status = state.filters.status;
    const role = state.filters.role;

    return users.filter(u => {
        if (status !== "all" && u.status !== status) return false;
        if (role !== "all" && !(u.roleIds || []).includes(role)) return false;

        if (!q) return true;
        const blob = [u.name, u.email, u.dept, (u.roleIds || []).map(roleName).join(" ")].join(" ").toLowerCase();
        return blob.includes(q);
    });
}

function statusTag(status) {
    if (status === "active") return `<span class="tag ok"><i class="bi bi-check2-circle"></i>Ativo</span>`;
    if (status === "invited") return `<span class="tag warn"><i class="bi bi-envelope"></i>Convidado</span>`;
    if (status === "disabled") return `<span class="tag bad"><i class="bi bi-slash-circle"></i>Desativado</span>`;
    return `<span class="tag"><i class="bi bi-dot"></i>${escapeHtml(status || "•")}</span>`;
}
function mfaTag(enabled) {
    return enabled
        ? `<span class="tag ok"><i class="bi bi-shield-lock"></i>On</span>`
        : `<span class="tag"><i class="bi bi-shield"></i>Off</span>`;
}

// ========= Users table
function renderUsers() {
    const filtered = applyUserFilters(state.users.slice().sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    $("#usersCount").textContent = filtered.length;

    $("#usersHint").textContent = filtered.length
        ? "Dica: clique na linha para ver detalhes no drawer."
        : "Nenhum usuário com os filtros atuais.";

    const tbody = $("#usersTbody");
    tbody.innerHTML = filtered.map(u => {
        const roles = (u.roleIds || []).map(id => `<span class="pill"><i class="bi bi-person-badge"></i>${escapeHtml(roleName(id))}</span>`).join(" ");
        const last = u.lastLoginAt ? fmtDate(u.lastLoginAt) : "•";

        return `
          <tr data-id="${u.id}" class="user-row" style="cursor:pointer;">
            <td>
              <div class="d-flex align-items-center gap-2">
                <div class="avatar">${escapeHtml(initials(u.name, "U"))}</div>
                <div class="lh-1">
                  <div class="fw-bold">${escapeHtml(u.name || "•")}</div>
                  <small class="text-muted">${escapeHtml(u.id.slice(0, 8))}</small>
                </div>
              </div>
            </td>
            <td class="mono">${escapeHtml(u.email || "•")}</td>
            <td>${escapeHtml(u.dept || "•")}</td>
            <td>${roles || "•"}</td>
            <td>${statusTag(u.status)}</td>
            <td>${mfaTag(!!u.mfaEnabled)}</td>
            <td>${escapeHtml(last)}</td>
            <td class="text-end actions">
              <button class="btn btn-ghost btn-sm" data-act="edit" title="Editar"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-ghost btn-sm" data-act="invite" title="Reenviar convite"><i class="bi bi-envelope"></i></button>
              <button class="btn btn-ghost btn-sm" data-act="reset" title="Reset senha"><i class="bi bi-key"></i></button>
              <button class="btn btn-ghost btn-sm" data-act="toggle" title="Ativar/Desativar"><i class="bi bi-toggle2-on"></i></button>
            </td>
          </tr>
        `;
    }).join("");

    // row click => drawer
    $$(".user-row", tbody).forEach(tr => {
        tr.addEventListener("click", (ev) => {
            const btn = ev.target.closest("button[data-act]");
            const id = tr.getAttribute("data-id");

            if (btn) {
                ev.preventDefault();
                ev.stopPropagation();
                const act = btn.getAttribute("data-act");
                if (act === "edit") openUserModal(id);
                if (act === "invite") { showToast("Convite", "Convite reenviado (demo)."); }
                if (act === "reset") { showToast("Senha", "Reset solicitado (demo)."); }
                if (act === "toggle") { toggleUserStatus(id); }
                return;
            }

            openUserDrawer(id);
        });
    });
}

// ========= Drawer
function openUserDrawer(userId) {
    state.selectedUserId = userId;
    const u = userById(userId);
    if (!u) return;

    $("#drawerAvatar").textContent = initials(u.name, "U");
    $("#drawerName").textContent = u.name || "•";
    $("#drawerEmail").textContent = u.email || "•";
    $("#drawerDept").textContent = u.dept || "•";
    $("#drawerCreated").textContent = fmtDate(u.createdAt);
    $("#drawerLastLogin").textContent = u.lastLoginAt ? fmtDate(u.lastLoginAt) : "•";
    $("#drawerRoles").textContent = (u.roleIds || []).map(roleName).join(", ") || "•";
    $("#drawerMfa").textContent = u.mfaEnabled ? "Habilitado" : "Desabilitado";

    const st = u.status;
    const tag = $("#drawerStatusTag");
    if (st === "active") { tag.className = "tag ok"; tag.innerHTML = `<i class="bi bi-check2-circle"></i>Ativo`; }
    else if (st === "invited") { tag.className = "tag warn"; tag.innerHTML = `<i class="bi bi-envelope"></i>Convidado`; }
    else if (st === "disabled") { tag.className = "tag bad"; tag.innerHTML = `<i class="bi bi-slash-circle"></i>Desativado`; }
    else { tag.className = "tag"; tag.innerHTML = `<i class="bi bi-dot"></i>${escapeHtml(st || "•")}`; }

    const oc = new bootstrap.Offcanvas($("#offcanvasUser"));
    oc.show();
}

function wireDrawerButtons() {
    $("#btnDrawerEdit").addEventListener("click", () => {
        if (!state.selectedUserId) return;
        openUserModal(state.selectedUserId);
    });
    $("#btnDrawerInvite").addEventListener("click", () => {
        if (!state.selectedUserId) return;
        showToast("Convite", "Convite reenviado (demo).");
    });
    $("#btnDrawerReset").addEventListener("click", () => {
        if (!state.selectedUserId) return;
        showToast("Senha", "Reset solicitado (demo).");
    });
    $("#btnDrawerToggle").addEventListener("click", () => {
        if (!state.selectedUserId) return;
        toggleUserStatus(state.selectedUserId, true);
    });
    $("#btnDrawerDelete").addEventListener("click", () => {
        if (!state.selectedUserId) return;
        const u = userById(state.selectedUserId);
        if (!u) return;
        const ok = confirm(`Excluir usuário "${u.name}"? (demo)`);
        if (!ok) return;
        state.users = state.users.filter(x => x.id !== u.id);
        saveUsers();
        renderKPIs();
        renderUsers();
        showToast("Usuário", "Excluí­do (demo).");
    });
}

// ========= User CRUD
function openUserModal(userId) {
    const modal = new bootstrap.Modal($("#modalUser"));
    const isEdit = !!userId;
    $("#userModalTitle").textContent = isEdit ? "Editar usuário" : "Novo usuário";

    const u = isEdit ? userById(userId) : null;

    $("#userId").value = u?.id || "";
    $("#userName").value = u?.name || "";
    $("#userEmail").value = u?.email || "";
    $("#userDept").value = u?.dept || "";
    $("#userStatus").value = u?.status || "active";
    $("#userMfa").value = (u?.mfaEnabled ? "true" : "false");

    renderUserRoleSelectors(u?.roleIds || []);
    modal.show();
}

function renderUserRoleSelectors(selectedIds) {
    const chips = $("#userRolesChips");
    const checks = $("#userRolesChecks");
    const set = new Set(selectedIds || []);

    chips.innerHTML = (Array.from(set).map(id => {
        const r = roleById(id);
        if (!r) return "";
        return `<span class="pill"><i class="bi bi-person-badge"></i>${escapeHtml(r.name)}</span>`;
    }).join(" ") || `<span class="text-muted small">Nenhum perfil selecionado.</span>`);

    checks.innerHTML = state.roles
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map(r => `
          <div class="col-12 col-md-6">
            <div class="form-check">
              <input class="form-check-input role-check" type="checkbox" id="role_${r.id}" value="${r.id}" ${set.has(r.id) ? "checked" : ""}>
              <label class="form-check-label" for="role_${r.id}">
                <span class="fw-bold">${escapeHtml(r.name)}</span>
                <small class="text-muted ms-1">${escapeHtml(r.desc || "")}</small>
              </label>
            </div>
          </div>
        `).join("");

    $$(".role-check", checks).forEach(cb => {
        cb.addEventListener("change", () => {
            const ids = $$(".role-check", checks).filter(x => x.checked).map(x => x.value);
            renderUserRoleSelectors(ids);
        });
    });
}

function saveUserFromModal() {
    const id = ($("#userId").value || "").trim();
    const name = ($("#userName").value || "").trim();
    const email = ($("#userEmail").value || "").trim();
    const dept = ($("#userDept").value || "").trim();
    const status = $("#userStatus").value;
    const mfaEnabled = $("#userMfa").value === "true";
    const roleIds = $$("#userRolesChecks .role-check").filter(x => x.checked).map(x => x.value);

    if (!name || !email) {
        showToast("Validação", "Informe Nome e Email.");
        return;
    }

    const now = new Date().toISOString();
    if (id) {
        const u = userById(id);
        if (!u) return;
        u.name = name; u.email = email; u.dept = dept; u.status = status; u.mfaEnabled = mfaEnabled; u.roleIds = roleIds;
        u.updatedAt = now;
        saveUsers();
        showToast("Usuário", "Atualizado com sucesso.");
    } else {
        const u = {
            id: uid(),
            name, email, dept,
            status,
            mfaEnabled,
            roleIds,
            createdAt: now,
            updatedAt: now,
            lastLoginAt: null
        };
        state.users.push(u);
        saveUsers();
        showToast("Usuário", "Criado com sucesso.");
    }

    renderKPIs();
    renderUsers();
    bootstrap.Modal.getInstance($("#modalUser")).hide();
}

function toggleUserStatus(userId, keepDrawerOpen = false) {
    const u = userById(userId);
    if (!u) return;
    if (u.status === "disabled") u.status = "active";
    else u.status = "disabled";
    u.updatedAt = new Date().toISOString();
    saveUsers();
    renderKPIs();
    renderUsers();
    showToast("Status", `Usuário agora está¡: ${u.status}.`);

    if (keepDrawerOpen) openUserDrawer(userId);
}

// ========= Roles UI
function renderRolesList() {
    const host = $("#rolesList");
    host.innerHTML = state.roles
        .slice()
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map(r => `
          <div class="role-item ${r.id === state.selectedRoleId ? "active" : ""}" data-id="${r.id}">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div class="d-flex align-items-center gap-2">
                <div class="iconbox"><i class="bi bi-shield-lock"></i></div>
                <div>
                  <div class="fw-bold">${escapeHtml(r.name)}</div>
                  <div class="text-muted small">${escapeHtml(r.desc || "•")}</div>
                </div>
              </div>
              ${r.builtIn ? `<span class="pill"><i class="bi bi-stars"></i>padrão</span>` : `<span class="pill"><i class="bi bi-person-badge"></i>custom</span>`}
            </div>
          </div>
        `).join("");

    $$(".role-item", host).forEach(el => {
        el.addEventListener("click", () => {
            state.selectedRoleId = el.getAttribute("data-id");
            renderRolesList();
            renderRoleEditor();
        });
    });
}

function renderRoleEditor() {
    const r = roleById(state.selectedRoleId);
    if (!r) {
        $("#roleEditorTitle").textContent = "•";
        $("#roleEditorDesc").textContent = "Selecione um perfil ao lado.";
        $("#roleName").value = "";
        $("#roleDesc").value = "";
        $("#permTbody").innerHTML = "";
        return;
    }

    $("#roleEditorTitle").textContent = `Editor de perfil: ${r.name}`;
    $("#roleEditorDesc").textContent = r.desc || "•";
    $("#roleName").value = r.name || "";
    $("#roleDesc").value = r.desc || "";

    const tbody = $("#permTbody");
    tbody.innerHTML = MODULES.map(m => {
        const perms = r.perms?.[m.key] || { view: false, create: false, edit: false, delete: false, export: false, admin: false };
        return `
          <tr>
            <td class="fw-bold">${escapeHtml(m.label)}</td>
            ${ACTIONS.map(a => {
            const checked = !!perms[a.key];
            const id = `p_${r.id}_${m.key}_${a.key}`;
            return `
                <td>
                  <div class="form-check m-0">
                    <input class="form-check-input perm-cb" type="checkbox" id="${id}"
                           data-role="${r.id}" data-module="${m.key}" data-action="${a.key}"
                           ${checked ? "checked" : ""}>
                  </div>
                </td>
              `;
        }).join("")}
          </tr>
        `;
    }).join("");

    // behavior: if admin checked => turn on all actions for that module
    $$(".perm-cb", tbody).forEach(cb => {
        cb.addEventListener("change", () => {
            const roleId = cb.dataset.role;
            const mod = cb.dataset.module;
            const act = cb.dataset.action;

            const role = roleById(roleId);
            if (!role) return;

            role.perms = role.perms || {};
            role.perms[mod] = role.perms[mod] || { view: false, create: false, edit: false, delete: false, export: false, admin: false };
            role.perms[mod][act] = cb.checked;

            if (act === "admin" && cb.checked) {
                role.perms[mod] = { view: true, create: true, edit: true, delete: true, export: true, admin: true };
                // re-render quickly only this row's checkboxes
                $$(".perm-cb", tbody).forEach(x => {
                    if (x.dataset.role === roleId && x.dataset.module === mod) x.checked = true;
                });
            }
            if (act === "admin" && !cb.checked) {
                role.perms[mod].admin = false;
            }

            role.updatedAt = new Date().toISOString();
        });
    });
}

function saveRoleEditor() {
    const r = roleById(state.selectedRoleId);
    if (!r) return;

    const name = ($("#roleName").value || "").trim();
    const desc = ($("#roleDesc").value || "").trim();
    if (!name) {
        showToast("Validação", "Informe o nome do perfil.");
        return;
    }

    r.name = name;
    r.desc = desc;
    r.updatedAt = new Date().toISOString();

    saveRoles();
    renderRolesList();
    renderRoleFilterOptions();
    renderUsers(); // para atualizar nomes de perfis nas linhas
    showToast("Perfil", "Permissões salvas com sucesso.");
}

function cloneSelectedRole() {
    const r = roleById(state.selectedRoleId);
    if (!r) return;
    const nr = {
        id: uid(),
        name: r.name + " (CÃ³pia)",
        desc: r.desc || "",
        perms: JSON.parse(JSON.stringify(r.perms || emptyPerms())),
        builtIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    state.roles.push(nr);
    state.selectedRoleId = nr.id;
    saveRoles();
    renderKPIs();
    renderRolesList();
    renderRoleEditor();
    renderRoleFilterOptions();
    showToast("Perfil", "Clonado com sucesso.");
}

function deleteSelectedRole() {
    const r = roleById(state.selectedRoleId);
    if (!r) return;

    if (r.builtIn) {
        showToast("Perfil", "Perfis padrão não podem ser excluÃ­dos (demo).");
        return;
    }

    const usedBy = state.users.filter(u => (u.roleIds || []).includes(r.id)).length;
    const ok = confirm(`Excluir perfil "${r.name}"? Usuários afetados: ${usedBy}. (demo)`);
    if (!ok) return;

    // remove role from users
    state.users.forEach(u => {
        u.roleIds = (u.roleIds || []).filter(id => id !== r.id);
    });

    state.roles = state.roles.filter(x => x.id !== r.id);
    state.selectedRoleId = state.roles[0]?.id || null;

    saveRoles();
    saveUsers();
    renderKPIs();
    renderUsers();
    renderRoleFilterOptions();
    renderRolesList();
    renderRoleEditor();
    showToast("Perfil", "ExcluÃ­do com sucesso.");
}

// ========= Create role modal
function openRoleModal() {
    $("#newRoleName").value = "";
    $("#newRoleDesc").value = "";
    new bootstrap.Modal($("#modalRole")).show();
}
function createRoleFromModal() {
    const name = ($("#newRoleName").value || "").trim();
    const desc = ($("#newRoleDesc").value || "").trim();
    if (!name) {
        showToast("Validação", "Informe o nome do perfil.");
        return;
    }
    const r = {
        id: uid(),
        name,
        desc,
        perms: emptyPerms(),
        builtIn: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    // perm mÃ­nima: dashboard.view
    r.perms.dashboard.view = true;

    state.roles.push(r);
    state.selectedRoleId = r.id;

    saveRoles();
    renderKPIs();
    renderRolesList();
    renderRoleEditor();
    renderRoleFilterOptions();
    renderUsers();
    bootstrap.Modal.getInstance($("#modalRole")).hide();
    showToast("Perfil", "Criado com sucesso. Ajuste as permissões ao lado.");
}

// ========= CSV export (usuários)
function exportUsersCsv() {
    const users = applyUserFilters(state.users);
    const headers = ["Nome", "Email", "Departamento", "Status", "MFA", "Perfis", "Ãšltimo login", "Criado em"];
    const strip = (s) => String(s ?? "").replace(/\s+/g, " ").trim().replaceAll('"', '""');
    const csv = [
        headers.map(h => `"${strip(h)}"`).join(";"),
        ...users.map(u => {
            const row = [
                u.name,
                u.email,
                u.dept,
                u.status,
                u.mfaEnabled ? "on" : "off",
                (u.roleIds || []).map(roleName).join(", "),
                u.lastLoginAt ? fmtDate(u.lastLoginAt) : "",
                u.createdAt ? fmtDate(u.createdAt) : ""
            ];
            return row.map(x => `"${strip(x)}"`).join(";");
        })
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "usuarios_perfis.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// ========= Wire UI
function initLogo() {
    $("#logoDesktop").src = LOGO_DATA_URI;
    $("#logoMobile").src = LOGO_DATA_URI;
}
function wireClock() {
    const now = new Date();
    const buildEl = $("#buildId");
    if(buildEl){
        buildEl.textContent = "build: demo-" + String(now.getFullYear()).slice(2) + "-" + String(now.getMonth() + 1).padStart(2, "0");
    }

    const label = $("#nowLabel");
    if(!label) return;
    const tick = () => {
        const d = new Date();
        label.textContent = d.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    };
    tick();
    setInterval(tick, 1000 * 15);
}

function wireTopButtons() {
    $("#btnSeedReset").addEventListener("click", () => {
        const ok = confirm("Restaurar demo? Isso recria roles/usuários iniciais.");
        if (!ok) return;
        localStorage.removeItem(USERS_KEY);
        localStorage.removeItem(ROLES_KEY);
        seedIfEmpty();
        loadAll();
        renderAll();
        showToast("Demo", "Dados restaurados.");
    });

    $("#btnExportUsers").addEventListener("click", exportUsersCsv);

    // botão primário muda conforme aba
    $("#btnPrimaryAction").addEventListener("click", () => {
        const usersActive = $("#tab-users").classList.contains("active");
        if (usersActive) openUserModal(null);
        else openRoleModal();
    });

    $("#btnNewUser").addEventListener("click", () => openUserModal(null));
    $("#btnNewRole").addEventListener("click", () => openRoleModal());
    $("#btnAuditMock").addEventListener("click", () => showToast("Auditoria", "Mock: em produção, listar ações (login, alteração de role, exportações)."));
}

function wireUsersFilters() {
    $("#uSearch").addEventListener("input", () => {
        state.filters.q = $("#uSearch").value || "";
        renderUsers();
    });
    $("#uStatus").addEventListener("change", () => {
        state.filters.status = $("#uStatus").value;
        renderUsers();
    });
    $("#uRole").addEventListener("change", () => {
        state.filters.role = $("#uRole").value;
        renderUsers();
    });
}

function wireUserModal() {
    $("#btnUserSave").addEventListener("click", saveUserFromModal);
}

function wireRolesButtons() {
    $("#btnRoleSave").addEventListener("click", saveRoleEditor);
    $("#btnRoleClone").addEventListener("click", cloneSelectedRole);
    $("#btnRoleDelete").addEventListener("click", deleteSelectedRole);
    $("#btnCreateRole").addEventListener("click", createRoleFromModal);
}

function wireTabPrimaryAction() {
    const onTabShown = (ev) => {
        const id = ev.target?.id;
        if (id === "tab-users") {
            $("#btnPrimaryAction").innerHTML = `<i class="bi bi-person-plus"></i><span class="d-none d-sm-inline ms-1">Novo usuário</span>`;
        } else {
            $("#btnPrimaryAction").innerHTML = `<i class="bi bi-plus-circle"></i><span class="d-none d-sm-inline ms-1">Novo perfil</span>`;
        }
    };
    $("#tab-users").addEventListener("shown.bs.tab", onTabShown);
    $("#tab-roles").addEventListener("shown.bs.tab", onTabShown);
}

// ========= Render all
function renderAll() {
    renderKPIs();
    renderRoleFilterOptions();
    renderUsers();
    renderRolesList();
    renderRoleEditor();
}

// ========= Init
(function init() {
    initLogo();
    wireClock();

    seedIfEmpty();
    loadAll();

    wireTopButtons();
    wireUsersFilters();
    wireUserModal();
    wireRolesButtons();
    wireDrawerButtons();
    wireTabPrimaryAction();

    renderAll();
})();

