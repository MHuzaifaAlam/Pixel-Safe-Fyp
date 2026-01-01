from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView
from . import views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('logout/', TokenBlacklistView.as_view(), name='token_blacklist'),
    # path('login/', views.login, name='login'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),  #login endpoint
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh')
]
