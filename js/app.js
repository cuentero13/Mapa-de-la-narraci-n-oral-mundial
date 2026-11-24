/* Mapa Mundial de la Narración Oral — lógica principal */
(function () {
  "use strict";

  const DATA = {};
  const esc = s => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const norm = s => (s || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const $ = id => document.getElementById(id);

  const STATUS_CLASS = { "activo": "badge-active", "inactivo": "badge-inactive", "sin verificar": "badge-unverified" };
  const STATUS_COLOR = { "activo": "#98C93C", "inactivo": "#EC1C24", "sin verificar": "#FDBD10" };

  let map, worldLayer, colLayer, adminLayer;

  // ---------- carga de datos ----------
  async function loadJSON(path) {
    const r = await fetch("data/" + path);
    if (!r.ok) throw new Error("No se pudo cargar " + path);
    return r.json();
  }

  async function init() {
    try {
      const [mundo, colombia, narradores, libros, parciales, prensa, menciones, destacados] =
        await Promise.all([
          loadJSON("festivales-mundo.json"),
          loadJSON("colombia.json"),
          loadJSON("narradores.json"),
          loadJSON("libros.json"),
          loadJSON("libros-parciales.json"),
          loadJSON("prensa.json"),
          loadJSON("menciones.json"),
          loadJSON("destacados.json"),
        ]);
      Object.assign(DATA, { mundo, colombia, narradores, libros, parciales, prensa, menciones, destacados });
    } catch (e) {
      console.error(e);
      $("dir-list").innerHTML = "<p>No se pudieron cargar los datos. Revisá que los archivos JSON estén en data/.</p>";
      return;
    }
    renderStats();
    try {
      initMap();
    } catch (e) {
      console.error("El mapa no pudo cargar:", e);
      const m = $("map");
      if (m) m.innerHTML = `<p style="padding:2rem;text-align:center">${LANG === "es"
        ? "El mapa no pudo cargar (revisá tu conexión). El directorio de festivales más abajo funciona igual."
        : "The map could not load (check your connection). The festival directory below still works."}</p>`;
    }
    initFilters();
    renderDirectory();
    renderColombia();
    renderMentions();
    renderNarrators();
    renderBooks();
    renderPress();
    bindLanguage();
  }

  // ---------- estadísticas ----------
  function renderStats() {
    $("stat-fest").textContent = DATA.mundo.length;
    $("stat-col").textContent = DATA.colombia.length;
    $("stat-narr").textContent = DATA.narradores.length;
    $("stat-libros").textContent = DATA.libros.length;
    $("stat-prensa").textContent = DATA.prensa.length;
  }

  // ---------- mapa ----------
  function dotIcon(color, aprox, extraClass) {
    const border = aprox ? "border:2px dashed #fff; box-shadow:0 0 0 2px " + color + ";" : "border:2px solid #fff;";
    return L.divIcon({
      className: "map-dot " + (extraClass || ""),
      html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};${border}"></span>`,
      iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -9]
    });
  }

  function festivalPopup(f) {
    const parts = [];
    parts.push(`<h4>${esc(f.nombre)}</h4>`);
    parts.push(`<div>${esc(f.ciudad || "")}${f.ciudad && f.pais ? " · " : ""}${esc(f.pais || "")}</div>`);
    if (f.fundacion) parts.push(`<div>${t("founded")} ${f.fundacion}</div>`);
    if (f.ediciones_num) parts.push(`<div>${f.ediciones_num} ${t("editions")}</div>`);
    parts.push(`<div>${esc(f.vigencia)}</div>`);
    if (f.coord_aprox) parts.push(`<div class="aprox">${t("approx")}</div>`);
    parts.push(`<div><a href="#dir-${f.id}">${t("dir_title")}</a></div>`);
    return parts.join("");
  }

  function initMap() {
    if (typeof L === "undefined") throw new Error("Leaflet no cargó (CDN no disponible)");
    map = L.map("map").setView([20, -30], 2);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    worldLayer = L.layerGroup().addTo(map);
    colLayer = L.layerGroup().addTo(map);
    adminLayer = L.layerGroup().addTo(map);

    // Festival administrador (Costa Rica)
    const adm = DATA.destacados.festival_administrador;
    L.marker([adm.lat, adm.lng], { icon: dotIcon("#00AAE3", false) })
      .bindPopup(`<h4>${esc(adm.nombre)}</h4><div>San José · Costa Rica</div><div>${t("founded")} 2002 · 18 ${t("editions")}</div><div><a href="#destacado">${t("feat_badge")}</a></div>`)
      .addTo(adminLayer);

    refreshMarkers();
  }

  function markersFiltered() {
    const country = $("filter-country").value;
    const status = $("filter-status").value;
    const showWorld = $("toggle-world").checked;
    const showCol = $("toggle-colombia").checked;
    let world = [], col = [];
    if (showWorld) {
      world = DATA.mundo.filter(f => f.lat != null)
        .filter(f => (country === "all" || f.pais === country))
        .filter(f => (status === "all" || f.vigencia === status));
      if (country === "Colombia") world = [];
    }
    if (showCol && (country === "all" || country === "Colombia")) {
      col = DATA.colombia.filter(c => c.lat != null);
    }
    return { world, col };
  }

  function refreshMarkers() {
    if (!map) return;
    worldLayer.clearLayers();
    colLayer.clearLayers();
    const { world, col } = markersFiltered();
    world.forEach(f => {
      L.marker([f.lat, f.lng], { icon: dotIcon(STATUS_COLOR[f.vigencia] || "#FDBD10", f.coord_aprox) })
        .bindPopup(festivalPopup(f)).addTo(worldLayer);
    });
    col.forEach(c => {
      const label = c.anio ? `${c.anio}` : "";
      L.marker([c.lat, c.lng], { icon: dotIcon("#F89C1C", c.coord_aprox) })
        .bindPopup(`<h4>${esc(c.nombre)}</h4><div>${esc(c.municipio)} · ${esc(c.departamento)} · Colombia</div>${label ? `<div>${label}</div>` : ""}${c.coord_aprox ? `<div class="aprox">${t("approx")}</div>` : ""}`)
        .addTo(colLayer);
    });
    const n = world.length + col.length + 1; // +1 administrador
    $("map-count").textContent = t("map_showing")(n);
  }

  // ---------- filtros del mapa ----------
  function initFilters() {
    const countries = [...new Set(DATA.mundo.map(f => f.pais))].sort((a, b) => a.localeCompare(b, "es"));
    ["filter-country", "dir-country"].forEach(id => {
      const sel = $(id);
      countries.forEach(p => {
        const o = document.createElement("option");
        o.value = p; o.textContent = p; sel.appendChild(o);
      });
      const oc = document.createElement("option");
      oc.value = "Colombia"; oc.textContent = "Colombia"; sel.appendChild(oc);
    });
    ["filter-country", "filter-status", "toggle-world", "toggle-colombia"].forEach(id => {
      $(id).addEventListener("change", refreshMarkers);
    });
    ["dir-search", "dir-country", "dir-status"].forEach(id => {
      $(id).addEventListener("input", renderDirectory);
      $(id).addEventListener("change", renderDirectory);
    });
    $("col-search").addEventListener("input", renderColombia);
  }

  // ---------- directorio ----------
  function festCard(f) {
    const badge = `<span class="badge ${STATUS_CLASS[f.vigencia] || "badge-unverified"}">${esc(f.vigencia)}</span>`;
    const rows = [];
    const add = (label, val, isHtml) => {
      if (val === null || val === undefined || val === "") return;
      rows.push(`<div><dt>${esc(label)}</dt><dd>${isHtml ? val : esc(val)}</dd></div>`);
    };
    add(t("founded"), f.fundacion_texto || (f.fundacion ? String(f.fundacion) : null));
    add(t("founders"), f.fundadores);
    add(t("directors"), f.directores);
    add(t("editions_label"), f.ediciones_texto || (f.ediciones_num ? String(f.ediciones_num) : null));
    add(t("org"), f.organiza);
    if (f.web) add(t("f_web"), `<a href="${esc(f.web.startsWith("http") ? f.web : "https://" + f.web)}" target="_blank" rel="noopener">${esc(f.web)}</a>`, true);
    if (f.contacto) add(t("f_contact"), f.contacto);
    const sources = (f.fuentes || []).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, "").split("/")[0])}</a>`).join(" · ");
    return `<article class="fest-card" id="dir-${f.id}">
      <div class="fest-card-head"><h3>${esc(f.nombre)}</h3>${badge}</div>
      <p class="fest-meta">${esc(f.ciudad_pais_texto || [f.ciudad, f.pais].filter(Boolean).join(", "))}${f.itinerante ? " · " + (LANG === "es" ? "itinerante" : "itinerant") : ""}${f.coord_aprox ? ` <span class="aprox">(${t("approx")})</span>` : ""}</p>
      <dl class="fest-fields">${rows.join("")}</dl>
      ${f.nota ? `<p class="homonym-note">${esc(f.nota)}</p>` : ""}
      ${sources ? `<p class="fest-sources">${t("sources")}: ${sources}</p>` : ""}
    </article>`;
  }

  function renderDirectory() {
    const q = norm($("dir-search").value.trim());
    const country = $("dir-country").value;
    const status = $("dir-status").value;
    const list = DATA.mundo.filter(f => {
      if (country !== "all" && f.pais !== country) return false;
      if (status !== "all" && f.vigencia !== status) return false;
      if (q) {
        const hay = norm([f.nombre, f.ciudad, f.pais, f.fundadores, f.directores].filter(Boolean).join(" "));
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    $("dir-count").textContent = t("showing_fest")(list.length, DATA.mundo.length);
    $("dir-list").innerHTML = list.length
      ? list.map(festCard).join("")
      : `<p>${t("no_results")}</p>`;
  }

  // ---------- Colombia ----------
  function renderColombia() {
    const q = norm($("col-search").value.trim());
    const list = DATA.colombia.filter(c => {
      if (!q) return true;
      return norm([c.nombre, c.municipio, c.departamento].join(" ")).includes(q);
    });
    $("col-list").innerHTML = list.length ? list.map(c => {
      const year = c.anio ? `<span class="col-year">${c.anio}${c.anio_aprox ? "*" : ""}</span> · ` : "";
      const aprox = c.coord_aprox ? ` <span class="aprox">(${t("approx")})</span>` : "";
      return `<div class="col-item">${year}<strong>${esc(c.nombre)}</strong> — <span class="col-lugar">${esc(c.municipio)} (${esc(c.departamento)})</span>${aprox}</div>`;
    }).join("") : `<p>${t("no_results")}</p>`;
    $("col-count").textContent = t("showing_col")(list.length, DATA.colombia.length);
  }

  // ---------- menciones ----------
  function renderMentions() {
    $("mentions-list").innerHTML = DATA.menciones.map(m => {
      const src = (m.fuentes || []).map(u => ` <a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, "").split("/")[0])}</a>`).join("");
      return `<li><strong>${esc(m.nombre)}</strong> (${esc(m.lugar)}): ${esc(m.nota || "")}${src}</li>`;
    }).join("");
  }

  // ---------- narradores ----------
  function renderNarrators() {
    const cr = DATA.narradores.filter(n => n.pais === "Costa Rica");
    const ar = DATA.narradores.filter(n => n.pais === "Argentina");
    $("narr-cr-count").textContent = cr.length;
    $("narr-ar-count").textContent = ar.filter(n => !n.memoria).length;
    const item = n => `<li>${esc(n.nombre)} <span class="loc">(${esc(n.localidad)})</span>${n.memoria ? ` <span class="tag-unverified">${t("in_memoriam")}</span>` : ""}</li>`;
    $("narr-cr").innerHTML = cr.map(item).join("");
    $("narr-ar").innerHTML = ar.map(item).join("");
  }

  // ---------- libros ----------
  function renderBooks() {
    const order = [];
    const byAuthor = {};
    DATA.libros.forEach(b => {
      if (!byAuthor[b.autor]) { byAuthor[b.autor] = { v: [], p: [] }; order.push(b.autor); }
      byAuthor[b.autor].v.push(b);
    });
    DATA.parciales.forEach(b => {
      if (!byAuthor[b.autor]) { byAuthor[b.autor] = { v: [], p: [] }; order.push(b.autor); }
      byAuthor[b.autor].p.push(b);
    });
    $("books-list").innerHTML = order.map(autor => {
      const g = byAuthor[autor];
      const vItems = g.v.map(b =>
        `<li><strong>${esc(b.titulo)}</strong> <span class="year">${b.anio || ""}</span> — <span class="ed">${esc(b.editorial || "")}${b.pais ? ", " + esc(b.pais) : ""}</span></li>`).join("");
      const pItems = g.p.length ? g.p.map(b =>
        `<li><strong>${esc(b.titulo)}</strong>${b.anio ? ` <span class="year">${b.anio}</span>` : ""} <span class="tag-unverified">${t("unverified_tag")}</span> <span class="ed">${esc(b.falta || "")}</span></li>`).join("") : "";
      return `<div class="book-author"><h3>${esc(autor)} <span class="muted">(${g.v.length} ${t("verified_books")}${g.p.length ? ` · ${g.p.length} ${t("partial_books")}` : ""})</span></h3>
        <ul class="book-list">${vItems}${pItems}</ul></div>`;
    }).join("");
  }

  // ---------- prensa ----------
  function renderPress() {
    $("press-list").innerHTML = DATA.prensa.map(a => {
      const fecha = a.fecha ? esc(a.fecha) : t("date_unverified");
      const fechaTag = a.fecha_verificada ? "" : ` <span class="tag-unverified">${t("unverified_tag")}</span>`;
      const link = a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${t("read_article")} →</a>` : "";
      return `<article class="press-card">
        <div class="medio">${esc(a.medio)}</div>
        <h3>${esc(a.titulo)}</h3>
        <div class="fecha">${fecha}${fechaTag}</div>
        ${a.nota ? `<p class="muted">${esc(a.nota)}</p>` : ""}
        <p>${link}</p>
      </article>`;
    }).join("");
  }

  // ---------- idioma ----------
  function bindLanguage() {
    $("lang-es").addEventListener("click", () => setLang("es"));
    $("lang-en").addEventListener("click", () => setLang("en"));
  }
  function setLang(l) {
    LANG = l;
    applyI18n();
    renderDirectory();
    renderColombia();
    renderBooks();
    renderPress();
    refreshMarkers();
    // el popup del administrador se reconstruye al reabrirse; nada más que hacer
  }

  document.addEventListener("DOMContentLoaded", init);
})();
