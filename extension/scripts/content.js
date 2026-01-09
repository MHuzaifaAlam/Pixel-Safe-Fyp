// Configuration for different social media platforms
const PLATFORM_CONFIG = {
  'facebook.com': {
    imageSelectors: [
      'img[src*="fbcdn"]',
      'img[data-visualcompletion="media-vc-image"]',
      'div[role="img"]',
      'img.x1ey2m1c'
    ],
    containerClass: 'pixelsafe-fb-container'
  },
  'instagram.com': {
    imageSelectors: [
      'article img[srcset*="cdninstagram"]',
      'main article img',
      'article div._aagu img',
      'article img[alt*="Photo"]',
      'div[role="presentation"] article img'
    ],
    excludeSelectors: [
      'header img',
      'svg',
      '[aria-label*="Story"] img',
      '[aria-label*="story"] img',
      'canvas + img'
    ],
    containerClass: 'pixelsafe-ig-container'
  },
  'twitter.com': {
    imageSelectors: [
      'img[src*="pbs.twimg.com"]',
      'div[data-testid="tweetPhoto"] img',
      'img[alt*="Image"]'
    ],
    containerClass: 'pixelsafe-tw-container'
  },
  'x.com': {
    imageSelectors: [
      'img[src*="pbs.twimg.com"]',
      'div[data-testid="tweetPhoto"] img',
      'img[alt*="Image"]'
    ],
    containerClass: 'pixelsafe-x-container'
  },
  'tiktok.com': {
    imageSelectors: [
      'img[src*="tiktokcdn"]',
      'img.tiktok-avatar'
    ],
    containerClass: 'pixelsafe-tt-container'
  },
  'youtube.com': {
    imageSelectors: [
      'img[src*="ytimg.com"]',
      'yt-img-shadow img',
      'img#img'
    ],
    containerClass: 'pixelsafe-yt-container'
  },
  'reddit.com': {
    imageSelectors: [
      'img[src*="redd.it"]',
      'img[src*="redditmedia"]',
      'a[data-click-id="image"] img'
    ],
    containerClass: 'pixelsafe-rd-container'
  },
  'snapchat.com': {
    imageSelectors: [
      'img[src*="snapchat"]',
      'img[data-type="image"]'
    ],
    containerClass: 'pixelsafe-sc-container'
  },
  'pinterest.com': {
    imageSelectors: [
      'img[src*="pinimg.com"]',
      'div[data-test-id="pin-visual-wrapper"] img',
      'img[alt*="Pinterest"]'
    ],
    containerClass: 'pixelsafe-pt-container'
  }
};

// State management
let processedImages = new Set();
let isProcessing = false;

/**
 * Add button to Instagram image without wrapping
 */
function addButtonToInstagramImage(img, imageId, platform) {
  // Find the closest parent with position relative/absolute
  let parentContainer = img.parentElement;
  while (parentContainer && window.getComputedStyle(parentContainer).position === 'static') {
    parentContainer = parentContainer.parentElement;
    if (!parentContainer || parentContainer === document.body) {
      parentContainer = img.parentElement;
      break;
    }
  }
  
  // Ensure parent has position
  if (window.getComputedStyle(parentContainer).position === 'static') {
    parentContainer.style.position = 'relative';
  }
  
  // Create button
  const button = document.createElement('button');
  button.className = 'pixelsafe-verify-btn pixelsafe-ig-btn';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
    </svg>
  `;
  button.title = 'Verify image with Pixel Safe';
  button.setAttribute('data-image-id', imageId);
  button.setAttribute('data-pixelsafe-for-img', img.src);
  
  // Add click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleVerifyClick(img, button);
  });
  
  // Add to parent
  parentContainer.appendChild(button);
}

/**
 * Get current platform configuration
 */
function getCurrentPlatform() {
  const hostname = window.location.hostname;
  for (const [domain, config] of Object.entries(PLATFORM_CONFIG)) {
    if (hostname.includes(domain)) {
      return config;
    }
  }
  return null;
}

/**
 * Check if image is valid for verification
 */
function isValidImage(img, platform) {
  if (!img || !img.src) return false;
  
  // Skip small images (likely icons)
  const width = img.naturalWidth || img.width || 0;
  const height = img.naturalHeight || img.height || 0;
  if (width < 50 || height < 50) return false;
  
  // Check if image matches exclude selectors
  if (platform && platform.excludeSelectors) {
    for (const excludeSelector of platform.excludeSelectors) {
      if (img.matches && img.matches(excludeSelector)) {
        return false;
      }
      // Check if any parent matches the exclude selector
      if (img.closest && img.closest(excludeSelector)) {
        return false;
      }
    }
  }
  
  // Skip already processed images
  const imageId = getImageId(img);
  if (processedImages.has(imageId)) return false;
  
  // Skip data URLs and SVGs
  if (img.src.startsWith('data:') || img.src.endsWith('.svg')) return false;
  
  return true;
}

/**
 * Generate unique ID for image
 */
function getImageId(img) {
  return img.src + '|' + (img.alt || '') + '|' + img.className;
}

/**
 * Add button to Instagram image without wrapping
 */
function addButtonToInstagramImage(img, imageId, platform) {
  console.log('Adding button to Instagram image:', img.src);
  
  // Check if button already exists for this image
  const existingButton = document.querySelector(`button[data-pixelsafe-for-img="${CSS.escape(img.src)}"]`);
  if (existingButton) {
    console.log('Button already exists for this image');
    return;
  }
  
  // Find the closest parent with position relative/absolute or article element
  let parentContainer = img.closest('article') || img.parentElement;
  
  if (!parentContainer) {
    console.error('No parent container found for Instagram image');
    return;
  }
  
  console.log('Parent container found:', parentContainer.tagName, window.getComputedStyle(parentContainer).position);
  
  // Ensure parent has position
  const currentPosition = window.getComputedStyle(parentContainer).position;
  if (currentPosition === 'static') {
    parentContainer.style.position = 'relative';
    console.log('Set parent position to relative');
  }
  
  // Create button
  const button = document.createElement('button');
  button.className = 'pixelsafe-verify-btn pixelsafe-ig-btn';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
    </svg>
  `;
  button.title = 'Verify image with Pixel Safe';
  button.setAttribute('data-image-id', imageId);
  button.setAttribute('data-pixelsafe-for-img', img.src);
  
  // Position button relative to the image
  button.style.position = 'absolute';
  button.style.bottom = '12px';
  button.style.right = '12px';
  button.style.zIndex = '999999';
  
  // Add click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleVerifyClick(img, button);
  });
  
  // Add to parent
  parentContainer.appendChild(button);
  console.log('Button added to parent container');
}

/**
 * Create and inject verify button
 */
function injectVerifyButton(img, platform) {
  if (!isValidImage(img, platform)) return;
  
  const imageId = getImageId(img);
  processedImages.add(imageId);
  
  // Instagram-specific handling: Don't wrap, just add button
  if (platform.containerClass === 'pixelsafe-ig-container') {
    addButtonToInstagramImage(img, imageId, platform);
    return;
  }
  
  // For other platforms: Use container wrapper
  const container = document.createElement('div');
  container.className = `pixelsafe-verify-container ${platform.containerClass}`;
  container.style.position = 'relative';
  container.style.display = 'inline-block';
  container.style.width = img.width ? `${img.width}px` : 'auto';
  container.style.height = img.height ? `${img.height}px` : 'auto';
  
  // Wrap image
  const parent = img.parentElement;
  if (!parent) return;
  
  // Check if already wrapped
  if (parent.classList.contains('pixelsafe-verify-container')) return;
  
  // Preserve image positioning
  const imgPosition = window.getComputedStyle(img).position;
  if (imgPosition === 'absolute' || imgPosition === 'fixed') {
    container.style.position = imgPosition;
  }
  
  parent.insertBefore(container, img);
  container.appendChild(img);
  
  // Create verify button
  const button = document.createElement('button');
  button.className = 'pixelsafe-verify-btn';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
    </svg>
  `;
  button.title = 'Verify image with Pixel Safe';
  button.setAttribute('data-image-id', imageId);
  
  // Add click handler
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleVerifyClick(img, button);
  });
  
  container.appendChild(button);
}

/**
 * Handle verify button click
 */
async function handleVerifyClick(img, button) {
  // Update button state
  button.classList.add('loading');
  button.innerHTML = `
    <svg class="spinner" width="20" height="20" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" opacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="2" fill="none"/>
    </svg>
  `;
  
  // Show scanning animation
  const scanOverlay = showScanningAnimation(img);
  
  try {
    // Convert image to blob
    const imageBlob = await fetchImageAsBlob(img.src);
    
    if (!imageBlob) {
      throw new Error('Failed to fetch image');
    }
    
    // Convert blob to ArrayBuffer, then to Array (lossless and serializable)
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const imageArray = Array.from(uint8Array); // Convert to regular array for message passing
    const imageType = imageBlob.type || 'image/jpeg';
    
    // Send to background script
    const response = await chrome.runtime.sendMessage({
      action: 'verifyImage',
      imageData: imageArray,
      imageType: imageType,
      imageUrl: img.src,
      platform: window.location.hostname
    });
    
    if (response.success) {
      // Remove loading state
      button.classList.remove('loading');
      
      // Show result overlay on image
      showResultOverlay(img, response.data, button);
      
      // Reset button
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
        </svg>
      `;
    } else {
      throw new Error(response.error || 'Verification failed');
    }
  } catch (error) {
    console.error('Pixel Safe verification error:', error);
    
    // Remove scanning animation
    if (scanOverlay && scanOverlay.parentElement) {
      scanOverlay.remove();
    }
    
    // Show error state
    button.classList.remove('loading');
    button.classList.add('error');
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    `;
    
    // Show error overlay
    showResultOverlay(img, { status: 'Error', message: error.message }, button);
    
    // Reset button after 3 seconds
    setTimeout(() => {
      button.classList.remove('error');
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
        </svg>
      `;
    }, 3000);
  }
}

/**
 * Fetch image as blob
 */
async function fetchImageAsBlob(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch image');
    return await response.blob();
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

/**
 * Convert blob to base64 (kept for backwards compatibility if needed)
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Show scanning animation overlay
 */
function showScanningAnimation(img) {
  let container = img.closest('.pixelsafe-verify-container');
  
  // For Instagram or when no container, find appropriate parent
  if (!container) {
    container = img.parentElement;
    while (container && window.getComputedStyle(container).position === 'static') {
      container = container.parentElement;
      if (!container || container === document.body) {
        container = img.parentElement;
        break;
      }
    }
    if (!container) return null;
    // Ensure parent has position relative
    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
  }
  
  const scanOverlay = document.createElement('div');
  scanOverlay.className = 'pixelsafe-scan-overlay';
  scanOverlay.innerHTML = `
    <div class="pixelsafe-scan-line"></div>
    <div class="pixelsafe-scan-text">Scanning...</div>
  `;
  container.appendChild(scanOverlay);
  
  return scanOverlay;
}

/**
 * Show result overlay on image
 */
function showResultOverlay(img, resultData, button) {
  let container = img.closest('.pixelsafe-verify-container');
  
  // For Instagram or when no container, find appropriate parent
  if (!container) {
    container = img.parentElement;
    while (container && window.getComputedStyle(container).position === 'static') {
      container = container.parentElement;
      if (!container || container === document.body) {
        container = img.parentElement;
        break;
      }
    }
    if (!container) return;
    // Ensure parent has position relative
    if (window.getComputedStyle(container).position === 'static') {
      container.style.position = 'relative';
    }
  }
  
  // Remove any existing overlays
  const existingOverlay = container.querySelector('.pixelsafe-scan-overlay, .pixelsafe-result-overlay');
  if (existingOverlay) existingOverlay.remove();
  
  // Extract result data
  const status = resultData.status || 'Unknown';
  const confidence = resultData.confidence || 0;
  const isVerified = status === 'Verified' || status === 'authentic' || status === 'recompressed';
  const isTampered = status === 'Tampered' || status === 'tampered' || status === 'watermark_removed';
  const isError = status === 'Error';
  
  // Determine badge style
  let badgeClass = 'unknown';
  let icon = '?';
  let message = status;
  
  if (isVerified) {
    badgeClass = 'verified';
    icon = '✓';
    message = `Verified - ${confidence}% Confidence`;
  } else if (isTampered) {
    badgeClass = 'tampered';
    icon = '✗';
    message = `Tampered - ${confidence}% Confidence`;
  } else if (isError) {
    badgeClass = 'error';
    icon = '⚠';
    message = resultData.message || 'Verification Error';
  } else {
    badgeClass = 'no-watermark';
    icon = '⚠';
    message = 'No Watermark Detected';
  }
  
  // Create result overlay
  const resultOverlay = document.createElement('div');
  resultOverlay.className = `pixelsafe-result-overlay ${badgeClass}`;
  resultOverlay.innerHTML = `
    <div class="pixelsafe-result-badge">
      <span class="pixelsafe-result-icon">${icon}</span>
      <span class="pixelsafe-result-text">${message}</span>
      <button class="pixelsafe-result-close" title="Dismiss">×</button>
    </div>
  `;
  
  container.appendChild(resultOverlay);
  
  // Fade in
  setTimeout(() => resultOverlay.classList.add('show'), 10);
  
  // Add close handler
  const closeBtn = resultOverlay.querySelector('.pixelsafe-result-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resultOverlay.classList.remove('show');
    setTimeout(() => resultOverlay.remove(), 300);
  });
  
  // Auto-dismiss after 8 seconds
  setTimeout(() => {
    if (resultOverlay.parentElement) {
      resultOverlay.classList.remove('show');
      setTimeout(() => resultOverlay.remove(), 300);
    }
  }, 8000);
}

/**
 * Show error notification
 */
function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'pixelsafe-notification error';
  notification.innerHTML = `
    <strong>Pixel Safe Error:</strong> ${message}
  `;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

/**
 * Process images on page
 */
function processImages() {
  if (isProcessing) return;
  isProcessing = true;
  
  const platform = getCurrentPlatform();
  if (!platform) {
    isProcessing = false;
    return;
  }
  
  // Find all images matching platform selectors
  const images = [];
  platform.imageSelectors.forEach(selector => {
    try {
      const found = document.querySelectorAll(selector);
      images.push(...Array.from(found));
    } catch (e) {
      console.warn('Invalid selector:', selector);
    }
  });
  
  // Process each image
  images.forEach(img => {
    if (img.tagName === 'IMG') {
      injectVerifyButton(img, platform);
    }
  });
  
  isProcessing = false;
}

/**
 * Initialize observer for dynamic content
 */
function initObserver() {
  const observer = new MutationObserver((mutations) => {
    // Debounce processing
    clearTimeout(window.pixelSafeTimeout);
    window.pixelSafeTimeout = setTimeout(processImages, 500);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also process on scroll (for infinite scroll)
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(processImages, 500);
  }, { passive: true });
}

/**
 * Initialize content script
 */
function init() {
  console.log('Pixel Safe: Content script loaded');
  
  // Check if on supported platform
  const platform = getCurrentPlatform();
  if (!platform) {
    console.log('Pixel Safe: Platform not supported');
    return;
  }
  
  console.log('Pixel Safe: Supported platform detected');
  
  // Initial processing
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processImages);
  } else {
    processImages();
  }
  
  // Set up observer for dynamic content
  initObserver();
  
  // Re-process periodically (backup for missed mutations)
  setInterval(processImages, 2000);
  
  // Also process on specific events
  window.addEventListener('load', processImages);
  window.addEventListener('focus', processImages);
  
  // Add scroll listener with debouncing for Instagram lazy loading
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      processImages();
    }, 300);
  }, { passive: true });
}

// Start initialization
init();
