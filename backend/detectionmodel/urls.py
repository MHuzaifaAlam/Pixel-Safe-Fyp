from django.urls import path
from . import views 

urlpatterns = [
    # This must have the trailing slash to match the Axios call
    path('scan/', views.generate_scan_report, name='generate_scan_report'),
]