# Pixel Safe Browser Extension

🛡️ **Verify image authenticity and detect tampering directly from your browser**

## Overview

Pixel Safe is a Chrome browser extension that enables instant image verification on social media platforms. With a single click, verify whether an image has been tampered with or contains digital watermarks.

## Features

✨ **Key Capabilities:**

- **Instant Verification**: Click verify button on any image to check authenticity
- **Multi-Platform Support**: Works on Facebook, Instagram, Twitter/X, TikTok, YouTube, Reddit, Snapchat, Pinterest
- **Real-Time Detection**: Get results in 2-3 seconds
- **Forensic Analysis**: View detailed metrics including hash distance, correlation, SSIM, PSNR
- **Confidence Scores**: See percentage-based confidence ratings
- **Secure Authentication**: JWT-based login with automatic token refresh
- **Privacy-Focused**: No images stored, analysis happens in real-time
- **User-Friendly**: Clean, modern dark-themed interface

## Installation

### Method 1: Chrome Web Store (Recommended)

1. Visit the [Pixel Safe extension page](https://chrome.google.com/webstore) on Chrome Web Store
2. Click "Add to Chrome"
3. Confirm installation
4. Click the extension icon and login with your Pixel Safe credentials

### Method 2: Developer Mode (For Development)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `/extension` folder from this project
6. The extension will appear in your browser toolbar

## Setup

### Prerequisites

- **Backend**: Pixel Safe backend must be running on `http://127.0.0.1:8000`
- **Account**: Valid Pixel Safe user account (create at the web application)
- **Browser**: Google Chrome (version 88 or higher)

### Backend Setup

```bash
# Start the Pixel Safe backend
cd backend
source venv/bin/activate
python manage.py runserver
```

### Extension Configuration

1. Click the Pixel Safe extension icon in your browser toolbar
2. Click "Login to Extension"
3. Enter your username and password
4. You're ready to start verifying images!

## Usage

### Verifying Images

1. **Navigate** to any supported social media platform (Facebook, Instagram, Twitter, etc.)
2. **Find** an image you want to verify
3. **Click** the blue circular verify button that appears at the bottom-right of the image
4. **Wait** for verification (2-3 seconds)
5. **View** detailed results including:
   - Verification status (Verified/Tampered)
   - Confidence percentage
   - Forensic metrics
   - Tampering detection analysis

### Understanding Results

**Verified (✓)**: Image appears authentic and unmodified

- High confidence score (>80%)
- Low hash distance
- High correlation and SSIM values

**Tampered (✗)**: Image may have been modified

- Lower confidence score
- Higher hash distance
- Forensic indicators of manipulation

## Supported Platforms

| Platform  | Status | Image Detection                 |
| --------- | ------ | ------------------------------- |
| Facebook  | ✅     | Posts, comments, profile images |
| Instagram | ✅     | Feed, stories, reels            |
| Twitter/X | ✅     | Tweets, replies                 |
| TikTok    | ✅     | Videos, profiles                |
| YouTube   | ✅     | Thumbnails, community posts     |
| Reddit    | ✅     | Posts, comments                 |
| Snapchat  | ✅     | Public stories                  |
| Pinterest | ✅     | Pins, boards                    |

## Architecture

### Components

```
extension/
├── manifest.json          # Extension configuration (Manifest v3)
├── scripts/
│   ├── content.js        # Injected on social media (320 lines)
│   ├── background.js     # Service worker for API calls (280 lines)
│   ├── popup.js          # Popup interface logic (170 lines)
│   ├── auth.js           # Authentication handling (150 lines)
│   └── result.js         # Results display logic (200 lines)
├── pages/
│   ├── popup.html        # Main popup interface
│   ├── login.html        # Login/signup page
│   └── result.html       # Verification results page
├── styles/
│   ├── popup.css         # Popup styling
│   ├── content.css       # Button styling
│   ├── auth.css          # Auth page styling
│   └── result.css        # Results page styling
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

### Communication Flow

```
Social Media Page → Content Script → Background Worker → Backend API
                        ↓                    ↓
                  Inject Button      Handle Auth & Storage
                        ↓                    ↓
                 User Clicks → Send Image → Verify → Return Result
```

## API Integration

The extension communicates with the Pixel Safe backend using these endpoints:

- `POST /api/token/` - Login authentication
- `POST /api/token/refresh/` - Refresh access token
- `POST /api/watermark/auto-verify/` - Auto-detect and verify watermark
- `POST /api/watermark/verify/` - Verify with watermark ID

## Security

- **JWT Authentication**: Secure token-based authentication
- **HTTPS Ready**: Supports secure connections in production
- **No Data Storage**: Images are not stored, only analyzed
- **Encrypted Storage**: Tokens encrypted by Chrome's secure storage
- **CORS Protection**: Backend configured with proper CORS headers
- **Permission Scoping**: Extension only requests necessary permissions

## Error Handling

The extension handles various error scenarios:

| Error               | Description                | User Action               |
| ------------------- | -------------------------- | ------------------------- |
| Not Authenticated   | User not logged in         | Login via extension popup |
| Backend Offline     | Cannot connect to backend  | Ensure backend is running |
| Network Error       | Connection timeout         | Check internet connection |
| Invalid Image       | Image format not supported | Try different image       |
| Verification Failed | Backend processing error   | Retry or contact support  |

## Development

### Building from Source

```bash
# No build process needed - extension runs directly from source
# Just load the /extension folder in Chrome
```

### Testing

1. Load extension in developer mode
2. Open Chrome DevTools (F12)
3. Check Console tab for extension logs
4. Visit social media platforms to test image detection
5. Click verify buttons to test full workflow

### Debugging

- **Content Script**: Right-click page → Inspect → Console
- **Background Worker**: `chrome://extensions/` → Details → Inspect service worker
- **Popup**: Right-click extension icon → Inspect popup

## Configuration

### Backend URL

To change the backend URL, edit `scripts/background.js`:

```javascript
const API_BASE_URL = "http://127.0.0.1:8000/api"; // Change this
```

### Token Refresh Interval

Default: 30 minutes. To modify, edit `scripts/background.js`:

```javascript
const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // In milliseconds
```

## Publishing to Chrome Web Store

1. Create a developer account at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Zip the `/extension` folder
3. Upload to Chrome Web Store
4. Fill in store listing details
5. Submit for review
6. Update `CHROME_WEB_STORE_URL` in frontend after approval

## Troubleshooting

### Button Not Appearing

- Ensure you're logged in
- Refresh the page
- Check that you're on a supported platform
- Verify extension is enabled in `chrome://extensions/`

### Verification Failed

- Ensure backend is running (`http://127.0.0.1:8000`)
- Check browser console for errors
- Verify you're logged in
- Try logging out and back in

### Login Issues

- Verify backend is accessible
- Check username/password
- Clear extension storage: `chrome://extensions/` → Details → Clear storage

## Browser Compatibility

- ✅ Google Chrome 88+
- ✅ Microsoft Edge 88+
- ✅ Brave Browser
- ✅ Opera 74+
- ❌ Firefox (different manifest format)
- ❌ Safari (different extension system)

## Performance

- **Image Detection**: < 500ms
- **Button Injection**: < 100ms per image
- **Verification Time**: 2-3 seconds
- **Memory Usage**: ~30-50MB
- **CPU Impact**: Minimal (< 2%)

## License

MIT License - See LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/pixel-safe/issues)
- **Documentation**: [Full Docs](https://pixelsafe.example.com/docs)
- **Email**: support@pixelsafe.example.com

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Changelog

### v1.0.0 (Initial Release)

- Multi-platform image detection
- Real-time verification
- Forensic metrics display
- JWT authentication
- Chrome Manifest v3 support

## Credits

Developed by the Pixel Safe Team

- Frontend: React + Vite
- Backend: Django + DRF
- Extension: Vanilla JavaScript (Manifest v3)

## Links

- 🌐 [Web Application](http://localhost:5173)
- 📦 [Chrome Web Store](https://chrome.google.com/webstore)
- 📘 [Documentation](https://github.com/yourusername/pixel-safe)
- 🐛 [Report Issues](https://github.com/yourusername/pixel-safe/issues)

---

**Made with ❤️ by the Pixel Safe Team**
