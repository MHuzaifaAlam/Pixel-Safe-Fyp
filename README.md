# 🔄 Merge: Signup/Login + Image Upload Integration

## ✨ Overview
Merged user authentication (signup/login) and image upload features using Django REST Framework (DRF).

## 🔐 Authentication Features
- ✅ **Signup API endpoint** - User registration with token creation
- ✅ **Login API endpoint** - User authentication with token validation  
- ✅ **Protected routes** - Only authenticated users can upload images
- ✅ **User-image linking** - Each uploaded image is linked to the logged-in user

## 🖼️ Image Upload System
- ✅ **Image model** - Linked to User via ForeignKey relationship
- ✅ **File metadata** - Stores filename, size, format, and upload date
- ✅ **Single image upload** - Support for individual image uploads
- 🔄 **Multi-image upload** - Coming in next update

## 🛠️ Tech Stack
- **Backend**: Django + Django REST Framework (DRF)
- **Image Processing**: Pillow
- **Database**: SQLite (Development)
- **Authentication**: DRF Token Authentication
