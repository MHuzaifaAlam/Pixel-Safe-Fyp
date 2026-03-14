# Pixel-Safe: Hybrid AI Image Forensics & Provenance System
Pixel-Safe is a full-stack digital forensic platform designed to combat the rise of hyper-realistic AI-generated forgeries (GANs) and manual image manipulation. Unlike reactive tools that only offer detection, Pixel-Safe implements a proactive "GAN-proofing" workflow using invisible digital watermarking to establish a verifiable chain of custody.
### Key Engineering HighlightsHybrid Detection Engine: Combines deep learning-based GAN detection with pixel-level forensic analysis to achieve >90% accuracy.
### Proactive "GAN-Proofing": Implements an invisible LSB (Least Significant Bit) watermarking module to embed provenance data into original assets.
### Real-Time Verification: A Chrome Extension that allows users to verify image authenticity directly on any webpage via a prioritized backend queue.
### Scalable Architecture: Built with a decoupled React frontend and Django REST API backend, utilizing Celery/Redis for asynchronous processing of heavy AI inference jobs.🛠
#### Tech StackFrontend: React.js, Tailwind CSS Backend: Django, Django REST Framework, Celery 
## AI/ML: 
## PyTorch (GAN Detection), OpenCV (Saliency Maps/Grad-CAM), NumPy
#### Database & Storage: PostgreSQL (Production), AWS S3 (Media Storage), Redis (Task Queue) 
#### DevOps: Docker, Nginx, AWS EC2 (G4dn GPU instances) 🧬 System ArchitectureThe system follows a layered architecture designed for high-performance 
### AI inference:Presentation Layer: React-based dashboard providing heatmaps and confidence scores.
### Application Layer: Django API handling orchestration, authentication (JWT), and task enqueuing.
### Processing Layer: PyTorch-enabled GPU workers executing GAN detection and watermark extraction.
### Data Layer: PostgreSQL for metadata and S3 for high-resolution forensic artifacts.
### Performance & AccuracyDetection Accuracy: Tested at 92% on GAN-generated datasets.
### Inference Latency: Average processing time <10 seconds per image using GPU-accelerated pipelines.
### Watermark Robustness: 95% verification success rate after common transformations like JPEG compression (quality 70) and resizing.
## Features 
### FeatureDescription 
### Forensic DashboardReal-time monitoring of batch processing and historical analysis reports.
### Tamper Heatmaps Visual spatial highlighting of manipulated regions using Grad-CAM activation gradients.
### Invisible WatermarkingSecures original images with provenance-linked tokens for future tamper detection.
### PDF Dossier GenerationOne-click export of comprehensive forensic reports including metadata and timestamps.
## Model Reference:
 ### ICCV2025 | LOTA: Identifying Fake Truth from Underlying Noise : https://mp.weixin.qq.com/s/hNGFlHDbaOftwVLVqWusPg
# Installation & Setup

### Clone the Repository: git clone https://github.com/MHuzaifaAlam/Pixel-Safe-Fyp 

### Backend Setup:

### Bash
### cd backend && pip install -r requirements.txt
### python manage.py migrate
### python manage.py runserver
