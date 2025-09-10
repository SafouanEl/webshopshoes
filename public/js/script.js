"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // 🎞️ Promo bar scroll
  const track = document.getElementById("promo-track");
  if (track) {
    const parent = track.parentElement;
    const originalWidth = track.offsetWidth;
    const content = track.innerHTML;
    while (track.offsetWidth < parent.offsetWidth * 2)
      track.innerHTML += content;
    let pos = 0,
      speed = 1;
    const anim = () => {
      pos -= speed;
      track.style.transform = `translateX(${pos}px)`;
      if (Math.abs(pos) >= originalWidth) pos = 0;
      requestAnimationFrame(anim);
    };
    anim();
  }

  // Hamburger
  const hamburger = document.getElementById("hamburger-btn");
  const mobileNav = document.getElementById("mobile-nav");
  const closeNav = document.getElementById("close-nav");
  hamburger?.addEventListener("click", () =>
    mobileNav.classList.toggle("active")
  );
  closeNav?.addEventListener("click", () =>
    mobileNav.classList.remove("active")
  );

  // Search mobile
  const searchToggle = document.getElementById("search-toggle");
  const mobileSearch = document.getElementById("mobile-search-bar");
  searchToggle?.addEventListener("click", (e) => {
    e.preventDefault();
    mobileSearch.classList.toggle("active");
    mobileSearch.querySelector("input")?.focus();
  });
  document.addEventListener("click", (e) => {
    if (!mobileSearch.contains(e.target) && !searchToggle.contains(e.target)) {
      mobileSearch.classList.remove("active");
    }
  });

  // Filter mobile
  const openFilter = document.getElementById("open-filter");
  const closeFilter = document.getElementById("close-filter");
  const overlay = document.getElementById("mobile-filter");
  openFilter?.addEventListener("click", () => {
    overlay.classList.add("active");
    overlay.style.display = "block";
  });
  closeFilter?.addEventListener("click", () => {
    overlay.classList.remove("active");
    setTimeout(() => (overlay.style.display = "none"), 300);
  });

  // Filtering + pagination
  const brandCbs = document.querySelectorAll(".brand-filter");
  const modelCbs = document.querySelectorAll(".model-filter");
  const allCbs = [...brandCbs, ...modelCbs];
  const pageTitle = document.getElementById("page-title");

  // =======================
  // APPLY FILTERS MET URL
  // =======================
  function applyFilters(page = 1) {
    const brands = [...brandCbs]
      .filter((cb) => cb.checked)
      .map((cb) => cb.value.toLowerCase());
    const models = [...modelCbs]
      .filter((cb) => cb.checked)
      .map((cb) => cb.value.toLowerCase());

    // 👇 Bouw nieuwe SHOP url voor adresbalk
    const shopUrl = new URL("/shop", window.location.origin);
    if (brands.length) shopUrl.searchParams.set("brands", brands[0]);

    if (models.length === 1) shopUrl.searchParams.set("model", models[0]);

    const gender = new URLSearchParams(window.location.search).get("gender");
    if (gender) shopUrl.searchParams.set("gender", gender.toLowerCase());
    shopUrl.searchParams.set("page", page);

    // ✅ Update adresbalk zonder reload
    window.history.pushState({}, "", shopUrl);

    // 👇 API request met dezelfde query
    const apiUrl = new URL("/api/sneakers", window.location.origin);
    shopUrl.searchParams.forEach((v, k) => apiUrl.searchParams.set(k, v));

    fetch(apiUrl)
      .then((r) => r.json())
      .then((data) => {
        updateProductList(data.producten);
        updatePageTitle(brands, models, data.totalFiltered);
        updatePagination(data.totalPages, page);
      });
  }

  // =======================
  // BACK/FORWARD BUTTON
  // =======================
  window.addEventListener("popstate", () => {
    const params = new URLSearchParams(window.location.search);
    const page = parseInt(params.get("page")) || 1;

    // Filters terugzetten in checkboxes
    const brand = params.get("brand");
    const model = params.get("model");

    brandCbs.forEach((cb) => (cb.checked = cb.value.toLowerCase() === brand));
    modelCbs.forEach((cb) => (cb.checked = cb.value.toLowerCase() === model));

    // 👇 API opnieuw doen
    fetch(`/api/sneakers${window.location.search}`)
      .then((r) => r.json())
      .then((data) => {
        updateProductList(data.producten);
        updatePageTitle([], [], data.totalFiltered);
        updatePagination(data.totalPages, page);
      });
  });

  function updateProductList(items) {
    const grid = document.getElementById("product-grid");
    grid.innerHTML = items
      .map(
        (s) => `
      <a href="/product/${s.id}" class="product-tile">
        <img src="${s.image}" alt="${s.name}">
        <p class="product-name">${s.name}</p>
      </a>
    `
      )
      .join("");
    lucide.createIcons();
  }

  function updatePageTitle(brands, models, count) {
    const gender = new URLSearchParams(window.location.search).get("gender");
    if (models.length === 1) pageTitle.textContent = `${models[0]} (${count})`;
    else if (brands.length === 1)
      pageTitle.textContent = `Alle ${brands[0]} schoenen (${count})`;
    else if (brands.length > 1)
      pageTitle.textContent = `Geselecteerde merken (${count})`;
    else if (gender === "heren")
      pageTitle.textContent = `Alle mannen schoenen (${count})`;
    else if (gender === "vrouw")
      pageTitle.textContent = `Alle vrouwen schoenen (${count})`;
    else pageTitle.textContent = `Alle sneakers (${count})`;
  }

  function updatePagination(totalPages, currentPage) {
    const pag = document.querySelector(".pagination");
    if (!pag) return;
    if (totalPages <= 1) {
      pag.innerHTML = "";
      return;
    }
    pag.innerHTML = Array.from(
      { length: totalPages },
      (_, i) => `
      <a href="#" class="pagination-link ${
        i + 1 == currentPage ? "active" : ""
      }" data-page="${i + 1}">${i + 1}</a>
    `
    ).join("");
  }

  allCbs.forEach((cb) => {
    cb.addEventListener("click", () => {
      allCbs.forEach((o) => o !== cb && (o.checked = false));
      if (window.innerWidth <= 768 && overlay) {
        overlay.classList.remove("active");
        setTimeout(() => (overlay.style.display = "none"), 300);
      }
      applyFilters(1); // ✅ nu altijd uitgevoerd, ook als hij al "checked" was
    });
  });

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("pagination-link")) {
      e.preventDefault();
      applyFilters(Number(e.target.dataset.page));
    }
  });

  // Search suggestions (desktop & mobile)
  ["desktop", "mobile"].forEach((type) => {
    const form = document.querySelector(`#${type}-search-form input`);
    const suggestionsBox =
      document.getElementById(`${type}-search-suggestions`) ||
      document.getElementById("search-suggestions");
    form?.addEventListener("input", async () => {
      const q = form.value.trim();
      if (!q) {
        suggestionsBox.classList.add("hidden");
        suggestionsBox.innerHTML = "";
        return;
      }
      const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.length) {
        suggestionsBox.classList.add("hidden");
        suggestionsBox.innerHTML = "";
        return;
      }
      suggestionsBox.classList.remove("hidden");
      suggestionsBox.innerHTML = data
        .map(
          (p) => `
        <a href="/product/${p.id}">
          <img src="${p.image}" alt="${p.name}" />
          <div><strong>${p.name}</strong></div>
        </a>
      `
        )
        .join("");
    });
    document.addEventListener("click", (e) => {
      if (
        suggestionsBox &&
        !suggestionsBox.contains(e.target) &&
        e.target !== form
      ) {
        suggestionsBox.classList.add("hidden");
      }
    });
  });

  // Cart logic
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartSidebar = document.getElementById("cartSidebar");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartToggle = document.getElementById("cartToggleBtn");
  const cartClose = document.getElementById("cartCloseBtn");
  const cartItemsEl = document.getElementById("cartItems");
  const cartTotalEl = document.getElementById("cartTotal");
  const countEl = document.getElementById("cart-count");

  const updateCartCount = () => {
    const total = cart.reduce((sum, p) => sum + p.quantity, 0);
    if (countEl)
      total > 0
        ? ((countEl.textContent = total), countEl.classList.remove("hidden"))
        : countEl.classList.add("hidden");
  };

  const renderCartItems = () => {
    cartItemsEl.innerHTML = "";
    let total = 0;
    cart.forEach((p) => {
      total += p.price * p.quantity;
      const item = document.createElement("div");
      item.className = "cart-item";
      item.innerHTML = `
        <img src="${p.image}" alt="${p.name}" />
        <div><p><strong>${p.name}</strong></p>
        <p>€${p.price.toFixed(2)} x ${p.quantity}</p>
        <button class="remove-btn" data-id="${p.id}">Verwijder</button></div>
      `;
      cartItemsEl.appendChild(item);
    });
    document.querySelectorAll(".remove-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        cart = cart.filter((p) => p.id !== btn.dataset.id);
        localStorage.setItem("cart", JSON.stringify(cart));
        updateCartCount();
        renderCartItems();
      })
    );
    cartTotalEl.textContent = `€${total.toFixed(2)}`;
  };

  cartToggle?.addEventListener("click", () => {
    cartSidebar.classList.add("show");
    cartOverlay.classList.remove("hidden");
    renderCartItems();
  });
  cartOverlay?.addEventListener("click", () => {
    cartSidebar.classList.remove("show");
    cartOverlay.classList.add("hidden");
  });
  cartClose?.addEventListener("click", () => {
    cartSidebar.classList.remove("show");
    cartOverlay.classList.add("hidden");
  });

  // Add to cart
  document.querySelector(".add-to-cart")?.addEventListener("click", () => {
    const product = {
      id: window.location.pathname.split("/").pop(),
      name: document.querySelector("h1")?.textContent || "",
      price: 0,
      image: document.getElementById("mainProductImage")?.src || "",
      quantity: 1,
    };
    const existing = cart.find((p) => p.id === product.id);
    if (existing) existing.quantity++;
    else cart.push(product);
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    renderCartItems();
    cartSidebar.classList.add("show");
    cartOverlay.classList.remove("hidden");
  });

  updateCartCount();

  // Checkout popup
  const checkoutBtn = document.getElementById("checkoutBtn");
  const checkoutPopup = document.getElementById("checkoutPopup");
  const popupClose = document.getElementById("popupClose");
  checkoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    checkoutPopup.classList.remove("hidden");
  });
  popupClose?.addEventListener("click", () =>
    checkoutPopup.classList.add("hidden")
  );
  checkoutPopup?.addEventListener("click", (e) => {
    if (e.target === checkoutPopup) checkoutPopup.classList.add("hidden");
  });
});

// Slider & thumbnails & overlay swipe
document.addEventListener("DOMContentLoaded", () => {
  const slides = Array.from(document.querySelectorAll(".slide-img"));
  const thumbnails = Array.from(document.querySelectorAll(".thumbnail-img"));
  const overlay = document.getElementById("zoomModal");
  const overlayImg = document.getElementById("zoomedImage");
  const closeOverlay = document.getElementById("closeZoom");
  const nextBtn = document.getElementById("nextOverlay");
  const prevBtn = document.getElementById("prevOverlay");
  let currentIdx = 0;

  function showSlide(idx) {
    if (!slides[idx]) return;
    currentIdx = idx;
    slides.forEach((s) => s.classList.remove("active"));
    slides[idx].classList.add("active");
    overlayImg.src = slides[idx].src;
  }

  // Thumbnails click
  thumbnails.forEach((thumb, i) => {
    thumb.addEventListener("click", () => showSlide(i));
  });

  // Slider swipe on main
  let startX = null;
  const slider = document.getElementById("mainImageSlider");
  slider?.addEventListener(
    "touchstart",
    (e) => (startX = e.touches[0].clientX)
  );
  slider?.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) {
      const nextIdx =
        diff < 0
          ? (currentIdx + 1) % slides.length
          : (currentIdx - 1 + slides.length) % slides.length;
      showSlide(nextIdx);
    }
    startX = null;
  });

  // Open overlay
  slides.forEach((img, i) => {
    img.addEventListener("click", () => {
      overlay.classList.remove("hidden");
      showSlide(i);
    });
  });

  closeOverlay?.addEventListener("click", () =>
    overlay.classList.add("hidden")
  );
  nextBtn?.addEventListener("click", () =>
    showSlide((currentIdx + 1) % slides.length)
  );
  prevBtn?.addEventListener("click", () =>
    showSlide((currentIdx - 1 + slides.length) % slides.length)
  );
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.add("hidden");
  });

  // Swipe overlay
  let overlayStartX = null;
  overlay?.addEventListener(
    "touchstart",
    (e) => (overlayStartX = e.touches[0].clientX)
  );
  overlay?.addEventListener("touchend", (e) => {
    if (overlayStartX === null) return;
    const diff = e.changedTouches[0].clientX - overlayStartX;
    if (Math.abs(diff) > 50) {
      showSlide(
        diff < 0
          ? (currentIdx + 1) % slides.length
          : (currentIdx - 1 + slides.length) % slides.length
      );
    }
    overlayStartX = null;
  });
});
