import numpy as np
from scipy.fftpack import dct, idct
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from Crypto.Random import get_random_bytes
import pywt
from PIL import Image
import io
import json

class WatermarkEngine:
    def __init__(self, block_size=8, alpha=0.03):
        self.block_size = block_size
        self.alpha = alpha
        
    def rgb_to_ycbcr(self, image_array):
        """Convert RGB to YCbCr using optimized numpy operations"""
        R = image_array[:, :, 0].astype(np.float32)
        G = image_array[:, :, 1].astype(np.float32)
        B = image_array[:, :, 2].astype(np.float32)
        
        Y = 0.299 * R + 0.587 * G + 0.114 * B
        Cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B
        Cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B
        
        return np.stack([Y, Cb, Cr], axis=2).astype(np.uint8)
    
    def ycbcr_to_rgb(self, ycbcr_array):
        """Convert YCbCr back to RGB"""
        Y = ycbcr_array[:, :, 0].astype(np.float32)
        Cb = ycbcr_array[:, :, 1].astype(np.float32) - 128
        Cr = ycbcr_array[:, :, 2].astype(np.float32) - 128
        
        R = Y + 1.402 * Cr
        G = Y - 0.344136 * Cb - 0.714136 * Cr
        B = Y + 1.772 * Cb
        
        rgb = np.stack([R, G, B], axis=2)
        rgb = np.clip(rgb, 0, 255).astype(np.uint8)
        return rgb
    
    def embed_with_id(self, image_array, secret_data, watermark_id):
        """
        Embed watermark with ID included in the payload
        """
        # Create structured payload
        payload = {
            'watermark_id': str(watermark_id),
            'data': secret_data.hex() if isinstance(secret_data, bytes) else secret_data,
            'version': '1.0'
        }
        
        # Convert to bytes
        payload_bytes = json.dumps(payload).encode('utf-8')
        
        # Embed the structured payload
        return self.embed_watermark(image_array, payload_bytes)
    
    def extract_with_id(self, image_array, num_bits):
        """
        Extract watermark and try to parse structured payload
        """
        extracted_bits = self.extract_watermark(image_array, num_bits)
        extracted_bytes = self._bits_to_bytes(extracted_bits)
        
        try:
            # Try to parse as JSON
            payload_str = extracted_bytes.decode('utf-8', errors='ignore').strip('\x00')
            payload = json.loads(payload_str)
            
            if 'watermark_id' in payload and 'data' in payload:
                # Convert hex string back to bytes if needed
                data = payload['data']
                if isinstance(data, str):
                    try:
                        data = bytes.fromhex(data)
                    except:
                        data = data.encode('latin-1')
                
                return {
                    'success': True,
                    'watermark_id': int(payload['watermark_id']),
                    'data': data,
                    'full_payload': payload
                }
        except:
            pass
        
        # If structured parsing fails, return raw bytes
        return {
            'success': False,
            'raw_data': extracted_bytes
        }
    
    def embed_watermark(self, image_array, secret_data):
        """
        Embed secret data into image using DWT-DCT
        """
        # Convert to YCbCr
        ycbcr = self.rgb_to_ycbcr(image_array)
        Y, Cb, Cr = ycbcr[:, :, 0], ycbcr[:, :, 1], ycbcr[:, :, 2]
        
        # Apply DWT on Y channel
        coeffs = pywt.dwt2(Y.astype(np.float32), 'haar')
        LL, (LH, HL, HH) = coeffs
        
        # Convert secret data to bits
        bits = self._bytes_to_bits(secret_data)
        
        # Distribute bits between LH and HL
        mid_point = len(bits) // 2
        bits_lh = bits[:mid_point]
        bits_hl = bits[mid_point:mid_point*2]
        
        # Embed in subbands using vectorized operations
        watermarked_LH = self._embed_in_subband_vectorized(LH, bits_lh)
        watermarked_HL = self._embed_in_subband_vectorized(HL, bits_hl)
        
        # Inverse DWT
        watermarked_Y = pywt.idwt2(
            (LL, (watermarked_LH, watermarked_HL, HH)), 
            'haar'
        )
        
        # Ensure same dimensions
        watermarked_Y = np.clip(watermarked_Y, 0, 255).astype(np.uint8)
        watermarked_Y = watermarked_Y[:Y.shape[0], :Y.shape[1]]
        
        # Reconstruct image
        watermarked_ycbcr = np.stack([watermarked_Y, Cb, Cr], axis=2)
        watermarked_rgb = self.ycbcr_to_rgb(watermarked_ycbcr)
        
        return watermarked_rgb
    
    def extract_watermark(self, image_array, num_bits):
        """
        Extract watermark from image
        """
        # Convert to YCbCr
        ycbcr = self.rgb_to_ycbcr(image_array)
        Y = ycbcr[:, :, 0]
        
        # Apply DWT
        coeffs = pywt.dwt2(Y.astype(np.float32), 'haar')
        _, (LH, HL, _) = coeffs
        
        # Extract from both subbands
        bits_lh = self._extract_from_subband_vectorized(LH, num_bits//2)
        bits_hl = self._extract_from_subband_vectorized(HL, num_bits//2)
        
        # Combine bits
        extracted_bits = bits_lh + bits_hl
        
        return extracted_bits[:num_bits]
    
    def _embed_in_subband_vectorized(self, subband, bits):
        """Vectorized embedding for better performance"""
        height, width = subband.shape
        watermarked = subband.copy()
        
        # Calculate number of blocks
        num_blocks_h = (height - self.block_size) // self.block_size
        num_blocks_w = (width - self.block_size) // self.block_size
        total_blocks = num_blocks_h * num_blocks_w
        
        if total_blocks == 0:
            return watermarked
        
        # Process blocks in batches
        bit_index = 0
        for i in range(0, num_blocks_h * self.block_size, self.block_size):
            for j in range(0, num_blocks_w * self.block_size, self.block_size):
                if bit_index >= len(bits):
                    break
                
                block = subband[i:i+self.block_size, j:j+self.block_size]
                dct_block = dct(dct(block.T, norm='ortho').T, norm='ortho')
                
                # Modify coefficients
                if bits[bit_index] == 1:
                    if dct_block[2, 3] <= dct_block[3, 2]:
                        dct_block[2, 3] += self.alpha
                        dct_block[3, 2] -= self.alpha
                else:
                    if dct_block[2, 3] >= dct_block[3, 2]:
                        dct_block[2, 3] -= self.alpha
                        dct_block[3, 2] += self.alpha
                
                # Inverse DCT
                idct_block = idct(idct(dct_block.T, norm='ortho').T, norm='ortho')
                watermarked[i:i+self.block_size, j:j+self.block_size] = idct_block
                bit_index += 1
        
        return watermarked
    
    def _extract_from_subband_vectorized(self, subband, num_bits):
        """Vectorized extraction for better performance"""
        height, width = subband.shape
        extracted_bits = []
        
        # Calculate number of blocks
        num_blocks_h = (height - self.block_size) // self.block_size
        num_blocks_w = (width - self.block_size) // self.block_size
        
        if num_blocks_h == 0 or num_blocks_w == 0:
            return extracted_bits
        
        # Process blocks
        for i in range(0, num_blocks_h * self.block_size, self.block_size):
            for j in range(0, num_blocks_w * self.block_size, self.block_size):
                if len(extracted_bits) >= num_bits:
                    break
                
                block = subband[i:i+self.block_size, j:j+self.block_size]
                dct_block = dct(dct(block.T, norm='ortho').T, norm='ortho')
                
                # Compare coefficients
                if dct_block[2, 3] > dct_block[3, 2]:
                    extracted_bits.append(1)
                else:
                    extracted_bits.append(0)
        
        return extracted_bits
    
    # Original methods for backward compatibility
    def _embed_in_subband(self, subband, bits):
        """Embed bits into DCT of subband (original method)"""
        return self._embed_in_subband_vectorized(subband, bits)
    
    def _extract_from_subband(self, subband, num_bits):
        """Extract bits from DCT of subband (original method)"""
        return self._extract_from_subband_vectorized(subband, num_bits)
    
    # --- Utility Methods ---
    
    def _bytes_to_bits(self, data_bytes):
        """Convert bytes to list of bits"""
        bits = []
        for byte in data_bytes:
            for i in range(7, -1, -1):
                bits.append((byte >> i) & 1)
        return bits
    
    def _bits_to_bytes(self, bits):
        """Convert bits to bytes"""
        byte_array = bytearray()
        for i in range(0, len(bits), 8):
            byte = 0
            for j in range(8):
                if i + j < len(bits):
                    byte |= bits[i + j] << (7 - j)
            byte_array.append(byte)
        return bytes(byte_array)


class AESManager:
    """Handle AES encryption/decryption for watermark data"""
    
    def __init__(self, key=None):
        if key is None:
            self.key = get_random_bytes(32)  # AES-256
        else:
            self.key = key
    
    def encrypt(self, plaintext):
        """Encrypt data - always returns bytes"""
        if isinstance(plaintext, str):
            plaintext = plaintext.encode('utf-8')
        
        iv = get_random_bytes(16)
        cipher = AES.new(self.key, AES.MODE_CBC, iv)
        ciphertext = cipher.encrypt(pad(plaintext, AES.block_size))
        
        return {
            'ciphertext': ciphertext,
            'iv': iv,
            'key': self.key
        }
    
    def decrypt(self, ciphertext, iv, key):
        """Decrypt data - returns STRING, not bytes"""
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted = unpad(cipher.decrypt(ciphertext), AES.block_size)
        
        # Try to decode as UTF-8 string
        try:
            return decrypted.decode('utf-8').strip()
        except UnicodeDecodeError:
            # If it's not valid UTF-8, return as hex string
            return decrypted.hex()