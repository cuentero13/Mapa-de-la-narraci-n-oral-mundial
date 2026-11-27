// Página Proyectos — Mapa Mundial de la Narración Oral (27-nov-2026).
// Mapa propio + fichas completas desde data/proyectos.json.
(function () {
  var lang = "es";
  try { lang = localStorage.getItem("noe-lang") || "es"; } catch (e) {}
  var T = (lang === "en") ? {
    que: "What it did", quien: "Executed by", periodo: "Period", recursos: "Resources",
    resultados: "Results", fuentes: "Sources", ejecutado: "Executed", encurso: "In progress",
    aprox: "Approximate location", proyectos: "documented projects", en: "in", paises: "countries"
  } : {
    que: "Qué hizo", quien: "Quién lo ejecutó", periodo: "Período", recursos: "Recursos",
    resultados: "Resultados", fuentes: "Fuentes", ejecutado: "Ejecutado", encurso: "En ejecución",
    aprox: "Ubicación aproximada", proyectos: "proyectos documentados", en: "en", paises: "países"
  };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function estadoTxt(e) { return e === "ejecutado" ? T.ejecutado : T.encurso; }
  function filas(p, completa) {
    var rows = "";
    if (p.que_hizo) rows += "<div><dt>" + esc(T.que) + "</dt><dd>" + esc(p.que_hizo) + "</dd></div>";
    if (p.quien) rows += "<div><dt>" + esc(T.quien) + "</dt><dd>" + esc(p.quien) + "</dd></div>";
    if (p.periodo) rows += "<div><dt>" + esc(T.periodo) + "</dt><dd>" + esc(p.periodo) + "</dd></div>";
    if (p.recursos) rows += "<div><dt>" + esc(T.recursos) + "</dt><dd>" + esc(p.recursos) + "</dd></div>";
    if (p.resultados) rows += "<div><dt>" + esc(T.resultados) + "</dt><dd>" + esc(p.resultados) + "</dd></div>";
    if (completa && p.fuentes && p.fuentes.length) {
      rows += "<div><dt>" + esc(T.fuentes) + "</dt><dd>" + p.fuentes.map(function (u, i) {
        return '<a href="' + esc(u) + '" target="_blank" rel="noopener">[' + (i + 1) + "]</a>";
      }).join(" ") + "</dd></div>";
    }
    return rows;
  }
  function popupHTML(p) {
    return "<h4>" + esc(p.nombre) + "</h4>" +
      "<div>" + esc([p.lugar, p.pais].filter(Boolean).join(" · ")) + "</div>" +
      "<div><em>" + esc(estadoTxt(p.estado)) + "</em></div>" +
      (p.coord_aprox ? '<div class="aprox">' + esc(T.aprox) + "</div>" : "") +
      '<dl class="fest-fields">' + filas(p, false) + "</dl>";
  }
  function cardHTML(p) {
    return '<article class="fest-card" id="proy-' + esc(p.id) + '">' +
      '<div class="fest-card-head"><h3>' + esc(p.nombre) + '</h3><span class="badge">' + esc(estadoTxt(p.estado)) + "</span></div>" +
      '<p class="fest-meta">' + esc([p.lugar, p.pais].filter(Boolean).join(" · ")) + "</p>" +
      '<dl class="fest-fields">' + filas(p, true) + "</dl></article>";
  }
  var all = [];
  var map = null, layer = null;
  var el = document.getElementById("mapa-proyectos");
  if (el && window.L) {
    map = L.map("mapa-proyectos", { worldCopyJump: true }).setView([15, -30], 2);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18, noWrap: true
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
    window.addEventListener("load", function () { map.invalidateSize(); });
    setTimeout(function () { map.invalidateSize(); }, 400);
  }
  function render(filtro) {
    var items = all.filter(function (p) { return filtro === "todas" || p.estado === filtro; });
    var list = document.getElementById("proyectos-list");
    if (list) list.innerHTML = items.map(cardHTML).join("");
    if (layer) {
      layer.clearLayers();
      items.forEach(function (p) {
        if (p.lat == null) return;
        L.circleMarker([p.lat, p.lng], {
          radius: 7, weight: 1, color: "#4a235a", fillColor: "#7D3C98", fillOpacity: 0.85
        }).bindPopup(popupHTML(p), { maxHeight: 320 }).addTo(layer);
      });
    }
  }
  fetch("data/proyectos.json").then(function (r) { return r.json(); })
    .then(function (d) {
      all = Array.isArray(d) ? d : [];
      var paises = {};
      all.forEach(function (p) { if (p.pais) paises[p.pais] = 1; });
      var c = document.getElementById("proy-count");
      if (c) c.textContent = all.length + " " + T.proyectos + " " + T.en + " " + Object.keys(paises).length + " " + T.paises + ".";
      render("todas");
    })
    .catch(function () { render("todas"); });
  document.querySelectorAll(".proy-filtro").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".proy-filtro").forEach(function (x) { x.classList.remove("active"); });
      b.classList.add("active");
      render(b.getAttribute("data-filtro"));
    });
  });
})();
