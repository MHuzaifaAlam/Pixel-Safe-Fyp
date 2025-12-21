import numpy as np
from PIL import Image
import io,os

class ImageProcessor:
    @staticmethod
    def load_and_validate_image(image_path):
        """Load and validate image file"""
        try:
            img = Image.open(image_path)
            img_array = np.array(img)
            
            # Convert RGBA to RGB if needed
            if len(img_array.shape) == 3 and img_array.shape[2] == 4:
                img_array = img_array[:, :, :3]
            
            # Ensure it's RGB
            if len(img_array.shape) != 3 or img_array.shape[2] != 3:
                if len(img_array.shape) == 2:
                    img_array = np.stack([img_array, img_array, img_array], axis=2)
                else:
                    raise ValueError(f'Unsupported image format. Shape: {img_array.shape}')
            
            return img_array
        except Exception as e:
            raise Exception(f"Error loading image: {str(e)}")
    
    @staticmethod
    def save_image_array(img_array, filename, format='PNG'):
        """Save numpy array as image file"""
        try:
            img_pil = Image.fromarray(img_array)
            buffer = io.BytesIO()
            img_pil.save(buffer, format=format)
            buffer.seek(0)
            return buffer.getvalue()
        except Exception as e:
            raise Exception(f"Error saving image: {str(e)}")
    
    @staticmethod
    def process_uploaded_image(uploaded_file):
        """Process uploaded file to numpy array"""
        img = Image.open(uploaded_file)
        img_array = np.array(img)
        
        if len(img_array.shape) == 3 and img_array.shape[2] == 4:
            img_array = img_array[:, :, :3]
        
        if len(img_array.shape) != 3 or img_array.shape[2] != 3:
            if len(img_array.shape) == 2:
                img_array = np.stack([img_array, img_array, img_array], axis=2)
            else:
                raise ValueError('Unsupported image format')
        
        return img_array