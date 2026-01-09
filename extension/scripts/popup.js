
let elements = {};

/**
 * Initialize popup
 */
async function init() {
  // Cache DOM elements
  elements = {
    notLoggedIn: document.getElementById('notLoggedIn'),
    loggedIn: document.getElementById('loggedIn'),
    goToLoginBtn: document.getElementById('goToLoginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    username: document.getElementById('username'),
    statVerified: document.getElementById('statVerified'),
    statTampered: document.getElementById('statTampered'),
    recentSection: document.getElementById('recentSection'),
    recentCard: document.getElementById('recentCard'),
    recentStatus: document.getElementById('recentStatus'),
    recentConfidence: document.getElementById('recentConfidence'),
    recentTime: document.getElementById('recentTime'),
    viewResultBtn: document.getElementById('viewResultBtn'),
    settingsLink: document.getElementById('settingsLink'),
    helpLink: document.getElementById('helpLink')
  };

  // Set up event listeners
  setupEventListeners();

  // Load authentication state
  await loadAuthState();

  // Load verification statistics
  await loadStatistics();

  // Load recent verification
  await loadRecentVerification();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  elements.goToLoginBtn.addEventListener('click', openLoginPage);
  elements.logoutBtn.addEventListener('click', handleLogout);
  elements.viewResultBtn.addEventListener('click', openResultPage);
  
  elements.settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Open settings page (to be implemented)
    console.log('Settings clicked');
  });

  elements.helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Open help/documentation
    chrome.tabs.create({ url: 'https://github.com/yourusername/pixel-safe' });
  });
}

/**
 * Load authentication state
 */
async function loadAuthState() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAuthState' });
    
    if (response.success && response.data.isAuthenticated) {
      showLoggedInState(response.data);
    } else {
      showNotLoggedInState();
    }
  } catch (error) {
    console.error('Error loading auth state:', error);
    showNotLoggedInState();
  }
}

/**
 * Show logged in state
 */
function showLoggedInState(authData) {
  elements.notLoggedIn.style.display = 'none';
  elements.loggedIn.style.display = 'block';
  elements.username.textContent = authData.username || 'User';
}

/**
 * Show not logged in state
 */
function showNotLoggedInState() {
  elements.notLoggedIn.style.display = 'block';
  elements.loggedIn.style.display = 'none';
}

/**
 * Load verification statistics from backend
 */
async function loadStatistics() {
  try {
    // Fetch reports from backend
    const response = await chrome.runtime.sendMessage({ 
      action: 'fetchReports',
      limit: 100 
    });
    
    if (response.success && response.data) {
      const reports = Array.isArray(response.data) ? response.data : [];
      
      // Count verified vs tampered
      let verified = 0;
      let tampered = 0;
      
      reports.forEach(report => {
        const status = report.verification_status || report.status || '';
        if (status === 'Verified' || status === 'Valid') {
          verified++;
        } else if (status === 'Tampered' || status === 'Suspicious') {
          tampered++;
        }
      });
      
      elements.statVerified.textContent = verified;
      elements.statTampered.textContent = tampered;
      
      // Store stats in local storage for offline access
      await chrome.storage.local.set({
        verificationStats: { verified, tampered, total: reports.length }
      });
    } else {
      // Fallback to local storage
      const stats = await chrome.storage.local.get(['verificationStats']);
      if (stats.verificationStats) {
        elements.statVerified.textContent = stats.verificationStats.verified || 0;
        elements.statTampered.textContent = stats.verificationStats.tampered || 0;
      }
    }
  } catch (error) {
    console.error('Error loading statistics:', error);
    // Fallback to local storage
    const stats = await chrome.storage.local.get(['verificationStats']);
    if (stats.verificationStats) {
      elements.statVerified.textContent = stats.verificationStats.verified || 0;
      elements.statTampered.textContent = stats.verificationStats.tampered || 0;
    }
  }
}

/**
 * Load recent verification
 */
async function loadRecentVerification() {
  try {
    const result = await chrome.storage.local.get(['lastVerificationResult']);
    
    if (result.lastVerificationResult) {
      const data = result.lastVerificationResult;
      
      // Show recent section
      elements.recentSection.style.display = 'block';
      
      // Update status badge
      const isVerified = data.verified && !data.tampered;
      elements.recentStatus.textContent = isVerified ? 'Verified' : 'Tampered';
      elements.recentStatus.className = `status-badge ${isVerified ? 'success' : 'error'}`;
      
      // Update confidence
      const confidence = Math.round(data.confidence || 0);
      elements.recentConfidence.textContent = `${confidence}%`;
      
      // Update time
      const timeAgo = getTimeAgo(data.timestamp);
      elements.recentTime.textContent = timeAgo;
    } else {
      elements.recentSection.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading recent verification:', error);
  }
}

/**
 * Get time ago string
 */
function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Open login page
 */
function openLoginPage() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('pages/login.html')
  });
}

/**
 * Open result page
 */
function openResultPage() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('pages/result.html')
  });
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'logout' });
    
    if (response.success) {
      // Clear local stats
      await chrome.storage.local.remove(['verificationStats', 'lastVerificationResult']);
      
      // Update UI
      showNotLoggedInState();
    }
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
