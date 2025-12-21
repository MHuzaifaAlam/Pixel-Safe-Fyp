from django.urls import path
from . import views

urlpatterns = [
    path('watermark/apply/', views.apply_watermark, name='apply_watermark'),
    path('watermark/verify/', views.verify_watermark, name='verify_watermark'),
    path('watermark/auto-verify/', views.auto_verify_watermark, name='auto_verify_watermark'),
]