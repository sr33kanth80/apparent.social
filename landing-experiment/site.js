// Shared chrome for every page: SVG mark sprite + top nav + hero footer,
// plus favicon/OG injection and scroll-reveal. One place to own them all.
(function () {
  var MARK = 'M 128.005 191.173 C 128.448 156.208 156.93 128 192 128 L 192 64 L 128 64 C 128 99.346 99.346 128 64 128 L 64 192 L 128 192 Z M 192 256 L 64 256 C 28.654 256 0 227.346 0 192 L 0 64 L 64 64 L 64 0 L 192 0 C 227.346 0 256 28.654 256 64 L 256 192 L 192 192 Z';

  var sprite =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' +
      '<symbol id="apparent-mark" viewBox="0 0 256 256"><path fill="currentColor" d="' + MARK + '"/></symbol>' +
    '</svg>';

  var nav =
    '<header class="nav" id="nav"><div class="nav-row">' +
      '<a class="brand" href="index.html" aria-label="Apparent home"><svg class="mark"><use href="#apparent-mark"/></svg><img class="word" src="apparent-wordmark.png" alt="Apparent" /></a>' +
      '<nav class="nav-links">' +
        '<a href="for-investors.html">For investors</a>' +
        '<a href="for-founders.html">For founders</a>' +
        '<a href="thesis.html">Thesis</a>' +
        '<a href="heat-map.html">Heat Map</a>' +
        '<a href="blog.html">Blog</a>' +
        '<a href="about.html">About</a>' +
      '</nav>' +
      '<div class="nav-actions">' +
        '<a class="nav-login" href="login.html">Log in</a>' +
        '<a class="btn btn-filled" href="signup.html">Sign up</a>' +
      '</div>' +
    '</div></header>';

  var footer =
    '<footer class="bigfooter">' +
      '<div class="inner">' +
        '<div class="bf-top">' +
          '<div class="bf-cta">' +
            '<h2>Where proof meets capital.</h2>' +
            '<p class="bf-tag">Proof of work is the new warm intro. Founders show what they\'ve built; investors find them by thesis, proof, and timing.</p>' +
            '<div class="cta">' +
              '<a class="btn btn-filled bf-btn" href="signup.html">Source your deal flow</a>' +
              '<a class="btn bf-btn bf-ghost" href="for-founders.html">Launch on Apparent</a>' +
            '</div>' +
          '</div>' +
          '<div class="bf-cols">' +
            '<div><h4>Product</h4>' +
              '<a href="for-investors.html">Investor sourcing</a>' +
              '<a href="for-founders.html">Founder profiles</a>' +
              '<a href="heat-map.html">Builder Radar</a>' +
              '<a href="thesis.html">How it works</a>' +
            '</div>' +
            '<div><h4>Company</h4>' +
              '<a href="about.html">About</a>' +
              '<a href="blog.html">Blog</a>' +
              '<a href="resources.html">Resources</a>' +
              '<a href="contact.html">Contact</a>' +
            '</div>' +
            '<div><h4>Get started</h4>' +
              '<a href="login.html">Log in</a>' +
              '<a href="signup.html">Sign up</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<img class="bf-word" src="apparent-wordmark-white.png" alt="Apparent" />' +
        '<div class="bf-bottom">' +
          '<span>&copy; 2026 Apparent. Verified dealflow for investors. Design experiment.</span>' +
          '<span class="bf-legal"><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a><a href="cookies.html">Cookies</a></span>' +
        '</div>' +
      '</div>' +
    '</footer>';

  document.body.insertAdjacentHTML('afterbegin', sprite + nav);
  document.body.insertAdjacentHTML('beforeend', footer);

  // Favicon + Open Graph / Twitter tags, derived from the page's own title/description.
  var desc = (document.querySelector('meta[name="description"]') || {}).content || '';
  document.head.insertAdjacentHTML('beforeend',
    '<link rel="icon" href="favicon.svg" />' +
    '<meta property="og:type" content="website" />' +
    '<meta property="og:site_name" content="Apparent" />' +
    '<meta property="og:title" content="' + document.title.replace(/"/g, '&quot;') + '" />' +
    '<meta property="og:description" content="' + desc.replace(/"/g, '&quot;') + '" />' +
    '<meta property="og:image" content="apparent-wordmark.png" />' +
    '<meta name="twitter:card" content="summary_large_image" />'
  );

  // Nav hairline / floating-pill toggle once scrolled off the hero.
  var navEl = document.getElementById('nav');
  var onScroll = function () { navEl.classList.toggle('scrolled', window.scrollY > 24); };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mark the current page's nav link active (matches by filename).
  var here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    if (a.getAttribute('href') === here) a.classList.add('active');
  });

  // Scroll-reveal: fade sections in as they enter view. Skip the first (hero)
  // so the top of the page is stable on load. Adds class via JS so no-JS stays visible.
  if ('IntersectionObserver' in window) {
    var sections = Array.prototype.slice.call(document.querySelectorAll('main > section'), 1);
    sections.forEach(function (el) { el.classList.add('reveal-init'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.remove('reveal-init');
          e.target.classList.add('reveal-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.04 });
    sections.forEach(function (el) { io.observe(el); });
  }
})();
