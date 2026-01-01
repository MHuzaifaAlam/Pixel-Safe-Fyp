from django.db import models
from django.contrib.auth.models import User

class ScanReport(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='scan_reports')
    # Link to your Image model (using string syntax to prevent circularity)
    image = models.ForeignKey('imageapp.Image', on_delete=models.CASCADE, related_name='reports')
    
    ai_score = models.FloatField()  # e.g., 99.48
    verdict = models.CharField(max_length=100) # e.g., HIGH INTENSITY AI
    note = models.TextField() 
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Report for {self.image.fileName} - {self.verdict}"