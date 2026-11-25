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

  let map, worldLayer, adminLayer, mythLayer;

  // ---------- carga de datos ----------
  async function loadJSON(path) {
    const r = await fetch("data/" + path);
    if (!r.ok) throw new Error("No se pudo cargar " + path);
    return r.json();
  }

  async function init() {
    try {
      const [mundo, colombia, narradores, libros, parciales, prensa, menciones, destacados, miticos, fuentes, premios] =
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
        ]);
      Object.assign(DATA, { mundo, colombia, narradores, libros, parciales, prensa, menciones, destacados, miticos, fuentes, premios });
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
    renderRanking();
    renderMentions();
    renderNarrators();
    renderBooks();
    renderPress();
    renderPremios();
    bindLanguage();
  }

  // ---------- estadísticas ----------
  // Total mundial deduplicado: las fichas de mundo con pais Colombia y
  // en_colombia=true también están en la lista de Colombia (Fredy Ayala).
  function renderStats() {
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

  function festivalPopup(f) {
    const parts = [];
    parts.push(`<h4>${esc(f.nombre)}</h4>`);
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
    parts.push(`<div><a href="#dir-${f.id}">${t("dir_title")}</a></div>`);
    return parts.join("");
  }

  function colombiaPopup(c) {
    const parts = [];
    parts.push(`<h4>${esc(c.nombre)}</h4>`);
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

  function initMap() {
    if (typeof L === "undefined") throw new Error("Leaflet no cargó (CDN no disponible)");
    map = L.map("map").setView([20, -30], 2);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    worldLayer = L.layerGroup().addTo(map);
    adminLayer = L.layerGroup().addTo(map);
    mythLayer = L.layerGroup(); // apagada por defecto: solo se añade con el interruptor

    refreshMarkers();
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

  function refreshMarkers() {
    if (!map) return;
    worldLayer.clearLayers();
    adminLayer.clearLayers();
    mythLayer.clearLayers();
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
    const n = world.length + col.length;
    $("map-count").textContent = t("map_showing")(n);
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
      countries.forEach(p => {
        const o = document.createElement("option");
        o.value = p; o.textContent = p; sel.appendChild(o);
      });
      const oc = document.createElement("option");
      oc.value = "Colombia"; oc.textContent = "Colombia"; sel.appendChild(oc);
    });
    ["filter-country", "filter-status", "toggle-world", "toggle-miticos"].forEach(id => {
      $(id).addEventListener("change", refreshMarkers);
    });
    ["dir-search", "dir-country", "dir-status"].forEach(id => {
      $(id).addEventListener("input", renderDirectory);
      $(id).addEventListener("change", renderDirectory);
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
    const photo = f.foto ? `<img class="fest-photo" src="${esc(f.foto)}" alt="${esc(f.nombre)}" loading="lazy" onerror="this.remove()">` : "";
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
        `<li><strong>${esc(b.titulo)}</strong> <span class="year">${b.anio || ""}</span> — <span class="ed">${esc(b.editorial || "")}${b.pais ? ", " + esc(b.pais) : ""}</span>${b.enlace ? ` <a href="${esc(b.enlace)}" target="_blank" rel="noopener">${t("books_search")} →</a>` : ""}</li>`).join("");
      const pItems = g.p.length ? g.p.map(b =>
        `<li><strong>${esc(b.titulo)}</strong>${b.anio ? ` <span class="year">${b.anio}</span>` : ""} <span class="tag-unverified">${t("unverified_tag")}</span> <span class="ed">${esc(b.falta || "")}</span>${b.enlace ? ` <a href="${esc(b.enlace)}" target="_blank" rel="noopener">${t("books_search")} →</a>` : ""}</li>`).join("") : "";
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
          <div class="medio">${esc(p.organizador)}</div>
          <div class="fecha">${esc(p.anios)}</div>
          <p>${esc(p.reconoce)}</p>
          ${fuentes ? `<p class="fest-cita">${t("cita_apa")}: ${fuentes}</p>` : ""}
        </article>`;
      }).join("");
      return `<h3 class="subsection">${esc(pais)}</h3><div class="press-grid">${cards}</div>`;
    }).join("");
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
    refreshMarkers();
    // el popup del administrador se reconstruye al reabrirse; nada más que hacer
  }

  document.addEventListener("DOMContentLoaded", init);
})();
