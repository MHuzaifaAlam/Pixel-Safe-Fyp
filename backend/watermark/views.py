from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.base import ContentFile
import json
import numpy as np
from PIL import Image
import io
import uuid
import traceback

from imageapp.models import Image as ImageModel
from .models import WatermarkRecord
from .utils.watermark_engine import WatermarkEngine, AESManager
from .utils.phash import PerceptualHasher


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
            # MUST have an uploaded image to verify
            if not request.FILES.get('image'):
                return JsonResponse({
                    'error': 'Image file is required for verification. Upload the suspicious image.'
                }, status=400)
            
            # Get the uploaded suspicious image
            uploaded_file = request.FILES['image']
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
            
            # Get watermark record ID from form data
            watermark_id = request.POST.get('watermark_id')
            image_id = request.POST.get('image_id')
            
            if not watermark_id and not image_id:
                return JsonResponse({
                    'error': 'Either watermark_id or image_id is required to identify which watermark to check against'
                }, status=400)
            
            # Get the watermark record (contains original watermark data)
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
            
            # Extract watermark from the SUSPICIOUS uploaded image
            watermark_engine = WatermarkEngine()
            num_bits = len(watermark_record.encrypted_hash) * 8
            
            print(f"DEBUG: Extracting {num_bits} bits from suspicious image...")
            extracted_bits = watermark_engine.extract_watermark(img_array, num_bits)
            extracted_bytes = watermark_engine._bits_to_bytes(extracted_bits)
            
            # Get original watermark bits for comparison
            original_bits = watermark_engine._bytes_to_bits(watermark_record.encrypted_hash)
            
            # Calculate watermark similarity (bit-by-bit comparison)
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
            
            print(f"DEBUG: Watermark similarity: {watermark_similarity:.2%}")
            
            # Try to decrypt the extracted watermark
            aes_manager = AESManager()
            decryption_success = False
            decrypted_hash = ""
            
            try:
                # Ensure correct length for decryption
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
                    print(f"DEBUG: Successfully decrypted hash: {decrypted_hash[:20]}...")
                except UnicodeDecodeError:
                    # Remove padding and try again
                    decrypted_bytes = decrypted_bytes.rstrip(b'\x00')
                    decrypted_hash = decrypted_bytes.decode('utf-8')
                    decryption_success = True
                    
            except Exception as e:
                decryption_success = False
                print(f"DEBUG: Decryption failed: {e}")
            
            # Compute perceptual hash of the SUSPICIOUS image
            current_phash = PerceptualHasher.compute(img_array)
            
            # Compare with ORIGINAL perceptual hash
            original_phash = watermark_record.perceptual_hash
            hamming_distance = PerceptualHasher.hamming_distance(current_phash, original_phash)
            
            print(f"DEBUG: Hamming distance: {hamming_distance}")
            
                        # DECISION LOGIC:
            # FIXED DECISION LOGIC - MUST CHECK BOTH!
            
            print(f"\n=== DECISION ANALYSIS ===")
            print(f"hamming_distance: {hamming_distance}")
            print(f"watermark_similarity: {watermark_similarity:.2%}")
            print(f"Expected: If hamming=0 AND watermark>80% = authentic")
            print(f"Your case: hamming=0 BUT watermark={watermark_similarity:.2%} = ???")
            
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

            #-------------------------------------
            
            #-------------------------------------

            # Update record (optional)
            watermark_record.phash_distance = hamming_distance
            watermark_record.correlation_score = watermark_similarity
            watermark_record.save()
            
            return JsonResponse({
                'status': status,
                'confidence': confidence,
                'reason': reason,
                'watermark_similarity': float(watermark_similarity),
                'bit_error_rate': float(bit_error_rate),
                'decryption_success': decryption_success,
                'decrypted_hash_match': decryption_success and (decrypted_hash == original_phash),
                'metrics': {
                    'hamming_distance': int(hamming_distance),
                    'original_phash': original_phash,
                    'current_phash': current_phash,
                }
            })
            
        except WatermarkRecord.DoesNotExist:
            return JsonResponse({'error': 'Watermark record not found'}, status=404)
        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"ERROR in verify_watermark: {error_trace}")
            return JsonResponse({
                'error': 'Internal server error',
                'details': str(e)
            }, status=500)
    
    return JsonResponse({'error': 'Only POST method allowed'}, status=405)
