from django.db import models
from imageapp.models import Image  # Import your existing model

class WatermarkRecord(models.Model):
    # Link to original image from imageapp
    original_image = models.ForeignKey(
        Image, 
        on_delete=models.CASCADE,
        related_name='watermarks'
    )
    
    # Watermark-specific data
    watermarked_image = models.ImageField(upload_to='watermarked/')
    perceptual_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Security data (encrypted in database)
    encrypted_hash = models.BinaryField()
    aes_key_encrypted = models.BinaryField()
    aes_iv_encrypted = models.BinaryField()
    
    # Verification metrics (for reporting)
    correlation_score = models.FloatField(null=True, blank=True)
    phash_distance = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Watermark for {self.original_image.ImageID}"