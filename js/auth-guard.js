// js/auth-guard.js
(function() {
  const session = localStorage.getItem('ss_user_session');
  const lastActivity = localStorage.getItem('ss_last_activity');
  const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  // Compute common conditional flags
  const isSubfolder = window.location.pathname.includes('/directory/') || 
                      window.location.pathname.includes('/departments/') || 
                      window.location.pathname.includes('/okr-progress/') || 
                      window.location.pathname.includes('/org-chart/') || 
                      window.location.pathname.includes('/performance-standards/');
  
  const loginPath = isSubfolder ? '../login/index.html' : 'login/index.html';

  function logout() {
    localStorage.removeItem('ss_user_session');
    localStorage.removeItem('ss_last_activity');
    window.location.replace(loginPath);
  }

  // Gate Check 1: Is user logged in?
  if (!session) {
    window.location.replace(loginPath);
    return;
  }

  // Gate Check 2: Has user timed out from inactivity?
  if (lastActivity && (Date.now() - lastActivity > TIMEOUT_DURATION)) {
    logout();
    return;
  }

  // Step 4: Keep resetting timer if active interactions occur
  function resetTimer() {
    localStorage.setItem('ss_last_activity', Date.now());
  }

  // Listen to mouse actions, typing, and clicks to keep session alive
  window.addEventListener('mousemove', resetTimer);
  window.addEventListener('keydown', resetTimer);
  window.addEventListener('click', resetTimer);
  window.addEventListener('scroll', resetTimer);

  // Instantly record current view hit
  resetTimer();
})();