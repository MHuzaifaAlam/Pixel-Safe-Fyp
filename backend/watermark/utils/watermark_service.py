import logging
from .watermark_engine import WatermarkEngine, AESManager
from .phash import PerceptualHasher

logger = logging.getLogger(__name__)

class WatermarkService:
    def __init__(self):
        self.watermark_engine = WatermarkEngine()
        self.aes_manager = AESManager()
    
    def apply_watermark_to_image(self, image_array, watermark_record):
        """Apply watermark to image array"""
        try:
            # Compute perceptual hash
            phash = PerceptualHasher.compute(image_array)
            
            # Encrypt the hash
            encrypted_data = self.aes_manager.encrypt(phash)
            
            # Embed with watermark ID
            watermarked_array = self.watermark_engine.embed_with_id(
                image_array, 
                encrypted_data['ciphertext'], 
                watermark_record.id
            )
            
            return {
                'success': True,
                'watermarked_array': watermarked_array,
                'phash': phash,  # This is a string
                'encrypted_data': encrypted_data  # Contains bytes
            }
        except Exception as e:
            logger.error(f"Error applying watermark: {e}")
            return {'success': False, 'error': str(e)}
    
    def extract_and_verify(self, suspicious_array, watermark_record):
        """Extract and verify watermark from suspicious image - ALL values are JSON serializable"""
        try:
            # Extract watermark
            num_bits = len(watermark_record.encrypted_hash) * 8
            extracted_bits = self.watermark_engine.extract_watermark(suspicious_array, num_bits)
            extracted_bytes = self.watermark_engine._bits_to_bytes(extracted_bits)
            
            # Get original bits for comparison
            original_bits = self.watermark_engine._bytes_to_bits(watermark_record.encrypted_hash)
            
            # Calculate similarity
            min_length = min(len(extracted_bits), len(original_bits))
            if min_length > 0:
                matching_bits = sum(1 for a, b in zip(extracted_bits[:min_length], original_bits[:min_length]) if a == b)
                watermark_similarity = matching_bits / min_length
            else:
                watermark_similarity = 0
            
            # Try decryption - NOW returns string only
            decryption_success, decrypted_hash = self._try_decryption(
                extracted_bytes, watermark_record
            )
            
            # Compute perceptual hash
            current_phash = PerceptualHasher.compute(suspicious_array)
            original_phash = watermark_record.perceptual_hash
            hamming_distance = PerceptualHasher.hamming_distance(current_phash, original_phash)
            
            # ALL values are JSON serializable now
            return {
                'success': True,
                'watermark_similarity': float(watermark_similarity),  # Float
                'decryption_success': bool(decryption_success),       # Bool
                'decrypted_hash': str(decrypted_hash),                # String
                'current_phash': str(current_phash),                  # String
                'hamming_distance': int(hamming_distance)             # Int
            }
            
        except Exception as e:
            logger.error(f"Error in extraction/verification: {e}")
            return {'success': False, 'error': str(e)}
    
    def _try_decryption(self, extracted_bytes, watermark_record):
        """Try to decrypt extracted bytes - ALWAYS returns string"""
        try:
            if len(extracted_bytes) != len(watermark_record.encrypted_hash):
                extracted_bytes = extracted_bytes[:len(watermark_record.encrypted_hash)]
            
            # This now returns string (fixed in AESManager)
            decrypted_hash = self.aes_manager.decrypt(
                extracted_bytes,
                watermark_record.aes_iv_encrypted,
                watermark_record.aes_key_encrypted
            )
            
            return True, decrypted_hash
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return False, ""