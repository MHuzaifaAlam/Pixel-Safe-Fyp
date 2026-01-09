import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os
import cv2

class VisualOverlay:
    @staticmethod
    def create_tamper_overlay(original_path, suspicious_array, output_path):
        """
        Create an overlay on the suspicious image showing tampered areas
        """
        try:
            # Load original watermarked image
            original_img = Image.open(original_path)
            original_array = np.array(original_img)
            
            # Ensure suspicious_array is numpy array
            if not isinstance(suspicious_array, np.ndarray):
                suspicious_array = np.array(suspicious_array)
            
            # Ensure same dimensions
            if original_array.shape != suspicious_array.shape:
                h, w = original_array.shape[:2]
                suspicious_array = cv2.resize(suspicious_array, (w, h))
            
            # Convert to float for precise calculations
            orig_float = original_array.astype(np.float32)
            susp_float = suspicious_array.astype(np.float32)
            
            # Vectorized difference calculation
            if len(orig_float.shape) == 3:  # RGB image
                diff_r = np.abs(orig_float[:,:,0] - susp_float[:,:,0])
                diff_g = np.abs(orig_float[:,:,1] - susp_float[:,:,1])
                diff_b = np.abs(orig_float[:,:,2] - susp_float[:,:,2])
                diff = (diff_r + diff_g + diff_b) / 3.0
            else:  # Grayscale
                diff = np.abs(orig_float - susp_float)
            
            # Normalize to 0-1 range
            if diff.max() > 0:
                diff_normalized = diff / 255.0
            else:
                diff_normalized = diff
            
            # Create the overlay image (start with suspicious image)
            overlay_image = suspicious_array.copy()
            
            # Vectorized color overlay application
            if len(overlay_image.shape) == 3:
                # Create masks for different severity levels
                heavy_mask = diff_normalized > 0.7
                medium_mask = (diff_normalized > 0.4) & (diff_normalized <= 0.7)
                light_mask = (diff_normalized > 0.2) & (diff_normalized <= 0.4)
                very_light_mask = (diff_normalized > 0.05) & (diff_normalized <= 0.2)
                
                # Apply overlays with vectorized operations
                overlay_image[heavy_mask] = (
                    overlay_image[heavy_mask] * 0.2 + 
                    np.array([200, 0, 0]) * 0.8
                ).astype(np.uint8)
                
                overlay_image[medium_mask] = (
                    overlay_image[medium_mask] * 0.4 + 
                    np.array([255, 0, 0]) * 0.6
                ).astype(np.uint8)
                
                overlay_image[light_mask] = (
                    overlay_image[light_mask] * 0.6 + 
                    np.array([255, 165, 0]) * 0.4
                ).astype(np.uint8)
                
                overlay_image[very_light_mask] = (
                    overlay_image[very_light_mask] * 0.8 + 
                    np.array([255, 255, 0]) * 0.2
                ).astype(np.uint8)
            else:
                # Grayscale version
                heavy_mask = diff_normalized > 0.7
                medium_mask = (diff_normalized > 0.4) & (diff_normalized <= 0.7)
                light_mask = (diff_normalized > 0.2) & (diff_normalized <= 0.4)
                very_light_mask = (diff_normalized > 0.05) & (diff_normalized <= 0.2)
                
                overlay_image[heavy_mask] = (overlay_image[heavy_mask] * 0.2).astype(np.uint8)
                overlay_image[medium_mask] = (overlay_image[medium_mask] * 0.4).astype(np.uint8)
                overlay_image[light_mask] = (overlay_image[light_mask] * 0.6).astype(np.uint8)
                overlay_image[very_light_mask] = (overlay_image[very_light_mask] * 0.8).astype(np.uint8)
            
            # Convert back to PIL Image
            overlay_pil = Image.fromarray(overlay_image.astype(np.uint8))
            
            # Add legend
            overlay_with_legend = VisualOverlay._add_legend(overlay_pil, diff_normalized)
            
            overlay_with_legend.save(output_path)
            
            # Calculate statistics
            stats = VisualOverlay._calculate_statistics(diff_normalized)
            
            return {
                'overlay_path': output_path,
                'statistics': stats
            }
            
        except Exception as e:
            raise Exception(f"Overlay creation failed: {str(e)}")
    
    @staticmethod
    def _add_legend(image, diff_normalized):
        """Add color legend to the image"""
        img_width, img_height = image.size
        legend_height = 120
        new_height = img_height + legend_height
        
        new_image = Image.new('RGB', (img_width, new_height), color='white')
        new_image.paste(image, (0, 0))
        
        draw = ImageDraw.Draw(new_image)
        
        try:
            font = ImageFont.truetype("arial.ttf", 14)
            font_small = ImageFont.truetype("arial.ttf", 12)
        except:
            font = ImageFont.load_default()
            font_small = font
        
        # Calculate statistics
        heavy = (diff_normalized > 0.7).sum() / diff_normalized.size * 100
        medium = ((diff_normalized > 0.4) & (diff_normalized <= 0.7)).sum() / diff_normalized.size * 100
        light = ((diff_normalized > 0.2) & (diff_normalized <= 0.4)).sum() / diff_normalized.size * 100
        very_light = ((diff_normalized > 0.05) & (diff_normalized <= 0.2)).sum() / diff_normalized.size * 100
        none = (diff_normalized <= 0.05).sum() / diff_normalized.size * 100
        
        # Draw color boxes
        colors = [
            ((200, 0, 0), f"Heavy: {heavy:.1f}%"),
            ((255, 0, 0), f"Medium: {medium:.1f}%"),
            ((255, 165, 0), f"Light: {light:.1f}%"),
            ((255, 255, 0), f"Very Light: {very_light:.1f}%"),
            ((255, 255, 255), f"Untouched: {none:.1f}%")
        ]
        
        box_size = 20
        padding = 10
        x_offset = padding
        
        for color, text in colors:
            draw.rectangle([x_offset, img_height + padding, 
                           x_offset + box_size, img_height + padding + box_size], 
                         fill=color, outline='black')
            
            draw.text((x_offset + box_size + 5, img_height + padding + 5), 
                     text, fill='black', font=font_small)
            
            text_width = draw.textlength(text, font=font_small)
            x_offset += box_size + 5 + text_width + 20
        
        title = "TAMPERING VISUALIZATION - Color indicates tampering severity"
        title_width = draw.textlength(title, font=font)
        draw.text((img_width//2 - title_width//2, 
                  img_height + padding + box_size + 20), 
                 title, fill='darkred', font=font)
        
        overall_tampered = 100 - none
        tamper_text = f"Overall Tampered: {overall_tampered:.1f}%"
        tamper_width = draw.textlength(tamper_text, font=font)
        draw.text((img_width//2 - tamper_width//2, 
                  img_height + padding + box_size + 45), 
                 tamper_text, fill='black', font=font)
        
        return new_image
    
    @staticmethod
    def _calculate_statistics(diff_normalized):
        """Calculate detailed tampering statistics"""
        return {
            'heavy_tampering_percent': float((diff_normalized > 0.7).sum() / diff_normalized.size * 100),
            'medium_tampering_percent': float(((diff_normalized > 0.4) & (diff_normalized <= 0.7)).sum() / diff_normalized.size * 100),
            'light_tampering_percent': float(((diff_normalized > 0.2) & (diff_normalized <= 0.4)).sum() / diff_normalized.size * 100),
            'very_light_tampering_percent': float(((diff_normalized > 0.05) & (diff_normalized <= 0.2)).sum() / diff_normalized.size * 100),
            'unchanged_percent': float((diff_normalized <= 0.05).sum() / diff_normalized.size * 100),
            'overall_tampered': float(100 - ((diff_normalized <= 0.05).sum() / diff_normalized.size * 100)),
            'max_change': float(diff_normalized.max()),
            'mean_change': float(diff_normalized.mean())
        }
    
    @staticmethod
    def create_side_by_side(original_path, suspicious_array, output_path):
        """
        Create side-by-side comparison: Original | Suspicious | Overlay
        """
        try:
            # Load original
            original_img = Image.open(original_path)
            
            # Convert suspicious array to PIL
            if isinstance(suspicious_array, np.ndarray):
                suspicious_img = Image.fromarray(suspicious_array.astype(np.uint8))
            else:
                suspicious_img = suspicious_array
            
            # Resize to same dimensions if needed
            if original_img.size != suspicious_img.size:
                suspicious_img = suspicious_img.resize(original_img.size, Image.Resampling.LANCZOS)
            
            # Create temp directory for overlay
            temp_dir = os.path.dirname(output_path)
            temp_overlay_path = os.path.join(temp_dir, f"temp_overlay_{os.path.basename(output_path)}")
            
            # Create overlay
            overlay_result = VisualOverlay.create_tamper_overlay(
                original_path, suspicious_array, temp_overlay_path
            )
            
            overlay_img = Image.open(overlay_result['overlay_path'])
            
            # Create side-by-side image
            width = original_img.width * 3
            height = original_img.height
            
            side_by_side = Image.new('RGB', (width, height), color='white')
            
            # Paste images
            side_by_side.paste(original_img, (0, 0))
            side_by_side.paste(suspicious_img, (original_img.width, 0))
            side_by_side.paste(overlay_img, (original_img.width * 2, 0))
            
            # Add labels
            from PIL import ImageDraw, ImageFont
            
            draw = ImageDraw.Draw(side_by_side)
            
            try:
                font = ImageFont.truetype("arial.ttf", 20)
            except:
                font = ImageFont.load_default()
            
            labels = ["Original", "Suspicious", "Tampering Overlay"]
            for i, label in enumerate(labels):
                x = i * original_img.width + original_img.width//2 - draw.textlength(label, font=font)//2
                draw.text((x, 10), label, fill='black', font=font)
            
            side_by_side.save(output_path)
            
            # Clean up temp file
            if os.path.exists(temp_overlay_path):
                os.remove(temp_overlay_path)
            
            return {
                'comparison_path': output_path,
                'statistics': overlay_result['statistics']
            }
            
        except Exception as e:
            raise Exception(f"Side-by-side creation failed: {str(e)}")