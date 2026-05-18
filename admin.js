/* =========================================================================
   ADMIN — autenticação, listagem, ordenação, busca, exportação.
   Usa Supabase Auth com email/senha. JWT armazenado em sessionStorage
   (limpa quando fechar a aba — mais seguro que localStorage).
   ========================================================================= */

const SUPABASE_URL = "https://lbtsfqynrtpyhtiyjrbq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxidHNmcXlucnRweWh0aXlqcmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMTc2NzQsImV4cCI6MjA5MzY5MzY3NH0.L9fyPTnAgkY9DJcnl23d7505zEU7zI69ezr4nOWsUSg";

// --------------------------------------------------------------------------
// ESTADO
// --------------------------------------------------------------------------
let allLeads = [];
let currentSort = { field: "created_at", asc: false };
let searchTerm = "";

const SESSION_KEY = "admin_token_v1";

// --------------------------------------------------------------------------
// AUTH
// --------------------------------------------------------------------------
async function login(email, password) {
  const res = await fetch(SUPABASE_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error_description || err.msg || "Credenciais inválidas");
  }
  const data = await res.json();
  sessionStorage.setItem(SESSION_KEY, data.access_token);
  return data.access_token;
}

function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

function getToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

// --------------------------------------------------------------------------
// FETCH
// --------------------------------------------------------------------------
async function fetchLeads(token) {
  const res = await fetch(
    SUPABASE_URL + "/rest/v1/leads?select=*&order=created_at.desc",
    {
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + token,
      },
    }
  );
  if (res.status === 401) {
    sessionStorage.removeItem(SESSION_KEY);
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    throw new Error("Falha ao carregar leads (HTTP " + res.status + ")");
  }
  return res.json();
}

// --------------------------------------------------------------------------
// RENDER
// --------------------------------------------------------------------------
const COLAB_LABELS = {
  ate_5: "Até 5",
  "5_10": "5 a 10",
  "10_20": "10 a 20",
  "20_50": "20 a 50",
  "50_100": "50 a 100",
  acima_100: "Acima de 100",
};

const ORIGEM_LABELS = {
  hero: "Hero",
  final: "Final",
};

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHTML(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function digitsOnly(s) {
  return String(s || "").replace(/\D/g, "");
}

function renderTable() {
  const tbody = document.getElementById("leads-body");
  const empty = document.getElementById("empty-state");

  const filtered = filterLeads(allLeads, searchTerm);
  const sorted = sortLeads(filtered, currentSort);

  document.getElementById("lead-count").textContent = sorted.length;

  if (sorted.length === 0) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  tbody.innerHTML = sorted
    .map((lead) => {
      const wppDigits = digitsOnly(lead.whatsapp);
      const wppLink = wppDigits
        ? `https://wa.me/${wppDigits.startsWith("55") ? wppDigits : "55" + wppDigits}`
        : null;
      const colab = COLAB_LABELS[lead.colaboradores] || lead.colaboradores || "—";
      const origem = ORIGEM_LABELS[lead.origem] || lead.origem || "—";
      const optinBadge = lead.optin_whatsapp
        ? `<span class="badge optin-yes">Sim</span>`
        : `<span class="badge optin-no">Não</span>`;
      return `
        <tr>
          <td>${escapeHTML(lead.nome)}</td>
          <td>${wppLink
            ? `<a href="${wppLink}" target="_blank" rel="noopener">${escapeHTML(lead.whatsapp)}</a>`
            : escapeHTML(lead.whatsapp)}</td>
          <td><a href="mailto:${escapeHTML(lead.email)}">${escapeHTML(lead.email)}</a></td>
          <td>${escapeHTML(colab)}</td>
          <td>${escapeHTML(origem)}</td>
          <td>${optinBadge}<div class="muted">${formatDate(lead.optin_at)}</div></td>
          <td>${formatDate(lead.created_at)}</td>
        </tr>
      `;
    })
    .join("");
}

// --------------------------------------------------------------------------
// SORT + FILTER
// --------------------------------------------------------------------------
function sortLeads(leads, sort) {
  const copy = leads.slice();
  copy.sort((a, b) => {
    const va = a[sort.field];
    const vb = b[sort.field];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const r = String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
    return sort.asc ? r : -r;
  });
  return copy;
}

function filterLeads(leads, term) {
  if (!term) return leads;
  const t = term.toLowerCase().trim();
  return leads.filter((lead) => {
    return [lead.nome, lead.whatsapp, lead.email, lead.colaboradores, lead.origem]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(t));
  });
}

function updateSortIndicators() {
  document.querySelectorAll(".admin-table thead th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.sort === currentSort.field) {
      th.classList.add(currentSort.asc ? "sort-asc" : "sort-desc");
    }
  });
}

// --------------------------------------------------------------------------
// EXPORT
// --------------------------------------------------------------------------
function toRows(leads) {
  const headers = ["nome", "whatsapp", "email", "colaboradores", "origem",
                   "optin_whatsapp", "optin_at", "created_at"];
  const rows = [headers];
  leads.forEach((lead) => {
    rows.push(
      headers.map((h) => {
        const v = lead[h];
        if (h === "optin_whatsapp") return v ? "Sim" : "Não";
        if (h === "optin_at" || h === "created_at") return formatDate(v);
        if (h === "colaboradores") return COLAB_LABELS[v] || v || "";
        return v == null ? "" : String(v);
      })
    );
  });
  return rows;
}

function rowsToCSV(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell || "");
          // RFC 4180: aspas e vírgulas precisam ser escapadas
          if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        })
        .join(",")
    )
    .join("\n");
}

function rowsToTSV(rows) {
  return rows
    .map((row) =>
      row.map((cell) => String(cell || "").replace(/[\t\n\r]/g, " ")).join("\t")
    )
    .join("\n");
}

function downloadCSV() {
  const filtered = filterLeads(allLeads, searchTerm);
  const sorted = sortLeads(filtered, currentSort);
  const rows = toRows(sorted);
  const csv = "\uFEFF" + rowsToCSV(rows); // BOM para acentos abrirem certo no Excel BR
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leads-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("CSV exportado");
}

async function copyExcel() {
  const filtered = filterLeads(allLeads, searchTerm);
  const sorted = sortLeads(filtered, currentSort);
  const rows = toRows(sorted);
  const tsv = rowsToTSV(rows);
  try {
    await navigator.clipboard.writeText(tsv);
    showToast(`${sorted.length} lead(s) copiados — cole no Excel`);
  } catch (e) {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = tsv;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    showToast(`${sorted.length} lead(s) copiados — cole no Excel`);
  }
}

// --------------------------------------------------------------------------
// UI / TOAST
// --------------------------------------------------------------------------
function showLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("app-screen").classList.add("hidden");
}

function showApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
}

function showToast(message, type) {
  const t = document.getElementById("toast");
  t.textContent = message;
  if (type === "error") {
    t.style.background = "#1a0808";
    t.style.color = "#fca5a5";
    t.style.borderColor = "rgba(239,68,68,0.4)";
  } else {
    t.style.background = "#0a1a0a";
    t.style.color = "#86efac";
    t.style.borderColor = "rgba(34,197,94,0.4)";
  }
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 2400);
}

async function loadLeads() {
  try {
    allLeads = await fetchLeads(getToken());
    renderTable();
    updateSortIndicators();
  } catch (err) {
    if (err.message && err.message.indexOf("Sessão") !== -1) {
      showLogin();
      const errEl = document.getElementById("login-error");
      if (errEl) errEl.textContent = err.message;
    } else {
      showToast(err.message || "Erro ao buscar leads", "error");
    }
  }
}

// --------------------------------------------------------------------------
// INIT
// --------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {

  // Login form
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = document.getElementById("login-error");
    errEl.textContent = "";
    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;
    if (!email || !password) {
      errEl.textContent = "Preencha e-mail e senha.";
      return;
    }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "ENTRANDO...";
    try {
      await login(email, password);
      showApp();
      await loadLeads();
    } catch (err) {
      errEl.textContent = err.message || "Erro ao autenticar.";
    } finally {
      btn.disabled = false;
      btn.textContent = "ENTRAR";
    }
  });

  // Header buttons
  document.getElementById("btn-logout").addEventListener("click", logout);
  document.getElementById("btn-refresh").addEventListener("click", loadLeads);
  document.getElementById("btn-export").addEventListener("click", downloadCSV);
  document.getElementById("btn-copy").addEventListener("click", copyExcel);

  // Search
  const search = document.getElementById("search");
  let debounceT;
  search.addEventListener("input", () => {
    clearTimeout(debounceT);
    debounceT = setTimeout(() => {
      searchTerm = search.value;
      renderTable();
    }, 150);
  });

  // Sort
  document.querySelectorAll(".admin-table thead th").forEach((th) => {
    th.addEventListener("click", () => {
      const field = th.dataset.sort;
      if (!field) return;
      if (currentSort.field === field) {
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort.field = field;
        currentSort.asc = false;
      }
      updateSortIndicators();
      renderTable();
    });
  });

  // Initial state: try resume session
  const token = getToken();
  if (token) {
    showApp();
    loadLeads();
  } else {
    showLogin();
  }
});
