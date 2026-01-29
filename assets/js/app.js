document.addEventListener("DOMContentLoaded", () => {
  // --- 1. AYARLAR ---
  const API_BASE_URL = "http://localhost:5000/api";
  const IMAGE_BASE_URL = "http://localhost:5000";

  // Yıl bilgisini güncelle
  const yilEl = document.getElementById("yil");
  if (yilEl) yilEl.textContent = new Date().getFullYear();

  // --- GLOBAL DEĞİŞKENLER (Veri Havuzu) ---
  let GLOBAL_ARTICLES = [];
  let GLOBAL_CATEGORIES = [];

  // --- 2. STATİK VERİLERİ YÜKLE ---
  if (typeof SITE_DATA !== "undefined") {
    renderGrid("svc", SITE_DATA.homeServices, "s2");
    renderGrid("allServices", SITE_DATA.allServices, "s2");
    // renderGrid("teamGrid", SITE_DATA.team, "person"); // Bu satır artık kullanılmıyor, yeni şema var
    renderGrid("eduGrid", SITE_DATA.education, "card", "/egitim/");
  }

  // --- 3. DİNAMİK VERİ FONKSİYONU ---
  async function loadDynamicContent() {
    try {
      async function fetchData(endpoint) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error("Veri alınamadı");
        const json = await response.json();
        return json.data || json;
      }

      if (GLOBAL_ARTICLES.length === 0 || GLOBAL_CATEGORIES.length === 0) {
        const [categories, articles] = await Promise.all([
          fetchData("/Categories"),
          fetchData("/Articles"),
        ]);
        GLOBAL_CATEGORIES = categories;
        GLOBAL_ARTICLES = articles;
      }

      const filterByCat = (catName) => {
        if (!GLOBAL_CATEGORIES || !GLOBAL_ARTICLES) return [];
        const catObj = GLOBAL_CATEGORIES.find((c) =>
          (c.name || c.Name).toLowerCase().includes(catName.toLowerCase())
        );
        if (!catObj) return [];
        const catId = catObj.id || catObj.Id;
        return GLOBAL_ARTICLES.filter(
          (a) => (a.categoryId || a.CategoryId) === catId
        ).sort((a, b) => (b.id || b.Id) - (a.id || a.Id));
      };

      const sirkulerData = filterByCat("Sirküler");
      const yargiData = filterByCat("Yargı");
      const seminerData = filterByCat("Seminer");

      const mapToFrontend = (apiList) => {
        return apiList.map((item) => {
          const title = item.title || item.Title;
          const content = item.content || item.Content || "";
          const desc = content.substring(0, 100) + "...";
          let img = item.coverImageUrl || item.CoverImageUrl;
          if (img && !img.startsWith("http")) img = IMAGE_BASE_URL + img;
          if (!img) img = "assets/img/default.jpg";
          const slug = item.slug || item.Slug;
          return [title, desc, img, slug];
        });
      };

      if (document.getElementById("circGrid"))
        renderGrid("circGrid", mapToFrontend(sirkulerData), "card", "/sirkuler/");
      if (document.getElementById("caseGrid"))
        renderGrid("caseGrid", mapToFrontend(yargiData), "card", "/yargi-kararlari/");
      if (document.getElementById("semGrid"))
        renderGrid("semGrid", mapToFrontend(seminerData), "card", "/seminerler/");

      const combinedNews = [];
      const addToSlider = (list, badgeText, catSlug) => {
        list.slice(0, 2).forEach((item) => {
          let img = item.coverImageUrl || item.CoverImageUrl;
          if (img && !img.startsWith("http")) img = IMAGE_BASE_URL + img;
          if (!img) img = "assets/img/default.jpg";

          combinedNews.push({
            badge: badgeText,
            category: catSlug,
            title: item.title || item.Title,
            desc: (item.content || item.Content || "").substring(0, 80) + "...",
            img: img,
            slug: item.slug || item.Slug,
            date: "GÜNCEL",
          });
        });
      };
      addToSlider(seminerData, "SEMİNER", "seminerler");
      addToSlider(sirkulerData, "SİRKÜLER", "sirkuler");
      addToSlider(yargiData, "YARGI", "yargi-kararlari");
      renderMixedSlider("track", combinedNews);
    } catch (err) {
      console.error("Veri güncelleme hatası:", err);
    }
  }

  loadDynamicContent();
  setInterval(loadDynamicContent, 30000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadDynamicContent();
  });

  initMobileMenu();
  initDropdowns();
  initRouter(loadDynamicContent, () => GLOBAL_ARTICLES, IMAGE_BASE_URL);
  initModals();
  initHeroSlider();
  initSloganEffect();
  initStatsCounter();
  initNewsCarousel();
  initSmartNavbar();
});

// --- RENDER GRID ---
function renderGrid(elementId, data, type, baseUrl = "") {
  const el = document.getElementById(elementId);
  if (!el || !data) return;

  if (type === "s2") {
    el.innerHTML = data
      .map(([t, d, img, slug]) => {
        const href = slug ? `/hizmetler/${slug}` : `/hizmetler`;
        return `
            <article class="s2-card">
              <a href="${href}" style="display:block;color:inherit;text-decoration:none">
                <div class="s2-media"><img loading="lazy" src="${img}" alt="${t}"></div>
                <div class="s2-body"><h3 class="s2-title">${t}</h3><p class="s2-desc">${d}</p></div>
              </a>
            </article>`;
      })
      .join("");
  } else if (type === "person") {
    el.innerHTML = data
      .map(
        ([n, t, img]) => `
        <article class="card person">
            <div class="media"><img loading="lazy" src="${img}" alt="${n}"></div>
            <div class="body"><h3 class="t">${n}</h3><div class="s">${t}</div></div>
        </article>`
      )
      .join("");
  } else {
    el.innerHTML = data
      .map(([t, s, img, slug]) => {
        let wrapStart = "",
          wrapEnd = "";
        if (slug && baseUrl) {
          wrapStart = `<a href="${baseUrl}${slug}" style="display:block;color:inherit;text-decoration:none">`;
          wrapEnd = `</a>`;
        }
        return `
            <article class="card">
              ${wrapStart}
              <div class="media"><img loading="lazy" src="${img}" alt="${t}" style="object-fit: cover;"></div>
              <div class="body"><h3 class="t">${t}</h3><p class="s">${s}</p></div>
              ${wrapEnd}
            </article>`;
      })
      .join("");
  }
}

// --- INIT ROUTER (GÜNCELLENDİ: History API) ---
function initRouter(loadDataFunc, getArticlesFunc, imgBaseUrl) {
  const baseViews = {
    "/": "home",
    "/hizmetler": "hizmetler",
    "/kurumsal/kadromuz": "kadromuz",
    "/egitim": "egitim",
    "/sirkuler": "sirkuler",
    "/yargi-kararlari": "yargi-kararlari",
    "/seminerler": "seminerler",
    "/hakkimizda": "home",
    "/misyon-vizyon": "home",
    "/kurumsal": "kurumsal",
    "/hakkimizda": "kurumsal",
    "/misyon-vizyon": "kurumsal",
    "/kurumsal/kadromuz": "kurumsal",
    "/kurumsal/hakkimizda": "kurumsal",
  };

  async function renderBlogDetail(type, slug) {
    const els = {
      date: document.getElementById("blogDate"),
      title: document.getElementById("blogTitle"),
      img: document.getElementById("blogImage"),
      body: document.getElementById("blogBody"),
      sliderArea: document.getElementById("blogSliderArea"),
    };

    let allArticles = getArticlesFunc();

    if (!allArticles || allArticles.length === 0) {
      els.title.textContent = "Yükleniyor...";
      await loadDataFunc();
      allArticles = getArticlesFunc();
    }

    const article = allArticles.find(
      (a) => (a.slug || a.Slug || "").toLowerCase() === slug.toLowerCase()
    );

    if (!article) {
      els.title.textContent = "İçerik Bulunamadı";
      els.body.innerHTML =
        "<p>Aradığınız sayfa silinmiş veya adresi değişmiş olabilir.</p>";
      if (els.img) els.img.style.display = "none";
      updateSEO("İçerik Bulunamadı - Çağlayan YMM", "Aradığınız içerik bulunamadı.");
      return;
    }

    const pageTitle = article.title || article.Title;
    const pageDesc = (article.content || article.Content || "").substring(0, 160).replace(/<[^>]*>?/gm, "") + "...";
    updateSEO(pageTitle + " - Çağlayan YMM", pageDesc);

    if (els.date) els.date.textContent = "Güncel";
    if (els.title) els.title.textContent = pageTitle;

    if (els.img) {
      let imgSrc = article.coverImageUrl || article.CoverImageUrl;
      if (imgSrc && !imgSrc.startsWith("http")) imgSrc = imgBaseUrl + imgSrc;
      if (!imgSrc) imgSrc = "assets/img/default.jpg";
      els.img.src = imgSrc;
      els.img.style.display = "block";
    }

    if (els.body) els.body.innerHTML = article.content || article.Content;
    if (els.sliderArea) els.sliderArea.style.display = "none";
  }

  function renderServiceDetail(slug) {
    if (!SITE_DATA.serviceDetails) return;
    const data = SITE_DATA.serviceDetails[slug];
    const els = {
      title: document.getElementById("svcTitle"),
      lead: document.getElementById("svcLead"),
      meta: document.getElementById("svcMeta"),
      main: document.getElementById("svcMain"),
      side: document.getElementById("svcSide"),
    };
    if (!data) {
      if (els.title) els.title.textContent = "Hizmet Bulunamadı";
      return;
    }

    if (els.title) els.title.textContent = data.title;
    if (els.lead) els.lead.textContent = data.lead;

    const seoDesc = data.lead || "Hizmet detayları ve kapsamı.";
    updateSEO(data.title + " - Hizmetlerimiz", seoDesc, data.image);

    if (els.meta)
      els.meta.innerHTML = (data.tags || [])
        .map((t) => `<span>${t}</span>`)
        .join("");
    if (els.main) {
      els.main.innerHTML =
        (data.sections || [])
          .map(
            (sec) => `
            <section><h3>${sec.heading
              }</h3><ul class="service-detail-list">${sec.items
                .map((i) => `<li>${i}</li>`)
                .join("")}</ul></section>
        `
          )
          .join("") +
        `<div class="mt-24"><a href="/hizmetler" class="btn" style="text-decoration:none;">← Tüm hizmetlere dön</a></div>`;
    }
    if (els.side) {
      const side = data.side || {};
      els.side.innerHTML = `<img src="${data.image}"> <small>${side.note
        }</small> ${side.bullets.map((b) => `<strong>• ${b}</strong>`).join("")}`;
    }
  }

  function renderEducationDetail(slug) {
    if (!SITE_DATA.educationDetails) return;
    const data = SITE_DATA.educationDetails[slug];

    const els = {
      title: document.getElementById("eduTitle"),
      lead: document.getElementById("eduLead"),
      meta: document.getElementById("eduMeta"),
      main: document.getElementById("eduMain"),
      side: document.getElementById("eduSide"),
    };

    if (!data) {
      if (els.title) els.title.textContent = "Eğitim Bulunamadı";
      return;
    }

    if (els.title) els.title.textContent = data.title;
    if (els.lead) els.lead.textContent = data.lead;

    const seoDesc = data.lead || "Eğitim detayları ve kapsamı.";
    updateSEO(data.title + " - Eğitim Hizmetleri", seoDesc, data.image);

    if (els.meta)
      els.meta.innerHTML = (data.tags || [])
        .map((t) => `<span>${t}</span>`)
        .join("");

    if (els.main) {
      els.main.innerHTML =
        (data.sections || [])
          .map(
            (sec) => `
              <section>
                  <h3>${sec.heading}</h3>
                  <ul class="service-detail-list">
                      ${sec.items.map((i) => `<li>${i}</li>`).join("")}
                  </ul>
              </section>
          `
          )
          .join("") +
        `<div class="mt-24">
              <a href="/egitim" class="btn" style="text-decoration:none;">← Eğitim listesine dön</a>
           </div>`;
    }

    if (els.side) {
      const side = data.side || {};
      els.side.innerHTML = `
              <img src="${data.image}" alt="${data.title}">
              <small>${side.note}</small>
              ${side.bullets.map((b) => `<strong>• ${b}</strong>`).join("")}
              <div class="mt-16">
                  <button class="nav-cta" style="width:100%" data-modal="#contactModal">Kayıt Ol</button>
              </div>
          `;
    }
  }

  const handleLocationChange = async () => {
    const path = location.pathname;
    const decodedPath = decodeURIComponent(path);
    const parts = decodedPath.split("/").filter(Boolean);

    let viewId = "home";
    let subSlug = null;
    let blogType = null;

    if (parts.length > 0) {
      const seg1 = parts[0];
      const seg2 = parts[1];

      if (seg1 === "hizmetler") {
        if (seg2) {
          viewId = "hizmet-detay";
          subSlug = seg2;
        } else {
          viewId = "hizmetler";
          updateSEO("Hizmetlerimiz - Çağlayan YMM", "Sunduğumuz tüm vergi, denetim ve danışmanlık hizmetlerini inceleyin.");
        }
      } else if (seg1 === "egitim") {
        if (seg2) {
          viewId = "egitim-detay";
          subSlug = seg2;
        } else {
          viewId = "egitim";
          updateSEO("Eğitimler - Çağlayan YMM", "Vergi ve muhasebe alanındaki güncel eğitimlerimiz.");
        }
      } else if (seg1 === "kurumsal") {
        viewId = "kurumsal";
        updateSEO("Kurumsal - Hakkımızda", "Erol Çağlayan ve ekibi hakkında detaylı bilgiler.");
      } else if (["sirkuler", "yargi-kararlari", "seminerler"].includes(seg1)) {
        if (seg2) {
          viewId = "detay-blog";
          blogType = seg1;
          subSlug = seg2;
        } else {
          viewId = seg1;
          let pageName = seg1.charAt(0).toUpperCase() + seg1.slice(1);
          if (seg1 === 'yargi-kararlari') pageName = "Yargı Kararları";
          updateSEO(`${pageName} - Güncel Bilgiler`, `En güncel ${pageName.toLowerCase()} ve duyurular.`);
        }
      } else {
        if (decodedPath === "/hakkimizda" || decodedPath === "/misyon-vizyon") {
          viewId = "kurumsal";
          updateSEO("Kurumsal - Çağlayan YMM", "Misyon, vizyon ve kurumsal değerlerimiz.");
        } else {
          viewId = baseViews[decodedPath] || "home";
          if (viewId === "home") updateSEO("Çağlayan Yeminli Mali Müşavirlik", "Kurumsal vergi ve denetim çözümleri.");
        }
      }
    } else {
      viewId = "home";
      updateSEO("Çağlayan Yeminli Mali Müşavirlik", "Kurumsal vergi ve denetim çözümleri.");
    }

    document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
    const targetView = document.getElementById("view-" + viewId);
    if (targetView) {
      targetView.classList.add("is-active");
    } else {
      const homeView = document.getElementById("view-home");
      if (homeView) homeView.classList.add("is-active");
    }

    if (viewId === "hizmet-detay") renderServiceDetail(subSlug);
    if (viewId === "egitim-detay") renderEducationDetail(subSlug);
    if (viewId === "detay-blog") await renderBlogDetail(blogType, subSlug);
    if (viewId === "kurumsal") renderCorporatePage(decodedPath);

    const menu = document.getElementById("menu");
    if (menu) {
      menu.querySelectorAll(".dropdown").forEach((d) => (d.style.display = "none"));
      menu.querySelectorAll('[aria-expanded="true"]').forEach((b) => b.setAttribute("aria-expanded", "false"));
    }

    if (decodedPath === "/hakkimizda") {
      setTimeout(() => {
        const s = document.getElementById("hakkimizda-sec");
        if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href) return;
    if (href.startsWith("/") && !href.startsWith("//")) {
      e.preventDefault();
      try {
        history.pushState(null, "", href);
        handleLocationChange();
      } catch (err) {
        console.warn("History API hatası:", err);
      }
    }
  });

  window.addEventListener("popstate", handleLocationChange);
  handleLocationChange();
}

// --- SEO HELPER ---
function updateSEO(title, description, image) {
  document.title = title;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute("content", description);

  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute("content", title);

  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute("content", description);

  if (image) {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute("content", image);

    const twImage = document.querySelector('meta[property="twitter:image"]');
    if (twImage) twImage.setAttribute("content", image);
  }

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute("content", window.location.href);
}

// --- DİĞER MODÜLLER ---

// Mobile Menu Toggle
function initMobileMenu() {
  const mobileToggle = document.getElementById("mobileMenuToggle");
  const navMain = document.getElementById("navMain");

  if (!mobileToggle || !navMain) return;

  mobileToggle.addEventListener("click", () => {
    const isOpen = navMain.classList.contains("open");

    if (isOpen) {
      navMain.classList.remove("open");
      mobileToggle.classList.remove("active");
      mobileToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    } else {
      navMain.classList.add("open");
      mobileToggle.classList.add("active");
      mobileToggle.setAttribute("aria-expanded", "true");
      document.body.style.overflow = "hidden";
    }
  });

  // Close mobile menu when clicking on a link
  navMain.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navMain.classList.remove("open");
      mobileToggle.classList.remove("active");
      mobileToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    });
  });

  // Close mobile menu on window resize (if going from mobile to desktop)
  let prevWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    const currentWidth = window.innerWidth;
    if (prevWidth < 768 && currentWidth >= 768) {
      navMain.classList.remove("open");
      mobileToggle.classList.remove("active");
      mobileToggle.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    }
    prevWidth = currentWidth;
  });
}

function initDropdowns() {
  const menu = document.getElementById("menu");
  if (!menu) return;
  const toggles = [...menu.querySelectorAll("li > button")];

  const closeAll = () => {
    toggles.forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
      const dd = btn.nextElementSibling;
      if (dd) {
        dd.style.display = "none";
        dd.classList.remove("open");
      }
    });
  };

  toggles.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const dd = btn.nextElementSibling;
      const isOpen = btn.getAttribute("aria-expanded") === "true";

      closeAll();

      if (!isOpen && dd) {
        btn.setAttribute("aria-expanded", "true");
        dd.style.display = "block";
        dd.classList.add("open");
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) closeAll();
  });
}

function initModals() {
  const modalButtons = document.querySelectorAll("[data-modal]");
  const closeButtons = document.querySelectorAll("[data-close]");
  const openModal = (id) => {
    const m = document.querySelector(id);
    if (m) {
      m.classList.add("is-open");
      const i = m.querySelector("input");
      if (i) i.focus();
    }
  };

  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-modal]");
    if (btn) {
      e.preventDefault();
      openModal(btn.getAttribute("data-modal"));
    }
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const m = btn.closest(".modal");
      if (m) m.classList.remove("is-open");
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
      document
        .querySelectorAll(".modal.is-open")
        .forEach((m) => m.classList.remove("is-open"));
  });
  document.querySelectorAll(".modal").forEach((m) => {
    m.addEventListener("click", (e) => {
      if (e.target === m) m.classList.remove("is-open");
    });
  });
}

function initHeroSlider() {
  const root = document.querySelector(".hero");
  if (!root) return;
  const tpl = document.getElementById("slides");
  if (tpl && root.querySelectorAll(".slide").length < 2) {
    root.append(...tpl.content.cloneNode(true).children);
  }
  const slides = [...root.querySelectorAll(".slide")];
  if (slides.length === 0) return;
  const dotsWrap = slides[0].querySelector(".dots");
  if (dotsWrap) {
    dotsWrap.innerHTML = "";
    slides.forEach((_, i) => {
      const d = document.createElement("div");
      d.className = "dot" + (i === 0 ? " is-active" : "");
      d.dataset.idx = i;
      dotsWrap.appendChild(d);
    });
    dotsWrap.addEventListener("click", (e) => {
      const d = e.target.closest(".dot");
      if (!d) return;
      stop();
      showSlide(+d.dataset.idx);
      play();
    });
  }
  let idx = 0,
    timer;
  function showSlide(i) {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, k) => (s.style.display = k === idx ? "grid" : "none"));
    if (dotsWrap)
      dotsWrap
        .querySelectorAll(".dot")
        .forEach((d, k) => d.classList.toggle("is-active", k === idx));
  }
  function next() {
    showSlide(idx + 1);
  }
  function play() {
    stop();
    timer = setInterval(next, 6000);
  }
  function stop() {
    if (timer) clearInterval(timer);
  }
  showSlide(0);
  play();
}

function initSloganEffect() {
  const sec = document.querySelector(".slogan-sec");
  if (!sec) return;
  sec.addEventListener("mousemove", (e) => {
    const r = sec.getBoundingClientRect();
    sec.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
    sec.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
  });
}

function initStatsCounter() {
  const nums = document.querySelectorAll(".num");
  if (nums.length === 0) return;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          nums.forEach((el) => {
            const t = +el.dataset.target;
            const suffix = el.getAttribute("data-suffix") || "";
            let n = 0;
            const step = Math.ceil(t / 40);
            const tick = () => {
              n += step;
              if (n >= t) n = t;
              el.textContent = n + suffix;
              if (n < t) requestAnimationFrame(tick);
            };
            tick();
          });
          obs.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );
  const statsSec = document.querySelector(".stats");
  if (statsSec) obs.observe(statsSec);
}

function initNewsCarousel() {
  const box = document.getElementById("newsCarousel");
  if (!box) return;
  const track = document.getElementById("track");
  const prev = box.querySelector(".prev"),
    next = box.querySelector(".next");
  if (!track || !prev || !next) return;
  function go(dir) {
    const w = 340 + 18;
    track.scrollBy({ left: dir * w, behavior: "smooth" });
  }
  prev.addEventListener("click", () => go(-1));
  next.addEventListener("click", () => go(1));
}

function initSmartNavbar() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  let lastScrollY = window.scrollY;
  window.addEventListener("scroll", () => {
    const currentScrollY = window.scrollY;
    if (currentScrollY <= 0) {
      nav.classList.remove("nav-hidden");
      lastScrollY = currentScrollY;
      return;
    }
    if (currentScrollY > lastScrollY && currentScrollY > 64) {
      nav.classList.add("nav-hidden");
    } else if (currentScrollY < lastScrollY) {
      nav.classList.remove("nav-hidden");
    }
    lastScrollY = currentScrollY;
  });
}

function renderMixedSlider(elementId, data) {
  const el = document.getElementById(elementId);
  if (!el || !data) return;

  const badgeColors = {
    SİRKÜLER: "#acc136",
    YARGI: "#005081",
    SEMİNER: "#03b6af",
  };

  el.innerHTML = data
    .map((item) => {
      const bgColor = badgeColors[item.badge] || "#03b6af";
      const href = `/${item.category}/${item.slug}`;

      return `
      <article class="post">
        <a href="${href}" style="display:block; text-decoration:none; color:inherit; height:100%;">
          <div class="media">
            <span class="badge" style="background: ${bgColor}">${item.badge}</span>
            <span class="date">${item.date}</span>
            <img loading="lazy" src="${item.img}" alt="${item.title}" style="object-fit: cover;" />
          </div>
          <div class="body">
            <h3>${item.title}</h3>
            <p>${item.desc}</p>
          </div>
        </a>
      </article>
    `;
    })
    .join("");
}

function renderCorporatePage(hash) {
  if (SITE_DATA.corporate) {
    const c = SITE_DATA.corporate;
    const elAboutTitle = document.getElementById("corpAboutTitle");
    const elAboutText = document.getElementById("corpAboutText");
    const elAboutImg = document.getElementById("corpAboutImg");
    if (elAboutTitle) elAboutTitle.textContent = c.about.title;
    if (elAboutText) elAboutText.innerHTML = c.about.text;
    if (elAboutImg) elAboutImg.src = c.about.image;

    const elMisT = document.getElementById("corpMissionTitle");
    const elMisD = document.getElementById("corpMissionText");
    const elVizT = document.getElementById("corpVisionTitle");
    const elVizD = document.getElementById("corpVisionText");

    if (elMisT) elMisT.textContent = c.mission.title;
    if (elMisD) elMisD.textContent = c.mission.text;
    if (elVizT) elVizT.textContent = c.vision.title;
    if (elVizD) elVizD.textContent = c.vision.text;
  }

  // --- ORGANİZASYON ŞEMASI GÜNCELLEMESİ (Birebir Tasarım) ---
  // app.js içinde renderCorporatePage fonksiyonunu bulun ve treeContainer.innerHTML kısmını bununla değiştirin:

  const treeContainer = document.getElementById("orgTree");
  if (treeContainer) {
    // --- YENİ TASARIM: DİKİNE DİKDÖRTGEN & OVAL KÖŞELER ---
    treeContainer.innerHTML = `
      <div class="org-tree">
          <div class="level-1">
              <div class="node">
                  <img src="assets/img/personel_photos/EROL ÇAĞLAYAN.webp" alt="Erol Çağlayan" 
                       style="width: 110px; height: 140px; object-fit: cover; object-position: top center; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                  <div class="node-content">
                      <div class="node-title">Erol Çağlayan</div>
                      <div class="node-role">Yeminli Mali Müşavir</div>
                  </div>
              </div>
          </div>
          
          <div class="line-vertical"></div>
          
          <div class="level-2">
              <div class="node">
                  <img src="assets/img/personel_photos/LEYLA CANKALELİ_01.webp" alt="Leyla Cankaleli" 
                       style="width: 110px; height: 140px; object-fit: cover; object-position: top center; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                  <div class="node-content">
                      <div class="node-title">Leyla Cankaleli</div>
                      <div class="node-role">Genel Müdür</div>
                  </div>
              </div>
          </div>
          
          <div class="line-vertical"></div>
          <div class="connector-bar"></div>
          
          <div class="dept-wrapper">

              <div class="dept-col">
                  <div class="dept-box">
                      <div class="dept-header">TAM TASDİK</div>
                      <div class="staff-list">
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/TOLGA ÇELİK.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Tolga Çelik</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/BİLAL MUTLU.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Enes Bilal Mutlu</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/ABDULBAKİ DEMİRER.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Abdulbaki Demirer</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/DR. HÜSEYİN UKUŞLU.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Dr. Hüseyin Ukuşlu</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/ŞEMSETTİN YASAK.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Şemsettin Yasak</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/YAVUZ SELİM BİNGÖL.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Yavuz Selim Bingöl</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/M.FURKAN KEYVANKLI.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Muhammet Furkan Keyvanklı</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/HÜSEYİN EMİR PULAT.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Hüseyin Emir Pulat</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/SERAP PADAR.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Serap Padar</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/YASEMİN DOĞRAMACI.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Yasemin Doğramacı</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div class="dept-col">
                  <div class="dept-box">
                      <div class="dept-header">İNCELEME</div>
                      <div class="staff-list">
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/OSMAN DİKBAŞ.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Osman Dikbaş</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/DİLAN ŞİMŞEK.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Dilan Şimşek</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div class="dept-col">
                  <div class="dept-box">
                      <div class="dept-header">DENETİM</div>
                      <div class="staff-list">
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/MURAT ÇOLAK.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Murat Çolak</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div class="dept-col">
                  <div class="dept-box">
                      <div class="dept-header">İADE</div>
                      <div class="staff-list">
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/SALİH SARI.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Salih Sarı</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/BÜLENT ERDOĞAN.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Bülent Erdoğan</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/AHMET BALIKLIKAYA.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Ahmet Balıklıkaya</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/HİLAL GÖKÇE YILDIRIM.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Hilal Yıldırım</div>
                          </div>
                          
                          <div class="sub-dept-divider">
                              <div class="arrow-down">↓</div>
                              <div class="sub-dept-badge">KARŞIT</div>
                          </div>

                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/ELİF ARPAT.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Elif Arpat</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/DİLAN ZORER.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Dilan Zorer</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/FURKAN SANCAKTUTAN.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Furkan Sancaktutan</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div class="dept-col">
                  <div class="dept-box">
                      <div class="dept-header">HUKUK</div>
                      <div class="staff-list">
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/ASENA BABADAĞI.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Av. Asena Babadağı</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div class="dept-col">
                  <div class="dept-box">
                      <div class="dept-header">FİNANS</div>
                      <div class="staff-list">
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/ALİ COŞKUN.webp" style="width: 70px; height: 90px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Ali Coşkun</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div class="dept-col">
                  <div class="dept-box">
                      <div class="dept-header">İDARİ HİZMETLER</div>
                      <div class="staff-list">
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/ZAHİDE KARAKAYA.webp" style="width: 70px; height: 80px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Zahide Karakaya</div>
                          </div>
                          <div class="staff-item">
                            <img class="staff-img" src="assets/img/personel_photos/TAMAY KAYA.webp" style="width: 70px; height: 80px; object-fit: cover; object-position: center; border-radius: 8px;">
                            <div class="staff-name">Tamay Kaya</div>
                          </div>
                      </div>
                  </div>
              </div>

          </div>
      </div>
    `;
  }

  setTimeout(() => {
    let targetId = "";
    if (hash.includes("kadromuz")) targetId = "sec-kadromuz";
    else if (hash.includes("misyon")) targetId = "sec-misyon";
    else if (hash.includes("hakkimizda")) targetId = "sec-hakkimizda";

    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
}