
(function () {
  const session = localStorage.getItem('ss_user_session');
  const lastActivity = localStorage.getItem('ss_last_activity');
  const TIMEOUT_DURATION = 60 * 60 * 1000; // 60 minutes

  const loginPath = '/login/index.html';

  function logout() {
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
