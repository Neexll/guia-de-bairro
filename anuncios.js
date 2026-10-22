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
        return {
          id: "sb-" + a.id,
          dbId: a.id,
          userId: a.user_id,
          name: a.titulo || (a.texto ? a.texto.slice(0, 40) + "..." : "Anúncio"),
          category: a.categoria || "Serviços",
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
          tags: ["Anúncio", a.categoria || "Serviços"],
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

  /* ── 3. FORMULÁRIO DE ANÚNCIO (SEÇÃO #advertise) ───────── */
  function initAdvertiseForm() {
    const form = $("#advertise-form");
    if (!form) return;

    // Popula seletor de país do CEP do anúncio
    const paisSel = $("#f-adv-pais");
    if (paisSel && window.GBCep) {
      paisSel.innerHTML = GBCep.COUNTRIES.map(([c, n]) => `<option value="${c}">${n}</option>`).join("");
    }

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
      const pais = paisSel.value;
      const cep = cepInput.value.trim();
      if (!cep) { advCepValidated = null; if (cepStatus) cepStatus.textContent = ""; return null; }
      if (cepStatus) { cepStatus.textContent = "Validando CEP..."; cepStatus.dataset.kind = "loading"; }
      const res = await GBCep.validar(pais, cep);
      if (!res.ok) {
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

    if (cepInput) cepInput.addEventListener("blur", validarAdvCep);
    if (paisSel) paisSel.addEventListener("change", () => { advCepValidated = null; validarAdvCep(); });

    // Envio do Anúncio para o Supabase
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

      // 2. Checa tipo de conta (só anunciante)
      if (GBAuth.profile && GBAuth.profile.tipo !== "anunciante") {
        if (errBox) {
          errBox.innerHTML = `Sua conta atual é de <strong>Morador</strong>. Anúncios comerciais são exclusivos para contas de Anunciante.<br>
            <button type="button" class="btn btn-white btn-sm" id="btn-upgrade-adv" style="margin-top:8px">Mudar minha conta para Anunciante agora</button>`;
          $("#btn-upgrade-adv")?.addEventListener("click", virarAnunciante);
        }
        return;
      }

      const titulo = $("#f-name")?.value.trim() || "";
      const categoria = $("#f-category")?.value || "";
      const texto = $("#f-desc")?.value.trim() || "";
      const precoRaw = $("#f-price")?.value.replace(/[^\d,\.]/g, "").replace(",", ".") || "";
      const preco = parseFloat(precoRaw);
      const videoUrl = $("#f-video")?.value.trim() || null;
      const instagram = $("#f-instagram")?.value.trim() || null;
      const whatsappContato = $("#f-adv-whatsapp")?.value.trim() || null;
      const outrasRedes = $("#f-outras-redes")?.value.trim() || "";

      if (!titulo) { msg("Informe o título do negócio ou oferta."); return; }
      if (!categoria) { msg("Selecione uma categoria."); return; }
      if (texto.length < 5) { msg("Informe a descrição do anúncio (mínimo 5 caracteres)."); return; }
      if (isNaN(preco) || preco < 0) { msg("Informe o valor obrigatório (ex: a partir de R$ 35,00)."); return; }

      const cepValido = advCepValidated || await validarAdvCep();
      if (!cepValido) {
        msg("Valide o CEP do anúncio para continuar.");
        cepInput?.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = "Publicando anúncio...";

      try {
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

        // Salva no banco de dados
        const { error: dbErr } = await GBSupabase.from("anuncios").insert({
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
          outras_redes: outrasRedes ? [{ tipo: "link", valor: outrasRedes }] : []
        });

        if (dbErr) throw dbErr;

        msg("Anúncio publicado com sucesso!");
        form.reset();
        selectedPhotos = [];
        renderPhotoPreviews();
        await carregarAnuncios();

        // Leva para a listagem ou dashboard
        if (typeof navigate === "function") navigate("dashboard");
      } catch (err) {
        msg("Erro ao publicar: " + (err.message || err));
      } finally {
        btn.disabled = false;
        btn.textContent = "Enviar anúncio";
      }
    });
  }

  /* ── 4. TRANSFORMAR MORADOR EM ANUNCIANTE ───────────────── */
  async function virarAnunciante() {
    if (!GBAuth.user) return;
    try {
      const { error } = await GBSupabase
        .from("profiles")
        .update({ tipo: "anunciante" })
        .eq("id", GBAuth.user.id);

      if (error) throw error;
      if (GBAuth.profile) GBAuth.profile.tipo = "anunciante";
      msg("Parabéns! Sua conta agora é de Anunciante.");
      renderDashboard();
      updateAdvertiseAccess();
    } catch (e) {
      msg("Erro ao atualizar conta: " + e.message);
    }
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
      const pais = paisSel.value;
      const cep = cepInput.value.trim();
      if (!cep) { procuraCepValidated = null; if (cepStatus) cepStatus.textContent = ""; return null; }
      if (cepStatus) { cepStatus.textContent = "Validando CEP..."; cepStatus.dataset.kind = "loading"; }
      const res = await GBCep.validar(pais, cep);
      if (!res.ok) {
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

    if (cepInput) cepInput.addEventListener("blur", validarProcCep);
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
        const maxRaw = $("#f-proc-valor")?.value.replace(/[^\d,\.]/g, "").replace(",", ".") || "";
        const valorMax = parseFloat(maxRaw);
        const wpp = $("#f-proc-whatsapp")?.value.trim() || "";

        if (!titulo) { msg("Informe o que você está procurando."); return; }
        if (isNaN(valorMax) || valorMax <= 0) { msg("Informe o valor máximo que você se dispõe a pagar."); return; }

        const cepValido = procuraCepValidated || await validarProcCep();
        if (!cepValido) { msg("Valide o CEP da procura."); return; }

        const btn = $("#f-proc-submit");
        btn.disabled = true;
        btn.textContent = "Publicando...";

        try {
          const { error } = await GBSupabase.from("procuras").insert({
            user_id: GBAuth.user.id,
            titulo,
            texto: texto || titulo,
            valor_maximo: valorMax,
            pais: cepValido.pais,
            cep: cepValido.cep,
            cidade: cepValido.cidade,
            uf: cepValido.uf,
            bairro: cepValido.bairro,
            whatsapp_contato: wpp
          });

          if (error) throw error;
          msg("Procura publicada no bairro!");
          modal.classList.remove("open");
          form.reset();
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

  function isAnunciante() {
    if (!GBAuth.user) return false;
    const tipo = (GBAuth.profile && GBAuth.profile.tipo) || (GBAuth.user.user_metadata && GBAuth.user.user_metadata.tipo);
    return tipo === "anunciante";
  }

  function openProcuraModal() {
    if (isAnunciante()) {
      msg("Você está conectado como Anunciante. Esta funcionalidade é exclusiva para Moradores. Como anunciante, você pode conferir as procuras na sua aba 'Oportunidades' para enviar propostas aos clientes!");
      return;
    }
    if (!GBAuth.user) {
      msg("Faça login como Morador para publicar o que você procura no bairro.");
      GBAuth.open("login");
      return;
    }
    const modal = $("#procura-modal");
    if (!modal) return;
    // Pré-preenche CEP com o do perfil se houver
    if (GBAuth.profile) {
      const cepInput = $("#f-proc-cep");
      const paisSel = $("#f-proc-pais");
      if (cepInput && !cepInput.value) cepInput.value = GBAuth.profile.cep || "";
      if (paisSel && GBAuth.profile.pais) paisSel.value = GBAuth.profile.pais;
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
      const isAdv = isAnunciante();
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:50px 20px;border:1px dashed var(--b1);border-radius:20px;color:var(--t2)">
          <p style="font-size:1.1rem;color:var(--t1);margin-bottom:8px">Nenhum morador publicou uma procura recente no bairro.</p>
          <p style="font-size:.85rem;margin-bottom:20px">${isAdv ? 'Quando os moradores publicarem pedidos de produtos ou serviços, você verá aqui para fazer propostas!' : 'Está precisando de algum produto, serviço ou reparo? Diga o que procura e quanto pode pagar!'}</p>
          ${!isAdv ? `<button type="button" class="btn btn-white btn-sm" id="btn-empty-procura">+ Publicar o que você procura</button>` : ''}
        </div>
      `;
      if (!isAdv) $("#btn-empty-procura")?.addEventListener("click", openProcuraModal);
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

  /* ── 7. DASHBOARD DO USUÁRIO (#dashboard) ──────────────── */
  async function renderDashboard() {
    const dash = $("#dashboard");
    if (!dash) return;

    if (!GBAuth.user) {
      dash.innerHTML = `
        <div class="container" style="text-align:center;padding:100px 20px;">
          <h2 style="margin-bottom:12px;font-size:1.8rem">Você não está conectado</h2>
          <p style="color:var(--t2);margin-bottom:24px">Faça login para ver sua conta, seus anúncios ou suas procuras.</p>
          <button type="button" class="btn btn-white btn-lg" onclick="GBAuth.open('login')">Entrar na minha conta</button>
        </div>
      `;
      return;
    }

    const p = GBAuth.profile || {};
    const isAnunciante = p.tipo === "anunciante";

    dash.innerHTML = `
      <div class="container dash-wrap">
        <div class="dash-head">
          <div class="dash-profile">
            <div class="dash-avatar">${(p.nome || GBAuth.user.email || "U").charAt(0).toUpperCase()}</div>
            <div>
              <h2 class="dash-name">${p.nome || GBAuth.user.email}</h2>
              <div class="dash-badges">
                <span class="dash-badge ${isAnunciante ? 'badge-adv' : 'badge-user'}">${isAnunciante ? '🏪 Anunciante' : '🏠 Morador'}</span>
                <span class="dash-sub">${p.cidade ? `${p.bairro ? p.bairro + ' · ' : ''}${p.cidade}` : `CEP ${p.cep || ''}`}</span>
              </div>
            </div>
          </div>

          ${!isAnunciante ? `
            <div class="dash-upgrade-box">
              <div>
                <strong>Quer anunciar seu negócio?</strong>
                <p>Mude sua conta para Anunciante e publique seus serviços gratuitamente.</p>
              </div>
              <button type="button" class="btn btn-white btn-sm" id="btn-dash-upgrade">Virar Anunciante</button>
            </div>
          ` : `
            <a href="#advertise" class="btn btn-white btn-sm">+ Novo Anúncio</a>
          `}
        </div>

        <div class="dash-tabs" role="tablist">
          ${isAnunciante ? `
            <button type="button" class="dash-tab active" data-tab="meus-anuncios">Meus Anúncios</button>
            <button type="button" class="dash-tab" data-tab="oportunidades">💡 Oportunidades no Bairro</button>
          ` : `
            <button type="button" class="dash-tab active" data-tab="minhas-procuras">Minhas Procuras</button>
          `}
        </div>

        <div id="dash-tab-content" class="dash-content">
          <div style="text-align:center;padding:40px;color:var(--t2)">Carregando...</div>
        </div>
      </div>
    `;

    $("#btn-dash-upgrade")?.addEventListener("click", virarAnunciante);

    // Eventos de abas do dashboard
    $$(".dash-tab", dash).forEach(t => {
      t.addEventListener("click", () => {
        $$(".dash-tab", dash).forEach(b => b.classList.remove("active"));
        t.classList.add("active");
        renderDashTab(t.dataset.tab);
      });
    });

    renderDashTab(isAnunciante ? "meus-anuncios" : "minhas-procuras");
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
            <a href="#advertise" class="btn btn-white btn-sm" style="margin-top:12px">+ Criar meu primeiro anúncio</a>
          </div>
        `;
        return;
      }

      box.innerHTML = `
        <div class="dash-grid">
          ${data.map(a => {
            const foto = (a.fotos && a.fotos[0]) || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80";
            return `
              <div class="dash-item-card">
                <img src="${foto}" alt="${a.titulo}" class="dash-item-img">
                <div class="dash-item-body">
                  <span class="dash-item-cat">${a.categoria || 'Geral'}</span>
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
            <button type="button" class="btn btn-white btn-sm" id="btn-dash-new-proc" style="margin-top:12px">+ Publicar o que procuro</button>
          </div>
        `;
        $("#btn-dash-new-proc")?.addEventListener("click", openProcuraModal);
        return;
      }

      box.innerHTML = `
        <div style="margin-bottom:16px;text-align:right">
          <button type="button" class="btn btn-white btn-sm" id="btn-dash-new-proc2">+ Nova Procura</button>
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
  }

  /* ── 8. ATUALIZAR ACESSO À PÁGINA ANUNCIAR ───────────────── */
  function updateAdvertiseAccess() {
    const alertBox = $("#adv-auth-alert");
    const formWrap = $("#advertise-form-wrap");
    if (!alertBox || !formWrap) return;

    if (!GBAuth.user) {
      alertBox.hidden = false;
      alertBox.innerHTML = `
        <h3>Cadastre-se para anunciar no bairro</h3>
        <p>Crie uma conta gratuita de Anunciante para divulgar produtos, serviços ou seu estabelecimento.</p>
        <button type="button" class="btn btn-white btn-sm" onclick="GBAuth.open('signup')">Criar conta de Anunciante</button>
      `;
      formWrap.style.opacity = ".35";
      formWrap.style.pointerEvents = "none";
    } else if (GBAuth.profile && GBAuth.profile.tipo !== "anunciante") {
      alertBox.hidden = false;
      alertBox.innerHTML = `
        <h3>Sua conta atual é de Morador</h3>
        <p>Moradores podem publicar o que estão procurando ("Mural de Procuras"). Para anunciar negócios e produtos, mude para Anunciante gratuitamente.</p>
        <button type="button" class="btn btn-white btn-sm" id="btn-upgrade-adv-banner">Quero virar Anunciante agora</button>
      `;
      $("#btn-upgrade-adv-banner")?.addEventListener("click", virarAnunciante);
      formWrap.style.opacity = ".35";
      formWrap.style.pointerEvents = "none";
    } else {
      alertBox.hidden = true;
      formWrap.style.opacity = "1";
      formWrap.style.pointerEvents = "auto";

      // Pré-preenche CEP do anúncio se o anunciante tiver
      if (GBAuth.profile && GBAuth.profile.cep) {
        const cepInput = $("#f-adv-cep");
        const paisSel = $("#f-adv-pais");
        if (cepInput && !cepInput.value) {
          cepInput.value = GBAuth.profile.cep;
          if (paisSel && GBAuth.profile.pais) paisSel.value = GBAuth.profile.pais;
          cepInput.dispatchEvent(new Event("blur"));
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
    syncProcuraButtons();
  });

  function syncProcuraButtons() {
    const isAdv = isAnunciante();
    const btnListings = $("#btn-open-procura-listings");
    if (btnListings) btnListings.style.display = isAdv ? "none" : "";
  }

  // Atualiza quando o usuário loga ou desloga
  document.addEventListener("gb-auth", () => {
    const dashLink = $("#menu-dashboard");
    if (dashLink) dashLink.hidden = !GBAuth.user;
    updateAdvertiseAccess();
    syncProcuraButtons();
    if (state.page === "dashboard") renderDashboard();
  });

  return {
    carregarAnuncios,
    carregarProcuras,
    renderDashboard,
    openProcuraModal,
    virarAnunciante,
    isAnunciante,
    syncProcuraButtons
  };
})();
