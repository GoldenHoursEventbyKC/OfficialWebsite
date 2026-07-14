const filterButtons = document.querySelectorAll(".filter-btn");
const galleryGrid = document.getElementById("galleryGrid");
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const closeBtn = document.querySelector(".close-btn");

let galleryItems = [];

const CATEGORY_LABELS = {
  "polaroid-guestbook": "Polaroid Guestbook",
  "preshoot-gallery": "Preshoot Gallery",
  "selfie-mirror": "Selfie Mirror",
};

async function loadGallery() {
  try {
    const data = await apiFetch("/api/gallery");
    galleryItems = data.items || [];
  } catch {
    const response = await fetch(`assets/data/gallery.json?v=${Date.now()}`, {
      cache: "no-store",
    });
    const data = await response.json();
    galleryItems = data.items || [];
  }
  renderGallery();
  bindFilters();
  bindLightbox();
}

function galleryImageUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/assets/")) {
    const basePath = window.location.pathname.includes("/OfficialWebsite/")
      ? "/OfficialWebsite"
      : "";
    return `${basePath}${url}`;
  }
  return url;
}

function renderGallery() {
  galleryGrid.innerHTML = "";

  if (galleryItems.length === 0) {
    galleryGrid.innerHTML =
      '<p class="gallery-empty">No photos yet. Check back soon!</p>';
    return;
  }

  galleryItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = `gallery-item ${item.category}`;
    const img = document.createElement("img");
    img.src = galleryImageUrl(item.url);
    img.alt = `${CATEGORY_LABELS[item.category] || item.category} event photo`;
    div.appendChild(img);
    galleryGrid.appendChild(div);
  });
}

function bindFilters() {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      const filter = button.dataset.filter;
      const items = galleryGrid.querySelectorAll(".gallery-item");

      items.forEach((item) => {
        if (filter === "all" || item.classList.contains(filter)) {
          item.style.display = "block";
        } else {
          item.style.display = "none";
        }
      });
    });
  });
}

function bindLightbox() {
  galleryGrid.addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
      lightbox.classList.add("show");
      lightboxImage.src = e.target.src;
    }
  });
}

closeBtn.addEventListener("click", () => {
  lightbox.classList.remove("show");
});

lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) {
    lightbox.classList.remove("show");
  }
});

loadGallery();
