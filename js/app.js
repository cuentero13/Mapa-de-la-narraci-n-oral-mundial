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

  // Fuente única de las 144 fichas de Colombia (Solicitud 91, 24-nov-2026):
  // investigación «Festivales de cuentería en Colombia» de Fredy Ayala (2026),
  // citada como A1 en fuentes.json (Solicitud 96). Las citas APA de todas
  // las fichas se resuelven con citaHtml() contra DATA.fuentes.

  // ---------- citas APA (Solicitud 96, 24-nov-2026) ----------
  // Cada ficha lleva un campo `cita` con las claves de fuentes.json.
  // Se renderiza como enlace a la referencia completa en fuentes.html.
  let FUENTES_BY_KEY = null;
  function citaHtml(keys) {
    if (!keys || !keys.length || !DATA.fuentes) return "";
    if (!FUENTES_BY_KEY) {
      FUENTES_BY_KEY = {};
      DATA.fuentes.forEach(r => { FUENTES_BY_KEY[r.key] = r; });
    }
    const links = keys.filter(k => FUENTES_BY_KEY[k]).map(k =>
      `<a href="fuentes.html#${esc(k)}">${esc(k)} · ${esc(FUENTES_BY_KEY[k].cita_corta)}</a>`).join(" · ");
    return links ? `<p class="fest-cita">${t("cita_apa")}: ${links}</p>` : "";
  }
  // Enlace cruzado entre las fichas duplicadas mundo <-> Colombia
  // (relatos/dedup-colombia-mundo.json). La ficha duplicada de Colombia no
  // se dibuja dos veces, por eso el enlace apunta a la fuente (A1), no a
  // una tarjeta que no existe en el directorio.
  function dupHtml(f) {
    if (f.duplicado_colombia) return `<p class="fest-cita">${t("also_col")}: ${esc(f.duplicado_colombia)} — <a href="fuentes.html#A1">A1 · Ayala Herrera (2026)</a></p>`;
    if (f.duplicado_mundo) return `<p class="fest-cita">${t("also_world")}: ${esc(f.duplicado_mundo)}</p>`;
    return "";
  }

  let map, worldLayer, adminLayer, mythLayer, narrLayer, premLayer, librLayer;

  // ---------- carga de datos ----------
  async function loadJSON(path) {
    const r = await fetch("data/" + path);
    if (!r.ok) throw new Error("No se pudo cargar " + path);
    return r.json();
  }

  async function init() {
    try {
      const [mundo, colombia, narradores, libros, parciales, prensa, menciones, destacados, miticos, fuentes, premios, noticias, eventos, colaboradores, blog, foro] =
        await Promise.all([
          loadJSON("festivales-mundo.json"),
          loadJSON("colombia.json"),
          loadJSON("narradores.json"),
          loadJSON("libros.json"),
          loadJSON("libros-parciales.json"),
          loadJSON("prensa.json"),
          loadJSON("menciones.json"),
          loadJSON("destacados.json"),
          loadJSON("miticos.json"),
          loadJSON("fuentes.json"),
          loadJSON("premios.json"),
          loadJSON("noticias.json"),
          loadJSON("eventos.json"),
          loadJSON("colaboradores.json"),
          loadJSON("blog.json"),
          loadJSON("foro.json"),
        ]);
      Object.assign(DATA, { mundo, colombia, narradores, libros, parciales, prensa, menciones, destacados, miticos, fuentes, premios, noticias, eventos, colaboradores, blog, foro });
    } catch (e) {
      console.error(e);
      const dl = $("dir-list");
      if (dl) dl.innerHTML = "<p>No se pudieron cargar los datos. Revisá que los archivos JSON estén en data/.</p>";
      return;
    }
    renderStats();
    try {
      initMap();
    } catch (e) {
      console.error("El mapa no pudo cargar:", e);
      const m = $("map");
      if (m) m.innerHTML = `<p style="padding:2rem;text-align:center">${LANG === "es"
        ? "El mapa no pudo cargar (revisá tu conexión). El directorio de festivales sigue disponible en su página."
        : "The map could not load (check your connection). The festival directory is still available on its own page."}</p>`;
    }
    initFilters();
    renderDirectory();
    renderRanking();
    renderMentions();
    renderNarrators();
    renderBooks();
    renderPress();
    renderPremios();
    renderNoticias();
    renderEventos();
    renderColaboradores();
    renderBlog();
    renderForo();
    bindLanguage();
  }

  // ---------- estadísticas ----------
  // Total mundial deduplicado: las fichas de mundo con pais Colombia y
  // en_colombia=true también están en la lista de Colombia (Fredy Ayala).
  function renderStats() {
    if (!$("stat-fest")) return;
    const overlap = DATA.mundo.filter(f => f.en_colombia).length;
    $("stat-fest").textContent = DATA.mundo.length + DATA.colombia.length - overlap;
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

  function adminIcon() {
    return L.divIcon({
      className: "map-dot admin-dot",
      html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#00AAE3;border:2px solid #fff;box-shadow:0 0 0 2px #00AAE3;color:#fff;font-size:14px;line-height:1;">★</span>`,
      iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14]
    });
  }

  function mythIcon() {
    return L.divIcon({
      className: "map-dot myth-dot",
      html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:#7C3AED;border:2px dashed #fff;box-shadow:0 0 0 2px #7C3AED;color:#fff;font-size:13px;line-height:1;">✦</span>`,
      iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13]
    });
  }

  function mythPopup(m) {
    const parts = [];
    parts.push(`<h4>✦ ${esc(m.nombre)}</h4>`);
    if (m.nombre_original) parts.push(`<div><em>${esc(m.nombre_original)}</em></div>`);
    parts.push(`<div>${esc(m.ubicacion_referencia || "")}</div>`);
    parts.push(`<p>${esc(m.descripcion || "")}</p>`);
    if (m.vinculo_narracion) parts.push(`<p><strong>${t("myth_link_label")}</strong> ${esc(m.vinculo_narracion)}</p>`);
    const src = (m.fuentes || []).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, "").split("/")[0])}</a>`).join(" · ");
    if (src) parts.push(`<p>${t("sources")}: ${src}</p>`);
    return parts.join("");
  }

  function fotoHtml(f) {
    if (!f.foto) return "";
    const cred = f.foto_credito ? `<p class="foto-credito muted">${t("foto_label")}: ${esc(f.foto_credito)}${f.foto_fuente ? ` · <a href="${esc(f.foto_fuente)}" target="_blank" rel="noopener">${t("foto_fuente_label")}</a>` : ""}</p>` : "";
    return `<img class="fest-photo" src="${esc(f.foto)}" alt="${esc(f.nombre)}" loading="lazy" onerror="this.remove()">${cred}`;
  }
  function festivalPopup(f) {
    const parts = [];
    parts.push(`<h4>${esc(f.nombre)}</h4>`);
    parts.push(fotoHtml(f));
    if (f.administrador) parts.push(`<div>★ <a href="#destacado">${t("feat_badge")}</a></div>`);
    parts.push(`<div>${esc(f.ciudad || "")}${f.ciudad && f.pais ? " · " : ""}${esc(f.pais || "")}</div>`);
    if (f.fundacion) parts.push(`<div>${t("founded")} ${f.fundacion}</div>`);
    if (f.ediciones_num) parts.push(`<div>${f.ediciones_num} ${t("editions")}</div>`);
    parts.push(`<div>${esc(f.vigencia)}</div>`);
    if (f.relato) parts.push(`<div class="relato-popup"><strong>${t("relato_label")}: ${esc(f.relato.titulo)}</strong><br>${esc(f.relato.texto)}</div>`);
    if (f.coord_aprox) parts.push(`<div class="aprox">${t("approx")}</div>`);
    const src = (f.fuentes || []).map(u => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, "").split("/")[0])}</a>`).join(" · ");
    if (src) parts.push(`<p>${t("sources")}: ${src}</p>`);
    const citaF = citaHtml(f.cita);
    if (citaF) parts.push(citaF);
    const dupF = dupHtml(f);
    if (dupF) parts.push(dupF);
    parts.push(`<div><a href="directorio.html#dir-${f.id}">${t("dir_title")}</a></div>`);
    return parts.join("");
  }

  function colombiaPopup(c) {
    const parts = [];
    parts.push(`<h4>${esc(c.nombre)}</h4>`);
    parts.push(fotoHtml(c));
    parts.push(`<div>${esc(c.municipio)} · ${esc(c.departamento)} · Colombia</div>`);
    if (c.anio) parts.push(`<div>${c.anio}${c.anio_aprox ? " *" : ""}</div>`);
    if (c.web) parts.push(`<div><a href="${esc(c.web.startsWith("http") ? c.web : "https://" + c.web)}" target="_blank" rel="noopener">${t("f_web")}</a></div>`);
    if (c.relato) parts.push(`<div class="relato-popup"><strong>${t("relato_label")}: ${esc(c.relato.titulo)}</strong><br>${esc(c.relato.texto)}</div>`);
    if (c.coord_aprox) parts.push(`<div class="aprox">${t("approx")}</div>`);
    const citaC = citaHtml(c.cita);
    if (citaC) parts.push(citaC);
    const dupC = dupHtml(c);
    if (dupC) parts.push(dupC);
    return parts.join("");
  }

  function narratorPopup(n) {
    const parts = [];
    parts.push(`<h4>${esc(n.nombre)}</h4>`);
    parts.push(`<div>${esc(n.localidad || "")}${n.localidad && n.pais ? " · " : ""}${esc(n.pais || "")}</div>`);
    if (n.memoria) parts.push(`<div>${t("in_memoriam")}</div>`);
    parts.push(`<div class="aprox">${t("approx_general")}</div>`);
    parts.push(`<div><a href="narradores.html">${t("nav_narradores")}</a></div>`);
    return parts.join("");
  }

  function premioPopup(p) {
    const parts = [];
    parts.push(`<h4>${esc(p.nombre)}</h4>`);
    if (p.organizador) parts.push(`<div>${esc(p.organizador)}</div>`);
    parts.push(`<div>${esc(p.pais_ambito || "")}${p.anios ? " · " + esc(p.anios) : ""}</div>`);
    parts.push(`<div class="aprox">${t("approx_general")}</div>`);
    parts.push(`<div><a href="premios.html">${t("nav_premios")}</a></div>`);
    return parts.join("");
  }

  function libroPopup(l) {
    const parts = [];
    parts.push(`<h4>${esc(l.titulo)}</h4>`);
    parts.push(`<div>${esc(l.autor || "")}${l.anio ? " · " + l.anio : ""}</div>`);
    if (l.pais) parts.push(`<div>${esc(l.pais)}</div>`);
    parts.push(`<div class="aprox">${t("approx_general")}</div>`);
    parts.push(`<div><a href="biblioteca.html">${t("nav_libros")}</a></div>`);
    return parts.join("");
  }

  function initMap() {
    if (!$("map")) return;
    if (typeof L === "undefined") throw new Error("Leaflet no cargó (CDN no disponible)");
    map = L.map("map", { maxBounds: [[-70, -190], [85, 190]], maxBoundsViscosity: 0.8 }).setView([20, -30], 2);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    worldLayer = L.layerGroup().addTo(map);
    adminLayer = L.layerGroup().addTo(map);
    mythLayer = L.layerGroup(); // apagada por defecto: solo se añade con el interruptor
    narrLayer = L.layerGroup();
    premLayer = L.layerGroup();
    librLayer = L.layerGroup();

    refreshMarkers();
    // Vista inicial: encuadrar los marcadores (el zoom 2 dejaba 2/3 del mapa en gris)
    try {
      const b = L.latLngBounds([]);
      [worldLayer, adminLayer].forEach(layer => layer.eachLayer(l => { if (l.getLatLng) b.extend(l.getLatLng()); }));
      if (b.isValid()) map.fitBounds(b.pad(0.12), { animate: false, maxZoom: 4 });
    } catch (e) { /* se queda la vista por defecto */ }
  }

  // Colombia integrada en el mapa mundial: sus fichas se muestran con el
  // mismo interruptor que el resto. Las 11 fichas de colombia.json que
  // duplican fichas de mundo (relatos/dedup-colombia-mundo.json) no se
  // dibujan dos veces: las representa su ficha de mundo.
  const COL_DUP = new Set(["col-013", "col-022", "col-027", "col-028", "col-033", "col-034", "col-041", "col-048", "col-050", "col-068", "col-119"]);
  function markersFiltered() {
    const country = $("filter-country").value;
    const status = $("filter-status").value;
    const showWorld = $("toggle-world").checked;
    let world = [], col = [];
    if (showWorld) {
      world = DATA.mundo.filter(f => f.lat != null)
        .filter(f => (country === "all" || f.pais === country))
        .filter(f => (status === "all" || f.vigencia === status));
      // Las fichas de Colombia no tienen vigencia: solo se muestran sin filtro de vigencia.
      if (status === "all" && (country === "all" || country === "Colombia")) {
        col = DATA.colombia.filter(c => c.lat != null && !COL_DUP.has(c.id));
      }
    }
    return { world, col };
  }

  // Capas nuevas (24-nov-2026): narradores, premios y libros NOE.
  // Solo aparecen con su interruptor; el filtro de país también las filtra.
  function layersFiltered() {
    const country = $("filter-country").value;
    const showN = $("toggle-narradores") && $("toggle-narradores").checked;
    const showP = $("toggle-premios") && $("toggle-premios").checked;
    const showL = $("toggle-libros") && $("toggle-libros").checked;
    const narr = showN ? (DATA.narradores || []).filter(n => n.lat != null && (country === "all" || n.pais === country)) : [];
    const prem = showP ? (DATA.premios || []).filter(p => p.lat != null && (country === "all" || p.pais_ambito === country)) : [];
    const libr = showL ? (DATA.libros || []).filter(l => l.lat != null && (country === "all" || l.pais === country)) : [];
    return { narr, prem, libr };
  }

  function refreshMarkers() {
    if (!map) return;
    worldLayer.clearLayers();
    adminLayer.clearLayers();
    mythLayer.clearLayers();
    narrLayer.clearLayers();
    premLayer.clearLayers();
    librLayer.clearLayers();
    const { world, col } = markersFiltered();
    world.forEach(f => {
      if (f.administrador) {
        L.marker([f.lat, f.lng], { icon: adminIcon() })
          .bindPopup(festivalPopup(f)).addTo(adminLayer);
      } else {
        L.marker([f.lat, f.lng], { icon: dotIcon(STATUS_COLOR[f.vigencia] || "#FDBD10", f.coord_aprox) })
          .bindPopup(festivalPopup(f)).addTo(worldLayer);
      }
    });
    col.forEach(c => {
      L.marker([c.lat, c.lng], { icon: dotIcon("#F89C1C", c.coord_aprox) })
        .bindPopup(colombiaPopup(c)).addTo(worldLayer);
    });
    const { narr, prem, libr } = layersFiltered();
    narr.forEach(n => {
      L.marker([n.lat, n.lng], { icon: dotIcon("#2E86AB", n.coord_aprox) }).bindPopup(narratorPopup(n)).addTo(narrLayer);
    });
    prem.forEach(p => {
      L.marker([p.lat, p.lng], { icon: dotIcon("#D4A017", p.coord_aprox) }).bindPopup(premioPopup(p)).addTo(premLayer);
    });
    libr.forEach(l => {
      L.marker([l.lat, l.lng], { icon: dotIcon("#7B5EA7", l.coord_aprox) }).bindPopup(libroPopup(l)).addTo(librLayer);
    });
    if ($("toggle-narradores") && $("toggle-narradores").checked) narrLayer.addTo(map); else map.removeLayer(narrLayer);
    if ($("toggle-premios") && $("toggle-premios").checked) premLayer.addTo(map); else map.removeLayer(premLayer);
    if ($("toggle-libros") && $("toggle-libros").checked) librLayer.addTo(map); else map.removeLayer(librLayer);
    const n = world.length + col.length + narr.length + prem.length + libr.length;
    const unfiltered = $("filter-country").value === "all" && $("filter-status").value === "all" && $("toggle-world").checked;
    let sinUbi = 0;
    if (unfiltered) {
      sinUbi = DATA.mundo.filter(f => f.lat == null).length + DATA.colombia.filter(c => c.lat == null && !COL_DUP.has(c.id)).length;
    }
    $("map-count").textContent = t("map_showing")(n, sinUbi);
    // Capa mítica: separada, apagada por defecto, fuera de los conteos y filtros
    const showMyth = $("toggle-miticos") && $("toggle-miticos").checked;
    if (showMyth && DATA.miticos) {
      DATA.miticos.filter(m => m.lat != null).forEach(m => {
        L.marker([m.lat, m.lng], { icon: mythIcon() })
          .bindPopup(mythPopup(m)).addTo(mythLayer);
      });
      mythLayer.addTo(map);
      $("miticos-banner").hidden = false;
    } else {
      map.removeLayer(mythLayer);
      if ($("miticos-banner")) $("miticos-banner").hidden = true;
    }
  }

  // ---------- filtros del mapa ----------
  function initFilters() {
    const countries = [...new Set(DATA.mundo.map(f => f.pais))].sort((a, b) => a.localeCompare(b, "es"));
    ["filter-country", "dir-country"].forEach(id => {
      const sel = $(id);
      if (!sel) return;
      countries.forEach(p => {
        const o = document.createElement("option");
        o.value = p; o.textContent = p; sel.appendChild(o);
      });
      if (!countries.includes("Colombia")) {
        const oc = document.createElement("option");
        oc.value = "Colombia"; oc.textContent = "Colombia"; sel.appendChild(oc);
      }
    });
    ["filter-country", "filter-status", "toggle-world", "toggle-miticos", "toggle-narradores", "toggle-premios", "toggle-libros"].forEach(id => {
      const elM = $(id);
      if (elM) elM.addEventListener("change", refreshMarkers);
    });
    ["dir-search", "dir-country", "dir-status"].forEach(id => {
      const elD = $(id);
      if (elD) {
        elD.addEventListener("input", renderDirectory);
        elD.addEventListener("change", renderDirectory);
      }
    });
  }

  // ---------- directorio ----------
  function festCard(f) {
    const badge = `<span class="badge ${STATUS_CLASS[f.vigencia] || "badge-unverified"}">${esc(f.vigencia)}</span>` + (f.administrador ? ` <span class="badge badge-admin">${t("feat_badge")}</span>` : "");
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
    const photo = fotoHtml(f);
    const media = [];
    if (f.facebook) media.push(`<a href="${esc(f.facebook)}" target="_blank" rel="noopener">Facebook</a>`);
    if (f.youtube) media.push(`<a href="${esc(f.youtube)}" target="_blank" rel="noopener">${f.youtube_tipo === "video" ? "Video" : "YouTube"}</a>`);
    const mediaRow = media.length ? `<p class="fest-media">${media.join(" · ")}</p>` : "";
    const relato = f.relato ? `<div class="relato"><p class="relato-label">📖 ${t("relato_label")} — ${esc(f.relato.zona || "")}</p><p><strong>${esc(f.relato.titulo)}</strong></p><p>${esc(f.relato.texto)}</p><p class="relato-note">${t("relato_note")}</p></div>` : "";
    return `<article class="fest-card" id="dir-${f.id}">
      <div class="fest-card-head"><h3>${esc(f.nombre)}</h3>${badge}</div>
      ${photo}
      <p class="fest-meta">${esc(f.ciudad_pais_texto || [f.ciudad, f.pais].filter(Boolean).join(", "))}${f.itinerante ? " · " + (LANG === "es" ? "itinerante" : "itinerant") : ""}${f.coord_aprox ? ` <span class="aprox">(${t("approx")})</span>` : ""}</p>
      <dl class="fest-fields">${rows.join("")}</dl>
      ${mediaRow}
      ${relato}
      ${f.nota ? `<p class="homonym-note">${esc(f.nota)}</p>` : ""}
      ${sources ? `<p class="fest-sources">${t("sources")}: ${sources}</p>` : ""}
      ${citaHtml(f.cita)}
      ${dupHtml(f)}
    </article>`;
  }

  // Directorio mundial único: fichas de mundo (tarjetas) + fichas de
  // Colombia (filas breves, mismo listado, sin sección propia). Las 11
  // fichas de Colombia duplicadas en mundo no se repiten.
  function renderDirectory() {
    if (!$("dir-list")) return;
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
    // Por defecto, el Festival Puro Cuento (Costa Rica) va primero.
    list.sort((a, b) => (a.id === "mundo-101" ? -1 : b.id === "mundo-101" ? 1 : 0));
    const colList = (country === "all" || country === "Colombia") && status === "all"
      ? DATA.colombia.filter(c => !COL_DUP.has(c.id)).filter(c => {
          if (!q) return true;
          return norm([c.nombre, c.municipio, c.departamento, "Colombia"].join(" ")).includes(q);
        })
      : [];
    const total = DATA.mundo.length + DATA.colombia.length - DATA.mundo.filter(f => f.en_colombia).length;
    $("dir-count").textContent = t("showing_fest")(list.length + colList.length, total);
    const cards = list.length ? `<div class="fest-grid">${list.map(festCard).join("")}</div>` : "";
    const cols = colList.length ? `<div class="col-list">${colList.map(colItem).join("")}</div>` : "";
    $("dir-list").innerHTML = (cards || cols)
      ? cards + cols
      : `<p>${t("no_results")}</p>`;
    if (location.hash.startsWith("#dir-")) {
      const target = document.querySelector(location.hash);
      if (target) target.scrollIntoView();
    }
  }

  function colItem(c) {
    const year = c.anio ? `<span class="col-year">${c.anio}${c.anio_aprox ? "*" : ""}</span> · ` : "";
    const aprox = c.coord_aprox ? ` <span class="aprox">(${t("approx")})</span>` : "";
    const m = [];
    if (c.web) m.push(`<a href="${esc(c.web.startsWith("http") ? c.web : "https://" + c.web)}" target="_blank" rel="noopener">Web</a>`);
    if (c.facebook) m.push(`<a href="${esc(c.facebook)}" target="_blank" rel="noopener">Facebook</a>`);
    if (c.youtube) m.push(`<a href="${esc(c.youtube)}" target="_blank" rel="noopener">${c.youtube_tipo === "video" ? "Video" : "YouTube"}</a>`);
    const media = m.length ? ` <span class="col-media">${m.join(" · ")}</span>` : "";
    const relato = c.relato ? `<div class="relato"><p class="relato-label">📖 ${t("relato_label")} — ${esc(c.relato.zona || "")}</p><p><strong>${esc(c.relato.titulo)}</strong></p><p>${esc(c.relato.texto)}</p><p class="relato-note">${t("relato_note")}</p></div>` : "";
    const fuente = citaHtml(c.cita) + dupHtml(c);
    return `<div class="col-item" id="dir-${c.id}">${year}<strong>${esc(c.nombre)}</strong> — <span class="col-lugar">${esc(c.municipio)} (${esc(c.departamento)}) · Colombia</span>${aprox}${media}${relato}${fuente}</div>`;
  }

  // ---------- menciones ----------
  function renderMentions() {
    const el = $("mentions-list");
    if (!el) return;
    el.innerHTML = DATA.menciones.map(m => {
      const src = (m.fuentes || []).map(u => ` <a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, "").split("/")[0])}</a>`).join("");
      return `<li><strong>${esc(m.nombre)}</strong> (${esc(m.lugar)}): ${esc(m.nota || "")}${src}</li>`;
    }).join("");
  }

  // ---------- narradores ----------
  const FLAGS = { "Argentina": "🇦🇷", "Costa Rica": "🇨🇷", "España": "🇪🇸", "Brasil": "🇧🇷", "Bolivia": "🇧🇴", "Estados Unidos": "🇺🇸", "Italia": "🇮🇹", "Portugal": "🇵🇹", "Cuba": "🇨🇺", "Canadá": "🇨🇦", "Perú": "🇵🇪", "México": "🇲🇽", "Nicaragua": "🇳🇮", "Chile": "🇨🇱", "Honduras": "🇭🇳", "Colombia": "🇨🇴", "Australia": "🇦🇺", "Corea del Sur": "🇰🇷", "Taiwán": "🇹🇼", "El Salvador": "🇸🇻", "Rep. Dominicana": "🇩🇴", "Ecuador": "🇪🇨", "India": "🇮🇳", "Kenia": "🇰🇪", "Guatemala": "🇬🇹", "Paraguay": "🇵🇾", "Alemania": "🇩🇪", "Puerto Rico": "🇵🇷", "Reino Unido": "🇬🇧", "Uruguay": "🇺🇾", "Irlanda": "🇮🇪", "Singapur": "🇸🇬" };
  const flagFor = pais => FLAGS[pais] ? `<span class="flag" role="img" aria-label="${esc(pais)}" title="${esc(pais)}">${FLAGS[pais]}</span>` : "";
  function renderNarrators() {
    if (!$("narr-cr")) return;
    const cr = DATA.narradores.filter(n => n.pais === "Costa Rica");
    const ar = DATA.narradores.filter(n => n.pais === "Argentina");
    $("narr-cr-count").textContent = cr.length;
    $("narr-ar-count").textContent = ar.filter(n => !n.memoria).length;
    const item = n => {
      const links = n.enlaces || {};
      const PL = [["web", "Web"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["tiktok", "TikTok"], ["x", "X"]];
      const parts = PL.filter(([k]) => links[k]).map(([k, label]) => `<a href="${esc(links[k])}" target="_blank" rel="noopener">${label}</a>`);
      (links.otros || []).forEach(o => { if (o && o.url) parts.push(`<a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.etiqueta || o.url.replace(/^https?:\/\//, "").split("/")[0])}</a>`); });
      return `<li>${flagFor(n.pais)}${esc(n.nombre)}${n.localidad ? ` <span class="loc">(${esc(n.localidad)})</span>` : ""}${n.memoria ? ` <span class="tag-unverified">${t("in_memoriam")}</span>` : ""}${parts.length ? ` <span class="narr-links">${parts.join(" · ")}</span>` : ""}</li>`;
    };
    $("narr-cr").innerHTML = cr.map(item).join("");
    $("narr-ar").innerHTML = ar.map(item).join("");
    // Otros países (Solicitud 112): perfiles con enlaces verificados fuera de
    // los listados RIC de Costa Rica y Argentina, agrupados por país; los sin
    // país verificado van en un grupo aparte al final.
    const otros = DATA.narradores.filter(n => n.pais !== "Costa Rica" && n.pais !== "Argentina");
    const porPais = {};
    otros.forEach(n => { const k = n.pais || ""; (porPais[k] = porPais[k] || []).push(n); });
    const paises = Object.keys(porPais).filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
    const byName = (a, b) => norm(a.nombre).localeCompare(norm(b.nombre), "es");
    let htmlOtros = "";
    paises.forEach(p => {
      const lista = porPais[p].slice().sort(byName);
      htmlOtros += `<h4 class="subsection">${flagFor(p)}${esc(p)} — ${lista.length}</h4><ul class="narr-list">${lista.map(item).join("")}</ul>`;
    });
    if (porPais[""]) {
      const lista = porPais[""].slice().sort(byName);
      htmlOtros += `<h4 class="subsection">${esc(t("narr_sin_pais"))} — ${lista.length}</h4><ul class="narr-list">${lista.map(item).join("")}</ul>`;
    }
    $("narr-otros").innerHTML = htmlOtros;
    $("narr-otros-count").textContent = otros.length;
  }

  // ---------- libros ----------
  function renderBooks() {
    if (!$("books-list")) return;
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
        `<li><strong>${esc(b.titulo)}</strong> <span class="year">${b.anio || ""}</span> — <span class="ed">${esc(b.editorial || "")}${b.pais ? ", " + esc(b.pais) : ""}</span>${b.enlace ? ` <a href="${esc(b.enlace)}" target="_blank" rel="noopener">${t("books_search")} →</a>` : ""}</li>`).join("");
      const pItems = g.p.length ? g.p.map(b =>
        `<li><strong>${esc(b.titulo)}</strong>${b.anio ? ` <span class="year">${b.anio}</span>` : ""} <span class="tag-unverified">${t("unverified_tag")}</span> <span class="ed">${esc(b.falta || "")}</span>${b.enlace ? ` <a href="${esc(b.enlace)}" target="_blank" rel="noopener">${t("books_search")} →</a>` : ""}</li>`).join("") : "";
      return `<div class="book-author"><h3>${esc(autor)} <span class="muted">(${g.v.length} ${t("verified_books")}${g.p.length ? ` · ${g.p.length} ${t("partial_books")}` : ""})</span></h3>
        <ul class="book-list">${vItems}${pItems}</ul></div>`;
    }).join("");
  }

  // ---------- prensa ----------
  function renderPress() {
    if (!$("press-list")) return;
    $("press-list").innerHTML = DATA.prensa.map(a => {
      const fecha = a.fecha ? esc(a.fecha) : t("date_unverified");
      const fechaTag = a.fecha_verificada ? "" : ` <span class="tag-unverified">${t("unverified_tag")}</span>`;
      const link = a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${t("read_article")} →</a>` : "";
      const cita = citaHtml(a.cita);
      return `<article class="press-card">
        <div class="medio">${esc(a.medio)}</div>
        <h3>${esc(a.titulo)}</h3>
        <div class="fecha">${fecha}${fechaTag}</div>
        ${a.nota ? `<p class="muted">${esc(a.nota)}</p>` : ""}
        <p>${link}</p>
        ${cita}
      </article>`;
    }).join("");
  }

  // ---------- premios ----------
  // Orden de §2.5 del paquete APA (24-nov-2026): por país/ámbito.
  const PREMIOS_ORDEN = ["EE. UU.", "Colombia", "Cuba", "Iberoamérica", "Reino Unido", "Canadá", "Jamaica", "Alemania", "Nigeria", "España"];
  function renderPremios() {
    const el = $("premios-list");
    if (!el || !DATA.premios) return;
    el.innerHTML = PREMIOS_ORDEN.map(pais => {
      const list = DATA.premios.filter(p => p.pais_ambito === pais);
      if (!list.length) return "";
      const cards = list.map(p => {
        const fuentes = (p.fuentes || []).map(k => {
          const r = (DATA.fuentes || []).find(x => x.key === k);
          return r ? `<a href="fuentes.html#${esc(k)}">${esc(k)} · ${esc(r.cita_corta)}</a>` : esc(k);
        }).join(" · ");
        return `<article class="press-card">
          <h3>${esc(p.nombre)}</h3>
          ${fotoHtml(p)}
          <div class="medio">${esc(p.organizador)}</div>
          <div class="fecha">${esc(p.anios)}</div>
          <p>${esc(p.reconoce)}</p>
          ${fuentes ? `<p class="fest-cita">${t("cita_apa")}: ${fuentes}</p>` : ""}
        </article>`;
      }).join("");
      return `<h3 class="subsection">${esc(pais)}</h3><div class="press-grid">${cards}</div>`;
    }).join("");
  }
  function renderNoticias() {
    const el = $("news-list");
    if (!el) return;
    if (el._newsTimer) { clearInterval(el._newsTimer); el._newsTimer = null; }
    const items = (DATA.noticias && DATA.noticias.items) || [];
    if (!items.length) {
      el.innerHTML = `<p class="muted">${t("news_empty")}</p>`;
      return;
    }
    const sorted = [...items].sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
    const slide = n => `<article class="press-card news-slide"><h3>${esc(n.titulo)}</h3><p class="muted">${esc(n.fecha || "")}${n.autor ? " · " + esc(n.autor) : ""}</p><p>${esc(n.resumen || "")}</p>${n.enlace ? `<p><a href="${esc(n.enlace)}" target="_blank" rel="noopener">${esc(n.fuente || n.enlace.replace(/^https?:\/\//, "").split("/")[0])} →</a></p>` : ""}</article>`;
    const controls = sorted.length > 1 ? `<div class="news-controls"><button type="button" class="news-btn" data-news-prev aria-label="${t("news_prev")}">‹</button><div class="news-dots">${sorted.map((_, i) => `<button type="button" class="news-dot${i === 0 ? " active" : ""}" data-news-dot="${i}" aria-label="${i + 1}"></button>`).join("")}</div><button type="button" class="news-btn" data-news-next aria-label="${t("news_next")}">›</button></div>` : "";
    el.innerHTML = `<div class="news-slider"><div class="news-track">${sorted.map(slide).join("")}</div></div>${controls}`;
    if (sorted.length < 2) return;
    const track = el.querySelector(".news-track");
    const dots = [...el.querySelectorAll("[data-news-dot]")];
    let idx = 0;
    const go = i => {
      idx = (i + sorted.length) % sorted.length;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, j) => d.classList.toggle("active", j === idx));
    };
    el.querySelector("[data-news-prev]").addEventListener("click", () => go(idx - 1));
    el.querySelector("[data-news-next]").addEventListener("click", () => go(idx + 1));
    dots.forEach((d, j) => d.addEventListener("click", () => go(j)));
    let startX = null;
    track.addEventListener("pointerdown", e => { startX = e.clientX; });
    track.addEventListener("pointerup", e => {
      if (startX == null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
      startX = null;
    });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el._newsTimer = setInterval(() => go(idx + 1), 6000);
    }
  }
  function renderEventos() {
    const el = $("eventos-list");
    if (!el) return;
    const items = (DATA.eventos && DATA.eventos.items) || [];
    if (!items.length) {
      el.innerHTML = `<p class="muted">${t("ev_empty")} <a href="index.html#nosotros">${t("ev_empty_link")}</a></p>`;
      return;
    }
    const sorted = [...items].sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")));
    el.innerHTML = sorted.map(e => `<article class="press-card"><h3>${esc(e.titulo)}</h3><p class="muted">${esc(e.fecha || "")}${e.ciudad ? " · " + esc(e.ciudad) : ""}${e.pais ? ", " + esc(e.pais) : ""}${e.tipo ? " · " + esc(e.tipo) : ""}</p><p>${esc(e.descripcion || "")}</p>${e.organizador ? `<p class="muted">${t("ev_org")}: ${esc(e.organizador)}</p>` : ""}${e.enlace ? `<p><a href="${esc(e.enlace)}" target="_blank" rel="noopener">${esc(e.enlace.replace(/^https?:\/\//, "").split("/")[0])} →</a></p>` : ""}</article>`).join("");
  }
  function renderColaboradores() {
    const el = $("colab-list");
    if (!el) return;
    const items = (DATA.colaboradores && DATA.colaboradores.items) || [];
    if (!items.length) {
      el.innerHTML = `<p class="muted">${t("colab_empty")} <a href="index.html#nosotros">${t("colab_empty_link")}</a></p>`;
      return;
    }
    el.innerHTML = `<ul class="narr-list">` + items.map(c => `<li><strong>${esc(c.nombre)}</strong> — ${esc(c.aporte || "")}${c.ficha ? " · " + esc(c.ficha) : ""} <span class="loc">(${esc(c.fecha || "")})</span></li>`).join("") + `</ul>`;
  }
  function renderBlog() {
    const el = $("blog-list");
    if (!el) return;
    const items = (DATA.blog && DATA.blog.items) || [];
    if (!items.length) {
      el.innerHTML = `<p class="muted">${t("blog_empty")}</p>`;
      return;
    }
    const sorted = [...items].sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
    el.innerHTML = sorted.map(n => `<article class="press-card"><h3>${esc(n.titulo)}</h3><p class="muted">${esc(n.fecha || "")}${n.autor ? " · " + esc(n.autor) : ""}</p><p>${esc(n.texto || n.resumen || "")}</p>${n.enlace ? `<p><a href="${esc(n.enlace)}" target="_blank" rel="noopener">${esc(n.fuente || n.enlace.replace(/^https?:\/\//, "").split("/")[0])} →</a></p>` : ""}</article>`).join("");
  }
  function renderForo() {
    const el = $("foro-list");
    if (!el) return;
    const items = (DATA.foro && DATA.foro.items) || [];
    if (!items.length) {
      el.innerHTML = `<p class="muted">${t("foro_empty")}</p>`;
      return;
    }
    const sorted = [...items].sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")));
    el.innerHTML = sorted.map(h => `<article class="press-card"><h3>${esc(h.titulo)}</h3><p class="muted">${esc(h.fecha || "")}${h.autor ? " · " + esc(h.autor) : ""}${h.tema ? " · " + esc(h.tema) : ""}</p><p>${esc(h.texto || "")}</p>${(h.respuestas || []).length ? `<p class="muted">${(h.respuestas || []).length} ${t("foro_replies")}</p>` : ""}</article>`).join("");
  }

  // ---------- ranking: donde hay mas narracion oral ----------
  // Conteos verificados 24-nov-2026 a partir del dataset (386 festivales
  // únicos; por ciudad: municipio registrado, sin duplicar las 11 fichas
  // de Colombia que también están en mundo). Recalcular si cambian los datos.
  const RANKING = {
    paises: [["Colombia", 144], ["España", 20], ["Argentina", 10], ["México", 9], ["Brasil", 8]],
    ciudades: [["Bogotá, Colombia", 36], ["Medellín, Colombia", 12], ["Cali, Colombia", 9], ["Lomé, Togo", 4], ["Pasto, Colombia", 4]]
  };
  function renderRanking() {
    const elP = $("ranking-countries"), elC = $("ranking-cities");
    if (!elP || !elC) return;
    elP.innerHTML = RANKING.paises.map(([l, n]) => `<li><strong>${esc(l)}</strong> — ${n} ${t("ranking_fest")}</li>`).join("");
    elC.innerHTML = RANKING.ciudades.map(([l, n]) => `<li><strong>${esc(l)}</strong> — ${n} ${t("ranking_fest")}</li>`).join("");
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
    renderRanking();
    renderBooks();
    renderPress();
    renderPremios();
    renderNoticias();
    renderEventos();
    renderColaboradores();
    renderBlog();
    renderForo();
    refreshMarkers();
    // el popup del administrador se reconstruye al reabrirse; nada más que hacer
  }

  document.addEventListener("DOMContentLoaded", init);
})();
