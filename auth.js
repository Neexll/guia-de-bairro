/* Autenticação, cadastro e gerenciamento de perfil (Supabase Auth) */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const msg = (t) => (typeof toast === "function" ? toast(t) : alert(t));

  if (!window.supabase || !window.GB_CONFIG) {
    console.warn("Supabase não carregado — autenticação desativada.");
    return;
  }
  const sb = window.supabase.createClient(GB_CONFIG.SUPABASE_URL, GB_CONFIG.SUPABASE_ANON_KEY);
  window.GBSupabase = sb;

  function normalizePerfilTipo(rawPerfilTipo, rawTipo) {
    if (rawPerfilTipo === "morador" || rawPerfilTipo === "empresa" || rawPerfilTipo === "ambos") {
      return rawPerfilTipo;
    }
    if (rawTipo === "empresa" || rawTipo === "ambos" || rawTipo === "morador") {
      return rawTipo;
    }
    if (rawTipo === "anunciante") {
      return "empresa";
    }
    return "morador";
  }

  function getPerfilTipo(p) {
    const prof = p || window.GBAuth.profile || (window.GBAuth.user && window.GBAuth.user.user_metadata) || {};
    const meta = (window.GBAuth.user && window.GBAuth.user.user_metadata) || {};
    return normalizePerfilTipo(prof.perfil_tipo || meta.perfil_tipo, prof.tipo || meta.tipo);
  }

  function getPerfilLabel(perfilTipo, short = false) {
    const t = perfilTipo || getPerfilTipo();
    if (t === "empresa") {
      return short ? "Anunciante Empresa (PJ)" : "Anunciante Empresa (Pessoa Jurídica)";
    }
    if (t === "ambos") {
      return short ? "Anunciante Morador e Empresa (PF e PJ)" : "Anunciante Morador e Empresa (Pessoa Física e Jurídica)";
    }
    return short ? "Anunciante Morador (PF)" : "Anunciante Morador (Pessoa Física)";
  }

  window.GBAuth = {
    user: null,
    profile: null,
    getPerfilTipo,
    getPerfilLabel
  };

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

  /* ── Check-boxes de tipo de anunciante (AJUSTE 01) ─────── */
  function bindExclusiveCheckboxes(selector, container = document) {
    const boxes = $$(selector, container);
    boxes.forEach(box => {
      box.addEventListener("change", () => {
        if (box.checked) {
          boxes.forEach(other => {
            if (other !== box) other.checked = false;
          });
        } else if (!boxes.some(b => b.checked)) {
          // Mantém ao menos uma opção selecionada
          box.checked = true;
        }
      });
    });
  }

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

      /* Cadastro: Todo usuário que se cadastrar é um anunciante (AJUSTE 01) */
      const checkedBox = document.querySelector('input[name="auth-tipo"]:checked');
      const perfilTipo = checkedBox ? checkedBox.value : "";
      const nome = $("#auth-nome").value.trim();
      const whatsapp = $("#auth-whatsapp").value.replace(/[^\d+]/g, "");
      const consent = $("#auth-consent").checked;

      if (!perfilTipo) throw new Error("Escolha o seu perfil de anunciante nos check-boxes.");
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
            tipo: "anunciante",
            perfil_tipo: perfilTipo,
            nome,
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
        ? "Conta de anunciante criada! Você já está logado."
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

  /* ── Garante que o registro em public.profiles exista como anunciante (AJUSTE 04) ── */
  async function ensureProfileInDb(user, currentProfile) {
    if (!user) return null;
    const meta = user.user_metadata || {};
    const p = currentProfile || {};
    const perfil_tipo = normalizePerfilTipo(p.perfil_tipo || meta.perfil_tipo, p.tipo || meta.tipo);
    const whatsappVal = p.whatsapp || meta.whatsapp || null;
    const consentVal = Boolean(whatsappVal && (p.whatsapp_consent || meta.whatsapp_consent || whatsappVal));

    const baseRow = {
      id: user.id,
      tipo: "anunciante",
      nome: p.nome || meta.nome || (user.email ? user.email.split("@")[0] : "Anunciante"),
      pais: (p.pais || meta.pais || "BR").toUpperCase().slice(0, 2),
      cep: p.cep || meta.cep || "01310100",
      cidade: p.cidade || meta.cidade || null,
      uf: p.uf || meta.uf || null,
      bairro: p.bairro || meta.bairro || null,
      whatsapp: consentVal ? whatsappVal : null,
      whatsapp_consent: consentVal
    };

    try {
      // Se não existia na tabela ou estava com tipo != 'anunciante', atualiza/insere
      if (!currentProfile || !currentProfile._fromDb) {
        const { error: upErr } = await sb.from("profiles").upsert(baseRow, { onConflict: "id" });
        if (upErr) {
          await sb.from("profiles").update({ tipo: "anunciante" }).eq("id", user.id);
        }
      } else if (currentProfile.tipo !== "anunciante") {
        await sb.from("profiles").update({ tipo: "anunciante" }).eq("id", user.id);
      }
      // Tenta gravar perfil_tipo caso a coluna já exista no banco
      await sb.from("profiles").update({ perfil_tipo }).eq("id", user.id);
    } catch (e) {
      // Ignora silenciosamente se a coluna opcional perfil_tipo ainda não existir no banco
    }

    return {
      ...baseRow,
      perfil_tipo,
      _fromDb: true
    };
  }

  /* ── Sessão / perfil ───────────────────────────────────── */
  async function loadProfile(user) {
    if (!user) { GBAuth.profile = null; return; }
    const meta = user.user_metadata || {};
    try {
      const { data } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const perfil_tipo = normalizePerfilTipo(
        (data && data.perfil_tipo) || meta.perfil_tipo,
        meta.perfil_tipo ? meta.perfil_tipo : ((data && data.tipo) || meta.tipo)
      );

      const merged = data ? {
        ...data,
        tipo: "anunciante",
        perfil_tipo,
        _fromDb: true
      } : {
        id: user.id,
        tipo: "anunciante",
        perfil_tipo,
        nome: meta.nome || user.email,
        cep: meta.cep || "",
        pais: meta.pais || "BR",
        cidade: meta.cidade || "",
        uf: meta.uf || "",
        bairro: meta.bairro || "",
        whatsapp: meta.whatsapp || "",
        whatsapp_consent: Boolean(meta.whatsapp_consent),
        _fromDb: false
      };

      GBAuth.profile = merged;

      // Se no banco o tipo antigo ainda era 'morador' ou não existia, sincroniza para 'anunciante'
      if (!data || data.tipo !== "anunciante") {
        await ensureProfileInDb(user, merged);
      }
    } catch (e) {
      const perfil_tipo = normalizePerfilTipo(meta.perfil_tipo, meta.tipo);
      GBAuth.profile = {
        id: user.id,
        tipo: "anunciante",
        perfil_tipo,
        nome: meta.nome || user.email,
        cep: meta.cep || "",
        pais: meta.pais || "BR",
        cidade: meta.cidade || "",
        uf: meta.uf || "",
        bairro: meta.bairro || "",
        whatsapp: meta.whatsapp || "",
        whatsapp_consent: Boolean(meta.whatsapp_consent),
        _fromDb: false
      };
    }
  }

  /* ── Atualizar perfil do usuário (AJUSTE 03) ───────────── */
  async function updateProfile(fields) {
    if (!GBAuth.user) throw new Error("Você não está conectado.");
    const uid = GBAuth.user.id;
    const pAtual = GBAuth.profile || {};

    const perfil_tipo = normalizePerfilTipo(fields.perfil_tipo || pAtual.perfil_tipo, fields.tipo);
    const nome = (fields.nome || pAtual.nome || "").trim();
    const pais = (fields.pais || pAtual.pais || "BR").toUpperCase().slice(0, 2);
    const cep = fields.cep || pAtual.cep || "";
    const cidade = fields.cidade !== undefined ? fields.cidade : (pAtual.cidade || null);
    const uf = fields.uf !== undefined ? fields.uf : (pAtual.uf || null);
    const bairro = fields.bairro !== undefined ? fields.bairro : (pAtual.bairro || null);
    const whatsappClean = (fields.whatsapp !== undefined ? fields.whatsapp : (pAtual.whatsapp || "")).replace(/[^\d+]/g, "");
    const consent = fields.whatsapp_consent !== undefined ? Boolean(fields.whatsapp_consent) : Boolean(pAtual.whatsapp_consent);
    const finalWhatsapp = whatsappClean && consent ? whatsappClean : null;

    // 1. Atualiza metadados (e senha, se informada) no Supabase Auth
    const authPayload = {
      data: {
        tipo: "anunciante",
        perfil_tipo,
        nome,
        pais,
        cep,
        cidade,
        uf,
        bairro,
        whatsapp: finalWhatsapp || "",
        whatsapp_consent: Boolean(finalWhatsapp)
      }
    };
    if (fields.password && fields.password.length >= 8) {
      authPayload.password = fields.password;
    }

    const { data: authData, error: authErr } = await sb.auth.updateUser(authPayload);
    if (authErr) throw authErr;
    if (authData && authData.user) {
      GBAuth.user = authData.user;
    }

    // 2. Atualiza na tabela public.profiles
    const dbRow = {
      id: uid,
      tipo: "anunciante",
      nome,
      pais,
      cep,
      cidade,
      uf,
      bairro,
      whatsapp: finalWhatsapp,
      whatsapp_consent: Boolean(finalWhatsapp)
    };

    const { error: updateErr } = await sb.from("profiles").update(dbRow).eq("id", uid);
    if (updateErr) {
      await sb.from("profiles").upsert(dbRow, { onConflict: "id" });
    }
    try {
      await sb.from("profiles").update({ perfil_tipo }).eq("id", uid);
    } catch (e) { }

    GBAuth.profile = {
      ...dbRow,
      perfil_tipo,
      _fromDb: true
    };

    renderMenu();
    document.dispatchEvent(new CustomEvent("gb-auth", { detail: GBAuth }));
    return GBAuth.profile;
  }

  /* ── Excluir perfil e conta do usuário (AJUSTE 03) ─────── */
  async function deleteAccount() {
    if (!GBAuth.user) throw new Error("Você não está conectado.");
    const uid = GBAuth.user.id;

    // 1. Apaga anúncios e procuras do usuário
    try { await sb.from("anuncios").delete().eq("user_id", uid); } catch (e) { }
    try { await sb.from("procuras").delete().eq("user_id", uid); } catch (e) { }

    // 2. Tenta excluir a conta completa via RPC security definer (delete_own_account)
    let rpcWorked = false;
    try {
      const { error: rpcErr } = await sb.rpc("delete_own_account");
      if (!rpcErr) rpcWorked = true;
    } catch (e) { }

    // 3. Caso a função RPC ainda não tenha sido criada no banco, exclui o perfil e encerra a sessão
    if (!rpcWorked) {
      try { await sb.from("profiles").delete().eq("id", uid); } catch (e) { }
    }

    try { await sb.auth.signOut(); } catch (e) { }
    GBAuth.user = null;
    GBAuth.profile = null;
    renderMenu();
    document.dispatchEvent(new CustomEvent("gb-auth", { detail: GBAuth }));
  }

  function renderMenu() {
    const btn = $("#menu-auth");
    const who = $("#menu-user");
    if (!btn) return;
    if (GBAuth.user) {
      const nome = (GBAuth.profile && GBAuth.profile.nome) || GBAuth.user.email;
      btn.textContent = "Sair";
      if (who) {
        const label = getPerfilLabel(getPerfilTipo(), true);
        who.textContent = `${nome} · ${label}`;
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

    bindExclusiveCheckboxes('input[name="auth-tipo"]');

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
  window.GBAuth.ensureProfile = () => ensureProfileInDb(GBAuth.user, GBAuth.profile);
  window.GBAuth.updateProfile = updateProfile;
  window.GBAuth.deleteAccount = deleteAccount;
  window.GBAuth.bindExclusiveCheckboxes = bindExclusiveCheckboxes;
})();
