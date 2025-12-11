from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_delete
from django.dispatch import receiver
import os, uuid
from django.utils import timezone

# ============ BATCH TABLE ============
class Batch(models.Model):
    BatchID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='batches')
    name = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='processing')
    
    def __str__(self):
        return f"{self.name or 'Unnamed Batch'} - {self.user.username}"
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "Batches"

# ============ IMAGE TABLE ============
class Image(models.Model):
    ImageID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='uploads/')
    
    # File Fields
    fileName = models.CharField(max_length=255)
    format = models.CharField(max_length=10)
    ImageSize = models.IntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Status Fields
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('protected', 'Protected'),
    ]
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    
    # Link to Batch
    batch = models.ForeignKey(Batch, on_delete=models.CASCADE, 
                            null=True, blank=True, related_name='images')
    batch_position = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        batch_info = f" (Batch: {self.batch.name})" if self.batch else ""
        return f"{self.fileName} - {self.user.username}{batch_info}"


@receiver(post_delete, sender=Image)
def delete_image_file(sender, instance, **kwargs):
    """
    Delete image file only - DON'T check for empty batches here
    """
    # Only delete the actual image file
    if instance.image:
        try:
            if os.path.isfile(instance.image.path):
                os.remove(instance.image.path)
        except:
            pass  # File might already be deleted
    if instance.batch_id:  # Use batch_id instead of batch to avoid DB hit if possible
        try:
            # Get the batch from database using the ID
            from django.db import transaction
            
            with transaction.atomic():
                # Use select_for_update to prevent race conditions
                batch = Batch.objects.select_for_update().filter(
                    BatchID=instance.batch_id
                ).first()
                
                # If batch exists and has no more images, delete it
                if batch and batch.images.count() == 0:
                    batch.delete()
                    print(f"✅ Empty batch deleted: {instance.batch_id}")
        except Exception as e:
            print(f"Error checking/deleting empty batch: {e}")
            pass  # Don't crash if there's an issue
