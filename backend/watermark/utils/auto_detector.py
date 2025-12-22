import numpy as np
from PIL import Image
import logging
from .phash import PerceptualHasher
from .watermark_engine import WatermarkEngine, AESManager
try:
    from ..models import WatermarkRecord
except ImportError:
    from watermark.models import WatermarkRecord

    
logger = logging.getLogger(__name__)

class WatermarkAutoDetector:
    """
    Automatically detect watermark ID from suspicious image
    """
    
    def __init__(self):
        self.watermark_engine = WatermarkEngine()
        self.aes_manager = AESManager()
    
    def extract_watermark_id(self, image_array):
        """
        Try to extract watermark ID directly from image
        Returns: (watermark_id, confidence, extracted_data)
        """
        try:
            # Try to extract structured payload
            # We need to try different bit lengths since we don't know exact size
            bit_lengths = [512, 1024, 2048, 4096]
            
            for num_bits in bit_lengths:
                try:
                    result = self.watermark_engine.extract_with_id(
                        image_array, 
                        num_bits
                    )
                    
                    if result['success']:
                        watermark_id = result['watermark_id']
                        extracted_data = result['data']
                        
                        logger.info(f"Extracted watermark ID: {watermark_id}")
                        return {
                            'method': 'direct_extraction',
                            'watermark_id': int(watermark_id),
                            'confidence': 'high',
                            'extracted_data': extracted_data,
                            'full_payload': result.get('full_payload')
                        }
                except Exception as e:
                    continue
            
            return {
                'method': 'direct_extraction',
                'watermark_id': None,
                'confidence': 'none',
                'error': 'No structured payload found'
            }
            
        except Exception as e:
            logger.error(f"Error extracting watermark ID: {e}")
            return {
                'method': 'direct_extraction',
                'watermark_id': None,
                'confidence': 'none',
                'error': str(e)
            }
    
    def find_by_perceptual_hash(self, image_array, threshold=20):
        """
        Find watermark by perceptual hash similarity
        """
        from ..models import WatermarkRecord
        
        try:
            # Compute perceptual hash of suspicious image
            current_phash = PerceptualHasher.compute(image_array)
            
            # Get all watermark records
            all_records = WatermarkRecord.objects.select_related('original_image').all()
            
            candidates = []
            
            for record in all_records:
                # Calculate hamming distance
                distance = PerceptualHasher.hamming_distance(
                    current_phash, 
                    record.perceptual_hash
                )
                
                if distance <= threshold:
                    similarity = 100 - (distance / 64 * 100)
                    
                    # Calculate additional confidence factors
                    confidence_factors = []
                    
                    # Check image dimensions if available
                    try:
                        if hasattr(record.original_image, 'image'):
                            # This would require storing dimensions in model
                            pass
                    except:
                        pass
                    
                    candidates.append({
                        'watermark_id': record.id,
                        'original_image_id': record.original_image.ImageID,
                        'filename': record.original_image.fileName if hasattr(record.original_image, 'fileName') else 'Unknown',
                        'hamming_distance': distance,
                        'similarity_percent': similarity,
                        'created_at': record.created_at if hasattr(record, 'created_at') else None
                    })
            
            # Sort by similarity (highest first)
            candidates.sort(key=lambda x: x['similarity_percent'], reverse=True)
            
            if candidates:
                best_match = candidates[0]
                
                # Calculate confidence based on similarity
                if best_match['similarity_percent'] > 95:
                    confidence = 'very_high'
                elif best_match['similarity_percent'] > 85:
                    confidence = 'high'
                elif best_match['similarity_percent'] > 70:
                    confidence = 'medium'
                else:
                    confidence = 'low'
                
                return {
                    'method': 'perceptual_hash',
                    'watermark_id': best_match['watermark_id'],
                    'confidence': confidence,
                    'similarity': best_match['similarity_percent'],
                    'all_candidates': candidates[:5],  # Top 5 matches
                    'best_match': best_match
                }
            else:
                return {
                    'method': 'perceptual_hash',
                    'watermark_id': None,
                    'confidence': 'none',
                    'all_candidates': [],
                    'error': f'No matches found within threshold {threshold}'
                }
                
        except Exception as e:
            logger.error(f"Error finding by perceptual hash: {e}")
            return {
                'method': 'perceptual_hash',
                'watermark_id': None,
                'confidence': 'none',
                'error': str(e)
            }
    
    def auto_detect(self, image_array, enable_fallback=True):
        """
        Main auto-detection method
        Returns: detected watermark_id or None
        """
        logger.info("Starting auto-detection...")
        
        # Method 1: Try direct extraction from watermark
        logger.info("Trying direct watermark extraction...")
        direct_result = self.extract_watermark_id(image_array)
        
        if direct_result['watermark_id'] is not None:
            # Validate that the extracted ID exists in database
            from ..models import WatermarkRecord
            try:
                WatermarkRecord.objects.get(id=direct_result['watermark_id'])
                logger.info(f"Successfully extracted and validated watermark ID: {direct_result['watermark_id']}")
                
                # Return with successful extraction
                return {
                    **direct_result,
                    'validated': True,
                    'detection_method': 'direct'
                }
            except WatermarkRecord.DoesNotExist:
                logger.warning(f"Extracted watermark ID {direct_result['watermark_id']} not found in database")
                # Continue to fallback
        
        # Method 2: Fallback to perceptual hash matching
        if enable_fallback:
            logger.info("Direct extraction failed, trying perceptual hash matching...")
            hash_result = self.find_by_perceptual_hash(image_array)
            
            if hash_result['watermark_id'] is not None:
                logger.info(f"Found match via perceptual hash: {hash_result['watermark_id']}")
                return {
                    **hash_result,
                    'validated': True,
                    'detection_method': 'perceptual_hash'
                }
        
        # Method 3: If still no match, try brute-force decryption
        if enable_fallback:
            logger.info("Trying brute-force decryption...")
            brute_result = self.try_brute_force_decryption(image_array)
            
            if brute_result['watermark_id'] is not None:
                logger.info(f"Found match via brute force: {brute_result['watermark_id']}")
                return {
                    **brute_result,
                    'validated': True,
                    'detection_method': 'brute_force'
                }
        
        # No match found
        logger.warning("No watermark ID could be detected")
        return {
            'watermark_id': None,
            'confidence': 'none',
            'detection_method': 'none',
            'validated': False,
            'error': 'No watermark ID detected'
        }
    
    def try_brute_force_decryption(self, image_array, limit=50):
        """
        Try to decrypt with all watermark records
        Only tries first 'limit' records for performance
        """
        from ..models import WatermarkRecord
        
        try:
            records = WatermarkRecord.objects.all()[:limit]
            
            for record in records:
                try:
                    # Try to extract expected number of bits
                    num_bits = len(record.encrypted_hash) * 8
                    extracted_bits = self.watermark_engine.extract_watermark(image_array, num_bits)
                    extracted_bytes = self.watermark_engine._bits_to_bytes(extracted_bits)
                    
                    # Try decryption
                    if len(extracted_bytes) >= len(record.encrypted_hash):
                        decrypted = self.aes_manager.decrypt(
                            extracted_bytes[:len(record.encrypted_hash)],
                            record.aes_iv_encrypted,
                            record.aes_key_encrypted
                        )
                        
                        # If decryption succeeds (no exception), it might be a match
                        # We could add additional validation here
                        return {
                            'watermark_id': record.id,
                            'confidence': 'medium',
                            'method': 'brute_force_decryption',
                            'match_found': True
                        }
                except:
                    continue
            
            return {
                'watermark_id': None,
                'confidence': 'none',
                'method': 'brute_force_decryption',
                'match_found': False
            }
            
        except Exception as e:
            logger.error(f"Brute force decryption error: {e}")
            return {
                'watermark_id': None,
                'confidence': 'none',
                'method': 'brute_force_decryption',
                'error': str(e)
            }