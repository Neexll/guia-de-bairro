// ============================================================
//  GUIA DE BAIRRO — app.js
// ============================================================

/* ── Dataset ─────────────────────────────────────────────── */
const BUSINESSES = [
  {
    id: 1,
    name: "Restaurante Sabor da Vovó",
    category: "Alimentação",
    desc: "Comida caseira com ingredientes frescos. Almoço executivo de segunda a sexta, buffet no final de semana.",
    address: "Rua das Flores, 142 — Centro",
    phone: "(11) 9 8765-4321",
    hours: "Seg–Sex 11h–15h, Sab–Dom 11h–17h",
    rating: 4.9, reviews: 312,
    views: 1420,
    distanceMeters: 739,
    distance: "739 metros de você",
    tags: ["Almoço", "Buffet", "Caseiro"],
    featured: true,
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80"
  },
  {
    id: 2,
    name: "Salão Bella Donna",
    category: "Beleza",
    desc: "Especialistas em cortes modernos, coloração, manicure e tratamentos capilares.",
    address: "Av. Paulista, 890 — Jardins",
    phone: "(11) 9 7654-3210",
    hours: "Ter–Sab 9h–19h",
    rating: 4.7, reviews: 180,
    views: 890,
    distanceMeters: 450,
    distance: "450 metros de você",
    tags: ["Cabelo", "Manicure", "Coloração"],
    featured: false,
    image: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80"
  },
  {
    id: 3,
    name: "Farmácia Vida Saudável",
    category: "Saúde",
    desc: "Farmácia completa com manipulação, dermocosméticos e atendimento personalizado. Delivery até 3km.",
    address: "Rua Augusta, 55 — Consolação",
    phone: "(11) 4567-8900",
    hours: "Seg–Dom 7h–22h",
    rating: 4.8, reviews: 95,
    views: 640,
    distanceMeters: 280,
    distance: "280 metros de você",
    tags: ["Manipulação", "Delivery", "Dermocosméticos"],
    featured: true,
    image: "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=800&q=80"
  },
  {
    id: 4,
    name: "TechFix Eletrônicos",
    category: "Tecnologia",
    desc: "Assistência técnica para celulares, tablets, notebooks e videogames. Orçamento gratuito, garantia de 90 dias.",
    address: "Rua Dom José, 78 — Vila Nova",
    phone: "(11) 9 9988-7766",
    hours: "Seg–Sex 9h–18h, Sab 9h–14h",
    rating: 4.6, reviews: 204,
    views: 1120,
    distanceMeters: 620,
    distance: "620 metros de você",
    tags: ["Celular", "Notebook", "Garantia"],
    featured: false,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80"
  },
  {
    id: 5,
    name: "Academia FitZone",
    category: "Saúde",
    desc: "Academia completa com musculação, cardio, spinning, lutas e yoga. Personal trainer incluso nos planos mensais.",
    address: "Alameda Santos, 400 — Cerqueira César",
    phone: "(11) 3344-5566",
    hours: "Seg–Sex 5h–23h, Sab–Dom 7h–20h",
    rating: 4.5, reviews: 430,
    views: 2350,
    distanceMeters: 890,
    distance: "890 metros de você",
    tags: ["Musculação", "Yoga", "Personal"],
    featured: true,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
  },
  {
    id: 6,
    name: "Padaria Pão Quente",
    category: "Alimentação",
    desc: "Pães artesanais frescos todo dia, confeitaria fina e café especial. Café da manhã até as 11h.",
    address: "Rua Bela Vista, 23 — Bela Vista",
    phone: "(11) 3211-4455",
    hours: "Seg–Dom 6h–19h",
    rating: 4.9, reviews: 620,
    views: 3180,
    distanceMeters: 350,
    distance: "350 metros de você",
    tags: ["Artesanal", "Café", "Confeitaria"],
    featured: false,
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80"
  },
  {
    id: 7,
    name: "Boutique Estilo Próprio",
    category: "Moda",
    desc: "Moda feminina contemporânea com peças exclusivas, acessórios e consultoria de estilo.",
    address: "Rua Oscar Freire, 312 — Jardins",
    phone: "(11) 9 7711-2233",
    hours: "Seg–Sab 10h–19h",
    rating: 4.7, reviews: 140,
    views: 760,
    distanceMeters: 1200,
    distance: "1,2 km de você",
    tags: ["Feminino", "Exclusivo", "Acessórios"],
    featured: false,
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80"
  },
  {
    id: 8,
    name: "Escola GlobalTalk",
    category: "Educação",
    desc: "Cursos de inglês para todas as idades com metodologia americana. Turmas presenciais e online.",
    address: "Rua Pamplona, 200 — Paraíso",
    phone: "(11) 3456-7890",
    hours: "Seg–Sex 7h–21h, Sab 8h–14h",
    rating: 4.8, reviews: 290,
    views: 1540,
    distanceMeters: 1500,
    distance: "1,5 km de você",
    tags: ["Inglês", "Online", "TOEFL"],
    featured: false,
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80"
  },
  {
    id: 9,
    name: "PetCare Clínica Veterinária",
    category: "Pets",
    desc: "Consultas, vacinas, cirurgias, banho e tosa e hotel pet. Emergências 24h.",
    address: "Rua Haddock Lobo, 88 — Cerqueira César",
    phone: "(11) 9 5544-3322",
    hours: "Seg–Dom 8h–20h · Emergências 24h",
    rating: 4.9, reviews: 367,
    views: 1890,
    distanceMeters: 510,
    distance: "510 metros de você",
    tags: ["Veterinário", "Banho & Tosa", "Hotel"],
    featured: true,
    image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=800&q=80"
  },
  {
    id: 10,
    name: "Bar Beira Rio",
    category: "Lazer",
    desc: "Chopp gelado, petiscos especiais e música ao vivo nas sextas e sábados. Torcida de futebol.",
    address: "Av. Marginal Pinheiros, 1000 — Pinheiros",
    phone: "(11) 3344-9900",
    hours: "Ter–Dom 16h–01h",
    rating: 4.6, reviews: 510,
    views: 2670,
    distanceMeters: 1800,
    distance: "1,8 km de você",
    tags: ["Happy Hour", "Música ao Vivo", "Petiscos"],
    featured: true,
    image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&q=80"
  },
  {
    id: 11,
    name: "Hortifruti São Jorge",
    category: "Mercado",
    desc: "Frutas, verduras e legumes frescos direto do produtor. Orgânicos e entrega em domicílio.",
    address: "Mercadão Central, Banca 45 — Brás",
    phone: "(11) 9 4433-2211",
    hours: "Seg–Sab 6h–18h, Dom 6h–13h",
    rating: 4.8, reviews: 184,
    views: 980,
    distanceMeters: 950,
    distance: "950 metros de você",
    tags: ["Orgânico", "Entrega", "Frescos"],
    featured: false,
    image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=80"
  },
  {
    id: 12,
    name: "Eletricista do Bairro",
    category: "Serviços",
    desc: "Eletricista profissional certificado. Instalações, reparos, quadro elétrico e iluminação. Atendimento rápido.",
    address: "Atendimento a domicílio — zona sul",
    phone: "(11) 9 6655-4433",
    hours: "Seg–Sab 7h–18h",
    rating: 4.7, reviews: 115,
    views: 530,
    distanceMeters: 1100,
    distance: "1,1 km de você",
    tags: ["Eletricista", "Domicílio", "Urgência"],
    featured: false,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
  },
  {
    id: 13,
    isOffer: true,
    offerType: "Venda",
    price: "R$ 25,00",
    name: "Marmitas Fitness Congeladas",
    category: "Alimentação",
    desc: "Marmitas caseiras saudáveis preparadas com ingredientes frescos da semana. Pronta entrega na região.",
    address: "Rua Haddock Lobo, 410 — Cerqueira César",
    phone: "(11) 9 8122-3344",
    hours: "Pedidos todos os dias 8h–19h",
    rating: 5.0, reviews: 42,
    views: 890,
    distanceMeters: 420,
    distance: "420 metros de você",
    tags: ["Marmita", "Fitness", "Pronta Entrega"],
    publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    featured: false,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80"
  },
  {
    id: 14,
    isOffer: true,
    offerType: "Venda",
    price: "R$ 850,00",
    name: "Bicicleta Aro 29 Seminova",
    category: "Lazer",
    desc: "Bike Caloi Explorer 29 pouco usada, pneus novos, câmbio Shimano 21v. Retirada perto do Metrô Consolação.",
    address: "Rua Augusta, 210 — Consolação",
    phone: "(11) 9 7788-9900",
    hours: "Retirada a combinar",
    rating: 4.9, reviews: 18,
    views: 1240,
    distanceMeters: 310,
    distance: "310 metros de você",
    tags: ["Bicicleta", "Seminovo", "Oportunidade"],
    publishedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    featured: false,
    image: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80"
  },
  {
    id: 15,
    isOffer: true,
    offerType: "Venda",
    price: "A partir de R$ 40,00",
    name: "Artesanato & Vasos em Cerâmica",
    category: "Moda",
    desc: "Vasos decorativos e peças exclusivas em cerâmica feitas à mão aqui no bairro. Entrego em mãos.",
    address: "Alameda Santos, 720 — Cerqueira César",
    phone: "(11) 9 9333-5566",
    hours: "Seg–Sab 10h–18h",
    rating: 5.0, reviews: 26,
    views: 610,
    distanceMeters: 650,
    distance: "650 metros de você",
    tags: ["Artesanato", "Cerâmica", "Decoração"],
    publishedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    featured: false,
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80"
  },
  {
    id: 16,
    isOffer: true,
    offerType: "Venda",
    price: "R$ 15,00 o pote",
    name: "Geleias & Doces Artesanais",
    category: "Alimentação",
    desc: "Geleias artesanais sem conservantes (morango, amora e pimenta). Feitas com frutas frescas.",
    address: "Rua Bela Vista, 105 — Bela Vista",
    phone: "(11) 9 6555-1122",
    hours: "Seg–Dom 9h–18h",
    rating: 4.8, reviews: 35,
    views: 470,
    distanceMeters: 480,
    distance: "480 metros de você",
    tags: ["Geleia", "Caseiro", "Doces"],
    publishedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    featured: false,
    image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80"
  }
];

/* ── Galeria de fotos por negócio (carrossel) ────────────────────── */
const unsplash = id => `https://images.unsplash.com/photo-${id}?w=800&q=80`;
const GALLERY = {
  1: ["1517248135467-4c7edcad34c4", "1414235077428-338989a2e8c0", "1504674900247-0877df9cc836"],
  2: ["1560066984-138dadb4c035", "1522337360788-8b13dee7a37e", "1604654894610-df63bc536371", "1562322140-8baeececf3df"],
  3: ["1587854692152-cbe660dbde88", "1576602976047-174e57a47881", "1584308666744-24d5c474f2ae"],
  4: ["1588872657578-7efd1f1555ed", "1531297484001-80022131f5a1", "1498049794561-7780e7231661"],
  5: ["1571902943202-507ec2618e8f", "1517836357463-d25dfeac3438", "1540497077202-7c8a3999166f"],
  6: ["1509440159596-0249088772ff", "1517433670267-08bbd4be890f", "1495474472287-4d71bcdd2085"],
  7: ["1445205170230-053b83016050", "1483985988355-763728e1935b", "1490481651871-ab68de25d43d"],
  8: ["1503676260728-1c00da094a0b", "1427504494785-3a9ca7044f45", "1524178232363-1fb2b075b655"],
  9: ["1548199973-03cce0bbc87b", "1583337130417-3346a1be7dee", "1514888286974-6c03e2ca1dba"],
  10: ["1514933651103-005eec06c04b", "1470337458703-46ad1756a187", "1566417713940-fe7c737a9ef2"],
  11: ["1542838132-92c53300491e", "1610832958506-aa56368176cf", "1540420773420-3366772f4999"],
  12: ["1621905251189-08b45d6a269e", "1621905252507-b35492cc74b4", "1544724569-5f546fd6f2b5"],
  13: ["1512621776951-a57141f2eefd", "1490645935967-10de6ba17061", "1540189549336-e6e99c3679fe"],
  14: ["1532298229144-0ec0c57515c7", "1507035895480-2b3156c31fc8", "1571068316344-75bc76f77890"],
  15: ["1565193566173-7a0ee3dbe261", "1610701596007-11502861dcfa", "1493106641515-6b5631de4bb9"],
  16: ["1597528662465-55ece5734101", "1563805042-7684c019e1cb", "1488477181946-6428a0291777"]
};
BUSINESSES.forEach(b => {
  if (GALLERY[b.id]) b.images = [b.image, ...GALLERY[b.id].map(unsplash)];
});

// Restaura anúncios cadastrados pelo usuário no navegador
try {
  const userListings = JSON.parse(localStorage.getItem("gb-user-listings") || "[]");
  if (Array.isArray(userListings) && userListings.length) {
    BUSINESSES.unshift(...userListings);
  }
} catch (e) { }

const CATEGORIES = [
  "Todos", "Ofereço", "Alimentação", "Beleza", "Saúde", "Tecnologia",
  "Moda", "Educação", "Pets", "Lazer", "Mercado", "Serviços"
];

/* ── State ───────────────────────────────────────────────── */
const state = {
  cat: "Todos",
  q: "",
  sort: "featured",
  modal: null,
  theme: localStorage.getItem("gb-theme") || "dark",
  page: "hero",
  heroSearchVisible: true
};

const PAGES = ["hero", "listings", "how-it-works", "advertise", "dashboard"];
const FALLBACK_IMG = "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80";
const cardCarouselStops = [];
let modalCarouselStop = null;

/* ── Helpers ─────────────────────────────────────────────── */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

// Restaura cliques/visitas salvos no navegador
try {
  const savedClicks = JSON.parse(localStorage.getItem("gb-biz-clicks") || "{}");
  BUSINESSES.forEach(b => {
    if (savedClicks[b.id] !== undefined) b.views = savedClicks[b.id];
  });
} catch (e) { }

function formatViews(n) {
  if (!n) return "0";
  if (n >= 1000) {
    return (n / 1000).toFixed(1).replace(".0", "").replace(".", ",") + "k";
  }
  return String(n);
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return "recentemente";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "poucos segundos";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr} ${hr === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  const m = Math.floor(d / 30);
  return `há ${m} ${m === 1 ? 'mês' : 'meses'}`;
}

function formatFullDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function registerCardClick(b, cardEl) {
  b.views = (b.views || 0) + 1;
  try {
    const saved = JSON.parse(localStorage.getItem("gb-biz-clicks") || "{}");
    saved[b.id] = b.views;
    localStorage.setItem("gb-biz-clicks", JSON.stringify(saved));
  } catch (e) { }

  const textEl = cardEl?.querySelector(".biz-clicks-text");
  if (textEl) {
    textEl.textContent = `${formatViews(b.views)} visitas`;
  }
}

function setTheme(t) {
  state.theme = t;
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("gb-theme", t);
  const btn = $("#theme-toggle");
  if (btn) btn.textContent = t === "dark" ? "Claro" : "Escuro";
}

/* ── Carrossel ─────────────────────────────────────────────── */
function imagesOf(b) {
  return (b.images && b.images.length) ? b.images : [b.image || FALLBACK_IMG];
}

const ICON_PREV = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const ICON_NEXT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;

function carouselHtml(imgs, alt, extraClass = "") {
  const multi = imgs.length > 1;
  return `
    <div class="carousel ${extraClass}">
      <div class="carousel-track">
        ${imgs.map((src, i) => `
          <div class="carousel-slide${i === 0 ? " is-active" : ""}">
            <img src="${src}" alt="${alt} — foto ${i + 1}" draggable="false"
              onerror="this.onerror=null;this.src='${FALLBACK_IMG}'">
          </div>`).join("")}
      </div>
      ${multi ? `
        <button type="button" class="carousel-btn carousel-prev" aria-label="Foto anterior">${ICON_PREV}</button>
        <button type="button" class="carousel-btn carousel-next" aria-label="Próxima foto">${ICON_NEXT}</button>
        <div class="carousel-dots">
          ${imgs.map((_, i) => `<button type="button" class="carousel-dot${i === 0 ? " is-active" : ""}" data-i="${i}" aria-label="Ir para foto ${i + 1}"></button>`).join("")}
        </div>
        <div class="carousel-progress"><span></span></div>` : ""}
    </div>`;
}

/** Ativa um carrossel: autoplay, setas, dots e swipe. Retorna função para parar. */
function initCarousel(root, { interval = 3800, delay = 0 } = {}) {
  const slides = $$(".carousel-slide", root);
  if (slides.length < 2) return () => { };
  const track = $(".carousel-track", root);
  const dots = $$(".carousel-dot", root);
  let i = 0, timer = null, delayTimer = null;

  root.style.setProperty("--carousel-interval", `${interval}ms`);

  const restartProgress = () => {
    root.classList.remove("is-playing");
    void root.offsetWidth; // reinicia a animação da barra de progresso
    root.classList.add("is-playing");
  };
  const go = n => {
    i = (n + slides.length) % slides.length;
    track.style.transform = `translateX(-${i * 100}%)`;
    slides.forEach((s, k) => s.classList.toggle("is-active", k === i));
    dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
    restartProgress();
  };
  const stop = () => { clearInterval(timer); clearTimeout(delayTimer); };
  const start = () => { stop(); restartProgress(); timer = setInterval(() => go(i + 1), interval); };

  const handle = (e, n) => { e.stopPropagation(); e.preventDefault(); go(n); start(); };
  $(".carousel-prev", root)?.addEventListener("click", e => handle(e, i - 1));
  $(".carousel-next", root)?.addEventListener("click", e => handle(e, i + 1));
  dots.forEach(d => d.addEventListener("click", e => handle(e, Number(d.dataset.i))));

  // Swipe (touch / arrastar)
  let startX = null, swiped = false;
  root.addEventListener("pointerdown", e => { startX = e.clientX; swiped = false; });
  root.addEventListener("pointerup", e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) { swiped = true; go(dx < 0 ? i + 1 : i - 1); start(); }
  });
  // Evita abrir o modal quando o usuário apenas arrastou o carrossel
  root.addEventListener("click", e => { if (swiped) { e.stopPropagation(); swiped = false; } }, true);

  delayTimer = setTimeout(start, delay);
  return stop;
}

/* ── Páginas (navegação por seção) ─────────────────────────────── */
function pageFromHash() {
  const h = decodeURIComponent(location.hash.replace("#", ""));
  if (h === "categories") return "listings";
  return PAGES.includes(h) ? h : "hero";
}

function showPage(id) {
  state.page = id;
  $$("section.page").forEach(s => s.classList.toggle("page-active", s.id === id));
  $$("[data-page]").forEach(a => a.classList.toggle("active", a.dataset.page === id));
  window.scrollTo({ top: 0, behavior: "instant" });
  updateStickySearch();
  observeFadeIns();
  if (id === "dashboard" && window.GBAnuncios) window.GBAnuncios.renderDashboard();
}

function navigate(id) {
  if (location.hash === `#${id}`) showPage(id);
  else location.hash = id; // dispara hashchange → showPage
}

function initPages() {
  window.addEventListener("hashchange", () => showPage(pageFromHash()));
  showPage(pageFromHash());
}

/* ── Barra de busca fixa ───────────────────────────────────── */
function updateStickySearch() {
  // Ao rolar: some o header e fica só a busca. Na página inicial, a busca
  // flutuante só entra quando a busca do hero sai da tela.
  const scrolled = window.scrollY > 40;
  document.body.classList.toggle("is-scrolled", scrolled);
  const show = scrolled && !(state.page === "hero" && state.heroSearchVisible);
  document.body.classList.toggle("sticky-search-on", show);
}

function syncCatPills() {
  $$(".cat-pill").forEach(p => p.classList.toggle("active", p.dataset.cat === state.cat));
}

/** Aplica uma busca vinda de qualquer campo e sincroniza os demais. */
function applySearch(v, { go = true } = {}) {
  state.q = v;
  state.cat = "Todos";
  ["#hero-search-input", "#sticky-search-input", "#listings-search-input"].forEach(sel => {
    const el = $(sel);
    // Não reescreve o campo em que o usuário está digitando
    if (el && el !== document.activeElement && el.value !== v) el.value = v;
  });
  syncCatPills();
  renderListings();
  if (go && state.page !== "listings") navigate("listings");
}

function initStickySearch() {
  const input = $("#sticky-search-input");
  const submit = () => applySearch(input.value.trim());
  input.addEventListener("keydown", e => e.key === "Enter" && submit());
  $("#sticky-search-btn").addEventListener("click", submit);
  // Filtra ao vivo quando já estiver na página de negócios
  input.addEventListener("input", () => {
    if (state.page === "listings") applySearch(input.value.trim(), { go: false });
  });

  const heroSearch = $(".hero-search");
  if (heroSearch) {
    new IntersectionObserver(([entry]) => {
      state.heroSearchVisible = entry.isIntersecting;
      updateStickySearch();
    }, { rootMargin: "-20px 0px 0px 0px" }).observe(heroSearch);
  }
}

/* ── Navbar ──────────────────────────────────────────────── */
function initNavbar() {
  window.addEventListener("scroll", () => {
    $("#navbar").classList.toggle("scrolled", window.scrollY > 8);
    updateStickySearch();
  }, { passive: true });
  $("#navbar").classList.toggle("scrolled", window.scrollY > 8);

  $("#theme-toggle").addEventListener("click", () =>
    setTheme(state.theme === "dark" ? "light" : "dark")
  );

  const ham = $("#nav-hamburger");
  const mob = $("#mobile-nav");
  const ov = $("#mobile-nav-overlay");
  ham.addEventListener("click", () => {
    mob.classList.add("open"); ov.classList.add("open");
  });
  ov.addEventListener("click", closeMob);
  $("#menu-close").addEventListener("click", closeMob);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMob(); });
  $$(".mobile-nav-link").forEach(a => a.addEventListener("click", closeMob));
}
function closeMob() {
  $("#mobile-nav").classList.remove("open");
  $("#mobile-nav-overlay").classList.remove("open");
}

/* ── Hero search ─────────────────────────────────────────── */
function initHero() {
  const input = $("#hero-search-input");
  const search = () => {
    const v = input.value.trim();
    if (!v) return;
    applySearch(v);
  };
  input.addEventListener("keydown", e => e.key === "Enter" && search());
  $("#hero-search-btn")?.addEventListener("click", search);
  $("#btn-explore")?.addEventListener("click", () => navigate("listings"));
  $("#btn-advertise")?.addEventListener("click", () => navigate("advertise"));
}

/* ── Categories (pills) ──────────────────────────────────── */
function initCategories() {
  const wrap = $("#categories-grid");
  if (!wrap) return;
  wrap.innerHTML = "";
  const counts = {};
  BUSINESSES.forEach(b => {
    counts[b.category] = (counts[b.category] || 0) + 1;
    if (b.isOffer) {
      counts["Ofereço"] = (counts["Ofereço"] || 0) + 1;
    }
  });

  CATEGORIES.forEach(cat => {
    let n = 0;
    if (cat === "Todos") n = BUSINESSES.length;
    else if (cat === "Ofereço") n = counts["Ofereço"] || 0;
    else n = counts[cat] || 0;

    const pill = document.createElement("button");
    pill.className = "cat-pill" + (cat === state.cat ? " active" : "") + (cat === "Ofereço" ? " cat-pill--offer" : "");
    pill.setAttribute("role", "listitem");
    pill.dataset.cat = cat;
    pill.innerHTML = `${cat} <span class="cat-pill-count">${n}</span>`;
    pill.addEventListener("click", () => {
      state.cat = cat;
      syncCatPills();
      renderListings();
      if (state.page !== "listings") navigate("listings");
    });
    wrap.appendChild(pill);
  });
}

/* ── Listings ────────────────────────────────────────────── */
function filtered() {
  let list = BUSINESSES.filter(b => {
    const matchCat = state.cat === "Todos"
      ? true
      : state.cat === "Ofereço"
        ? Boolean(b.isOffer)
        : b.category === state.cat;

    const matchQuery = !state.q || [b.name, b.category, b.desc, b.price || "", ...(b.tags || [])]
      .some(s => s.toLowerCase().includes(state.q.toLowerCase()));

    return matchCat && matchQuery;
  });

  if (window.GBLocal) list = GBLocal.filtrar(list);

  if (state.sort === "distance" && window.GBLocal && GBLocal.ativo()) GBLocal.ordenar(list);
  else if (state.sort === "featured") list.sort((a, b) => (b.featured || 0) - (a.featured || 0) || (b.rating || 0) - (a.rating || 0));
  else if (state.sort === "recent") list.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  else if (state.sort === "distance") list.sort((a, b) => (a.distanceMeters || 9999) - (b.distanceMeters || 9999));
  else if (state.sort === "rating") list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (state.sort === "reviews") list.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
  else if (state.sort === "views") list.sort((a, b) => (b.views || 0) - (a.views || 0));
  else list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function renderListings() {
  const grid = $("#listings-grid");
  const countEl = $("#listings-count");
  const list = filtered();

  const labelCount = state.cat === "Ofereço" ? "oferta" : "negócio";
  countEl.innerHTML = `<strong>${list.length}</strong> ${labelCount}${list.length !== 1 ? "s" : ""}`;

  // Para os carrosséis antigos antes de recriar os cards
  cardCarouselStops.splice(0).forEach(stop => stop());
  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state fade-in"><strong>Nenhum resultado</strong><p>Tente outro termo ou categoria.</p></div>`;
    observeFadeIns(); return;
  }

  list.forEach((b, i) => {
    const card = document.createElement("div");
    card.className = "biz-card fade-in" + (b.isOffer ? " biz-card--offer" : "");
    card.setAttribute("role", "listitem");
    card.style.transitionDelay = `${i * 40}ms`;
    // Remove o atraso após a entrada, para o hover responder na hora
    card.addEventListener("transitionend", () => { card.style.transitionDelay = ""; }, { once: true });

    const badgesHtml = b.isOffer
      ? `<div class="biz-img-badges">
           <span class="biz-badge biz-badge--offer">Ofereço</span>
           <span class="biz-badge biz-badge--sub">${b.category}</span>
         </div>`
      : `<span class="biz-badge">${b.category}</span>`;

    const topBadgeHtml = b.isOffer
      ? `<span class="biz-time-badge" title="Publicado em ${formatFullDate(b.publishedAt)}">
           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
             <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
           </svg>
           ${formatTimeAgo(b.publishedAt)}
         </span>`
      : (b.featured ? '<span class="biz-feat">Destaque</span>' : "");

    const priceOrRatingHtml = b.isOffer && b.price
      ? `<div class="biz-price">${b.price}</div>`
      : `<div class="biz-rating">${(b.rating || 5.0).toFixed(1)}</div>`;

    const metaTimeHtml = b.isOffer
      ? `<div class="biz-meta-row biz-time-meta">
           <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
             <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
           </svg>
           <span>Oferta de venda &bull; Publicado ${formatTimeAgo(b.publishedAt)}</span>
         </div>`
      : "";

    card.innerHTML = `
      <div class="biz-img">
        ${carouselHtml(imagesOf(b), b.name)}
        ${badgesHtml}
        ${topBadgeHtml}
      </div>
      <div class="biz-body">
        <div class="biz-header">
          <div class="biz-name">${b.name}</div>
          ${priceOrRatingHtml}
        </div>
        <div class="biz-desc">${b.desc}</div>
        <div class="biz-meta">
          ${metaTimeHtml}
          <div class="biz-meta-row">${b.address}</div>
          <div class="biz-meta-row">${(b.hours || "").split(",")[0]}</div>
        </div>
        <div class="biz-tags">${(b.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</div>
      </div>
      <div class="biz-distance">
        <div class="biz-distance-main">
          <span class="biz-distance-icon" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </span>
          <span class="biz-distance-text">${(window.GBLocal && GBLocal.rotulo(b)) || b.distance || "Perto de você"}</span>
        </div>
        <div class="biz-clicks" title="${(b.views || 0).toLocaleString('pt-BR')} cliques no card">
          <span class="biz-clicks-icon" aria-hidden="true">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </span>
          <span class="biz-clicks-text">${formatViews(b.views)} visitas</span>
        </div>
      </div>`;
    card.addEventListener("click", () => {
      registerCardClick(b, card);
      openModal(b);
    });
    grid.appendChild(card);
    // Autoplay com início escalonado para os cards não trocarem todos juntos
    cardCarouselStops.push(initCarousel($(".carousel", card), { interval: 3800, delay: (i % 6) * 450 }));
  });
  observeFadeIns();
}

function initToolbar() {
  const si = $("#listings-search-input");
  const ss = $("#sort-select");
  si.addEventListener("input", () => applySearch(si.value.trim(), { go: false }));
  ss.addEventListener("change", () => { state.sort = ss.value; renderListings(); });
}

/* ── Modal ───────────────────────────────────────────────── */
function starsText(r) {
  return `${r.toFixed(1)} / 5`;
}

function openModal(b) {
  state.modal = b;
  const ov = $("#modal-overlay");
  const m = $(".modal", ov);

  const modalCatLabel = b.isOffer
    ? `Ofereço &bull; ${b.category} &bull; ${b.offerType || "Venda no Bairro"}`
    : b.category;

  const priceBoxHtml = b.isOffer && b.price
    ? `<div class="modal-price-box">${b.price}</div>`
    : "";

  const offerInfoHtml = b.isOffer
    ? `
      <div class="modal-info-item">
        <span class="modal-info-label">Publicação</span>
        <span class="modal-info-val">Publicado ${formatTimeAgo(b.publishedAt)}</span>
      </div>
      ${b.price ? `
      <div class="modal-info-item">
        <span class="modal-info-label">Valor</span>
        <span class="modal-info-val" style="color:#34d399;font-weight:600">${b.price}</span>
      </div>` : ""}
    ` : "";

  m.innerHTML = `
    <div class="modal-img" style="position:relative">
      ${carouselHtml(imagesOf(b), b.name, "carousel--modal")}
      <div class="modal-img-grad"></div>
      <button class="modal-x" id="modal-x" aria-label="Fechar">✕</button>
    </div>
    <div class="modal-body">
      <p class="modal-cat">${modalCatLabel}</p>
      <h2 class="modal-name">${b.name}</h2>
      ${priceBoxHtml}
      <div class="modal-stars-row">
        <span class="modal-stars">${starsText(b.rating || 5.0)}</span>
        <span class="modal-reviews">&middot; ${b.reviews || 1} avaliações</span>
      </div>
      <p class="modal-desc">${b.desc}</p>
      <div class="modal-info">
        ${offerInfoHtml}
        <div class="modal-info-item">
          <span class="modal-info-label">Distância</span>
          <span class="modal-info-val">${(window.GBLocal && GBLocal.rotulo(b)) || b.distance || "Perto de você"}</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Visitas</span>
          <span class="modal-info-val">${(b.views || 0).toLocaleString('pt-BR')} cliques no card</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Endereço / Retirada</span>
          <span class="modal-info-val">${b.address}</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Telefone / WhatsApp</span>
          <span class="modal-info-val">${b.phone}</span>
        </div>
        <div class="modal-info-item">
          <span class="modal-info-label">Horário</span>
          <span class="modal-info-val">${b.hours || "A combinar"}</span>
        </div>
      </div>
      <div class="modal-tags">${(b.tags || []).map(t => `<span class="tag">${t}</span>`).join("")}</div>
      <div class="modal-actions">
        <a href="tel:${b.phone.replace(/\D/g, "")}" class="btn btn-white">Ligar</a>
        <a href="https://wa.me/55${b.phone.replace(/\D/g, "")}" target="_blank" rel="noopener" class="btn btn-dark">
          ${b.isOffer ? "Negociar no WhatsApp" : "WhatsApp"}
        </a>
        <button class="btn btn-ghost" id="copy-addr">Copiar endereço</button>
      </div>
    </div>`;

  ov.classList.add("open");
  document.body.style.overflow = "hidden";

  modalCarouselStop?.();
  modalCarouselStop = initCarousel($(".carousel", m), { interval: 4200 });

  $("#modal-x").addEventListener("click", closeModal);
  $("#copy-addr")?.addEventListener("click", () => {
    navigator.clipboard.writeText(b.address).then(() => toast("Endereço copiado"));
  });
  ov.onclick = e => { if (e.target === ov) closeModal(); };
}

function closeModal() {
  $("#modal-overlay").classList.remove("open");
  document.body.style.overflow = "";
  state.modal = null;
  modalCarouselStop?.();
  modalCarouselStop = null;
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && state.modal) closeModal();
});

/* ── Form ────────────────────────────────────────────────── */
function initForm() {
  // A submissão com banco de dados Supabase e upload de fotos é gerenciada em anuncios.js
}

function validateForm(form) {
  let ok = true;
  $$("[required]", form).forEach(inp => {
    const err = form.querySelector(`[data-error="${inp.name}"]`);
    if (!inp.value.trim()) {
      inp.classList.add("error");
      if (err) err.textContent = "Campo obrigatório.";
      ok = false;
    } else {
      inp.classList.remove("error");
      if (err) err.textContent = "";
    }
  });
  const em = form.querySelector('[type="email"]');
  if (em && em.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value)) {
    em.classList.add("error");
    const err = form.querySelector('[data-error="email"]');
    if (err) err.textContent = "E-mail inválido.";
    ok = false;
  }
  return ok;
}

/* ── Toast ───────────────────────────────────────────────── */
function toast(msg) {
  const c = $("#toast-container");
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.classList.add("hide"); setTimeout(() => t.remove(), 250); }, 3000);
}

/* ── Intersection observer ───────────────────────────────── */
function observeFadeIns() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  $$(".fade-in:not(.visible)").forEach(el => io.observe(el));
}

/* ── Counter animation ───────────────────────────────────── */
function initCounters() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.target);
      let n = 0;
      const step = Math.ceil(target / 60);
      const timer = setInterval(() => {
        n = Math.min(n + step, target);
        el.textContent = n.toLocaleString("pt-BR");
        if (n >= target) clearInterval(timer);
      }, 16);
      io.unobserve(el);
    });
  }, { threshold: .5 });
  $$(".counter-target").forEach(el => io.observe(el));
}

/* ── Bootstrap ───────────────────────────────────────────── */
document.addEventListener("gb-local", () => renderListings());

document.addEventListener("DOMContentLoaded", () => {
  setTheme(state.theme);
  initNavbar();
  initHero();
  initStickySearch();
  initCategories();
  initToolbar();
  renderListings();
  initForm();
  initCounters();
  initPages();
  observeFadeIns();
});
