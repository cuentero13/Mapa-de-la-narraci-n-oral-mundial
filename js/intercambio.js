// Tablero de intercambio — Mapa Mundial de la Narración Oral (27-nov-2026).
// Las propuestas NO se publican automáticamente: el formulario arma un correo
// a la Fundación, que verifica la propuesta y la publica en
// data/intercambio.json. El contacto entre fichas usa los canales públicos
// que cada perfil ya trae.
(function () {
  var lang = "es";
  try { lang = localStorage.getItem("noe-lang") || "es"; } catch (e) {}
  var L = (lang === "en") ? {
    colaboracion: "Collaboration", intercambio: "Exchange", gira: "Tour",
    ofrece: "Offers", busca: "Seeks", fechas: "Dates", contacto: "Contact",
    vacio: "There are no published proposals here yet. The board just opened: publish the first one with the form below.",
    nota: "Your email app will open with the proposal ready to send. The Foundation verifies it and publishes it on this board; nothing is published automatically."
  } : {
    colaboracion: "Colaboración", intercambio: "Intercambio", gira: "Gira",
    ofrece: "Ofrece", busca: "Busca", fechas: "Fechas", contacto: "Contacto",
    vacio: "Todavía no hay propuestas publicadas. El tablero acaba de abrir: publicá la primera con el formulario de abajo.",
    nota: "Se abrirá tu correo con la propuesta lista para enviar. La Fundación la verifica y la publica en este tablero; nada se publica automáticamente."
  };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var all = [];
  var listEl = document.getElementById("intercambio-list");
  function contactoHTML(c) {
    if (!c) return "";
    if (String(c).indexOf("http") === 0) return '<a href="' + esc(c) + '" target="_blank" rel="noopener">' + esc(c) + "</a>";
    if (String(c).indexOf("@") > 0) return '<a href="mailto:' + esc(c) + '">' + esc(c) + "</a>";
    return esc(c);
  }
  function render(filtro) {
    if (!listEl) return;
    var items = all.filter(function (p) { return filtro === "todas" || p.tipo === filtro; });
    if (!items.length) { listEl.innerHTML = '<p class="muted">' + esc(L.vacio) + "</p>"; return; }
    listEl.innerHTML = items.map(function (p) {
      var rows = "";
      if (p.ofrece) rows += "<div><dt>" + esc(L.ofrece) + "</dt><dd>" + esc(p.ofrece) + "</dd></div>";
      if (p.busca) rows += "<div><dt>" + esc(L.busca) + "</dt><dd>" + esc(p.busca) + "</dd></div>";
      if (p.fechas) rows += "<div><dt>" + esc(L.fechas) + "</dt><dd>" + esc(p.fechas) + "</dd></div>";
      if (p.contacto) rows += "<div><dt>" + esc(L.contacto) + "</dt><dd>" + contactoHTML(p.contacto) + "</dd></div>";
      return '<article class="fest-card"><div class="fest-card-head"><h3>' + esc(p.titulo) + '</h3>' +
        '<span class="badge">' + esc(L[p.tipo] || p.tipo) + "</span></div>" +
        '<p class="fest-meta">' + esc(p.quien) + (p.pais ? " · " + esc(p.pais) : "") + "</p>" +
        '<dl class="fest-fields">' + rows + "</dl></article>";
    }).join("");
  }
  if (listEl) {
    fetch("data/intercambio.json").then(function (r) { return r.json(); })
      .then(function (d) { all = Array.isArray(d) ? d : (d.propuestas || []); render("todas"); })
      .catch(function () { render("todas"); });
    document.querySelectorAll(".inter-filtro").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".inter-filtro").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        render(b.getAttribute("data-filtro"));
      });
    });
  }
  var form = document.getElementById("intercambio-form");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      function v(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
      var pub = document.getElementById("f-publico");
      if (pub && !pub.checked) { pub.focus(); return; }
      var tipoSel = document.getElementById("f-tipo");
      var tipoTxt = tipoSel ? tipoSel.options[tipoSel.selectedIndex].text : "";
      var lineas = [
        "Nombre (persona o festival): " + v("f-nombre"),
        "País: " + v("f-pais"),
        "Tipo de propuesta: " + tipoTxt,
        "Título: " + v("f-titulo"),
        "Ofrece: " + v("f-ofrece"),
        "Busca: " + v("f-busca"),
        "Fechas o disponibilidad: " + v("f-fechas"),
        "Contacto para publicar: " + v("f-contacto"),
        "Acepto que esta propuesta y este contacto se publiquen en el Tablero de intercambio del Mapa Mundial de la Narración Oral."
      ];
      var url = "mailto:info@festivalpurocuento.com?subject=" +
        encodeURIComponent("Propuesta de intercambio: " + v("f-titulo")) +
        "&body=" + encodeURIComponent(lineas.join("\n"));
      var nota = document.getElementById("intercambio-nota");
      if (nota) { nota.hidden = false; nota.textContent = L.nota; }
      window.location.href = url;
    });
  }
})();
