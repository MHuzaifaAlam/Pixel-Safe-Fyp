from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Image
from .utils import extract_metadata

@receiver(post_save, sender=Image)
def add_metadata_to_image(sender, instance, created, **kwargs):
    """
    Extract metadata when a new image is uploaded and save it to the database.
    """
    if created and instance.image:
        metadata = extract_metadata(instance.image.path)
        instance.metadata = metadata
        instance.save()
