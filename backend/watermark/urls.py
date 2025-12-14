from django.urls import path
from . import views

urlpatterns = [
    path('watermark/apply/', views.apply_watermark, name='apply_watermark'),
    path('watermark/verify/', views.verify_watermark, name='verify_watermark'),
    #path('watermark/heatmap/', views.generate_heatmap, name='generate_heatmap'),
]