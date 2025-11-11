# imageapp/urls.py
from django.urls import path
from .views import UserImageView

urlpatterns = [
    path('upload/', UserImageView.as_view(), name='user-images'),
]
