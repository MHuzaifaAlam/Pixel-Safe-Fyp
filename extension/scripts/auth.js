let elements = {};

/**
 * Initialize auth page
 */
function init() {
  // Cache DOM elements
  elements = {
    loginForm: document.getElementById('loginForm'),
    signupForm: document.getElementById('signupForm'),
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    loginBtn: document.getElementById('loginBtn'),
    signupUsername: document.getElementById('signupUsername'),
    signupEmail: document.getElementById('signupEmail'),
    signupPassword: document.getElementById('signupPassword'),
    signupPasswordConfirm: document.getElementById('signupPasswordConfirm'),
    signupBtn: document.getElementById('signupBtn'),
    showSignupLink: document.getElementById('showSignupLink'),
    showLoginLink: document.getElementById('showLoginLink'),
    errorMessage: document.getElementById('errorMessage'),
    successMessage: document.getElementById('successMessage'),
    backendStatus: document.getElementById('backendStatus'),
    backendStatusText: document.getElementById('backendStatusText')
  };

  // Setup event listeners
  setupEventListeners();

  // Check backend status
  checkBackendStatus();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  elements.loginForm.addEventListener('submit', handleLogin);
  elements.signupForm.addEventListener('submit', handleSignup);
  elements.showSignupLink.addEventListener('click', showSignupForm);
  elements.showLoginLink.addEventListener('click', showLoginForm);
}

/**
 * Show signup form
 */
function showSignupForm(e) {
  e.preventDefault();
  elements.loginForm.style.display = 'none';
  elements.signupForm.style.display = 'block';
  hideMessages();
}

/**
 * Show login form
 */
function showLoginForm(e) {
  e.preventDefault();
  elements.signupForm.style.display = 'none';
  elements.loginForm.style.display = 'block';
  hideMessages();
}

/**
 * Handle login
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;
  
  if (!username || !password) {
    showError('Please enter username and password');
    return;
  }
  
  // Show loading state
  setButtonLoading(elements.loginBtn, true);
  hideMessages();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'login',
      username,
      password
    });
    
    if (response.success) {
      showSuccess('Login successful! Redirecting...');
      
      // Redirect to popup after short delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      showError(response.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Connection error. Please check if backend is running.');
  } finally {
    setButtonLoading(elements.loginBtn, false);
  }
}

/**
 * Handle signup
 */
async function handleSignup(e) {
  e.preventDefault();
  
  const username = elements.signupUsername.value.trim();
  const email = elements.signupEmail.value.trim();
  const password = elements.signupPassword.value;
  const passwordConfirm = elements.signupPasswordConfirm.value;
  
  // Validation
  if (!username || !email || !password || !passwordConfirm) {
    showError('Please fill in all fields');
    return;
  }
  
  if (password !== passwordConfirm) {
    showError('Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    showError('Password must be at least 6 characters');
    return;
  }
  
  // Show loading state
  setButtonLoading(elements.signupBtn, true);
  hideMessages();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'signup',
      username,
      email,
      password
    });
    
    if (response.success) {
      showSuccess('Account created successfully! Redirecting...');
      
      // Redirect to popup after short delay
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      showError(response.error || 'Signup failed');
    }
  } catch (error) {
    console.error('Signup error:', error);
    showError('Connection error. Please check if backend is running.');
  } finally {
    setButtonLoading(elements.signupBtn, false);
  }
}

/**
 * Set button loading state
 */
function setButtonLoading(button, loading) {
  const text = button.querySelector('.btn-text');
  const spinner = button.querySelector('.btn-spinner');
  
  if (loading) {
    button.disabled = true;
    text.style.display = 'none';
    spinner.style.display = 'inline-block';
  } else {
    button.disabled = false;
    text.style.display = 'inline-block';
    spinner.style.display = 'none';
  }
}

/**
 * Show error message
 */
function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.style.display = 'block';
  elements.successMessage.style.display = 'none';
}

/**
 * Show success message
 */
function showSuccess(message) {
  elements.successMessage.textContent = message;
  elements.successMessage.style.display = 'block';
  elements.errorMessage.style.display = 'none';
}

/**
 * Hide all messages
 */
function hideMessages() {
  elements.errorMessage.style.display = 'none';
  elements.successMessage.style.display = 'none';
}

/**
 * Check backend status
 */
async function checkBackendStatus() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/');
    
    if (response.ok) {
      elements.backendStatus.className = 'backend-status online';
      elements.backendStatusText.textContent = 'Backend online';
    } else {
      showBackendOffline();
    }
  } catch (error) {
    showBackendOffline();
  }
}

/**
 * Show backend offline status
 */
function showBackendOffline() {
  elements.backendStatus.className = 'backend-status offline';
  elements.backendStatusText.textContent = 'Backend offline';
  showError('Cannot connect to Pixel Safe backend. Please ensure it is running on http://127.0.0.1:8000');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
