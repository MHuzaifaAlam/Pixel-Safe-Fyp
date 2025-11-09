# imageapp/urls.py
from django.urls import path
from .views import UserImageView

urlpatterns = [
    path('images/', UserImageView.as_view(), name='user-images'),
]
