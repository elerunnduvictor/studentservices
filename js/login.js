document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim().toLowerCase();
  const errorEl = document.getElementById('errorMsg');

  // Basic email format check before we look the address up.
  const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailFormat.test(email)) {
    errorEl.textContent = 'Please enter a valid email address.';
    errorEl.style.display = 'block';
    return;
  }

  if (window.ALLOWED_USERS && window.ALLOWED_USERS.map(user => user.toLowerCase()).includes(email)) {
    // Save email and the current timestamp to compute expiration
    localStorage.setItem('ss_user_session', email);
    localStorage.setItem('ss_last_activity', Date.now());

    window.location.replace('../index.html');
  } else {
    errorEl.textContent = 'Access denied. Your email is not provisioned.';
    errorEl.style.display = 'block';
  }
});
