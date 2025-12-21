import os
from django.core.files.storage import default_storage

def validate_image_file(uploaded_file):
    """Validate uploaded image file"""
    max_size = 10 * 1024 * 1024  # 10MB
    allowed_types = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/jpg']
    
    if uploaded_file.size > max_size:
        raise ValueError(f'File too large. Maximum size is {max_size/1024/1024}MB')
    
    content_type = uploaded_file.content_type
    if content_type == 'application/octet-stream':
        filename = uploaded_file.name.lower()
        if not any(filename.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']):
            raise ValueError('Unsupported file format')
    elif content_type not in allowed_types:
        raise ValueError(f'Unsupported file type: {content_type}')
    
    return True

def handle_image_upload(uploaded_file, upload_dir):
    """Handle image upload and return path"""
    os.makedirs(upload_dir, exist_ok=True)
    filename = uploaded_file.name
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
    
    return filepath