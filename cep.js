/* Validação de CEP / código postal internacional.
   BR  -> ViaCEP        (https://viacep.com.br)
   Demais países -> Zippopotam.us (https://api.zippopotam.us)
   Se a API falhar ou não achar o código, a validação FALHA (sem bypass). */
window.GBCep = (function () {
  const COUNTRIES = [
    ["BR", "Brasil"], ["PT", "Portugal"], ["US", "Estados Unidos"], ["AR", "Argentina"],
    ["UY", "Uruguai"], ["PY", "Paraguai"], ["CL", "Chile"], ["MX", "México"],
    ["ES", "Espanha"], ["FR", "França"], ["IT", "Itália"], ["DE", "Alemanha"],
    ["GB", "Reino Unido"], ["CA", "Canadá"], ["RU", "Rússia"], ["JP", "Japão"],
    ["AU", "Austrália"], ["NL", "Países Baixos"], ["BE", "Bélgica"], ["CH", "Suíça"],
    ["PL", "Polônia"], ["TR", "Turquia"], ["IN", "Índia"], ["ZA", "África do Sul"]
  ];

  async function getJSON(url) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      return await fetch(url, { signal: ctrl.signal });
    } finally { clearTimeout(t); }
  }

  /* Normaliza o código postal conforme o país */
  function normalizar(pais, cep) {
    let c = String(cep || "").trim().toUpperCase();
    if (pais === "BR") return c.replace(/\D/g, "");
    if (pais === "GB") return c.split(/\s+/)[0];              // outward code (ex: SW1A)
    if (pais === "CA") return c.replace(/\s+/g, "").slice(0, 3); // FSA (ex: M5V)
    if (pais === "PT") return c.replace(/\D/g, "").slice(0, 4);  // 4 primeiros (ex: 1000)
    return c.replace(/\s+/g, "");
  }

  /* Retorna { ok, cep, pais, cidade, uf, bairro } ou { ok:false, erro } */
  async function validar(pais, cep) {
    pais = String(pais || "").toUpperCase();
    const c = normalizar(pais, cep);
    if (!pais) return { ok: false, erro: "Escolha o país." };
    if (!c) return { ok: false, erro: "Informe o CEP / código postal." };

    try {
      if (pais === "BR") {
        if (!/^\d{8}$/.test(c)) return { ok: false, erro: "CEP brasileiro deve ter 8 dígitos." };
        const r = await getJSON(`https://viacep.com.br/ws/${c}/json/`);
        if (!r.ok) return { ok: false, erro: "CEP inválido." };
        const d = await r.json();
        if (d.erro) return { ok: false, erro: "CEP não encontrado." };
        return {
          ok: true, pais, cep: c,
          cidade: d.localidade || null, uf: d.uf || null, bairro: d.bairro || null
        };
      }

      if (!/^[A-Z0-9-]{2,10}$/.test(c)) return { ok: false, erro: "Código postal em formato inválido." };
      const r = await getJSON(`https://api.zippopotam.us/${pais.toLowerCase()}/${encodeURIComponent(c)}`);
      if (r.status === 404) return { ok: false, erro: "Código postal não encontrado nesse país." };
      if (!r.ok) return { ok: false, erro: "Não foi possível validar agora. Tente novamente." };
      const d = await r.json();
      const p = (d.places && d.places[0]) || {};
      return {
        ok: true, pais, cep: c,
        cidade: p["place name"] || null,
        uf: p["state abbreviation"] || p["state"] || null,
        bairro: null
      };
    } catch (e) {
      return { ok: false, erro: "Falha de conexão ao validar o CEP. Tente novamente." };
    }
  }

  return { COUNTRIES, normalizar, validar };
})();
