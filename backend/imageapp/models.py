# from django.db import models

# # Create your models here.
# from django.db import models
# from django.contrib.auth.models import User
# from django.db.models.signals import post_delete
# from django.dispatch import receiver
# import os,uuid

# class Image(models.Model):
#     # Primary Key
#     ImageID = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
#     user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='images')
#     image = models.ImageField(upload_to='uploads/')

#     # File Fields
#     fileName = models.CharField(max_length=255)
#     format = models.CharField(max_length=10)  # jpg, png, jpeg, etc.
#     ImageSize = models.IntegerField()  # Size in bytes
#     uploaded_at = models.DateTimeField(auto_now_add=True)

#     # Status Fields
#     STATUS_CHOICES = [
#         ('uploaded', 'Uploaded'),
#         ('processing', 'Processing'),
#         ('completed', 'Completed'),
#         ('failed', 'Failed'),
#         ('protected', 'Protected'),
#     ]
#     Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
#     # ✅ NEW: Batch tracking fields (Option 3)
#     batch_group = models.UUIDField(null=True, blank=True)  # Same UUID for all images in a batch
#     batch_position = models.IntegerField(null=True, blank=True)  # 0, 1, 2, etc.


# @receiver(post_delete, sender=Image)
# def delete_image_file(sender, instance, **kwargs):
#     if instance.image:
#         if os.path.isfile(instance.image.path):
#             os.remove(instance.image.path)

#     def __str__(self):
#         return f"{self.user.username} - {self.image.name}"


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
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, 
                            null=True, blank=True, related_name='images')
    batch_position = models.IntegerField(null=True, blank=True)
    
    class Meta:
        ordering = ['-uploaded_at']
    
    def __str__(self):
        batch_info = f" (Batch: {self.batch.name})" if self.batch else ""
        return f"{self.fileName} - {self.user.username}{batch_info}"

# ============ SIGNALS ============
@receiver(post_delete, sender=Image)
def delete_image_file(sender, instance, **kwargs):
    if instance.image and os.path.isfile(instance.image.path):
        os.remove(instance.image.path)

# @receiver(post_delete, sender=Image)
# def delete_empty_batch(sender, instance, **kwargs):
#     if instance.batch and instance.batch.images.count() == 0:
#         instance.batch.delete()