/* Autenticação e cadastro (Supabase Auth) */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const msg = (t) => (typeof toast === "function" ? toast(t) : alert(t));

  if (!window.supabase || !window.GB_CONFIG) {
    console.warn("Supabase não carregado — autenticação desativada.");
    return;
  }
  const sb = window.supabase.createClient(GB_CONFIG.SUPABASE_URL, GB_CONFIG.SUPABASE_ANON_KEY);
  window.GBSupabase = sb;
  window.GBAuth = { user: null, profile: null };

  let cepOk = null;      // último resultado válido do CEP
  let cepKey = "";       // "pais|cep" validado
  let mode = "login";    // "login" | "signup"

  /* ── Abrir / fechar ────────────────────────────────────── */
  function open(m) {
    setMode(m || "login");
    $("#auth-overlay").classList.add("open");
    document.body.classList.add("auth-open");
    setTimeout(() => ($("#auth-email") || {}).focus?.(), 60);
  }
  function close() {
    $("#auth-overlay").classList.remove("open");
    document.body.classList.remove("auth-open");
    $("#auth-error").textContent = "";
  }

  function setMode(m) {
    mode = m;
    $("#auth-overlay").dataset.mode = m;
    $("#auth-title").textContent = m === "login" ? "Entrar" : "Criar conta";
    $("#auth-submit").textContent = m === "login" ? "Entrar" : "Criar conta";
    $("#auth-error").textContent = "";
    $$tabs().forEach(t => t.classList.toggle("active", t.dataset.mode === m));
  }
  const $$tabs = () => [...document.querySelectorAll(".auth-tab")];

  /* ── CEP ───────────────────────────────────────────────── */
  function setCepStatus(text, kind) {
    const el = $("#auth-cep-status");
    el.textContent = text || "";
    el.dataset.kind = kind || "";
  }

  async function checkCep() {
    const pais = $("#auth-pais").value;
    const cep = $("#auth-cep").value;
    if (!cep.trim()) { cepOk = null; cepKey = ""; setCepStatus(""); return null; }
    setCepStatus("Validando…", "loading");
    const r = await GBCep.validar(pais, cep);
    if (!r.ok) { cepOk = null; cepKey = ""; setCepStatus(r.erro, "error"); return null; }
    cepOk = r;
    cepKey = pais + "|" + cep;
    const loc = [r.bairro, r.cidade, r.uf].filter(Boolean).join(" · ");
    setCepStatus("✓ " + (loc || "CEP válido"), "ok");
    return r;
  }

  /* ── WhatsApp / consentimento ──────────────────────────── */
  function syncConsent() {
    const has = $("#auth-whatsapp").value.trim().length > 0;
    const chk = $("#auth-consent");
    chk.disabled = !has;
    if (!has) chk.checked = false;
  }

  /* ── Submit ────────────────────────────────────────────── */
  async function onSubmit(e) {
    e.preventDefault();
    const err = $("#auth-error");
    err.textContent = "";
    const btn = $("#auth-submit");
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    btn.disabled = true;

    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        close();
        msg("Bem-vindo de volta!");
        return;
      }

      /* Cadastro */
      const tipo = (document.querySelector('input[name="auth-tipo"]:checked') || {}).value;
      const nome = $("#auth-nome").value.trim();
      const whatsapp = $("#auth-whatsapp").value.replace(/[^\d+]/g, "");
      const consent = $("#auth-consent").checked;

      if (!tipo) throw new Error("Escolha o tipo de conta.");
      if (nome.length < 2) throw new Error("Informe seu nome.");
      if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
      if (whatsapp && !consent) {
        throw new Error("Marque o consentimento do WhatsApp ou apague o número.");
      }

      const pais = $("#auth-pais").value;
      const key = pais + "|" + $("#auth-cep").value;
      let cep = cepKey === key ? cepOk : await checkCep();
      if (!cep) throw new Error("Informe um CEP válido para continuar.");

      const { data, error } = await sb.auth.signUp({
        email, password,
        options: {
          data: {
            tipo, nome,
            pais: cep.pais, cep: cep.cep,
            cidade: cep.cidade, uf: cep.uf, bairro: cep.bairro,
            whatsapp: whatsapp && consent ? whatsapp : "",
            whatsapp_consent: !!(whatsapp && consent)
          }
        }
      });
      if (error) throw error;
      close();
      msg(data.session
        ? "Conta criada! Você já está logado."
        : "Conta criada! Confirme seu e-mail para entrar.");
    } catch (ex) {
      err.textContent = traduz(ex.message || String(ex));
    } finally {
      btn.disabled = false;
    }
  }

  function traduz(m) {
    const map = [
      [/Invalid login credentials/i, "E-mail ou senha incorretos."],
      [/User already registered/i, "Esse e-mail já está cadastrado."],
      [/Email not confirmed/i, "Confirme seu e-mail antes de entrar."],
      [/valid email/i, "E-mail inválido."],
      [/rate limit/i, "Muitas tentativas. Aguarde um pouco."],
      [/Password should be/i, "Senha muito fraca (mínimo 8 caracteres)."]
    ];
    for (const [re, t] of map) if (re.test(m)) return t;
    return m;
  }

  /* ── Sessão / perfil ───────────────────────────────────── */
  async function loadProfile(user) {
    if (!user) { GBAuth.profile = null; return; }
    try {
      const { data } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const meta = user.user_metadata || {};
      GBAuth.profile = data || {
        id: user.id,
        tipo: meta.tipo || "morador",
        nome: meta.nome || user.email,
        cep: meta.cep || "",
        pais: meta.pais || "BR",
        cidade: meta.cidade || "",
        bairro: meta.bairro || "",
        whatsapp: meta.whatsapp || ""
      };
    } catch (e) {
      const meta = user.user_metadata || {};
      GBAuth.profile = {
        id: user.id,
        tipo: meta.tipo || "morador",
        nome: meta.nome || user.email,
        cep: meta.cep || "",
        pais: meta.pais || "BR",
        cidade: meta.cidade || "",
        bairro: meta.bairro || "",
        whatsapp: meta.whatsapp || ""
      };
    }
  }

  function renderMenu() {
    const btn = $("#menu-auth");
    const who = $("#menu-user");
    if (!btn) return;
    if (GBAuth.user) {
      const nome = (GBAuth.profile && GBAuth.profile.nome) || GBAuth.user.email;
      btn.textContent = "Sair";
      if (who) {
        const tipo = GBAuth.profile ? (GBAuth.profile.tipo === "anunciante" ? "Anunciante" : "Morador") : "";
        who.textContent = tipo ? `${nome} · ${tipo}` : nome;
        who.hidden = false;
      }
    } else {
      btn.textContent = "Entrar / Cadastrar";
      if (who) who.hidden = true;
    }
  }

  async function applySession(session) {
    GBAuth.user = session ? session.user : null;
    await loadProfile(GBAuth.user);
    renderMenu();
    document.dispatchEvent(new CustomEvent("gb-auth", { detail: GBAuth }));
  }

  /* ── Init ──────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    const sel = $("#auth-pais");
    sel.innerHTML = GBCep.COUNTRIES.map(([c, n]) => `<option value="${c}">${n}</option>`).join("");

    $("#menu-auth").addEventListener("click", async () => {
      if (GBAuth.user) {
        await sb.auth.signOut();
        msg("Você saiu da conta.");
      } else open("login");
    });
    $("#auth-close").addEventListener("click", close);
    $("#auth-overlay").addEventListener("click", e => { if (e.target.id === "auth-overlay") close(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && $("#auth-overlay").classList.contains("open")) close();
    });
    $$tabs().forEach(t => t.addEventListener("click", () => setMode(t.dataset.mode)));
    $("#auth-form").addEventListener("submit", onSubmit);
    $("#auth-cep").addEventListener("blur", checkCep);
    $("#auth-pais").addEventListener("change", () => { cepOk = null; cepKey = ""; checkCep(); });
    $("#auth-whatsapp").addEventListener("input", syncConsent);
    syncConsent();

    sb.auth.onAuthStateChange((_evt, session) => { applySession(session); });
    sb.auth.getSession().then(({ data }) => applySession(data.session));
  });

  window.GBAuth.open = open;
})();
