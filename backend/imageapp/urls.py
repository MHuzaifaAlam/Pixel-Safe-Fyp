# imageapp/urls.py
from rest_framework.routers import DefaultRouter
from .views import UserImageView

router = DefaultRouter()
router.register(r'images',UserImageView,basename='images')

urlpatterns = router.urls