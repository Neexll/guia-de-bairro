/* Localização em tempo real.
   - Usa o GPS do navegador (watchPosition) e acompanha o usuário enquanto ele se move.
   - Converte a posição em país / CEP / bairro / cidade (OpenStreetMap Nominatim; no Brasil,
     refina com ViaCEP via GBCep).
   - PRIVACIDADE: as coordenadas ficam só na memória desta aba. Nada é salvo no Supabase,
     no localStorage ou enviado ao nosso backend. Só guardamos a escolha "ativar" (flag).
   - Expõe: ativo(), atual(), rank(item), rotulo(item), filtrar(lista), ordenar(lista). */
window.GBLocal = (function () {
  const $ = (s, c = document) => c.querySelector(s);

  const MIN_MOVE_M = 150;        // só reconsulta o endereço após se mover isso
  const MIN_INTERVAL_MS = 5000;  // respeita o limite de uso do Nominatim
  const LS_OPTIN = "gb-geo-optin";

  let watchId = null;
  let coords = null;     // { lat, lon, acc } — somente em memória
  let last = null;       // { lat, lon } da última consulta de endereço
  let lastAt = 0;
  let busy = false;
  let info = null;       // { pais, cep, cidade, uf, bairro }
  let apenasPerto = false;
  let jaOrdenou = false;

  /* ── utilidades ─────────────────────────────────────────── */
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

  function metros(a, b) {
    const R = 6371000, rad = (x) => (x * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  async function fetchTimeout(url, ms = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } }); }
    finally { clearTimeout(t); }
  }

  function formatarCep(pais, cep) {
    if (!cep) return null;
    return pais === "BR" ? cep.replace(/^(\d{5})(\d{3})$/, "$1-$2") : cep;
  }

  /* ── posição → endereço ─────────────────────────────────── */
  async function resolverEndereco(lat, lon) {
    const url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18" +
      `&accept-language=pt-BR&lat=${lat}&lon=${lon}`;
    const r = await fetchTimeout(url);
    if (!r.ok) throw new Error("Serviço de endereço indisponível.");
    const d = await r.json();
    const a = (d && d.address) || {};
    if (!a.country_code) throw new Error("Não foi possível identificar o local.");

    const pais = a.country_code.toUpperCase();
    const iso = a["ISO3166-2-lvl4"] || "";
    const res = {
      pais,
      cep: a.postcode ? window.GBCep.normalizar(pais, a.postcode) : null,
      cidade: a.city || a.town || a.village || a.municipality || a.county || null,
      uf: iso.includes("-") ? iso.split("-")[1] : (a.state || null),
      bairro: a.suburb || a.neighbourhood || a.quarter || a.city_district || a.borough || null
    };

    // Brasil: ViaCEP confirma o CEP e traz o bairro/cidade oficiais
    if (pais === "BR" && res.cep && /^\d{8}$/.test(res.cep) && window.GBCep) {
      try {
        const v = await window.GBCep.validar("BR", res.cep);
        if (v.ok) {
          res.cidade = v.cidade || res.cidade;
          res.uf = v.uf || res.uf;
          res.bairro = v.bairro || res.bairro;
        } else {
          res.cep = null; // CEP do mapa não existe/está impreciso — não confiar
        }
      } catch (e) { /* mantém o que o mapa informou */ }
    }
    return res;
  }

  /* ── proximidade ────────────────────────────────────────── */
  /* 0 mesmo CEP · 1 mesma região postal · 2 mesmo bairro · 3 mesma cidade · 9 outro/sem local */
  function rank(it) {
    if (!info || !it || !it.pais || String(it.pais).toUpperCase() !== info.pais) return 9;
    const ic = window.GBCep.normalizar(info.pais, it.cep || "");
    if (ic && info.cep) {
      if (ic === info.cep) return 0;
      if (info.pais === "BR" && ic.slice(0, 5) === info.cep.slice(0, 5)) return 1;
    }
    const mesmaCidade = !it.cidade || !info.cidade || norm(it.cidade) === norm(info.cidade);
    if (it.bairro && info.bairro && norm(it.bairro) === norm(info.bairro) && mesmaCidade) return 2;
    if (it.cidade && info.cidade && norm(it.cidade) === norm(info.cidade)) return 3;
    return 9;
  }

  const ROTULOS = {
    0: "No seu CEP", 1: "Na sua região", 2: "No seu bairro", 3: "Na sua cidade", 9: "Em outra região"
  };
  function rotulo(it) {
    if (!info || !it || !it.cep) return null; // itens de demonstração mantêm o texto original
    return ROTULOS[rank(it)];
  }

  function filtrar(lista) {
    if (!info || !apenasPerto) return lista;
    return lista.filter((it) => rank(it) <= 3);
  }
  function ordenar(lista) {
    return lista.sort((a, b) =>
      rank(a) - rank(b) || (a.distanceMeters || 9999) - (b.distanceMeters || 9999));
  }

  /* ── UI ─────────────────────────────────────────────────── */
  function setStatus(texto, tipo) {
    const wrap = $("#geo-status"), txt = $("#geo-status-text");
    if (!wrap || !txt) return;
    wrap.hidden = !texto;
    wrap.dataset.kind = tipo || "";
    txt.textContent = texto || "";
  }

  function render() {
    const ligado = watchId !== null;
    const btn = $("#geo-btn"), lbl = $("#geo-btn-label"), only = $("#geo-only-wrap");
    if (btn) { btn.setAttribute("aria-pressed", String(ligado)); btn.classList.toggle("on", ligado); }
    if (lbl) lbl.textContent = ligado ? "Parar localização" : "Usar minha localização";
    if (only) only.hidden = !(ligado && info);
  }

  function statusDoLocal() {
    if (!info) return;
    const partes = [info.bairro, info.cidade, info.uf].filter(Boolean).join(" · ");
    const cep = formatarCep(info.pais, info.cep);
    const prec = coords && coords.acc ? ` · ±${coords.acc >= 1000 ? (coords.acc / 1000).toFixed(1) + " km" : Math.round(coords.acc) + " m"}` : "";
    setStatus(`${partes || "Local identificado"}${cep ? " · CEP " + cep : ""}${prec}`, "live");
  }

  function emitir() {
    document.dispatchEvent(new CustomEvent("gb-local", { detail: { info, apenasPerto } }));
  }

  /* ── tempo real ─────────────────────────────────────────── */
  async function atualizarEndereco() {
    if (busy || !coords) return;
    busy = true;
    const ponto = { lat: coords.lat, lon: coords.lon };
    try {
      const novo = await resolverEndereco(ponto.lat, ponto.lon);
      last = ponto; lastAt = Date.now();
      const mudou = !info || ["pais", "cep", "bairro", "cidade"].some((k) => info[k] !== novo[k]);
      info = novo;
      statusDoLocal();
      render();
      if (mudou) {
        if (!jaOrdenou) {
          jaOrdenou = true;
          const sel = $("#sort-select");
          if (sel && sel.value !== "distance") { sel.value = "distance"; sel.dispatchEvent(new Event("change")); }
        }
        emitir();
      }
    } catch (e) {
      if (!info) setStatus(e.name === "AbortError" ? "Tempo esgotado ao identificar o local." : (e.message || "Não foi possível identificar o local."), "error");
    } finally { busy = false; }
  }

  function aoReceberPosicao(pos) {
    coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
    if (info) statusDoLocal();
    const moveu = !last || metros(last, coords) >= MIN_MOVE_M;
    if (moveu && Date.now() - lastAt >= MIN_INTERVAL_MS) atualizarEndereco();
  }

  function aoFalhar(err) {
    if (err.code === 1) {
      parar();
      setStatus("Permissão negada. Libere a localização nas configurações do navegador.", "error");
    } else if (!info) {
      setStatus(err.code === 3 ? "Demorou para obter sua posição. Tentando de novo…" : "Não foi possível obter sua posição.", "error");
    }
  }

  function suportado() {
    if (!("geolocation" in navigator)) { setStatus("Seu navegador não suporta geolocalização.", "error"); return false; }
    if (!window.isSecureContext) { setStatus("A localização exige HTTPS (ou localhost).", "error"); return false; }
    return true;
  }

  function ativar() {
    if (watchId !== null || !suportado()) return;
    setStatus("Buscando sua posição…", "loading");
    watchId = navigator.geolocation.watchPosition(aoReceberPosicao, aoFalhar,
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
    try { localStorage.setItem(LS_OPTIN, "1"); } catch (e) { }
    render();
  }

  function parar() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null; coords = null; last = null; info = null; jaOrdenou = false;
    try { localStorage.removeItem(LS_OPTIN); } catch (e) { }
    setStatus("");
    render();
    emitir();
  }

  /* Leitura única (para preencher formulários), sem ligar o modo "ao vivo" */
  function umaVez() {
    return new Promise((resolve, reject) => {
      if (info) return resolve(info);
      if (!("geolocation" in navigator)) return reject(new Error("Seu navegador não suporta geolocalização."));
      if (!window.isSecureContext) return reject(new Error("A localização exige HTTPS (ou localhost)."));
      navigator.geolocation.getCurrentPosition(
        (p) => resolverEndereco(p.coords.latitude, p.coords.longitude).then(resolve, reject),
        (e) => reject(new Error(e.code === 1 ? "Permissão de localização negada." : "Não foi possível obter sua posição.")),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 });
    });
  }

  /* ── Botão "usar minha localização" nos campos de CEP ──── */
  function injetarPreencher(selPais, selCep, selStatus) {
    const pais = $(selPais), cep = $(selCep), status = $(selStatus);
    if (!pais || !cep || !status) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "geo-fill";
    btn.textContent = "📍 Usar minha localização atual";
    status.insertAdjacentElement("afterend", btn);
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      status.textContent = "Obtendo sua localização…";
      status.dataset.kind = "loading";
      try {
        const r = await umaVez();
        if (!r.cep) throw new Error("Não consegui descobrir o CEP deste local. Digite o CEP manualmente.");
        if (![...pais.options].some((o) => o.value === r.pais)) throw new Error("Esse país ainda não é suportado.");
        pais.value = r.pais;
        cep.value = formatarCep(r.pais, r.cep);
        cep.dispatchEvent(new Event("blur")); // dispara a validação já existente do formulário
      } catch (e) {
        status.textContent = e.message || "Falha ao obter localização.";
        status.dataset.kind = "error";
      } finally { btn.disabled = false; }
    });
  }

  /* ── Init ───────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    const btn = $("#geo-btn");
    if (btn) btn.addEventListener("click", () => (watchId === null ? ativar() : parar()));

    const only = $("#geo-only");
    if (only) only.addEventListener("change", () => { apenasPerto = only.checked; emitir(); });

    injetarPreencher("#auth-pais", "#auth-cep", "#auth-cep-status");
    injetarPreencher("#f-adv-pais", "#f-adv-cep", "#f-adv-cep-status");
    injetarPreencher("#f-proc-pais", "#f-proc-cep", "#f-proc-cep-status");
    render();

    // Retoma sozinho se o usuário já ativou antes e a permissão continua concedida
    let optin = false;
    try { optin = localStorage.getItem(LS_OPTIN) === "1"; } catch (e) { }
    if (optin && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "geolocation" })
        .then((p) => { if (p.state === "granted") ativar(); })
        .catch(() => { });
    }
  });

  return {
    ativo: () => watchId !== null && !!info,
    atual: () => info,
    rank, rotulo, filtrar, ordenar,
    ativar, parar
  };
})();
