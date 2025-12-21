from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.base import ContentFile
from django.conf import settings
from django.core.files.storage import default_storage
import json
import numpy as np
from PIL import Image
import io
import uuid
import traceback
import os
import time
import logging

from imageapp.models import Image as ImageModel
from .models import WatermarkRecord
from .utils.watermark_engine import WatermarkEngine, AESManager
from .utils.phash import PerceptualHasher
from .utils.visual_overlay import VisualOverlay

logger = logging.getLogger(__name__)

def validate_image_file(uploaded_file):
    """Validate uploaded image file"""
    max_size = 10 * 1024 * 1024  # 10MB
    allowed_types = ['image/jpeg', 'image/png', 'image/bmp', 'image/tiff', 'image/jpg']
    
    if uploaded_file.size > max_size:
        raise ValueError(f'File too large. Maximum size is {max_size/1024/1024}MB')
    
    # Check content type or extension
    content_type = uploaded_file.content_type
    if content_type == 'application/octet-stream':
        # Check file extension
        filename = uploaded_file.name.lower()
        if not any(filename.endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']):
            raise ValueError('Unsupported file format')
    elif content_type not in allowed_types:
        raise ValueError(f'Unsupported file type: {content_type}')
    
    return True


@csrf_exempt
def apply_watermark(request):
    """Apply watermark to an existing image from imageapp"""
    if request.method == 'POST':
        try:
            # Parse JSON data
            if request.content_type == 'application/json':
                data = json.loads(request.body)
            else:
                data = request.POST.dict()
            
            image_id = data.get('image_id')
            
            if not image_id:
                return JsonResponse({'error': 'image_id is required'}, status=400)
            
            # Convert string to UUID if needed
            try:
                if isinstance(image_id, str):
                    image_uuid = uuid.UUID(image_id)
                else:
                    image_uuid = image_id
            except ValueError:
                return JsonResponse({'error': f'Invalid image_id format: {image_id}. Must be a valid UUID.'}, status=400)
            
            # Get image from imageapp using ImageID (UUID)
            try:
                original_image = ImageModel.objects.get(ImageID=image_uuid)
            except ImageModel.DoesNotExist:
                # List some available images for debugging
                available_images = ImageModel.objects.all()[:5]
                available_ids = [str(img.ImageID) for img in available_images]
                
                return JsonResponse({
                    'error': f'Image with ID {image_id} not found',
                    'available_images': available_ids,
                    'hint': 'Use one of these ImageIDs'
                }, status=404)
            
            # Check if image file exists
            if not os.path.exists(original_image.image.path):
                return JsonResponse({
                    'error': f'Image file not found at {original_image.image.path}'
                }, status=404)
            
            # Load image
            try:
                image_path = original_image.image.path
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
                        return JsonResponse({
                            'error': f'Unsupported image format. Shape: {img_array.shape}'
                        }, status=400)
                
            except Exception as e:
                return JsonResponse({'error': f'Error loading image: {str(e)}'}, status=500)
            
            # Step 1: Compute perceptual hash
            try:
                phash = PerceptualHasher.compute(img_array)
            except Exception as e:
                return JsonResponse({'error': f'Error computing hash: {str(e)}'}, status=500)
            
            # Step 2: Encrypt the hash
            try:
                aes_manager = AESManager()
                encrypted_data = aes_manager.encrypt(phash)
            except Exception as e:
                return JsonResponse({'error': f'Error encrypting hash: {str(e)}'}, status=500)
            
            # Step 3: Embed watermark
            try:
                watermark_engine = WatermarkEngine()
                secret_data = encrypted_data['ciphertext']
                watermarked_array = watermark_engine.embed_watermark(img_array, secret_data)
            except Exception as e:
                return JsonResponse({'error': f'Error embedding watermark: {str(e)}'}, status=500)
            
            # Step 4: Save watermarked image
            try:
                watermarked_pil = Image.fromarray(watermarked_array)
                
                # Save to ContentFile
                buffer = io.BytesIO()
                watermarked_pil.save(buffer, format='PNG')
                buffer.seek(0)
                
                # Create WatermarkRecord
                watermark_record = WatermarkRecord.objects.create(
                    original_image=original_image,
                    perceptual_hash=phash,
                    encrypted_hash=encrypted_data['ciphertext'],
                    aes_key_encrypted=encrypted_data['key'],
                    aes_iv_encrypted=encrypted_data['iv']
                )
                
                # Save watermarked image file
                watermark_record.watermarked_image.save(
                    f'watermarked_{original_image.ImageID}.png',
                    ContentFile(buffer.getvalue())
                )
                watermark_record.save()
                
                # Update original image status to 'protected'
                original_image.Status = 'protected'
                original_image.save()
                
                logger.info(f"Watermark applied successfully to image {image_id}")
                
                return JsonResponse({
                    'status': 'success',
                    'message': 'Watermark applied successfully',
                    'watermark_id': watermark_record.id,
                    'original_image_id': str(original_image.ImageID),
                    'original_filename': original_image.fileName,
                    'watermarked_image_url': watermark_record.watermarked_image.url
                })
                
            except Exception as e:
                return JsonResponse({'error': f'Error saving watermarked image: {str(e)}'}, status=500)
            
        except Exception as e:
            error_trace = traceback.format_exc()
            logger.error(f"Error in apply_watermark: {error_trace}")
            return JsonResponse({
                'error': 'Internal server error',
                'details': str(e)
            }, status=500)
    
    return JsonResponse({'error': 'Only POST method allowed'}, status=405)


@csrf_exempt
def verify_watermark(request):
    """Verify if a suspicious image matches the original watermark"""
    if request.method == 'POST':
        try:
            # Validate uploaded file
            if not request.FILES.get('image'):
                return JsonResponse({
                    'error': 'Image file is required for verification. Upload the suspicious image.'
                }, status=400)
            
            uploaded_file = request.FILES['image']
            
            # Validate file
            try:
                validate_image_file(uploaded_file)
            except ValueError as e:
                return JsonResponse({'error': str(e)}, status=400)
            
            # Log the request
            watermark_id = request.POST.get('watermark_id')
            image_id = request.POST.get('image_id')
            logger.info(f"Verification request - watermark_id: {watermark_id}, image_id: {image_id}, filename: {uploaded_file.name}")
            
            # Load and process the suspicious image
            img = Image.open(uploaded_file)
            img_array = np.array(img)
            
            # Convert RGBA to RGB if needed
            if len(img_array.shape) == 3 and img_array.shape[2] == 4:
                img_array = img_array[:, :, :3]
            
            # Ensure it's RGB
            if len(img_array.shape) != 3 or img_array.shape[2] != 3:
                if len(img_array.shape) == 2:
                    img_array = np.stack([img_array, img_array, img_array], axis=2)
                else:
                    return JsonResponse({'error': 'Unsupported image format'}, status=400)
            
            # Get watermark record
            if not watermark_id and not image_id:
                return JsonResponse({
                    'error': 'Either watermark_id or image_id is required to identify which watermark to check against'
                }, status=400)
            
            # Get the watermark record
            if watermark_id:
                watermark_record = WatermarkRecord.objects.get(id=watermark_id)
            else:
                # Convert image_id to UUID
                try:
                    if isinstance(image_id, str):
                        image_uuid = uuid.UUID(image_id)
                    else:
                        image_uuid = image_id
                except ValueError:
                    return JsonResponse({
                        'error': f'Invalid image_id format: {image_id}'
                    }, status=400)
                
                watermark_record = WatermarkRecord.objects.filter(
                    original_image__ImageID=image_uuid
                ).first()
                
                if not watermark_record:
                    return JsonResponse({
                        'error': f'No watermark found for image ID {image_id}'
                    }, status=404)
            
            # Check if watermarked image exists
            if not os.path.exists(watermark_record.watermarked_image.path):
                return JsonResponse({
                    'error': 'Watermarked image file not found on server'
                }, status=500)
            
            # Extract watermark from the SUSPICIOUS uploaded image
            watermark_engine = WatermarkEngine()
            num_bits = len(watermark_record.encrypted_hash) * 8
            
            logger.debug(f"Extracting {num_bits} bits from suspicious image...")
            extracted_bits = watermark_engine.extract_watermark(img_array, num_bits)
            extracted_bytes = watermark_engine._bits_to_bytes(extracted_bits)
            
            # Get original watermark bits for comparison
            original_bits = watermark_engine._bytes_to_bits(watermark_record.encrypted_hash)
            
            # Calculate watermark similarity
            min_length = min(len(extracted_bits), len(original_bits))
            if min_length > 0:
                matching_bits = sum(
                    1 for a, b in zip(extracted_bits[:min_length], original_bits[:min_length]) 
                    if a == b
                )
                watermark_similarity = matching_bits / min_length
                bit_error_rate = 1 - watermark_similarity
            else:
                watermark_similarity = 0
                bit_error_rate = 1.0
            
            logger.debug(f"Watermark similarity: {watermark_similarity:.2%}")
            
            # Try to decrypt the extracted watermark
            aes_manager = AESManager()
            decryption_success = False
            decrypted_hash = ""
            
            try:
                if len(extracted_bytes) != len(watermark_record.encrypted_hash):
                    extracted_bytes = extracted_bytes[:len(watermark_record.encrypted_hash)]
                
                decrypted_bytes = aes_manager.decrypt(
                    extracted_bytes,
                    watermark_record.aes_iv_encrypted,
                    watermark_record.aes_key_encrypted
                )
                
                # Try to decode as UTF-8
                try:
                    decrypted_hash = decrypted_bytes.decode('utf-8').strip()
                    decryption_success = True
                    logger.debug(f"Successfully decrypted hash: {decrypted_hash[:20]}...")
                except UnicodeDecodeError:
                    decrypted_bytes = decrypted_bytes.rstrip(b'\x00')
                    decrypted_hash = decrypted_bytes.decode('utf-8')
                    decryption_success = True
                    
            except Exception as e:
                decryption_success = False
                logger.debug(f"Decryption failed: {e}")
            
            # Compute perceptual hash of the SUSPICIOUS image
            current_phash = PerceptualHasher.compute(img_array)
            
            # Compare with ORIGINAL perceptual hash
            original_phash = watermark_record.perceptual_hash
            hamming_distance = PerceptualHasher.hamming_distance(current_phash, original_phash)
            
            logger.debug(f"Hamming distance: {hamming_distance}")
            
            # DECISION LOGIC
            logger.info(f"Decision analysis - hamming: {hamming_distance}, watermark: {watermark_similarity:.2%}")
            
            # RULE 0: If visual is perfect BUT watermark is weak = TAMPERED!
            if hamming_distance == 0 and watermark_similarity < 0.7:
                status = "watermark_removed"
                confidence = "high"
                reason = "CRITICAL: Image looks identical but watermark has been damaged/removed (AI attack detected)"
            
            # RULE 1: Perfect match (BOTH visual AND watermark)
            elif hamming_distance == 0 and watermark_similarity > 0.85:
                status = "authentic"
                confidence = "very high"
                reason = "Perfect match with strong watermark"
            
            # RULE 2: Very similar with good watermark
            elif hamming_distance <= 3 and watermark_similarity > 0.8:
                status = "authentic"
                confidence = "high"
                reason = "Very similar with good watermark"
            
            # RULE 3: Successful decryption (gold standard)
            elif decryption_success and decrypted_hash == original_phash:
                status = "authentic"
                confidence = "certain"
                reason = "Watermark successfully decrypted"
            
            # RULE 4: Compression range
            elif hamming_distance <= 12:
                if watermark_similarity > 0.6:
                    status = "recompressed"
                    confidence = "medium"
                    reason = "Compression/resizing detected"
                else:
                    status = "tampered"
                    confidence = "high"
                    reason = "Compression with watermark damage"
            
            # RULE 5: Everything else = tampered
            else:
                status = "tampered"
                confidence = "high"
                reason = "Significant alterations detected"

            # Update record
            watermark_record.phash_distance = hamming_distance
            watermark_record.correlation_score = watermark_similarity
            watermark_record.save()
            
            # ========== CREATE VISUAL OVERLAY USING VisualOverlay CLASS ==========
            logger.info("Creating visual overlay...")
            
            overlay_available = False
            overlay_url = None
            comparison_url = None
            statistics = None
            
            try:
                # Create overlay directory
                overlay_dir = os.path.join(settings.MEDIA_ROOT, 'tamper_overlays')
                os.makedirs(overlay_dir, exist_ok=True)
                
                # Generate timestamp for unique filenames
                timestamp = int(time.time())
                
                # Save suspicious image temporarily
                suspicious_filename = f"suspicious_{timestamp}.png"
                suspicious_path = os.path.join(overlay_dir, suspicious_filename)
                
                suspicious_img = Image.fromarray(img_array)
                suspicious_img.save(suspicious_path)
                
                # Create overlay using VisualOverlay class
                overlay_filename = f"overlay_{timestamp}.png"
                overlay_path = os.path.join(overlay_dir, overlay_filename)
                
                overlay_result = VisualOverlay.create_tamper_overlay(
                    watermark_record.watermarked_image.path,
                    img_array,
                    overlay_path
                )
                
                statistics = overlay_result['statistics']
                
                # Create side-by-side comparison
                comparison_filename = f"comparison_{timestamp}.png"
                comparison_path = os.path.join(overlay_dir, comparison_filename)
                
                comparison_result = VisualOverlay.create_side_by_side(
                    watermark_record.watermarked_image.path,
                    img_array,
                    comparison_path
                )
                
                # Get URLs
                overlay_url = default_storage.url(f'tamper_overlays/{overlay_filename}')
                comparison_url = default_storage.url(f'tamper_overlays/{comparison_filename}')
                
                overlay_available = True
                logger.info(f"Overlay created successfully: {overlay_url}")
                logger.info(f"Comparison created: {comparison_url}")
                
                # Clean up temporary suspicious file
                if os.path.exists(suspicious_path):
                    os.remove(suspicious_path)
                
            except Exception as e:
                logger.error(f"Overlay creation failed: {e}")
                import traceback
                traceback.print_exc()
                overlay_available = False
            
            # ========== RETURN RESPONSE ==========
            response_data = {
                'verification': {
                    'status': status,
                    'confidence': confidence,
                    'reason': reason,
                },
                'metrics': {
                    'visual': {
                        'hamming_distance': int(hamming_distance),
                        'visual_similarity_percent': float(100 - (hamming_distance/64*100)),
                        'interpretation': PerceptualHasher.interpret_distance(hamming_distance)
                    },
                    'watermark': {
                        'similarity': float(watermark_similarity),
                        'bit_error_rate': float(bit_error_rate),
                        'decryption_success': decryption_success,
                        'decrypted_hash_match': decryption_success and (decrypted_hash == original_phash)
                    }
                },
                'hashes': {
                    'original_phash': original_phash,
                    'current_phash': current_phash,
                }
            }
            
            # Add visual analysis if available
            if overlay_available:
                response_data['visual_analysis'] = {
                    'overlay_url': overlay_url,
                    'comparison_url': comparison_url,
                    'statistics': statistics if statistics else {}
                }
            
            return JsonResponse(response_data)
            
        except WatermarkRecord.DoesNotExist:
            return JsonResponse({'error': 'Watermark record not found'}, status=404)
        except Exception as e:
            error_trace = traceback.format_exc()
            logger.error(f"ERROR in verify_watermark: {error_trace}")
            return JsonResponse({
                'error': 'Internal server error',
                'details': str(e)
            }, status=500)
    
    return JsonResponse({'error': 'Only POST method allowed'}, status=405)