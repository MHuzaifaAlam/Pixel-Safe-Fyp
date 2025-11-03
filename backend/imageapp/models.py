from django.db import models

# Create your models here.
import mimetypes
from django.db import models
from django.contrib.auth.models import User

class Image(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to='user_images/')
    file_name = models.CharField(max_length=255,blank=True,null=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    size = models.PositiveIntegerField(blank=True, null=True)
    image_type = models.CharField(max_length=10, blank=True, null=True)

    def save(self, *args, **kwargs):
        first_save = not self.pk
        super().save(*args, **kwargs)

        if first_save and self.image:
            # Get file size safely
            size = self.image.size

            # Guess file type using mimetypes
            mime_type, _ = mimetypes.guess_type(self.image.path)
            image_type = mime_type.split('/')[-1] if mime_type else 'unknown'

            # Update without recursion
            Image.objects.filter(pk=self.pk).update(size=size, image_type=image_type)
            self.size = size
            self.image_type = image_type

    def __str__(self):
        return f"{self.user.username} - {self.image.name}"
