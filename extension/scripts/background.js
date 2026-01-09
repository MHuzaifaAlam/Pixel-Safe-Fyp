
const API_BASE_URL = 'http://127.0.0.1:8000/api';
const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

// State management
let authState = {
  accessToken: null,
  refreshToken: null,
  username: null,
  isAuthenticated: false
};

/**
 * Keep service worker alive
 */
function keepAlive() {
  setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // Just a ping to keep worker alive
    });
  }, 20000); // Every 20 seconds
}

/**
 * Initialize extension
 */
async function init() {
  console.log('Pixel Safe: Background worker initialized');
  
  // Load saved auth state
  await loadAuthState();
  
  // Set up token refresh interval
  if (authState.isAuthenticated) {
    setInterval(refreshAccessToken, TOKEN_REFRESH_INTERVAL);
  }
  
  // Keep service worker alive
  keepAlive();
  
  // Listen for messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender).then(sendResponse);
    return true; // Keep channel open for async response
  });
}

/**
 * Load authentication state from storage
 */
async function loadAuthState() {
  try {
    const result = await chrome.storage.local.get(['accessToken', 'refreshToken', 'username']);
    
    if (result.accessToken && result.refreshToken) {
      authState = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        username: result.username || null,
        isAuthenticated: true
      };
      console.log('Pixel Safe: Auth state loaded');
    }
  } catch (error) {
    console.error('Pixel Safe: Error loading auth state:', error);
  }
}

/**
 * Save authentication state to storage
 */
async function saveAuthState() {
  try {
    await chrome.storage.local.set({
      accessToken: authState.accessToken,
      refreshToken: authState.refreshToken,
      username: authState.username
    });
  } catch (error) {
    console.error('Pixel Safe: Error saving auth state:', error);
  }
}

/**
 * Clear authentication state
 */
async function clearAuthState() {
  authState = {
    accessToken: null,
    refreshToken: null,
    username: null,
    isAuthenticated: false
  };
  await chrome.storage.local.remove(['accessToken', 'refreshToken', 'username']);
}

/**
 * Handle messages from content scripts and popup
 */
async function handleMessage(request, sender) {
  try {
    switch (request.action) {
      case 'verifyImage':
        return await verifyImage(request.imageData, request.imageUrl, request.platform, request.imageType);
      
      case 'login':
        return await login(request.username, request.password);
      
      case 'signup':
        return await signup(request.username, request.email, request.password);
      
      case 'logout':
        return await logout();
      
      case 'getAuthState':
        return { success: true, data: authState };
      
      case 'openResult':
        return await openResultPage(request.resultData);
      
      case 'refreshToken':
        return await refreshAccessToken();
      
      case 'fetchReports':
        return await fetchUserReports(request.limit);
      
      default:
        return { success: false, error: 'Unknown action' };
    }
  } catch (error) {
    console.error('Pixel Safe: Message handler error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verify image with backend
 */
async function verifyImage(imageData, imageUrl, platform, imageType = 'image/jpeg') {
  try {
    console.log('Pixel Safe: Verifying image from', platform, imageUrl);
    
    // Check authentication
    if (!authState.isAuthenticated) {
      throw new Error('Please login first to verify images');
    }
    
    // Convert array back to Uint8Array, then to blob (no quality loss)
    const uint8Array = new Uint8Array(imageData);
    const blob = new Blob([uint8Array], { type: imageType });
    
    // Determine file extension from mime type
    const extension = imageType.split('/')[1] || 'jpg';
    
    // Create form data
    const formData = new FormData();
    formData.append('image', blob, `image.${extension}`);
    formData.append('source_platform', platform || 'unknown');
    formData.append('source_url', imageUrl || '');
    
    // Send to backend (try auto-verify first)
    const apiResponse = await fetch(`${API_BASE_URL}/watermark/auto-verify/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authState.accessToken}`
      },
      body: formData
    });
    
    if (apiResponse.status === 401) {
      // Token expired, try refresh
      await refreshAccessToken();
      return await verifyImage(imageData, imageUrl, platform, imageType);
    }
    
    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || 'Verification failed');
    }
    
    const data = await apiResponse.json();
    
    console.log('Pixel Safe: Backend response:', data); // Debug log
    
    // Parse the backend response structure
    const verification = data.verification || {};
    const metrics = data.metrics || {};
    const autoDetection = data.auto_detection || {};
    const visualAnalysis = data.visual_analysis || {};
    const hashes = data.hashes || {};
    const reportId = data.report_id || null;
    
    // Determine verification status
    let status = verification.status || data.status || 'unknown';
    let isVerified = false;
    let isTampered = false;
    let confidence = 0;

    // Map backend status values to display values
    if (status === 'no_watermark_detected' || status === 'not_found') {
      status = 'no_watermark_detected';
      confidence = 0;
    } else if (status === 'authentic') {
      isVerified = true;
      status = 'Verified';
      // Map confidence levels to percentages
      const confidenceLevel = verification.confidence || 'medium';
      if (confidenceLevel === 'certain' || confidenceLevel === 'very high') confidence = 95;
      else if (confidenceLevel === 'high') confidence = 85;
      else if (confidenceLevel === 'medium') confidence = 70;
      else confidence = 50;
    } else if (status === 'recompressed') {
      isVerified = true;
      status = 'Verified';
      confidence = 65; // Lower confidence for compressed images
    } else if (status === 'tampered' || status === 'watermark_removed') {
      isTampered = true;
      status = 'Tampered';
      const confidenceLevel = verification.confidence || 'high';
      if (confidenceLevel === 'certain' || confidenceLevel === 'very high') confidence = 95;
      else if (confidenceLevel === 'high') confidence = 85;
      else confidence = 70;
    } else {
      // Unknown status
      status = 'Unknown';
      confidence = 0;
    }
    
    // Extract forensic metrics
    const stats = visualAnalysis.statistics || {};
    const forensicMetrics = {
      hash_distance: metrics.visual?.hamming_distance || 0,
      visual_similarity: metrics.visual?.visual_similarity_percent || 0,
      correlation: metrics.watermark?.similarity || 0,
      bit_error_rate: metrics.watermark?.bit_error_rate || 0,
      decryption_success: metrics.watermark?.decryption_success || false,
      hash_match: metrics.watermark?.decrypted_hash_match || false,
      original_phash: hashes.original_phash || '',
      current_phash: hashes.current_phash || '',
      // Add statistics from visual analysis
      ssim: stats.ssim || null,
      psnr: stats.psnr || null,
      mse: stats.mse || null,
      mae: stats.mae || null,
      correlation_stat: stats.correlation || null,
      statistics: stats
    };
    
    console.log('Pixel Safe: Extracted metrics:', forensicMetrics); // Debug log
    
    // Fetch full report data if report_id is available
    let reportData = null;
    if (reportId) {
      try {
        const reportResponse = await fetch(`${API_BASE_URL}/reports/${reportId}/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authState.accessToken}`
          }
        });
        if (reportResponse.ok) {
          reportData = await reportResponse.json();
        }
      } catch (error) {
        console.error('Failed to fetch report data:', error);
      }
    }
    
    // Store result in storage for result page
    await chrome.storage.local.set({
      lastVerificationResult: {
        status: status,
        verified: isVerified,
        tampered: isTampered,
        confidence: confidence,
        message: verification.reason || data.message || (status === 'no_watermark_detected' ? 'No matching watermark found for this image.' : 'Verification complete'),
        forensicMetrics: forensicMetrics,
        autoDetection: {
          detected: autoDetection.success || false,
          watermarkId: autoDetection.detected_watermark_id || null,
          method: autoDetection.detection_method || 'unknown',
          detectionConfidence: autoDetection.detection_confidence || 'low',
          originalFilename: autoDetection.original_filename || 'Unknown'
        },
        visualAnalysis: {
          overlayUrl: visualAnalysis.tampering_overlay || visualAnalysis.overlay_url || null,
          heatmapUrl: data.heatmap_image_url || null,
          suspiciousUrl: data.suspicious_image_url || null,
          comparisonUrl: visualAnalysis.comparison_url || null
        },
        report: reportData ? {
          reportId: reportData.report_id,
          originalImage: reportData.image?.image || null,
          heatmapImage: reportData.heatmap_image || null,
          suspiciousImage: reportData.suspicious_image || null,
          verificationMetrics: reportData.verification_metrics || null,
          pdfUrl: reportData.pdf || null
        } : null,
        imageUrl,
        platform,
        timestamp: Date.now()
      }
    });
    
    return {
      success: true,
      data: {
        verified: isVerified,
        tampered: isTampered,
        confidence: confidence,
        status: status,
        message: verification.reason || data.message || (status === 'no_watermark_detected' ? 'No matching watermark found for this image.' : 'Verification complete'),
        reportId: reportId
      }
    };
  } catch (error) {
    console.error('Pixel Safe: Verification error:', error);
    
    // Provide user-friendly error messages
    let errorMessage = error.message;
    
    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Cannot connect to Pixel Safe backend. Please ensure the backend is running.';
    } else if (error.message.includes('login')) {
      errorMessage = 'Authentication required. Please login to verify images.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Login user
 */
async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Login failed');
    }
    
    const data = await response.json();
    
    // Update auth state
    authState = {
      accessToken: data.access,
      refreshToken: data.refresh,
      username: username,
      isAuthenticated: true
    };
    
    await saveAuthState();
    
    // Start token refresh interval
    setInterval(refreshAccessToken, TOKEN_REFRESH_INTERVAL);
    
    return {
      success: true,
      data: { username }
    };
  } catch (error) {
    console.error('Pixel Safe: Login error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Signup user
 */
async function signup(username, email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/signup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, email, password })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error || 'Signup failed');
    }
    
    // Auto-login after signup
    return await login(username, password);
  } catch (error) {
    console.error('Pixel Safe: Signup error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Logout user
 */
async function logout() {
  await clearAuthState();
  return { success: true };
}

/**
 * Refresh access token
 */
async function refreshAccessToken() {
  try {
    if (!authState.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch(`${API_BASE_URL}/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh: authState.refreshToken })
    });
    
    if (!response.ok) {
      // Refresh token expired, need to login again
      await clearAuthState();
      throw new Error('Session expired. Please login again.');
    }
    
    const data = await response.json();
    authState.accessToken = data.access;
    await saveAuthState();
    
    console.log('Pixel Safe: Access token refreshed');
    return { success: true };
  } catch (error) {
    console.error('Pixel Safe: Token refresh error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch user reports from backend (used by popup)
 */
async function fetchUserReports(limit = 10) {
  try {
    if (!authState.isAuthenticated) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/reports/?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authState.accessToken}`
      }
    });

    if (response.status === 401) {
      await refreshAccessToken();
      return await fetchUserReports(limit);
    }

    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }

    const data = await response.json();
    return {
      success: true,
      data: data.results || data
    };
  } catch (error) {
    console.error('Pixel Safe: Error fetching reports:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Open result page
 */
async function openResultPage(resultData) {
  try {
    const resultUrl = chrome.runtime.getURL('pages/result.html');
    await chrome.tabs.create({ url: resultUrl });
    return { success: true };
  } catch (error) {
    console.error('Pixel Safe: Error opening result page:', error);
    return { success: false, error: error.message };
  }
}

// Initialize
init();
