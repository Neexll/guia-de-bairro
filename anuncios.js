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
          instagram: a.instagram || "",
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
          publishedAt: a.created_at
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
    const box = $("#f-adv-origin-box");
    if (!box) return;

    if (!window.GBAuth || !GBAuth.user) {
      box.innerHTML = `
        <div class="adv-origin-grid">
          <label class="adv-origin-option is-checked is-readonly">
            <input type="checkbox" name="adv-origin" value="De Morador" checked disabled>
            <span class="adv-origin-check" aria-hidden="true">✓</span>
            <span class="adv-origin-info">
              <strong>De Morador</strong>
              <small>Pessoa Física</small>
            </span>
          </label>
          <label class="adv-origin-option is-readonly">
            <input type="checkbox" name="adv-origin" value="De Empresa" disabled>
            <span class="adv-origin-check" aria-hidden="true">✓</span>
            <span class="adv-origin-info">
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
        <div class="adv-origin-grid">
          <label class="adv-origin-option is-checked is-readonly">
            <input type="checkbox" name="adv-origin" value="De Morador" checked disabled>
            <span class="adv-origin-check" aria-hidden="true">✓</span>
            <span class="adv-origin-info">
              <strong>De Morador</strong>
              <small>Anunciante Morador (Pessoa Física) — fixo conforme seu perfil</small>
            </span>
          </label>
        </div>
      `;
    } else if (pTipo === "empresa") {
      // Anunciante Empresa (Pessoa Jurídica): já aparece "De Empresa", sem opção de edição
      box.innerHTML = `
        <div class="adv-origin-grid">
          <label class="adv-origin-option is-checked is-readonly">
            <input type="checkbox" name="adv-origin" value="De Empresa" checked disabled>
            <span class="adv-origin-check" aria-hidden="true">✓</span>
            <span class="adv-origin-info">
              <strong>De Empresa</strong>
              <small>Anunciante Empresa (Pessoa Jurídica) — fixo conforme seu perfil</small>
            </span>
          </label>
        </div>
      `;
    } else {
      // Anunciante Morador e Empresa (PF e PJ): aparecem "De Morador" e "De Empresa" com opção de edição com check-boxes
      box.innerHTML = `
        <div class="adv-origin-grid">
          <label class="adv-origin-option is-checked">
            <input type="checkbox" name="adv-origin" value="De Morador" checked>
            <span class="adv-origin-check" aria-hidden="true">✓</span>
            <span class="adv-origin-info">
              <strong>De Morador</strong>
              <small>Pessoa Física</small>
            </span>
          </label>
          <label class="adv-origin-option">
            <input type="checkbox" name="adv-origin" value="De Empresa">
            <span class="adv-origin-check" aria-hidden="true">✓</span>
            <span class="adv-origin-info">
              <strong>De Empresa</strong>
              <small>Pessoa Jurídica</small>
            </span>
          </label>
        </div>
        <span class="f-hint">Seu perfil é de Morador e Empresa: selecione nos check-boxes a tipificação deste anúncio.</span>
      `;

      const checks = $$('input[name="adv-origin"]', box);
      checks.forEach(chk => {
        chk.addEventListener("change", () => {
          if (!checks.some(c => c.checked)) {
            chk.checked = true;
          }
          checks.forEach(c => {
            c.closest(".adv-origin-option")?.classList.toggle("is-checked", c.checked);
          });
        });
      });
    }
  }

  function getSelectedAdvertiseOrigin() {
    const pTipo = getPerfilTipo();
    if (pTipo === "morador") return "De Morador";
    if (pTipo === "empresa") return "De Empresa";
    const checked = $$('#f-adv-origin-box input[name="adv-origin"]:checked').map(c => c.value);
    if (!checked.length) return "De Morador";
    return checked.join(" e ");
  }

  /* ── 3. FORMULÁRIO DE ANÚNCIO (SEÇÃO #advertise) ───────── */
  function initAdvertiseForm() {
    const form = $("#advertise-form");
    if (!form) return;

    // Popula seletor de país do CEP do anúncio
    const paisSel = $("#f-adv-pais");
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
    const cepInput = $("#f-adv-cep");
    const cepStatus = $("#f-adv-cep-status");
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
      const errBox = $("#adv-form-error");
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
      const whatsappContato = $("#f-adv-whatsapp")?.value.trim() || null;
      const outrasRedesTxt = $("#f-outras-redes")?.value.trim() || "";
      const origemAnuncio = getSelectedAdvertiseOrigin();

      if (!titulo) { msg("Informe o título do negócio ou serviço."); $("#f-name")?.focus(); return; }
      if (!categoria) { msg("Selecione uma categoria."); $("#f-category")?.focus(); return; }
      if (isNaN(preco) || preco < 0) { msg("Informe um valor válido (ex: 45,00)."); $("#f-price")?.focus(); return; }
      if (texto.length < 5) { msg("Informe a descrição do anúncio (mínimo 5 caracteres)."); $("#f-desc")?.focus(); return; }

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
                <span class="dash-badge badge-adv">🏪 ${badgeLabel}</span>
                <span class="dash-sub">${p.cidade ? `${p.bairro ? p.bairro + ' · ' : ''}${p.cidade}` : `CEP ${p.cep || ''}`}</span>
              </div>
            </div>
          </div>

          <div class="dash-head-actions" style="display:flex;gap:10px;flex-wrap:wrap">
            <button type="button" class="btn btn-ghost btn-lg" id="btn-dash-goto-profile">👤 Ver / Editar Perfil</button>
            <a href="#advertise" data-page="advertise" class="btn btn-white btn-lg">Novo Anúncio</a>
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
            <a href="#advertise" data-page="advertise" class="btn btn-white btn-lg" style="margin-top:12px">Criar meu primeiro anúncio</a>
          </div>
        `;
        return;
      }

      box.innerHTML = `
        <div style="margin-bottom:16px;text-align:right">
          <a href="#advertise" data-page="advertise" class="btn btn-white btn-lg">Criar Novo Anúncio</a>
        </div>
        <div class="dash-grid">
          ${data.map(a => {
            const foto = (a.fotos && a.fotos[0]) || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80";
            const origem = extrairOrigemAnuncio(a);
            return `
              <div class="dash-item-card">
                <img src="${foto}" alt="${a.titulo}" class="dash-item-img">
                <div class="dash-item-body">
                  <span class="dash-item-cat">${origem} &bull; ${a.categoria || 'Geral'}</span>
                  <h4>${a.titulo}</h4>
                  <p class="dash-item-price">A partir de R$ ${Number(a.valor_a_partir).toFixed(2).replace(".", ",")}</p>
                  <p class="dash-item-loc">📍 ${[a.bairro, a.cidade].filter(Boolean).join(", ") || a.cep}</p>
                  <div class="dash-item-actions">
                    <button type="button" class="btn btn-ghost btn-sm btn-del-anuncio" data-id="${a.id}">Excluir</button>
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;

      $$(".btn-del-anuncio", box).forEach(b => {
        b.addEventListener("click", async () => {
          if (!confirm("Tem certeza que deseja apagar este anúncio?")) return;
          const id = b.dataset.id;
          await GBSupabase.from("anuncios").delete().eq("id", id);
          msg("Anúncio excluído.");
          carregarAnuncios();
          renderDashTab("meus-anuncios");
        });
      });
    }

    if (tab === "oportunidades") {
      box.innerHTML = `<div style="text-align:center;padding:30px;color:var(--t2)">Buscando pessoas procurando no seu bairro...</div>`;
      const p = GBAuth.profile || {};
      let query = GBSupabase.from("procuras").select("*, profiles:user_id(nome, whatsapp)").order("created_at", { ascending: false });
      if (p.cidade) query = query.eq("cidade", p.cidade);

      const { data, error } = await query;
      if (error || !data || !data.length) {
        box.innerHTML = `
          <div class="dash-empty">
            <p>Nenhuma procura aberta na sua região no momento.</p>
            <span style="font-size:.8rem;color:var(--t3)">Quando um morador postar o que precisa, você verá aqui para fazer uma oferta!</span>
          </div>
        `;
        return;
      }

      box.innerHTML = `
        <div class="dash-grid">
          ${data.map(item => {
            const wpp = item.whatsapp_contato || (item.profiles && item.profiles.whatsapp);
            return `
              <div class="dash-item-card op-card">
                <div class="dash-item-body">
                  <span class="op-badge">💡 Oportunidade</span>
                  <h4>${item.titulo || item.texto}</h4>
                  <p class="op-desc">${item.texto !== item.titulo ? item.texto : ''}</p>
                  <p class="op-val">Cliente paga até: <strong>R$ ${Number(item.valor_maximo).toFixed(2).replace(".", ",")}</strong></p>
                  <p class="dash-item-loc">📍 ${[item.bairro, item.cidade].filter(Boolean).join(", ") || item.cep}</p>
                  ${wpp ? `
                    <a href="https://wa.me/${wpp.replace(/\D/g, '')}?text=Olá,%20vi%20sua%20procura%20de%20'${encodeURIComponent(item.titulo || item.texto)}'%20no%20Guia%20de%20Bairro%20e%20posso%20te%20atender!" target="_blank" rel="noopener" class="btn btn-white btn-sm" style="margin-top:10px">Enviar proposta no WhatsApp</a>
                  ` : ''}
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `;
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
        <div class="adv-form-wrap profile-card">
          <div class="adv-form-head">Meus Dados e Perfil de Anunciante</div>
          <div class="adv-form-body">
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
    const alertBox = $("#adv-auth-alert");
    const formWrap = $("#advertise-form-wrap");
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
        const cepInput = $("#f-adv-cep");
        const paisSel = $("#f-adv-pais");
        const cepStatus = $("#f-adv-cep-status");
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

  /* ── INICIALIZAÇÃO ─────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    initAdvertiseForm();
    initProcuraModal();

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
    renderAdvertiseOrigin
  };
})();
