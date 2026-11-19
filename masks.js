/* ==========================================================
   GUIA DE BAIRRO — Máscaras e Validações de Entrada
   Telefone/WhatsApp, E-mail e Instagram (@usuario)
   ========================================================== */
window.GBMasks = (function () {
  /**
   * Formata telefone/WhatsApp brasileiro em tempo real:
   * (XX) XXXX-XXXX ou (XX) XXXXX-XXXX.
   * Suporta números internacionais iniciados com "+" (exceto +55, convertido para padrão BR).
   */
  function formatPhone(raw) {
    const str = String(raw || "");
    const trimmed = str.trim();
    if (!trimmed) return "";

    // Permite digitação inicial de código internacional "+"
    if (trimmed === "+") return "+";

    let digits = trimmed.replace(/\D/g, "");
    if (!digits) return "";

    // Se vier com DDI internacional diferente de +55, preserva formato internacional limpo
    if (trimmed.startsWith("+") && !trimmed.startsWith("+55")) {
      return "+" + digits.slice(0, 15);
    }

    // Se começar com +55 ou 55 seguido de DDD+número (12 ou 13 dígitos), extrai DDD+número BR
    if (trimmed.startsWith("+55")) {
      digits = digits.slice(2);
      if (!digits) return "+55 ";
    } else if (digits.startsWith("55") && digits.length >= 12) {
      digits = digits.slice(2);
    }

    digits = digits.slice(0, 11);

    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  function isValidPhone(raw) {
    const str = String(raw || "").trim();
    if (!str) return true; // opcional quando não informado
    const digits = str.replace(/\D/g, "");
    if (str.startsWith("+") && !str.startsWith("+55")) {
      return digits.length >= 8 && digits.length <= 15;
    }
    const localDigits = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
    return localDigits.length >= 10 && localDigits.length <= 11;
  }

  /**
   * Formata usuário do Instagram no padrão "@usuario".
   * Também extrai o handle automaticamente caso o usuário cole uma URL do Instagram.
   */
  function formatInstagram(raw, { isBlur = false } = {}) {
    let str = String(raw || "").trim();
    if (!str) return "";

    // Extrai usuário se colarem URL completa (ex: https://www.instagram.com/loja.bairro/?hl=pt-br)
    const urlMatch = str.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9._]+)/i);
    if (urlMatch && urlMatch[1]) {
      str = urlMatch[1];
    }

    // Remove @ extras, espaços e caracteres inválidos para handle do Instagram
    const handle = str.replace(/@/g, "").replace(/[^a-zA-Z0-9._]/g, "").slice(0, 30);

    if (!handle) {
      return !isBlur && str.includes("@") ? "@" : "";
    }
    return `@${handle}`;
  }

  function isValidInstagram(raw) {
    const str = String(raw || "").trim();
    if (!str) return true;
    return /^@[a-zA-Z0-9._]{1,30}$/.test(str);
  }

  /**
   * Normaliza e-mail durante a digitação (minúsculas, sem espaços e caracteres inválidos).
   */
  function formatEmail(raw) {
    let s = String(raw || "").replace(/\s+/g, "").toLowerCase();
    // Garante no máximo um "@" e apenas caracteres válidos de e-mail
    s = s.replace(/[^a-z0-9.!#$%&'*+/=?^_`{|}~@-]/g, "");
    const firstAt = s.indexOf("@");
    if (firstAt !== -1) {
      s = s.slice(0, firstAt + 1) + s.slice(firstAt + 1).replace(/@/g, "");
    }
    return s;
  }

  function isValidEmail(raw) {
    const s = String(raw || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  }

  function updateEmailFeedback(el) {
    const hint = el.dataset.hintTarget ? document.querySelector(el.dataset.hintTarget) : document.getElementById("auth-email-status");
    const val = el.value.trim();
    if (!val) {
      el.classList.remove("is-valid", "is-invalid");
      if (hint) { hint.textContent = ""; hint.dataset.kind = ""; }
      return;
    }
    const ok = isValidEmail(val);
    el.classList.toggle("is-valid", ok);
    el.classList.toggle("is-invalid", !ok);
    if (hint) {
      hint.textContent = ok ? "✓ E-mail válido" : "Digite no formato nome@dominio.com";
      hint.dataset.kind = ok ? "ok" : "error";
    }
  }

  function applyMaskToElement(el, isBlur = false) {
    if (!el || el.disabled || el.readOnly) return;
    const type = el.dataset.mask;
    if (!type) return;

    const prev = el.value;
    let next = prev;

    if (type === "phone") {
      // Ao apagar tudo até sobrar só "(", limpa o campo para não travar o backspace
      if (!isBlur && prev === "(") {
        next = "";
      } else {
        next = formatPhone(prev);
      }
    } else if (type === "instagram") {
      next = formatInstagram(prev, { isBlur });
    } else if (type === "email") {
      next = formatEmail(prev);
    }

    if (next !== prev) {
      const atEnd = document.activeElement === el && el.selectionStart === prev.length;
      el.value = next;
      if (atEnd && typeof el.setSelectionRange === "function") {
        try { el.setSelectionRange(next.length, next.length); } catch (e) { }
      }
    }

    if (type === "email") {
      updateEmailFeedback(el);
    } else if (type === "phone") {
      const val = el.value.trim();
      if (!val) el.classList.remove("is-invalid");
      else if (isBlur) el.classList.toggle("is-invalid", !isValidPhone(val));
    }
  }

  // Delegação global funciona inclusive em modais e abas criadas dinamicamente
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (el && el.dataset && el.dataset.mask) {
      applyMaskToElement(el, false);
    }
  });

  document.addEventListener("blur", (e) => {
    const el = e.target;
    if (el && el.dataset && el.dataset.mask) {
      applyMaskToElement(el, true);
    }
  }, true);

  return {
    formatPhone,
    isValidPhone,
    formatInstagram,
    isValidInstagram,
    formatEmail,
    isValidEmail,
    applyMaskToElement
  };
})();
