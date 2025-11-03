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

# Backend Setup Instructions

## 📋 Prerequisites

Before starting, ensure you have the following installed:

- Python 3.8+
- Pipenv (Python package manager)
- Git

## 🔧 Step-by-Step Setup

### 1. Navigate to Backend Directory
```bash
cd PIXEL-SATE-FYP/backend
```
### 2. Install Dependencies using Pipenv
```bash
pipenv install
pipenv shell
```
### 3. Run Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```
### 4. Start the Development Server
```bash
python manage.py runserver
```
