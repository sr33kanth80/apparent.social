// Renders a legal page from window.LEGAL based on <body data-legal="...">.
(function () {
  var c = window.LEGAL[document.body.getAttribute('data-legal')];
  if (!c) return;
  document.getElementById('legal-title').textContent = c.title;
  document.getElementById('legal-intro').textContent = c.intro;
  document.getElementById('legal-grid').innerHTML = c.sections.map(function (s) {
    return '<article class="legal-card"><h2>' + s[0] + '</h2><p>' + s[1] + '</p></article>';
  }).join('');
})();
