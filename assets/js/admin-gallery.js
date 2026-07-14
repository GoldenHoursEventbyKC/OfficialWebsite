if (requireAdminPage()) {
  const form = document.getElementById("galleryForm");
  const galleryGrid = document.getElementById("adminGalleryGrid");
  const statusEl = document.getElementById("galleryStatus");
  let items = [];
  const backendConfigured =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    Boolean(CONFIG.API_BASE_URL);

  const CATEGORY_LABELS = {
    "polaroid-guestbook": "Polaroid Guestbook",
    "preshoot-gallery": "Preshoot Gallery",
    "selfie-mirror": "Selfie Mirror",
  };

  if (!backendConfigured) {
    form.querySelectorAll("input, select, button").forEach((field) => {
      field.disabled = true;
    });
    statusEl.textContent =
      "Gallery uploads need the backend API. Current published images are shown on the right.";
  }

  async function loadGallery() {
    try {
      const data = backendConfigured
        ? await apiFetch("/api/gallery")
        : await loadStaticGallery();
      items = data.items || [];
      renderGallery();
    } catch (err) {
      galleryGrid.innerHTML = `<p class="admin-error">${err.message}</p>`;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusEl.textContent = "Uploading...";
    statusEl.className = "form-status";

    if (!backendConfigured) {
      statusEl.textContent =
        "Uploads need the backend API. Current published images are shown on the right.";
      statusEl.classList.add("error");
      return;
    }

    const formData = new FormData(form);
    const imageFile = formData.get("image");
    const imageUrl = formData.get("url")?.trim();

    if (!imageFile?.size && !imageUrl) {
      statusEl.textContent = "Please upload an image or provide a URL.";
      statusEl.classList.add("error");
      return;
    }

    try {
      await fetch(apiUrl("/api/gallery"), {
        method: "POST",
        headers: getAdminHeaders(),
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Upload failed");
        }
        return res.json();
      });

      statusEl.textContent = "Image added successfully!";
      statusEl.classList.add("success");
      form.reset();
      await loadGallery();
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.classList.add("error");
    }
  });

  function renderGallery() {
    if (items.length === 0) {
      galleryGrid.innerHTML = "<p>No gallery images yet.</p>";
      return;
    }

    galleryGrid.innerHTML = items
      .map(
        (item) => `
      <div class="admin-gallery-item">
        <img src="${galleryImageUrl(item.url)}" alt="${item.category}" />
        <div class="admin-gallery-meta">
          <span class="category-badge">${CATEGORY_LABELS[item.category] || item.category}</span>
          ${
            backendConfigured
              ? `<button class="delete-btn" data-id="${item.id}">Remove</button>`
              : ""
          }
        </div>
      </div>`,
      )
      .join("");

    if (backendConfigured) {
      galleryGrid.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", () => removeItem(btn.dataset.id));
      });
    }
  }

  async function loadStaticGallery() {
    const response = await fetch(`../assets/data/gallery.json?v=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.json();
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
    if (url.startsWith("assets/")) return `../${url}`;
    return url;
  }

  async function removeItem(id) {
    if (!confirm("Remove this image from the gallery?")) return;
    try {
      await apiFetch(`/api/gallery/${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      await loadGallery();
    } catch (err) {
      alert(err.message);
    }
  }

  loadGallery();
}
