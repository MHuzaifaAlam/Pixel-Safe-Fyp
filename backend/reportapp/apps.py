from django.apps import AppConfig


class ReportappConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reportapp'

    def ready(self):
        import reportapp.signals