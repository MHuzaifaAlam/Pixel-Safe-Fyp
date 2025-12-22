class VerificationLogic:
    @staticmethod
    def determine_status(hamming_distance, watermark_similarity, decryption_success, decrypted_hash, original_phash):
        """Determine verification status based on metrics"""
        
        # RULE 0: If visual is perfect BUT watermark is weak = TAMPERED!
        if hamming_distance == 0 and watermark_similarity < 0.7:
            return "watermark_removed", "high", "CRITICAL: Image looks identical but watermark has been damaged/removed (AI attack detected)"
        
        # RULE 1: Perfect match (BOTH visual AND watermark)
        elif hamming_distance == 0 and watermark_similarity > 0.85:
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