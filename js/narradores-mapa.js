// Mapa mundial de narradores (narradores.html) — 27-nov-2026.
// Un marcador por narrador desde data/narradores-mapa.json, generado desde
// data/narradores.json: 168 con coordenada propia y 92 ubicados por su
// localidad o país (marcados como aproximados en la ficha). 37 fichas sin
// ubicación registrada quedan fuera del mapa hasta completar sus datos.
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

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  fetch('data/narradores-mapa.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var pts = [];
      data.forEach(function (n) {
        var lugar = [n.l, n.p].filter(Boolean).join(' · ');
        var html = '<strong>' + esc(n.n) + '</strong>' + (lugar ? '<br>' + esc(lugar) : '');
        if (n.a) html += '<br><em>Ubicación aproximada</em>';
        if (n.e) html += '<br><a href="' + esc(n.e) + '" target="_blank" rel="noopener">Ver enlace</a>';
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
