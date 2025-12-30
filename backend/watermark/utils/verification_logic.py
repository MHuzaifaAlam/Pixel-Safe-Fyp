class VerificationLogic:
    @staticmethod
    def determine_status(hamming_distance, watermark_similarity, decryption_success, decrypted_hash, original_phash, source_platform=None):
        """Determine verification status based on metrics"""
        
        # Determine threshold based on source platform
        # Social media platforms compress images, so we use a relaxed threshold
        # Direct uploads should maintain strict security
        if source_platform and source_platform not in ['unknown', '', None]:
            # Extension from social media - relaxed threshold for compression tolerance
            base_threshold = 0.58
        else:
            # Direct upload via webpage - strict threshold
            base_threshold = 0.65
        
        # RULE 0: Perfect visual match - check watermark strength
        # When hamming_distance is 0, the images are identical
        # ~50% watermark similarity = random noise (NO watermark), need >threshold to confirm presence
        if hamming_distance == 0:
            if watermark_similarity >= base_threshold:  # Strong evidence of watermark
                return "authentic", "very high", "Perfect visual match with watermark present"
            else:
                # Low watermark similarity = watermark missing/removed (could be original non-watermarked image)
                return "watermark_removed", "high", "CRITICAL: Image looks identical but watermark is missing or damaged"
        
        # RULE 1: Strong match (BOTH visual AND watermark)
        elif hamming_distance <= 3 and watermark_similarity > 0.85:
            return "authentic", "very high", "Perfect match with strong watermark"
        
        # RULE 2: Very similar with good watermark
        elif hamming_distance <= 3 and watermark_similarity > 0.8:
            return "authentic", "high", "Very similar with good watermark"
        
        # RULE 3: Successful decryption (gold standard)
        elif decryption_success and decrypted_hash == original_phash:
            return "authentic", "certain", "Watermark successfully decrypted"
        
        # RULE 4: Compression range
        elif hamming_distance <= 12:
            if watermark_similarity > 0.6:
                return "recompressed", "medium", "Compression/resizing detected"
            else:
                return "tampered", "high", "Compression with watermark damage"
        
        # RULE 5: Everything else = tampered
        else:
            return "tampered", "high", "Significant alterations detected"