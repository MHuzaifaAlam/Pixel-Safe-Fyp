# Generated migration to add suspicious image and verification fields
from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('reportapp', '0003_report_comparison_stats_report_suspicious_image_and_more'),
    ]

    operations = [
        # Only add fields not already added by 0003
        migrations.AddField(
            model_name='report',
            name='verification_metrics',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='report',
            name='verification_status',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
