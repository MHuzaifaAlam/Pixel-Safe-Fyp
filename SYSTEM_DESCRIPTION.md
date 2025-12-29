# Pixel-Safe System Description

## System Overview

Pixel-Safe is a comprehensive digital image authentication and protection system designed as a Final Year Project (FYP). The system provides advanced watermarking capabilities to protect digital images from unauthorized tampering and enables verification of image authenticity. It combines cryptographic techniques, digital signal processing, and machine learning to create an invisible yet robust watermarking solution.

The system operates on a client-server architecture with a Django-based backend API and a React-based frontend interface, allowing users to securely upload, watermark, verify, and generate detailed reports about their digital images.

---

## Core Architecture

### Backend (Django REST Framework)
- **Framework**: Django 5.2.7 with Django REST Framework
- **Authentication**: JWT-based authentication using SimpleJWT
- **Database**: Relational database (PostgreSQL/SQLite) for storing user data, images, watermarks, and reports
- **Media Storage**: File system storage for uploaded images, watermarked images, and generated reports
- **API Design**: RESTful API with router-based endpoints for organized resource management

### Frontend (React + Vite)
- **Framework**: React with Vite for fast development and build optimization
- **Routing**: React Router for client-side navigation
- **Animations**: Framer Motion and GSAP for smooth UI animations
- **State Management**: Context API for authentication state
- **UI Components**: Lucide React icons for consistent iconography

---

## Main Features

### 1. User Authentication and Authorization

#### Registration System
Users can create accounts by providing:
- Username
- Email address
- Password (stored securely with Django's built-in password hashing)

The registration endpoint (`/api/signup/`) creates a new user account and returns user details without exposing the password.

#### Login System (JWT-based)
The authentication system uses JSON Web Tokens (JWT) for secure, stateless authentication:
- Users login with username and password via `/api/token/`
- System returns two tokens:
  - **Access Token**: Short-lived token for API authentication (included in Authorization header)
  - **Refresh Token**: Long-lived token to obtain new access tokens
- Token refresh mechanism via `/api/token/refresh/` allows seamless session management

#### Authorization
All protected endpoints require the Authorization header with format: `Bearer <access_token>`. The system ensures users can only access and modify their own resources.

---

### 2. Image Upload and Management

#### Single Image Upload
Users can upload individual images through the `/api/images/` endpoint:
- Accepts various image formats (JPEG, PNG, etc.)
- Automatically extracts and stores metadata (filename, format, size)
- Assigns unique UUID to each image for secure identification
- Associates image with the authenticated user
- Stores original image in the media storage system

#### Batch Image Upload
For efficiency, users can upload multiple images simultaneously:
- Accepts up to multiple image files in a single request
- Automatically creates a Batch container when multiple files are uploaded
- Assigns sequential position to each image within the batch
- Allows naming the batch via `batch_name` parameter
- Tracks batch status (processing, completed, failed)
- Enables bulk operations on related images

#### Image Lifecycle Management
Each image has a status field tracking its lifecycle:
- **uploaded**: Initial state after upload
- **processing**: Image is being processed (watermark application)
- **completed**: Processing finished successfully
- **failed**: Processing encountered an error
- **protected**: Image has been watermarked and is ready for distribution

Users can:
- List all their images with filtering options
- Retrieve individual image details by UUID
- Update image metadata
- Delete images (which also triggers file cleanup)

---

### 3. Batch Processing System

#### Batch Organization
Batches serve as containers for grouped images:
- Each batch has a unique UUID identifier
- Users can name batches for easy identification
- Batches maintain creation timestamp
- Status tracking for batch-level operations

#### Batch Operations
The system provides comprehensive batch management:
- **List batches**: View all batches owned by the user
- **Batch details**: Retrieve metadata and statistics
- **Search batches**: Find batches by name using query parameters
- **Rename batches**: Update batch names via dedicated endpoint
- **List batch images**: Retrieve all images in a batch (ordered by position)
- **Delete batches**: Remove batch and all associated images atomically

#### Batch Statistics
The system provides analytics about batch usage:
- Total number of batches
- Total images across all batches
- Largest batch size
- Recent batch activity

#### Automatic Cleanup
When the last image in a batch is deleted, the system automatically removes the empty batch container to maintain database integrity.

---

### 4. Digital Watermarking Technology

The watermarking system is the core innovation of Pixel-Safe, using advanced cryptographic and signal processing techniques to embed invisible watermarks that can survive various image manipulations.

#### Watermark Embedding Process

**Step 1: Image Preprocessing**
- Convert RGB image to YCbCr color space (Y=luminance, Cb=blue chrominance, Cr=red chrominance)
- Focus on Y channel for watermark embedding (less perceptible to human vision)
- Ensures color information remains intact

**Step 2: Perceptual Hashing**
- Generate a perceptual hash (pHash) of the original image
- pHash is resilient to minor modifications (compression, resizing)
- Creates a unique fingerprint of the visual content
- Stored for later verification purposes

**Step 3: Cryptographic Payload Creation**
- Generate random AES encryption keys (256-bit)
- Create structured payload containing:
  - Watermark record ID (for database linkage)
  - Encrypted perceptual hash
  - Version information
  - Timestamp data
- Encrypt the payload using AES encryption with CBC mode
- Store encryption keys and initialization vectors securely

**Step 4: Frequency Domain Embedding (DCT)**
The system uses Discrete Cosine Transform (DCT) for robust embedding:
- Divide Y channel into 8x8 pixel blocks
- Apply DCT to each block (converts spatial data to frequency coefficients)
- Embed watermark bits in mid-frequency coefficients
  - Low frequencies: Essential visual information (avoid)
  - Mid frequencies: Balance between robustness and invisibility (target)
  - High frequencies: Easily lost in compression (avoid)
- Modify DCT coefficients using alpha parameter (0.03) to control strength
- Apply inverse DCT to reconstruct watermarked blocks

**Step 5: Color Space Conversion**
- Convert watermarked YCbCr back to RGB
- Preserve color fidelity while maintaining embedded watermark
- Save watermarked image in lossless format (PNG) to preserve watermark

**Step 6: Database Recording**
Create WatermarkRecord containing:
- Link to original image
- Path to watermarked image
- Perceptual hash (plaintext for quick comparison)
- Encrypted hash (ciphertext for verification)
- Encrypted AES keys and IV (for secure decryption)
- Correlation and distance scores (initially null, updated during verification)

#### Watermark Characteristics
- **Invisible**: Alpha parameter ensures modifications are imperceptible to human eyes
- **Robust**: Mid-frequency embedding survives JPEG compression, resizing, and rotation
- **Secure**: AES-256 encryption prevents unauthorized watermark removal
- **Unique**: Each watermark contains image-specific and database-linked information

---

### 5. Watermark Verification System

The verification system determines whether an image has been tampered with by analyzing the embedded watermark.

#### Manual Verification Process

**Step 1: Input Collection**
User provides:
- Suspicious image file (to be verified)
- Either `watermark_id` (if known) or `image_id` (to find associated watermark)

**Step 2: Watermark Record Retrieval**
- Locate the original WatermarkRecord in database
- Retrieve stored perceptual hash and encryption keys
- Load both original watermarked image and suspicious image

**Step 3: Perceptual Hash Comparison**
- Generate pHash of suspicious image
- Calculate Hamming distance between hashes
  - Hamming distance = number of differing bits
  - Lower distance = more similar images
  - 0 = identical visual content
  - 1-3 = minor modifications
  - 4-12 = compression/resizing
  - >12 = significant tampering

**Step 4: Watermark Extraction**
- Apply same DCT-based extraction on suspicious image
- Extract embedded bits from mid-frequency coefficients
- Reconstruct watermark payload from extracted bits

**Step 5: Watermark Similarity Analysis**
- Calculate correlation coefficient between original and extracted watermarks
  - Values range from -1 to 1
  - >0.85 = strong watermark presence
  - 0.6-0.85 = moderate watermark (possible compression)
  - <0.6 = weak/removed watermark

**Step 6: Decryption Attempt**
- Try to decrypt extracted watermark using stored AES keys
- Compare decrypted hash with original perceptual hash
- Successful decryption is the gold standard for authenticity

**Step 7: Status Determination**
The system uses a rule-based engine to classify the image:

- **Authentic (very high confidence)**:
  - Hamming distance = 0 AND watermark similarity > 0.85
  - OR successful decryption with matching hash
  
- **Authentic (high confidence)**:
  - Hamming distance ≤ 3 AND watermark similarity > 0.8
  
- **Recompressed (medium confidence)**:
  - Hamming distance ≤ 12 AND watermark similarity > 0.6
  - Image underwent compression/resizing but content intact
  
- **Watermark Removed (high risk)**:
  - Hamming distance = 0 BUT watermark similarity < 0.7
  - Critical case: Visual identical but watermark damaged (AI attack detected)
  
- **Tampered (high confidence)**:
  - Hamming distance > 12
  - OR low watermark similarity with visual changes
  - Significant alterations detected

**Step 8: Visual Overlay Generation**
The system generates visual aids for analysis:
- **Heatmap**: Color-coded visualization showing tampered regions
  - Red areas: High tampering detected
  - Yellow areas: Moderate differences
  - Green areas: Minimal changes
- **Side-by-side comparison**: Original vs. suspicious image
- **Difference overlay**: Highlights pixel-level differences

#### Automatic Watermark Detection

For cases where users don't know the watermark ID, the system offers auto-detection:

**Method 1: Direct Extraction**
- Attempt to extract watermark ID directly from suspicious image
- Try multiple bit lengths (512, 1024, 2048, 4096 bits)
- Parse structured payload if extraction succeeds
- Return watermark ID with high confidence

**Method 2: Database Scanning**
If direct extraction fails:
- Calculate pHash of suspicious image
- Compare against all watermark records in database
- Find best match based on Hamming distance
- Return closest match with confidence score

**Method 3: Visual Similarity**
If both above fail:
- Use perceptual similarity metrics
- Compare against recent user uploads
- Provide suggestions for manual verification

---

### 6. Report Generation System

The report system provides detailed PDF documentation of verification results for legal, archival, or audit purposes.

#### Single Image Report Generation

**Report Creation Workflow**:

1. **Data Collection**:
   - Retrieve image metadata (filename, size, format, upload date)
   - Calculate file hash (SHA-256) for integrity verification
   - Collect verification metrics if watermark verification was performed
   - Gather watermark status information

2. **Report Record Creation**:
   - Create Report database entry linked to image
   - Store verification status, confidence score
   - Save references to original and watermarked images
   - Include heatmap and overlay images if verification performed
   - Record notes and metadata in structured format

3. **PDF Generation**:
   - Use Django template engine with HTML template
   - Use WeasyPrint to convert HTML to professional PDF
   - Include embedded images using base64 encoding or direct file references
   - Apply CSS styling for professional appearance
   - Generate unique report ID (UUID)

4. **Report Contents**:
   - **Header**: Report title, logo, generation timestamp
   - **Image Information**: Filename, format, size, upload date
   - **Watermark Status**: Protection status, authenticity score
   - **Verification Results** (if applicable):
     - Status classification (authentic/tampered/recompressed)
     - Confidence level
     - Hamming distance
     - Watermark similarity percentage
     - Decryption success indicator
   - **Visual Evidence**:
     - Original image thumbnail
     - Suspicious image thumbnail (if verified)
     - Heatmap visualization (if available)
   - **Technical Details**:
     - File hash for integrity
     - Metadata JSON dump
     - Verification notes
   - **Footer**: Report ID, page numbers, legal disclaimer

5. **Report Delivery**:
   - Save PDF to database (FileField)
   - Return PDF inline for immediate browser viewing
   - Include `X-Report-ID` header for client reference
   - Support force regeneration with `force=true` parameter

#### Batch Report Generation

For batch operations, the system provides two modes:

**Generate Batch Reports** (`/api/reports/generate_batch/`):
- Accept batch UUID as input
- Iterate through all images in the batch
- Generate individual PDF report for each image
- Package all PDFs into a single ZIP archive
- Include batch metadata in ZIP (manifest file)
- Return ZIP file inline for immediate download
- Filename format: `batch_reports_<batch_name>_<timestamp>.zip`

**Download Existing Batch Reports** (`/api/reports/download_batch/`):
- Retrieve all existing report PDFs for batch images
- Create ZIP archive of pre-generated reports
- Skip images without existing reports
- Return as downloadable attachment
- Faster than regeneration (no PDF processing)

#### Report Management
- **List reports**: View all reports created by user
- **Retrieve report**: Get report metadata by UUID
- **Download report**: Force download single PDF as attachment
- **Update report**: Modify report notes or metadata
- **Delete report**: Remove report and associated files

#### Report Persistence
- Reports are stored permanently unless explicitly deleted
- One-to-one relationship with images ensures no duplicates
- Regeneration preserves verification data (suspicious images, heatmaps)
- Force flag allows complete regeneration when needed

---

### 7. Frontend User Interface

The frontend provides an intuitive, modern interface for interacting with the Pixel-Safe system.

#### Landing Page
- **Hero Section**: Compelling introduction to Pixel-Safe
- **Features Showcase**: Highlights of main capabilities with animated icons
  - Advanced Detection with AI algorithms
  - Real-time Processing
  - Comprehensive Reporting
  - User-friendly Interface
- **Call-to-Action**: Prominent buttons for signup/login
- **Smooth Animations**: GSAP-powered scroll animations for engaging experience
- **Responsive Design**: Mobile-friendly layout

#### Authentication Pages
- **Login Page**:
  - Username and password fields
  - JWT token acquisition on successful login
  - Persistent authentication state via Context API
  - Redirect to dashboard after login
  
- **Signup Page**:
  - User registration form
  - Client-side validation
  - Automatic login after successful registration

#### Image Upload Interface
- **Drag-and-Drop Zone**: Intuitive file upload area
- **Multiple File Support**: Upload up to 10 images simultaneously
- **File Preview**: Thumbnail preview before upload
- **Upload Progress**: Real-time progress indicators
- **Batch Naming**: Option to name image batches
- **Status Indicators**: Visual feedback for upload status
  - Pending (clock icon)
  - Processing (spinner)
  - Completed (checkmark)
  - Failed (error icon)
- **File Management**: Remove files before upload

#### Dashboard/History Page
- **Image Gallery**: Grid view of uploaded images
- **Batch Management**: View and manage image batches
- **Quick Actions**:
  - Apply watermark to images
  - Verify image authenticity
  - Generate reports
  - Download watermarked images
- **Search and Filter**: Find images by name, date, status
- **Statistics Dashboard**: Visual analytics of usage

#### Verification Interface
- **Image Upload**: Upload suspicious image for verification
- **Watermark Selection**: Choose known watermark or use auto-detection
- **Real-time Results**: Immediate verification feedback
- **Visual Analysis**: Side-by-side comparison and heatmap display
- **Confidence Indicators**: Clear visual representation of authenticity score
- **Action Buttons**: Generate report, download images

#### Report Viewer
- **PDF Preview**: In-browser PDF viewing
- **Download Options**: Save reports locally
- **Batch Operations**: Generate and download batch reports
- **Report History**: Access previously generated reports

#### Navigation and Layout
- **Navbar**: Persistent navigation with authentication-aware links
  - Unauthenticated: Home, Features, Pricing, Login, Signup
  - Authenticated: Dashboard, Upload, History, Profile, Logout
- **Footer**: Links to about, contact, privacy policy, terms of service
- **Responsive Navigation**: Mobile-friendly hamburger menu
- **Protected Routes**: Authentication-required pages redirect to login

---

## Technical Implementation Details

### Security Measures
1. **JWT Authentication**: Stateless, secure token-based auth
2. **Password Hashing**: Django's PBKDF2 algorithm with SHA256
3. **AES-256 Encryption**: Military-grade encryption for watermarks
4. **File Upload Validation**: Type and size restrictions
5. **User Isolation**: Strict resource ownership verification
6. **CORS Configuration**: Controlled cross-origin requests
7. **SQL Injection Prevention**: Django ORM parameterized queries

### Performance Optimizations
1. **Batch Processing**: Reduce API calls with bulk operations
2. **Lazy Loading**: Load images on-demand in frontend
3. **Caching**: Browser and server-side caching strategies
4. **Optimized Queries**: Django ORM select_related and prefetch_related
5. **Media Serving**: Efficient static file serving in production
6. **Atomic Transactions**: Database consistency for batch operations

### Image Processing Technologies
1. **NumPy**: Efficient array operations for image manipulation
2. **OpenCV**: Advanced image processing and computer vision
3. **Pillow (PIL)**: Image loading, saving, and format conversion
4. **SciPy**: Scientific computing for DCT/IDCT operations
5. **ImageHash**: Perceptual hashing algorithms
6. **PyWavelets**: Wavelet transform for advanced watermarking
7. **Matplotlib**: Heatmap and visualization generation

### Database Schema
1. **User**: Django's built-in User model
2. **Image**: Stores original images with metadata
3. **Batch**: Groups related images
4. **WatermarkRecord**: Links images to watermark data
5. **Report**: Stores verification reports and PDFs

### File Storage Structure
```
media/
├── uploads/              # Original uploaded images
├── watermarked/          # Watermarked images
└── reports/
    ├── originals/        # Report original image copies
    ├── tampered/         # Report tampered image copies
    ├── suspicious/       # Verification suspicious images
    ├── heatmap/          # Tampering heatmaps
    └── pdf/              # Generated PDF reports
```

---

## Use Cases and Workflows

### Use Case 1: Photographer Protecting Portfolio
1. Photographer logs into Pixel-Safe
2. Uploads batch of 50 wedding photos
3. Names batch "Johnson_Wedding_2024"
4. Applies watermark to entire batch
5. Downloads watermarked images for client delivery
6. Keeps original unwatermarked versions secure

### Use Case 2: Content Creator Verifying Stolen Content
1. Content creator finds their image on another website
2. Downloads suspicious image
3. Uploads to Pixel-Safe verification
4. System auto-detects original watermark
5. Verification shows "TAMPERED - Watermark Removed"
6. Generates legal report with evidence
7. Downloads report as PDF for copyright claim

### Use Case 3: News Agency Authenticating Submissions
1. News agency receives photo from freelancer
2. Freelancer claims photo is original
3. Agency uploads photo for verification
4. System checks against watermark database
5. Verification shows "AUTHENTIC - High Confidence"
6. Agency proceeds with publication
7. Generates report for records

### Use Case 4: Legal Evidence Preparation
1. Investigator has potentially tampered evidence image
2. Original watermarked image exists in database
3. Runs verification with suspicious image
4. System generates detailed heatmap showing tampering
5. Report includes technical metrics and confidence scores
6. Downloads professional PDF report
7. Presents in court as digital forensic evidence

---

## Future Enhancement Possibilities

While not currently implemented, the system architecture supports:
1. **Social Media Scanner**: Detect watermarked images across social platforms
2. **Browser Extension**: Right-click verification in web browsers
3. **Mobile Apps**: iOS/Android apps for on-the-go verification
4. **Admin Dashboard**: System-wide analytics and user management
5. **API Rate Limiting**: Prevent abuse with rate limits
6. **Video Watermarking**: Extend to video content protection
7. **Blockchain Integration**: Immutable proof of ownership
8. **Machine Learning Detection**: AI-powered tampering detection
9. **Multi-language Support**: Internationalization
10. **Cloud Storage Integration**: Direct upload from Google Drive, Dropbox

---

## System Requirements

### Backend Requirements
- Python 3.8+
- Django 5.2.7
- PostgreSQL or SQLite database
- 2GB+ RAM for image processing
- 10GB+ storage for media files

### Frontend Requirements
- Node.js 16+
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- 1GB+ available memory

### Network Requirements
- HTTP/HTTPS support
- CORS-enabled for API communication
- WebSocket support (for future real-time features)

---

## Conclusion

Pixel-Safe is a comprehensive digital image authentication system that combines advanced cryptographic watermarking, perceptual hashing, and detailed forensic reporting to protect digital content and verify image authenticity. The system is designed with security, usability, and scalability in mind, making it suitable for photographers, content creators, news agencies, legal professionals, and anyone concerned about digital image integrity.

The invisible watermarking technology ensures that protected images maintain their visual quality while embedding robust authentication data that can survive common image manipulations. The verification system provides clear, confident assessments of image authenticity with supporting visual evidence and detailed reports.

With its modern React frontend and robust Django backend, Pixel-Safe offers a professional, production-ready solution for the growing need for digital content authentication in an era of advanced image editing tools and AI-powered manipulation.
