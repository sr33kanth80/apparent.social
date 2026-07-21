// Login / signup behaviour. Role (founder|investor) + mode (signup|signin) toggles,
// mirroring the real app's auth panel. Copy swaps live; buttons are UI-only here.
(function () {
  var COPY = {
    founder: {
      headline: 'Build proof. <em>Meet capital.</em>',
      lede: 'Create a founder profile, connect GitHub, list products, and get discovered by VCs whose thesis fits what you are building.',
      ctx: ['Connect GitHub and public proof', 'List products and launches', 'Get discovered by thesis-fit investors'],
      pillars: [
        ['Proof', 'GitHub links', 'Show real shipping cadence and code history.'],
        ['Radar', 'Nearby peers', 'Find founders in your city and category.'],
        ['Motion', 'Investor DMs', 'Cold-pitch direct, track replies in-app.'],
      ],
      title: 'Create founder profile',
      email: 'founder@startup.com',
      bound: 'Founder profiles are bound to the email used here.',
    },
    investor: {
      headline: 'Define thesis. <em>Find cracked builders.</em>',
      lede: 'Create an investor profile, share your thesis, discover builders, and host meetups around the communities you want to back.',
      ctx: ['Publish your investment thesis', 'Discover proof-of-work builder profiles', 'Host meetups and follow launches'],
      pillars: [
        ['Proof', 'Thesis fit', 'Score builders against your sectors and stage.'],
        ['Radar', 'Builder density', '1,800+ VCs and a live builder map at a glance.'],
        ['Motion', 'Deal flow', 'Kanban every signal from inbox to meeting.'],
      ],
      title: 'Create investor profile',
      email: 'partner@fund.com',
      bound: 'Investor profiles are bound to the email used here.',
    },
  };

  var params = new URLSearchParams(location.search);
  var role = params.get('role') === 'investor' ? 'investor' : 'founder';
  var mode = document.body.getAttribute('data-mode') === 'signin' ? 'signin' : 'signup';

  var $ = function (s) { return document.querySelector(s); };
  var set = function (s, t) { var el = $(s); if (el) el.textContent = t; };

  function render() {
    var c = COPY[role];
    var verb = mode === 'signup' ? 'Sign up' : 'Sign in';

    $('[data-headline]').innerHTML = c.headline;
    set('[data-lede]', c.lede);

    // Context list (left) + context box (card) share the same items.
    $('.auth-list').innerHTML = c.ctx.map(function (t, i) {
      return '<div class="it"><span>0' + (i + 1) + '</span><p>' + t + '</p></div>';
    }).join('');
    $('.auth-ctx').innerHTML = c.ctx.map(function (t) {
      return '<p><i></i>' + t + '</p>';
    }).join('');

    $('.pillars').innerHTML = c.pillars.map(function (p) {
      return '<div class="pillar"><div class="pl">' + p[0] + '</div><b>' + p[1] + '</b><p>' + p[2] + '</p></div>';
    }).join('');

    set('[data-title]', mode === 'signin' ? 'Welcome back' : c.title);
    set('[data-desc]', mode === 'signin'
      ? 'Sign in to pick up your ' + role + ' workspace where you left off.'
      : (role === 'investor'
          ? 'Publish your thesis, discover builders, and follow founder activity.'
          : 'Build your profile, publish launches, and get discovered by investors.'));

    set('[data-m="Google"]', verb + ' with Google');
    set('[data-m="email"]', verb + ' with email');
    set('[data-m="username"]', verb + ' with username');

    set('[data-fine]', c.bound + ' Suggested: ' + c.email);

    var foot = $('[data-foot]');
    foot.innerHTML = mode === 'signup'
      ? 'Already have an account? <a href="login.html' + (role === 'investor' ? '?role=investor' : '') + '">Log in</a>'
      : 'New to Apparent? <a href="signup.html' + (role === 'investor' ? '?role=investor' : '') + '">Sign up</a>';

    // Reflect state on the toggles.
    document.querySelectorAll('[data-role]').forEach(function (b) { b.classList.toggle('on', b.dataset.role === role); });
    document.querySelectorAll('[data-modebtn]').forEach(function (b) { b.classList.toggle('on', b.dataset.modebtn === mode); });
  }

  document.querySelectorAll('[data-role]').forEach(function (b) {
    b.addEventListener('click', function () { role = b.dataset.role; render(); });
  });
  document.querySelectorAll('[data-modebtn]').forEach(function (b) {
    b.addEventListener('click', function () { mode = b.dataset.modebtn; render(); });
  });

  // UI-only: methods don't post anywhere in this experiment.
  document.querySelectorAll('.auth-methods .btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var note = $('[data-fine]');
      note.textContent = 'This is a design experiment, auth is not wired up here.';
    });
  });

  render();
})();
