#!/usr/bin/env python
"""
Debug script to test watermark verification with different scenarios
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from PIL import Image
import numpy as np
from watermark.utils.watermark_engine import WatermarkEngine
from watermark.utils.watermark_service import WatermarkService
from watermark.utils.verification_logic import VerificationLogic
from watermark.models import WatermarkRecord
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def compress_image_jpeg(image_array, quality=75):
    """Simulate Facebook/Instagram JPEG compression"""
    img = Image.fromarray(image_array.astype('uint8'))
    import io
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=quality)
    buffer.seek(0)
    compressed = Image.open(buffer)
    return np.array(compressed)

def test_watermark_verification():
    """Test watermark verification on original and compressed images"""
    
    # Get a watermark record
    watermarks = WatermarkRecord.objects.all()[:1]
    
    if not watermarks:
        print("❌ No watermark records found. Upload a watermark first!")
        return
    
    wm_record = watermarks[0]
    print(f"\n✓ Testing with watermark ID: {wm_record.id}")
    print(f"  Original hash: {wm_record.perceptual_hash}")
    
    # Load the watermarked image
    watermarked_path = wm_record.watermarked_image.path
    watermarked_img = Image.open(watermarked_path)
    watermarked_array = np.array(watermarked_img)
    
    print(f"\n=== TEST 1: Original Watermarked Image (NO COMPRESSION) ===")
    watermark_service = WatermarkService()
    result1 = watermark_service.extract_and_verify(watermarked_array, wm_record)
    
    print(f"Hamming Distance: {result1['hamming_distance']}")
    print(f"Watermark Similarity: {result1['watermark_similarity']:.4f}")
    print(f"Decryption Success: {result1['decryption_success']}")
    print(f"Decrypted Hash: {result1['decrypted_hash']}")
    
    # Test with NO source_platform
    status1_no_platform, conf1_no_platform, reason1_no_platform = VerificationLogic.determine_status(
        result1['hamming_distance'],
        result1['watermark_similarity'],
        result1['decryption_success'],
        result1['decrypted_hash'],
        wm_record.perceptual_hash,
        source_platform=None
    )
    print(f"\n[NO PLATFORM] Status: {status1_no_platform}, Confidence: {conf1_no_platform}")
    print(f"Reason: {reason1_no_platform}")
    
    # Test WITH source_platform=facebook
    status1_facebook, conf1_facebook, reason1_facebook = VerificationLogic.determine_status(
        result1['hamming_distance'],
        result1['watermark_similarity'],
        result1['decryption_success'],
        result1['decrypted_hash'],
        wm_record.perceptual_hash,
        source_platform='facebook.com'
    )
    print(f"[FACEBOOK] Status: {status1_facebook}, Confidence: {conf1_facebook}")
    print(f"Reason: {reason1_facebook}")
    
    # Test WITH source_platform=instagram
    status1_instagram, conf1_instagram, reason1_instagram = VerificationLogic.determine_status(
        result1['hamming_distance'],
        result1['watermark_similarity'],
        result1['decryption_success'],
        result1['decrypted_hash'],
        wm_record.perceptual_hash,
        source_platform='instagram.com'
    )
    print(f"[INSTAGRAM] Status: {status1_instagram}, Confidence: {conf1_instagram}")
    print(f"Reason: {reason1_instagram}")
    
    # TEST 2: Simulate Facebook JPEG compression (quality 75)
    print(f"\n=== TEST 2: Facebook JPEG Compression (Quality 75) ===")
    compressed75 = compress_image_jpeg(watermarked_array, quality=75)
    result2 = watermark_service.extract_and_verify(compressed75, wm_record)
    
    print(f"Hamming Distance: {result2['hamming_distance']}")
    print(f"Watermark Similarity: {result2['watermark_similarity']:.4f}")
    print(f"Decryption Success: {result2['decryption_success']}")
    print(f"Decrypted Hash: {result2['decrypted_hash']}")
    
    status2_no_platform, conf2_no_platform, reason2_no_platform = VerificationLogic.determine_status(
        result2['hamming_distance'],
        result2['watermark_similarity'],
        result2['decryption_success'],
        result2['decrypted_hash'],
        wm_record.perceptual_hash,
        source_platform=None
    )
    print(f"\n[NO PLATFORM] Status: {status2_no_platform}, Confidence: {conf2_no_platform}")
    print(f"Reason: {reason2_no_platform}")
    
    status2_facebook, conf2_facebook, reason2_facebook = VerificationLogic.determine_status(
        result2['hamming_distance'],
        result2['watermark_similarity'],
        result2['decryption_success'],
        result2['decrypted_hash'],
        wm_record.perceptual_hash,
        source_platform='facebook.com'
    )
    print(f"[FACEBOOK] Status: {status2_facebook}, Confidence: {conf2_facebook}")
    print(f"Reason: {reason2_facebook}")
    
    # TEST 3: Even more aggressive compression (quality 70)
    print(f"\n=== TEST 3: Aggressive Compression (Quality 70) ===")
    compressed70 = compress_image_jpeg(watermarked_array, quality=70)
    result3 = watermark_service.extract_and_verify(compressed70, wm_record)
    
    print(f"Hamming Distance: {result3['hamming_distance']}")
    print(f"Watermark Similarity: {result3['watermark_similarity']:.4f}")
    print(f"Decryption Success: {result3['decryption_success']}")
    print(f"Decrypted Hash: {result3['decrypted_hash']}")
    
    status3_facebook, conf3_facebook, reason3_facebook = VerificationLogic.determine_status(
        result3['hamming_distance'],
        result3['watermark_similarity'],
        result3['decryption_success'],
        result3['decrypted_hash'],
        wm_record.perceptual_hash,
        source_platform='facebook.com'
    )
    print(f"[FACEBOOK] Status: {status3_facebook}, Confidence: {conf3_facebook}")
    print(f"Reason: {reason3_facebook}")
    
    # TEST 4: Simulate TAMPERING - Content Modification (crop)
    print(f"\n=== TEST 4: Tampered Image (Content modified - cropped) ===")
    tampered_crop = watermarked_array[20:300, 20:300]  # Crop the image
    # Pad back to original size
    tampered = np.zeros_like(watermarked_array)
    tampered[0:tampered_crop.shape[0], 0:tampered_crop.shape[1]] = tampered_crop
    result4 = watermark_service.extract_and_verify(tampered, wm_record)
    
    print(f"Hamming Distance: {result4['hamming_distance']}")
    print(f"Watermark Similarity: {result4['watermark_similarity']:.4f}")
    print(f"Decryption Success: {result4['decryption_success']}")
    print(f"Decrypted Hash: {result4['decrypted_hash']}")
    
    status4_no_platform, conf4_no_platform, reason4_no_platform = VerificationLogic.determine_status(
        result4['hamming_distance'],
        result4['watermark_similarity'],
        result4['decryption_success'],
        result4['decrypted_hash'],
        wm_record.perceptual_hash,
        source_platform=None
    )
    print(f"[NO PLATFORM] Status: {status4_no_platform}, Confidence: {conf4_no_platform}")
    print(f"Reason: {reason4_no_platform}")
    
    status4_facebook, conf4_facebook, reason4_facebook = VerificationLogic.determine_status(
        result4['hamming_distance'],
        result4['watermark_similarity'],
        result4['decryption_success'],
        result4['decrypted_hash'],
        wm_record.perceptual_hash,
        source_platform='facebook.com'
    )
    print(f"[FACEBOOK] Status: {status4_facebook}, Confidence: {conf4_facebook}")
    print(f"Reason: {reason4_facebook}")
    
    # TEST 5: Severe tampering
    print(f"\n=== TEST 5: Severe Tampering (Face blurred/edited) ===")
    severe_tamper = watermarked_array.copy()
    severe_tamper[50:150, 50:150] = 128  # Fill a region with grey
    result5 = watermark_service.extract_and_verify(severe_tamper, wm_record)
    
    print(f"Hamming Distance: {result5['hamming_distance']}")
    print(f"Watermark Similarity: {result5['watermark_similarity']:.4f}")
    
    status5_no_platform, conf5_no_platform, reason5_no_platform = VerificationLogic.determine_status(
        result5['hamming_distance'],
        result5['watermark_similarity'],
        result5['decryption_success'],
        result5['decrypted_hash'],
        wm_record.perceptual_hash,
        source_platform=None
    )
    print(f"[NO PLATFORM] Status: {status5_no_platform}, Confidence: {conf5_no_platform}")

if __name__ == '__main__':
    test_watermark_verification()
