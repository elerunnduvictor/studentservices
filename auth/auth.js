/* ══════════════════════════════════════════════════════════
   AUTH GATE — splash + 30-min idle session.

   To change the password: replace PASSWORD_HASH with the
   SHA-256 hex digest of the new password. Generate it via:
     python -c "import hashlib; print(hashlib.sha256(b'NEW').hexdigest())"
   or in DevTools console:
     crypto.subtle.digest('SHA-256', new TextEncoder().encode('NEW'))
       .then(b => console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))

   This is a soft access gate, not real security — anyone who
   inspects the JS can find the hash and dictionary-attack it
   offline. Use only for casual access control.
   ══════════════════════════════════════════════════════════ */
(function () {
  var PASSWORD_HASH = '154c2b3b13362fd0c06b7b07fae76c7d19b642dd706fc20d1668236a576676ac';
  var SESSION_KEY  = 'ss-auth-session';
  var IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  var ACTIVITY_THROTTLE_MS = 5 * 1000;  // write to storage at most every 5s

  // Lock immediately so content can't flash through before the splash mounts
  var docEl = document.documentElement;
  docEl.classList.add('ss-locked');

  function readSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function writeSession(data) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function isSessionValid() {
    var s = readSession();
    if (!s || typeof s.lastActivity !== 'number') return false;
    return (Date.now() - s.lastActivity) < IDLE_TIMEOUT_MS;
  }

  function startSession() {
    writeSession({ unlockedAt: Date.now(), lastActivity: Date.now() });
  }

  var lastTouch = 0;
  function refreshActivity() {
    var now = Date.now();
    if (now - lastTouch < ACTIVITY_THROTTLE_MS) return;
    lastTouch = now;
    var s = readSession();
    if (!s) return;
    s.lastActivity = now;
    writeSession(s);
  }

  function attachActivityTracking() {
    var events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointermove'];
    events.forEach(function (ev) {
      window.addEventListener(ev, refreshActivity, { passive: true });
    });
    // Periodic check — if idle expired, lock the page (force a reload to splash)
    setInterval(function () {
      if (!isSessionValid()) {
        clearSession();
        window.location.reload();
      }
    }, 30 * 1000);
    // Re-check when the tab becomes visible again
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !isSessionValid()) {
        clearSession();
        window.location.reload();
      }
    });
  }

  function unlock() {
    var splash = document.getElementById('ss-auth-splash');
    docEl.classList.remove('ss-locked');
    if (splash) {
      splash.classList.add('ss-auth-out');
      setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 350);
    }
    attachActivityTracking();
  }

  function sha256Hex(text) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.reject(new Error('Web Crypto unavailable'));
    }
    var data = new TextEncoder().encode(text);
    return window.crypto.subtle.digest('SHA-256', data).then(function (buf) {
      return Array.prototype.map
        .call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    });
  }

  function buildSplash() {
    var splash = document.createElement('div');
    splash.id = 'ss-auth-splash';
    splash.innerHTML =
      '<div class="ss-auth-card">' +
        '<div class="ss-auth-brand">Student Services</div>' +
        '<h1 class="ss-auth-title">Welcome to the<br><strong>Student Services Hub</strong></h1>' +
        '<p class="ss-auth-sub">Please enter the access password to continue.</p>' +
        '<form id="ss-auth-form" autocomplete="off">' +
          '<input type="password" id="ss-auth-input" name="password" placeholder="Password" autocomplete="current-password" required>' +
          '<button type="submit" id="ss-auth-submit">Unlock</button>' +
          '<div id="ss-auth-error" role="alert" aria-live="polite"></div>' +
        '</form>' +
        '<div class="ss-auth-footer">BYU-Pathway Worldwide</div>' +
      '</div>';
    return splash;
  }

  function showSplash() {
    var splash = buildSplash();
    var mount = function () {
      document.body.appendChild(splash);
      var form  = splash.querySelector('#ss-auth-form');
      var input = splash.querySelector('#ss-auth-input');
      var btn   = splash.querySelector('#ss-auth-submit');
      var err   = splash.querySelector('#ss-auth-error');
      var card  = splash.querySelector('.ss-auth-card');
      setTimeout(function () { input.focus(); }, 80);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var value = input.value;
        if (!value) return;
        btn.disabled = true;
        err.textContent = '';
        sha256Hex(value).then(function (hash) {
          if (hash === PASSWORD_HASH) {
            startSession();
            unlock();
          } else {
            input.value = '';
            err.textContent = 'Incorrect password.';
            card.classList.remove('ss-auth-shake');
            // Re-trigger animation
            void card.offsetWidth;
            card.classList.add('ss-auth-shake');
            input.focus();
          }
        }).catch(function () {
          err.textContent = 'Browser does not support secure hashing. Use a modern browser.';
        }).finally(function () { btn.disabled = false; });
      });
    };
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);
  }

  // Boot
  if (isSessionValid()) {
    docEl.classList.remove('ss-locked');
    // Bump activity so the timer restarts on each page nav
    var s = readSession();
    if (s) { s.lastActivity = Date.now(); writeSession(s); }
    attachActivityTracking();
  } else {
    clearSession();
    showSplash();
  }
})();
