import os
from django.db.models.signals import post_delete, pre_delete
from django.dispatch import receiver
from imageapp.models import Image, Batch
from reportapp.models import Report

# ============================
# DELETE REPORT WHEN IMAGE IS DELETED
# ============================
@receiver(post_delete, sender=Image)
def delete_report_when_image_deleted(sender, instance, **kwargs):
    """
    When an Image is deleted:
    - Delete its associated Report from DB
    - Delete the PDF file from MEDIA
    """
    try:
        report = Report.objects.filter(image=instance).first()
        if report:
            # Delete PDF file from media
            if report.pdf and os.path.exists(report.pdf.path):
                os.remove(report.pdf.path)

            # Delete Report entry
            report.delete()
    except Exception as e:
        print("Error deleting report:", e)


# ============================
# ALL REPORTS WHEN BATCH IS DELETED
# ============================
@receiver(pre_delete, sender=Batch)
def delete_reports_when_batch_deleted(sender, instance, **kwargs):
    """
    When a Batch is deleted:
    - Delete all reports of images in this batch
    - Delete their PDF files from MEDIA
    """
    try:
        images = instance.images.all()
        for image in images:
            report = Report.objects.filter(image=image).first()
            if report:
                # Delete PDF file
                if report.pdf and os.path.exists(report.pdf.path):
                    os.remove(report.pdf.path)
                report.delete()
    except Exception as e:
        print("Error deleting batch reports:", e)
        
