// «Conocé a los narradores» (narradores.html) — 27-nov-2026.
// Slide con TODAS las fichas de data/narradores.json: nombre, localidad,
// país, enlaces completos e in memoriam. Avanza solo y con los botones.
(function () {
  var track = document.getElementById('narr-slide');
  if (!track) return;
  var LABELS = { web: 'Web', facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', x: 'X', tiktok: 'TikTok', otros: 'Enlace' };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  fetch('data/narradores.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var items = Array.isArray(data) ? data : Object.values(data)[0];
      track.innerHTML = items.map(function (n) {
        var lugar = [n.localidad, n.pais].filter(Boolean).join(' · ');
        var links = '';
        if (n.enlaces) {
          var parts = [];
          Object.keys(n.enlaces).forEach(function (k) {
            var v = n.enlaces[k];
            if (v && String(v).indexOf('http') === 0) {
              parts.push('<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(LABELS[k] || k) + '</a>');
            }
          });
          if (parts.length) links = '<p class="narr-slide-links">' + parts.join(' · ') + '</p>';
        }
        return '<article class="narr-slide-card">' +
          '<h4>' + esc(n.nombre) + '</h4>' +
          (lugar ? '<p class="muted">' + esc(lugar) + '</p>' : '') +
          (n.memoria ? '<p><em>In memoriam</em></p>' : '') +
          links +
          '</article>';
      }).join('');
      var c = document.getElementById('narr-slide-count');
      if (c) c.textContent = items.length + ' narradoras y narradores en la red.';

      var paso = 264;
      function avanzar() {
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
          track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          track.scrollBy({ left: paso, behavior: 'smooth' });
        }
      }
      var prev = document.getElementById('narr-prev');
      var next = document.getElementById('narr-next');
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -paso, behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: paso, behavior: 'smooth' }); });
      var timer = setInterval(avanzar, 3500);
      ['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) {
        track.addEventListener(ev, function () { clearInterval(timer); }, { passive: true });
      });
    })
    .catch(function () { /* sin slide si falla la carga */ });
})();
