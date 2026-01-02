from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("reportapp", "0006_alter_report_watermark_record"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="report",
            name="original_image",
        ),
        migrations.RemoveField(
            model_name="report",
            name="tampered_image",
        ),
    ]
