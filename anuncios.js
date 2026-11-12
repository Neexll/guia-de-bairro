/* ==========================================================
   GUIA DE BAIRRO — Anúncios, Procuras e Dashboard (Supabase)
   ========================================================== */
window.GBAnuncios = (function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const msg = (t) => (typeof toast === "function" ? toast(t) : alert(t));

  let selectedPhotos = [];
  let advCepValidated = null;
  let procuraCepValidated = null;

  function getPerfilTipo() {
    if (window.GBAuth && typeof GBAuth.getPerfilTipo === "function") {
      return GBAuth.getPerfilTipo();
    }
    const p = (window.GBAuth && GBAuth.profile) || {};
    return p.perfil_tipo || (p.tipo === "anunciante" ? "empresa" : p.tipo) || "morador";
  }

  function getPerfilLabel(short = false) {
    if (window.GBAuth && typeof GBAuth.getPerfilLabel === "function") {
      return GBAuth.getPerfilLabel(getPerfilTipo(), short);
    }
    return "Anunciante";
  }

  function parsePrecoValor(rawStr) {
    if (!rawStr) return NaN;
    let s = String(rawStr).replace(/[^\d,\.]/g, "").trim();
    if (!s) return NaN;
    // Se tiver ponto e vírgula (ex: 1.500,00), remove pontos de milhar e troca vírgula por ponto
    if (s.includes(".") && s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    return parseFloat(s);
  }


  function formatAdForModal(a) {
    const fotos = (a.fotos && a.fotos.length) ? a.fotos : [];
    const principal = fotos[0] || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80";
    const origem = extrairOrigemAnuncio(a);
    const linkRedes = Array.isArray(a.outras_redes) ? (a.outras_redes.find(r => r && r.tipo === "link")?.valor || "") : "";
    return {
      id: "sb-" + a.id,
      dbId: a.id,
      userId: a.user_id,
      name: a.titulo || (a.texto ? a.texto.slice(0, 40) + "..." : "Anúncio"),
      category: a.categoria || "Serviços",
      origemAnuncio: origem,
      desc: a.texto,
      price: a.valor_a_partir !== null ? `A partir de R$ ${Number(a.valor_a_partir).toFixed(2).replace(".", ",")}` : undefined,
      address: [a.bairro, a.cidade, a.uf].filter(Boolean).join(", ") || `CEP ${a.cep}`,
      cep: a.cep,
      bairro: a.bairro,
      cidade: a.cidade,
      uf: a.uf,
      pais: a.pais,
      phone: a.whatsapp_contato || (a.profiles && a.profiles.whatsapp) || "",
      whatsapp: a.whatsapp_contato || (a.profiles && a.profiles.whatsapp) || "",
      instagram: a.instagram || "",
      website: linkRedes,
      outrasRedes: linkRedes,
      videoUrl: a.video_url || "",
      image: principal,
      images: fotos.length ? fotos : [principal],
      rating: 5.0,
      reviews: 1,
      views: 1,
      distance: a.bairro ? `${a.bairro}` : "No bairro",
      tags: [origem, a.categoria || "Serviços"],
      featured: true,
      isUserPost: true,
      publishedAt: a.created_at,
      rawAd: a
    };
  }

  function extrairOrigemAnuncio(a) {
    if (Array.isArray(a.outras_redes)) {
      const item = a.outras_redes.find(r => r && r.tipo === "origem" && r.valor);
      if (item) return item.valor;
    }
    if (a.tipo_anuncio) return a.tipo_anuncio;
    return "De Morador";
  }

  /* ── 1. CARREGAR ANÚNCIOS DO SUPABASE ──────────────────── */
  async function carregarAnuncios() {
    if (!window.GBSupabase) return [];
    try {
      const { data, error } = await GBSupabase
        .from("anuncios")
        .select("*, profiles:user_id(nome, tipo, whatsapp)")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Erro ao carregar anúncios do Supabase:", error.message);
        return [];
      }

      // Converte para o formato de card do Guia de Bairro
      const formatados = (data || []).map(a => {
        const fotos = (a.fotos && a.fotos.length) ? a.fotos : [];
        const principal = fotos[0] || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80";
        const origem = extrairOrigemAnuncio(a);
        const linkRedes = Array.isArray(a.outras_redes) ? (a.outras_redes.find(r => r && r.tipo === "link")?.valor || "") : "";
        return {
          id: "sb-" + a.id,
          dbId: a.id,
          userId: a.user_id,
          authorName: (a.profiles && a.profiles.nome) || "",
          name: a.titulo || (a.texto ? a.texto.slice(0, 40) + "..." : "Anúncio"),
          category: a.categoria || "Serviços",
          origemAnuncio: origem,
          desc: a.texto,
          price: a.valor_a_partir !== null ? `A partir de R$ ${Number(a.valor_a_partir).toFixed(2).replace(".", ",")}` : undefined,
          address: [a.bairro, a.cidade, a.uf].filter(Boolean).join(", ") || `CEP ${a.cep}`,
          cep: a.cep,
          bairro: a.bairro,
          cidade: a.cidade,
          uf: a.uf,
          pais: a.pais,
          phone: a.whatsapp_contato || (a.profiles && a.profiles.whatsapp) || "",
          whatsapp: a.whatsapp_contato || (a.profiles && a.profiles.whatsapp) || "",
          instagram: a.instagram || "",
          website: linkRedes,
          outrasRedes: linkRedes,
          videoUrl: a.video_url || "",
          image: principal,
          images: fotos.length ? fotos : [principal],
          rating: 5.0,
          reviews: 1,
          views: 1,
          distance: a.bairro ? `${a.bairro}` : "No bairro",
          tags: [origem, a.categoria || "Serviços"],
          featured: true,
          isUserPost: true,
          publishedAt: a.created_at,
          rawAd: a
        };
      });

      // Mescla com a lista global BUSINESSES
      if (typeof BUSINESSES !== "undefined") {
        // Remove anteriores vindos do supabase para não duplicar
        for (let i = BUSINESSES.length - 1; i >= 0; i--) {
          if (String(BUSINESSES[i].id).startsWith("sb-")) {
            BUSINESSES.splice(i, 1);
          }
        }
        BUSINESSES.unshift(...formatados);
        if (typeof renderListings === "function") renderListings();
      }

      return formatados;
    } catch (e) {
      console.warn("Falha de conexão Supabase:", e);
      return [];
    }
  }

  /* ── 2. CARREGAR PROCURAS DO SUPABASE ───────────────────── */
  async function carregarProcuras() {
    if (!window.GBSupabase) return [];
    try {
      const { data, error } = await GBSupabase
        .from("procuras")
        .select("*, profiles:user_id(nome, tipo, whatsapp)")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Erro ao carregar procuras:", error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      return [];
    }
  }

  /* ── TIPIFICAÇÃO DO ANÚNCIO (AJUSTE 02) ─────────────────── */
  function renderAdvertiseOrigin() {
    const box = $("#f-pub-origin-box");
    if (!box) return;

    if (!window.GBAuth || !GBAuth.user) {
      box.innerHTML = `
        <div class="pub-origin-grid">
          <label class="pub-origin-option is-checked is-readonly">
            <input type="checkbox" name="pub-origin" value="De Morador" checked disabled>
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Morador</strong>
              <small>Pessoa Física</small>
            </span>
          </label>
          <label class="pub-origin-option is-readonly">
            <input type="checkbox" name="pub-origin" value="De Empresa" disabled>
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Empresa</strong>
              <small>Pessoa Jurídica</small>
            </span>
          </label>
        </div>
        <span class="f-hint">Entre na sua conta para definir a tipificação automaticamente conforme o seu perfil.</span>
      `;
      return;
    }

    const pTipo = getPerfilTipo();

    if (pTipo === "morador") {
      // Anunciante Morador (Pessoa Física): já aparece "De Morador", sem opção de edição
      box.innerHTML = `
        <div class="pub-origin-grid">
          <label class="pub-origin-option is-checked is-readonly">
            <input type="checkbox" name="pub-origin" value="De Morador" checked disabled>
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Morador</strong>
              <small>Anunciante Morador (Pessoa Física) — fixo conforme seu perfil</small>
            </span>
          </label>
        </div>
      `;
    } else if (pTipo === "empresa") {
      // Anunciante Empresa (Pessoa Jurídica): já aparece "De Empresa", sem opção de edição
      box.innerHTML = `
        <div class="pub-origin-grid">
          <label class="pub-origin-option is-checked is-readonly">
            <input type="checkbox" name="pub-origin" value="De Empresa" checked disabled>
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Empresa</strong>
              <small>Anunciante Empresa (Pessoa Jurídica) — fixo conforme seu perfil</small>
            </span>
          </label>
        </div>
      `;
    } else {
      // Anunciante Morador e Empresa (PF e PJ): aparecem "De Morador" e "De Empresa" com opção de edição com check-boxes
      box.innerHTML = `
        <div class="pub-origin-grid">
          <label class="pub-origin-option is-checked">
            <input type="checkbox" name="pub-origin" value="De Morador" checked>
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Morador</strong>
              <small>Pessoa Física</small>
            </span>
          </label>
          <label class="pub-origin-option">
            <input type="checkbox" name="pub-origin" value="De Empresa">
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Empresa</strong>
              <small>Pessoa Jurídica</small>
            </span>
          </label>
        </div>
        <span class="f-hint">Seu perfil é de Morador e Empresa: selecione nos check-boxes a tipificação deste anúncio.</span>
      `;

      const checks = $$('input[name="pub-origin"]', box);
      checks.forEach(chk => {
        chk.addEventListener("change", () => {
          if (!checks.some(c => c.checked)) {
            chk.checked = true;
          }
          checks.forEach(c => {
            c.closest(".pub-origin-option")?.classList.toggle("is-checked", c.checked);
          });
        });
      });
    }
  }

  function getSelectedAdvertiseOrigin() {
    const pTipo = getPerfilTipo();
    if (pTipo === "morador") return "De Morador";
    if (pTipo === "empresa") return "De Empresa";
    const checked = $$('#f-pub-origin-box input[name="pub-origin"]:checked').map(c => c.value);
    if (!checked.length) return "De Morador";
    return checked.join(" e ");
  }

  /* ── 3. FORMULÁRIO DE ANÚNCIO (SEÇÃO #advertise) ───────── */
  function initAdvertiseForm() {
    const form = $("#pub-form");
    if (!form) return;

    // Popula seletor de país do CEP do anúncio
    const paisSel = $("#f-pub-pais");
    if (paisSel && window.GBCep) {
      paisSel.innerHTML = GBCep.COUNTRIES.map(([c, n]) => `<option value="${c}">${n}</option>`).join("");
    }

    renderAdvertiseOrigin();

    // Input de fotos com preview
    const fileInput = $("#f-fotos");
    const previewBox = $("#f-fotos-preview");
    if (fileInput && previewBox) {
      fileInput.addEventListener("change", (e) => {
        const files = [...e.target.files];
        files.forEach(f => {
          if (!f.type.startsWith("image/")) {
            msg("Apenas imagens são permitidas.");
            return;
          }
          if (f.size > 5 * 1024 * 1024) {
            msg(`A imagem ${f.name} excede o limite de 5MB.`);
            return;
          }
          selectedPhotos.push(f);
        });
        renderPhotoPreviews();
      });
    }

    function renderPhotoPreviews() {
      if (!previewBox) return;
      previewBox.innerHTML = selectedPhotos.map((f, idx) => `
        <div class="foto-thumb">
          <img src="${URL.createObjectURL(f)}" alt="Prévia">
          <button type="button" class="foto-remove" data-idx="${idx}" aria-label="Remover">&times;</button>
        </div>
      `).join("");
      $$(".foto-remove", previewBox).forEach(b => {
        b.addEventListener("click", () => {
          const idx = parseInt(b.dataset.idx);
          selectedPhotos.splice(idx, 1);
          renderPhotoPreviews();
        });
      });
    }

    // Validação de CEP do anúncio
    const cepInput = $("#f-pub-cep");
    const cepStatus = $("#f-pub-cep-status");
    async function validarAdvCep() {
      if (!cepInput || !paisSel) return null;
      const pais = paisSel.value || "BR";
      const cep = cepInput.value.trim();
      if (!cep) { advCepValidated = null; if (cepStatus) cepStatus.textContent = ""; return null; }
      if (cepStatus) { cepStatus.textContent = "Validando CEP..."; cepStatus.dataset.kind = "loading"; }
      const res = await GBCep.validar(pais, cep);
      if (!res.ok) {
        // Fallback se o CEP digitado é o mesmo já salvo no perfil do usuário
        const p = (window.GBAuth && GBAuth.profile) || {};
        if (p.cep && GBCep.normalizar(pais, cep) === GBCep.normalizar(p.pais || "BR", p.cep)) {
          advCepValidated = { ok: true, pais: p.pais || "BR", cep: p.cep, cidade: p.cidade, uf: p.uf, bairro: p.bairro };
          if (cepStatus) {
            const loc = [p.bairro, p.cidade, p.uf].filter(Boolean).join(" · ");
            cepStatus.textContent = "✓ " + (loc || "CEP do seu perfil");
            cepStatus.dataset.kind = "ok";
          }
          return advCepValidated;
        }
        advCepValidated = null;
        if (cepStatus) { cepStatus.textContent = res.erro; cepStatus.dataset.kind = "error"; }
        return null;
      }
      advCepValidated = res;
      if (cepStatus) {
        const loc = [res.bairro, res.cidade, res.uf].filter(Boolean).join(" · ");
        cepStatus.textContent = "✓ " + (loc || "CEP válido");
        cepStatus.dataset.kind = "ok";
      }
      return res;
    }

    if (cepInput) {
      cepInput.addEventListener("blur", validarAdvCep);
      cepInput.addEventListener("input", () => { advCepValidated = null; });
    }
    if (paisSel) paisSel.addEventListener("change", () => { advCepValidated = null; validarAdvCep(); });

    // Envio do Anúncio para o Supabase (AJUSTE 01, 02 e 04)
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#submit-btn");
      const errBox = $("#pub-form-error");
      if (errBox) errBox.textContent = "";

      // 1. Checa autenticação
      if (!GBAuth.user) {
        msg("Você precisa entrar ou criar uma conta para anunciar.");
        GBAuth.open("signup");
        return;
      }

      const titulo = $("#f-name")?.value.trim() || "";
      const categoria = $("#f-category")?.value || "";
      const texto = $("#f-desc")?.value.trim() || "";
      const preco = parsePrecoValor($("#f-price")?.value || "");
      const videoUrl = $("#f-video")?.value.trim() || null;
      const instagram = $("#f-instagram")?.value.trim() || null;
      const whatsappContato = $("#f-pub-whatsapp")?.value.trim() || null;
      const outrasRedesTxt = $("#f-outras-redes")?.value.trim() || "";
      const origemAnuncio = getSelectedAdvertiseOrigin();

      if (!titulo) { msg("Informe o título do negócio ou serviço."); $("#f-name")?.focus(); return; }
      if (!categoria) { msg("Selecione uma categoria."); $("#f-category")?.focus(); return; }
      if (isNaN(preco) || preco < 0) { msg("Informe um valor válido (ex: 45,00)."); $("#f-price")?.focus(); return; }
      if (texto.length < 15) {
        msg("Informe a descrição do anúncio com no mínimo 15 caracteres.");
        $("#f-desc")?.focus();
        return;
      }
      if (!whatsappContato && !instagram && !outrasRedesTxt) {
        msg("Informe pelo menos um meio de contato (WhatsApp, Instagram ou Site/Outra rede) para que os clientes possam falar com você.");
        $("#f-pub-whatsapp")?.focus();
        return;
      }

      const cepValido = advCepValidated || await validarAdvCep();
      if (!cepValido) {
        msg("Valide o CEP do anúncio para continuar.");
        cepInput?.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = "Publicando anúncio...";

      try {
        // Garante que o perfil no banco esteja sincronizado como 'anunciante' antes do insert (AJUSTE 04)
        if (typeof GBAuth.ensureProfile === "function") {
          await GBAuth.ensureProfile();
        }

        // Upload das fotos no Supabase Storage
        const uploadedUrls = [];
        for (const file of selectedPhotos) {
          const ext = file.name.split(".").pop();
          const path = `${GBAuth.user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
          const { data: uploadData, error: uploadErr } = await GBSupabase.storage
            .from("midias")
            .upload(path, file, { cacheControl: "3600", upsert: false });

          if (!uploadErr && uploadData) {
            const { data: pubData } = GBSupabase.storage.from("midias").getPublicUrl(path);
            if (pubData && pubData.publicUrl) uploadedUrls.push(pubData.publicUrl);
          }
        }

        const outrasRedesArr = [{ tipo: "origem", valor: origemAnuncio }];
        if (outrasRedesTxt) outrasRedesArr.push({ tipo: "link", valor: outrasRedesTxt });

        // Salva no banco de dados
        const payload = {
          user_id: GBAuth.user.id,
          titulo,
          categoria,
          texto,
          valor_a_partir: preco,
          pais: cepValido.pais,
          cep: cepValido.cep,
          cidade: cepValido.cidade,
          uf: cepValido.uf,
          bairro: cepValido.bairro,
          fotos: uploadedUrls,
          video_url: videoUrl,
          instagram,
          whatsapp_contato: whatsappContato,
          outras_redes: outrasRedesArr
        };

        let { error: dbErr } = await GBSupabase.from("anuncios").insert(payload);

        // Se ainda assim houve erro de RLS por conta antiga com tipo='morador', força atualização do perfil e tenta de novo
        if (dbErr) {
          await GBSupabase.from("profiles").update({ tipo: "anunciante" }).eq("id", GBAuth.user.id);
          const retry = await GBSupabase.from("anuncios").insert(payload);
          dbErr = retry.error;
        }

        if (dbErr) throw dbErr;

        msg("Anúncio publicado com sucesso!");
        form.reset();
        selectedPhotos = [];
        advCepValidated = null;
        renderPhotoPreviews();
        updateAdvertiseAccess();
        await carregarAnuncios();

        // Leva para o dashboard onde o anúncio recém-criado já aparece listado
        if (typeof navigate === "function") navigate("dashboard");
      } catch (err) {
        if (errBox) errBox.textContent = "Erro ao publicar: " + (err.message || err);
        msg("Erro ao publicar: " + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.textContent = "Publicar anúncio";
      }
    });
  }

  /* ── 5. MODAL DE PROCURA ("Procuro X, pago até R$ Y") ──── */
  function initProcuraModal() {
    const modal = $("#procura-modal");
    if (!modal) return;

    const paisSel = $("#f-proc-pais");
    if (paisSel && window.GBCep) {
      paisSel.innerHTML = GBCep.COUNTRIES.map(([c, n]) => `<option value="${c}">${n}</option>`).join("");
    }

    const cepInput = $("#f-proc-cep");
    const cepStatus = $("#f-proc-cep-status");
    async function validarProcCep() {
      if (!cepInput || !paisSel) return null;
      const pais = paisSel.value || "BR";
      const cep = cepInput.value.trim();
      if (!cep) { procuraCepValidated = null; if (cepStatus) cepStatus.textContent = ""; return null; }
      if (cepStatus) { cepStatus.textContent = "Validando CEP..."; cepStatus.dataset.kind = "loading"; }
      const res = await GBCep.validar(pais, cep);
      if (!res.ok) {
        const p = (window.GBAuth && GBAuth.profile) || {};
        if (p.cep && GBCep.normalizar(pais, cep) === GBCep.normalizar(p.pais || "BR", p.cep)) {
          procuraCepValidated = { ok: true, pais: p.pais || "BR", cep: p.cep, cidade: p.cidade, uf: p.uf, bairro: p.bairro };
          if (cepStatus) {
            const loc = [p.bairro, p.cidade, p.uf].filter(Boolean).join(" · ");
            cepStatus.textContent = "✓ " + (loc || "CEP do seu perfil");
            cepStatus.dataset.kind = "ok";
          }
          return procuraCepValidated;
        }
        procuraCepValidated = null;
        if (cepStatus) { cepStatus.textContent = res.erro; cepStatus.dataset.kind = "error"; }
        return null;
      }
      procuraCepValidated = res;
      if (cepStatus) {
        const loc = [res.bairro, res.cidade, res.uf].filter(Boolean).join(" · ");
        cepStatus.textContent = "✓ " + (loc || "CEP válido");
        cepStatus.dataset.kind = "ok";
      }
      return res;
    }

    if (cepInput) {
      cepInput.addEventListener("blur", validarProcCep);
      cepInput.addEventListener("input", () => { procuraCepValidated = null; });
    }
    if (paisSel) paisSel.addEventListener("change", () => { procuraCepValidated = null; validarProcCep(); });

    // Fechar modal
    $("#procura-close")?.addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("open"); });

    // Submissão da Procura
    const form = $("#procura-form");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!GBAuth.user) {
          msg("Entre na sua conta para publicar uma procura.");
          GBAuth.open("login");
          return;
        }

        const titulo = $("#f-proc-titulo")?.value.trim() || "";
        const texto = $("#f-proc-desc")?.value.trim() || "";
        const valorMax = parsePrecoValor($("#f-proc-valor")?.value || "");
        const wpp = $("#f-proc-whatsapp")?.value.trim() || "";

        if (!titulo) { msg("Informe o que você está procurando."); return; }
        if (isNaN(valorMax) || valorMax <= 0) { msg("Informe o valor máximo que você se dispõe a pagar."); return; }

        const cepValido = procuraCepValidated || await validarProcCep();
        if (!cepValido) { msg("Valide o CEP da procura."); return; }

        const btn = $("#f-proc-submit");
        btn.disabled = true;
        btn.textContent = "Publicando...";

        try {
          const payload = {
            user_id: GBAuth.user.id,
            titulo,
            texto: texto.length >= 5 ? texto : (titulo.length >= 5 ? titulo : titulo + " - bairro"),
            valor_maximo: valorMax,
            pais: cepValido.pais,
            cep: cepValido.cep,
            cidade: cepValido.cidade,
            uf: cepValido.uf,
            bairro: cepValido.bairro,
            whatsapp_contato: wpp
          };

          let { error } = await GBSupabase.from("procuras").insert(payload);

          // Compatibilidade com banco antigo onde policy de procuras exigia profiles.tipo = 'morador'
          if (error) {
            await GBSupabase.from("profiles").update({ tipo: "morador" }).eq("id", GBAuth.user.id);
            const retry = await GBSupabase.from("procuras").insert(payload);
            error = retry.error;
            await GBSupabase.from("profiles").update({ tipo: "anunciante" }).eq("id", GBAuth.user.id);
          }

          if (error) throw error;
          msg("Procura publicada no bairro!");
          modal.classList.remove("open");
          form.reset();
          procuraCepValidated = null;
          renderProcurasMural();
          renderDashboard();
        } catch (ex) {
          msg("Erro ao publicar procura: " + ex.message);
        } finally {
          btn.disabled = false;
          btn.textContent = "Publicar procura";
        }
      });
    }
  }

  function openProcuraModal() {
    if (!GBAuth.user) {
      msg("Faça login ou crie sua conta para publicar o que você procura no bairro.");
      GBAuth.open("login");
      return;
    }
    const modal = $("#procura-modal");
    if (!modal) return;
    if (GBAuth.profile) {
      const cepInput = $("#f-proc-cep");
      const paisSel = $("#f-proc-pais");
      if (cepInput && !cepInput.value) {
        cepInput.value = GBAuth.profile.cep || "";
        if (paisSel && GBAuth.profile.pais) paisSel.value = GBAuth.profile.pais;
        cepInput.dispatchEvent(new Event("blur"));
      }
    }
    modal.classList.add("open");
  }

  /* ── 6. RENDERIZAÇÃO DO MURAL DE PROCURAS (EM #listings) ─ */
  async function renderProcurasMural() {
    const container = $("#procuras-grid");
    if (!container) return;
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--t2)">Carregando procuras...</div>`;

    let procuras = await carregarProcuras();
    if (window.GBLocal && GBLocal.ativo()) {
      procuras = GBLocal.ordenar(GBLocal.filtrar(procuras));
    }
    if (!procuras.length) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:50px 20px;border:1px dashed var(--b1);border-radius:20px;color:var(--t2)">
          <p style="font-size:1.1rem;color:var(--t1);margin-bottom:8px">Nenhum morador publicou uma procura recente no bairro.</p>
          <p style="font-size:.85rem;margin-bottom:20px">Está precisando de algum produto, serviço ou reparo? Diga o que procura e quanto pode pagar!</p>
          <button type="button" class="btn btn-white btn-lg" id="btn-empty-procura">Publicar o que você procura</button>
        </div>
      `;
      $("#btn-empty-procura")?.addEventListener("click", openProcuraModal);
      return;
    }

    container.innerHTML = procuras.map(p => {
      const valor = Number(p.valor_maximo).toFixed(2).replace(".", ",");
      const proximo = window.GBLocal && GBLocal.ativo() ? GBLocal.rotulo(p) : null;
      const loc = ([p.bairro, p.cidade, p.uf].filter(Boolean).join(" · ") || `CEP ${p.cep}`) + (proximo ? ` · ${proximo}` : "");
      const autor = (p.profiles && p.profiles.nome) || "Morador do bairro";
      const wpp = p.whatsapp_contato || (p.profiles && p.profiles.whatsapp);
      const wppBtn = wpp ? `<a href="https://wa.me/${wpp.replace(/\D/g, '')}?text=Olá,%20vi%20sua%20procura%20de%20'${encodeURIComponent(p.titulo || p.texto)}'%20no%20Guia%20de%20Bairro!" target="_blank" rel="noopener" class="btn btn-white btn-sm" style="margin-top:12px">Entrar em contato</a>` : "";

      return `
        <div class="procura-card">
          <div class="procura-badge">Intenção de compra</div>
          <h3 class="procura-title">${p.titulo || p.texto}</h3>
          <p class="procura-desc">${p.texto !== p.titulo ? p.texto : ""}</p>
          <div class="procura-meta">
            <div class="procura-price">Pago até <strong>R$ ${valor}</strong></div>
            <div class="procura-loc">${loc}</div>
            <div class="procura-author">Por ${autor}</div>
          </div>
          ${wppBtn}
        </div>
      `;
    }).join("");
  }

  /* ── 7. DASHBOARD DO USUÁRIO E GERENCIAMENTO DE PERFIL (AJUSTE 03) ── */
  async function renderDashboard(initialTab) {
    const dash = $("#dashboard");
    if (!dash) return;

    if (!GBAuth.user) {
      dash.innerHTML = `
        <div class="container" style="text-align:center;padding:100px 20px;">
          <h2 style="margin-bottom:12px;font-size:1.8rem">Você não está conectado</h2>
          <p style="color:var(--t2);margin-bottom:24px">Faça login para ver sua conta, editar seu perfil, gerenciar seus anúncios ou suas procuras.</p>
          <button type="button" class="btn btn-white btn-lg" onclick="GBAuth.open('login')">Entrar na minha conta</button>
        </div>
      `;
      return;
    }

    const p = GBAuth.profile || {};
    const pTipo = getPerfilTipo();
    const badgeLabel = getPerfilLabel(false);
    const activeTab = initialTab || "meus-anuncios";

    dash.innerHTML = `
      <div class="container dash-wrap">
        <div class="dash-head">
          <div class="dash-profile">
            <div class="dash-avatar">${(p.nome || GBAuth.user.email || "U").charAt(0).toUpperCase()}</div>
            <div>
              <h2 class="dash-name">${p.nome || GBAuth.user.email}</h2>
              <div class="dash-badges">
                <span class="dash-badge badge-pub">🏪 ${badgeLabel}</span>
                <span class="dash-sub">${p.cidade ? `${p.bairro ? p.bairro + ' · ' : ''}${p.cidade}` : `CEP ${p.cep || ''}`}</span>
              </div>
            </div>
          </div>

          <div class="dash-head-actions" style="display:flex;gap:10px;flex-wrap:wrap">
            <button type="button" class="btn btn-ghost btn-lg" id="btn-dash-goto-profile">👤 Ver / Editar Perfil</button>
            <a href="#anunciar" data-page="anunciar" class="btn btn-white btn-lg">Novo Anúncio</a>
          </div>
        </div>

        <div class="dash-tabs" role="tablist">
          <button type="button" class="dash-tab ${activeTab === 'meus-anuncios' ? 'active' : ''}" data-tab="meus-anuncios">Meus Anúncios</button>
          <button type="button" class="dash-tab ${activeTab === 'minhas-procuras' ? 'active' : ''}" data-tab="minhas-procuras">Minhas Procuras</button>
          <button type="button" class="dash-tab ${activeTab === 'oportunidades' ? 'active' : ''}" data-tab="oportunidades">💡 Oportunidades no Bairro</button>
          <button type="button" class="dash-tab ${activeTab === 'meu-perfil' ? 'active' : ''}" data-tab="meu-perfil">👤 Meu Perfil & Conta</button>
        </div>

        <div id="dash-tab-content" class="dash-content">
          <div style="text-align:center;padding:40px;color:var(--t2)">Carregando...</div>
        </div>
      </div>
    `;

    // Botão de atalho no topo do dashboard para ir direto à aba de perfil
    $("#btn-dash-goto-profile")?.addEventListener("click", () => {
      $$(".dash-tab", dash).forEach(b => b.classList.toggle("active", b.dataset.tab === "meu-perfil"));
      renderDashTab("meu-perfil");
    });

    // Eventos de abas do dashboard
    $$(".dash-tab", dash).forEach(t => {
      t.addEventListener("click", () => {
        $$(".dash-tab", dash).forEach(b => b.classList.remove("active"));
        t.classList.add("active");
        renderDashTab(t.dataset.tab);
      });
    });

    renderDashTab(activeTab);
  }

  async function renderDashTab(tab) {
    const box = $("#dash-tab-content");
    if (!box) return;

    if (tab === "meus-anuncios") {
      box.innerHTML = `<div style="text-align:center;padding:30px;color:var(--t2)">Carregando anúncios...</div>`;
      const { data, error } = await GBSupabase
        .from("anuncios")
        .select("*")
        .eq("user_id", GBAuth.user.id)
        .order("created_at", { ascending: false });

      if (error || !data || !data.length) {
        box.innerHTML = `
          <div class="dash-empty">
            <p>Você ainda não cadastrou nenhum anúncio.</p>
            <a href="#anunciar" data-page="anunciar" class="btn btn-white btn-lg" style="margin-top:12px">Criar meu primeiro anúncio</a>
          </div>
        `;
        return;
      }

      const myAds = data || [];
      box.innerHTML = `
        <div style="margin-bottom:16px;text-align:right">
          <a href="#anunciar" data-page="anunciar" class="btn btn-white btn-lg">Criar Novo Anúncio</a>
        </div>
        <div class="dash-grid">
          ${myAds.map(a => {
            const foto = (a.fotos && a.fotos[0]) || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80";
            const origem = extrairOrigemAnuncio(a);
            return `
              <div class="dash-item-card" data-id="${a.id}">
                <img src="${foto}" alt="${a.titulo}" class="dash-item-img dash-clickable" style="cursor:pointer" title="Ver detalhes completos">
                <div class="dash-item-body">
                  <span class="dash-item-cat">${origem} &bull; ${a.categoria || 'Geral'}</span>
                  <h4 class="dash-clickable" style="cursor:pointer" title="Ver detalhes completos">${a.titulo}</h4>
                  <p class="dash-item-price">A partir de R$ ${Number(a.valor_a_partir).toFixed(2).replace(".", ",")}</p>
                  <p class="dash-item-loc">📍 ${[a.bairro, a.cidade].filter(Boolean).join(", ") || a.cep}</p>
                  <div class="dash-item-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
                    <button type="button" class="btn btn-ghost btn-sm btn-view-my-ad" data-id="${a.id}">👁️ Ver Detalhes</button>
                    <button type="button" class="btn btn-white btn-sm btn-edit-anuncio" data-id="${a.id}">✏️ Editar</button>
                    <button type="button" class="btn btn-ghost btn-sm btn-del-anuncio" data-id="${a.id}" style="color:#e5675a">Excluir</button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;

      const openAdDetails = (id) => {
        const ad = myAds.find(item => String(item.id) === String(id));
        if (ad && typeof window.openModal === "function") {
          window.openModal(formatAdForModal(ad));
        }
      };

      $(".btn-view-my-ad", box).forEach(b => {
        b.addEventListener("click", () => openAdDetails(b.dataset.id));
      });

      $(".dash-clickable", box).forEach(el => {
        el.addEventListener("click", () => {
          const card = el.closest(".dash-item-card");
          if (card && card.dataset.id) openAdDetails(card.dataset.id);
        });
      });

      $(".btn-edit-anuncio", box).forEach(b => {
        b.addEventListener("click", () => {
          const ad = myAds.find(item => String(item.id) === String(b.dataset.id));
          if (ad) openEditModal(ad);
        });
      });

      $(".btn-del-anuncio", box).forEach(b => {
        b.addEventListener("click", async () => {
          if (!confirm("Tem certeza que deseja apagar este anúncio permanentemente?")) return;
          const id = b.dataset.id;
          await GBSupabase.from("anuncios").delete().eq("id", id);
          msg("Anúncio excluído com sucesso.");
          await carregarAnuncios();
          renderDashTab("meus-anuncios");
        });
      });
    }

    if (tab === "oportunidades") {
      box.innerHTML = `<div style="text-align:center;padding:30px;color:var(--t2)">Carregando oportunidades no bairro...</div>`;

      // 1. Busca tanto os anúncios públicos quanto as procuras públicas de todos os moradores e empresas
      const [resAnuncios, resProcuras] = await Promise.all([
        GBSupabase.from("anuncios").select("*").order("created_at", { ascending: false }),
        GBSupabase.from("procuras").select("*").order("created_at", { ascending: false })
      ]);

      const rawAds = resAnuncios.data || [];
      const rawProcs = resProcuras.data || [];

      const normStr = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
      const p = GBAuth.profile || {};
      const userCidadeNorm = normStr(p.cidade);
      const userBairroNorm = normStr(p.bairro);

      // 2. Normaliza anúncios (Vendas / Ofertas)
      const listaVendas = rawAds.map(a => {
        const foto = (a.fotos && a.fotos[0]) || "";
        const origem = extrairOrigemAnuncio(a);
        const linkRedes = Array.isArray(a.outras_redes) ? (a.outras_redes.find(r => r && r.tipo === "link")?.valor || "") : "";
        return {
          tipo: "venda",
          id: "adv-" + a.id,
          rawId: a.id,
          user_id: a.user_id,
          titulo: a.titulo || a.texto || "Anúncio",
          texto: a.texto || "",
          categoria: a.categoria || "Geral",
          origem: origem,
          preco: a.valor_a_partir,
          foto: foto,
          bairro: a.bairro || "",
          cidade: a.cidade || "",
          uf: a.uf || "",
          cep: a.cep || "",
          pais: a.pais || "BR",
          whatsapp: a.whatsapp_contato || "",
          instagram: a.instagram || "",
          website: linkRedes,
          created_at: a.created_at || "",
          rawAd: a
        };
      });

      // 3. Normaliza procuras (Pedidos de compra dos moradores)
      const listaProcuras = rawProcs.map(pr => {
        return {
          tipo: "procura",
          id: "proc-" + pr.id,
          rawId: pr.id,
          user_id: pr.user_id,
          titulo: pr.titulo || pr.texto || "Procura no bairro",
          texto: pr.texto || "",
          categoria: "Procura",
          origem: "Morador",
          precoMax: pr.valor_maximo,
          bairro: pr.bairro || "",
          cidade: pr.cidade || "",
          uf: pr.uf || "",
          cep: pr.cep || "",
          pais: pr.pais || "BR",
          whatsapp: pr.whatsapp_contato || "",
          created_at: pr.created_at || "",
          rawProc: pr
        };
      });

      // Lista unificada
      let todasOportunidades = [...listaVendas, ...listaProcuras];

      // Ordenação: primeiro por proximidade (mesmo bairro -> mesma cidade -> demais), depois por data mais recente
      todasOportunidades.sort((a, b) => {
        let rankA = 3;
        let rankB = 3;

        if (userBairroNorm && normStr(a.bairro) === userBairroNorm) rankA = 1;
        else if (userCidadeNorm && normStr(a.cidade) === userCidadeNorm) rankA = 2;

        if (userBairroNorm && normStr(b.bairro) === userBairroNorm) rankB = 1;
        else if (userCidadeNorm && normStr(b.cidade) === userCidadeNorm) rankB = 2;

        if (rankA !== rankB) return rankA - rankB;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

      let opTypeFilter = "todas"; // "todas" | "vendas" | "procuras"
      let opRegionFilter = "todas"; // "todas" | "minha-regiao"

      function renderOportunidadesGrid() {
        let filtradas = todasOportunidades;

        if (opTypeFilter === "vendas") {
          filtradas = filtradas.filter(it => it.tipo === "venda");
        } else if (opTypeFilter === "procuras") {
          filtradas = filtradas.filter(it => it.tipo === "procura");
        }

        if (opRegionFilter === "minha-regiao" && (userCidadeNorm || userBairroNorm)) {
          filtradas = filtradas.filter(it => {
            const cNorm = normStr(it.cidade);
            const bNorm = normStr(it.bairro);
            return (userBairroNorm && bNorm === userBairroNorm) || (userCidadeNorm && cNorm === userCidadeNorm);
          });
        }

        const countTodas = todasOportunidades.length;
        const countVendas = todasOportunidades.filter(it => it.tipo === "venda").length;
        const countProcuras = todasOportunidades.filter(it => it.tipo === "procura").length;

        const hasUserRegion = Boolean(p.cidade || p.bairro);
        const regionLabel = [p.bairro, p.cidade].filter(Boolean).join(", ");

        box.innerHTML = `
          <div class="op-header-bar" style="margin-bottom:20px;display:flex;flex-direction:column;gap:12px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
              <div class="op-subtabs" style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="btn btn-sm ${opTypeFilter === 'todas' ? 'btn-white' : 'btn-ghost'}" data-op-type="todas">
                  Todas (${countTodas})
                </button>
                <button type="button" class="btn btn-sm ${opTypeFilter === 'vendas' ? 'btn-white' : 'btn-ghost'}" data-op-type="vendas">
                  🛍️ Vendas / Ofertas (${countVendas})
                </button>
                <button type="button" class="btn btn-sm ${opTypeFilter === 'procuras' ? 'btn-white' : 'btn-ghost'}" data-op-type="procuras">
                  💡 Procuras dos Moradores (${countProcuras})
                </button>
              </div>

              ${hasUserRegion ? `
                <div class="op-region-toggle" style="display:flex;align-items:center;gap:6px">
                  <button type="button" class="btn btn-sm ${opRegionFilter === 'minha-regiao' ? 'btn-white' : 'btn-ghost'}" data-op-region="minha-regiao" title="Filtrar por ${regionLabel}">
                    📍 ${regionLabel}
                  </button>
                  <button type="button" class="btn btn-sm ${opRegionFilter === 'todas' ? 'btn-white' : 'btn-ghost'}" data-op-region="todas" title="Ver todas as regiões">
                    🌐 Todas as regiões
                  </button>
                </div>
              ` : ''}
            </div>

            <div style="font-size:.82rem;color:var(--t2)">
              ${opTypeFilter === 'todas'
                ? 'Exibindo vendas, ofertas locais e pedidos de compra dos moradores no bairro.'
                : (opTypeFilter === 'vendas'
                  ? 'Exibindo produtos, serviços e comércios anunciados por moradores e empresas.'
                  : 'Exibindo o que os moradores estão procurando e quanto estão dispostos a pagar.')
              }
            </div>
          </div>

          ${!filtradas.length ? `
            <div class="dash-empty">
              <p>Nenhuma oportunidade encontrada com os filtros selecionados.</p>
              <button type="button" class="btn btn-white btn-sm btn-clear-op-filter" style="margin-top:12px">Ver todas as oportunidades</button>
            </div>
          ` : `
            <div class="dash-grid">
              ${filtradas.map(item => {
                const isOwn = GBAuth.user && item.user_id === GBAuth.user.id;
                const locStr = [item.bairro, item.cidade].filter(Boolean).join(", ") || (item.cep ? `CEP ${item.cep}` : "No bairro");

                if (item.tipo === "venda") {
                  const foto = item.foto || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80";
                  return `
                    <div class="dash-item-card op-card op-card-venda" data-id="${item.rawId}">
                      <img src="${foto}" alt="${item.titulo}" class="dash-item-img dash-clickable-op-ad" style="cursor:pointer" title="Ver detalhes completos">
                      <div class="dash-item-body">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                          <span class="dash-item-cat">${item.origem} &bull; ${item.categoria}</span>
                          <span class="badge-op-tag badge-venda">🛍️ Oferta</span>
                        </div>
                        <h4 class="dash-clickable-op-ad" style="cursor:pointer" title="Ver detalhes completos">${item.titulo}</h4>
                        <p class="op-desc">${item.texto && item.texto !== item.titulo ? (item.texto.length > 90 ? item.texto.slice(0, 90) + '...' : item.texto) : ''}</p>
                        <p class="dash-item-price">A partir de <strong>R$ ${item.preco !== null && item.preco !== undefined ? Number(item.preco).toFixed(2).replace('.', ',') : 'Sob consulta'}</strong></p>
                        <p class="dash-item-loc">📍 ${locStr}</p>
                        <div class="dash-item-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                          <button type="button" class="btn btn-ghost btn-sm btn-view-op-ad" data-id="${item.rawId}">👁️ Ver Detalhes</button>
                          ${item.whatsapp ? `
                            <a href="https://wa.me/${item.whatsapp.replace(/\D/g, '')}?text=Olá,%20vi%20seu%20anúncio%20'${encodeURIComponent(item.titulo)}'%20no%20Guia%20de%20Bairro!" target="_blank" rel="noopener" class="btn btn-white btn-sm">💬 WhatsApp</a>
                          ` : (item.instagram ? `
                            <a href="https://instagram.com/${item.instagram.replace(/^@/, '')}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">📸 Instagram</a>
                          ` : '')}
                          ${isOwn ? `<span style="font-size:.72rem;color:var(--t3);align-self:center;margin-left:auto">(Seu anúncio)</span>` : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }

                // Tipo Procura
                return `
                  <div class="dash-item-card op-card op-card-procura" data-id="${item.rawId}">
                    <div class="dash-item-body">
                      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
                        <span class="op-badge">💡 Procura no Bairro</span>
                        <span class="badge-op-tag badge-procura">🙋 Morador quer comprar</span>
                      </div>
                      <h4>${item.titulo}</h4>
                      <p class="op-desc">${item.texto && item.texto !== item.titulo ? item.texto : ''}</p>
                      <p class="op-val">Cliente paga até: <strong>R$ ${Number(item.precoMax).toFixed(2).replace(".", ",")}</strong></p>
                      <p class="dash-item-loc">📍 ${locStr}</p>
                      <div class="dash-item-actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
                        ${item.whatsapp ? `
                          <a href="https://wa.me/${item.whatsapp.replace(/\D/g, '')}?text=Olá,%20vi%20sua%20procura%20de%20'${encodeURIComponent(item.titulo || item.texto)}'%20no%20Guia%20de%20Bairro%20e%20posso%20te%20atender!" target="_blank" rel="noopener" class="btn btn-white btn-sm">💬 Enviar proposta no WhatsApp</a>
                        ` : `<span style="font-size:.8rem;color:var(--t3);padding:6px 0">Sem WhatsApp informado</span>`}
                        ${isOwn ? `<span style="font-size:.72rem;color:var(--t3);align-self:center;margin-left:auto">(Sua procura)</span>` : ''}
                      </div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          `}
        `;

        // Eventos dos botões de tipo (Todas / Vendas / Procuras)
        $$("[data-op-type]", box).forEach(btn => {
          btn.addEventListener("click", () => {
            opTypeFilter = btn.dataset.opType;
            renderOportunidadesGrid();
          });
        });

        // Eventos dos botões de região
        $$("[data-op-region]", box).forEach(btn => {
          btn.addEventListener("click", () => {
            opRegionFilter = btn.dataset.opRegion;
            renderOportunidadesGrid();
          });
        });

        // Limpar filtros no empty state
        $(".btn-clear-op-filter", box)?.addEventListener("click", () => {
          opTypeFilter = "todas";
          opRegionFilter = "todas";
          renderOportunidadesGrid();
        });

        // Abertura do modal de detalhes do anúncio
        const openOpAdDetails = (rawId) => {
          const ad = rawAds.find(a => String(a.id) === String(rawId));
          if (ad && typeof window.openModal === "function") {
            window.openModal(formatAdForModal(ad));
          }
        };

        $$(".btn-view-op-ad", box).forEach(btn => {
          btn.addEventListener("click", () => openOpAdDetails(btn.dataset.id));
        });

        $$(".dash-clickable-op-ad", box).forEach(el => {
          el.addEventListener("click", () => {
            const card = el.closest(".dash-item-card");
            if (card && card.dataset.id) openOpAdDetails(card.dataset.id);
          });
        });
      }

      renderOportunidadesGrid();
    }

    if (tab === "minhas-procuras") {
      box.innerHTML = `<div style="text-align:center;padding:30px;color:var(--t2)">Carregando suas procuras...</div>`;
      const { data, error } = await GBSupabase
        .from("procuras")
        .select("*")
        .eq("user_id", GBAuth.user.id)
        .order("created_at", { ascending: false });

      if (error || !data || !data.length) {
        box.innerHTML = `
          <div class="dash-empty">
            <p>Você não publicou nenhuma procura ainda.</p>
            <button type="button" class="btn btn-white btn-lg" id="btn-dash-new-proc" style="margin-top:12px">Publicar o que procuro</button>
          </div>
        `;
        $("#btn-dash-new-proc")?.addEventListener("click", openProcuraModal);
        return;
      }

      box.innerHTML = `
        <div style="margin-bottom:16px;text-align:right">
          <button type="button" class="btn btn-white btn-lg" id="btn-dash-new-proc2">Nova Procura</button>
        </div>
        <div class="dash-grid">
          ${data.map(p => `
            <div class="dash-item-card">
              <div class="dash-item-body">
                <span class="procura-badge">Minha procura</span>
                <h4>${p.titulo || p.texto}</h4>
                <p class="op-desc">${p.texto !== p.titulo ? p.texto : ''}</p>
                <p class="op-val">Disposto a pagar até: <strong>R$ ${Number(p.valor_maximo).toFixed(2).replace(".", ",")}</strong></p>
                <p class="dash-item-loc">📍 ${[p.bairro, p.cidade].filter(Boolean).join(", ") || p.cep}</p>
                <div class="dash-item-actions">
                  <button type="button" class="btn btn-ghost btn-sm btn-del-procura" data-id="${p.id}">Excluir</button>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
      $("#btn-dash-new-proc2")?.addEventListener("click", openProcuraModal);
      $$(".btn-del-procura", box).forEach(b => {
        b.addEventListener("click", async () => {
          if (!confirm("Excluir esta procura?")) return;
          await GBSupabase.from("procuras").delete().eq("id", b.dataset.id);
          msg("Procura excluída.");
          renderDashTab("minhas-procuras");
          renderProcurasMural();
        });
      });
    }

    if (tab === "meu-perfil") {
      renderProfileTab(box);
    }
  }

  /* ── ABA MEU PERFIL & CONTA (AJUSTE 03) ────────────────── */
  function renderProfileTab(box) {
    const p = GBAuth.profile || {};
    const email = (GBAuth.user && GBAuth.user.email) || "";
    const pTipo = getPerfilTipo();
    const paisAtual = p.pais || "BR";
    const cepAtual = p.cep || "";
    const wppAtual = p.whatsapp || "";
    const consentAtual = Boolean(p.whatsapp_consent || wppAtual);

    const countriesHtml = (window.GBCep ? GBCep.COUNTRIES : [["BR", "Brasil"]])
      .map(([c, n]) => `<option value="${c}" ${c === paisAtual ? "selected" : ""}>${n}</option>`)
      .join("");

    box.innerHTML = `
      <div class="profile-settings-grid">
        <!-- Card de Visualização e Edição do Perfil -->
        <div class="pub-form-wrap profile-card">
          <div class="pub-form-head">Meus Dados e Perfil de Anunciante</div>
          <div class="pub-form-body">
            <form id="profile-edit-form" novalidate>
              <div class="f-grid">

                <div class="f-field f-col2">
                  <label class="f-label">E-mail da conta</label>
                  <input class="f-input" type="email" value="${email}" disabled style="opacity:.65;cursor:not-allowed">
                </div>

                <div class="f-field f-col2">
                  <label class="f-label" for="prof-nome">Nome / Nome do Negócio *</label>
                  <input class="f-input" id="prof-nome" type="text" required maxlength="80" value="${(p.nome || "").replace(/"/g, "&quot;")}">
                </div>

                <div class="f-field f-col2">
                  <label class="f-label">Modalidade de Anunciante (escolha via check-box) *</label>
                  <div class="auth-types profile-types" style="margin-top:6px">
                    <label class="auth-type">
                      <input type="checkbox" name="prof-tipo" value="morador" ${pTipo === "morador" ? "checked" : ""}>
                      <span class="auth-type-card">
                        <span class="auth-check-box" aria-hidden="true">✓</span>
                        <span class="auth-type-info">
                          <strong>Anunciante Morador (Pessoa Física)</strong>
                          <small>Seus anúncios serão tipificados automaticamente como "De Morador"</small>
                        </span>
                      </span>
                    </label>
                    <label class="auth-type">
                      <input type="checkbox" name="prof-tipo" value="empresa" ${pTipo === "empresa" ? "checked" : ""}>
                      <span class="auth-type-card">
                        <span class="auth-check-box" aria-hidden="true">✓</span>
                        <span class="auth-type-info">
                          <strong>Anunciante Empresa (Pessoa Jurídica)</strong>
                          <small>Seus anúncios serão tipificados automaticamente como "De Empresa"</small>
                        </span>
                      </span>
                    </label>
                    <label class="auth-type">
                      <input type="checkbox" name="prof-tipo" value="ambos" ${pTipo === "ambos" ? "checked" : ""}>
                      <span class="auth-type-card">
                        <span class="auth-check-box" aria-hidden="true">✓</span>
                        <span class="auth-type-info">
                          <strong>Anunciante Morador e Empresa (Pessoa Física e Jurídica)</strong>
                          <small>Permite escolher entre "De Morador" e "De Empresa" ao cadastrar cada anúncio</small>
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                <div class="f-field f-col2 f-cep-highlight">
                  <label class="f-label">Localização / CEP principal do seu perfil *</label>
                  <div class="auth-row" style="margin-top:6px">
                    <select class="f-input" id="prof-pais">${countriesHtml}</select>
                    <input class="f-input" id="prof-cep" type="text" maxlength="12" value="${cepAtual}" placeholder="Ex: 01310-100">
                  </div>
                  <p id="prof-cep-status" class="auth-cep-status" data-kind="ok">${p.cidade ? `✓ ${[p.bairro, p.cidade, p.uf].filter(Boolean).join(" · ")}` : ""}</p>
                </div>

                <div class="f-field f-col2">
                  <label class="f-label" for="prof-whatsapp">WhatsApp <em>(opcional)</em></label>
                  <input class="f-input" id="prof-whatsapp" type="tel" value="${wppAtual}" placeholder="+55 11 90000-0000">
                  <label class="auth-check" style="margin-top:8px">
                    <input id="prof-consent" type="checkbox" ${consentAtual ? "checked" : ""} ${wppAtual ? "" : "disabled"}>
                    <span>Aceito receber contatos e ofertas pelo WhatsApp.</span>
                  </label>
                </div>

                <div class="f-field f-col2">
                  <label class="f-label" for="prof-password">Nova senha <em>(deixe em branco para manter a atual)</em></label>
                  <input class="f-input" id="prof-password" type="password" minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres">
                </div>

                <div id="prof-form-error" class="auth-error f-col2"></div>

                <div class="f-field f-col2">
                  <button type="submit" class="btn btn-white btn-lg" id="prof-save-btn" style="width:100%;justify-content:center">
                    Salvar alterações do perfil
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>

        <!-- Card de Exclusão de Perfil / Conta -->
        <div class="profile-danger-zone">
          <div class="profile-danger-head">Excluir Perfil e Conta</div>
          <p class="profile-danger-text">
            Ao excluir sua conta, seu perfil de usuário, todos os seus anúncios publicados e suas procuras serão removidos permanentemente da plataforma. Esta ação não pode ser desfeita.
          </p>
          <button type="button" class="btn btn-danger btn-lg" id="btn-delete-account">
            Excluir meu perfil e conta permanentemente
          </button>
        </div>
      </div>
    `;

    // Check-boxes exclusivos para escolha de modalidade de anunciante
    if (window.GBAuth && typeof GBAuth.bindExclusiveCheckboxes === "function") {
      GBAuth.bindExclusiveCheckboxes('input[name="prof-tipo"]', box);
    }

    // Validação de CEP no formulário de perfil
    let profCepValidated = p.cep ? {
      ok: true,
      pais: paisAtual,
      cep: p.cep,
      cidade: p.cidade || null,
      uf: p.uf || null,
      bairro: p.bairro || null
    } : null;

    const paisSel = $("#prof-pais", box);
    const cepInput = $("#prof-cep", box);
    const cepStatus = $("#prof-cep-status", box);

    async function validarProfCep() {
      const pais = paisSel.value || "BR";
      const cep = cepInput.value.trim();
      if (!cep) { profCepValidated = null; cepStatus.textContent = ""; return null; }
      cepStatus.textContent = "Validando CEP...";
      cepStatus.dataset.kind = "loading";
      const res = await GBCep.validar(pais, cep);
      if (!res.ok) {
        profCepValidated = null;
        cepStatus.textContent = res.erro;
        cepStatus.dataset.kind = "error";
        return null;
      }
      profCepValidated = res;
      const loc = [res.bairro, res.cidade, res.uf].filter(Boolean).join(" · ");
      cepStatus.textContent = "✓ " + (loc || "CEP válido");
      cepStatus.dataset.kind = "ok";
      return res;
    }

    if (window.GBLocal && typeof GBLocal.injetarPreencher === "function") {
      GBLocal.injetarPreencher("#prof-pais", "#prof-cep", "#prof-cep-status");
    }
    cepInput?.addEventListener("blur", validarProfCep);
    cepInput?.addEventListener("input", () => { profCepValidated = null; });
    paisSel?.addEventListener("change", () => { profCepValidated = null; validarProfCep(); });

    // Consentimento WhatsApp no perfil
    const wppInput = $("#prof-whatsapp", box);
    const consentChk = $("#prof-consent", box);
    wppInput?.addEventListener("input", () => {
      const has = wppInput.value.trim().length > 0;
      consentChk.disabled = !has;
      if (!has) consentChk.checked = false;
    });

    // Submissão da edição de perfil
    $("#profile-edit-form", box)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errEl = $("#prof-form-error", box);
      const saveBtn = $("#prof-save-btn", box);
      errEl.textContent = "";

      const nome = $("#prof-nome", box).value.trim();
      const checkedTipo = $('input[name="prof-tipo"]:checked', box);
      const novoPerfilTipo = checkedTipo ? checkedTipo.value : "morador";
      const wpp = wppInput.value.trim();
      const consent = consentChk.checked;
      const newPassword = $("#prof-password", box).value;

      if (nome.length < 2) {
        errEl.textContent = "Informe um nome válido (mínimo 2 caracteres).";
        return;
      }
      if (wpp && !consent) {
        errEl.textContent = "Marque o consentimento do WhatsApp ou deixe o campo em branco.";
        return;
      }
      if (newPassword && newPassword.length < 8) {
        errEl.textContent = "A nova senha precisa ter pelo menos 8 caracteres.";
        return;
      }

      const cepVal = profCepValidated || await validarProfCep();
      if (!cepVal) {
        errEl.textContent = "Informe um CEP válido para salvar seu perfil.";
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Salvando...";

      try {
        await GBAuth.updateProfile({
          nome,
          perfil_tipo: novoPerfilTipo,
          pais: cepVal.pais,
          cep: cepVal.cep,
          cidade: cepVal.cidade,
          uf: cepVal.uf,
          bairro: cepVal.bairro,
          whatsapp: wpp,
          whatsapp_consent: consent,
          password: newPassword || undefined
        });

        msg("Perfil atualizado com sucesso!");
        updateAdvertiseAccess();
        renderDashboard("meu-perfil");
      } catch (ex) {
        errEl.textContent = "Erro ao atualizar perfil: " + (ex.message || ex);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Salvar alterações do perfil";
      }
    });

    // Exclusão permanente do perfil e conta
    $("#btn-delete-account", box)?.addEventListener("click", async () => {
      const ok = confirm(
        "ATENÇÃO: Tem certeza que deseja excluir permanentemente seu perfil e sua conta?\n\nTodos os seus anúncios e procuras serão apagados."
      );
      if (!ok) return;

      const delBtn = $("#btn-delete-account", box);
      delBtn.disabled = true;
      delBtn.textContent = "Excluindo conta...";

      try {
        await GBAuth.deleteAccount();
        await carregarAnuncios();
        msg("Seu perfil e sua conta foram excluídos permanentemente.");
        if (typeof navigate === "function") navigate("hero");
      } catch (ex) {
        msg("Erro ao excluir conta: " + (ex.message || ex));
        delBtn.disabled = false;
        delBtn.textContent = "Excluir meu perfil e conta permanentemente";
      }
    });
  }

  /* ── 8. ATUALIZAR ACESSO À PÁGINA ANUNCIAR (AJUSTE 01, 02 e 04) ── */
  function updateAdvertiseAccess() {
    const alertBox = $("#pub-auth-alert");
    const formWrap = $("#pub-form-wrap");
    if (!alertBox || !formWrap) return;

    renderAdvertiseOrigin();

    if (!GBAuth.user) {
      alertBox.hidden = false;
      alertBox.innerHTML = `
        <h3>Cadastre-se ou entre para anunciar no bairro</h3>
        <p>Todo usuário cadastrado já é um Anunciante (Morador PF, Empresa PJ ou Ambos) e pode publicar gratuitamente.</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button type="button" class="btn btn-white btn-sm" onclick="GBAuth.open('signup')">Criar conta gratuita</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="GBAuth.open('login')">Já tenho conta</button>
        </div>
      `;
      formWrap.style.opacity = ".35";
      formWrap.style.pointerEvents = "none";
    } else {
      // Todo usuário cadastrado é anunciante e tem acesso liberado ao formulário
      alertBox.hidden = true;
      formWrap.style.opacity = "1";
      formWrap.style.pointerEvents = "auto";

      // Pré-preenche e valida o CEP do anúncio com o CEP do perfil se o campo estiver vazio
      if (GBAuth.profile && GBAuth.profile.cep) {
        const cepInput = $("#f-pub-cep");
        const paisSel = $("#f-pub-pais");
        const cepStatus = $("#f-pub-cep-status");
        if (cepInput && !cepInput.value.trim()) {
          if (paisSel && GBAuth.profile.pais) paisSel.value = GBAuth.profile.pais;
          cepInput.value = GBAuth.profile.cep;
          advCepValidated = {
            ok: true,
            pais: GBAuth.profile.pais || "BR",
            cep: GBAuth.profile.cep,
            cidade: GBAuth.profile.cidade || null,
            uf: GBAuth.profile.uf || null,
            bairro: GBAuth.profile.bairro || null
          };
          if (cepStatus) {
            const loc = [GBAuth.profile.bairro, GBAuth.profile.cidade, GBAuth.profile.uf].filter(Boolean).join(" · ");
            cepStatus.textContent = "✓ " + (loc || "CEP válido");
            cepStatus.dataset.kind = "ok";
          }
        }
      }
    }
  }


  /* ── 9. MODAL DE EDIÇÃO DE ANÚNCIO (MEUS ANÚNCIOS) ──────── */
  let editSelectedNewPhotos = [];
  let editExistingPhotos = [];
  let editCepValidated = null;

  function getEditAdvertiseOrigin() {
    const pTipo = getPerfilTipo();
    if (pTipo === "morador") return "De Morador";
    if (pTipo === "empresa") return "De Empresa";
    const checked = $('#f-edit-origin-box input[name="edit-origin"]:checked').map(c => c.value);
    if (!checked.length) return "De Morador";
    return checked.join(" e ");
  }

  function renderEditOrigin(ad) {
    const box = $("#f-edit-origin-box");
    if (!box) return;

    const pTipo = getPerfilTipo();
    const currentOrigin = extrairOrigemAnuncio(ad);

    if (pTipo === "morador") {
      box.innerHTML = `
        <div class="pub-origin-grid">
          <label class="pub-origin-option is-checked is-readonly">
            <input type="checkbox" name="edit-origin" value="De Morador" checked disabled>
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Morador</strong>
              <small>Anunciante Morador (Pessoa Física) — fixo conforme seu perfil</small>
            </span>
          </label>
        </div>
      `;
    } else if (pTipo === "empresa") {
      box.innerHTML = `
        <div class="pub-origin-grid">
          <label class="pub-origin-option is-checked is-readonly">
            <input type="checkbox" name="edit-origin" value="De Empresa" checked disabled>
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Empresa</strong>
              <small>Anunciante Empresa (Pessoa Jurídica) — fixo conforme seu perfil</small>
            </span>
          </label>
        </div>
      `;
    } else {
      const isMoradorChecked = currentOrigin.includes("Morador");
      const isEmpresaChecked = currentOrigin.includes("Empresa");

      box.innerHTML = `
        <div class="pub-origin-grid">
          <label class="pub-origin-option ${isMoradorChecked ? 'is-checked' : ''}">
            <input type="checkbox" name="edit-origin" value="De Morador" ${isMoradorChecked ? 'checked' : ''}>
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Morador</strong>
              <small>Pessoa Física</small>
            </span>
          </label>
          <label class="pub-origin-option ${isEmpresaChecked ? 'is-checked' : ''}">
            <input type="checkbox" name="edit-origin" value="De Empresa" ${isEmpresaChecked ? 'checked' : ''}>
            <span class="pub-origin-check" aria-hidden="true">✓</span>
            <span class="pub-origin-info">
              <strong>De Empresa</strong>
              <small>Pessoa Jurídica</small>
            </span>
          </label>
        </div>
      `;

      const checks = $('input[name="edit-origin"]', box);
      checks.forEach(chk => {
        chk.addEventListener("change", () => {
          if (!checks.some(c => c.checked)) {
            chk.checked = true;
          }
          checks.forEach(c => {
            c.closest(".pub-origin-option")?.classList.toggle("is-checked", c.checked);
          });
        });
      });
    }
  }

  function renderEditPhotos() {
    const existBox = $("#f-edit-fotos-existentes");
    const newBox = $("#f-edit-fotos-novas-preview");

    if (existBox) {
      if (!editExistingPhotos.length) {
        existBox.innerHTML = `<span style="font-size:.78rem;color:var(--t3)">Nenhuma foto mantida no momento.</span>`;
      } else {
        existBox.innerHTML = editExistingPhotos.map((url, idx) => `
          <div class="foto-thumb">
            <img src="${url}" alt="Foto ${idx + 1}">
            <button type="button" class="foto-remove btn-del-existing-photo" data-idx="${idx}" title="Remover esta foto">&times;</button>
          </div>
        `).join("");

        $(".btn-del-existing-photo", existBox).forEach(b => {
          b.addEventListener("click", () => {
            const idx = parseInt(b.dataset.idx);
            editExistingPhotos.splice(idx, 1);
            renderEditPhotos();
          });
        });
      }
    }

    if (newBox) {
      newBox.innerHTML = editSelectedNewPhotos.map((f, idx) => `
        <div class="foto-thumb">
          <img src="${URL.createObjectURL(f)}" alt="Nova foto ${idx + 1}">
          <button type="button" class="foto-remove btn-del-new-photo" data-idx="${idx}" title="Remover">&times;</button>
        </div>
      `).join("");

      $(".btn-del-new-photo", newBox).forEach(b => {
        b.addEventListener("click", () => {
          const idx = parseInt(b.dataset.idx);
          editSelectedNewPhotos.splice(idx, 1);
          renderEditPhotos();
        });
      });
    }
  }

  function openEditModal(ad) {
    if (!ad) return;
    const modal = $("#edit-anuncio-modal");
    if (!modal) return;

    editSelectedNewPhotos = [];
    editExistingPhotos = Array.isArray(ad.fotos) ? [...ad.fotos] : [];
    editCepValidated = {
      ok: true,
      pais: ad.pais || "BR",
      cep: ad.cep || "",
      cidade: ad.cidade || null,
      uf: ad.uf || null,
      bairro: ad.bairro || null
    };

    $("#f-edit-id").value = ad.id;
    $("#f-edit-name").value = ad.titulo || "";
    $("#f-edit-category").value = ad.categoria || "";
    $("#f-edit-price").value = ad.valor_a_partir !== null ? `A partir de R$ ${Number(ad.valor_a_partir).toFixed(2).replace(".", ",")}` : "";
    $("#f-edit-desc").value = ad.texto || "";
    $("#f-edit-video").value = ad.video_url || "";
    $("#f-edit-instagram").value = ad.instagram || "";
    $("#f-edit-whatsapp").value = ad.whatsapp_contato || "";

    const linkRedes = Array.isArray(ad.outras_redes) ? (ad.outras_redes.find(r => r && r.tipo === "link")?.valor || "") : "";
    $("#f-edit-outras-redes").value = linkRedes;

    const paisSel = $("#f-edit-pais");
    if (paisSel && window.GBCep) {
      paisSel.innerHTML = GBCep.COUNTRIES.map(([c, n]) => `<option value="${c}">${n}</option>`).join("");
      paisSel.value = ad.pais || "BR";
    }

    const cepInput = $("#f-edit-cep");
    if (cepInput) cepInput.value = ad.cep || "";
    const cepStatus = $("#f-edit-cep-status");
    if (cepStatus) {
      const loc = [ad.bairro, ad.cidade, ad.uf].filter(Boolean).join(" · ");
      cepStatus.textContent = "✓ " + (loc || "CEP cadastrado");
      cepStatus.dataset.kind = "ok";
    }

    renderEditOrigin(ad);
    renderEditPhotos();

    const errBox = $("#edit-form-error");
    if (errBox) errBox.textContent = "";

    const saveBtn = $("#btn-save-edit");
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = "Salvar alterações";
    }

    modal.classList.add("open");
  }

  function initEditModal() {
    const modal = $("#edit-anuncio-modal");
    if (!modal) return;

    $("#edit-anuncio-close")?.addEventListener("click", () => modal.classList.remove("open"));
    $("#btn-cancel-edit")?.addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });

    const fileInput = $("#f-edit-fotos");
    if (fileInput) {
      fileInput.addEventListener("change", e => {
        const files = [...e.target.files];
        files.forEach(f => {
          if (!f.type.startsWith("image/")) {
            msg("Apenas imagens são permitidas.");
            return;
          }
          if (f.size > 5 * 1024 * 1024) {
            msg(`A imagem ${f.name} excede o limite de 5MB.`);
            return;
          }
          editSelectedNewPhotos.push(f);
        });
        fileInput.value = "";
        renderEditPhotos();
      });
    }

    const cepInput = $("#f-edit-cep");
    const paisSel = $("#f-edit-pais");
    const cepStatus = $("#f-edit-cep-status");

    async function validarEditCep() {
      if (!cepInput || !paisSel) return null;
      const pais = paisSel.value || "BR";
      const cep = cepInput.value.trim();
      if (!cep) { editCepValidated = null; if (cepStatus) cepStatus.textContent = ""; return null; }
      if (cepStatus) { cepStatus.textContent = "Validando CEP..."; cepStatus.dataset.kind = "loading"; }
      const res = await GBCep.validar(pais, cep);
      if (!res.ok) {
        editCepValidated = null;
        if (cepStatus) { cepStatus.textContent = res.erro; cepStatus.dataset.kind = "error"; }
        return null;
      }
      editCepValidated = res;
      if (cepStatus) {
        const loc = [res.bairro, res.cidade, res.uf].filter(Boolean).join(" · ");
        cepStatus.textContent = "✓ " + (loc || "CEP válido");
        cepStatus.dataset.kind = "ok";
      }
      return res;
    }

    if (cepInput) {
      cepInput.addEventListener("blur", validarEditCep);
      cepInput.addEventListener("input", () => { editCepValidated = null; });
    }
    if (paisSel) paisSel.addEventListener("change", () => { editCepValidated = null; validarEditCep(); });

    const form = $("#edit-anuncio-form");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errBox = $("#edit-form-error");
      if (errBox) errBox.textContent = "";
      const btn = $("#btn-save-edit");

      const id = $("#f-edit-id")?.value;
      if (!id) return;

      const titulo = $("#f-edit-name")?.value.trim() || "";
      const categoria = $("#f-edit-category")?.value || "";
      const texto = $("#f-edit-desc")?.value.trim() || "";
      const preco = parsePrecoValor($("#f-edit-price")?.value || "");
      const videoUrl = $("#f-edit-video")?.value.trim() || null;
      const instagram = $("#f-edit-instagram")?.value.trim() || null;
      const whatsappContato = $("#f-edit-whatsapp")?.value.trim() || null;
      const outrasRedesTxt = $("#f-edit-outras-redes")?.value.trim() || "";
      const origemAnuncio = getEditAdvertiseOrigin();

      if (!titulo) { if (errBox) errBox.textContent = "Informe o título do negócio ou serviço."; $("#f-edit-name")?.focus(); return; }
      if (!categoria) { if (errBox) errBox.textContent = "Selecione uma categoria."; $("#f-edit-category")?.focus(); return; }
      if (isNaN(preco) || preco < 0) { if (errBox) errBox.textContent = "Informe um valor válido (ex: 45,00)."; $("#f-edit-price")?.focus(); return; }
      if (texto.length < 15) {
        if (errBox) errBox.textContent = "Informe a descrição do anúncio com no mínimo 15 caracteres.";
        $("#f-edit-desc")?.focus();
        return;
      }

      if (!whatsappContato && !instagram && !outrasRedesTxt) {
        if (errBox) errBox.textContent = "Informe pelo menos um meio de contato (WhatsApp, Instagram ou Site/Outra rede).";
        $("#f-edit-whatsapp")?.focus();
        return;
      }

      const cepValido = editCepValidated || await validarEditCep();
      if (!cepValido) {
        if (errBox) errBox.textContent = "Valide o CEP do anúncio para continuar.";
        cepInput?.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = "Salvando alterações...";

      try {
        const uploadedUrls = [];
        for (const file of editSelectedNewPhotos) {
          const ext = file.name.split(".").pop();
          const path = `${GBAuth.user.id}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
          const { data: uploadData, error: uploadErr } = await GBSupabase.storage
            .from("midias")
            .upload(path, file, { cacheControl: "3600", upsert: false });

          if (!uploadErr && uploadData) {
            const { data: pubData } = GBSupabase.storage.from("midias").getPublicUrl(path);
            if (pubData && pubData.publicUrl) uploadedUrls.push(pubData.publicUrl);
          }
        }

        const fotosFinais = [...editExistingPhotos, ...uploadedUrls];
        const outrasRedesArr = [{ tipo: "origem", valor: origemAnuncio }];
        if (outrasRedesTxt) outrasRedesArr.push({ tipo: "link", valor: outrasRedesTxt });

        const payload = {
          titulo,
          categoria,
          texto,
          valor_a_partir: preco,
          pais: cepValido.pais,
          cep: cepValido.cep,
          cidade: cepValido.cidade,
          uf: cepValido.uf,
          bairro: cepValido.bairro,
          fotos: fotosFinais,
          video_url: videoUrl,
          instagram,
          whatsapp_contato: whatsappContato,
          outras_redes: outrasRedesArr,
          tipo_anuncio: origemAnuncio
        };

        const { error: dbErr } = await GBSupabase
          .from("anuncios")
          .update(payload)
          .eq("id", id)
          .eq("user_id", GBAuth.user.id);

        if (dbErr) throw dbErr;

        msg("Anúncio atualizado com sucesso!");
        modal.classList.remove("open");
        await carregarAnuncios();
        renderDashTab("meus-anuncios");
      } catch (err) {
        if (errBox) errBox.textContent = "Erro ao atualizar: " + (err.message || err);
        msg("Erro ao atualizar anúncio: " + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.textContent = "Salvar alterações";
      }
    });
  }

  /* ── INICIALIZAÇÃO ─────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    initAdvertiseForm();
    initProcuraModal();
    initEditModal();

    // Localização ao vivo mudou: atualiza o mural de procuras se estiver visível
    document.addEventListener("gb-local", () => {
      const tp = $("#tab-listings-proc");
      if (tp && tp.classList.contains("active")) renderProcurasMural();
    });

    // Alternador de abas em #listings (Negócios vs Procuras)
    const tabBiz = $("#tab-listings-biz");
    const tabProc = $("#tab-listings-proc");
    const gridBiz = $("#listings-grid");
    const gridProc = $("#procuras-grid");
    const catGrid = $("#categories-grid");
    const listTop = $(".listings-top");

    if (tabBiz && tabProc) {
      tabBiz.addEventListener("click", () => {
        tabBiz.classList.add("active");
        tabProc.classList.remove("active");
        if (gridBiz) gridBiz.style.display = "";
        if (gridProc) gridProc.style.display = "none";
        if (catGrid) catGrid.style.display = "";
        if (listTop) listTop.style.display = "";
      });
      tabProc.addEventListener("click", () => {
        tabProc.classList.add("active");
        tabBiz.classList.remove("active");
        if (gridBiz) gridBiz.style.display = "none";
        if (gridProc) gridProc.style.display = "grid";
        if (catGrid) catGrid.style.display = "none";
        if (listTop) listTop.style.display = "none";
        renderProcurasMural();
      });
    }

    $("#btn-open-procura-hero")?.addEventListener("click", openProcuraModal);
    $("#btn-open-procura-listings")?.addEventListener("click", openProcuraModal);

    carregarAnuncios();
    renderProcurasMural();
  });

  // Atualiza quando o usuário loga, desloga ou edita o perfil
  document.addEventListener("gb-auth", () => {
    const dashLink = $("#menu-dashboard");
    if (dashLink) dashLink.hidden = !GBAuth.user;
    updateAdvertiseAccess();
    if (typeof state !== "undefined" && state.page === "dashboard") renderDashboard();
  });

  return {
    carregarAnuncios,
    carregarProcuras,
    renderDashboard,
    openProcuraModal,
    updateAdvertiseAccess,
    renderAdvertiseOrigin,
    openEditModal,
    formatAdForModal
  };
})();
