from django.http import JsonResponse
from django.core.files.base import ContentFile
from django.conf import settings
from django.core.files.storage import default_storage
import json, uuid, traceback, os, time, logging

from imageapp.models import Image as ImageModel
from .models import WatermarkRecord
from django.contrib.auth.decorators import login_required
from reportapp.models import Report
from .utils.image_processor import ImageProcessor
from .utils.watermark_service import WatermarkService
from .utils.verification_logic import VerificationLogic
from .utils.response_builder import ResponseBuilder
from .utils.visual_overlay import VisualOverlay
from .utils.auto_detector import WatermarkAutoDetector
from .utils.helpers import validate_image_file
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

# Add this helper function
def safe_json_response(data, status=200):
    """Safely convert data to JSON, handling bytes and other non-serializable types"""
    import json as json_module
    
    def convert_for_json(obj):
        if isinstance(obj, bytes):
            return obj.hex()  # Convert bytes to hex string
        elif isinstance(obj, dict):
            return {k: convert_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, (list, tuple)):
            return [convert_for_json(item) for item in obj]
        elif hasattr(obj, '__dict__'):
            # Handle objects
            return convert_for_json(obj.__dict__)
        else:
            return obj
    
    try:
        # Try normal serialization first
        json_str = json_module.dumps(data)
        return JsonResponse(data, status=status, safe=False)
    except (TypeError, ValueError) as e:
        # If fails, convert problematic types
        safe_data = convert_for_json(data)
        return JsonResponse(safe_data, status=status, safe=False)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_watermark(request):
    """Apply watermark to an existing image from imageapp"""
    try:
        # Parse request data (JSON or form)
        data = request.data if hasattr(request, 'data') else (json.loads(request.body) if request.content_type == 'application/json' else request.POST.dict())

        image_id = data.get('image_id')
        if not image_id:
            return JsonResponse({'error': 'image_id is required'}, status=400)

        # Get original image (must belong to requesting user)
        original_image = _get_original_image(image_id, request.user)
        if isinstance(original_image, JsonResponse):
            return original_image

        # Load and process image
        image_array = _load_image_array(original_image.image.path)
        if isinstance(image_array, JsonResponse):
            return image_array

        # Create watermark record
        watermark_record = WatermarkRecord.objects.create(
            original_image=original_image,
            perceptual_hash="",  # Will be updated
            encrypted_hash=b"",
            aes_key_encrypted=b"",
            aes_iv_encrypted=b""
        )

        # Apply watermark
        watermark_service = WatermarkService()
        result = watermark_service.apply_watermark_to_image(image_array, watermark_record)

        if not result['success']:
            watermark_record.delete()
            return JsonResponse({'error': result['error']}, status=500)

        # Update watermark record with results
        watermark_record.perceptual_hash = result['phash']
        watermark_record.encrypted_hash = result['encrypted_data']['ciphertext']  # This is bytes
        watermark_record.aes_key_encrypted = result['encrypted_data']['key']  # This is bytes
        watermark_record.aes_iv_encrypted = result['encrypted_data']['iv']  # This is bytes

        # Save watermarked image
        watermarked_data = ImageProcessor.save_image_array(result['watermarked_array'], 'PNG')
        watermark_record.watermarked_image.save(
            f'watermarked_{original_image.ImageID}_{int(time.time())}.png',
            ContentFile(watermarked_data)
        )
        watermark_record.save()

        # Update original image status
        original_image.Status = 'protected'
        original_image.save()

        logger.info(f"Watermark applied successfully to image {image_id}")

        # Return response - Use safe_json_response
        response_data = ResponseBuilder.build_apply_response(watermark_record, original_image)
        return safe_json_response(response_data)

    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Error in apply_watermark: {error_trace}")
        return JsonResponse({'error': 'Internal server error', 'details': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_watermark(request):
    """Verify if a suspicious image matches the original watermark"""
    try:
        # If watermark_id/image_id provided, validate ownership first to avoid expensive image parsing
        watermark_id = request.POST.get('watermark_id') or request.data.get('watermark_id')
        image_id = request.POST.get('image_id') or request.data.get('image_id')
        if watermark_id or image_id:
            watermark_record = _get_watermark_record(watermark_id, image_id, request.user)
            if isinstance(watermark_record, JsonResponse):
                return watermark_record

        # Validate uploaded file
        uploaded_file = request.FILES.get('image')
        if not uploaded_file:
            return JsonResponse({'error': 'Image file is required for verification.'}, status=400)

        validate_image_file(uploaded_file)

        # Load suspicious image
        suspicious_array = ImageProcessor.process_uploaded_image(uploaded_file)

        # If watermark_record wasn't resolved earlier, try now (no ownership check requested)
        if not (watermark_id or image_id):
            watermark_id = None
            image_id = None
            watermark_record = _get_watermark_record(watermark_id, image_id)
            if isinstance(watermark_record, JsonResponse):
                return watermark_record

        # Verify watermark
        watermark_service = WatermarkService()
        verification_result = watermark_service.extract_and_verify(suspicious_array, watermark_record)

        if not verification_result['success']:
            return JsonResponse({'error': verification_result['error']}, status=500)

        # Determine status
        status, confidence, reason = VerificationLogic.determine_status(
            verification_result['hamming_distance'],
            verification_result['watermark_similarity'],
            verification_result['decryption_success'],
            verification_result['decrypted_hash'],
            watermark_record.perceptual_hash
        )

        # Update record
        watermark_record.phash_distance = verification_result['hamming_distance']
        watermark_record.correlation_score = verification_result['watermark_similarity']
        watermark_record.save()

        # Create visual overlay (optional)
        overlay_url, comparison_url, statistics = _create_visual_overlay(
            watermark_record.watermarked_image.path,
            suspicious_array
        )

        # Build response
        response_data = ResponseBuilder.build_verification_response(
            status, confidence, reason,
            verification_result['hamming_distance'],
            verification_result['watermark_similarity'],
            verification_result['decryption_success'],
            verification_result['decrypted_hash'] == watermark_record.perceptual_hash,
            watermark_record.perceptual_hash,
            verification_result['current_phash'],
            overlay_url, comparison_url, statistics
        )

        # Continue to create/update Report and attach images/metrics
        # (existing logic below)
        # --- Create or update Report linking original image + suspicious image + overlay ---
        try:
            report = Report.objects.filter(image=watermark_record.original_image).first()
            if not report:
                report = Report.objects.create(
                    user=watermark_record.original_image.user,
                    image=watermark_record.original_image,
                    score=0,
                    watermark_status=('Valid' if verification_result.get('decryption_success') else 'Invalid'),
                    status=response_data.get('verification', {}).get('status', ''),
                    notes=response_data.get('verification', {}).get('reason', ''),
                    metadata=(watermark_record.original_image.metadata if hasattr(watermark_record.original_image, 'metadata') else {})
                )

            # Save suspicious (uploaded) image to report.suspicious_image
            try:
                uploaded_file.seek(0)
                filename = uploaded_file.name or f"sus_{watermark_record.original_image.ImageID}_{int(time.time())}.png"
                report.suspicious_image.save(
                    filename,
                    ContentFile(uploaded_file.read())
                )
                report.suspicious_metadata = {
                    'filename': filename,
                    'size': report.suspicious_image.size if hasattr(report.suspicious_image, 'size') else uploaded_file.size,
                }
            except Exception:
                logger.exception('Failed saving suspicious image to report')

            # Attach overlay image (if available)
            try:
                if overlay_url:
                    overlay_rel = overlay_url.split(settings.MEDIA_URL)[-1]
                    overlay_path = os.path.join(settings.MEDIA_ROOT, overlay_rel)
                    if os.path.exists(overlay_path):
                        # Do not create a duplicate copy; point field to existing relative path
                        try:
                            rel = os.path.relpath(overlay_path, settings.MEDIA_ROOT).replace(os.sep, '/')
                            report.heatmap_image = rel
                            report.save()
                        except Exception:
                            # Fallback to copying if assignment fails
                            with open(overlay_path, 'rb') as f:
                                report.heatmap_image.save(os.path.basename(overlay_path), ContentFile(f.read()))
                    else:
                        # Fallback: try to locate overlay by scanning preferred dirs (reports/heatmap then tamper_overlays)
                        preferred_dirs = [os.path.join(settings.MEDIA_ROOT, 'reports', 'heatmap'), os.path.join(settings.MEDIA_ROOT, 'tamper_overlays')]
                        for overlay_dir in preferred_dirs:
                            if os.path.isdir(overlay_dir):
                                candidates = [f for f in os.listdir(overlay_dir) if f.startswith('overlay_') or f.startswith('comparison_')]
                                if candidates:
                                    candidates.sort(key=lambda fn: os.path.getmtime(os.path.join(overlay_dir, fn)), reverse=True)
                                    chosen = candidates[0]
                                    chosen_path = os.path.join(overlay_dir, chosen)
                                    # Move chosen file into reports/heatmap if it is in tamper_overlays and not already in reports/heatmap
                                    try:
                                        dst_dir = os.path.join(settings.MEDIA_ROOT, 'reports', 'heatmap')
                                        os.makedirs(dst_dir, exist_ok=True)
                                        dst_path = os.path.join(dst_dir, chosen)
                                        if os.path.abspath(chosen_path) != os.path.abspath(dst_path):
                                            # move to canonical location
                                            import shutil
                                            if not os.path.exists(dst_path):
                                                shutil.move(chosen_path, dst_path)
                                            else:
                                                # remove source if exists to avoid duplicates
                                                try:
                                                    os.remove(chosen_path)
                                                except Exception:
                                                    pass
                                            rel = os.path.relpath(dst_path, settings.MEDIA_ROOT).replace(os.sep, '/')
                                        else:
                                            rel = os.path.relpath(chosen_path, settings.MEDIA_ROOT).replace(os.sep, '/')
                                        report.heatmap_image = rel
                                        report.save()
                                    except Exception:
                                        # fallback: copy if move/assign fails
                                        with open(chosen_path, 'rb') as f:
                                            report.heatmap_image.save(chosen, ContentFile(f.read()))
                                    break
            except Exception:
                logger.exception('Failed attaching overlay to report')

            # Store verification metrics (including visual statistics if available)
            report.verification_metrics = {
                'hamming_distance': int(verification_result.get('hamming_distance', -1)),
                'watermark_similarity': float(verification_result.get('watermark_similarity', 0)),
                'decryption_success': bool(verification_result.get('decryption_success', False)),
                'current_phash': verification_result.get('current_phash'),
                'visual_statistics': statistics or {},
                'overlay_url': overlay_url,
                'comparison_url': comparison_url
            }
            report.verification_status = response_data.get('verification', {}).get('status', '')
            report.watermark_record = watermark_record
            report.save()
        except Exception:
            logger.exception('Failed to create/update Report from verification')

        # Enrich response with report pointers if available
        try:
            if report:
                response_data['report_id'] = str(report.report_id)
                if report.suspicious_image:
                    response_data['suspicious_image_url'] = report.suspicious_image.url
                if report.heatmap_image:
                    response_data['heatmap_image_url'] = report.heatmap_image.url
        except Exception:
            pass

        # Use safe_json_response
        return safe_json_response(response_data)

    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"ERROR in verify_watermark: {error_trace}")
        return JsonResponse({'error': 'Internal server error', 'details': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_verify_watermark(request):
    """Automatically detect and verify watermark without requiring watermark_id"""
    try:
        # Validate and load image
        uploaded_file = request.FILES.get('image')
        if not uploaded_file:
            return JsonResponse({'error': 'Image file is required for verification.'}, status=400)

        validate_image_file(uploaded_file)
        suspicious_array = ImageProcessor.process_uploaded_image(uploaded_file)

        # Auto-detect watermark
        detector = WatermarkAutoDetector()
        detection_result = detector.auto_detect(suspicious_array)

        if not detection_result['watermark_id']:
            return safe_json_response({
                'status': 'no_watermark_detected',
                'message': 'Could not identify the source image automatically.',
                'suggestions': [
                    'Try uploading a clearer version',
                    'The image may not be watermarked',
                    'Try manual verification with watermark_id'
                ],
                'detection_details': detection_result
            }, status=200)

        # Get watermark record and ensure it belongs to user
        try:
            watermark_record = WatermarkRecord.objects.get(id=detection_result['watermark_id'])
            if watermark_record.original_image.user != request.user:
                return JsonResponse({'error': 'Detected watermark does not belong to you'}, status=403)
        except WatermarkRecord.DoesNotExist:
            return JsonResponse({
                'error': f'Detected watermark ID {detection_result["watermark_id"]} not found in database'
            }, status=404)

        # Verify watermark (reuse the same logic as verify_watermark)
        watermark_service = WatermarkService()
        verification_result = watermark_service.extract_and_verify(suspicious_array, watermark_record)

        if not verification_result['success']:
            return JsonResponse({'error': verification_result['error']}, status=500)

        # Determine status
        status, confidence, reason = VerificationLogic.determine_status(
            verification_result['hamming_distance'],
            verification_result['watermark_similarity'],
            verification_result['decryption_success'],
            verification_result['decrypted_hash'],
            watermark_record.perceptual_hash
        )

        # Update record
        watermark_record.phash_distance = verification_result['hamming_distance']
        watermark_record.correlation_score = verification_result['watermark_similarity']
        watermark_record.save()

        # Create visual overlay (optional)
        overlay_url, _, statistics = _create_visual_overlay(
            watermark_record.watermarked_image.path,
            suspicious_array
        )

        # Build verification response
        verification_response = {
            'verification': {'status': status, 'confidence': confidence, 'reason': reason},
            'metrics': {
                'visual': {'hamming_distance': int(verification_result['hamming_distance'])},
                'watermark': {'similarity': float(verification_result['watermark_similarity'])}
            },
            'hashes': {
                'original_phash': watermark_record.perceptual_hash,
                'current_phash': verification_result['current_phash']
            },
            'statistics': statistics
        }

        # Build auto-detection response
        response_data = ResponseBuilder.build_auto_detection_response(
            detection_result, verification_response, overlay_url
        )

        # Create/update Report similar to verify flow
        try:
            report = Report.objects.filter(image=watermark_record.original_image).first()
            if not report:
                report = Report.objects.create(
                    user=watermark_record.original_image.user,
                    image=watermark_record.original_image,
                    score=0,
                    watermark_status=('Valid' if verification_result.get('decryption_success') else 'Invalid'),
                    status=verification_response.get('verification', {}).get('status', ''),
                    notes=verification_response.get('verification', {}).get('reason', ''),
                    metadata=(watermark_record.original_image.metadata if hasattr(watermark_record.original_image, 'metadata') else {})
                )

            # Save suspicious (uploaded) image to report.suspicious_image
            try:
                uploaded_file.seek(0)
                filename = uploaded_file.name or f"sus_{watermark_record.original_image.ImageID}_{int(time.time())}.png"
                report.suspicious_image.save(
                    filename,
                    ContentFile(uploaded_file.read())
                )
                report.suspicious_metadata = {
                    'filename': filename,
                    'size': report.suspicious_image.size if hasattr(report.suspicious_image, 'size') else uploaded_file.size,
                }
            except Exception:
                logger.exception('Failed saving suspicious image to report')

            # Attach overlay image (if available)
            try:
                if overlay_url:
                    overlay_rel = overlay_url.split(settings.MEDIA_URL)[-1]
                    overlay_path = os.path.join(settings.MEDIA_ROOT, overlay_rel)
                    if os.path.exists(overlay_path):
                        with open(overlay_path, 'rb') as f:
                            report.heatmap_image.save(os.path.basename(overlay_path), ContentFile(f.read()))
                    else:
                        # fallback: look for latest overlay in reports/heatmap then tamper_overlays
                        preferred_dirs = [os.path.join(settings.MEDIA_ROOT, 'reports', 'heatmap'), os.path.join(settings.MEDIA_ROOT, 'tamper_overlays')]
                        for overlay_dir in preferred_dirs:
                            if os.path.isdir(overlay_dir):
                                candidates = [f for f in os.listdir(overlay_dir) if f.startswith('overlay_') or f.startswith('comparison_')]
                                if candidates:
                                    candidates.sort(key=lambda fn: os.path.getmtime(os.path.join(overlay_dir, fn)), reverse=True)
                                    chosen = candidates[0]
                                    chosen_path = os.path.join(overlay_dir, chosen)
                                    with open(chosen_path, 'rb') as f:
                                        report.heatmap_image.save(chosen, ContentFile(f.read()))
                                    break
            except Exception:
                logger.exception('Failed attaching overlay to report')

            # Store verification metrics (including visual statistics if available)
            report.verification_metrics = {
                'hamming_distance': verification_response.get('metrics', {}).get('visual', {}).get('hamming_distance'),
                'watermark_similarity': verification_response.get('metrics', {}).get('watermark', {}).get('similarity'),
                'visual_statistics': verification_response.get('statistics', {}),
                'overlay_url': overlay_url
            }
            report.verification_status = verification_response.get('verification', {}).get('status', '')
            report.watermark_record = watermark_record
            report.save()
        except Exception:
            logger.exception('Failed to create/update Report from auto verification')

        # Enrich response with report pointers if available
        try:
            if report:
                response_data['report_id'] = str(report.report_id)
                if report.suspicious_image:
                    response_data['suspicious_image_url'] = report.suspicious_image.url
                if report.heatmap_image:
                    response_data['heatmap_image_url'] = report.heatmap_image.url
        except Exception:
            pass

        # Use safe_json_response
        return safe_json_response(response_data)

    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=400)
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"ERROR in auto_verify_watermark: {error_trace}")
        return JsonResponse({'error': 'Internal server error', 'details': str(e)}, status=500)

# Helper functions (keep as is, but update returns)
def _get_original_image(image_id, user=None):
    """Get original image by ID and optionally enforce ownership by `user`"""
    try:
        if isinstance(image_id, str):
            image_uuid = uuid.UUID(image_id)
        else:
            image_uuid = image_id

        img = ImageModel.objects.get(ImageID=image_uuid)
        if user and img.user != user:
            return JsonResponse({'error': 'Access denied for this image'}, status=403)
        return img
    except ValueError:
        available_images = ImageModel.objects.all()[:5]
        available_ids = [str(img.ImageID) for img in available_images]
        return JsonResponse({
            'error': f'Invalid image_id format: {image_id}',
            'available_images': available_ids
        }, status=400)
    except ImageModel.DoesNotExist:
        available_images = ImageModel.objects.all()[:5]
        available_ids = [str(img.ImageID) for img in available_images]
        return JsonResponse({
            'error': f'Image with ID {image_id} not found',
            'available_images': available_ids
        }, status=404)

def _load_image_array(image_path):
    """Load image array from path"""
    try:
        return ImageProcessor.load_and_validate_image(image_path)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

def _get_watermark_record(watermark_id, image_id, user=None):
    """Get watermark record by ID or image ID"""
    if watermark_id:
        try:
            record = WatermarkRecord.objects.get(id=watermark_id)
            if user and record.original_image.user != user:
                return JsonResponse({'error': 'Access denied for this watermark record'}, status=403)
            return record
        except WatermarkRecord.DoesNotExist:
            return JsonResponse({'error': f'Watermark record with ID {watermark_id} not found'}, status=404)
    elif image_id:
        try:
            if isinstance(image_id, str):
                image_uuid = uuid.UUID(image_id)
            else:
                image_uuid = image_id
            # Filter by requesting user if provided
            qs = WatermarkRecord.objects.filter(original_image__ImageID=image_uuid)
            if user:
                qs = qs.filter(original_image__user=user)
            record = qs.first()
            if not record:
                return JsonResponse({'error': f'No watermark found for image ID {image_id}'}, status=404)
            return record
        except ValueError:
            return JsonResponse({'error': f'Invalid image_id format: {image_id}'}, status=400)
    else:
        return JsonResponse({'error': 'Either watermark_id or image_id is required'}, status=400)

def _create_visual_overlay(original_path, suspicious_array):
    """Create visual overlay for tampering detection"""
    try:
        timestamp = int(time.time())
        # Store overlays under reports/heatmap to have a canonical location for report images
        overlay_dir = os.path.join(settings.MEDIA_ROOT, 'reports', 'heatmap')
        os.makedirs(overlay_dir, exist_ok=True)
        
        overlay_filename = f"overlay_{timestamp}.png"
        overlay_path = os.path.join(overlay_dir, overlay_filename)
        
        overlay_result = VisualOverlay.create_tamper_overlay(
            original_path, suspicious_array, overlay_path
        )
        
        overlay_url = default_storage.url(f'reports/heatmap/{overlay_filename}')
        
        # Also create comparison
        comparison_filename = f"comparison_{timestamp}.png"
        comparison_path = os.path.join(overlay_dir, comparison_filename)
        
        VisualOverlay.create_side_by_side(
            original_path, suspicious_array, comparison_path
        )
        
        comparison_url = default_storage.url(f'reports/heatmap/{comparison_filename}')
        
        return overlay_url, comparison_url, overlay_result.get('statistics')
    except Exception as e:
        logger.error(f"Overlay creation failed: {e}")
        return None, None, None