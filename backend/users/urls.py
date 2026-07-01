"""URL routes for the users app."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MeView, RegisterView, UserViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('', include(router.urls)),
]
