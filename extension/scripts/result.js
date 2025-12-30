/**
 * PIXEL SAFE - Result Script
 * Displays verification results with detailed metrics
 */

// DOM Elements
let elements = {};
let resultData = null;

/**
 * Initialize result page
 */
async function init() {
  // Cache DOM elements
  elements = {
    loading: document.getElementById('loading'),
    errorState: document.getElementById('errorState'),
    resultContent: document.getElementById('resultContent'),
    backBtn: document.getElementById('backBtn'),
    confidenceCircle: document.getElementById('confidenceCircle'),
    confidenceValue: document.getElementById('confidenceValue'),
    confidenceLabel: document.getElementById('confidenceLabel'),
    statusBadge: document.getElementById('statusBadge'),
    statusText: document.getElementById('statusText'),
    statusMessage: document.getElementById('statusMessage'),
    metricsGrid: document.getElementById('metricsGrid'),
    infoPlatform: document.getElementById('infoPlatform'),
    infoTime: document.getElementById('infoTime'),
    downloadReportBtn: document.getElementById('downloadReportBtn'),
    verifyAnotherBtn: document.getElementById('verifyAnotherBtn')
  };

  // Setup event listeners
  setupEventListeners();

  // Load result data
  await loadResult();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  elements.backBtn.addEventListener('click', () => window.close());
  elements.downloadReportBtn.addEventListener('click', downloadReport);
  elements.verifyAnotherBtn.addEventListener('click', () => window.close());
}

/**
 * Load result from storage
 */
async function loadResult() {
  try {
    const result = await chrome.storage.local.get(['lastVerificationResult']);
    
    if (result.lastVerificationResult) {
      resultData = result.lastVerificationResult;
      displayResult(resultData);
    } else {
      showError();
    }
  } catch (error) {
    console.error('Error loading result:', error);
    showError();
  }
}

/**
 * Display result
 */
function displayResult(data) {
  // Hide loading, show content
  elements.loading.style.display = 'none';
  elements.resultContent.style.display = 'block';

  // Display confidence score
  const confidence = Math.round(data.confidence || 0);
  animateConfidence(confidence);

  // Display status
  const status = data.status || 'unknown';
  const isVerified = data.verified && !data.tampered;
  updateStatus(isVerified, data.tampered, status, data.message);

  // Display metrics
  displayMetrics(data.forensicMetrics || {});

  // Display watermark detection info
  if (data.autoDetection && data.autoDetection.detected) {
    displayDetectionInfo(data.autoDetection);
  }

  // Display report images (heatmap and original)
  if (data.report) {
    displayReportImages(data.report);
  }

  // Display image info
  displayImageInfo(data);
}

/**
 * Animate confidence score
 */
function animateConfidence(targetValue) {
  const circumference = 2 * Math.PI * 90; // r=90
  const offset = circumference - (targetValue / 100) * circumference;
  
  // Animate circle
  setTimeout(() => {
    elements.confidenceCircle.style.strokeDashoffset = offset;
  }, 100);

  // Animate number
  let current = 0;
  const increment = targetValue / 50;
  const interval = setInterval(() => {
    current += increment;
    if (current >= targetValue) {
      current = targetValue;
      clearInterval(interval);
    }
    elements.confidenceValue.textContent = Math.round(current);
  }, 20);

  // Update color based on confidence
  if (targetValue >= 80) {
    elements.confidenceLabel.textContent = 'High Confidence';
  } else if (targetValue >= 50) {
    elements.confidenceLabel.textContent = 'Medium Confidence';
  } else {
    elements.confidenceLabel.textContent = 'Low Confidence';
  }
}

/**
 * Update status badge
 */
function updateStatus(isVerified, isTampered, status, message) {
  // Neutral state: no watermark detected or unknown
  if (status === 'no_watermark_detected' || status === 'unknown') {
    elements.statusBadge.className = 'status-badge large';
    elements.statusText.textContent = 'No Watermark Found';
    elements.statusMessage.textContent = message || 'We could not find a matching watermark for this image.';
    elements.statusBadge.querySelector('svg').innerHTML = `
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <circle cx="12" cy="16" r="1"/>
    `;
    return;
  }

  if (isVerified) {
    elements.statusBadge.className = 'status-badge large success';
    elements.statusText.textContent = 'Verified';
    elements.statusMessage.textContent = message || 'This image appears to be authentic and unmodified.';
    
    // Update icon
    elements.statusBadge.querySelector('svg').innerHTML = `
      <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
    `;
  } else if (isTampered) {
    elements.statusBadge.className = 'status-badge large error';
    elements.statusText.textContent = 'Tampered';
    elements.statusMessage.textContent = message || 'This image may have been modified or tampered with.';
    
    // Update icon
    elements.statusBadge.querySelector('svg').innerHTML = `
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    `;
  } else {
    // Fallback neutral
    elements.statusBadge.className = 'status-badge large';
    elements.statusText.textContent = 'Unknown';
    elements.statusMessage.textContent = message || 'Verification could not determine authenticity.';
    elements.statusBadge.querySelector('svg').innerHTML = `
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <circle cx="12" cy="16" r="1"/>
    `;
  }
}

/**
 * Display forensic metrics
 */
function displayMetrics(metrics) {
  elements.metricsGrid.innerHTML = '';

  const metricsList = [
    { key: 'hash_distance', label: 'Hash Distance', format: 'number' },
    { key: 'visual_similarity', label: 'Visual Similarity', format: 'percentage' },
    { key: 'correlation', label: 'Watermark Similarity', format: 'percentage' },
    { key: 'bit_error_rate', label: 'Bit Error Rate', format: 'percentage' },
    { key: 'ssim', label: 'SSIM Score', format: 'percentage', optional: true },
    { key: 'psnr', label: 'PSNR', format: 'number', optional: true },
    { key: 'mse', label: 'MSE', format: 'number', optional: true },
    { key: 'correlation_stat', label: 'Correlation', format: 'percentage', optional: true },
    { key: 'decryption_success', label: 'Decryption', format: 'boolean' },
    { key: 'hash_match', label: 'Hash Match', format: 'boolean' }
  ];

  metricsList.forEach(metric => {
    const value = metrics[metric.key];
    if (value !== undefined && value !== null) {
      const card = createMetricCard(metric.label, value, metric.format);
      elements.metricsGrid.appendChild(card);
    }
  });

  // If no metrics, show message
  if (elements.metricsGrid.children.length === 0) {
    elements.metricsGrid.innerHTML = '<p class="no-metrics">No detailed metrics available</p>';
  }
}

/**
 * Create metric card
 */
function createMetricCard(label, value, format) {
  const card = document.createElement('div');
  card.className = 'metric-card';

  let displayValue = value;
  if (format === 'percentage') {
    displayValue = (value * 100).toFixed(1) + '%';
  } else if (format === 'number') {
    displayValue = typeof value === 'number' ? value.toFixed(2) : value;
  } else if (format === 'boolean') {
    displayValue = value ? '✓ Yes' : '✗ No';
    card.classList.add(value ? 'success' : 'error');
  }

  card.innerHTML = `
    <div class="metric-label">${label}</div>
    <div class="metric-value">${displayValue}</div>
  `;

  return card;
}

/**
 * Display watermark detection information
 */
function displayDetectionInfo(detection) {
  const detectionSection = document.getElementById('detectionInfo');
  if (!detectionSection) return;

  detectionSection.style.display = 'block';

  // Detection status
  const statusEl = document.getElementById('detectionStatus');
  if (statusEl) {
    statusEl.textContent = detection.detected ? '✓ Watermark Detected' : '✗ Not Detected';
    statusEl.classList.add(detection.detected ? 'success' : 'error');
  }

  // Original filename
  const filenameEl = document.getElementById('originalFilename');
  if (filenameEl) {
    filenameEl.textContent = detection.originalFilename || 'Unknown';
  }

  // Detection method
  const methodEl = document.getElementById('detectionMethod');
  if (methodEl) {
    methodEl.textContent = detection.method || 'Unknown';
  }

  // Detection confidence
  const confidenceEl = document.getElementById('detectionConfidence');
  if (confidenceEl) {
    const confidenceText = detection.detectionConfidence || 'low';
    confidenceEl.textContent = confidenceText.charAt(0).toUpperCase() + confidenceText.slice(1);
    confidenceEl.classList.add(confidenceText === 'high' ? 'success' : confidenceText === 'medium' ? 'warning' : 'error');
  }
}

/**
 * Display report images (heatmap and original from backend)
 */
function displayReportImages(report) {
  const imageSection = document.getElementById('reportImages');
  if (!imageSection) return;

  imageSection.style.display = 'block';
  imageSection.innerHTML = '<h3>Report Images</h3>';

  const imagesGrid = document.createElement('div');
  imagesGrid.className = 'images-grid';

  // Original Image
  if (report.originalImage) {
    const originalCard = createImageCard('Original Image', report.originalImage);
    imagesGrid.appendChild(originalCard);
  }

  // Heatmap/Tampering Overlay
  if (report.heatmapImage) {
    const heatmapCard = createImageCard('Tampering Heatmap', report.heatmapImage);
    imagesGrid.appendChild(heatmapCard);
  }

  // Suspicious/Uploaded Image
  if (report.suspiciousImage) {
    const suspiciousCard = createImageCard('Uploaded Image', report.suspiciousImage);
    imagesGrid.appendChild(suspiciousCard);
  }

  imageSection.appendChild(imagesGrid);

  // Add PDF download button if available
  if (report.pdfUrl) {
    const pdfBtn = document.createElement('a');
    pdfBtn.href = `http://127.0.0.1:8000${report.pdfUrl}`;
    pdfBtn.target = '_blank';
    pdfBtn.className = 'btn btn-secondary';
    pdfBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
      View Full PDF Report
    `;
    imageSection.appendChild(pdfBtn);
  }
}

/**
 * Create image card for display
 */
function createImageCard(title, imageUrl) {
  const card = document.createElement('div');
  card.className = 'image-card';

  const fullUrl = imageUrl.startsWith('http') ? imageUrl : `http://127.0.0.1:8000${imageUrl}`;

  card.innerHTML = `
    <div class="image-card-title">${title}</div>
    <img src="${fullUrl}" alt="${title}" class="report-image" />
    <a href="${fullUrl}" target="_blank" class="image-link">Open Full Size</a>
  `;

  return card;
}

/**
 * Display image information
 */
function displayImageInfo(data) {
  // Platform
  elements.infoPlatform.textContent = data.platform || 'Unknown';

  // Time
  const timeAgo = getTimeAgo(data.timestamp);
  elements.infoTime.textContent = timeAgo;
}

/**
 * Get time ago string
 */
function getTimeAgo(timestamp) {
  if (!timestamp) return 'Unknown';

  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Download report
 */
function downloadReport() {
  if (!resultData) return;

  const report = {
    timestamp: new Date(resultData.timestamp).toISOString(),
    platform: resultData.platform,
    verified: resultData.verified,
    tampered: resultData.tampered,
    confidence: resultData.confidence,
    message: resultData.message,
    forensicMetrics: resultData.forensicMetrics
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pixelsafe-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Show error state
 */
function showError() {
  elements.loading.style.display = 'none';
  elements.errorState.style.display = 'flex';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
