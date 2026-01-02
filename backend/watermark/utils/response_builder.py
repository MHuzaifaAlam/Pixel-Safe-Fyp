class ResponseBuilder:
    @staticmethod
    def build_apply_response(watermark_record, original_image):
        """Build response for apply_watermark"""
        return {
            'status': 'success',
            'message': 'Watermark applied successfully',
            'watermark_id': watermark_record.id,
            'original_image_id': str(original_image.ImageID),
            'original_filename': original_image.fileName,
            'watermarked_image_url': watermark_record.watermarked_image.url
        }
    
    @staticmethod
    def build_verification_response(
        status, confidence, reason, 
        hamming_distance, watermark_similarity, 
        decryption_success, decrypted_hash_match,
        original_phash, current_phash,
        overlay_url=None, comparison_url=None, statistics=None
    ):
        """Build response for verify_watermark"""
        response = {
            'verification': {
                'status': status,
                'confidence': confidence,
                'reason': reason,
            },
            'metrics': {
                'visual': {
                    'hamming_distance': int(hamming_distance),
                    'visual_similarity_percent': float(100 - (hamming_distance/64*100)),
                },
                'watermark': {
                    'similarity': float(watermark_similarity),
                    'bit_error_rate': float(1 - watermark_similarity),
                    'decryption_success': decryption_success,
                    'decrypted_hash_match': decrypted_hash_match
                }
            },
            'hashes': {
                'original_phash': original_phash,
                'current_phash': current_phash,
            }
        }
        
        if overlay_url:
            response['visual_analysis'] = {
                'overlay_url': overlay_url,
                'comparison_url': comparison_url if comparison_url else '',
                'statistics': statistics if statistics else {}
            }
        
        return response
    
    @staticmethod
    def build_auto_detection_response(detection_result, verification_result, overlay_url=None, comparison_url=None):
        """Build response for auto_verify_watermark"""
        response = {
            'auto_detection': {
                'success': True,
                'detected_watermark_id': detection_result.get('watermark_id'),
                'detection_method': detection_result.get('detection_method', 'unknown'),
                'detection_confidence': detection_result.get('confidence', 'low'),
                'original_filename': verification_result.get('original_filename', 'Unknown'),
                'original_image_id': verification_result.get('original_image_id', '')
            },
            'verification': verification_result['verification'],
            'metrics': verification_result['metrics'],
            'hashes': verification_result['hashes']
        }
        
        if overlay_url or comparison_url:
            response['visual_analysis'] = {
                'tampering_overlay': overlay_url,
                'comparison_url': comparison_url if comparison_url else '',
                'statistics': verification_result.get('statistics', {})
            }
        
        return response