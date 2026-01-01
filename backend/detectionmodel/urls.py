from django.urls import path
from .views import generate_scan_report 

urlpatterns = [
    # This creates the endpoint: /api/detector/scan/
    path('scan/', generate_scan_report, name='generate_scan_report-'),
]