from PIL import Image
import imagehash
import numpy as np

class PerceptualHasher:
    @staticmethod
    def compute(image, hash_size=8):
        """Compute perceptual hash from PIL Image or numpy array"""
        if isinstance(image, np.ndarray):
            image = Image.fromarray(image)
        
        # Resize for consistency
        image_resized = image.resize((256, 256), Image.Resampling.LANCZOS)
        
        # Compute pHash
        phash = imagehash.phash(image_resized, hash_size=hash_size)
        return str(phash)
    
    @staticmethod
    def hamming_distance(hash1, hash2):
        """Calculate Hamming distance between two perceptual hashes"""
        if isinstance(hash1, str):
            hash1 = imagehash.hex_to_hash(hash1)
        if isinstance(hash2, str):
            hash2 = imagehash.hex_to_hash(hash2)
        
        return hash1 - hash2  # Overloaded operator in imagehash
    
    @staticmethod
    def interpret_distance(distance):
        """Interpret Hamming distance for tamper detection"""
        if distance <= 5:
            return "ORIGINAL", "high"
        elif distance <= 12:
            return "COMPRESSED", "medium"
        else:
            return "TAMPERED", "high"