
(function () {
  const session = localStorage.getItem('ss_user_session');
  const lastActivity = localStorage.getItem('ss_last_activity');
  const TIMEOUT_DURATION = 60 * 60 * 1000; // 60 minutes

  const loginPath = '/login/index.html';

  function logout() {
    /* The offline read as well. shared/js/data-service.js writes each dataset
       under "ss_cache:<address>:<name>" so a reader keeps working through a
       brief outage; an hour of inactivity on a shared machine is exactly when
       it should not still be there.

       Cleared by prefix rather than through SS.data.clearCache() on purpose:
       this file is the first script on every page and runs before
       data-service.js exists, so it cannot call it. The prefix is the contract
       between the two. */
    try {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('ss_cache:') === 0) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    } catch (e) { /* private mode, or storage blocked */ }

    localStorage.removeItem('ss_user_session');
    localStorage.removeItem('ss_last_activity');
    window.location.replace(loginPath);
  }

  function checkSessionValidity() {
    const currentSession = localStorage.getItem('ss_user_session');
    const currentActivity = localStorage.getItem('ss_last_activity');

    if (!currentSession) {
      window.location.replace(loginPath);
      return false;
    }

    if (currentActivity && (Date.now() - currentActivity > TIMEOUT_DURATION)) {
      logout();
      return false;
    }
    return true;
  }

  // Initial gate check
  if (!checkSessionValidity()) return;

  // Check every 5 seconds for suspended/sleeping background tabs
  setInterval(function () {
    if (!document.hidden) {
      checkSessionValidity();
    }
  }, 5000);

  function resetTimer() {
    if (document.hidden) return;
    localStorage.setItem('ss_last_activity', Date.now());
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      checkSessionValidity();
    }
  });

  window.addEventListener('mousemove', resetTimer);
  window.addEventListener('keydown', resetTimer);
  window.addEventListener('click', resetTimer);
  window.addEventListener('scroll', resetTimer);

  resetTimer();
})();
