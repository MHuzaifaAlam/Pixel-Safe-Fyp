# imageapp/urls.py
from rest_framework.routers import DefaultRouter
from .views import UserImageView,BatchViewSet

router = DefaultRouter()
router.register(r'images',UserImageView,basename='images'),
router.register(r'batches', BatchViewSet, basename='batch')

urlpatterns = router.urls