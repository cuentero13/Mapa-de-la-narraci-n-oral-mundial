// Mapa mundial de narradores (narradores.html) — 27-nov-2026.
// Un marcador por narrador desde data/narradores-mapa.json, generado desde
// data/narradores.json con TODA la información de cada ficha (localidad,
// país, enlaces completos e in memoriam): 168 con coordenada propia y 92
// ubicados por su localidad o país (marcados como aproximados). 37 fichas
// sin ubicación registrada quedan fuera hasta completar sus datos.
(function () {
  var el = document.getElementById('mapa-narradores');
  if (!el || typeof L === 'undefined') return;
  var map = L.map('mapa-narradores', {
    maxBounds: [[-70, -190], [85, 190]],
    maxBoundsViscosity: 0.8
  }).setView([15, -40], 2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    noWrap: true,
    bounds: [[-90, -180], [90, 180]],
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  var LABELS = { web: 'Web', facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', x: 'X', tiktok: 'TikTok', otros: 'Enlace' };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function linksHtml(links) {
    if (!links) return '';
    var parts = [];
    Object.keys(links).forEach(function (k) {
      var v = links[k];
      if (v && String(v).indexOf('http') === 0) {
        parts.push('<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(LABELS[k] || k) + '</a>');
      }
    });
    return parts.length ? '<br>' + parts.join(' · ') : '';
  }

  // Leaflet calcula el tamaño al crear el mapa; si el diseño termina de
  // cargar después (fuentes, desplazamiento), las baldosas quedan cortadas.
  // Se recalcula al terminar la carga y poco después de abrir la página.
  window.addEventListener('load', function () { map.invalidateSize(); });
  setTimeout(function () { map.invalidateSize(); }, 400);

  fetch('data/narradores-mapa.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var pts = [];
      data.forEach(function (n) {
        var lugar = [n.l, n.p].filter(Boolean).join(' · ');
        var html = '<strong>' + esc(n.n) + '</strong>' + (lugar ? '<br>' + esc(lugar) : '');
        if (n.m) html += '<br><em>In memoriam</em>';
        if (n.a) html += '<br><em>Ubicación aproximada</em>';
        html += linksHtml(n.links);
        L.circleMarker([n.lat, n.lng], {
          radius: 6, weight: 1, color: '#7c2d12', fillColor: '#d97706', fillOpacity: 0.85
        }).addTo(map).bindPopup(html);
        pts.push([n.lat, n.lng]);
      });
      if (pts.length) map.fitBounds(pts, { padding: [20, 20] });
      var c = document.getElementById('narr-mapa-count');
      if (c) c.textContent = data.length + ' narradores ubicados en el mapa.';
    })
    .catch(function () { /* si falla la carga, la página sigue sin el mapa */ });
})();
