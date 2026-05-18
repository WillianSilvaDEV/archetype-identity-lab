/* =========================================================================
   Archetype Identity Lab — JavaScript compartilhado
   Sem frameworks, sem bundler. Apenas vanilla JS moderno (ES2020+).
   ========================================================================= */

// -------------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE — preencher antes de subir o site
// Pegue esses valores no painel do Supabase: Settings → API
// A chave anon (publishable) é pública por design — não tem problema
// ela ficar visível no JS, pois as policies RLS protegem o banco.
// -------------------------------------------------------------------------
const SUPABASE_URL = "https://SEU_PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "eyJSUA_CHAVE_ANON_AQUI";

// -------------------------------------------------------------------------
// REVEAL: fade-up via IntersectionObserver
// -------------------------------------------------------------------------
(function initReveal() {
  const elements = document.querySelectorAll(".reveal");
  if (!elements.length) return;

  const supportsIO = "IntersectionObserver" in window;
  if (!supportsIO) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.dataset.delay;
          if (delay) entry.target.style.transitionDelay = delay + "ms";
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  elements.forEach((el) => io.observe(el));
})();

// -------------------------------------------------------------------------
// STICKY CTA: aparece após 700px de rolagem
// -------------------------------------------------------------------------
(function initStickyCTA() {
  const el = document.querySelector(".sticky-cta");
  if (!el) return;

  const button = el.querySelector("button");
  if (button) {
    button.addEventListener("click", () => {
      const target =
        document.getElementById("formulario-final") ||
        document.getElementById("formulario-hero");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  const onScroll = () => {
    if (window.scrollY > 700) el.classList.add("is-visible");
    else el.classList.remove("is-visible");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

// -------------------------------------------------------------------------
// FORM: validação + envio direto pro Supabase via REST
// -------------------------------------------------------------------------
function maskWhatsapp(value) {
  const d = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return "(" + d.slice(0, 2) + ") " + d.slice(2);
  return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
}

function showError(input, message) {
  input.setAttribute("aria-invalid", "true");
  const wrap = input.closest(".form-row");
  if (!wrap) return;
  let err = wrap.querySelector(".error-msg");
  if (!err) {
    err = document.createElement("p");
    err.className = "error-msg";
    wrap.appendChild(err);
  }
  err.textContent = message;
}

function clearError(input) {
  input.removeAttribute("aria-invalid");
  const wrap = input.closest(".form-row");
  if (!wrap) return;
  const err = wrap.querySelector(".error-msg");
  if (err) err.remove();
}

function validateForm(form) {
  let valid = true;
  const fields = {
    nome: form.querySelector('[name="nome"]'),
    whatsapp: form.querySelector('[name="whatsapp"]'),
    email: form.querySelector('[name="email"]'),
    colaboradores: form.querySelector('[name="colaboradores"]'),
    optin: form.querySelector('[name="optin_whatsapp"]'),
  };

  Object.values(fields).forEach((el) => el && clearError(el));

  const nome = fields.nome.value.trim();
  if (nome.length < 2 || nome.length > 100) {
    showError(fields.nome, "Informe seu nome");
    valid = false;
  }

  const whatsapp = fields.whatsapp.value.trim();
  if (whatsapp.length < 8 || whatsapp.length > 25) {
    showError(fields.whatsapp, "WhatsApp inválido");
    valid = false;
  } else if (!/^[0-9+\s()\-]+$/.test(whatsapp)) {
    showError(fields.whatsapp, "Use apenas números");
    valid = false;
  }

  const email = fields.email.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    showError(fields.email, "E-mail inválido");
    valid = false;
  }

  const colab = fields.colaboradores.value;
  const validColabs = [
    "ate_5", "5_10", "10_20", "20_50", "50_100", "acima_100",
  ];
  if (!validColabs.includes(colab)) {
    showError(fields.colaboradores, "Selecione o tamanho da empresa");
    valid = false;
  }

  if (!fields.optin.checked) {
    showError(fields.optin, "É necessário autorizar para continuar");
    valid = false;
  }

  return valid ? { nome, whatsapp, email, colaboradores: colab } : null;
}

async function submitToSupabase(data) {
  const res = await fetch(SUPABASE_URL + "/rest/v1/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + SUPABASE_ANON_KEY,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      nome: data.nome,
      whatsapp: data.whatsapp,
      email: data.email.toLowerCase(),
      colaboradores: data.colaboradores,
      optin_whatsapp: true,
      optin_at: new Date().toISOString(),
      origem: data.origem || "final",
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error("Supabase " + res.status + ": " + text);
  }
}

function showToast(message, type) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.className = "toast toast-" + (type || "error");
  t.textContent = message;
  Object.assign(t.style, {
    position: "fixed",
    top: "1rem",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: "100",
    padding: "0.875rem 1.25rem",
    borderRadius: "0.375rem",
    fontSize: "14px",
    fontWeight: "500",
    boxShadow: "0 12px 32px -8px rgba(0,0,0,0.6)",
    maxWidth: "92vw",
  });
  if (type === "error") {
    t.style.background = "#1a0808";
    t.style.color = "#fca5a5";
    t.style.border = "1px solid rgba(239,68,68,0.4)";
  } else {
    t.style.background = "#0a1a0a";
    t.style.color = "#86efac";
    t.style.border = "1px solid rgba(34,197,94,0.4)";
  }
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

(function initForms() {
  document.querySelectorAll('form[data-form="lead"]').forEach((form) => {
    // máscara whatsapp em tempo real
    const wpp = form.querySelector('[name="whatsapp"]');
    if (wpp) {
      wpp.addEventListener("input", (e) => {
        e.target.value = maskWhatsapp(e.target.value);
      });
    }

    // muda cor do select quando seleciona algo
    const sel = form.querySelector('[name="colaboradores"]');
    if (sel) {
      const update = () => sel.classList.toggle("has-value", !!sel.value);
      sel.addEventListener("change", update);
      update();
    }

    // limpa erros ao digitar
    form.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", () => clearError(input));
      input.addEventListener("change", () => clearError(input));
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = validateForm(form);
      if (!data) return;

      const btn = form.querySelector('button[type="submit"]');
      const originalLabel = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "ENVIANDO...";
      }

      try {
        data.origem = form.dataset.origem || "final";
        await submitToSupabase(data);
        window.location.href = "obrigado.html";
      } catch (err) {
        console.error(err);
        showToast("Não foi possível registrar agora. Tente novamente.", "error");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalLabel;
        }
      }
    });
  });
})();

// -------------------------------------------------------------------------
// FOOTER: atualiza o ano atual automaticamente
// -------------------------------------------------------------------------
(function initFooterYear() {
  const year = new Date().getFullYear();
  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = year;
  });
})();
