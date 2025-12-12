from django.db import models
import uuid
from django.contrib.auth.models import User
from imageapp.models import Image

# Create your models here.
class Report(models.Model):
    report_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.OneToOneField(Image, on_delete=models.CASCADE, related_name="report")

    score = models.IntegerField(default=0)
    watermark_status = models.CharField(max_length=50)
    status = models.CharField(max_length=50)

    notes = models.TextField()
    metadata = models.TextField()

    file_hash = models.CharField(max_length=200)
    file_path = models.CharField(max_length=255)

    original_image = models.ImageField(upload_to="reports/originals/", null=True, blank=True)
    tampered_image = models.ImageField(upload_to="reports/tampered/", null=True, blank=True)
    heatmap_image = models.ImageField(upload_to="reports/heatmap/", null=True, blank=True)

    pdf = models.FileField(upload_to="reports/pdf/", null=True,blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
